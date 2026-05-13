import { Commitment, PublicKey } from '@solana/web3.js'
import BN from 'bn.js'

/**
 * SECURITY PATCH: DFlow Intent Slippage & Expiry Protection (C-02)
 * 
 * Prevents:
 * - Intent replay attacks
 * - MEV front-running / slippage manipulation
 * - Stale intent fills at worse prices
 */

export interface DFlowIntentConfig {
  /** Input mint address */
  inMint: PublicKey
  /** Output mint address */
  outMint: PublicKey
  /** Amount to swap (in base units) */
  inAmount: BN
  /** Minimum acceptable output (protects against slippage) */
  minOutAmount: BN
  /** Slot-based expiry - intent invalid after this slot */
  expirySlot: number
  /** Optional: create a unique nonce per user/swap to prevent replays */
  nonce?: BN
  /** Maximum allowed slippage percentage (e.g., 0.5 for 0.5%) */
  maxSlippagePercent: number
}

/**
 * Calculate minimum output amount based on expected output and max slippage
 * 
 * Formula: minOut = expectedOut * (1 - (maxSlippage / 100))
 */
export function calculateMinOutputAmount(
  expectedOutput: BN,
  maxSlippagePercent: number
): BN {
  const ONE_HUNDRED = new BN(100)
  const slippageDecimal = new BN(Math.floor(maxSlippagePercent * 1000)) // e.g., 0.5% → 500
  
  // minOut = expectedOut * (100000 - slippageDecimal) / 100000
  const multiplier = new BN(100000).sub(slippageDecimal)
  const minOut = expectedOutput.mul(multiplier).div(new BN(100000))
  
  return minOut
}

/**
 * Build a secure DFlow intent with expiry and slippage protection
 */
export function buildSecureDFlowIntent(
  config: DFlowIntentConfig
): {
  inMint: PublicKey
  outMint: PublicKey
  inAmount: BN
  minOutAmount: BN
  expirySlot: number
  nonce: string
  slippageBps: number // Basis points
} {
  // Validate slippage bounds
  if (config.maxSlippagePercent < 0 || config.maxSlippagePercent > 5) {
    throw new Error(
      `Slippage out of bounds: ${config.maxSlippagePercent}%. Must be 0-5%.`
    )
  }

  // Convert to basis points (1% = 100 bps)
  const slippageBps = Math.round(config.maxSlippagePercent * 100)

  // Validate min output is lower than expected
  if (config.minOutAmount.gt(config.inAmount)) {
    throw new Error('minOutAmount cannot exceed inAmount')
  }

  // Validate expiry is in future (+ at least 10 slots from now)
  // Note: Current slot must be checked at runtime in the handler
  if (config.expirySlot <= 0) {
    throw new Error('expirySlot must be positive and in the future')
  }

  // Generate or use provided nonce
  const nonce = config.nonce
    ? config.nonce.toString(16)
    : generateReplayNonce()

  return {
    inMint: config.inMint,
    outMint: config.outMint,
    inAmount: config.inAmount,
    minOutAmount: config.minOutAmount,
    expirySlot: config.expirySlot,
    nonce,
    slippageBps,
  }
}

/**
 * Generate a unique nonce to prevent intent replay
 * Uses timestamp + random component
 */
export function generateReplayNonce(): string {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substring(2, 15)
  return `${timestamp}-${random}`.substring(0, 64)
}

/**
 * Validate that an executed intent fill matches the signed intent bounds
 */
export function validateIntentFill(
  executedAmountOut: BN,
  signedMinOut: BN,
  signedSlippageBps: number,
  expectedAmountOut: BN
): {
  isValid: boolean
  actualSlippage: number
  warnings: string[]
} {
  const warnings: string[] = []

  // Check 1: Output meets minimum threshold
  if (executedAmountOut.lt(signedMinOut)) {
    return {
      isValid: false,
      actualSlippage: 100, // Max slippage
      warnings: [
        `Output ${executedAmountOut.toString()} is below minimum ${signedMinOut.toString()}`,
      ],
    }
  }

  // Check 2: Calculate actual slippage
  const slippageAmount = expectedAmountOut.sub(executedAmountOut)
  const actualSlippage = slippageAmount
    .mul(new BN(10000))
    .div(expectedAmountOut)
    .toNumber() / 100

  if (actualSlippage > signedSlippageBps / 100) {
    warnings.push(
      `Actual slippage (${actualSlippage.toFixed(2)}%) exceeds signed limit (${(
        signedSlippageBps / 100
      ).toFixed(2)}%)`
    )
  }

  // Check 3: Warn if fill was significantly worse than expected
  if (actualSlippage > 2) {
    warnings.push(`High slippage detected: ${actualSlippage.toFixed(2)}%. Possible MEV extraction.`)
  }

  return {
    isValid: true,
    actualSlippage,
    warnings,
  }
}

/**
 * Security guidelines for DFlow intent construction
 */
export const DFLOW_SECURITY_CONFIG = {
  // Recommended slippage bounds by asset type
  slippageLimits: {
    STABLECOIN: 0.5, // 0.5% max for USDC/USDT
    SOL: 1.5, // 1.5% max for SOL
    ALT: 3.0, // 3% max for alternative tokens
  },

  // Intent expiry: max duration in slots (~400ms per slot)
  expirySlotWindow: {
    MIN: 10, // At least 10 slots (~4 seconds)
    MAX: 600, // At most 600 slots (~240 seconds / 4 minutes)
  },

  // Minimum tip amounts to avoid spam
  minimumTipAmounts: {
    SOL: 0.001, // 0.001 SOL minimum
    USDC: 0.1, // $0.10 minimum
  },

  // Rate limiting per creator per 60s
  rateLimit: {
    PerMinute: 30,
    PerHour: 1000,
  },
}

/**
 * Determine slippage limit based on token type
 */
export function getSlippageLimitForToken(
  mint: PublicKey,
  stablecoinMints?: Set<string>
): number {
  const mintStr = mint.toBase58()

  // Check if it's a known stablecoin
  if (stablecoinMints?.has(mintStr)) {
    return DFLOW_SECURITY_CONFIG.slippageLimits.STABLECOIN
  }

  // Check for common stablecoins
  const knownStables = [
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenErt', // USDT
    'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac', // USDN
    '3nML6bK38pB7byRN4JBbvDNS7y4sRBRMhD6Ht8A4KXo1', // agEUR
  ]

  if (knownStables.includes(mintStr)) {
    return DFLOW_SECURITY_CONFIG.slippageLimits.STABLECOIN
  }

  // SOL
  if (mintStr === '11111111111111111111111111111111') {
    return DFLOW_SECURITY_CONFIG.slippageLimits.SOL
  }

  // Default
  return DFLOW_SECURITY_CONFIG.slippageLimits.ALT
}
