import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Admin Stats
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const adminSecret = req.headers['x-admin-secret']
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Elite Admin Access Required' })
  }

  try {
    const tipStats: any = await db('tips')
      .select(
        db.raw('COUNT(signature) as total_tips'),
        db.raw('COALESCE(SUM(amount), 0) as total_volume_usdc'),
        db.raw('COALESCE(SUM(amount * 0.05), 0) as estimated_revenue') 
      )
      .where('status', 'confirmed')
      .first()

    const userStats: any = await db('user')
      .select(db.raw('COUNT(id) as total_creators'))
      .first()

    res.json({
      success: true,
      stats: {
        totalTips: parseInt(tipStats?.total_tips || '0'),
        totalVolumeUSDC: parseFloat(tipStats?.total_volume_usdc || '0'),
        platformRevenue: parseFloat(tipStats?.estimated_revenue || '0'),
        totalCreators: parseInt(userStats?.total_creators || '0'),
      }
    })
  } catch (error: any) {
    console.error('Admin Stats Error:', error)
    res.status(500).json({ success: false, error: 'Failed to aggregate platform stats.' })
  }
}
