import { db, initSchema } from "./db.js"
import { resolveSnsDomain } from "./helius.js"
import { hashAddress } from "./crypto.js"

export interface ProfileMetadata {
  title: string
  description: string
  image: string
  card: string
}

export interface ProfileData {
  success: boolean
  profile: any
  metadata: ProfileMetadata
}

export async function fetchProfileByWalletOrHandle(wallet: string): Promise<ProfileData | null> {
  try {
    // Ensure database schema is ready
    await initSchema().catch(() => null);

    let resolvedId = wallet
    let isInternalId = false

    if (wallet.startsWith('auth_')) {
      resolvedId = wallet.replace('auth_', '')
      isInternalId = true
    } else if (wallet.length === 36 && wallet.includes('-')) {
      isInternalId = true
    }

    let user
    
    if (isInternalId) {
      user = await db('user').where({ id: resolvedId }).first()
    }

    if (!user) {
      user = await db('user').where({ walletAddress: wallet }).first()
    }

    if (!user) {
      const addressForHash = (wallet.length >= 32 && wallet.length <= 44) ? hashAddress(wallet) : 'invalid_hash';
      user = await db('user').where({ walletAddressHash: addressForHash }).first()
    }

    if (!user && wallet.includes('.sol')) {
      const onChainWallet = await resolveSnsDomain(wallet)
      if (onChainWallet) {
        return { 
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
            image: `https://tipstack.fun/api/og/${wallet}`,
            card: 'summary_large_image'
          }
        }
      }
      user = await db('user').where({ solDomain: wallet }).first()
    }

    if (!user) {
      // Try resolving as handle
      user = await db('user')
        .where({ twitterHandle: wallet.replace(/^@/, '') })
        .orWhere({ discordHandle: wallet.replace(/^@/, '') })
        .first()
    }

    if (!user) return null

    // NORMIE INTEGRATION: Check for active Normie progression
    const normieProgression = await db('user_normie_progression').where({ userId: user.id }).first();

    let rawData: any = {}
    try {
      rawData = typeof user.profileData === 'string' ? JSON.parse(user.profileData || '{}') : (user.profileData || {})
    } catch {
      rawData = {}
    }
    
    const profile = rawData.profile ? { ...rawData.profile } : { ...rawData }
    
    profile.walletAddress = user.walletAddress
    profile.twitterHandle = user.twitterHandle
    profile.discordHandle = user.discordHandle
    profile.solDomain = user.solDomain

    const displayName = profile.displayName || user.name || 'Solana Creator'
    const identifier = user.solDomain || user.twitterHandle || user.id
    
    // Auto-Avatar priority: Normie > User Set > OG
    let image = profile.avatarUrl;
    if (normieProgression) {
      image = `https://api.normies.art/normie/${normieProgression.ethNormieId}/image.png`;
    }
    if (!image) {
      image = `https://tipstack.fun/api/og/${identifier}`;
    }

    // STRIP SENSITIVE DATA: walletAddress must never leave the server except during payment
    delete profile.walletAddress 
    
    const metadata = {
      title: `${displayName} on Tip Stack`,
      description: profile.bio || `Support ${displayName} with SOL/USDC on Tip Stack. 0% platform fees.`,
      image: image,
      card: 'summary_large_image',
      normie: normieProgression ? {
        id: normieProgression.ethNormieId,
        level: normieProgression.currentLevel,
        xp: normieProgression.experiencePoints
      } : null
    }

    return { success: true, profile: { ...profile, id: user.id, avatarUrl: image }, metadata }
  } catch (err) {
    console.error('Profile Fetch Error:', err)
    return null
  }
}

