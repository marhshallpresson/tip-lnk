import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import bs58 from "bs58"
import { db } from "../../_lib/db.js"
import { hashAddress, encrypt, verifySignature } from "../../_lib/crypto.js"

/**
 * Task 2.2: Standalone Vercel Function for Phantom Google Callback
 * Hardened for Zero-Knowledge: Cloaks wallet addresses.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const { walletAddress, signature, message } = req.body

  if (!walletAddress || !signature || !message) {
    return res.status(400).json({ success: false, error: 'Wallet address, signature, and message are required.' })
  }

  try {
    const isValid = verifySignature(message, signature, walletAddress)
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid wallet signature.' })
    }

    const timestampMatch = message.match(/Issued At: (.*)/) || message.match(/Timestamp: (\d+)/);
    if (!timestampMatch) return res.status(400).json({ success: false, error: 'Missing timestamp in message.' })
    
    const timestamp = timestampMatch[1].includes('-') ? new Date(timestampMatch[1]).getTime() : parseInt(timestampMatch[1]);
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
    const addressHash = hashAddress(walletAddress);
    const encryptedAddress = encrypt(walletAddress);
    const maskedAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`;

    let user = await db('user')
      .where({ walletAddressHash: addressHash })
      .orWhere({ walletAddress }) // Legacy support
      .first()

    if (!user) {
      const userId = randomUUID()
      await db('user').insert({
        id: userId,
        email: null,
        name: 'Phantom Creator',
        walletAddressHash: addressHash,
        encryptedWalletAddress: encryptedAddress,
        profileData: JSON.stringify({ displayName: 'New Creator', provider: 'phantom-google' }),
        created_at: new Date(),
        updated_at: new Date(),
      })
      user = await db('user').where({ id: userId }).first()
      
      const role = await db('roles').where({ name: 'user' }).first()
      if (role) await db('user_roles').insert({ userId, roleId: role.id })
    } else if (!user.walletAddressHash) {
      // Automatic migration on login
      await db('user').where({ id: user.id }).update({
        walletAddressHash: addressHash,
        encryptedWalletAddress: encryptedAddress
      });
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() })
    const session = await createSession(req as any, res as any, user.id)
    const roles = await getUserRoles(user.id)

    res.status(200).json({
      success: true,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        walletAddress: maskedAddress, // MASKED
        roles,
        onboardingComplete: Boolean(user.onboardingComplete)
      },
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
