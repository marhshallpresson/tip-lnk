import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.SESSION_TOKEN_SECRET || process.env.SESSION_COOKIE_SECRET || process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('❌ Critical: JWT_SECRET is not configured in environment variables.')
}

// Ensure we don't pass undefined to TextEncoder
const secret = new TextEncoder().encode(JWT_SECRET || 'fallback-secret-for-initialization-only')
const ISSUER = 'https://tip-lnk.vercel.app'
const AUDIENCE = 'tiplnk-app'

export type SessionTokenPayload = {
  v: 1
  sid: string
  uid?: string
}

/**
 * Professional Hardened JWT Signer
 */
export async function signSessionToken(payload: SessionTokenPayload, expiresAt: Date) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(AUDIENCE)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret)
}

/**
 * Professional Hardened JWT Verifier
 * Enforces algorithm, audience, issuer, and internal versioning.
 */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: ISSUER,
      clockTolerance: 30,
    })
    
    const sessionPayload = payload as unknown as SessionTokenPayload
    
    // ─── ELITE VERSION ENFORCEMENT ───
    if (sessionPayload.v !== 1) {
        console.warn('🛡️ JWT: Unsupported token version detected:', sessionPayload.v)
        return null
    }

    return sessionPayload
  } catch (err: any) {
    if (err.code === 'ERR_JWT_EXPIRED') {
        console.debug('🛡️ JWT: Token expired.')
    } else {
        console.warn('🛡️ JWT: Verification failed:', err.message)
    }
    return null
  }
}
