import type { Request as VercelRequest, Response as VercelResponse } from 'express'
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
  : null

const extractTxHash = (bodyData: any) =>
  bodyData?.txHash ||
  bodyData?.transactionHash ||
  bodyData?.transaction_hash ||
  bodyData?.hash ||
  bodyData?.paymentProcessingReference ||
  bodyData?.providerReference ||
  bodyData?.transaction_id ||
  bodyData?.transactionId ||
  null

const safeText = (value: any, max = 500) => {
  const text = String(value || '')
  return text.length > max ? text.slice(0, max) : text
}

const parseJson = (value: any) => {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

const firstText = (...values: any[]) => {
  for (const value of values) {
    const text = typeof value === 'string' || typeof value === 'number'
      ? String(value).trim()
      : ''
    if (text) return text
  }
  return ''
}

const extractWalletReference = (bodyData: any, metadata: any) => firstText(
  bodyData?.walletReference,
  bodyData?.wallet_reference,
  bodyData?.accountReference,
  bodyData?.account_reference,
  bodyData?.wallet?.reference,
  bodyData?.recipient?.reference,
  metadata?.fossaWalletReference,
  metadata?.walletReference,
)

const extractAccountNumber = (bodyData: any, metadata: any) => firstText(
  bodyData?.accountNumber,
  bodyData?.account_number,
  bodyData?.destinationAccountNumber,
  bodyData?.recipient?.account_number,
  bodyData?.recipient?.accountNumber,
  bodyData?.wallet?.accountNumber,
  metadata?.fossaAccountNumber,
  metadata?.accountNumber,
).replace(/\D/g, '')

const expectedAmountForIntent = (intent: any, webhookCurrency: string) => {
  const intentMetadata = parseJson(intent?.metadata_json)
  const expectedAmountNgn = Number(intentMetadata?.expectedAmountNgn || 0)
  const intentAmountUsd = Number(intent?.amount_usd || 0)
  const compareAsNgn = expectedAmountNgn > 0 && (!webhookCurrency || webhookCurrency === 'NGN')
  return {
    intentMetadata,
    expectedAmount: compareAsNgn ? expectedAmountNgn : intentAmountUsd,
    tolerance: compareAsNgn ? 10 : 0.01,
    compareAsNgn,
  }
}

const amountMatchesIntent = (intent: any, webhookAmount: number, webhookCurrency: string) => {
  const { expectedAmount, tolerance } = expectedAmountForIntent(intent, webhookCurrency)
  return Number.isFinite(expectedAmount) && Math.abs(webhookAmount - expectedAmount) <= tolerance
}

async function findIntentForWebhook(input: {
  incomingReference: string
  walletReference: string
  accountNumber: string
  webhookAmount: number
  webhookCurrency: string
}) {
  if (input.incomingReference) {
    const exact = await db('fiat_payment_intents').where({ intent_id: input.incomingReference }).first()
    if (exact) return exact
  }

  const targets = [input.walletReference, input.accountNumber].filter(Boolean)
  if (targets.length === 0) return null

  const candidates = await db('fiat_payment_intents')
    .where({ provider: 'fossapay', status: 'requires_action' })
    .where(function (this: any) {
      targets.forEach((target, index) => {
        if (index === 0) {
          this.where('provider_session_id', target).orWhere('metadata_json', 'like', `%${target}%`)
        } else {
          this.orWhere('provider_session_id', target).orWhere('metadata_json', 'like', `%${target}%`)
        }
      })
    })
    .orderBy('created_at', 'desc')
    .limit(25)

  return candidates.find((candidate: any) =>
    amountMatchesIntent(candidate, input.webhookAmount, input.webhookCurrency)
  ) || null
}

const insertWebhookAudit = async (input: {
  reference: string
  txHash: string | null
  destinationWallet: string | null
  status: string
  eventType: string
  payloadDigest: string
  payload: string
  processingState: string
  errorMessage?: string
}) => {
  await db('fiat_webhook_events').insert({
    reference: input.reference,
    tx_hash: input.txHash,
    destination_wallet: input.destinationWallet,
    status: input.status,
    event_type: input.eventType,
    payload_digest: input.payloadDigest,
    payload_json: input.payload,
    processing_state: input.processingState,
    error_message: input.errorMessage || null,
    created_at: new Date(),
    updated_at: new Date(),
  }).onConflict('reference').merge({
    processing_state: input.processingState,
    error_message: input.errorMessage || null,
    updated_at: new Date(),
  })
}

/**
 * Handles inbound FossaPay fiat payments.
 * Reconciles both intent-reference webhooks and virtual-account webhooks.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const signature = (req.headers['x-fossapay-signature'] as string) || (req.headers['x-fossa-signature'] as string)
  const FOSSA_SECRET = process.env.FOSSA_WEBHOOK_SECRET

  if (!signature || !FOSSA_SECRET) {
    console.error('Fiat Webhook: Missing signature or server secret.')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const payload = JSON.stringify(req.body)
  const payloadDigest = crypto.createHash('sha256').update(payload).digest('hex')

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
  const signatureBuffer = Buffer.from(String(signature), 'hex')

  const isValid =
    (expectedSignatureBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedSignatureBuffer, signatureBuffer)) ||
    (expectedSignatureLegacyBuffer.length === signatureBuffer.length && crypto.timingSafeEqual(expectedSignatureLegacyBuffer, signatureBuffer))

  if (!isValid) {
    console.warn('Fiat Webhook: Invalid signature detected.')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { event, data, event_id: eventId } = req.body
  const bodyData = data || req.body
  const metadata = bodyData?.metadata || req.body?.metadata || {}
  const txHash = extractTxHash(bodyData)
  const incomingReference = firstText(
    bodyData?.reference,
    bodyData?.paymentReference,
    bodyData?.transactionReference,
    bodyData?.transferReference,
    metadata?.intentId,
  )
  const eventReference = safeText(firstText(txHash, eventId, bodyData?.paymentReference, bodyData?.transactionReference, incomingReference, payloadDigest), 180)
  const walletReference = extractWalletReference(bodyData, metadata)
  const accountNumber = extractAccountNumber(bodyData, metadata)
  const status = bodyData?.status || 'unknown'
  const webhookAmount = Number(bodyData?.amount || 0)
  const webhookCurrency = String(bodyData?.currency || bodyData?.settlementCurrency || 'NGN').toUpperCase()

  const isCompleted =
    status === 'completed' ||
    status === 'successful' ||
    event === 'deposit.completed' ||
    event === 'payment.received'

  if (!isCompleted) {
    console.log(`Fiat Webhook: Reference ${eventReference} has status ${status} / event ${event}. Ignoring until completed.`)
    return res.status(200).json({ success: true, message: 'Ignored pending status' })
  }

  if (!Number.isFinite(webhookAmount) || webhookAmount <= 0) {
    return res.status(400).json({ error: 'Invalid amount in webhook' })
  }

  try {
    if (redis) {
      const isDuplicate = await redis.set(`lock:fiat:${eventReference}`, '1', { nx: true, ex: 600 })
      if (!isDuplicate) {
        console.log(`Fiat Webhook: Skipped duplicate processing for ${eventReference}`)
        return res.status(200).json({ success: true, duplicated: true })
      }
    }

    const existingEventQuery = db('fiat_webhook_events').where({ reference: eventReference }).orWhere({ payload_digest: payloadDigest })
    if (txHash) existingEventQuery.orWhere({ tx_hash: txHash })
    const existingEvent = await existingEventQuery.first()
    if (existingEvent) {
      console.log(`Fiat Webhook: already processed for ${eventReference} / ${txHash || 'n/a'}`)
      return res.status(200).json({ success: true, duplicated: true })
    }

    const intent = await findIntentForWebhook({
      incomingReference,
      walletReference,
      accountNumber,
      webhookAmount,
      webhookCurrency,
    })

    if (!intent) {
      await insertWebhookAudit({
        reference: eventReference,
        txHash,
        destinationWallet: bodyData?.destinationWallet || metadata?.destinationWallet || null,
        status,
        eventType: event || 'unknown',
        payloadDigest,
        payload,
        processingState: 'rejected',
        errorMessage: 'Unknown intent or creator collection account',
      })
      return res.status(409).json({ error: 'Unknown intent or creator collection account' })
    }

    const destinationWallet = firstText(bodyData?.destinationWallet, metadata?.destinationWallet, intent.destination_wallet)
    try {
      new PublicKey(destinationWallet)
    } catch {
      console.warn(`Fiat Webhook: Invalid destination wallet format: ${destinationWallet}`)
      await insertWebhookAudit({
        reference: eventReference,
        txHash,
        destinationWallet,
        status,
        eventType: event || 'unknown',
        payloadDigest,
        payload,
        processingState: 'rejected',
        errorMessage: 'Invalid destination wallet',
      })
      return res.status(400).json({ error: 'Invalid destination wallet' })
    }

    if (String(intent.destination_wallet) !== String(destinationWallet)) {
      await insertWebhookAudit({
        reference: eventReference,
        txHash,
        destinationWallet,
        status,
        eventType: event || 'unknown',
        payloadDigest,
        payload,
        processingState: 'rejected',
        errorMessage: 'Destination wallet mismatch',
      })
      return res.status(409).json({ error: 'Destination wallet mismatch for intent' })
    }

    if (!amountMatchesIntent(intent, webhookAmount, webhookCurrency)) {
      await insertWebhookAudit({
        reference: eventReference,
        txHash,
        destinationWallet,
        status,
        eventType: event || 'unknown',
        payloadDigest,
        payload,
        processingState: 'rejected',
        errorMessage: 'Webhook amount mismatch',
      })
      return res.status(409).json({ error: 'Amount mismatch for intent' })
    }

    const { intentMetadata } = expectedAmountForIntent(intent, webhookCurrency)
    const ledgerSignature = safeText(firstText(txHash, bodyData?.transaction_id, bodyData?.transactionId, eventId, eventReference), 180)
    const existing = await db('tips').where({ signature: ledgerSignature }).first()
    if (existing) {
      console.log(`Fiat Webhook: Ledger signature ${ledgerSignature} already processed. Skipping.`)
      return res.status(200).json({ success: true, duplicated: true })
    }

    const senderName = metadata?.senderName || intentMetadata?.senderName || 'Anonymous'
    const message = metadata?.memo || intentMetadata?.memo || null
    const timestamp = new Date()
    const creditedAmountUsd = Number(intentMetadata?.finalAmountUsd || intent.amount_usd || 0)

    console.log(`FossaPay inbound success: ${intent.intent_id} | ${webhookAmount} ${webhookCurrency} | ${destinationWallet}`)

    const insertResult = await db('tips').insert({
      signature: ledgerSignature,
      slot: 0,
      timestamp,
      sender: 'FIAT_ONRAMP',
      sender_name: senderName,
      recipient: destinationWallet,
      recipient_id: intent.creator_id,
      amount: creditedAmountUsd,
      message,
      tokenMint: 'FIAT_USDC',
      tokenSymbol: 'USDC',
      status: 'confirmed',
      type: 'fiat_webhook',
      metadata: JSON.stringify({
        provider: 'fossapay',
        intentId: intent.intent_id,
        fiatReference: incomingReference,
        eventReference,
        amountNgn: webhookCurrency === 'NGN' ? webhookAmount : null,
        currency: webhookCurrency,
        rate: intentMetadata?.rate || null,
        platformFee: intentMetadata?.platformFee || null,
      }),
    }).onConflict('signature').ignore()

    await insertWebhookAudit({
      reference: eventReference,
      txHash,
      destinationWallet,
      status: status || 'completed',
      eventType: event || 'deposit.completed',
      payloadDigest,
      payload,
      processingState: 'processed',
    })

    await db('fiat_payment_intents')
      .where({ intent_id: intent.intent_id })
      .update({
        status: 'completed',
        completed_at: timestamp,
        updated_at: timestamp,
      })

    if (insertResult && (insertResult as any).length > 0) {
      const previousTips = await db('tips').where({ recipient: destinationWallet }).count('signature as count').first()
      const isFirstTip = parseInt(String(previousTips?.count || '0')) === 1

      if (isFirstTip) {
        await emitTorqueEvent({
          event_type: 'creator_first_tip',
          metadata: {
            creator_id: destinationWallet,
            tx_signature: ledgerSignature,
            source: 'backend',
          },
        })
      }

      await emitTorqueEvent({
        event_type: 'tip_completed',
        metadata: {
          wallet_address: 'FIAT_ONRAMP',
          creator_id: destinationWallet,
          amount_usd: creditedAmountUsd,
          token_symbol: 'USDC',
          tx_signature: ledgerSignature,
          source: 'backend',
        },
      })
    }

    if (redis) {
      await redis.publish('live-tips', JSON.stringify({
        signature: ledgerSignature,
        recipient: destinationWallet,
        amount: creditedAmountUsd,
        timestamp,
        senderName,
      }))

      try {
        await redis.incr('metrics:fiat:webhook:processed')
      } catch {}
    }

    res.status(200).json({ success: true })
  } catch (err: any) {
    console.error('Fiat Webhook Fault:', err)

    try {
      await insertWebhookAudit({
        reference: eventReference || `unknown_${Date.now()}`,
        txHash,
        destinationWallet: bodyData?.destinationWallet || metadata?.destinationWallet || null,
        status,
        eventType: event || 'unknown',
        payloadDigest,
        payload,
        processingState: 'failed',
        errorMessage: safeText(err?.message || 'Unknown error', 900),
      })
    } catch (auditErr) {
      console.error('Fiat Webhook audit insert failed:', auditErr)
    }

    if (redis) {
      try { await redis.lpush('dlq:fiat_webhooks', payload) } catch {}
      try { await redis.incr('metrics:fiat:webhook:failed') } catch {}
    }

    res.status(500).json({ error: 'Internal processing error' })
  }
}
