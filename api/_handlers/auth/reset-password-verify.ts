import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { sha256Hex, hashPassword } from "../../_lib/password.js"
import { normalizeEmail, patchResponse } from "./_utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  try {
    const { token, password } = req.body
    const email = normalizeEmail(req.body?.email)

    if (!token || !password || !email) {
      return res.status(400).json({ success: false, error: 'Token, email, and new password are required' })
    }

    if (password.length < 8) {
      return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' })
    }

    const user = await db('user').where({ email }).whereNull('deletedAt').first()
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' })
    }

    const tokenHash = sha256Hex(token)
    const resetToken = await db('password_reset_token')
      .where({ userId: user.id, tokenHash })
      .first()

    if (!resetToken) {
      return res.status(401).json({ success: false, error: 'Invalid or expired reset token' })
    }

    if (new Date() > new Date(resetToken.expiresAt)) {
      await db('password_reset_token').where({ id: resetToken.id }).delete()
      return res.status(401).json({ success: false, error: 'Reset token has expired' })
    }

    const passwordHash = await hashPassword(password)
    await db('user').where({ id: user.id }).update({ 
      passwordHash,
      updated_at: new Date()
    })

    // Revoke all sessions for security
    await db('session').where({ userId: user.id }).delete()

    // Delete the reset token
    await db('password_reset_token').where({ userId: user.id }).delete()

    res.status(200).json({ success: true, message: 'Password has been reset successfully. Please log in with your new password.' })
  } catch (err: any) {
    console.error('Reset password verify error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
