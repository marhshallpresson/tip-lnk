import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Handle Resolution
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { handle: rawHandle } = req.query
  if (typeof rawHandle !== 'string') return res.status(400).json({ error: 'Handle required' })
  
  const handle = rawHandle.replace(/^@/, '')
  
  try {
    const user = await db('user')
      .where({ twitterHandle: handle })
      .orWhere({ discordHandle: handle })
      .orWhere({ solDomain: handle })
      .orWhere({ solDomain: `${handle}.tipstack.sol` })
      .first()

    if (!user || (!user.walletAddress && !user.encryptedWalletAddress)) {
      return res.status(404).json({ success: false, error: 'Handle not linked to a wallet.' })
    }

    const profileData = JSON.parse(user.profileData || '{}');
    const hasPhone = Boolean(profileData.phone || profileData.mobileNumber);
    const hasDob = Boolean(profileData.dob);
    const hasAddress = Boolean(profileData.address);
    const hasCity = Boolean(profileData.city);
    const hasCountry = Boolean(profileData.country);
    
    const fiatEnabled = hasPhone && hasDob && hasAddress && hasCity && hasCountry;

    res.json({
      success: true,
      handle: `@${handle}`,
      id: user.id,
      username: handle,
      fiatEnabled,
      profile: profileData
    })
  } catch (err) {
    console.error('Resolution Error:', err)
    res.status(500).json({ success: false, error: 'Resolution failed.' })
  }
}
