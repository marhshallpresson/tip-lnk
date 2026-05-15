import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../../_lib/db.js"
import { getSolPrice } from "../../../_lib/price.js"

/**
 * Task 2.2: Standalone Vercel Function for Tip History Fetching
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  let address = req.query.address as string
  if (!address) {
    const parts = req.url?.split('?')[0].split('/').filter(Boolean) || []
    address = parts[parts.length - 1]
  }

  if (!address || address === 'tips' || address === 'get') {
    return res.status(400).json({ error: 'Valid wallet address string required' })
  }

  try {
    const tips = await db('tips')
      .where('recipient', address)
      .orWhere('sender', address)
      .orderBy('timestamp', 'desc')
      .limit(50)
    
    const solPrice = await getSolPrice()
    const enhancedTips = tips.map(tip => {
        const amount = Number(tip.amount)
        const isStable = tip.tokenSymbol === 'USDC' || tip.tokenSymbol === 'USDT'
        
        return {
            ...tip,
            valueUsd: isStable ? amount : amount * solPrice,
            isStable
        }
    })

    res.json({ success: true, tips: enhancedTips })
  } catch (err) {
    console.error('Tips Fetch Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch tips from indexer.' })
  }
}
