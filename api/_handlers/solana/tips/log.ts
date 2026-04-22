import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { getSessionUser } from "../../../_lib/session.js"

/**
 * Task 2.2: Standalone Vercel Function for Secure Tip Logging
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authUser = await getSessionUser(req as any)
  if (!authUser) {
    return res.status(401).json({ success: false, error: 'Authentication required' })
  }

  const { walletAddress, tip, isSent } = req.body

  // Elite Hardening: Ensure users can only log tips for THEIR wallet
  if (authUser.walletAddress && walletAddress !== authUser.walletAddress) {
      return res.status(403).json({ success: false, error: 'Unauthorized: Wallet mismatch' })
  }

  if (!tip || !tip.txSignature) return res.status(400).json({ error: 'Invalid tip data' })

  try {
    await db('tips').insert({
      signature: tip.txSignature,
      slot: 0, // Will be updated by chronological indexer
      timestamp: new Date(tip.timestamp),
      sender: walletAddress,
      sender_name: tip.sender || 'Anonymous',
      recipient: tip.recipientAddress,
      message: tip.note || '',
      amount: tip.amountUSDC,
      fee_amount: tip.feeAmount || 0,
      treasury_address: tip.treasuryAddress || null,
      tokenMint: tip.inputToken, // Simplified for logging
      tokenSymbol: tip.inputToken,
      status: 'confirmed',
      type: isSent ? 'tip_sent' : 'tip_received'
    }).onConflict('signature').merge()

    res.json({ success: true })
  } catch (err) {
    console.error('Tip Logging Error:', err)
    res.status(500).json({ success: false, error: 'Failed to log tip.' })
  }
}
