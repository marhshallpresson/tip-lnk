import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../lib/db.js"
import { randomUUID } from "crypto"
import { emitTorqueEvent } from "../../lib/torque.js"

/**
 * PHASE 6: API DESIGN FOR THIRD PARTIES
 * Initializes the SDK session for an embedded widget.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const authHeader = req.headers['authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid API key' })
  }
  const apiKey = authHeader.split(' ')[1]

  try {
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

    // SECURITY PATCH: Validate originUrl against Whitelisted Origins
    const whitelisted = creator.whitelisted_origins ? JSON.parse(creator.whitelisted_origins) : [];
    const isLocal = originUrl.includes('localhost') || originUrl.includes('127.0.0.1');
    const isWhitelisted = whitelisted.includes(new URL(originUrl).origin) || isLocal;

    if (!isWhitelisted) {
      console.warn(`🛡️ SDK Security: Unauthorized embed attempt from ${originUrl}`);
      return res.status(403).json({ 
        error: 'Unauthorized Origin', 
        message: 'This domain is not authorized. Add it in your creator dashboard.' 
      });
    }

    const sessionToken = `sdk_sess_${randomUUID()}`

    // SECURITY PATCH: Enforce CSP and Frame-Ancestors to prevent Clickjacking
    const origin = new URL(originUrl).origin;
    res.setHeader('Content-Security-Policy', `frame-ancestors 'self' ${origin}`);
    res.setHeader('X-Frame-Options', `ALLOW-FROM ${origin}`);

    await emitTorqueEvent({
      event_type: 'embed_loaded',
      metadata: {
        creator_id: creator.id, // Use UUID
        origin_domain: originUrl,
        source: 'backend'
      }
    });

    return res.json({
      success: true,
      sessionToken,
      config: {
        creatorId: creator.id,
        creatorAddress: `${(creator.walletAddress || '0000').slice(0, 4)}...`, // Masked
        acceptedTokens: ['SOL', 'USDC'],
        embedUrl: `https://tipstack.fun/checkout/${creator.id}?theme=${theme}`
      }
    })

  } catch (err: any) {
    console.error('SDK Init Error:', err)
    return res.status(500).json({ error: 'Failed to initialize SDK session' })
  }
}
