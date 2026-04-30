import { Connection, PublicKey } from '@solana/web3.js'
import { reverseLookup, getDomainKeySync, NameRegistryState } from '@bonfida/spl-name-service'

/**
 * SNS Domain Verification Utility
 * Implements bidirectional lookup validation to prevent:
 * - Parent domain admin hijacking
 * - Typosquatting attacks
 * - Subdomain spoofing
 */

interface SNSVerificationResult {
  isValid: boolean
  resolvedWallet: string | null
  error?: string
  cached?: boolean
  timestamp: number
}

// In-memory cache with TTL (5 minutes)
const snsCache = new Map<string, { result: SNSVerificationResult; expiry: number }>()
const CACHE_TTL = 5 * 60 * 1000

/**
 * Verify SNS domain resolution bidirectionally
 * 1. Forward lookup: SNS name → wallet
 * 2. Reverse lookup: wallet → SNS name (must match forward)
 */
export async function verifySNSResolution(
  snsDomain: string,
  connection: Connection,
  cachedResult?: SNSVerificationResult
): Promise<SNSVerificationResult> {
  const cacheKey = `sns:${snsDomain}`
  const now = Date.now()

  // Check cache
  const cached = snsCache.get(cacheKey)
  if (cached && cached.expiry > now) {
    return { ...cached.result, cached: true }
  }

  try {
    // Step 1: Forward lookup - resolve SNS domain to wallet
    const resolvedWallet = await resolveSNSDomain(snsDomain, connection)
    if (!resolvedWallet) {
      const result: SNSVerificationResult = {
        isValid: false,
        resolvedWallet: null,
        error: `SNS domain ${snsDomain} could not be resolved`,
        timestamp: now,
      }
      snsCache.set(cacheKey, { result, expiry: now + CACHE_TTL })
      return result
    }

    // Step 2: Reverse lookup - resolve wallet back to SNS name
    const reverseLookupName = await reverseLookupSNSDomain(resolvedWallet, connection)

    // Step 3: Bidirectional verification
    if (reverseLookupName !== snsDomain) {
      const result: SNSVerificationResult = {
        isValid: false,
        resolvedWallet: resolvedWallet,
        error: `SNS mismatch: Forward resolves to ${resolvedWallet}, but reverse lookup returns ${reverseLookupName}. Possible hijacking or typosquatting.`,
        timestamp: now,
      }
      snsCache.set(cacheKey, { result, expiry: now + CACHE_TTL })
      return result
    }

    // Success: bidirectional verification passed
    const result: SNSVerificationResult = {
      isValid: true,
      resolvedWallet: resolvedWallet,
      timestamp: now,
    }
    snsCache.set(cacheKey, { result, expiry: now + CACHE_TTL })
    return result
  } catch (error) {
    const result: SNSVerificationResult = {
      isValid: false,
      resolvedWallet: null,
      error: `SNS verification failed: ${error instanceof Error ? error.message : String(error)}`,
      timestamp: now,
    }
    return result
  }
}

/**
 * Resolve SNS domain to wallet address (forward lookup)
 */
export async function resolveSNSDomain(
  snsDomain: string,
  connection: Connection
): Promise<string | null> {
  try {
    // Format: handle the SNS domain (e.g., "creator.tiplnk.sol" → "creator.tiplnk")
    const domainName = snsDomain.replace(/\.sol$/, '')

    // Get the domain key (PDAs for SNS registry)
    const domainKeyInfo = getDomainKeySync(domainName) // SNS parent domain

    // Fetch the registry account
    const registry = await connection.getAccountInfo(domainKeyInfo.pubkey)
    if (!registry) {
      return null
    }

    // Parse the NameRegistryState
    const registryState = NameRegistryState.deserialize(registry.data)
    if (!registryState || !registryState.owner) {
      return null
    }

    return registryState.owner.toBase58()
  } catch (error) {
    console.error('SNS forward lookup error:', error)
    return null
  }
}

/**
 * Reverse lookup: wallet → SNS name
 */
export async function reverseLookupSNSDomain(
  walletAddress: string,
  connection: Connection
): Promise<string | null> {
  try {
    const wallet = new PublicKey(walletAddress)
    const domain = await reverseLookup(connection, wallet)
    if (domain) {
      return `${domain}.sol`
    }
    return null
  } catch (error) {
    console.error('SNS reverse lookup error:', error)
    return null
  }
}

/**
 * Wrapper for transaction construction:
 * Validates SNS domain before allowing tip to proceed
 */
export async function validateSNSForTip(
  snsDomain: string,
  expectedWallet: string | null,
  connection: Connection
): Promise<{ valid: boolean; resolvedWallet: string | null; reason?: string }> {
  const verification = await verifySNSResolution(snsDomain, connection)

  if (!verification.isValid) {
    return {
      valid: false,
      resolvedWallet: null,
      reason: verification.error,
    }
  }

  // If we have an expected wallet, verify it matches
  if (expectedWallet && verification.resolvedWallet !== expectedWallet) {
    return {
      valid: false,
      resolvedWallet: verification.resolvedWallet,
      reason: `SNS resolves to ${verification.resolvedWallet}, but expected ${expectedWallet}. Possible address change detected.`,
    }
  }

  return {
    valid: true,
    resolvedWallet: verification.resolvedWallet,
  }
}

/**
 * Clear cache (for testing or admin)
 */
export function clearSNSCache(): void {
  snsCache.clear()
}

/**
 * Get cache stats
 */
export function getSNSCacheStats(): { size: number; entries: string[] } {
  return {
    size: snsCache.size,
    entries: Array.from(snsCache.keys()),
  }
}
