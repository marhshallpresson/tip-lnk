import { Router, type Request, type Response } from 'express'
import { db } from '../lib/db.js'

const router = Router()

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
 * POST /api/link-social
 */
router.post('/link-social', async (req: Request, res: Response) => {
  const { walletAddress, handle, platform, signature, message } = req.body
  
  // In a professional implementation, we verify the signature here
  // verifySignature(walletAddress, signature, message)

  try {
    const column = platform === 'twitter' ? 'twitterHandle' : 'discordHandle'
    
    await db('user').insert({
      id: walletAddress, // Using walletAddress as ID for simplicity in linking
      walletAddress,
      [column]: handle.replace(/^@/, ''),
      updatedAt: new Date()
    }).onConflict('walletAddress').merge()

    res.json({ success: true, message: `Successfully linked ${platform} handle.` })
  } catch (err) {
    res.status(500).json({ success: false, error: 'Linking failed.' })
  }
})

export default router
