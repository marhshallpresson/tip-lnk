/**
 * Task 3.2: DFlow Swap Slippage & Freshness Validator
 * Enforces protocol-level safety on all token swaps.
 */

const MAX_SLIPPAGE_BPS = 150
const QUOTE_EXPIRY_MS = 30_000

export interface SwapQuote {
  inputAmount: string | number
  outputAmount: string | number
  slippageBps: number
  quotedAt: number
  userPublicKey: string
}

export function validateSwapParams(quote: SwapQuote): void {
  if (quote.slippageBps > MAX_SLIPPAGE_BPS) {
    throw new Error(`Slippage ${quote.slippageBps}bps exceeds protocol maximum of ${MAX_SLIPPAGE_BPS}bps`)
  }

  const age = Date.now() - quote.quotedAt
  if (age > QUOTE_EXPIRY_MS) {
    throw new Error(`Quote expired (${Math.round(age / 1000)}s old). Fetch a fresh quote before executing.`)
  }

  const input = Number(quote.inputAmount)
  const output = Number(quote.outputAmount)
  if (isNaN(input) || input <= 0 || isNaN(output) || output <= 0) {
    throw new Error('Invalid swap amounts detected in quote.')
  }

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
