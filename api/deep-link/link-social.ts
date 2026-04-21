import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../_cors.js"
import { db } from "../../backend/lib/db.js"
import { verifySignature } from "../../src/lib/crypto.js"

/**
 * Task 2.2: Standalone Vercel Function for Social Linking
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { walletAddress, handle, platform, signature, message } = req.body
  
  // Task 3.1: Elite Hardening: Signature Proof Required via src/lib/crypto.ts
  if (!signature || !message || !verifySignature(message, signature, walletAddress)) {
      return res.status(401).json({ success: false, error: 'Cryptographic proof failed. Verification denied.' })
  }

  try {
    const column = platform === 'twitter' ? 'twitterHandle' : 'discordHandle'
    
    await db('user').insert({
      id: walletAddress, 
      walletAddress,
      [column]: handle.replace(/^@/, ''),
      updated_at: new Date()
    }).onConflict('walletAddress').merge()

    res.json({ success: true, message: `Successfully linked verified ${platform} handle.` })
  } catch (err) {
    console.error('Linking Error:', err)
    res.status(500).json({ success: false, error: 'Linking failed.' })
  }
}
