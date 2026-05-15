import type { Request as VercelRequest, Response as VercelResponse } from 'express'
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
        // ─── ELITE SECURITY: TRANSACTION VALIDATION ───
        // According to Helius docs, we must verify tx status and type.
        if (tx.transactionError) return;
        if (tx.type !== 'TRANSFER' && tx.type !== 'SOL_TRANSFER') {
            console.log(`🛡️ Webhook: Ignored non-transfer transaction ${tx.signature} (Type: ${tx.type})`);
            return;
        }

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
        
        const treasuryWallet = process.env.VITE_TREASURY_WALLET;
        const allTransfers = [...(tx.nativeTransfers || []), ...(tx.tokenTransfers || [])];
        
        // Find the correct transfer: prioritize transfers NOT going to the treasury
        let transfer = allTransfers.find(t => t.toUserAccount !== treasuryWallet);
        if (!transfer) transfer = allTransfers[0]; // Fallback

        if (!transfer) {
             await db('transactions_raw').where({ signature }).update({ status: 'skipped' });
             return;
        }

        const recipient = transfer.toUserAccount
        const isNative = tx.nativeTransfers?.some((t: any) => t === transfer);
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

        const existingTip = await db('tips').where({ signature }).first();
        let isNewTip = false;

        if (existingTip) {
          await db('tips').where({ signature }).update({
            status: 'confirmed',
            slot: tx.slot,
            type: 'webhook_indexed',
            metadata: JSON.stringify({ isSuspicious })
          });
        } else {
          await db('tips').insert({
            signature,
            slot: tx.slot,
            timestamp,
            sender,
            sender_id: senderUser?.id || null,
            sender_hash: hashAddress(sender),
            recipient,
            recipient_id: recipientUser?.id || null,
            recipient_hash: hashAddress(recipient),
            amount,
            message,
            tokenSymbol,
            status: 'confirmed',
            type: 'webhook_indexed',
            metadata: JSON.stringify({ isSuspicious })
          });
          isNewTip = true;
        }
        
        await db('transactions_raw').where({ signature }).update({ status: 'processed' });

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
             await redis.lpush(`live_tips:${recipient}`, JSON.stringify({
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
