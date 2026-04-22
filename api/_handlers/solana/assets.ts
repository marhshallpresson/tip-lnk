import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getAssetsByOwner } from "../../_lib/helius.js"

/**
 * Task 2.2: Standalone Vercel Function for Asset Fetching
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const owner = req.query.owner as string
  if (!owner) return res.status(400).json({ error: 'Owner required' })

  try {
    const assets = await getAssetsByOwner(owner)
    res.json({ success: true, assets })
  } catch (err) {
    console.error('Assets Fetch Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch assets.' })
  }
}
