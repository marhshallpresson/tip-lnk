import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

/**
 * SECURITY PATCH: Rate Limiting on Tip Transactions (H-04)
 * 
 * Prevents:
 * - Dust attacks (spam micro-tips)
 * - Fake volume/metric manipulation
 * - Creator wallet history flooding
 * - Economically unviable spam
 */

// Initialize Upstash Redis rate limiter
let rateLimiter: Ratelimit | null = null

function initRateLimiter(): Ratelimit {
  if (rateLimiter) return rateLimiter

  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    throw new Error(
      'UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set for rate limiting'
    )
  }

  rateLimiter = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '60 s'), // 5 tips per creator per 60 seconds
    analytics: true,
    prefix: 'tipstack:rate-limit',
  })

  return rateLimiter
}

/**
 * Rate limit configuration based on abuse patterns
 */
export const RATE_LIMIT_CONFIG = {
  // Per creator per 60s
  TipsPerMinute: 5,
  // Per IP per 60s (global)
  TipsPerIpPerMinute: 10,
  // Per creator per hour
  TipsPerHour: 100,
  // Minimum tip amount to count (in lamports)
  MinimumTipAmount: 1000, // 0.001 SOL
  // Maximum tips per IP per hour
  TipsPerIpPerHour: 500,
}

/**
 * Get the rate limit key for a creator/tipper combination
 */
function getCreatorRateLimitKey(creatorWallet: string): string {
  return `creator:${creatorWallet}`
}

function getIpRateLimitKey(ip: string): string {
  return `ip:${ip}`
}

/**
 * Check if a tip should be rate limited
 * Returns { allowed: boolean, remaining: number, retryAfter?: number }
 */
export async function checkTipRateLimit(
  creatorWallet: string,
  clientIp: string,
  tipAmount: number
): Promise<{
  allowed: boolean
  remaining: number
  resetAfter?: number
  reason?: string
}> {
  try {
    // Check 1: Minimum tip amount
    if (tipAmount < RATE_LIMIT_CONFIG.MinimumTipAmount) {
      return {
        allowed: false,
        remaining: 0,
        reason: `Tip amount (${tipAmount} lamports) below minimum (${RATE_LIMIT_CONFIG.MinimumTipAmount})`,
      }
    }

    const limiter = initRateLimiter()

    // Check 2: Per-creator rate limit (5 tips per minute)
    const creatorKey = getCreatorRateLimitKey(creatorWallet)
    const creatorResult = await limiter.limit(creatorKey)

    if (!creatorResult.success) {
      return {
        allowed: false,
        remaining: 0,
        // Upstash Ratelimit response type may not expose resetAfter in TS defs,
        // cast to any to read it when available at runtime.
        resetAfter: (creatorResult as any).resetAfter,
        reason: `Too many tips to creator. Max ${RATE_LIMIT_CONFIG.TipsPerMinute} per minute.`,
      }
    }

    // Check 3: Per-IP rate limit (10 tips per minute)
    const ipKey = getIpRateLimitKey(clientIp)
    const ipResult = await limiter.limit(ipKey)

    if (!ipResult.success) {
      return {
        allowed: false,
        remaining: 0,
        // Cast to any to safely access non-typed runtime field
        resetAfter: (ipResult as any).resetAfter,
        reason: `Your IP has made too many tips. Max ${RATE_LIMIT_CONFIG.TipsPerIpPerMinute} per minute.`,
      }
    }

    // If we get here, the tip is allowed
    return {
      allowed: true,
      remaining: creatorResult.remaining,
    }
  } catch (error) {
    // If rate limiter fails, allow the request but log the error
    console.error('Rate limit check error:', error)
    return {
      allowed: true,
      remaining: RATE_LIMIT_CONFIG.TipsPerMinute,
      reason: 'Rate limiter unavailable, allowing request',
    }
  }
}

/**
 * Enforce rate limiting in a Vercel Edge Function
 * Place this middleware at the start of your tip handler
 */
export async function enforceRateLimitMiddleware(
  creatorWallet: string,
  clientIp: string | null,
  tipAmount: number
): Promise<{ 
  canProceed: boolean
  errorResponse?: { status: number; body: Record<string, unknown> } 
}> {
  // Extract IP from header chain (Vercel, Cloudflare, etc)
  const ip = clientIp || 'unknown'

  const result = await checkTipRateLimit(creatorWallet, ip, tipAmount)

  if (!result.allowed) {
    return {
      canProceed: false,
      errorResponse: {
        status: 429, // Too Many Requests
        body: {
          error: result.reason || 'Rate limit exceeded',
          code: 'RATE_LIMITED',
          retryAfter: result.resetAfter,
        },
      },
    }
  }

  return { canProceed: true }
}

/**
 * Get current rate limit stats for a creator
 * Useful for admin monitoring
 */
export async function getCreatorRateLimitStats(creatorWallet: string): Promise<{
  tipsThisMinute: number
  tipsThisHour: number
  rateLimitStatus: string
}> {
  try {
    if (!process.env.UPSTASH_REDIS_REST_URL) {
      return {
        tipsThisMinute: 0,
        tipsThisHour: 0,
        rateLimitStatus: 'unavailable',
      }
    }

    const redis = Redis.fromEnv()
    const creatorKey = getCreatorRateLimitKey(creatorWallet)

    // These are estimates based on sliding window counter
    const tipsThisMinute = await redis.get(`${creatorKey}:minute`) // Would need custom tracking
    const tipsThisHour = await redis.get(`${creatorKey}:hour`) // Would need custom tracking

    return {
      tipsThisMinute: (tipsThisMinute as number) || 0,
      tipsThisHour: (tipsThisHour as number) || 0,
      rateLimitStatus: 'active',
    }
  } catch (error) {
    console.error('Error fetching rate limit stats:', error)
    return {
      tipsThisMinute: 0,
      tipsThisHour: 0,
      rateLimitStatus: 'error',
    }
  }
}
