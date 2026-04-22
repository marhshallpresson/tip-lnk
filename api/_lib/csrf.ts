import { randomBytes } from 'crypto'
import type { Request, Response } from 'express'

export const CSRF_COOKIE_NAME = 'csrf_token'
const CSRF_TOKEN_BYTES = 24

const isProd = () => process.env.NODE_ENV === 'production'

const normalizeToken = (value: unknown) =>
  typeof value === 'string' ? value.trim() : ''

export const getCsrfCookieOptions = (req: Request) => {
  const isLocalhost = Boolean(req.hostname === 'localhost')
  const isHttps = Boolean(
    req.secure ||
      req.protocol === 'https' ||
      req.headers['x-forwarded-proto'] === 'https' ||
      isProd(),
  )

  let sameSite: 'lax' | 'strict' | 'none' = 'lax'
  if (process.env.COOKIE_SAMESITE) {
    const raw = process.env.COOKIE_SAMESITE.toLowerCase()
    if (raw === 'none') sameSite = 'none'
    else if (raw === 'strict') sameSite = 'strict'
  }

  if (sameSite === 'none' && !isHttps) sameSite = 'lax'

  let secure = isHttps
  if (isLocalhost) {
    secure = false
    if (sameSite === 'none') sameSite = 'lax'
  }

  if (sameSite === 'none') secure = true

  return {
    httpOnly: false,
    secure,
    sameSite,
    path: '/',
  }
}

export const createCsrfToken = () => randomBytes(CSRF_TOKEN_BYTES).toString('hex')

export const getCsrfCookieToken = (req: Request) => {
  const fromMiddleware = normalizeToken((req.cookies || {})[CSRF_COOKIE_NAME])
  if (fromMiddleware) return fromMiddleware

  // Manual Parsing Fallback (Crucial for Vercel/Serverless edge cases)
  const cookieHeader = req.headers.cookie || ''
  const cookies = cookieHeader.split(';').reduce((acc: any, curr) => {
    const [key, value] = curr.trim().split('=')
    acc[key] = value
    return acc
  }, {})
  
  return normalizeToken(cookies[CSRF_COOKIE_NAME])
}

export const getCsrfHeaderToken = (req: Request) => {
  const raw = req.headers['x-csrf-token']
  if (Array.isArray(raw)) return normalizeToken(raw[0])
  return normalizeToken(raw)
}

export const issueCsrfToken = (req: Request, res: Response) => {
  const token = createCsrfToken()
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions(req))
  return token
}

export const ensureCsrfToken = (req: Request, res: Response) => {
  const existing = getCsrfCookieToken(req)
  if (existing) return existing
  return issueCsrfToken(req, res)
}

export const verifyCsrfToken = (req: Request) => {
  const cookieToken = getCsrfCookieToken(req)
  const headerToken = getCsrfHeaderToken(req)
  if (!cookieToken || !headerToken) return false
  return cookieToken === headerToken
}

export const clearCsrfToken = (req: Request, res: Response) => {
  const opts = getCsrfCookieOptions(req)
  res.clearCookie(CSRF_COOKIE_NAME, opts as any)
}
