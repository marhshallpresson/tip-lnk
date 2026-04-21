import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import { applyCors } from "../../_cors.js"
import { db } from "../../../_lib/db.js"
import { aggregateSocialMetrics, resolveSnsDomain } from "../../../_lib/helius.js"

/**
 * Task 2.2: Standalone Vercel Function for Profile Fetching
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const wallet = req.query.wallet as string
  if (typeof wallet !== 'string' || wallet.length === 0) {
    return res.status(400).json({ error: 'Valid wallet string required' })
  }

  try {
    // Advanced Query: Search by walletAddress first, then googleSub, then solDomain, then id
    let user = await db('user').where({ walletAddress: wallet }).first()
    
    if (!user) {
        user = await db('user').where({ googleSub: wallet }).first()
    }

    if (!user && wallet.includes('.sol')) {
        const onChainWallet = await resolveSnsDomain(wallet)
        if (onChainWallet) {
            return res.json({ 
                success: true, 
                profile: { 
                    displayName: wallet.replace('.sol', ''),
                    solDomain: wallet,
                    walletAddress: onChainWallet,
                    isExternal: true
                } 
            })
        }
        user = await db('user').where({ solDomain: wallet }).first()
    }
    
    if (!user && wallet.length === 36 && wallet.includes('-')) {
        user = await db('user').where({ id: wallet }).first()
    }
    
    if (!user) {
        const isAddress = wallet.length >= 32 && wallet.length <= 44 && !wallet.includes('.')
        if (isAddress) {
            const userId = randomUUID()
            await db('user').insert({
                id: userId,
                email: `${wallet}@phantom.local`,
                walletAddress: wallet,
                profileData: JSON.stringify({ displayName: 'New Creator' }),
                created_at: new Date()
            })
            user = await db('user').where({ id: userId }).first()
        } else {
            return res.status(404).json({ success: false, error: 'User profile not found.' })
        }
    }

    if (!user) {
        return res.status(404).json({ success: false, error: 'User profile not found' })
    }

    const profile = JSON.parse(user.profileData || '{}')
    const socialMetrics = await aggregateSocialMetrics(user.twitterHandle, user.discordHandle)
    
    profile.socialMetrics = socialMetrics
    profile.walletAddress = user.walletAddress
    profile.twitterHandle = user.twitterHandle
    profile.discordHandle = user.discordHandle
    profile.solDomain = user.solDomain

    return res.json({ success: true, profile })
  } catch (err) {
    console.error('Profile Fetch Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch or provision profile' })
  }
}
