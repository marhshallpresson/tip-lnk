import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../lib/db.js"
import { PublicKey } from "@solana/web3.js"
import axios from "axios"
import { randomUUID } from "crypto"
import { decrypt } from "../../lib/crypto.js"
import { rateLimit } from "../../lib/ratelimit.js"

/**
 * PHASE 4: Strategic Roadmap - Creator Subscriptions
 * Generates a Jupiter Recurring (DCA) Order for ongoing creator support.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // SECURITY: Enforce global rate limiting
  if (!(await rateLimit(req, res))) return;

  try {
    const { 
      creatorId, 
      amountPerCycle, 
      inputTokenMint, 
      sourceWalletAddress,
      frequencySeconds = 2592000, // Default 30 days
      cycles = 12, // Default 1 year
      memo = '' 
    } = req.body

    if (!creatorId || !amountPerCycle || !inputTokenMint || !sourceWalletAddress) {
      return res.status(400).json({ error: 'Missing required parameters for subscription' })
    }

    // Resolve creator
    const creator = await db('user')
      .where({ id: creatorId.replace('auth_', '') })
      .orWhere({ walletAddress: creatorId })
      .first()

    if (!creator) return res.status(404).json({ error: 'Creator not found' })

    let payoutAddress = creator.walletAddress;
    if (!payoutAddress && creator.encryptedWalletAddress) {
        payoutAddress = decrypt(creator.encryptedWalletAddress);
    }

    if (!payoutAddress) return res.status(404).json({ error: 'Creator payout address not configured' })

    const intentId = `sub_${randomUUID().replace(/-/g, '')}`

    // Jupiter Recurring (DCA) API
    const JUP_RECURRING_API = 'https://api.jup.ag/recurring/v1'
    const JUP_API_KEY = process.env.JUPITER_API_KEY

    if (!JUP_API_KEY) throw new Error('JUPITER_API_KEY missing')

    // Note: Recurring orders usually involve swapping to a target token (e.g. USDC)
    // and sending to the creator. 
    const payload = {
      inputMint: inputTokenMint,
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // Output to USDC for creator
      inAmount: amountPerCycle.toString(),
      user: sourceWalletAddress,
      params: {
        time: {
          every: frequencySeconds,
          cycles: cycles
        }
      }
    }

    console.log(`📅 Jupiter Recurring: Creating subscription for ${sourceWalletAddress} -> ${creatorId}`)

    const jupRes = await axios.post(`${JUP_RECURRING_API}/createOrder`, payload, {
      headers: { 'x-api-key': JUP_API_KEY, 'Content-Type': 'application/json' }
    })

    const { transaction, orderAddress } = jupRes.data

    return res.json({
      success: true,
      intentId,
      transaction,
      orderAddress,
      details: {
        frequency: frequencySeconds,
        cycles: cycles,
        amountPerCycle
      },
      provider: 'jupiter-recurring'
    })

  } catch (err: any) {
    console.error('Subscription Intent Error:', err.response?.data || err.message)
    return res.status(500).json({ success: false, error: 'Failed to create subscription intent' })
  }
}
