import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"
import { Redis } from "@upstash/redis"

const FALLBACK_RATE = 1500
const QUOTE_TTL_SECONDS = 120

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const toNumber = (value: any): number | null => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const extractNgnRate = (data: any): number | null => {
  return (
    toNumber(data?.rate) ??
    toNumber(data?.ngnRate) ??
    toNumber(data?.NGN) ??
    toNumber(data?.rates?.NGN) ??
    toNumber(data?.data?.NGN) ??
    toNumber(data?.data?.rates?.NGN) ??
    null
  )
}

/**
 * Fiat quote endpoint for USD -> NGN conversions shown in checkout UI.
 * If MoneiRate env values are not configured, falls back to exchangerate-api.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawAmount = req.method === 'GET' ? req.query.amount : req.body?.amount
  const amountUsd = Number(rawAmount || 0)

  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' })
  }

  let rate = FALLBACK_RATE
  let provider = 'fallback'
  let isFallback = true

  try {
    const moneirateUrl = process.env.MONEIRATE_API_URL
    const moneirateKey = process.env.MONEIRATE_API_KEY

    if (moneirateUrl) {
      const moneirateRes = await axios.get(moneirateUrl, {
        headers: moneirateKey ? { Authorization: `Bearer ${moneirateKey}` } : undefined,
        params: { base: 'USD', quote: 'NGN' },
        timeout: 5000
      })

      const moneirate = extractNgnRate(moneirateRes.data)
      if (moneirate) {
        rate = moneirate
        provider = 'moneirate'
        isFallback = false
      }
    } else {
      const fallbackRes = await axios.get('https://api.exchangerate-api.com/v4/latest/USD', { timeout: 5000 })
      const fallbackRate = extractNgnRate(fallbackRes.data)
      if (fallbackRate) {
        rate = fallbackRate
        provider = 'exchangerate-api'
        isFallback = false
      }
    }
  } catch (error: any) {
    console.warn('Fiat rate fetch failed, using fallback rate:', error?.message || error)
  }

  const amountNgn = Number((amountUsd * rate).toFixed(2))
  const fetchedAt = Date.now()
  const expiresAt = fetchedAt + QUOTE_TTL_SECONDS * 1000
  const stale = Date.now() > expiresAt

  if (redis) {
    try {
      await redis.incr(`metrics:fiat:rate:${provider}`)
      if (isFallback) {
        await redis.incr('metrics:fiat:rate:fallback')
      }
    } catch {}
  }

  return res.json({
    success: true,
    provider,
    isFallback,
    baseCurrency: 'USD',
    quoteCurrency: 'NGN',
    rate,
    amountUsd,
    amountNgn,
    fetchedAt,
    expiresAt,
    stale
  })
}
