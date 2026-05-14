import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { getSessionUser, getUserRoles } from "../../lib/session.js"
import { auditLog } from "../../lib/db.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.url?.split('/').filter(Boolean)[2]
  
  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) return res.status(401).json({ error: 'Authentication required' })

    const roles = await getUserRoles(sessionUser.id)
    
    // ACTION-BASED RBAC ENFORCEMENT
    if (action === 'migration' && !roles.includes('superadmin')) {
      return res.status(403).json({ error: 'System Migrations restricted to Superadmin' })
    }

    if (['creators', 'stats', 'ledger'].includes(action || '') && !roles.some(r => ['superadmin', 'support', 'compliance'].includes(r))) {
      return res.status(403).json({ error: 'Insufficient administrative permissions' })
    }

    // LOG DISPATCH EVENT
    await auditLog({
        adminId: sessionUser.id,
        actionType: `DISPATCH_${String(action).toUpperCase()}`,
        ipAddress: req.headers['x-forwarded-for'] as string || req.socket.remoteAddress
    })

    let module;
    if (action === 'creators') module = await import('./creators.js')
    if (action === 'ledger') module = await import('./ledger.js')
    if (action === 'stats') module = await import('./stats.js')
    if (action === 'migration') module = await import('./migration.js')
    if (action === 'reconcile') module = await import('./reconcile.js')

    if (module?.default) return await module.default(req, res)
    res.status(404).json({ error: 'Admin action not found' })
  } catch (err: any) {
    res.status(500).json({ error: 'Admin Dispatch Error', details: err.message })
  }
}
