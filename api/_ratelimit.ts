import type { VercelRequest, VercelResponse } from '@vercel/node'

// Simple in-memory rate limiter for serverless environments (reset on cold start)
// For production-grade, consider Upstash Redis or similar.
const tracker = new Map<string, { count: number; lastReset: number }>()

const LIMIT = 100 // requests
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes

/**
 * Task 2.3: Professional Rate Limiter Utility
 */
export function rateLimit(req: VercelRequest, res: VercelResponse): boolean {
  const ip = (req.headers['x-forwarded-for'] as string) || 'anonymous'
  const now = Date.now()
  
  const record = tracker.get(ip) || { count: 0, lastReset: now }

  if (now - record.lastReset > WINDOW_MS) {
    record.count = 1
    record.lastReset = now
  } else {
    record.count++
  }

  tracker.set(ip, record)

  if (record.count > LIMIT) {
    res.status(429).json({ 
        error: 'Too many requests', 
        retryAfter: Math.ceil((record.lastReset + WINDOW_MS - now) / 1000) 
    })
    return false
  }

  // Set standard headers
  res.setHeader('X-RateLimit-Limit', LIMIT)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, LIMIT - record.count))
  
  return true
}
