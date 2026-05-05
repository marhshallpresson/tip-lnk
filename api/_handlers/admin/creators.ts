import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Admin Creator Management
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const adminSecret = req.headers['x-admin-secret']
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Elite Admin Access Required' })
  }

  try {
    const creators = await db('user')
      .leftJoin('tips', 'user.id', 'tips.recipient_id')
      .select(
        'user.id', 
        'user.email', 
        'user.name', 
        'user.walletAddress', 
        'user.twitterHandle', 
        'user.discordHandle', 
        'user.solDomain', 
        'user.created_at', 
        'user.lastLoginAt'
      )
      .count('tips.signature as total_tips')
      .count({
        suspicious_tips: db.raw("CASE WHEN tips.metadata->>'isSuspicious' = 'true' THEN 1 ELSE NULL END")
      })
      .groupBy('user.id')
      .orderBy('user.created_at', 'desc')
      .limit(100)

    res.json({ success: true, creators })
  } catch (error: any) {
    console.error('Admin Creators Error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch creators list.' })
  }
}
