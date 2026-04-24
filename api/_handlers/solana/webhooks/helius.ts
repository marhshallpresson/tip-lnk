import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
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

  // Elite Hardening: Verify Helius Secret
  if (SECRET && webhookKey !== SECRET) {
      console.warn('⚠️ Webhook blocked: Invalid authorization key')
      return res.status(401).json({ error: 'Unauthorized' })
  }
  
  const transactions = req.body
  if (!Array.isArray(transactions)) return res.status(400).end()

  try {
    for (const tx of transactions) {
        // Reject failed transactions
        if (tx.transactionError) continue;

        const signature = tx.signature
        
        // ─── PHASE 1: WEBHOOK RELIABILITY & EVENT SOURCING ───
        // Store raw payload first
        try {
            await db('transactions_raw').insert({
                signature: signature,
                payload: JSON.stringify(tx),
                source: 'helius_webhook',
                status: 'processing'
            }).onConflict('signature').ignore();
        } catch (dbErr) {
            console.error('Failed to log raw transaction:', dbErr);
            // If DB fails, push to Redis dead-letter queue as ultimate fallback
            if (redis) {
                await redis.lpush('dlq:webhooks', JSON.stringify(tx));
            }
            continue; // Skip processing if we can't guarantee raw state
        }

        // ─── IDEMPOTENCY CHECK ───
        // Prevent duplicate processing via Redis lock (10 mins)
        if (redis) {
            const isDuplicate = await redis.set(`lock:tx:${signature}`, '1', { nx: true, ex: 600 });
            if (!isDuplicate) {
                console.log(`🛡️ Webhook: Skipped duplicate processing for ${signature}`);
                continue;
            }
        }

        const sender = tx.feePayer
        const timestamp = new Date(tx.timestamp * 1000)
        
        // Extract native or token transfer
        const transfer = tx.nativeTransfers?.[0] || tx.tokenTransfers?.[0]
        if (!transfer) {
             await db('transactions_raw').where({ signature }).update({ status: 'skipped' });
             continue;
        }

        const recipient = transfer.toUserAccount
        const amount = transfer.amount || transfer.tokenAmount

        // ─── PHASE 5: MEMO EXTRACTION ───
        // Check for Solana Memo Program (MemoSq4gqABmAn9k86z1px6A9HByG67UactJS1R848)
        let message = null;
        const memoIx = tx.instructions?.find((ix: any) => ix.programId === 'MemoSq4gqABmAn9k86z1px6A9HByG67UactJS1R848');
        if (memoIx && memoIx.data) {
           message = memoIx.data;
        }

        // PHASE 6: FRAUD PREVENTION
        // Reject zero amounts and self-transfers
        if (amount <= 0 || sender === recipient) {
            console.warn(`🛡️ Webhook: Rejected invalid transfer for ${signature}`);
            await db('transactions_raw').where({ signature }).update({ status: 'rejected_fraud' });
            continue;
        }

        // Insert into ledger (tips materialized view)
        await db('tips').insert({
          signature,
          slot: tx.slot,
          timestamp,
          sender,
          recipient,
          amount,
          message, // Save the supporter message
          tokenSymbol: tx.nativeTransfers?.length > 0 ? 'SOL' : (transfer.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'TOKEN'),
          status: 'confirmed',
          type: 'webhook_indexed'
        }).onConflict('signature').ignore() // Reject duplicate signatures
        
        // Mark raw as processed
        await db('transactions_raw').where({ signature }).update({ status: 'processed' });
        console.log(`🛡️ Webhook: Fortified ledger entry for ${signature}`)
        
        // ─── PHASE 3: REAL-TIME PUB/SUB NOTIFICATION ───
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
