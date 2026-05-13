import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { PublicKey } from "@solana/web3.js"
import { enforceRateLimitMiddleware } from "../../../lib/rate-limiting.js"
import { db } from "../../../lib/db.js"
import { hashAddress } from "../../../lib/crypto.js"

/**
 * SECURITY PATCH: Tip Submission Endpoint with Rate Limiting (H-04)
 * Hardened for Zero-Knowledge: Uses user ID relations.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    creatorWallet,
    tipAmount, // in lamports
    senderWallet,
    txSignature,
    message,
    tokenSymbol = 'SOL',
  } = req.body

  // Validate required fields
  if (!creatorWallet || !tipAmount || !senderWallet || !txSignature) {
    return res.status(400).json({
      error: 'Missing required fields: creatorWallet, tipAmount, senderWallet, txSignature',
    })
  }

  try {
    // Extract client IP from headers (Vercel sets this)
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.headers['x-real-ip'] as string ||
      'unknown'

    // SECURITY: Check rate limit before processing
    const rateLimitResult = await enforceRateLimitMiddleware(
      creatorWallet,
      clientIp,
      tipAmount
    )

    if (!rateLimitResult.canProceed) {
      const errorResponse = rateLimitResult.errorResponse!
      return res.status(errorResponse.status).json(errorResponse.body)
    }

    // Zero-Knowledge Lookups
    const recipientUser = await db('user')
      .where({ walletAddressHash: hashAddress(creatorWallet) })
      .orWhere({ walletAddress: creatorWallet })
      .first()
    
    const senderUser = await db('user')
      .where({ walletAddressHash: hashAddress(senderWallet) })
      .orWhere({ walletAddress: senderWallet })
      .first()

    // Store tip in database
    const tipRecord = {
      recipient: creatorWallet,
      recipient_id: recipientUser?.id || null,
      recipient_hash: hashAddress(creatorWallet),
      sender: senderWallet,
      sender_id: senderUser?.id || null,
      sender_hash: hashAddress(senderWallet),
      amount: tipAmount,
      tokenSymbol,
      signature: txSignature,
      message: message || null,
      timestamp: new Date().toISOString(),
      status: 'confirmed',
    }

    await db('tips').insert(tipRecord)

    // Return success
    res.status(201).json({
      success: true,
      tip: {
        id: txSignature,
        recipientId: recipientUser?.id,
        amount: tipAmount,
        tokenSymbol
      },
      message: 'Tip recorded successfully',
    })
  } catch (error) {
    console.error('Tip creation error:', error)
    res.status(500).json({
      error: 'Failed to record tip',
      code: 'TIP_CREATION_FAILED',
    })
  }
}
