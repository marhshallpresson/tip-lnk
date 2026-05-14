import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../../lib/db.js"

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
    
    const updated = await db('tips')
      .where({ signature })
      .update({ 
          message,
          sender_name: senderName || 'Anonymous'
      })

    if (updated === 0) {
      return res.status(202).json({ success: true, status: 'metadata_queued' })
    }

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Supporter Message Error:', err)
    res.status(500).json({ error: 'Failed to save message' })
  }
}
