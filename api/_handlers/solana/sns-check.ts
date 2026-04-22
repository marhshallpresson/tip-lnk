import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { resolveSnsDomain } from "../../_lib/helius.js"

/**
 * Task 2.2: Standalone Vercel Function for SNS Availability Check
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { domain } = req.query
  if (typeof domain !== 'string' || domain.length === 0) {
    return res.status(400).json({ error: 'Valid domain string required' })
  }

  // Task 1.2: Prevent parameter tampering and invalid characters
  if (!/^[a-zA-Z0-9.-]{1,100}$/.test(domain)) {
    return res.status(400).json({ error: 'Invalid domain format' })
  }

  const fullDomain = domain.includes('.sol') ? domain : `${domain}.tiplnk.sol`

  try {
    // 1. Check TipLnk Registry
    const existing = await db('user').where({ solDomain: fullDomain }).first()
    if (existing) {
        return res.json({ available: false, reason: 'Already registered on TipLnk.' })
    }

    // 2. Check On-Chain SNS (via Bonfida)
    const onChainOwner = await resolveSnsDomain(fullDomain)
    if (onChainOwner) {
        return res.json({ available: false, reason: 'Already registered on-chain.' })
    }

    res.json({ available: true })
  } catch (err) {
    console.error('SNS Check Error:', err)
    res.status(500).json({ error: 'Failed to check domain availability.' })
  }
}
