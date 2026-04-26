import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { createSession, getSessionUser, getUserRoles } from "../../_lib/session.js"
import { logError, serializeError } from "../../_lib/logger.js"
import { randomUUID } from "crypto"
import nacl from 'tweetnacl'
import bs58 from 'bs58'
import { patchResponse } from "./_utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  patchResponse(res)

  try {
    const { walletAddress, signature, message } = req.body;

    if (!walletAddress || !signature || !message) {
      return res.status(400).json({ success: false, error: 'Wallet address, signature, and message are required.' });
    }

    // Verify signature (SIWS - Sign-In With Solana)
    try {
      const signatureBytes = bs58.decode(signature);
      const messageBytes = new TextEncoder().encode(message);
      const publicKeyBytes = bs58.decode(walletAddress);

      if (publicKeyBytes.length !== 32) {
        return res.status(400).json({ success: false, error: 'Invalid public key format.' });
      }

      const verified = nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes);
      
      if (!verified) {
        // Log the message attempt for debugging if it fails in prod
        console.warn('🛡️ SIWS: Signature Verification Failed', { walletAddress, message });
        return res.status(401).json({ success: false, error: 'Invalid signature. Please ensure your wallet date/time is correct.' });
      }

      // Replay Protection: Verify timestamp
      const timestampMatch = message.match(/Timestamp: (\d+)/);
      if (!timestampMatch) return res.status(400).json({ success: false, error: 'Missing timestamp in message.' });
      const timestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const TEN_MINUTES = 10 * 60 * 1000; // Increased tolerance for slow connections
      if (Math.abs(now - timestamp) > TEN_MINUTES) {
        return res.status(401).json({ success: false, error: 'Signature expired. Please try again.' });
      }
    } catch (e) {
        logError('siws_signature_verification_error', { error: serializeError(e), walletAddress });
        return res.status(401).json({ success: false, error: 'Signature verification failed.' });
    }
    
    // Advanced System: If user is currently logged in via email, link the wallet to their account
    try {
      const sessionUser = await getSessionUser(req as any);
      if (sessionUser) {
        const existingWalletUser = await db('user').where({ walletAddress }).whereNot({ id: sessionUser.id }).first();
        if (existingWalletUser) {
          // ELITE MERGE: If the existing account is just a "phantom" wallet account (no email/pass), we can absorb it
          if (!existingWalletUser.email && !existingWalletUser.passwordHash && !existingWalletUser.googleSub) {
            await db('user').where({ id: existingWalletUser.id }).delete();
            // Proceed to link
          } else {
            return res.status(409).json({ success: false, error: 'Wallet already linked to another account.' });
          }
        }
        await db('user').where({ id: sessionUser.id }).update({ walletAddress, updated_at: new Date() });
        const updatedUser = await db('user').where({ id: sessionUser.id }).first(); // Re-fetch directly from DB
        const roles = await getUserRoles(sessionUser.id);
        return res.status(200).json({ 
          success: true, 
          user: {
            ...updatedUser,
            roles,
            onboardingComplete: Boolean(updatedUser.onboardingComplete)
          } 
        });
      }
    } catch (sessionErr) {
      // Ignore session errors
    }

    // Auto-assign: If logging in directly, create or fetch wallet-based account
    let user = await db('user').where({ walletAddress }).first();
    if (!user) {
      const userId = randomUUID();
      await db('user').insert({
        id: userId,
        email: null,
        name: null, // Force name collection in onboarding
        walletAddress,
        profileData: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date(),
      });
      user = await db('user').where({ id: userId }).first();
      const role = await db('roles').where({ name: 'user' }).first();
      if (role) await db('user_roles').insert({ userId, roleId: role.id });
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() });
    const session = await createSession(req as any, res as any, user.id);
    const roles = await getUserRoles(user.id);

    res.status(200).json({
      success: true,
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        full_name: user.name,
        first_name: user.name ? user.name.split(' ')[0] : null,
        walletAddress, 
        roles, 
        emailVerifiedAt: user.emailVerifiedAt,
        onboardingComplete: Boolean(user.onboardingComplete),
        onboarding_complete: Boolean(user.onboardingComplete)
      },
      auth: {
        accessToken: session.accessToken,
        tokenType: 'Bearer',
        expiresAt: session.expiresAt.toISOString(),
      },
    });
  } catch (e: any) {
    logError('auth_wallet_login_error', { error: serializeError(e) });
    res.status(500).json({ success: false, error: 'Wallet authentication failed' });
  }
}
