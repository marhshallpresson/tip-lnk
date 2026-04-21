import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import { applyCors } from "../../_cors.js"
import { db } from "../../../backend/lib/db.js"
import { getSessionUser } from "../../../backend/lib/session.js"
import { sendMail } from "../../../backend/lib/mailer.js"
import { randomCode, sha256Hex } from "../../../backend/lib/password.js"
import { patchResponse } from "../_utils.js"

/**
 * Task 2.2: Standalone Vercel Function for Email Linking Phase 1
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const { email } = req.body
  const user = await getSessionUser(req as any)
  if (!user) return res.status(401).json({ error: 'Session required' })

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email required' })
  }

  try {
    const code = randomCode(6)
    const codeHash = sha256Hex(code)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 mins

    // Store verification intent
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
      subject: `Verification Code: ${code} - TipLnk`,
      text: `Your TipLnk verification code is: ${code}`,
      html: `
        <div style="font-family: sans-serif; background: #0d1117; color: white; padding: 40px; border-radius: 20px;">
          <h2 style="color: #00d265;">Verify your Email</h2>
          <p style="font-size: 16px;">Enter the code below to link this email to your TipLnk profile:</p>
          <div style="background: #161b22; padding: 20px; text-align: center; border-radius: 12px; margin: 20px 0;">
            <span style="font-size: 32px; font-weight: 900; letter-spacing: 10px; color: #00d265;">${code}</span>
          </div>
          <p style="color: #8b949e; font-size: 12px;">This code expires in 15 minutes.</p>
        </div>
      `
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Email Link Start Fault:', err)
    res.status(500).json({ error: 'Failed to send verification email.' })
  }
}
