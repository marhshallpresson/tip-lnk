import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../../_cors.js"
import { db } from "../../_lib/db.js"
import { sha256Hex } from "../../_lib/password.js"
import { getUserRoles } from "../../_lib/session.js"
import { signSessionToken } from "../../_lib/jwt.js"
import { patchResponse } from "./_utils.js"

/**
 * Task 2.2: Standalone Vercel Function for Session Exchange
 * Hardened with async jose JWT logic.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  try {
    const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
    if (!code) {
      return res.status(400).json({ success: false, error: 'Code required' })
    }

    const codeHash = sha256Hex(code)
    const record = await db('authexchangecode').where({ codeHash }).first()
    if (!record || new Date(record.expiresAt).getTime() < Date.now() || record.usedAt) {
      return res.status(400).json({ success: false, error: 'Invalid or expired code' })
    }

    await db('authexchangecode').where({ id: record.id }).update({ usedAt: new Date() })

    const session = await db('session').where({ id: record.sessionId }).first()
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
      return res.status(401).json({ success: false, error: 'Session invalid' })
    }

    const user = await db('user').where({ id: session.userId }).whereNull('deletedAt').first()
    const roles = await getUserRoles(user.id)
    
    // Task 1.4: Hardened SignJWT via centralized backend/lib/jwt.ts
    const accessToken = await signSessionToken({
      v: 1, sid: session.id, uid: user.id
    }, new Date(session.expiresAt))

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, roles, emailVerifiedAt: user.emailVerifiedAt },
      auth: { accessToken, tokenType: 'Bearer', expiresAt: session.expiresAt }
    })
  } catch (e: any) {
    res.status(500).json({ success: false, error: 'Exchange failed' })
  }
}
