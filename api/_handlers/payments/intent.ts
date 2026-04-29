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

    // ─── Phase 9: Failover & Reliability Model ───
    let order = null;
    let executionMode = 'sync';

    // 1. Try DFlow Elite Routing first
    try {
      const DFLOW_API = 'https://quote-api.dflow.net'
      const DFLOW_API_KEY = process.env.VITE_DFLOW_API_KEY
      const platformFeeBps = isDirect ? 0 : 500

      const orderParams = new URLSearchParams({
        inputMint: inputTokenMint,
        outputMint: outputMint,
        amount: amount.toString(),
        slippageBps: '50',
        userPublicKey: sourceWalletAddress,
        platformFeeBps: platformFeeBps.toString(),
        prioritizationFeeLamports: 'auto'
      })

      const dflowResponse = await axios.get(`${DFLOW_API}/order?${orderParams}`, {
        headers: DFLOW_API_KEY ? { 'x-api-key': DFLOW_API_KEY } : {},
        timeout: 3000 // Tight timeout for failover
      })
      
      order = dflowResponse.data
      executionMode = order.executionMode || 'sync'
      console.log('🛡️ Failover Model: DFlow Primary success.')
      
      return res.json({
        success: true,
        intentId,
        status: 'requires_action',
        quote: {
          outAmount: order.outAmount,
          priceImpactPct: order.priceImpactPct
        },
        transaction: order.transaction, 
        executionMode,
        lastValidBlockHeight: order.lastValidBlockHeight,
        provider: 'dflow'
      })

    } catch (dflowErr: any) {
      console.warn('⚠️ Failover Model: DFlow Primary failed, falling back to Jupiter V6.', dflowErr.message)
      
      // 2. Fallback to Jupiter V6
      const JUP_API = 'https://quote-api.jup.ag/v6'
      const quoteUrl = `${JUP_API}/quote?inputMint=${inputTokenMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=50${feeBpsParam}`
      
      const quoteResponse = await axios.get(quoteUrl)
      const quote = quoteResponse.data

      if (!quote) {
        throw new Error('All routing engines (DFlow & Jupiter) failed.')
      }

      const swapPayload = {
        quoteResponse: quote,
        userPublicKey: sourceWalletAddress,
        destinationWallet: creator.walletAddress,
        wrapAndUnwrapSol: true,
        feeAccount: process.env.VITE_TREASURY_WALLET,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      }

      const swapResponse = await axios.post(`${JUP_API}/swap`, swapPayload, {
        headers: { 'Content-Type': 'application/json' }
      })

      const { swapTransaction } = swapResponse.data

      return res.json({
        success: true,
        intentId,
        status: 'requires_action',
        quote: {
          outAmount: quote.outAmount,
          priceImpactPct: quote.priceImpactPct
        },
        transaction: swapTransaction,
        executionMode: 'sync', // Jupiter is typically sync via our relay
        provider: 'jupiter'
      })
    }


  } catch (err: any) {
    console.error('Payment Intent Error:', err.response?.data || err.message)
    return res.status(500).json({ success: false, error: 'Failed to create payment intent' })
  }
}
