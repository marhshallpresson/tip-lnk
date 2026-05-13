import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { db } from './db.js'
import { clearCsrfToken, issueCsrfToken } from './csrf.js'
export const extractBearerToken = (req: Request): string | null => {
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }
  return null
}
import { signSessionToken, verifySessionToken } from './jwt.js'
import { decrypt } from './crypto.js'

export const SESSION_COOKIE_NAME = 'sid'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000

export interface SessionUser {
    id: string;
    email: string | null;
    name: string | null;
    full_name: string | null;
    first_name: string | null;
    roles: string[];
    emailVerifiedAt: Date | null;
    onboardingComplete: boolean;
    onboarding_complete: boolean;
    sessionId: string;
    walletAddress?: string;
    encryptedWalletAddress?: string;
    walletAddressHash?: string;
    profileData: any;
}

export type SessionCreateResult = {
  sessionId: string
  accessToken: string
  expiresAt: Date
}

export const getCookieOptions = (req: Request) => {
  const host = req.hostname || ''
  const isLocalhost = host === 'localhost' || host === '127.0.0.1'
  // Never pin domain on non-production hosts (Replit dev, staging, etc.)
  // so cookies are scoped to whatever host the browser is on.
  const isProdHost = host === 'tipstack.fun' || host === 'www.tipstack.fun' || host.endsWith('.tipstack.fun') || host.endsWith('.tipstack.com')
  const options: any = {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: isLocalhost ? 'lax' : 'none' as any,
    path: '/',
    signed: true,
    maxAge: SESSION_DURATION_MS,
  }
  if (isProdHost) {
    options.domain = '.tipstack.fun'
  }
  return options
}

export const createSession = async (
  req: Request,
  res: Response,
  userId: string,
): Promise<SessionCreateResult> => {
  const sessionId = randomUUID()
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS)
  const userAgent = (req.headers['user-agent'] as string) || null
  const ip = (req.headers['x-forwarded-for'] as string) || req.ip

  await db('session').insert({
    id: sessionId,
    userId,
    expiresAt,
    userAgent,
    ip,
    created_at: new Date()
  })

  const opts = getCookieOptions(req)
  res.cookie(SESSION_COOKIE_NAME, sessionId, opts)
  issueCsrfToken(req, res)

  const accessToken = await signSessionToken(
    { v: 1, sid: sessionId, uid: userId },
    expiresAt,
  )
  
  return { sessionId, accessToken, expiresAt }
}

export const destroySession = async (req: Request, res: Response) => {
  const cookieSid = (req.signedCookies || {})[SESSION_COOKIE_NAME] as string | undefined
  const bearer = extractBearerToken(req)
  const tokenPayload = bearer ? await verifySessionToken(bearer) : null
  const sid = cookieSid || tokenPayload?.sid || undefined
  
  if (sid) {
    await db('session').where({ id: sid }).update({
      revokedAt: new Date(),
      expiresAt: new Date()
    }).catch(() => null)
  }
  
  const opts = getCookieOptions(req)
  res.clearCookie(SESSION_COOKIE_NAME, opts as any)
  clearCsrfToken(req, res)
}

export const revokeAllUserSessions = async (userId: string) => {
  await db('session').where({ userId }).update({
    revokedAt: new Date(),
    expiresAt: new Date(),
  }).catch(() => null)
}

export const getUserRoles = async (userId: string) => {
  const rolesRaw = await db('user_roles')
    .join('roles', 'user_roles.roleId', 'roles.id')
    .where({ userId })
    .select('roles.name')
  let roles = rolesRaw.map((r: any) => r.name)
  if (roles.length === 0) roles.push('user')
  return roles
}

export const getSessionUser = async (req: Request): Promise<SessionUser | null> => {
  const validateSession = async (sid: string | undefined): Promise<SessionUser | null> => {
    if (!sid || typeof sid !== 'string' || sid.length < 20) {
      console.log('🛡️ session debug: invalid sid format', sid);
      return null
    }
    
    // SID Cleaning
    let cleanSid = sid;
    if (cleanSid.startsWith('s:')) {
      cleanSid = cleanSid.slice(2).split('.')[0]
    }

    try {
      const session = await db('session').where({ id: cleanSid }).first()
      if (!session) {
        console.log('🛡️ session debug: session not found', cleanSid);
        return null;
      }
      if (session.revokedAt) {
        console.log('🛡️ session debug: session revoked', cleanSid);
        return null;
      }
      if (new Date(session.expiresAt).getTime() < Date.now()) {
        console.log('🛡️ session debug: session expired', cleanSid, session.expiresAt);
        return null;
      }

      const user = await db('user').where({ id: session.userId }).first()
      if (!user || user.deletedAt) {
          console.log('🛡️ session debug: user not found or deleted', session.userId);
          return null;
      }

      const roles = await getUserRoles(user.id)
      
      let profileData = {};
      try {
          profileData = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData || {});
      } catch (parseErr) {}

      let walletAddress = user.walletAddress;
      if (!walletAddress && user.encryptedWalletAddress) {
          try {
              walletAddress = decrypt(user.encryptedWalletAddress);
          } catch (e) {
              console.error('🛡️ Decryption failure in session:', user.id);
          }
      }

      return {
          id: user.id,
          email: user.email,
          name: user.name,
          full_name: user.name,
          first_name: user.name ? user.name.split(' ')[0] : null,
          roles,
          emailVerifiedAt: user.emailVerifiedAt,
          onboardingComplete: Boolean(user.onboardingComplete),
          onboarding_complete: Boolean(user.onboardingComplete),
          sessionId: cleanSid,
          walletAddress,
          encryptedWalletAddress: user.encryptedWalletAddress,
          walletAddressHash: user.walletAddressHash,
          profileData
      }
    } catch (e) {
      console.error('🛡️ Auth: session SID lookup failed:', cleanSid, e);
      return null
    }
  }

  // Tier 1: Bearer Token
  const bearer = extractBearerToken(req)
  if (bearer) {
    try {
      const payload = await verifySessionToken(bearer)
      const user = await validateSession(payload?.sid)
      if (user) return user
    } catch (e) {}
  }

  // Tier 2: Signed Cookie
  const signedSid = (req.signedCookies || {})[SESSION_COOKIE_NAME]
  const signedUser = await validateSession(signedSid)
  if (signedUser) return signedUser

  // Tier 3: Plain Cookie
  const plainSid = (req.cookies || {})[SESSION_COOKIE_NAME]
  const plainUser = await validateSession(plainSid)
  if (plainUser) return plainUser

  // Fallback: Manual Cookie Parsing (Tier 3 fallback)
  const cookieHeader = req.headers.cookie || ''
  if (cookieHeader) {
    const cookies = cookieHeader.split(';').reduce((acc: any, curr) => {
      const parts = curr.trim().split('=')
      const key = parts[0]
      const value = parts.slice(1).join('=')
      if (key && value) {
        try {
          acc[key] = decodeURIComponent(value)
        } catch (e) {
          acc[key] = value
        }
      }
      return acc
    }, {})
    const manualUser = await validateSession(cookies[SESSION_COOKIE_NAME])
    if (manualUser) return manualUser
  }

  return null
}
