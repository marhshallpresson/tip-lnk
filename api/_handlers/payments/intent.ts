import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { rpcManager } from "../../_lib/rpc.js"
import { PublicKey } from "@solana/web3.js"
import axios from "axios"
import { randomUUID } from "crypto"

/**
 * PHASE 2: Unified Intent Engine
 * Generates a PaymentIntent encompassing Crypto (Jupiter V6) or Fiat Onramp.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { 
      creatorId, 
      amount, 
      inputTokenMint, 
      paymentMethod = 'external_wallet', 
      sourceWalletAddress,
      memo = '' 
    } = req.body

    if (!creatorId || !amount) {
      return res.status(400).json({ error: 'Creator ID and amount required' })
    }

    // 1. Resolve Creator
    const creator = await db('user')
      .where({ walletAddress: creatorId })
      .orWhere({ solDomain: creatorId })
      .orWhere({ id: creatorId.replace('auth_', '') })
      .first()

    if (!creator || !creator.walletAddress) {
      return res.status(404).json({ error: 'Creator not found or missing payout address' })
    }

    const intentId = `pi_${randomUUID().replace(/-/g, '')}`

    // --- CRYPTO EXECUTION (External or Embedded Wallet) ---
    if (!sourceWalletAddress || !inputTokenMint) {
      return res.status(400).json({ error: 'Source wallet and input token required for crypto payments' })
    }

    // Verify wallets
    try {
      new PublicKey(sourceWalletAddress)
      new PublicKey(creator.walletAddress)
      new PublicKey(inputTokenMint)
    } catch {
      return res.status(400).json({ error: 'Invalid wallet or token address' })
    }

    // Determine output token (respecting creator's auto_convert preference)
    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    let outputMint = creator.walletAddress // Default to direct transfer
    
    // If auto_convert is true (which is default for TipLnk), always convert to USDC
    if (creator.auto_convert_usdc !== false) {
       outputMint = USDC_MINT
    } else {
       outputMint = inputTokenMint // No conversion, send exactly what they sent
    }

    // ─── ELITE FEE EXTRACTION ───
    // 5% Platform Fee, injected directly into Jupiter's swap transaction
    const isDirect = inputTokenMint === outputMint
    let feeAccount = undefined;
    let feeBpsParam = '';

    if (!isDirect && process.env.VITE_TREASURY_WALLET) {
        feeAccount = process.env.VITE_TREASURY_WALLET;
        feeBpsParam = `&platformFeeBps=500`; // 5%
    }

    // Fetch Jupiter V6 Quote
    const JUP_API = 'https://quote-api.jup.ag/v6'
    const quoteUrl = `${JUP_API}/quote?inputMint=${inputTokenMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50${feeBpsParam}`
    
    const quoteResponse = await axios.get(quoteUrl)
    const quote = quoteResponse.data

    if (!quote) {
      return res.status(400).json({ error: 'Failed to generate routing quote' })
    }

    // Build the Base64 Transaction via Jupiter
    const swapPayload = {
      quoteResponse: quote,
      userPublicKey: sourceWalletAddress,
      destinationWallet: creator.walletAddress,
      wrapAndUnwrapSol: true,
      feeAccount,
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto'
    }

    const swapResponse = await axios.post(`${JUP_API}/swap`, swapPayload, {
      headers: { 'Content-Type': 'application/json' }
    })

    const { swapTransaction } = swapResponse.data

    if (!swapTransaction) {
       throw new Error('Jupiter failed to return swap transaction')
    }

    return res.json({
      success: true,
      intentId,
      status: 'requires_action',
      quote,
      transaction: swapTransaction, // Base64 unsigned transaction
      executionMode: 'jup_v6'
    })

  } catch (err: any) {
    console.error('Payment Intent Error:', err.response?.data || err.message)
    return res.status(500).json({ success: false, error: 'Failed to create payment intent' })
  }
}
