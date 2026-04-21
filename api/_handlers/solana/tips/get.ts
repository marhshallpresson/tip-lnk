import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../../../_cors.js"
import { db } from "../../../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Tip History Fetching
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const address = req.query.address as string
  if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
    return res.status(400).json({ error: 'Valid wallet address string required' })
  }

  try {
    const tips = await db('tips')
      .where('recipient', address)
      .orWhere('sender', address)
      .orderBy('timestamp', 'desc')
      .limit(50)
    
    res.json({ success: true, tips })
  } catch (err) {
    console.error('Tips Fetch Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch tips from indexer.' })
  }
}
