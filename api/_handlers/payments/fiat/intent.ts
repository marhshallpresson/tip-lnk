import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { randomUUID } from "crypto"
import axios from "axios"

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

    if (!creatorId || !amount || amount <= 0) {
      return res.status(400).json({ error: 'Creator ID and a valid amount are required' })
    }

    // 1. Resolve Creator
    const creator = await db('user')
      .where({ walletAddress: creatorId })
      .orWhere({ solDomain: creatorId })
      .orWhere({ id: creatorId.replace('auth_', '') })
      .first()

    if (!creator || !creator.walletAddress) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    const intentId = `fossa_${randomUUID().replace(/-/g, '')}`

    // ─── ELITE FOSSA PAY INTEGRATION ───
    const FOSSA_API_KEY = process.env.FOSSA_API_KEY
    const FOSSA_BASE_URL = process.env.FOSSA_BASE_URL || 'https://api.fossapay.com'

    if (!FOSSA_API_KEY || FOSSA_API_KEY === 'NEVER_COMMIT_THIS') {
      return res.status(503).json({ 
        success: false, 
        error: 'Fiat payments are not configured for this environment.' 
      })
    }

    // Calculate Platform Fee (5%)
    const platformFee = amount * 0.05
    const finalAmountUsd = amount - platformFee

    try {
      // 2. Initiate Fossa Pay Checkout Session
      // In production, this creates a secure intent linked to the creator's settlement address.
      const response = await axios.post(`${FOSSA_BASE_URL}/api/v1/onramp/checkout`, {
        amount: amount, // Total charged to user
        currency: 'USD',
        reference: intentId,
        destinationWallet: creator.walletAddress,
        metadata: {
          creatorId: creator.walletAddress,
          senderName,
          memo,
          platformFee
        },
        // Direct webhook for this specific integration
        webhookUrl: 'https://tip-lnk.vercel.app/api/payments/fiat/webhook'
      }, {
        headers: { 'Authorization': `Bearer ${FOSSA_API_KEY}` }
      })

      return res.json({
        success: true,
        intentId,
        status: 'requires_action',
        checkoutUrl: response.data?.checkoutUrl || `https://checkout.fossapay.com/pay/${intentId}`
      })

    } catch (apiErr: any) {
      console.error('Fossa Pay API Error:', apiErr.response?.data || apiErr.message)
      
      // Fallback response for development/testing if Fossa is unreachable
      if (process.env.NODE_ENV === 'development' || !process.env.FOSSA_API_KEY) {
          return res.json({
            success: true,
            intentId,
            status: 'requires_action',
            checkoutUrl: `https://checkout.fossapay.com/mock-pay/${intentId}?dest=${creator.walletAddress}&amt=${amount}`
          })
      }
      
      return res.status(500).json({ error: 'Failed to initiate fiat payment session' })
    }

  } catch (err: any) {
    console.error('Fiat Intent Error:', err.message)
    return res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
}
