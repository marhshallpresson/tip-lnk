import type { VercelRequest, VercelResponse } from "@vercel/node"
import { randomUUID } from "crypto"
import { db } from "../../../_lib/db.js"
import { getSolPrice } from "../../../_lib/price.js"
import { aggregateSocialMetrics, resolveSnsDomain } from "../../../_lib/helius.js"
import { hashAddress } from "../../../_lib/crypto.js"
import { Redis } from '@upstash/redis'

const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const resolveBooleanSetting = (columnValue: any, legacyValue: any, fallback = false) => {
  if (columnValue === true || columnValue === false) return columnValue
  if (legacyValue === true || legacyValue === false) return legacyValue
  return fallback
}

const normalizeIdentifier = (value: string) => {
  try {
    return decodeURIComponent(value || '').trim().replace(/^@/, '')
  } catch {
    return String(value || '').trim().replace(/^@/, '')
  }
}

const buildExternalProfileResponse = (wallet: string, maskedAddress?: string) => {
  const displayName = wallet.endsWith('.sol') ? wallet.replace(/\.sol$/, '') : wallet
  return {
    success: true,
    profile: {
      id: wallet,
      displayName,
      solDomain: wallet,
      walletAddress: maskedAddress || null,
      isExternal: true,
      onboardingComplete: false,
      tipsReceived: [],
    },
    metadata: {
      title: `Tip ${displayName} on Tip Stack`,
      description: `Support ${displayName} with direct SOL and USDC tips. Secure and instant.`,
      image: `https://tipstack.fun/api/og/${wallet}`,
      card: 'summary_large_image'
    }
  }
}

const withTimeout = async <T>(promise: Promise<T>, ms = 800): Promise<T | null> => {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ])
}

/**
 * PHASE 2: SCALABLE BACKEND
 * Cached Profile Fetching with Redis
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  let walletRaw = req.query.wallet;
  let wallet = Array.isArray(walletRaw) ? walletRaw[0] : (walletRaw as string);

  if (!wallet) {
    const parts = req.url?.split('?')[0].split('/').filter(Boolean) || []
    wallet = parts[parts.length - 1]
  }

  if (!wallet || wallet === 'profile' || wallet === 'get') {
    return res.status(400).json({ error: 'Valid wallet string required' })
  }

  try {
    wallet = normalizeIdentifier(wallet)
    let resolvedId = wallet;
    let isInternalId = false;

    if (wallet.startsWith('auth_')) {
        resolvedId = wallet.replace('auth_', '');
        isInternalId = true;
    } else if (wallet.length === 36 && wallet.includes('-')) {
        isInternalId = true;
    }

    if (wallet.endsWith('.tipstack.sol')) {
      return res.json(buildExternalProfileResponse(wallet))
    }

    const cacheKey = `profile:${wallet}`;
    if (redis) {
        try {
            const cached = await withTimeout(redis.get(cacheKey));
            if (cached) {
                // ELITE HARDENING: Ensure we return parsed JSON object, not string literal
                const data = typeof cached === 'string' ? JSON.parse(cached) : cached;
                return res.json(data);
            }
        } catch (cacheErr) {
            console.warn('Redis Cache Read Error:', cacheErr);
        }
    }

    let user;
    
    if (isInternalId) {
        user = await db('user').where({ id: resolvedId }).first();
    }

    if (!user) {
        user = await db('user')
            .where({ twitterHandle: wallet })
            .orWhere({ discordHandle: wallet })
            .orWhere({ solDomain: wallet })
            .first()
    }

    if (!user) {
        // SECURITY: Only hash if wallet looks like an address to avoid overhead/errors on strings
        const addressForHash = (wallet.length >= 32 && wallet.length <= 44) ? hashAddress(wallet) : 'invalid_hash';
        user = await db('user')
            .where({ walletAddress: wallet })
            .orWhere({ walletAddressHash: addressForHash })
            .first()
    }

    if (!user && wallet.includes('.sol')) {
        const onChainWallet = await resolveSnsDomain(wallet)
        if (onChainWallet) {
            const maskedAddress = `${onChainWallet.slice(0, 4)}...${onChainWallet.slice(-4)}`;
            const responseData = buildExternalProfileResponse(wallet, maskedAddress);
            if (redis) await withTimeout(redis.set(cacheKey, JSON.stringify(responseData), { ex: 300 })).catch(() => null);
            return res.json(responseData)
        }
    }
    
    if (!user && !isInternalId) {
        const isAddress = wallet.length >= 32 && wallet.length <= 44 && !wallet.includes('.') && !wallet.startsWith('auth_')
        // ZERO-KNOWLEDGE: Auto-provisioning by raw address is discouraged but allowed if it's a valid pubkey
        if (isAddress) {
            const userId = randomUUID()
            await db('user').insert({
                id: userId,
                email: null,
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

    let rawData: any = {}
    try {
      rawData = typeof user.profileData === 'string' ? JSON.parse(user.profileData || '{}') : (user.profileData || {})
    } catch {
      rawData = {}
    }
    
    const profile = rawData.profile ? { ...rawData.profile } : { ...rawData }
    
    const socialMetrics = await aggregateSocialMetrics(user.twitterHandle, user.discordHandle)
      .catch(() => ({ totalFollowers: 0, metrics: {} }))
    
    profile.socialMetrics = socialMetrics
    profile.twitterHandle = user.twitterHandle
    profile.discordHandle = user.discordHandle
    profile.solDomain = user.solDomain
    profile.onboardingComplete = Boolean(user.onboardingComplete)
    profile.auto_convert_usdc = resolveBooleanSetting(user.auto_convert_usdc, rawData.auto_convert_usdc, true)
    profile.yield_enabled = resolveBooleanSetting(user.yield_enabled, rawData.yield_enabled, false)
    profile.gasless_enabled = resolveBooleanSetting(user.gasless_enabled, rawData.gasless_enabled, false)

    const displayName = profile.displayName || user.name || 'Solana Creator'
    const identifier = user.solDomain || user.twitterHandle || user.id
    const avatarUrl = profile.avatarUrl || `https://tipstack.fun/api/og/${identifier}`
    
    // STRIP SENSITIVE DATA: walletAddress must never leave the server except during payment
    delete profile.walletAddress

    const metadata = {
        title: `${displayName} (@${user.twitterHandle || 'tipstack'})`,
        description: profile.bio || `Support ${displayName} with SOL/USDC on Tip Stack. 0% platform fees.`,
        image: avatarUrl,
        card: 'summary_large_image'
    }

    const responseData: any = { success: true, profile: { ...profile, id: user.id }, metadata };
    
    // Use recipient_id or legacy address for history
    const tipsQuery = db('tips').where({ recipient_id: user.id })
    if (user.walletAddressHash) {
      tipsQuery.orWhere({ recipient_hash: user.walletAddressHash })
    }
    const tips = await tipsQuery
      .orderBy('timestamp', 'desc')
      .limit(20)
    
    const solPrice = await getSolPrice().catch(() => 150)
    responseData.profile.tipsReceived = (tips || []).map((tip: any) => ({
      signature: tip.signature,
      timestamp: tip.timestamp,
      sender: tip.sender ? `${String(tip.sender).slice(0, 4)}...` : 'Unknown', // Masked & Hardened
      amount: Number(tip.amount || 0),
      tokenSymbol: tip.tokenSymbol || 'SOL',
      message: tip.message || '',
      amountUSDC: tip.tokenSymbol === 'USDC' ? Number(tip.amount || 0) : Number(tip.amount || 0) * solPrice
    }))

    if (redis) {
        await withTimeout(redis.set(cacheKey, JSON.stringify(responseData), { ex: 60 })).catch(() => null);
    }

    return res.json(responseData)
  } catch (err: any) {
    console.error('Profile Fetch Error:', err.message)
    return res.status(500).json({ success: false, error: 'Failed to fetch or provision profile', details: err.message })
  }
}
