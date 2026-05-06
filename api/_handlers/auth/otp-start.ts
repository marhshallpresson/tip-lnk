import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import { db } from "../../_lib/db.js"
import { sendMail } from "../../_lib/mailer.js"
import { randomCode, sha256Hex } from "../../_lib/password.js"
import { normalizeEmail, patchResponse } from "./_utils.js"
import { rateLimit } from "../../_ratelimit.js"

/**
 * Endpoint: POST /api/auth/otp-start
 * Initiates the passwordless login flow by sending an OTP.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await rateLimit(req, res))) return

  patchResponse(res)

  try {
    const email = normalizeEmail(req.body?.email)
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email required' })
    }

    const user = await db('user').where({ email }).whereNull('deletedAt').first()
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found' })
    }

    const code = randomCode(6)
    const codeHash = sha256Hex(code)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 minutes

    // Store in email_verification_token table (reusing for OTP)
    await db('email_verification_token').where({ userId: user.id }).delete()
    await db('email_verification_token').insert({
        id: randomUUID(),
        userId: user.id,
        email,
        tokenHash: codeHash,
        expiresAt,
        created_at: new Date()
    })

    await sendMail({
      to: email,
      subject: `Login Verification Code: ${code} - Tip Stack`,
      text: `Your Tip Stack login verification code is: ${code}`,
      html: `
        <div style="font-family: sans-serif; background: #0d1117; color: white; padding: 40px; border-radius: 20px;">
          <h2 style="color: #00d265;">Login Verification</h2>
          <p style="font-size: 16px;">Use the code below to sign in to your Tip Stack account:</p>
          <div style="background: #161b22; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 10px; color: #00d265;">${code}</span>
          </div>
          <p style="color: #8b949e; font-size: 12px;">This code expires in 10 minutes.</p>
          <p style="color: #8b949e; font-size: 12px;">If you didn't request this, you can safely ignore this email.</p>
        </div>
      `
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('OTP Start Error:', err)
    res.status(500).json({ success: false, error: 'Failed to send verification code' })
  }
}
