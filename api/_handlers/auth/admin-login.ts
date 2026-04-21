import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../_cors.js"
import { db } from "../../_lib/db.js"
import { verifyPassword } from "../../_lib/password.js"
import { createSession, getUserRoles } from "../../_lib/session.js"
import { patchResponse } from "./_utils.js"

/**
 * Task 2.2: Standalone Vercel Function for Admin Login
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const { email, password } = req.body
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL

  if (!email || email !== ADMIN_EMAIL) {
    return res.status(403).json({ success: false, error: 'Unauthorized administrative access.' })
  }

  try {
    const user = await db('user').where({ email }).first()
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' })
    }

    const isValid = await verifyPassword(password, user.passwordHash)
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials.' })
    }

    const session = await createSession(req as any, res as any, user.id)
    const roles = await getUserRoles(user.id)

    res.status(200).json({
      success: true,
      user: { id: user.id, email: user.email, name: user.name, roles },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('[auth/admin/login]', err)
    res.status(500).json({ success: false, error: 'Internal server error during admin login.' })
  }
}
