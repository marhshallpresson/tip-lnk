import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Helius Webhook Receiver
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Webhooks usually don't need CORS as they are server-to-server
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
        const signature = tx.signature
        const sender = tx.feePayer
        const timestamp = new Date(tx.timestamp * 1000)
        
        const transfer = tx.nativeTransfers?.[0] || tx.tokenTransfers?.[0]
        if (!transfer) continue

        await db('tips').insert({
          signature,
          slot: tx.slot,
          timestamp,
          sender,
          recipient: transfer.toUserAccount,
          amount: transfer.amount || transfer.tokenAmount,
          tokenSymbol: tx.nativeTransfers?.length > 0 ? 'SOL' : 'USDC',
          status: 'confirmed',
          type: 'webhook_indexed'
        }).onConflict('signature').merge()
        
        console.log(`🛡️ Webhook: Fortified ledger entry for ${signature}`)
    }
    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Webhook Error:', err)
    res.status(500).json({ error: 'Webhook processing failed' })
  }
}
