import type { Request, Response, NextFunction } from 'express'
import {
  ensureCsrfToken,
  getCsrfCookieToken,
  getCsrfHeaderToken,
} from '../lib/csrf.js'
import { SESSION_COOKIE_NAME } from '../lib/session.js'
import { extractBearerToken } from '../lib/session-token.js'
import { db } from '../lib/db.js'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

const hasSessionCookie = (req: Request) => {
  const sid = (req.signedCookies || {})[SESSION_COOKIE_NAME]
  return typeof sid === 'string' && sid.trim().length > 0
}

const hasActiveSession = async (req: Request) => {
  const sid = (req.signedCookies || {})[SESSION_COOKIE_NAME]
  if (typeof sid !== 'string' || !sid.trim()) return false
  const session = await db('session').where({ id: sid }).first().catch(() => null)
  if (!session) return false
  if (session.revokedAt) return false
  if (new Date(session.expiresAt).getTime() < Date.now()) return false
  return true
}

export const csrfProtection = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.path.startsWith('/api')) {
    next()
    return
  }

  // Auth endpoints must work without CSRF headers
  if (req.path.startsWith('/api/auth')) {
    next()
    return
  }

  // Bearer-token requests are not cookie-auth flows
  if (extractBearerToken(req)) {
    next()
    return
  }

  // Enforce CSRF only for authenticated browser sessions.
  if (!hasSessionCookie(req)) {
    next()
    return
  }

  const isActiveSession = await hasActiveSession(req)
  if (!isActiveSession) {
    next()
    return
  }

  const cookieToken = ensureCsrfToken(req, res)
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next()
    return
  }

  const headerToken = getCsrfHeaderToken(req)
  const csrfCookie = getCsrfCookieToken(req)
  if (!headerToken || !csrfCookie || headerToken !== cookieToken) {
    res.status(403).json({ success: false, error: 'Invalid CSRF token' })
    return
  }

  next()
}
