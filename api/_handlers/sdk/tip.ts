import type { VercelRequest, VercelResponse } from "@vercel/node"
import { emitTorqueEvent } from "../../_lib/torque.js"
import { db } from "../../_lib/db.js"
import { randomUUID } from "crypto"

/**
 * PHASE 6: API DESIGN FOR THIRD PARTIES
 * Initiates the tipping flow within the iframe/SDK context.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Validate Session Token
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid SDK session token' })
  }
  const sessionToken = authHeader.split(' ')[1]

  try {
    if (!sessionToken.startsWith('sdk_sess_')) throw new Error('Invalid session format')

    const { amount, inputTokenMint, sourceWalletAddress, creatorId } = req.body

    if (!amount || !inputTokenMint || !sourceWalletAddress || !creatorId) {
      return res.status(400).json({ error: 'amount, inputTokenMint, sourceWalletAddress, and creatorId are required' })
    }

    // ─── ELITE TRACKING ───
    // Before forwarding to Jupiter/Intent Engine, log the initiation event
    await emitTorqueEvent({
      event_type: 'tip_initiated',
      metadata: {
        wallet_address: sourceWalletAddress,
        creator_id: creatorId,
        amount_usd: amount,
        token_symbol: inputTokenMint,
        source: 'backend',
      }
    });

    // Generate Intent (In production, this would call the internal /api/payments/intent logic directly)
    // For this example, we mock the response to signify the hand-off to the intent engine
    const intentId = `pi_${randomUUID().replace(/-/g, '')}`

    return res.json({
      success: true,
      intentId,
      status: 'requires_action',
      // The client would use this intent to finalize the transaction via Jupiter
    })

  } catch (err: any) {
    console.error('SDK Tip Error:', err)
    return res.status(500).json({ error: 'Failed to initiate tip flow' })
  }
}
