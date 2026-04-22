import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from '../../_cors.js'
import { db } from '../../_lib/db.js'
import { getSessionUser } from '../../_lib/session.js'

/**
 * Task 1: Pajcash Payout History
 * Fetches the user's withdrawal history from the database.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    // ─── ELITE AUTHENTICATION ───
    const user = await getSessionUser(req as any)
    if (!user || !user.walletAddress) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const history = await db('payouts')
      .where({ wallet_address: user.walletAddress })
      .orderBy('created_at', 'desc')
      .limit(50)

    const formattedHistory = history.map(p => ({
      id: p.id,
      date: p.created_at,
      amountUSDC: Number(p.amount_ngn) / 1250, // rough estimate back to USDC for display
      amountNGN: Number(p.amount_ngn),
      status: p.status,
      reference: p.pajcash_reference
    }))

    res.status(200).json({ success: true, history: formattedHistory })
  } catch (err: any) {
    console.error('Payouts History Error:', err)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
