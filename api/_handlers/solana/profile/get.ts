import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import { db } from "../../../_lib/db.js"
import { getSolPrice } from "../../../_lib/price.js"
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

  let wallet = req.query.wallet as string
  if (!wallet) {
    const parts = req.url?.split('?')[0].split('/').filter(Boolean) || []
    wallet = parts[parts.length - 1]
  }

  if (!wallet || wallet === 'profile' || wallet === 'get') {
    return res.status(400).json({ error: 'Valid wallet string required' })
  }

  try {
    let resolvedId = wallet;
    let isInternalId = false;

    if (wallet.startsWith('auth_')) {
        resolvedId = wallet.replace('auth_', '');
        isInternalId = true;
    } else if (wallet.length === 36 && wallet.includes('-')) {
        isInternalId = true;
    }

    const cacheKey = `profile:${wallet}`;
    if (redis) {
        const cached = await redis.get(cacheKey);
        if (cached) {
            console.log(`🛡️ Cache Hit: Returned profile for ${wallet}`);
            return res.json(cached);
        }
    }

    let user;
    
    if (isInternalId) {
        user = await db('user').where({ id: resolvedId }).first();
    }

    if (!user) {
        user = await db('user').where({ walletAddress: wallet }).first()
    }
    
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
                    title: `Tip ${wallet.replace('.sol', '')} on Tip Stack`,
                    description: `Support this creator with direct SOL and USDC tips. Secure and instant.`,
                    image: `https://tipstack.fun/api/og/${wallet}`
                }
            };
            if (redis) await redis.set(cacheKey, JSON.stringify(responseData), { ex: 300 });
            return res.json(responseData)
        }
        user = await db('user').where({ solDomain: wallet }).first()
    }
    
    if (!user && !isInternalId) {
        const isAddress = wallet.length >= 32 && wallet.length <= 44 && !wallet.includes('.') && !wallet.startsWith('auth_')
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

    const rawData = JSON.parse(user.profileData || '{}')
    
    const profile = rawData.profile ? { ...rawData.profile } : { ...rawData }
    
    const socialMetrics = await aggregateSocialMetrics(user.twitterHandle, user.discordHandle)
    
    profile.socialMetrics = socialMetrics
    profile.walletAddress = user.walletAddress
    profile.twitterHandle = user.twitterHandle
    profile.discordHandle = user.discordHandle
    profile.solDomain = user.solDomain
    profile.onboardingComplete = Boolean(user.onboardingComplete)

    const displayName = profile.displayName || user.name || 'Solana Creator'
    const avatarUrl = profile.avatarUrl || `https://tipstack.fun/api/og/${user.walletAddress}`
    
    const metadata = {
        title: `${displayName} (@${user.twitterHandle || 'tipstack'})`,
        description: profile.bio || `Support ${displayName} with SOL/USDC on Tip Stack. 0% platform fees.`,
        image: avatarUrl,
        card: 'summary_large_image'
    }

    const responseData = { success: true, profile, metadata };
    
    if (user.walletAddress) {
      const tips = await db('tips')
        .where('recipient', user.walletAddress)
        .orderBy('timestamp', 'desc')
        .limit(20)
      
      const solPrice = await getSolPrice()
      responseData.profile.tipsReceived = tips.map(tip => ({
        ...tip,
        amount: Number(tip.amount),
        amountUSDC: tip.tokenSymbol === 'USDC' ? Number(tip.amount) : Number(tip.amount) * solPrice
      }))
    }

    if (redis) {
        await redis.set(cacheKey, JSON.stringify(responseData), { ex: 60 });
    }

    return res.json(responseData)
  } catch (err) {
    console.error('Profile Fetch Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch or provision profile' })
  }
}
