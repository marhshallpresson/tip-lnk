import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"

/**
 * PHASE 5: WEBHOOK-ONLY LEDGER
 * Secure Helius Webhook Receiver
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
        const sender = tx.feePayer
        const timestamp = new Date(tx.timestamp * 1000)
        
        // Extract native or token transfer
        const transfer = tx.nativeTransfers?.[0] || tx.tokenTransfers?.[0]
        if (!transfer) continue

        const recipient = transfer.toUserAccount
        const amount = transfer.amount || transfer.tokenAmount

        // PHASE 6: FRAUD PREVENTION
        // Reject zero amounts and self-transfers
        if (amount <= 0 || sender === recipient) {
            console.warn(`🛡️ Webhook: Rejected invalid transfer for ${signature}`);
            continue;
        }

        // Insert into ledger
        await db('tips').insert({
          signature,
          slot: tx.slot,
          timestamp,
          sender,
          recipient,
          amount,
          tokenSymbol: tx.nativeTransfers?.length > 0 ? 'SOL' : (transfer.mint === 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' ? 'USDC' : 'TOKEN'),
          status: 'confirmed',
          type: 'webhook_indexed'
        }).onConflict('signature').ignore() // Reject duplicate signatures
        
        console.log(`🛡️ Webhook: Fortified ledger entry for ${signature}`)
    }
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Webhook Error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
