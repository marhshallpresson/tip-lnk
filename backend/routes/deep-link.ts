import { Router, type Request, type Response } from 'express'
import { db } from '../lib/db.js'
import tweetnacl from 'tweetnacl';
import bs58 from 'bs58';

const router = Router()

/**
 * Professional Challenge Verification
 * Validates that the user signing the link request owns the wallet.
 */
function verifySolanaSignature(walletAddress: string, signature: string, message: string): boolean {
  try {
    const signatureUint8 = bs58.decode(signature);
    const messageUint8 = new TextEncoder().encode(message);
    const publicKeyUint8 = bs58.decode(walletAddress);
    
    return tweetnacl.sign.detached.verify(messageUint8, signatureUint8, publicKeyUint8);
  } catch (err) {
    console.error('Signature Verification Fault:', err);
    return false;
  }
}

/**
 * Resolve Handle to Wallet (Deep Link Core)
 * GET /api/resolve/@handle
 */
router.get('/resolve/:handle', async (req: Request, res: Response) => {
  const handle = req.params.handle.replace(/^@/, '')
  
  try {
    const user = await db('user')
      .where({ twitterHandle: handle })
      .orWhere({ discordHandle: handle })
      .first()

    if (!user || !user.walletAddress) {
      return res.status(404).json({ success: false, error: 'Handle not linked to a wallet.' })
    }

    res.json({
      success: true,
      handle: `@${handle}`,
      walletAddress: user.walletAddress,
      profile: JSON.parse(user.profileData || '{}')
    })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Resolution failed.' })
  }
})

/**
 * Link Wallet to Social (Self-Service)
 * SECURED: Requires valid Solana Signature proof.
 */
router.post('/link-social', async (req: Request, res: Response) => {
  const { walletAddress, handle, platform, signature, message } = req.body
  
  // Elite Hardening: Signature Proof Required
  if (!signature || !message || !verifySolanaSignature(walletAddress, signature, message)) {
      return res.status(401).json({ success: false, error: 'Cryptographic proof failed. Verification denied.' });
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
    console.error('Linking Fault:', err);
    res.status(500).json({ success: false, error: 'Linking failed.' })
  }
})

export default router
