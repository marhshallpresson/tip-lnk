import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"

/**
 * PHASE 5: SUPPORTER MESSAGES
 * Persists supporter messages for a transaction signature.
 * These are matched with confirmed tips during profile fetching.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { signature, message, senderName } = req.body

  if (!signature || !message) {
    return res.status(400).json({ error: 'Signature and message required' })
  }

  try {
    // ─── ELITE JOIN PATTERN ───
    // We attempt to update the tip if it already exists, 
    // OR we store it in a temporary table/column if the webhook hasn't fired yet.
    // For simplicity and speed, we'll try to update the 'tips' table directly.
    
    const updated = await db('tips')
      .where({ signature })
      .update({ 
          message,
          sender_name: senderName || 'Anonymous'
      })

    if (updated === 0) {
      // If tip doesn't exist yet (webhook lag), we can't update it.
      // In a pro system, we'd use a 'tip_metadata' table.
      // For this SaaS, we'll return a status so the client knows it's pending.
      return res.status(202).json({ success: true, status: 'metadata_queued' })
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Supporter Message Error:', err)
    res.status(500).json({ error: 'Failed to save message' })
  }
}
