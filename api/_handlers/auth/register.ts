import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { hashPassword } from "../../_lib/password.js"
import { createSession } from "../../_lib/session.js"
import { logError, serializeError } from "../../_lib/logger.js"
import { randomUUID } from "crypto"
import { normalizeEmail, normalizeName, issueEmailVerification, patchResponse } from "./_utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  patchResponse(res)

  try {
    const email = normalizeEmail(req.body?.email)
    const password = typeof req.body?.password === 'string' ? req.body.password : ''
    const name = normalizeName(req.body?.name)

    if (!email || !email.includes('@') || password.length < 8 || !name || name.length < 2 || name.length > 100) {
      res.status(400).json({ success: false, error: 'Invalid payload: Name must be 2-100 characters and password min 8 characters.' })
      return
    }

    const existing = await db('user').where({ email }).first()
    if (existing) {
      res.status(409).json({ success: false, error: 'Email already in use' })
      return
    }

    const userId = randomUUID()
    const passwordHash = await hashPassword(password)
    await db('user').insert({
      id: userId,
      email,
      name,
      passwordHash,
      profileData: JSON.stringify({}),
      created_at: new Date(),
      updated_at: new Date(),
    })

    const role = await db('roles').where({ name: 'user' }).first()
    if (role) await db('user_roles').insert({ userId, roleId: role.id })

    const session = await createSession(req as any, res as any, userId)
    void issueEmailVerification(userId, email, name).catch(() => null)

    res.status(200).json({
      success: true,
      user: { id: userId, email, name, roles: ['user'], emailVerifiedAt: null },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (e: any) {
    logError('auth_register_error', { error: serializeError(e) })
    res.status(500).json({ success: false, error: 'Registration failed' })
  }
}
