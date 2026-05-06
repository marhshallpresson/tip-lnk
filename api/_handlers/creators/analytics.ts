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

    const daysParam = parseInt(req.query.days as string, 10)
    const days = Number.isFinite(daysParam) ? Math.min(Math.max(daysParam, 1), 365) : 30
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - days)
    const cutoffIsoDate = cutoffDate.toISOString().slice(0, 10)

    const analytics = await db('analytics_daily')
      .where({ user_id: user.id })
      .andWhere('date', '>=', cutoffIsoDate)
      .orderBy('date', 'asc')

    const topSupporters = await db('tips')
      .select('sender as name')
      .sum('amount as total_amount')
      .count('signature as tip_count')
      .where({ recipient_id: user.id, status: 'confirmed' })
      .groupBy('sender')
      .orderBy('total_amount', 'desc')
      .limit(10)

    // Mask supporter addresses in results
    const maskedSupporters = topSupporters.map((s: any) => ({
        ...s,
        name: s.name.length > 20 ? `${s.name.slice(0, 4)}...${s.name.slice(-4)}` : s.name
    }))

    const summary = await db('tips')
      .where({ recipient_id: user.id, status: 'confirmed' })
      .select(
        db.raw('count(distinct sender) as unique_supporters'),
        db.raw('count(signature) as total_tips'),
        db.raw('sum(amount) as total_volume')
      )
      .first() as any

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
        topSupporters: maskedSupporters
      }
    })

  } catch (err: any) {
    console.error('Analytics Fetch Error:', err)
    res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
