import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { emitTorqueEvent } from "../../../_lib/torque.js"
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * PHASE 5 & PHASE 1: SCALABLE WEBHOOK-ONLY LEDGER
 * Implements Event Sourcing, Idempotent Processing, and Redis Queuing.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const webhookKey = req.headers['authorization']
  const SECRET = process.env.HELIUS_WEBHOOK_SECRET

  if (SECRET && webhookKey !== SECRET) {
      console.warn('⚠️ Webhook blocked: Invalid authorization key')
      return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const transactions = req.body
  if (!Array.isArray(transactions)) return res.status(400).end()

  try {
    for (const tx of transactions) {
        if (tx.transactionError) continue;

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
            continue;
        }

        if (redis) {
            const isDuplicate = await redis.set(`lock:tx:${signature}`, '1', { nx: true, ex: 600 });
            if (!isDuplicate) {
                console.log(`🛡️ Webhook: Skipped duplicate processing for ${signature}`);
                continue;
            }
        }

        const sender = tx.feePayer
        const timestamp = new Date(tx.timestamp * 1000)
        
        const transfer = tx.nativeTransfers?.[0] || tx.tokenTransfers?.[0]
        if (!transfer) {
             await db('transactions_raw').where({ signature }).update({ status: 'skipped' });
             continue;
        }

        const recipient = transfer.toUserAccount
        const isNative = tx.nativeTransfers?.length > 0
        const amount = isNative ? (transfer.amount / 1e9) : transfer.tokenAmount

        let message = null;
        const memoIx = tx.instructions?.find((ix: any) => ix.programId === 'MemoSq4gqABmAn9k86z1px6A9HByG67UactJS1R848');
        if (memoIx && memoIx.data) {
           message = memoIx.data;
        }

        if (amount <= 0 || sender === recipient) {
            console.warn(`🛡️ Webhook: Rejected invalid transfer for ${signature}`);
            await db('transactions_raw').where({ signature }).update({ status: 'rejected_fraud' });
            continue;
        }

        const tokenSymbol = tx.nativeTransfers?.length > 0 ? 'SOL' : (transfer.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'TOKEN');
        const insertResult = await db('tips').insert({
          signature,
          slot: tx.slot,
          timestamp,
          sender,
          recipient,
          amount,
          message,
          tokenSymbol,
          status: 'confirmed',
          type: 'webhook_indexed'
        }).onConflict('signature').ignore()
        
        await db('transactions_raw').where({ signature }).update({ status: 'processed' });
        console.log(`🛡️ Webhook: Fortified ledger entry for ${signature}`)

        if (insertResult && (insertResult as any).length > 0) {
            const previousTips = await db('tips').where({ recipient }).count('signature as count').first();
            const isFirstTip = parseInt(String(previousTips?.count || '0')) === 1;

            if (isFirstTip) {
                await emitTorqueEvent({
                    event_type: 'creator_first_tip',
                    metadata: {
                        creator_id: recipient,
                        tx_signature: signature,
                        source: 'helius_webhook'
                    }
                });
            }

            await emitTorqueEvent({
                event_type: 'tip_completed',
                metadata: {
                    wallet_address: sender,
                    creator_id: recipient,
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
                 recipient,
                 amount,
                 timestamp
             }));
        }
    }
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Webhook Error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
