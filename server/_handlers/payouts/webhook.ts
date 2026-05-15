import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import crypto from 'crypto'
import { db } from '../../_lib/db.js'
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null

/**
 * Secure payout webhook implementation for FossaPay and Pajcash.
 */
const normalizePayoutStatus = (event: string | undefined, status: string | undefined) => {
  const value = String(status || event || 'processing').toLowerCase()
  if (['completed', 'successful', 'success', 'transfer.completed', 'withdrawal.completed'].includes(value)) return 'completed'
  if (['failed', 'failure', 'declined', 'cancelled', 'canceled', 'transfer.failed', 'withdrawal.failed'].includes(value)) return 'failed'
  if (['pending', 'processing', 'submitted'].includes(value)) return value
  return 'processing'
}

const parseRaw = (value: any) => {
  if (!value) return {}
  try {
    return typeof value === 'string' ? JSON.parse(value) : value
  } catch {
    return {}
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const pajcashSignature = req.headers['x-pajcash-signature'] as string
  const fossaSignature = (req.headers['x-fossapay-signature'] || req.headers['x-fossa-signature']) as string
  const signature = pajcashSignature || fossaSignature
  const WEBHOOK_SECRET = pajcashSignature ? process.env.PAJCASH_WEBHOOK_SECRET : process.env.FOSSA_WEBHOOK_SECRET

  if (!signature || !WEBHOOK_SECRET) {
    console.error('🛡️ Payout Webhook: Missing signature or server secret.')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const payload = JSON.stringify(req.body)
  const expectedSha256 = crypto
    .createHmac('sha256', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')
  const expectedSha512 = crypto
    .createHmac('sha512', WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  const signatureBuffer = Buffer.from(String(signature), 'hex')
  const sha256Buffer = Buffer.from(expectedSha256, 'hex')
  const sha512Buffer = Buffer.from(expectedSha512, 'hex')
  const isValid =
    (signatureBuffer.length === sha256Buffer.length && crypto.timingSafeEqual(sha256Buffer, signatureBuffer)) ||
    (signatureBuffer.length === sha512Buffer.length && crypto.timingSafeEqual(sha512Buffer, signatureBuffer))

  if (!isValid) {
    console.warn('⚠️ Payout Webhook: Invalid signature detected. Potential injection attempt.')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  const { event, data } = req.body
  const bodyData = data || req.body
  const reference = bodyData.reference || bodyData.transferReference || bodyData.transactionReference
  const status = normalizePayoutStatus(event, bodyData.status)
  const amount = bodyData.amount
  const walletAddress = bodyData.walletAddress

  if (!reference) {
    return res.status(400).json({ error: 'Missing payout reference' })
  }

  try {
    if (redis) {
      const lockKey = `lock:payout:${reference}:${status}`
      const isDuplicate = await redis.set(lockKey, '1', { nx: true, ex: 600 })
      if (!isDuplicate) {
        console.log(`ℹ️ Payout Webhook: Skipped duplicate processing for ${reference} status ${status}`)
        return res.status(200).json({ success: true, duplicated: true })
      }
    }

    const existing = await db('payouts').where({ pajcash_reference: reference }).first()
    if (existing && existing.status === status) {
        console.log(`ℹ️ Payout Webhook: Reference ${reference} already processed with status ${status}. Skipping.`)
        return res.status(200).json({ success: true, duplicated: true })
    }

    console.log(`💰 Payout Update: ${reference} | Status: ${status}`)

    const previousRaw = parseRaw(existing?.raw_payload)
    const nextRaw = {
      ...previousRaw,
      provider: previousRaw.provider || (pajcashSignature ? 'pajcash' : 'fossapay'),
      webhook: req.body,
    }

    await db('payouts').insert({
      pajcash_reference: reference,
      status,
      amount_ngn: amount || existing?.amount_ngn || 0,
      wallet_address: walletAddress || existing?.wallet_address || 'FOSSA_PAY',
      raw_payload: JSON.stringify(nextRaw),
      updated_at: new Date()
    }).onConflict('pajcash_reference').merge({
      status,
      amount_ngn: amount || existing?.amount_ngn || 0,
      wallet_address: walletAddress || existing?.wallet_address || 'FOSSA_PAY',
      raw_payload: JSON.stringify(nextRaw),
      updated_at: new Date()
    })

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Pajcash Webhook Fault:', err)
    res.status(500).json({ error: 'Internal processing error' })
  }
}
