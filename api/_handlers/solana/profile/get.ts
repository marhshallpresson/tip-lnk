import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import { db } from "../../../_lib/db.js"
import { aggregateSocialMetrics, resolveSnsDomain } from "../../../_lib/helius.js"
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

/**
 * PHASE 2: SCALABLE BACKEND
 * Cached Profile Fetching with Redis
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const wallet = req.query.wallet as string
  if (typeof wallet !== 'string' || wallet.length === 0) {
    return res.status(400).json({ error: 'Valid wallet string required' })
  }

  try {
    // ─── ELITE CACHING LAYER ───
    const cacheKey = `profile:${wallet}`;
    if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
            console.log(`🛡️ Cache Hit: Returned profile for ${wallet}`);
            return res.json(cached);
        }
    }

    // Advanced Query: Search by walletAddress first, then googleSub, then solDomain, then id
    let user = await db('user').where({ walletAddress: wallet }).first()
    
    if (!user) {
        user = await db('user').where({ googleSub: wallet }).first()
    }

    if (!user && wallet.includes('.sol')) {
        const onChainWallet = await resolveSnsDomain(wallet)
        if (onChainWallet) {
            const responseData = { 
                success: true, 
                profile: { 
                    displayName: wallet.replace('.sol', ''),
                    solDomain: wallet,
                    walletAddress: onChainWallet,
                    isExternal: true
                },
                metadata: {
                    title: `Tip ${wallet.replace('.sol', '')} on TipLnk`,
                    description: `Support this creator with direct SOL and USDC tips. Secure and instant.`,
                    image: `https://tiplnk.me/api/og/${wallet}`
                }
            };
            if (redis) await redis.set(cacheKey, JSON.stringify(responseData), { ex: 300 }); // Cache for 5 mins
            return res.json(responseData)
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

    // ─── ELITE DATA RESOLUTION ───
    const rawData = JSON.parse(user.profileData || '{}')
    
    // Support both new flattened structure and legacy nested state structure
    const profile = rawData.profile ? { ...rawData.profile } : { ...rawData }
    
    // Merge in high-priority root fields from the user table
    const socialMetrics = await aggregateSocialMetrics(user.twitterHandle, user.discordHandle)
    
    profile.socialMetrics = socialMetrics
    profile.walletAddress = user.walletAddress
    profile.twitterHandle = user.twitterHandle
    profile.discordHandle = user.discordHandle
    profile.solDomain = user.solDomain
    profile.onboardingComplete = Boolean(user.onboardingComplete)

    // ─── ELITE SEO METADATA ───
    const displayName = profile.displayName || user.name || 'Solana Creator'
    const avatarUrl = profile.avatarUrl || `https://tiplnk.me/api/og/${user.walletAddress}`
    
    const metadata = {
        title: `${displayName} (@${user.twitterHandle || 'tiplnk'})`,
        description: profile.bio || `Support ${displayName} with SOL/USDC on TipLnk. 0% platform fees.`,
        image: avatarUrl,
        card: 'summary_large_image'
    }

    const responseData = { success: true, profile, metadata };
    
    // ─── ELITE SOCIAL PROOF: FETCH RECENT TIPS ───
    if (user.walletAddress) {
      const tips = await db('tips')
        .where('recipient', user.walletAddress)
        .orderBy('timestamp', 'desc')
        .limit(20)
      
      responseData.profile.tipsReceived = tips.map(tip => ({
        ...tip,
        amount: Number(tip.amount),
        amountUSDC: tip.tokenSymbol === 'USDC' ? Number(tip.amount) : Number(tip.amount) * 125 // Mock SOL price if not USDC
      }))
    }

    // Cache the final response
    if (redis) {
        await redis.set(cacheKey, JSON.stringify(responseData), { ex: 60 }); // Cache for 60 seconds
    }

    return res.json(responseData)
  } catch (err) {
    console.error('Profile Fetch Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch or provision profile' })
  }
}
