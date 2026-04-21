import crypto from 'crypto'
import type { Request } from 'express'

export type SessionTokenPayload = {
  v: 1
  sid: string
  uid?: string
  iat: number // seconds
  exp: number // seconds
}

const base64UrlEncode = (input: Buffer | string) => {
  const buf = typeof input === 'string' ? Buffer.from(input, 'utf8') : input
  return buf
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
}

const base64UrlDecode = (input: string) => {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/')
  const padLen = (4 - (normalized.length % 4)) % 4
  const padded = normalized + '='.repeat(padLen)
  return Buffer.from(padded, 'base64')
}

const safeJsonParse = (raw: string) => {
  try {
    return JSON.parse(raw)
  } catch {
    return null
  }
}

const timingSafeEqual = (a: string, b: string) => {
  const aa = Buffer.from(a)
  const bb = Buffer.from(b)
  if (aa.length !== bb.length) return false
  return crypto.timingSafeEqual(aa, bb)
}

export const resolveSessionTokenSecret = () =>
  String(process.env.SESSION_TOKEN_SECRET || process.env.SESSION_COOKIE_SECRET )

export const extractBearerToken = (req: Request) => {
  const raw = req.headers.authorization
  if (!raw || typeof raw !== 'string') return ''
  const parts = raw.trim().split(/\s+/)
  if (parts.length !== 2) return ''
  if (parts[0].toLowerCase() !== 'bearer') return ''
  return parts[1] || ''
}

export const signSessionToken = (payload: SessionTokenPayload, secret: string) => {
  const header = { alg: 'HS256', typ: 'JWT', v: 1 }
  const h = base64UrlEncode(JSON.stringify(header))
  const p = base64UrlEncode(JSON.stringify(payload))
  const data = `${h}.${p}`
  const sig = base64UrlEncode(crypto.createHmac('sha256', secret).update(data).digest())
  return `${h}.${p}.${sig}`
}

export const verifySessionToken = (token: string, secret: string): SessionTokenPayload | null => {
  if (!token) return null
  const parts = token.split('.')
  if (parts.length !== 3) return null

  const [h, p, s] = parts
  if (!h || !p || !s) return null

  const data = `${h}.${p}`
  const expected = base64UrlEncode(crypto.createHmac('sha256', secret).update(data).digest())
  if (!timingSafeEqual(expected, s)) return null

  const payloadRaw = base64UrlDecode(p).toString('utf8')
  const payload = safeJsonParse(payloadRaw) as SessionTokenPayload | null
  if (!payload || payload.v !== 1) return null
  if (typeof payload.sid !== 'string' || !payload.sid.trim()) return null
  if (typeof payload.iat !== 'number' || typeof payload.exp !== 'number') return null

  const now = Math.floor(Date.now() / 1000)
  if (payload.exp <= now) return null

  return payload
}
