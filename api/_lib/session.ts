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

export const SESSION_COOKIE_NAME = 'sid'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

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
    profileData: any;
}

export type SessionCreateResult = {
  sessionId: string
  accessToken: string
  expiresAt: Date
}

export const getCookieOptions = (req: Request) => {
  const isLocalhost = Boolean(req.hostname === 'localhost')
  return {
    httpOnly: true,
    secure: !isLocalhost,
    sameSite: 'lax' as any,
    path: '/',
    signed: true,
    maxAge: SESSION_DURATION_MS,
  }
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
  const cookieSid = (req.signedCookies || {})[SESSION_COOKIE_NAME] as string | undefined
  let sid = cookieSid

  if (!sid) {
    const bearer = extractBearerToken(req)
    if (bearer) {
      try {
        const payload = await verifySessionToken(bearer)
        if (payload?.sid) sid = payload.sid
      } catch (tokenErr) {
        console.warn('🛡️ Auth: Invalid Bearer token detected.');
      }
    }
  }

  if (!sid) return null

  try {
    const session = await db('session').where({ id: sid }).first()
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) {
        return null;
    }

    const user = await db('user').where({ id: session.userId }).first()
    if (!user || user.deletedAt) {
        return null;
    }

    const roles = await getUserRoles(user.id)
    
    let profileData = {};
    try {
        profileData = typeof user.profileData === 'string' ? JSON.parse(user.profileData) : (user.profileData || {});
    } catch (parseErr) {}

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
        sessionId: sid,
        walletAddress: user.walletAddress,
        profileData
    }
  } catch (e: any) {
      console.error('🛡️ Auth CRITICAL: getSessionUser crashed:', e.message);
      return null
  }
}
