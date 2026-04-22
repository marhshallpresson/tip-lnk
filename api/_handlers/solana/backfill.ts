import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getSessionUser } from "../../_lib/session.js"
import { backfillTransactions } from "../../_lib/helius.js"

/**
 * Task 2.2: Standalone Vercel Function for Wallet Backfill
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getSessionUser(req as any)
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }

  const { address } = req.body

  if (typeof address !== 'string' || address.length < 32 || address.length > 44) {
    return res.status(400).json({ error: 'Valid wallet address string required' })
  }

  // Elite Hardening: Ensure users can only backfill THEIR OWN wallet
  if (authUser.walletAddress && address !== authUser.walletAddress) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Backfill restricted to owned wallet' })
  }

  if (!address) return res.status(400).json({ error: 'Address required' })

  try {
    const tips = await backfillTransactions(address)
    res.json({ success: true, count: tips.length })
  } catch (err) {
    console.error('Backfill Error:', err)
    res.status(500).json({ success: false, error: 'Backfill failed.' })
  }
}
