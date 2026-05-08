import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { randomUUID } from "crypto"
import { decrypt } from "../../../_lib/crypto.js"
import { createCheckoutSession } from "../../../_lib/fossa.js"
import { rateLimit } from "../../../_ratelimit.js"

/**
 * PHASE 2: Fossa Pay Fiat Intent
 * Generates a checkout session for Card/Bank inbound payments using Fossa Pay service.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  if (!(await rateLimit(req, res))) return

  try {
    const { 
      creatorId, 
      amount, 
      senderName = 'Anonymous',
      memo = '' 
    } = req.body

    const normalizedAmount = Number(amount)
    if (!creatorId || !Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ error: 'Creator ID and a valid amount are required' })
    }

    const creator = await db('user')
      .where({ id: creatorId.replace('auth_', '') })
      .orWhere({ solDomain: creatorId })
      .orWhere({ walletAddress: creatorId })
      .first()

    let payoutAddress = creator?.walletAddress || null
    if (!payoutAddress && creator?.encryptedWalletAddress) {
      try {
        payoutAddress = decrypt(creator.encryptedWalletAddress)
      } catch (error) {
        console.error('Failed to decrypt creator payout address:', error)
      }
    }

    if (!creator || !payoutAddress) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    const intentId = `fossa_${randomUUID().replace(/-/g, '')}`

    const platformFee = normalizedAmount * 0.05
    const finalAmountUsd = normalizedAmount - platformFee

    const baseIntentRecord = {
      intent_id: intentId,
      creator_id: creator.id,
      destination_wallet: payoutAddress,
      amount_usd: normalizedAmount,
      status: 'requires_action',
      provider: 'fossapay',
      sender_name: senderName,
      memo,
      metadata_json: JSON.stringify({
        platformFee,
        finalAmountUsd,
        senderName,
        memo
      }),
      created_at: new Date(),
      updated_at: new Date()
    }

    try {
      // Use new Fossa service module
      const session = await createCheckoutSession(normalizedAmount, creator.id, {
        intentId,
        senderName,
        memo,
        platformFee,
        destinationWallet: payoutAddress
      }, intentId)

      await db('fiat_payment_intents')
        .insert({
          ...baseIntentRecord,
          provider_session_id: session?.id || session?.sessionId || null
        })
        .onConflict('intent_id')
        .merge()

      return res.json({
        success: true,
        intentId,
        status: 'requires_action',
        checkoutUrl: session?.checkoutUrl || session?.url || session?.paymentUrl || null,
        paymentInstructions: session?.paymentInstructions || null
      })

    } catch (apiErr: any) {
      console.error('Fossa Pay Service Error:', apiErr.message)

      if (process.env.NODE_ENV === 'production') {
        return res.status(502).json({
          success: false,
          error: 'Fiat payment provider unavailable'
        })
      }
      
      // Fallback to mock session behavior
      await db('fiat_payment_intents')
        .insert({
          ...baseIntentRecord,
          provider_session_id: `mock_${intentId}`
        })
        .onConflict('intent_id')
        .merge()

      return res.json({
        success: true,
        intentId,
        status: 'requires_action',
        checkoutUrl: `https://checkout.fossapay.com/mock-pay/${intentId}?dest=${payoutAddress}&amt=${normalizedAmount}`
      })
    }

  } catch (err: any) {
    console.error('Fiat Intent Error:', err.message)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
