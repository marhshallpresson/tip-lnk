import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { verifyPassword } from "../../_lib/password.js"
import { createSession, getUserRoles } from "../../_lib/session.js"
import { logError, serializeError } from "../../_lib/logger.js"
import { normalizeEmail, patchResponse } from "./_utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  patchResponse(res)

  try {
    const email = normalizeEmail(req.body?.email)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    if (!email || !password) {
      res.status(400).json({ success: false, error: 'Invalid payload' })
      return
    }

    const user = await db('user').where({ email }).whereNull('deletedAt').first()
    if (!user || !user.passwordHash) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    const valid = await verifyPassword(password, user.passwordHash)
    if (!valid) {
      res.status(401).json({ success: false, error: 'Invalid credentials' })
      return
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() })
    const session = await createSession(req as any, res as any, user.id)
    const roles = await getUserRoles(user.id)

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, roles, emailVerifiedAt: user.emailVerifiedAt },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (e: any) {
    logError('auth_login_error', { error: serializeError(e) })
    res.status(500).json({ success: false, error: 'Login failed' })
  }
}
