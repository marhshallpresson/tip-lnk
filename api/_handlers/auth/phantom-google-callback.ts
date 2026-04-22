import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import bs58 from "bs58"
import { db } from "../../_lib/db.js"
import { createSession, getUserRoles } from "../../_lib/session.js"
import { verifySignature } from "../../../src/lib/crypto.js"
import { patchResponse } from "./_utils.js"
import { logError, serializeError } from "../../_lib/logger.js"

/**
 * Task 2.2: Standalone Vercel Function for Phantom Google Callback
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const { walletAddress, signature, message } = req.body

  if (!walletAddress || !signature || !message) {
    return res.status(400).json({ success: false, error: 'Wallet address, signature, and message are required.' })
  }

  // Task 3.1: Hardened Cryptographic Verification via src/lib/crypto.ts
  try {
    const isValid = verifySignature(message, signature, walletAddress)
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid wallet signature.' })
    }

    // Replay Protection: Verify timestamp
    const timestampMatch = message.match(/Timestamp: (\d+)/)
    if (!timestampMatch) return res.status(400).json({ success: false, error: 'Missing timestamp in message.' })
    const timestamp = parseInt(timestampMatch[1])
    const now = Date.now()
    const FIVE_MINUTES = 5 * 60 * 1000
    if (Math.abs(now - timestamp) > FIVE_MINUTES) {
      return res.status(401).json({ success: false, error: 'Signature expired (replay protection).' })
    }
  } catch (e) {
    logError('phantom_google_siws_error', { error: serializeError(e), walletAddress })
    return res.status(401).json({ success: false, error: 'Signature verification failed.' })
  }

  try {
    let user = await db('user').where({ walletAddress }).first()

    if (!user) {
      const userId = randomUUID()
      await db('user').insert({
        id: userId,
        email: null,
        name: 'Phantom Creator',
        walletAddress,
        profileData: JSON.stringify({ displayName: 'New Creator', provider: 'phantom-google' }),
        created_at: new Date(),
        updated_at: new Date(),
      })
      user = await db('user').where({ id: userId }).first()
      
      const role = await db('roles').where({ name: 'user' }).first()
      if (role) await db('user_roles').insert({ userId, roleId: role.id })
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() })
    const session = await createSession(req as any, res as any, user.id)
    const roles = await getUserRoles(user.id)

    res.status(200).json({
      success: true,
      walletAddress,
      user: { id: user.id, email: user.email, name: user.name, roles },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })
  } catch (err) {
    console.error('Phantom-Google Provisioning Fault:', err)
    res.status(500).json({ success: false, error: 'Failed to sync wallet with account system.' })
  }
}
