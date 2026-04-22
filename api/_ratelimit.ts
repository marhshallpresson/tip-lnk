import type { VercelRequest, VercelResponse } from '@vercel/node'

// Simple in-memory rate limiter for serverless environments (reset on cold start)
// For production-grade, consider Upstash Redis or similar.
// Elite Rate Limiter Configuration
const LIMIT = 100 // requests
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

// In-memory fallback (Warning: Statistical only in distributed serverless)
const tracker = new Map<string, { count: number; lastReset: number }>()

/**
 * Task 2.3: Professional Rate Limiter Utility
 * Elite Hardening: Prepared for Redis/KV migration.
 */
export function rateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const ip = (req.headers['x-forwarded-for'] as string) || (req.socket.remoteAddress) || 'anonymous'
  const now = Date.now()
  
  // ─── ELITE DISTRIBUTED PATTERN ───
  // In production, Replace this block with: const { count } = await kv.incr(`ratelimit:${ip}`)
  const record = tracker.get(ip) || { count: 0, lastReset: now }

  if (now - record.lastReset > WINDOW_MS) {
    record.count = 1
    record.lastReset = now
  } else {
    record.count++
  }

  tracker.set(ip, record)

  if (record.count > LIMIT) {
    console.warn(`🛡️ RateLimit: Blocked excessive requests from ${ip}`)
    res.status(429).json({ 
        error: 'Too many requests', 
        message: 'Security threshold exceeded. Please slow down.',
        retryAfter: Math.ceil((record.lastReset + WINDOW_MS - now) / 1000) 
    })
    return false
  }

  // Inject RFC-compliant headers
  res.setHeader('X-RateLimit-Limit', LIMIT)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT - record.count))
  res.setHeader('X-RateLimit-Reset', Math.ceil((record.lastReset + WINDOW_MS) / 1000))
  
  return true
}
