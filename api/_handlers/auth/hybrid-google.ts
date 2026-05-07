import type { VercelRequest, VercelResponse } from "@vercel/node"
import * as oidc from "openid-client"
import { randomUUID } from "crypto"
import { 
  getGoogleConfig, 
  oauthRedirectUrl, 
  patchResponse, 
  inferredOrigin, 
  apiUrl, 
  normalizeEmail,
  findUserByEmailInsensitive
} from "./_utils.js"
import { db } from "../../_lib/db.js"
import { createSession, getUserRoles } from "../../_lib/session.js"
import { verifySignature, hashAddress, encrypt } from "../../_lib/crypto.js"

/**
 * Rail C: Hybrid Google OAuth + Phantom Wallet Provisioning
 * Atomic handler that verifies Google Identity AND Solana Wallet SIWS.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const { 
    code, 
    codeVerifier, 
    redirectUri, 
    walletAddress, 
    signature, 
    message 
  } = req.body

  if (!code || !walletAddress || !signature || !message) {
    return res.status(400).json({ success: false, error: 'Missing required credentials (Google or Wallet).' })
  }

  try {
    // 1. Verify Wallet SIWS
    if (!verifySignature(message, signature, walletAddress)) {
      return res.status(401).json({ success: false, error: 'Invalid wallet signature.' })
    }

    // PENTEST FIX: Enforce SIWS Expiration (Replay Protection)
    const timestampMatch = message.match(/Issued At: (.*)/) || message.match(/Timestamp: (\d+)/);
    if (timestampMatch) {
      const timestamp = timestampMatch[1].includes('-') ? new Date(timestampMatch[1]).getTime() : parseInt(timestampMatch[1]);
      const now = Date.now()
      const TEN_MINUTES = 10 * 60 * 1000
      if (Math.abs(now - timestamp) > TEN_MINUTES) {
        return res.status(401).json({ success: false, error: 'Signature expired (replay protection).' })
      }
    } else {
      return res.status(400).json({ success: false, error: 'Security: Missing timestamp in wallet proof.' })
    }

    // 2. Exchange Google Code
    const config = await getGoogleConfig()
    const tokenSet = await oidc.authorizationCodeGrant(config, new URL(redirectUri), {
      pkceCodeVerifier: codeVerifier,
    })

    const claims = tokenSet.claims()
    if (!claims || !claims.email || !claims.sub) {
      return res.status(401).json({ success: false, error: 'Google identity verification failed.' })
    }

    const email = normalizeEmail(claims.email)
    const googleSub = claims.sub as string
    const name = (claims.name as string) || email
    const picture = (claims as any).picture as string || null

    // 3. Atomic User Sync
    const addressHash = hashAddress(walletAddress)
    const encryptedAddress = encrypt(walletAddress)
    const maskedAddress = `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}`

    let user = await db('user')
      .where({ googleSub })
      .orWhere({ email })
      .orWhere({ walletAddressHash: addressHash })
      .first()

    if (!user) {
      const userId = randomUUID()
      await db('user').insert({
        id: userId,
        email,
        name,
        googleSub,
        emailVerifiedAt: new Date(),
        walletAddressHash: addressHash,
        encryptedWalletAddress: encryptedAddress,
        profileData: JSON.stringify({ photo_url: picture, provider: 'hybrid-google' }),
        created_at: new Date(),
        updated_at: new Date(),
      })
      user = await db('user').where({ id: userId }).first()
      
      const role = await db('roles').where({ name: 'user' }).first()
      if (role) await db('user_roles').insert({ userId, roleId: role.id })
    } else {
      // PENTEST FIX: Prevent mismatched logins
      // If user exists but is already linked to a DIFFERENT wallet, deny login to prevent identity leakage.
      if (user.walletAddressHash && user.walletAddressHash !== addressHash) {
          return res.status(409).json({ success: false, error: 'Identity mismatch: This Google account is already linked to a different wallet.' })
      }

      // Link missing identifiers to existing account
      const updates: any = { updated_at: new Date(), lastLoginAt: new Date() }
      if (!user.googleSub) updates.googleSub = googleSub
      if (!user.emailVerifiedAt) updates.emailVerifiedAt = new Date()
      if (!user.walletAddressHash) {
        updates.walletAddressHash = addressHash
        updates.encryptedWalletAddress = encryptedAddress
      }
      await db('user').where({ id: user.id }).update(updates)
    }

    const session = await createSession(req as any, res as any, user.id)
    const roles = await getUserRoles(user.id)

    res.status(200).json({
      success: true,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        walletAddress: maskedAddress,
        roles,
        onboardingComplete: Boolean(user.onboardingComplete)
      },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    })

  } catch (err: any) {
    console.error('Hybrid Auth Fault:', err)
    res.status(500).json({ success: false, error: err.message || 'Hybrid authentication failed.' })
  }
}
