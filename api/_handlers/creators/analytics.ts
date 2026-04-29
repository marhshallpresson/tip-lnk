import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { getSessionUser } from "../../_lib/session.js"

/**
 * PHASE 1: Creator Analytics API
 * Returns time-series data and summary metrics for the creator dashboard.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const user = await getSessionUser(req as any)
    if (!user) return res.status(401).json({ error: 'Unauthorized' })

    const days = parseInt(req.query.days as string) || 30

    // 1. Fetch Daily Analytics
    const analytics = await db('analytics_daily')
      .where({ user_id: user.id })
      .andWhere('date', '>=', db.raw("CURRENT_DATE - INTERVAL '?' DAY", [days]))
      .orderBy('date', 'asc')

    // 2. Fetch Top Supporters (Verified)
    const topSupporters = await db('tips')
      .select('sender as name')
      .sum('amount as total_amount')
      .count('signature as tip_count')
      .where({ recipient: user.walletAddress, status: 'confirmed' })
      .groupBy('sender')
      .orderBy('total_amount', 'desc')
      .limit(10)

    // 3. Summary Stats
    const summary = await db('tips')
      .where({ recipient: user.walletAddress, status: 'confirmed' })
      .select(
        db.raw('count(distinct sender) as unique_supporters'),
        db.raw('count(signature) as total_tips'),
        db.raw('sum(amount) as total_volume')
      )
      .first()

    return res.json({
      success: true,
      data: {
        summary: {
          uniqueSupporters: parseInt(summary?.unique_supporters || '0'),
          totalTips: parseInt(summary?.total_tips || '0'),
          totalVolume: parseFloat(summary?.total_volume || '0'),
          avgTipSize: summary?.total_tips > 0 ? parseFloat(summary?.total_volume || '0') / parseInt(summary?.total_tips) : 0
        },
        timeSeries: analytics,
        topSupporters
      }
    })

  } catch (err: any) {
    console.error('Analytics Fetch Error:', err)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
