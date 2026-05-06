import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { normalizeEmail, patchResponse } from "./_utils.js"
import { rateLimit } from "../../_ratelimit.js"

/**
 * Endpoint: POST /api/auth/check
 * Checks the status of an account by email to determine the login flow.
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
      return res.status(200).json({
        success: true,
        exists: false
      })
    }

    res.status(200).json({
      success: true,
      exists: true,
      hasPassword: !!user.passwordHash,
      isVerified: !!user.emailVerifiedAt,
      name: user.name
    })
  } catch (err) {
    console.error('Auth Check Error:', err)
    res.status(500).json({ success: false, error: 'Check failed' })
  }
}
