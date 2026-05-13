import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db, auditLog } from "../../lib/db.js"
import { getSessionUser, getUserRoles } from "../../lib/session.js"

/**
 * Task 2.2: Standalone Vercel Function for Admin Creator Management
 * Elite RBAC: Accessible to superadmin and support.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) return res.status(401).json({ error: 'Authentication required' })

    const roles = await getUserRoles(sessionUser.id)
    const canAccess = roles.some(r => ['superadmin', 'support'].includes(r))
    
    const adminSecret = req.headers['x-admin-secret']
    if (!canAccess || !adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Operational Access Required' })
    }

    // ─── ELITE SECURITY: AUDIT TRAIL ───
    await auditLog({
      adminId: sessionUser.id,
      actionType: 'VIEW_CREATOR_CRM',
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    })

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
      .select(db.raw("COUNT(CASE WHEN tips.metadata->>'isSuspicious' = 'true' THEN 1 END) as suspicious_tips"))
      .groupBy('user.id')
      .orderBy('user.created_at', 'desc')
      .limit(100)

    res.json({ success: true, creators })
  } catch (error: any) {
    console.error('Admin Creators Error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch creators list.' })
  }
}
