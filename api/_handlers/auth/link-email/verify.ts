import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../../_lib/db.js"
import { getSessionUser, createSession } from "../../../_lib/session.js"
import { sha256Hex } from "../../../_lib/password.js"
import { patchResponse } from "../_utils.js"

/**
 * Task 2.2: Standalone Vercel Function for Email Linking Phase 2
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const { code, email, name } = req.body
  const user = await getSessionUser(req as any)
  if (!user) return res.status(401).json({ error: 'Session required' })

  if (!code || !email) {
    return res.status(400).json({ error: 'Code and email are required' })
  }

  try {
    const codeHash = sha256Hex(code)
    const record = await db('email_verification_token')
      .where({ userId: user.id, email, tokenHash: codeHash })
      .andWhere('expiresAt', '>', new Date())
      .first()

    if (!record) {
      return res.status(400).json({ error: 'Invalid or expired verification code.' })
    }

    // Success Check: Is this email already in use?
    const existingUser = await db('user').where({ email }).whereNot({ id: user.id }).first()
    
    if (existingUser) {
      // If the existing user ALREADY has a wallet, we cannot merge
      if (existingUser.walletAddress && existingUser.walletAddress !== user.walletAddress) {
        return res.status(409).json({ 
          error: 'This email is already linked to another wallet. Please login with that account instead.' 
        })
      }

      // Merge: Update existing user with current walletAddress and name (if missing)
      await db('user').where({ id: existingUser.id }).update({
        walletAddress: user.walletAddress,
        name: existingUser.name || name || user.name,
        emailVerifiedAt: new Date(),
        updated_at: new Date()
      })

      // Delete the temporary wallet-only account
      await db('user').where({ id: user.id }).delete()
      
      // Cleanup tokens
      await db('email_verification_token').where({ userId: user.id }).delete()

      // Issue new session for the existing user
      const session = await createSession(req as any, res as any, existingUser.id)

      return res.status(200).json({ 
        success: true, 
        message: 'Wallet successfully linked to your existing account.',
        merged: true,
        user: { 
            id: existingUser.id, 
            email: existingUser.email, 
            name: existingUser.name || name || user.name, 
            walletAddress: user.walletAddress, 
            emailVerifiedAt: new Date() 
        },
        auth: {
            accessToken: session.accessToken,
            tokenType: 'Bearer',
            expiresAt: session.expiresAt.toISOString(),
        }
      })
    }

    // Success: Update current User Profile
    await db('user').where({ id: user.id }).update({
      email,
      name: name || user.name,
      emailVerifiedAt: new Date(),
      updated_at: new Date()
    })

    // Cleanup
    await db('email_verification_token').where({ userId: user.id }).delete()

    res.status(200).json({ success: true, message: 'Email successfully verified and linked.' })
  } catch (err) {
    console.error('Email Link Verify Fault:', err)
    res.status(500).json({ error: 'Verification failed.' })
  }
}
