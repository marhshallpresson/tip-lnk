import type { VercelRequest, VercelResponse } from "@vercel/node"
import { enforceRateLimitMiddleware } from "../../../_lib/rate-limiting.js"
import { db } from "../../../_lib/db.js"

/**
 * SECURITY PATCH: Tip Submission Endpoint with Rate Limiting (H-04)
 * 
 * POST /api/solana/tips/create
 * 
 * Prevents:
 * - Dust attacks (spam micro-tips)
 * - Creator wallet history flooding
 * - Fake volume manipulation
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

    // Store tip in database
    const tipRecord = {
      recipient: creatorWallet,
      sender: senderWallet,
      amount: tipAmount,
      tokenSymbol,
      txSignature,
      message: message || null,
      timestamp: new Date().toISOString(),
      clientIp, // Track for abuse monitoring
      status: 'confirmed',
    }

    await db('tips').insert(tipRecord)

    // Return success
    res.status(201).json({
      success: true,
      tip: {
        id: txSignature,
        ...tipRecord,
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
