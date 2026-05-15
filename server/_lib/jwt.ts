import { SignJWT, jwtVerify } from 'jose'

const JWT_SECRET = process.env.SESSION_TOKEN_SECRET || process.env.SESSION_SECRET || process.env.SESSION_COOKIE_SECRET || process.env.JWT_SECRET
if (!JWT_SECRET) {
  throw new Error('SESSION_TOKEN_SECRET, SESSION_SECRET, SESSION_COOKIE_SECRET, or JWT_SECRET must be set.')
}

const secret = new TextEncoder().encode(JWT_SECRET)
const ISSUER = 'https://tip-lnk.vercel.app'
const AUDIENCE = 'tipstack-app'

export type SessionTokenPayload = {
  v: 1
  sid: string
  uid?: string
}

export async function signSessionToken(payload: SessionTokenPayload, expiresAt: Date) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setAudience(AUDIENCE)
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(secret)
}

export async function verifySessionToken(token: string): Promise<SessionTokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ['HS256'],
      audience: AUDIENCE,
      issuer: ISSUER,
      clockTolerance: 30,
    })
    const sessionPayload = payload as unknown as SessionTokenPayload
    if (sessionPayload.v !== 1) return null
    return sessionPayload
  } catch {
    return null
  }
}
