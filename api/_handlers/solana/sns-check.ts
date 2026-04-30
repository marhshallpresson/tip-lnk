import type { VercelRequest, VercelResponse } from "@vercel/node"
import { Connection } from '@solana/web3.js'
import { db } from "../../_lib/db.js"
import { resolveSnsDomain } from "../../_lib/helius.js"
import { verifySNSResolution, validateSNSForTip } from "../../_lib/sns-verification.js"

/**
 * SECURITY PATCH: Enhanced SNS Availability Check with Bidirectional Verification
 * 
 * Prevents:
 * - Parent domain admin hijacking (C-01)
 * - Typosquatting attacks
 * - SNS reverse lookup forgery
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { domain, verify } = req.query
  if (typeof domain !== 'string' || domain.length === 0) {
    return res.status(400).json({ error: 'Valid domain string required' })
  }

  if (!/^[a-zA-Z0-9.-]{1,100}$/.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' })
  }

  const fullDomain = domain.includes('.sol') ? domain : `${domain}.tiplnk.sol`

  try {
    // Check local database
    const existing = await db('user').where({ solDomain: fullDomain }).first()
    if (existing) {
        return res.json({ available: false, reason: 'Already registered on TipLnk.' })
    }

    const onChainOwner = await resolveSnsDomain(fullDomain)
    if (onChainOwner) {
        return res.json({ available: false, reason: 'Already registered on-chain.' })
    }

    // SECURITY: If verify=true, perform bidirectional SNS verification
    if (verify === 'true') {
      const connection = new Connection(process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com')
      const verification = await verifySNSResolution(fullDomain, connection)
      
      if (!verification.isValid) {
        return res.json({
          available: false,
          reason: 'SNS verification failed',
          securityWarning: verification.error,
        })
      }
    }

    res.json({ available: true, domain: fullDomain })
  } catch (err) {
    console.error('SNS Check Error:', err)
    res.status(500).json({ error: 'Failed to check domain availability.' })
  }
}
