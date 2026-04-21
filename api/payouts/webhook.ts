import type { VercelRequest, VercelResponse } from '@vercel/node'
import crypto from 'crypto'
import { db } from '../../backend/lib/db.js'

/**
 * Task 1 (Post-Phases): Pajcash Secure Webhook Implementation
 * Directive 06: Verification of HMAC-SHA256 signature is mandatory.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const signature = req.headers['x-pajcash-signature'] as string
  const PAJCASH_SECRET = process.env.PAJCASH_WEBHOOK_SECRET

  if (!signature || !PAJCASH_SECRET) {
    console.error('🛡️ Pajcash Webhook: Missing signature or server secret.')
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // 1. Directive 06A: HMAC-SHA256 Signature Verification
  const payload = JSON.stringify(req.body)
  const expectedSignature = crypto
    .createHmac('sha256', PAJCASH_SECRET)
    .update(payload)
    .digest('hex')

  const isValid = crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(signature, 'hex')
  )

  if (!isValid) {
    console.warn('⚠️ Pajcash Webhook: Invalid signature detected. Potential injection attempt.')
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // 2. Process Webhook Payload
  const { reference, status, amount, walletAddress } = req.body

  try {
    console.log(`💰 Pajcash Payout Update: ${reference} | Status: ${status}`)

    // Log attempt in payouts table (Directive 06B.5)
    await db('payouts').insert({
      pajcash_reference: reference,
      status: status,
      amount_ngn: amount,
      wallet_address: walletAddress,
      raw_payload: payload,
      updated_at: new Date()
    }).onConflict('pajcash_reference').merge()

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('Pajcash Webhook Fault:', err)
    res.status(500).json({ error: 'Internal processing error' })
  }
}
