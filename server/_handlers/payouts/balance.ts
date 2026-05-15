import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { getCreatorBalance } from '../../_lib/db.js'
import { getSessionUser } from '../../_lib/session.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const user = await getSessionUser(req as any)
  if (!user) return res.status(401).json({ error: 'Unauthorized' })

  const ledger = await getCreatorBalance(user.id)
  return res.status(200).json({
    success: true,
    totalTipsUSD: ledger.totalTipsUSD,
    totalWithdrawnUSD: ledger.totalWithdrawnUSD,
    balance: ledger.balance,
  })
}
