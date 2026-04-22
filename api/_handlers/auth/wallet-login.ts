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

      if (!nacl.sign.detached.verify(messageBytes, signatureBytes, publicKeyBytes)) {
        return res.status(401).json({ success: false, error: 'Invalid signature.' });
      }

      // Replay Protection: Verify timestamp
      const timestampMatch = message.match(/Timestamp: (\d+)/);
      if (!timestampMatch) return res.status(400).json({ success: false, error: 'Missing timestamp in message.' });
      const timestamp = parseInt(timestampMatch[1]);
      const now = Date.now();
      const FIVE_MINUTES = 5 * 60 * 1000;
      if (Math.abs(now - timestamp) > FIVE_MINUTES) {
        return res.status(401).json({ success: false, error: 'Signature expired (replay protection).' });
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
          return res.status(409).json({ success: false, error: 'Wallet already linked to another account.' });
        }
        await db('user').where({ id: sessionUser.id }).update({ walletAddress, updated_at: new Date() });
        const updatedUser = await getSessionUser(req as any); // Re-fetch
        return res.status(200).json({ success: true, user: updatedUser });
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
        name: 'Phantom User',
        walletAddress,
        profileData: JSON.stringify({ displayName: 'Phantom Creator' }),
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
      user: { id: user.id, email: user.email, name: user.name, walletAddress, roles, emailVerifiedAt: user.emailVerifiedAt },
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
