import { kv } from '@vercel/kv'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

const LIMIT = 100 
const tracker = new Map<string, { count: number; lastReset: number }>()

// ─── PHASE 2: SCALABLE RATE LIMITING ───
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Multi-tiered rate limiters
const authLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  analytics: true,
}) : null;

const apiLimiter = redis ? new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(LIMIT, '60 s'),
  analytics: true,
}) : null;

/**
 * Task 2.3: Professional Rate Limiter Utility
 * Elite Hardening: Upstash Ratelimit with Memory Fallback.
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
    if (redis && (isAuth ? authLimiter : apiLimiter)) {
      const limiter = isAuth ? authLimiter! : apiLimiter!;
      const { success, limit: rLimit, remaining, reset } = await limiter.limit(ip);
      
      res.setHeader('X-RateLimit-Limit', rLimit)
      res.setHeader('X-RateLimit-Remaining', remaining)
      res.setHeader('X-RateLimit-Reset', reset)
  
      if (!success) {
        console.warn(`🛡️ Upstash RateLimit: Blocked excessive requests from ${ip} on ${route}`)
        res.status(429).json({ 
            error: 'Too many requests', 
            message: 'Security threshold exceeded. Please slow down.' 
        })
        return false
      }
      return true
    }
  } catch (err) {
    console.error('Upstash Rate Limit Failure, falling back to memory:', err)
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
