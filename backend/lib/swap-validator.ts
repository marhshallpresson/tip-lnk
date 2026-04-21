/**
 * Task 3.2: DFlow Swap Slippage & Freshness Validator
 * Enforces protocol-level safety on all token swaps.
 */

const MAX_SLIPPAGE_BPS = 150  // 1.5% maximum — protocol standard
const QUOTE_EXPIRY_MS = 30_000 // 30 seconds freshness requirement

export interface SwapQuote {
  inputAmount: string | number
  outputAmount: string | number
  slippageBps: number
  quotedAt: number  // timestamp
  userPublicKey: string
}

export function validateSwapParams(quote: SwapQuote): void {
  // 1. Slippage Hardening
  if (quote.slippageBps > MAX_SLIPPAGE_BPS) {
    throw new Error(`Slippage ${quote.slippageBps}bps exceeds protocol maximum of ${MAX_SLIPPAGE_BPS}bps`)
  }

  // 2. Freshness Check (Anti-MEV / Price Manipulation)
  const age = Date.now() - quote.quotedAt
  if (age > QUOTE_EXPIRY_MS) {
    throw new Error(`Quote expired (${Math.round(age / 1000)}s old). Fetch a fresh quote before executing.`)
  }

  // 3. Sanity check on amounts
  const input = Number(quote.inputAmount)
  const output = Number(quote.outputAmount)
  if (isNaN(input) || input <= 0 || isNaN(output) || output <= 0) {
    throw new Error('Invalid swap amounts detected in quote.')
  }

  // Log all validated swap attempts for audit requirements
  console.log(`🛡️ SWAP_VALIDATED: ${quote.userPublicKey} | Slip: ${quote.slippageBps}bps | In: ${input} | Out: ${output}`)
}

/**
 * Calculates the absolute minimum output to be enforced in the transaction instruction.
 */
export function calculateMinOutput(outputAmount: string | number, slippageBps: number): bigint {
    const out = BigInt(outputAmount)
    const slip = BigInt(slippageBps)
    return out - (out * slip) / 10000n
}
