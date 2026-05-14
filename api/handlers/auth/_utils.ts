import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../lib/db.js"
import { randomCode, sha256Hex, randomToken } from "../../lib/password.js"
import { randomUUID } from "crypto"
import { sendMail } from "../../lib/mailer.js"
import { templates } from "../../lib/mail-templates.js"

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
  return 'https://tipstack.fun'
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
    subject: 'Verify your email - Tip Stack',
    text: `Your verification code is ${code}`,
    html: templates.verifyEmailCode(name, code),
  }).catch(err => {
    console.error('Failed to send verification email:', err)
  })
}

/**
 * Professional Vercel Response Shim for res.cookie and res.clearCookie
 */
export function patchResponse(res: VercelResponse) {
  if ((res as any)._patched) return;
  (res as any)._patched = true;

  const cookies: string[] = []
  
  if (!(res as any).cookie) {
    (res as any).cookie = (name: string, value: string, options: any = {}) => {
      let cookieStr = `${name}=${value}; Path=${options.path || '/'}`
      if (options.httpOnly) cookieStr += '; HttpOnly'
      if (options.secure) cookieStr += '; Secure'
      if (options.sameSite) {
        const ss = String(options.sameSite).toLowerCase()
        cookieStr += `; SameSite=${ss.charAt(0).toUpperCase() + ss.slice(1)}`
      }
      if (options.maxAge) cookieStr += `; Max-Age=${Math.floor(options.maxAge / 1000)}`
      
      const index = cookies.findIndex(c => c.startsWith(`${name}=`))
      if (index !== -1) cookies.splice(index, 1)
      
      cookies.push(cookieStr)
      res.setHeader('Set-Cookie', cookies)
    }
  }

  if (!(res as any).clearCookie) {
    (res as any).clearCookie = (name: string, options: any = {}) => {
      (res as any).cookie(name, '', { ...options, maxAge: 0 })
    }
  }
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

export const parseProfileData = (value: unknown) => {
  if (!value) return {}
  if (typeof value === "object") return { ...(value as Record<string, unknown>) }
  if (typeof value !== "string") return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    return {}
  }
}

export const mergeUserHistory = async (trx: any, sourceUser: any, targetUser: any) => {
  if (!sourceUser || !targetUser || sourceUser.id === targetUser.id) return

  await trx("tips").where({ sender_id: sourceUser.id }).update({ sender_id: targetUser.id }).catch(() => null)
  await trx("tips").where({ recipient_id: sourceUser.id }).update({ recipient_id: targetUser.id }).catch(() => null)
  await trx("payouts").where({ user_id: sourceUser.id }).update({ user_id: targetUser.id }).catch(() => null)
  await trx("fiat_payment_intents").where({ creator_id: sourceUser.id }).update({ creator_id: targetUser.id }).catch(() => null)
  await trx("analytics_daily").where({ user_id: sourceUser.id }).update({ user_id: targetUser.id }).catch(() => null)
  await trx("oauth_tokens").where({ userId: sourceUser.id }).update({ userId: targetUser.id }).catch(() => null)
  await trx("session").where({ userId: sourceUser.id }).update({
    revokedAt: new Date(),
    expiresAt: new Date(),
  }).catch(() => null)
  await trx("email_verification_token").where({ userId: sourceUser.id }).delete().catch(() => null)
  await trx("password_reset_token").where({ userId: sourceUser.id }).delete().catch(() => null)
  await trx("user_roles").where({ userId: sourceUser.id }).delete().catch(() => null)
  await trx("user").where({ id: sourceUser.id }).delete()
}
