import { db } from "./db.js"
import { resolveSnsDomain } from "./helius.js"

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

    const rawData = JSON.parse(user.profileData || '{}')
    const profile = rawData.profile ? { ...rawData.profile } : { ...rawData }
    
    profile.walletAddress = user.walletAddress
    profile.twitterHandle = user.twitterHandle
    profile.discordHandle = user.discordHandle
    profile.solDomain = user.solDomain

    const displayName = profile.displayName || user.name || 'Solana Creator'
    const identifier = user.solDomain || user.twitterHandle || user.id
    const image = profile.avatarUrl || `https://tipstack.fun/api/og/${identifier}`
    
    // STRIP SENSITIVE DATA: walletAddress must never leave the server except during payment
    delete profile.walletAddress 
    
    const metadata = {
      title: `${displayName} on Tip Stack`,
      description: profile.bio || `Support ${displayName} with SOL/USDC on Tip Stack. 0% platform fees.`,
      image: image,
      card: 'summary_large_image'
    }

    return { success: true, profile: { ...profile, id: user.id }, metadata }
  } catch (err) {
    console.error('Profile Fetch Error:', err)
    return null
  }
}
