import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { sha256Hex } from "../../_lib/password.js"
import { createSession, getUserRoles } from "../../_lib/session.js"
import { normalizeEmail, patchResponse } from "./_utils.js"
import { rateLimit } from "../../_ratelimit.js"

/**
 * Endpoint: POST /api/auth/otp-verify
 * Verifies the OTP and logs the user in.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await rateLimit(req, res))) return

  patchResponse(res)

  const email = normalizeEmail(req.body?.email)
  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''

  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Email and code required' })
  }

  // SECURITY: Per-email rate limiting to prevent OTP brute-forcing
  const { Redis } = await import('@upstash/redis')
  const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
    ? new Redis({
        url: process.env.UPSTASH_REDIS_REST_URL,
        token: process.env.UPSTASH_REDIS_REST_TOKEN,
      })
    : null;

  if (redis) {
    const attemptsKey = `otp_attempts:${email}`;
    const attempts = await redis.get<number>(attemptsKey) || 0;
    if (attempts >= 5) {
      console.warn(`🛡️ OTP: Brute-force protection triggered for ${email}`);
      return res.status(429).json({ 
        success: false, 
        error: 'Too many failed attempts. Account locked for 15 minutes.' 
      });
    }
  }

  try {
    const user = await db('user').where({ email }).whereNull('deletedAt').first()
    if (!user) {
      return res.status(404).json({ success: false, error: 'Account not found' })
    }

    const codeHash = sha256Hex(code)
    const record = await db('email_verification_token')
      .where({ userId: user.id, email })
      .where('expiresAt', '>', new Date())
      .first()

    if (!record || record.tokenHash !== codeHash) {
      if (redis) {
        const attemptsKey = `otp_attempts:${email}`;
        await redis.incr(attemptsKey);
        await redis.expire(attemptsKey, 900); // 15 minute lockout
      }
      return res.status(400).json({ success: false, error: 'Invalid or expired code' })
    }

    // Success! Delete the code
    await db('email_verification_token').where({ id: record.id }).delete()
    if (redis) await redis.del(`otp_attempts:${email}`);

    // Mark email as verified if it wasn't
    if (!user.emailVerifiedAt) {
      await db('user').where({ id: user.id }).update({ emailVerifiedAt: new Date() })
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() })
    const session = await createSession(req as any, res as any, user.id)
    const roles = await getUserRoles(user.id)

    res.status(200).json({
      success: true,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        full_name: user.name,
        roles, 
        emailVerifiedAt: user.emailVerifiedAt,
        onboardingComplete: Boolean(user.onboardingComplete)
      },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })

  } catch (err) {
    console.error('OTP Verify Error:', err)
    res.status(500).json({ success: false, error: 'Verification failed' })
  }
}
