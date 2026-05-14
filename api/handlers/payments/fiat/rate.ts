import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { Redis } from "@upstash/redis"
import { getCryptoFiatQuote } from "../../../lib/crypto-fiat-rates.js"

const QUOTE_TTL_SECONDS = 120

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * Crypto-to-fiat quote endpoint for checkout and payout UX.
 * Default asset is USDC, so $ amounts display as current USDC -> NGN.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const rawAmount = req.method === 'GET' ? req.query.amount : req.body?.amount
  const rawAsset = req.method === 'GET' ? req.query.asset || req.query.token || req.query.symbol : req.body?.asset || req.body?.token || req.body?.symbol
  const rawQuote = req.method === 'GET' ? req.query.quoteCurrency || req.query.quote : req.body?.quoteCurrency || req.body?.quote
  const amountUsd = Number(rawAmount || 0)

  if (!Number.isFinite(amountUsd) || amountUsd < 0) {
    return res.status(400).json({ success: false, error: 'Invalid amount' })
  }

  try {
    const quote = await getCryptoFiatQuote({
      amount: amountUsd || 1,
      asset: String(rawAsset || 'USDC'),
      quoteCurrency: String(rawQuote || 'NGN'),
    })
    const convertedAmount = amountUsd > 0 ? Number((amountUsd * quote.rate).toFixed(2)) : 0

    const fetchedAt = Date.now()
    const expiresAt = fetchedAt + QUOTE_TTL_SECONDS * 1000

    if (redis) {
      try {
        await redis.incr(`metrics:fiat:rate:${quote.provider}`)
      } catch {}
    }

    return res.json({
      success: true,
      provider: quote.provider,
      isFallback: false,
      coinId: quote.coinId,
      asset: quote.asset,
      baseCurrency: quote.asset,
      quoteCurrency: quote.quoteCurrency,
      rate: quote.rate,
      amountUsd,
      amount: amountUsd,
      amountNgn: convertedAmount,
      convertedAmount,
      fetchedAt,
      expiresAt,
      stale: false,
      lastUpdated: quote.lastUpdated,
    })
  } catch (error: any) {
    console.warn('Crypto-fiat rate fetch failed:', error?.message || error)
    return res.status(502).json({
      success: false,
      error: 'Crypto-fiat exchange-rate provider unavailable',
      provider: 'coinpaprika',
      fetchError: error?.message || String(error),
    })
  }
}
