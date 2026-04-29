import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"

/**
 * PHASE 6: API DESIGN FOR THIRD PARTIES
 * Returns verified tip events for a specific creator.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid API key' })
  }
  const apiKey = authHeader.split(' ')[1]

  try {
    if (apiKey.length < 10) throw new Error('Invalid API key format')

    const creatorId = req.query.creatorId as string
    const since = req.query.since as string

    if (!creatorId) {
      return res.status(400).json({ error: 'creatorId is required' })
    }


    let query = db('tips')
      .where({ recipient: creatorId, status: 'confirmed' })
      .orderBy('timestamp', 'desc')
      .limit(50)

    if (since) {
        const sinceDate = new Date(since)
        if (!isNaN(sinceDate.getTime())) {
            query = query.andWhere('timestamp', '>', sinceDate.toISOString())
        }
    }

    const tips = await query

    const events = tips.map(tip => ({
        eventId: tip.signature,
        type: 'tip_completed',
        amountUsdc: tip.tokenSymbol === 'USDC' ? tip.amount : 0,
        amountRaw: tip.amount,
        tokenSymbol: tip.tokenSymbol,
        sender: tip.sender,
        timestamp: tip.timestamp,
        txSignature: tip.signature
    }))

    return res.json({
      success: true,
      events
    })

  } catch (err: any) {
    console.error('SDK Events Error:', err)
    return res.status(500).json({ error: 'Failed to fetch verified events' })
  }
}
