import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { randomUUID } from "crypto"
import axios from "axios"
import { decrypt } from "../../../_lib/crypto.js"

/**
 * PHASE 2: Fossa Pay Fiat Intent
 * Generates a checkout session for Card/Bank inbound payments.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

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

    const FOSSA_API_KEY = process.env.FOSSA_API_KEY
    const FOSSA_BASE_URL = process.env.FOSSA_BASE_URL || 'https://api.fossapay.com'

    if (!FOSSA_API_KEY || FOSSA_API_KEY === 'NEVER_COMMIT_THIS') {
      return res.status(503).json({ 
        success: false, 
        error: 'Fiat payments are not configured for this environment.' 
      })
    }

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
        finalAmountUsd
      }),
      created_at: new Date(),
      updated_at: new Date()
    }

    try {
      const response = await axios.post(`${FOSSA_BASE_URL}/api/v1/onramp/checkout`, {
        amount: normalizedAmount,
        currency: 'USD',
        reference: intentId,
        destinationWallet: payoutAddress,
        paymentMethods: ['card', 'bank_transfer'],
        metadata: {
          creatorId: creator.id,
          senderName,
          memo,
          platformFee
        },
        webhookUrl: 'https://tip-lnk.vercel.app/api/payments/fiat/webhook'
      }, {
        headers: { 'Authorization': `Bearer ${FOSSA_API_KEY}` }
      })

      await db('fiat_payment_intents')
        .insert({
          ...baseIntentRecord,
          provider_session_id: response.data?.id || response.data?.sessionId || null
        })
        .onConflict('intent_id')
        .merge()

      return res.json({
        success: true,
        intentId,
        status: 'requires_action',
        checkoutUrl: response.data?.checkoutUrl || `https://checkout.fossapay.com/pay/${intentId}`
      })

    } catch (apiErr: any) {
      console.error('Fossa Pay API Error:', apiErr.response?.data || apiErr.message)
      
      if (process.env.NODE_ENV === 'development' || !process.env.FOSSA_API_KEY) {
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
      
      return res.status(500).json({ error: 'Failed to initiate fiat payment session' })
    }

  } catch (err: any) {
    console.error('Fiat Intent Error:', err.message)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
