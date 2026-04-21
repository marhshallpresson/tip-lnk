import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../../_cors.js"
import { db } from "../../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Handle Resolution
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { handle: rawHandle } = req.query
  if (typeof rawHandle !== 'string') return res.status(400).json({ error: 'Handle required' })
  
  const handle = rawHandle.replace(/^@/, '')
  
  try {
    const user = await db('user')
      .where({ twitterHandle: handle })
      .orWhere({ discordHandle: handle })
      .first()

    if (!user || !user.walletAddress) {
      return res.status(404).json({ success: false, error: 'Handle not linked to a wallet.' })
    }

    res.json({
      success: true,
      handle: `@${handle}`,
      walletAddress: user.walletAddress,
      profile: JSON.parse(user.profileData || '{}')
    })
  } catch (err) {
    console.error('Resolution Error:', err)
    res.status(500).json({ success: false, error: 'Resolution failed.' })
  }
}
