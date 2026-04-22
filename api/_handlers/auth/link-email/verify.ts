import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { getSessionUser } from "../../../_lib/session.js"
import { sha256Hex } from "../../../_lib/password.js"
import { patchResponse } from "../_utils.js"

/**
 * Task 2.2: Standalone Vercel Function for Email Linking Phase 2
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const { code, email } = req.body
  const user = await getSessionUser(req as any)
  if (!user) return res.status(401).json({ error: 'Session required' })

  if (!code || !email) {
    return res.status(400).json({ error: 'Code and email are required' })
  }

  try {
    const codeHash = sha256Hex(code)
    const record = await db('email_verification_token')
      .where({ userId: user.id, email, tokenHash: codeHash })
      .andWhere('expiresAt', '>', new Date())
      .first()

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' })
    }

    // Success: Update User Profile
    await db('user').where({ id: user.id }).update({
      email,
      emailVerifiedAt: new Date(),
      updated_at: new Date()
    })

    // Cleanup
    await db('email_verification_token').where({ userId: user.id }).delete()

    res.status(200).json({ success: true, message: 'Email successfully verified and linked.' })
  } catch (err) {
    console.error('Email Link Verify Fault:', err)
    res.status(500).json({ error: 'Verification failed.' })
  }
}
