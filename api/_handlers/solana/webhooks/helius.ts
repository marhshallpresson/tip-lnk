import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { emitTorqueEvent } from "../../../_lib/torque.js"
import { hashAddress } from "../../../_lib/crypto.js"
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * PHASE 5 & PHASE 1: SCALABLE WEBHOOK-ONLY LEDGER
 * Hardened for Zero-Knowledge: Maps transfers to User UUIDs.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const webhookKey = req.headers['authorization']
  const SECRET = process.env.HELIUS_WEBHOOK_SECRET

  if (!SECRET) {
      console.error('CRITICAL: HELIUS_WEBHOOK_SECRET is not set in environment.')
      return res.status(500).json({ error: 'Server configuration error' })
  }

  if (webhookKey !== SECRET) {
      console.warn('⚠️ Webhook blocked: Invalid authorization key')
      return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const transactions = req.body
  if (!Array.isArray(transactions)) return res.status(400).end()

  try {
    const promises = transactions.map(async (tx) => {
        if (tx.transactionError) return;

        const signature = tx.signature
        
        try {
            await db('transactions_raw').insert({
                signature: signature,
                payload: JSON.stringify(tx),
                source: 'helius_webhook',
                status: 'processing'
            }).onConflict('signature').ignore();
        } catch (dbErr) {
            console.error('Failed to log raw transaction:', dbErr);
            if (redis) {
                await redis.lpush('dlq:webhooks', JSON.stringify(tx));
            }
            return;
        }

        if (redis) {
            const isDuplicate = await redis.set(`lock:tx:${signature}`, '1', { nx: true, ex: 600 });
            if (!isDuplicate) {
                console.log(`🛡️ Webhook: Skipped duplicate processing for ${signature}`);
                return;
            }
        }

        const sender = tx.feePayer
        const timestamp = new Date(tx.timestamp * 1000)
        
        const transfer = tx.nativeTransfers?.[0] || tx.tokenTransfers?.[0]
        if (!transfer) {
             await db('transactions_raw').where({ signature }).update({ status: 'skipped' });
             return;
        }

        const recipient = transfer.toUserAccount
        const isNative = tx.nativeTransfers?.length > 0
        const amount = isNative ? (transfer.amount / 1e9) : transfer.tokenAmount

        // Zero-Knowledge Lookups
        const recipientUser = await db('user')
          .where({ walletAddressHash: hashAddress(recipient) })
          .orWhere({ walletAddress: recipient })
          .first()
        
        const senderUser = await db('user')
          .where({ walletAddressHash: hashAddress(sender) })
          .orWhere({ walletAddress: sender })
          .first()

        let message = null;
        const memoIx = tx.instructions?.find((ix: any) => ix.programId === 'MemoSq4gqABmAn9k86z1px6A9HByG67UactJS1R848');
        if (memoIx && memoIx.data) {
           message = memoIx.data;
        }

        if (amount <= 0 || sender === recipient) {
            console.warn(`🛡️ Webhook: Rejected invalid transfer for ${signature}`);
            await db('transactions_raw').where({ signature }).update({ status: 'rejected_fraud' });
            return;
        }

        const tokenSymbol = tx.nativeTransfers?.length > 0 ? 'SOL' : (transfer.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'TOKEN');

        // STRATEGIC ROADMAP: Wash-Trading Detection (P1)
        // Check for circular pairs (Recipient -> Sender) within last 24h
        let isSuspicious = false;
        if (senderUser && recipientUser) {
           const circularMatch = await db('tips')
             .where({ sender_id: recipientUser.id, recipient_id: senderUser.id })
             .where('timestamp', '>', new Date(Date.now() - 86400000))
             .first();
           if (circularMatch) {
             console.warn(`🕵️ Wash-Trading detected: Circular pair ${senderUser.id} <-> ${recipientUser.id}`);
             isSuspicious = true;
           }
        }

        const insertResult = await db('tips').insert({
          signature,
          slot: tx.slot,
          timestamp,
          sender,
          sender_id: senderUser?.id || null,
          recipient,
          recipient_id: recipientUser?.id || null,
          amount,
          message,
          tokenSymbol,
          status: 'confirmed',
          type: 'webhook_indexed',
          // New column for trust scores (will be added to schema if not exists)
          metadata: JSON.stringify({ isSuspicious })
        }).onConflict('signature').ignore()
        
        await db('transactions_raw').where({ signature }).update({ status: 'processed' });
        
        // SECURITY: Deterministic check for new insertion to prevent duplicate analytics
        // insertResult.rowCount (PG) or insertResult[0] (SQLite/PG)
        const isNewTip = insertResult && ((insertResult as any).rowCount > 0 || (Array.isArray(insertResult) && insertResult.length > 0));

        if (isNewTip) {
            console.log(`🛡️ Webhook: Fortified ledger entry for ${signature}`)
            const previousTips = await db('tips').where({ recipient_id: recipientUser?.id || 'MISSING' }).count('signature as count').first();
            const isFirstTip = parseInt(String(previousTips?.count || '0')) === 1;

            if (isFirstTip && recipientUser) {
                await emitTorqueEvent({
                    event_type: 'creator_first_tip',
                    metadata: {
                        creator_id: recipientUser.id,
                        tx_signature: signature,
                        source: 'helius_webhook'
                    }
                });
            }

            await emitTorqueEvent({
                event_type: 'tip_completed',
                metadata: {
                    user_id: senderUser?.id || null,
                    creator_id: recipientUser?.id || null,
                    amount_usd: amount,
                    token_symbol: tokenSymbol,
                    tx_signature: signature,
                    source: 'helius_webhook'
                }
            });
        }
        
        if (redis) {
             await redis.publish('live-tips', JSON.stringify({
                 signature,
                 recipientId: recipientUser?.id || null,
                 amount,
                 timestamp
             }));
        }
    })
    
    await Promise.allSettled(promises)
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Webhook Error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
