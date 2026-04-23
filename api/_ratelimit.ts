import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const LIMIT = 100 
const tracker = new Map<string, { count: number; lastReset: number }>()

/**
 * Task 2.3: Professional Rate Limiter Utility
 * Elite Hardening: Vercel KV with Memory Fallback.
 */
export async function rateLimit(req: VercelRequest, res: VercelResponse): Promise<boolean> {
  const ip = (req.headers['x-forwarded-for'] as string) || (req.socket.remoteAddress) || 'anonymous'
  const route = req.url?.split('?')[0] || '/'
  
  const isAuth = route.includes('/auth/')
  const limit = isAuth ? 10 : LIMIT
  const windowSecs = 60

  const key = `rl:${ip}:${isAuth ? 'auth' : 'api'}`

  // ─── ELITE DISTRIBUTED PATTERN ───
  try {
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      const currentCount = await kv.incr(key)
      if (currentCount === 1) await kv.expire(key, windowSecs)
  
      res.setHeader('X-RateLimit-Limit', limit)
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - currentCount))
  
      if (currentCount > limit) {
        console.warn(`🛡️ KV RateLimit: Blocked excessive requests from ${ip} on ${route}`)
        res.status(429).json({ 
            error: 'Too many requests', 
            message: 'Security threshold exceeded. Please slow down.' 
        })
        return false
      }
      return true
    }
  } catch (err) {
    console.error('KV Rate Limit Failure, falling back to memory:', err)
  }

  // ─── MEMORY FALLBACK ───
  const now = Date.now()
  const record = tracker.get(key) || { count: 0, lastReset: now }
  
  if (now - record.lastReset > (windowSecs * 1000)) {
    record.count = 1
    record.lastReset = now
  } else {
    record.count++
  }
  
  tracker.set(key, record)

  res.setHeader('X-RateLimit-Limit', limit)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - record.count))
  res.setHeader('X-RateLimit-Reset', Math.ceil((record.lastReset + (windowSecs * 1000)) / 1000))

  if (record.count > limit) {
    console.warn(`🛡️ Mem RateLimit: Blocked excessive requests from ${ip} on ${route}`)
    res.status(429).json({ 
        error: 'Too many requests', 
        message: 'Security threshold exceeded. Please slow down.', 
        retryAfter: windowSecs 
    })
    return false
  }
  
  return true
}
