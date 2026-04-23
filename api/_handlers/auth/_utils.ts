import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { randomCode, sha256Hex, randomToken } from "../../_lib/password.js"
import { randomUUID } from "crypto"
import { sendMail } from "../../_lib/mailer.js"
import { templates } from "../../_lib/mail-templates.js"
import * as oidc from "openid-client"

export const normalizeBaseUrl = (url: string) => url.trim().replace(/\/+$/, '')

export const firstHeaderValue = (value: string | string[] | undefined) => {
  if (!value) return ''
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw || '').split(',')[0]?.trim() || ''
}

export const inferredOrigin = (req?: VercelRequest) => {
  if (!req) return ''
  const proto = firstHeaderValue(req.headers['x-forwarded-proto']) || 'https'
  const host = firstHeaderValue(req.headers['x-forwarded-host']) || firstHeaderValue(req.headers['host']) || ''
  if (!host) return ''
  return normalizeBaseUrl(`${proto}://${host}`)
}

export const appUrl = (req?: VercelRequest) => {
  const env = normalizeBaseUrl(process.env.APP_URL || '')
  if (env) return normalizeBaseUrl(env)
  const fallback = inferredOrigin(req)
  if (fallback) return fallback
  return 'https://tip-lnk.vercel.app'
}

export const apiUrl = (req?: VercelRequest) => {
  const env = normalizeBaseUrl(process.env.API_URL || '')
  if (env) return normalizeBaseUrl(env)
  const fallback = inferredOrigin(req)
  if (fallback) return fallback
  return appUrl(req)
}

export const normalizeEmail = (v: unknown) => (typeof v === 'string' ? v.trim().toLowerCase() : '')

export const normalizeName = (v: unknown) => {
  if (typeof v !== 'string') return ''
  const s = v.trim()
  return s.length > 0 ? s : ''
}

export const findUserByEmailInsensitive = async (email: string) => {
  const normalized = normalizeEmail(email)
  if (!normalized) return null
  return db('user')
    .whereNull('deletedAt')
    .whereRaw('LOWER(email) = ?', [normalized])
    .first()
}

export const emailVerifyTtlMs = () => 60 * 60 * 1000

export const issueEmailVerification = async (userId: string, email: string, name: string) => {
  const code = randomCode(6)
  const tokenHash = sha256Hex(code)
  const expiresAt = new Date(Date.now() + emailVerifyTtlMs())

  await db('email_verification_token').where({ userId }).delete()

  await db('email_verification_token').insert({
    id: randomUUID(),
    userId,
    tokenHash,
    expiresAt,
    created_at: new Date(),
  })

  console.log(`[Email Verification] Code for ${email}: ${code}`)

  await sendMail({
    to: email,
    subject: 'Verify your email - TipLnk',
    text: `Your verification code is ${code}`,
    html: templates.verifyEmailCode(name, code),
  }).catch(err => {
    console.error('Failed to send verification email:', err)
  })
}

/**
 * Professional Vercel Response Shim for res.cookie
 */
export function patchResponse(res: VercelResponse) {
  const cookies: string[] = []
  if (!(res as any).cookie) {
    (res as any).cookie = (name: string, value: string, options: any) => {
      let cookieStr = `${name}=${value}; Path=${options.path || '/'}`
      if (options.httpOnly) cookieStr += '; HttpOnly'
      if (options.secure) cookieStr += '; Secure'
      if (options.sameSite) {
        // Standardize SameSite
        const ss = options.sameSite.toLowerCase()
        cookieStr += `; SameSite=${ss.charAt(0).toUpperCase() + ss.slice(1)}`
      }
      if (options.maxAge) cookieStr += `; Max-Age=${Math.floor(options.maxAge / 1000)}`
      cookies.push(cookieStr)
      res.setHeader('Set-Cookie', cookies)
    }
  }
}

export const hostFromAbsoluteUrl = (value: string) => {
  try {
    return new URL(value).hostname.toLowerCase()
  } catch {
    return ''
  }
}

export const oauthRedirectUrl = (req?: VercelRequest) => {
  const env = normalizeBaseUrl(process.env.GOOGLE_REDIRECT_URL || '')
  const inferred = inferredOrigin(req)
  if (req && inferred) {
    const inferredHost = hostFromAbsoluteUrl(inferred)
    const envHost = hostFromAbsoluteUrl(env)
    if (env && /^https?:\/\//i.test(env) && envHost === inferredHost) return env
    return `${inferred}/api/auth/google/callback`
  }
  if (env && /^https?:\/\//i.test(env)) return env
  return `${apiUrl(req)}/api/auth/google/callback`
}

export type OAuthErrorCode =
  | 'missing_state'
  | 'invalid_client'
  | 'invalid_grant'
  | 'google_disabled'
  | 'oauth_not_configured'
  | 'oauth_failed'

export const classifyGoogleOAuthError = (err: unknown): OAuthErrorCode => {
  const e = err as any
  const parts = [
    e?.error,
    e?.code,
    e?.message,
  ].filter(Boolean).map(v => String(v).toLowerCase()).join(' | ')

  if (parts.includes('google_oauth_not_configured')) return 'oauth_not_configured'
  if (parts.includes('google_disabled')) return 'google_disabled'
  if (parts.includes('invalid_client')) return 'invalid_client'
  if (parts.includes('invalid_grant')) return 'invalid_grant'
  if (parts.includes('state') || parts.includes('nonce')) return 'missing_state'
  return 'oauth_failed'
}

export const redirectToLoginWithOAuthError = (
  req: VercelRequest,
  res: VercelResponse,
  code: OAuthErrorCode,
  nextPath?: string,
) => {
  const redirect = new URL('/login', appUrl(req))
  redirect.searchParams.set('oauth_error', code)
  const rawNext = typeof nextPath === 'string' ? nextPath.trim() : ''
  if (rawNext.startsWith('/')) {
    redirect.searchParams.set('next', rawNext)
  }
  res.setHeader('Location', redirect.toString())
  res.status(302).end()
}

let googleConfigPromise: Promise<oidc.Configuration> | null = null

export const getGoogleConfig = async (): Promise<oidc.Configuration> => {
  if (googleConfigPromise) return googleConfigPromise
  googleConfigPromise = (async () => {
    const clientId = String(process.env.GOOGLE_CLIENT_ID || '').trim()
    const clientSecret = String(process.env.GOOGLE_CLIENT_SECRET || '').trim()
    if (!clientId) throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: GOOGLE_CLIENT_ID')
    if (!clientSecret) throw new Error('GOOGLE_OAUTH_NOT_CONFIGURED: GOOGLE_CLIENT_SECRET')
    return oidc.discovery(new URL('https://accounts.google.com'), clientId, clientSecret)
  })().catch((err) => {
    googleConfigPromise = null
    throw err
  })
  return googleConfigPromise
}

export const oauthExchangeTtlMs = () => 10 * 60 * 1000

export const issueAuthExchangeCode = async (sessionId: string) => {
  const code = randomToken()
  const codeHash = sha256Hex(code)
  const expiresAt = new Date(Date.now() + oauthExchangeTtlMs())

  await db('authexchangecode').where({ sessionId }).delete().catch(() => null)

  await db('authexchangecode').insert({
    id: randomUUID(),
    sessionId,
    codeHash,
    expiresAt,
    usedAt: null,
    created_at: new Date(),
  })

  return { code, expiresAt }
}
