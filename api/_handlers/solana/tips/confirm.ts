import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { Connection, PublicKey } from "@solana/web3.js"

/**
 * ELITE OPTIMISTIC RELAY
 * Immediately records the intent of a tip in the database.
 * This allows the UI to show the tip instantly, while Helius Webhooks
 * will eventually confirm the final status on-chain.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { signature, recipient, amount, tokenSymbol, senderName, message } = req.body

  if (!signature || !recipient || !amount) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    // 🛡️ Optimistic Insertion
    // Note: We use 'pending' or 'confirmed' status here. 
    // Helius webhooks will update this record with real on-chain data (slot, exact timestamp).
    await db('tips').insert({
      signature,
      slot: 0, // Placeholder
      timestamp: new Date(),
      sender: 'pending', // Will be updated by webhook
      sender_name: senderName || 'Anonymous',
      message: message || null,
      recipient,
      amount,
      tokenMint: tokenSymbol === 'SOL' ? 'So11111111111111111111111111111111111111112' : 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      tokenSymbol,
      status: 'pending',
      type: 'tip'
    }).onConflict('signature').ignore();

    res.status(200).json({ success: true })
  } catch (err) {
    console.error('🛡️ Optimistic Relay Fault:', err)
    res.status(500).json({ error: 'Failed to record optimistic tip' })
  }
}
