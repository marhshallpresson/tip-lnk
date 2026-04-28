import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { randomUUID } from "crypto"
import { emitTorqueEvent } from "../../_lib/torque.js"

/**
 * PHASE 6: API DESIGN FOR THIRD PARTIES
 * Initializes the SDK session for an embedded widget.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // Validate API Key (OAuth Client / App Key)
  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid API key' })
  }
  const apiKey = authHeader.split(' ')[1]

  try {
    // ─── ELITE SDK AUTHENTICATION ───
    // In production, this verifies against oauth_tokens or a dedicated api_keys table.
    // For now, we simulate success if the key looks like a valid structure.
    if (apiKey.length < 10) throw new Error('Invalid API key format')

    const { creatorId, originUrl, theme = 'dark' } = req.body

    if (!creatorId || !originUrl) {
      return res.status(400).json({ error: 'creatorId and originUrl are required' })
    }

    const creator = await db('user')
      .where({ walletAddress: creatorId })
      .orWhere({ solDomain: creatorId })
      .orWhere({ id: creatorId.replace('auth_', '') })
      .first()

    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' })
    }

    // Provision a short-lived session token for the iframe
    const sessionToken = `sdk_sess_${randomUUID()}`

    // Track the embed load for Growth
    await emitTorqueEvent({
      event_type: 'embed_loaded',
      metadata: {
        creator_id: creator.walletAddress,
        origin_domain: originUrl,
        source: 'backend'
      }
    });

    return res.json({
      success: true,
      sessionToken,
      config: {
        creatorAddress: creator.walletAddress,
        acceptedTokens: ['SOL', 'USDC'],
        embedUrl: `https://tiplnk.me/checkout/${creator.walletAddress}?theme=${theme}`
      }
    })

  } catch (err: any) {
    console.error('SDK Init Error:', err)
    return res.status(500).json({ error: 'Failed to initialize SDK session' })
  }
}
