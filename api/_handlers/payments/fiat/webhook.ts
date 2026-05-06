import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { db } from '../../../_lib/db.js'
import { emitTorqueEvent } from '../../../_lib/torque.js'
import { Redis } from '@upstash/redis'
import { PublicKey } from '@solana/web3.js'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const extractTxHash = (bodyData: any) =>
  bodyData?.txHash ||
  bodyData?.transactionHash ||
  bodyData?.hash ||
  bodyData?.paymentProcessingReference ||
  bodyData?.providerReference ||
  null

const safeText = (value: any, max = 500) => {
  const text = String(value || '')
  return text.length > max ? text.slice(0, max) : text
}

/**
 * PHASE 3: Fossa Pay Secure Webhook Implementation
 * Handles inbound fiat payments, validates signatures, updates ledger, and triggers growth events.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const signature = req.headers['x-fossapay-signature'] as string || req.headers['x-fossa-signature'] as string
  const FOSSA_SECRET = process.env.FOSSA_WEBHOOK_SECRET

  if (!signature || !FOSSA_SECRET) {
    console.error('🛡️ Fiat Webhook: Missing signature or server secret.')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const payload = JSON.stringify(req.body)
  
  // FossaPay docs specify HMAC-SHA512 (fallback to sha256 to support legacy if needed, but we'll try sha512 first)
  const expectedSignature = crypto
    .createHmac('sha512', FOSSA_SECRET)
    .update(payload)
    .digest('hex')

  const expectedSignatureLegacy = crypto
    .createHmac('sha256', FOSSA_SECRET)
    .update(payload)
    .digest('hex')

  const expectedSignatureBuffer = Buffer.from(expectedSignature, 'hex')
  const expectedSignatureLegacyBuffer = Buffer.from(expectedSignatureLegacy, 'hex')
  const signatureBuffer = Buffer.from(signature, 'hex')

  let isValid = false;

  if (expectedSignatureBuffer.length === signatureBuffer.length) {
      isValid = crypto.timingSafeEqual(expectedSignatureBuffer, signatureBuffer)
  } else if (expectedSignatureLegacyBuffer.length === signatureBuffer.length) {
      isValid = crypto.timingSafeEqual(expectedSignatureLegacyBuffer, signatureBuffer)
  }

  if (!isValid) {
    console.warn('⚠️ Fiat Webhook: Invalid signature detected. Potential injection attempt.')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { event, data } = req.body
  const bodyData = data || req.body // Support { event, data } structure from docs or flat legacy structure
  const { reference, status, amount, destinationWallet, metadata } = bodyData
  const txHash = extractTxHash(bodyData)
  const payloadDigest = crypto.createHash('sha256').update(payload).digest('hex')

  if (!reference || !destinationWallet) {
    return res.status(400).json({ error: 'Missing webhook reference or destination wallet' })
  }

  // SANITY: Validate destination wallet format
  try {
    new PublicKey(destinationWallet);
  } catch (e) {
    console.warn(`🛡️ Fiat Webhook: Invalid destination wallet format: ${destinationWallet}`);
    return res.status(400).json({ error: 'Invalid destination wallet' });
  }

  // FossaPay uses 'deposit.completed', legacy code uses 'completed' or 'successful'
  const isCompleted = status === 'completed' || status === 'successful' || event === 'deposit.completed'

  if (!isCompleted) {
    console.log(`ℹ️ Fiat Webhook: Reference ${reference} has status ${status} / event ${event}. Ignoring until completed.`)
    return res.status(200).json({ success: true, message: 'Ignored pending status' })
  }

  try {
    if (redis) {
      const isDuplicate = await redis.set(`lock:fiat:${reference}`, '1', { nx: true, ex: 600 });
      if (!isDuplicate) {
          console.log(`🛡️ Fiat Webhook: Skipped duplicate processing for ${reference}`);
          return res.status(200).json({ success: true, duplicated: true });
      }
      if (txHash) {
        const duplicateHash = await redis.set(`lock:fiat:tx:${txHash}`, '1', { nx: true, ex: 600 });
        if (!duplicateHash) {
          console.log(`🛡️ Fiat Webhook: Skipped duplicate processing for tx hash ${txHash}`);
          return res.status(200).json({ success: true, duplicated: true });
        }
      }
    }

    const existingEventQuery = db('fiat_webhook_events').where({ reference })
    if (txHash) {
      existingEventQuery.orWhere({ tx_hash: txHash })
    }
    const existingEvent = await existingEventQuery.first()
    if (existingEvent) {
      console.log(`ℹ️ Fiat Webhook: already processed for ${reference} / ${txHash || 'n/a'}`)
      return res.status(200).json({ success: true, duplicated: true })
    }

    const intent = await db('fiat_payment_intents').where({ intent_id: reference }).first()
    if (!intent) {
      await db('fiat_webhook_events').insert({
        reference,
        tx_hash: txHash,
        destination_wallet: destinationWallet,
        status: status || 'unknown',
        event_type: event || 'unknown',
        payload_digest: payloadDigest,
        payload_json: payload,
        processing_state: 'rejected',
        error_message: 'Unknown intent reference',
        created_at: new Date(),
        updated_at: new Date()
      }).onConflict('reference').merge({
        processing_state: 'rejected',
        error_message: 'Unknown intent reference',
        updated_at: new Date()
      })
      return res.status(409).json({ error: 'Unknown intent reference' })
    }

    if (String(intent.destination_wallet) !== String(destinationWallet)) {
      await db('fiat_webhook_events').insert({
        reference,
        tx_hash: txHash,
        destination_wallet: destinationWallet,
        status: status || 'unknown',
        event_type: event || 'unknown',
        payload_digest: payloadDigest,
        payload_json: payload,
        processing_state: 'rejected',
        error_message: 'Destination wallet mismatch',
        created_at: new Date(),
        updated_at: new Date()
      }).onConflict('reference').merge({
        processing_state: 'rejected',
        error_message: 'Destination wallet mismatch',
        updated_at: new Date()
      })
      return res.status(409).json({ error: 'Destination wallet mismatch for intent' })
    }

    const existing = await db('tips').where({ signature: reference }).first()
    if (existing) {
        console.log(`ℹ️ Fiat Webhook: Reference ${reference} already processed in ledger. Skipping.`)
        return res.status(200).json({ success: true, duplicated: true })
    }

    console.log(`💰 Fossa Pay Inbound Success: ${reference} | Amount: $${amount} to ${destinationWallet}`)

    const senderName = metadata?.senderName || 'Anonymous'
    const message = metadata?.memo || null
    const timestamp = new Date()
    const numericAmount = Number(amount || 0)
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      return res.status(400).json({ error: 'Invalid amount in webhook' })
    }

    const insertResult = await db('tips').insert({
      signature: reference,
      slot: 0,
      timestamp,
      sender: 'FIAT_ONRAMP', 
      recipient: destinationWallet,
      amount: numericAmount,
      message, 
      tokenMint: 'FIAT_USD',
      tokenSymbol: 'FIAT_USD',
      status: 'confirmed',
      type: 'fiat_webhook'
    }).onConflict('signature').ignore()

    await db('fiat_webhook_events').insert({
      reference,
      tx_hash: txHash,
      destination_wallet: destinationWallet,
      status: status || 'completed',
      event_type: event || 'deposit.completed',
      payload_digest: payloadDigest,
      payload_json: payload,
      processing_state: 'processed',
      created_at: timestamp,
      updated_at: timestamp
    }).onConflict('reference').merge({
      processing_state: 'processed',
      updated_at: timestamp
    })

    await db('fiat_payment_intents')
      .where({ intent_id: reference })
      .update({
        status: 'completed',
        completed_at: timestamp,
        updated_at: timestamp
      })

    if (insertResult && (insertResult as any).length > 0) {
      const previousTips = await db('tips').where({ recipient: destinationWallet }).count('signature as count').first();
      const isFirstTip = parseInt(String(previousTips?.count || '0')) === 1;

      if (isFirstTip) {
          await emitTorqueEvent({
              event_type: 'creator_first_tip',
              metadata: {
                  creator_id: destinationWallet,
                  tx_signature: reference,
                  source: 'backend'
              }
          });
      }

      await emitTorqueEvent({
          event_type: 'tip_completed',
          metadata: {
              wallet_address: 'FIAT_ONRAMP',
              creator_id: destinationWallet,
              amount_usd: numericAmount,
              token_symbol: 'FIAT_USD',
              tx_signature: reference,
              source: 'backend'
          }
      });
    }

    if (redis) {
      await redis.publish('live-tips', JSON.stringify({
          signature: reference,
          recipient: destinationWallet,
          amount: numericAmount,
          timestamp,
          senderName
      }));
    }

    if (redis) {
      try {
        await redis.incr('metrics:fiat:webhook:processed')
      } catch {}
    }

    res.status(200).json({ success: true })

  } catch (err: any) {
    console.error('Fiat Webhook Fault:', err)

    try {
      await db('fiat_webhook_events').insert({
        reference: bodyData?.reference || `unknown_${Date.now()}`,
        tx_hash: txHash,
        destination_wallet: bodyData?.destinationWallet || null,
        status: bodyData?.status || 'unknown',
        event_type: event || 'unknown',
        payload_digest: payloadDigest,
        payload_json: payload,
        processing_state: 'failed',
        error_message: safeText(err?.message || 'Unknown error', 900),
        created_at: new Date(),
        updated_at: new Date()
      }).onConflict('reference').merge({
        processing_state: 'failed',
        error_message: safeText(err?.message || 'Unknown error', 900),
        updated_at: new Date()
      })
    } catch (auditErr) {
      console.error('Fiat Webhook audit insert failed:', auditErr)
    }
    
    if (redis) {
      try { await redis.lpush('dlq:fiat_webhooks', payload) } catch(e){}
      try { await redis.incr('metrics:fiat:webhook:failed') } catch {}
    }

    res.status(500).json({ error: 'Internal processing error' })
  }
}
