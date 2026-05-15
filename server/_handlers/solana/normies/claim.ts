import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../../_lib/db.js"
import { normiesClient } from "../../../_lib/normies.js"
import { randomUUID } from 'crypto'

/**
 * Normie Claim Endpoint
 * Verifies ETH ownership and sets up the Solana Mirror.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    userId,
    ethAddress,
    normieId
  } = req.body

  if (!userId || !ethAddress || normieId === undefined) {
    return res.status(400).json({ error: 'Missing userId, ethAddress, or normieId' })
  }

  try {
    // 1. Verify Ownership on ETH
    const ownersNormies = await normiesClient.getHoldersNormies(ethAddress);
    if (!ownersNormies.includes(Number(normieId))) {
      return res.status(403).json({ error: 'User does not own this Normie on Ethereum' })
    }

    // 2. Check if already claimed
    const existing = await db('user_normie_progression')
      .where({ ethNormieId: normieId })
      .first();
    
    if (existing && existing.userId !== userId) {
      return res.status(409).json({ error: 'This Normie has already been claimed by another user' })
    }

    // 3. Mint cNFT (Mocked for now)
    // In a real implementation, we would use Metaplex Bubblegum here.
    const mockMint = `normie_mint_${randomUUID()}`;
    console.log(`🛡️ Normie Minting: Minted cNFT ${mockMint} for Normie ${normieId} to user ${userId}`);

    // 4. Update Database
    if (existing) {
        await db('user_normie_progression')
          .where({ id: existing.id })
          .update({
            userId,
            solanaMint: mockMint,
            updated_at: new Date()
          });
    } else {
        await db('user_normie_progression').insert({
          id: randomUUID(),
          userId,
          ethNormieId: normieId,
          solanaMint: mockMint,
          currentLevel: 1,
          experiencePoints: 0,
          created_at: new Date(),
          updated_at: new Date()
        });
    }

    res.status(200).json({
      success: true,
      message: 'Normie claimed successfully',
      mint: mockMint,
      level: 1,
      xp: 0
    });

  } catch (error) {
    console.error('Normie claim error:', error)
    res.status(500).json({ error: 'Failed to claim Normie' })
  }
}
