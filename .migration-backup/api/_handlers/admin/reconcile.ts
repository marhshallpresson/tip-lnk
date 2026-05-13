import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db, auditLog } from "../../_lib/db.js"
import { getSessionUser, getUserRoles } from "../../_lib/session.js"

/**
 * Professional Manual Reconciliation Engine
 * Restricted to Superadmin only.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) return res.status(401).json({ error: 'Authentication required' })

    const roles = await getUserRoles(sessionUser.id)
    const isSuperadmin = roles.includes('superadmin')
    
    const adminSecret = req.headers['x-admin-secret']
    if (!isSuperadmin || !adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Superadmin access required for manual reconciliation.' })
    }

    const { reference, action, reason } = req.body
    if (!reference || !action || !reason) {
      return res.status(400).json({ error: 'Reference, action (complete/fail), and reason are required.' })
    }

    const payout = await db('payouts').where({ pajcash_reference: reference }).first()
    if (!payout) return res.status(404).json({ error: 'Payout record not found.' })

    const nextStatus = action === 'complete' ? 'completed' : 'failed'
    
    // ─── ELITE SECURITY: TRANSACTIONAL RECONCILIATION ───
    await db.transaction(async (trx) => {
        await trx('payouts').where({ id: payout.id }).update({
            status: nextStatus,
            updated_at: new Date()
        })

        await auditLog({
            adminId: sessionUser.id,
            actionType: `MANUAL_RECONCILE_${action.toUpperCase()}`,
            targetId: payout.id,
            metadata: { reference, reason, oldStatus: payout.status, nextStatus },
            ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
        })
    })

    res.json({ success: true, status: nextStatus })
  } catch (error: any) {
    console.error('Admin Reconcile Error:', error)
    res.status(500).json({ success: false, error: 'Reconciliation operation failed.' })
  }
}
