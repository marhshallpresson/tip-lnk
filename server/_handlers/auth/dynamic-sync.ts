import type { Request as VercelRequest, Response as VercelResponse } from 'express';
import { db } from "../../_lib/db.js";
import crypto from "crypto";

/**
 * Enhanced Dynamic Webhook Handler
 * Synchronizes full user lifecycle events from Dynamic to TipStack's database.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // 1. Verify Webhook Signature
  const rawSignature = req.headers['x-dynamic-signature-256'] as string;
  const secret = process.env.DYNAMIC_WEBHOOK_SECRET;

  if (!rawSignature || !secret) {
    console.error('🛡️ Webhook Security: Missing signature or secret.');
    return res.status(401).json({ error: 'Unauthorized: Missing verification credentials.' });
  }

  // Remove the "sha256=" prefix if present
  const signature = rawSignature.startsWith('sha256=') ? rawSignature.slice(7) : rawSignature;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(JSON.stringify(req.body));
  const digest = hmac.digest('hex');

  if (signature !== digest) {
    console.error('🛡️ Webhook Security: Signature mismatch.', { expected: digest, received: signature });
    return res.status(403).json({ error: 'Unauthorized: Invalid signature.' });
  }

  const { type, data } = req.body;
  console.log(`🛡️ Dynamic Webhook Received: ${type}`);

  try {
    switch (type) {
      // --- Identity Lifecycle ---
      case 'user.created':
      case 'user.updated':
      case 'user.authenticated': {
        const { userId, email, wallets, firstName, lastName } = data;
        const primaryWallet = wallets?.[0]?.address || null;
        const fullName = [firstName, lastName].filter(Boolean).join(' ');

        await db('user')
          .insert({
            id: userId,
            email: email || null,
            name: fullName || null,
            walletAddress: primaryWallet,
            onboardingComplete: false,
            updated_at: new Date()
          })
          .onConflict('id')
          .merge({
            email: email || null,
            name: fullName || null,
            walletAddress: primaryWallet,
            updated_at: new Date()
          });
        console.log(`✅ Synced user ${userId} (${type})`);
        break;
      }

      case 'user.deleted': {
        await db('user').where({ id: data.userId }).del();
        console.log(`🗑️ Deleted user ${data.userId}`);
        break;
      }

      // --- Wallet Operations ---
      case 'wallet.linked':
      case 'wallet.unlinked': {
        const { userId, wallet } = data;
        // In reality, you'd likely want a separate table for multiple linked wallets
        // But for TipStack, we sync the primary wallet address
        await db('user').where({ id: userId }).update({
          walletAddress: type === 'wallet.linked' ? wallet.address : null,
          updated_at: new Date()
        });
        console.log(`🔗 ${type}: Wallet ${wallet.address} for user ${userId}`);
        break;
      }

      // --- Social & Verification ---
      case 'user.social.linked':
      case 'user.social.unlinked': {
         // Logic to sync social handles (twitterHandle/discordHandle)
         console.log(`🌐 ${type}: Social sync triggered for user ${data.userId}`);
         break;
      }

      case 'waas.policy.violation': {
         console.error(`🚨 SECURITY ALERT: WaaS policy violation for user ${data.userId}:`, data.violationReason);
         // Optionally flag the user as suspended in DB
         await db('user').where({ id: data.userId }).update({ deletedAt: new Date() });
         break;
      }

      default:
        console.log(`ℹ️ Unhandled webhook event: ${type}`);
    }

    return res.status(200).json({ success: true });
  } catch (err: any) {
    console.error('🛡️ Webhook Sync Fault:', err.message);
    return res.status(500).json({ error: 'Internal server error during sync.' });
  }
}
