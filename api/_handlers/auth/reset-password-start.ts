import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { randomToken, sha256Hex } from "../../_lib/password.js"
import { randomUUID } from "crypto"
import { sendMail } from "../../_lib/mailer.js"
import { templates } from "../../_lib/mail-templates.js"
import { normalizeEmail, appUrl, patchResponse } from "./_utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  try {
    const email = normalizeEmail(req.body?.email)
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' })
    }

    const user = await db('user').where({ email }).whereNull('deletedAt').first()
    
    // We always return success to prevent email enumeration
    if (!user) {
      return res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' })
    }

    const token = randomToken()
    const tokenHash = sha256Hex(token)
    const expiresAt = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour

    await db('password_reset_token').where({ userId: user.id }).delete()

    await db('password_reset_token').insert({
      id: randomUUID(),
      userId: user.id,
      tokenHash,
      expiresAt,
      created_at: new Date(),
    })

    const resetLink = `${appUrl(req)}/reset-password?token=${token}&email=${encodeURIComponent(email)}`

    await sendMail({
      to: email,
      subject: 'Reset your password - TipLnk',
      text: `Click the link to reset your password: ${resetLink}`,
      html: templates.resetPassword(user.name || 'Creator', resetLink),
    })

    res.status(200).json({ success: true, message: 'If an account exists, a reset link has been sent.' })
  } catch (err: any) {
    console.error('Reset password start error:', err)
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
