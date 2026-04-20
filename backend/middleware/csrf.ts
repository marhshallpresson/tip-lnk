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
  try {
      const sid = (req.signedCookies || {})[SESSION_COOKIE_NAME]
      if (typeof sid !== 'string' || !sid.trim()) return false
      const session = await db('session').where({ id: sid }).first()
      if (!session) return false
      if (session.revokedAt) return false
      if (new Date(session.expiresAt).getTime() < Date.now()) return false
      return true
  } catch (e) {
      console.error('CSRF Session Check Fault:', e)
      return false
  }
}

export const csrfProtection = async (req: Request, res: Response, next: NextFunction) => {
  // ─── Elite Skip Logic ───
  // 1. Skip if not an API route
  if (!req.path.startsWith('/api')) {
    next()
    return
  }

  // 2. Skip for SAFE methods (GET, HEAD, OPTIONS)
  // This ensures profile fetches and initial data loads never hit a 403.
  if (SAFE_METHODS.has(req.method.toUpperCase())) {
    next()
    return
  }

  // 3. Skip for profile loads (Public data)
  if (req.path.startsWith('/api/solana/profile')) {
    next()
    return
  }

  // 4. Skip for Auth endpoints except state-changing ones that need CSRF protection
  if (req.path.startsWith('/api/auth') && !req.path.startsWith('/api/auth/link-email')) {
    next()
    return
  }

  // 4. Skip if Bearer token is present (Mobile/API flow)
  if (extractBearerToken(req)) {
    next()
    return
  }

  // ─── Enforced CSRF for State-Changing Requests ───
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
  const headerToken = getCsrfHeaderToken(req)
  const csrfCookie = getCsrfCookieToken(req)

  if (!headerToken || !csrfCookie || headerToken !== cookieToken) {
    res.status(403).json({ success: false, error: 'Invalid CSRF token' })
    return
  }

  next()
}
