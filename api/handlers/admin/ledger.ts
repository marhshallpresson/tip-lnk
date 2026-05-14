import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db, auditLog } from "../../lib/db.js"
import { getSessionUser, getUserRoles } from "../../lib/session.js"

/**
 * Task 2.2: Standalone Vercel Function for Admin Ledger
 * Elite RBAC: Accessible to superadmin and compliance.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) return res.status(401).json({ error: 'Authentication required' })

    const roles = await getUserRoles(sessionUser.id)
    const canAccess = roles.some(r => ['superadmin', 'compliance'].includes(r))
    
    const adminSecret = req.headers['x-admin-secret']
    if (!canAccess || !adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Compliance Access Required' })
    }

    // ─── ELITE SECURITY: AUDIT TRAIL ───
    await auditLog({
      adminId: sessionUser.id,
      actionType: 'VIEW_LEDGER',
      ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    })

    const ledger = await db('tips')
      .select('signature', 'timestamp', 'sender', 'recipient', 'amount', 'tokenSymbol', 'status', 'method', 'metadata')
      .orderBy('timestamp', 'desc')
      .limit(100)

    res.json({ success: true, ledger })
  } catch (error: any) {
    console.error('Admin Ledger Error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch global ledger.' })
  }
}
