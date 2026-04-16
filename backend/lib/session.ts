import { Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { db } from './db.js'
import { log } from './logger.js'
import { clearCsrfToken, issueCsrfToken } from './csrf.js'
import {
  extractBearerToken,
  resolveSessionTokenSecret,
  signSessionToken,
  verifySessionToken,
} from './session-token.js'

export const SESSION_COOKIE_NAME = 'sid'
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

export interface SessionUser {
  id: string
  email: string
  name: string
  roles: string[]
  emailVerifiedAt: Date | null
  sessionId: string
  profileData?: any
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
    createdAt: new Date()
  })

  const opts = getCookieOptions(req)
  res.cookie(SESSION_COOKIE_NAME, sessionId, opts)
  issueCsrfToken(req, res)

  const secret = resolveSessionTokenSecret()
  const nowSec = Math.floor(Date.now() / 1000)
  const expSec = Math.floor(expiresAt.getTime() / 1000)
  const accessToken = signSessionToken(
    { v: 1, sid: sessionId, uid: userId, iat: nowSec, exp: expSec },
    secret,
  )
  
  return { sessionId, accessToken, expiresAt }
}

export const destroySession = async (req: Request, res: Response) => {
  const cookieSid = (req.signedCookies || {})[SESSION_COOKIE_NAME] as string | undefined
  const bearer = extractBearerToken(req)
  const secret = resolveSessionTokenSecret()
  const tokenSid = bearer ? verifySessionToken(bearer, secret)?.sid : null
  const sid = cookieSid || tokenSid || undefined
  
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
      const secret = resolveSessionTokenSecret()
      const payload = verifySessionToken(bearer, secret)
      if (payload?.sid) sid = payload.sid
    }
  }

  if (!sid) return null

  try {
    const session = await db('session').where({ id: sid }).first()
    if (!session || session.revokedAt || new Date(session.expiresAt).getTime() < Date.now()) return null
    const user = await db('user').where({ id: session.userId }).first()
    if (!user || user.deletedAt) return null

    const roles = await getUserRoles(user.id)
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        roles,
        emailVerifiedAt: user.emailVerifiedAt,
        sessionId: sid,
        profileData: typeof user.profileData === 'string' ? JSON.parse(user.profileData) : user.profileData
    }
  } catch (e) {
      return null
  }
}
