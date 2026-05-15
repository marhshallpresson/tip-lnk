import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../_lib/db.js"
import { PublicKey } from "@solana/web3.js"
import axios from "axios"
import { randomUUID } from "crypto"

import { decrypt } from "../../_lib/crypto.js"
import { rateLimit } from "../../_lib/ratelimit.js"

const resolveBooleanSetting = (columnValue: any, legacyValue: any, fallback = false) => {
  if (columnValue === true || columnValue === false) return columnValue;
  if (legacyValue === true || legacyValue === false) return legacyValue;
  return fallback;
}

/**
 * PHASE 2: Unified Intent Engine
 * Generates a PaymentIntent encompassing Crypto (Jupiter V6) or Fiat Onramp.
 * Hardened for Zero-Knowledge: Decrypts creator address internally.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // SECURITY PATCH: Enforce global rate limiting
  if (!(await rateLimit(req, res))) return;

  try {
    const { 
      creatorId, 
      amount, 
      inputTokenMint, 
      sourceWalletAddress
    } = req.body

    if (!creatorId || !amount) {
      return res.status(400).json({ error: 'Creator ID and amount required' })
    }

    const normalizedAmount = Number(amount)
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
      return res.status(400).json({ error: 'Amount must be a positive number' })
    }

    // Resolve creator: ID, Handle, or Domain (Zero-Knowledge reference)
    const creator = await db('user')
      .where({ id: creatorId.replace('auth_', '') })
      .orWhere({ twitterHandle: creatorId.replace(/^@/, '') })
      .orWhere({ discordHandle: creatorId.replace(/^@/, '') })
      .orWhere({ solDomain: creatorId })
      .orWhere({ walletAddress: creatorId }) // Legacy support
      .first()

    if (!creator) {
      return res.status(404).json({ 
        error: 'Creator not found',
        actionMessage: 'Please check the creator handle or wallet address and try again.',
        retryable: true
      })
    }

    // Decrypt the cloaked payout address with better error handling
    let payoutAddress = creator.walletAddress;
    if (!payoutAddress && creator.encryptedWalletAddress) {
        try {
            payoutAddress = decrypt(creator.encryptedWalletAddress);
        } catch (e) {
            console.error('Decryption error:', e);
            return res.status(500).json({ 
              error: 'Failed to retrieve creator payout details',
              actionMessage: 'The creator account may need to be re-configured. Please contact support.',
              retryable: false
            })
        }
    }

    if (!payoutAddress) {
      return res.status(404).json({ 
        error: 'Creator missing payout address',
        actionMessage: 'This creator has not set up their payout wallet yet. Please ask them to complete their profile setup.',
        retryable: false,
        supportUrl: 'https://tipstack.fun/docs/creators/setup'
      })
    }

    const intentId = `pi_${randomUUID().replace(/-/g, '')}`

    if (!sourceWalletAddress || !inputTokenMint) {
      return res.status(400).json({ error: 'Source wallet and input token required for crypto payments' })
    }

    try {
      new PublicKey(sourceWalletAddress)
      new PublicKey(payoutAddress)
      new PublicKey(inputTokenMint)
    } catch {
      return res.status(400).json({ error: 'Invalid wallet or token address' })
    }

    const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    const JITOSOL_MINT = 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn'

    let profileData: any = {}
    if (creator.profileData) {
      try {
        profileData = JSON.parse(creator.profileData)
      } catch {
        profileData = {}
      }
    }
    const creatorYieldEnabled = resolveBooleanSetting(creator.yield_enabled, profileData.yield_enabled, false)
    const creatorGaslessEnabled = resolveBooleanSetting(creator.gasless_enabled, profileData.gasless_enabled, false)
    const creatorAutoConvertUsdc = resolveBooleanSetting(creator.auto_convert_usdc, profileData.auto_convert_usdc, true)

    let outputMint = JITOSOL_MINT
    if (!creatorYieldEnabled) {
      outputMint = creatorAutoConvertUsdc !== false ? USDC_MINT : inputTokenMint
    }

    const isDirect = inputTokenMint === outputMint
    
    let order = null;

    try {
      // PHASE 3: Jupiter Ultra Swap (Unified API)
      const JUP_ULTRA_API = 'https://api.jup.ag/ultra/v1'
      const JUP_API_KEY = process.env.JUPITER_API_KEY

      if (!JUP_API_KEY) {
        // Log as info/debug rather than error if we expect it might be missing
        console.log('ℹ️ Jupiter Ultra key missing, using V6 public fallback')
        throw new Error('NO_ULTRA_KEY')
      }

        const isGasless = creatorGaslessEnabled === true;

        console.log(`🚀 Jupiter Ultra: Fetching order for ${amount} ${inputTokenMint} -> ${outputMint} (Gasless: ${isGasless})`)

        const orderParams = new URLSearchParams({
          inputMint: inputTokenMint,
          outputMint: outputMint,
          amount: normalizedAmount.toString(),
          taker: sourceWalletAddress,
          slippageBps: '50',
          // Managed landing is required for gasless abstraction
          managedLanding: isGasless ? 'true' : 'false'
        })

        const ultraResponse = await axios.get(`${JUP_ULTRA_API}/order?${orderParams}`, {
          headers: { 'x-api-key': JUP_API_KEY },
          timeout: 5000
        })
        
        order = ultraResponse.data
        
        let finalTransaction = order.transaction;

        // ─── ELITE DEFI: ATOMIC KAMINO YIELD ───
        if (creatorYieldEnabled && outputMint === USDC_MINT) {
           try {
              const { attachKaminoYield } = await import("../../_lib/kamino.js");
              const { rpcManager } = await import("../../_lib/rpc.js");
              const connection = await rpcManager.getConnection();
              
              finalTransaction = await attachKaminoYield(
                connection,
                finalTransaction,
                new PublicKey(payoutAddress),
                order.outAmount, // Ultra's output amount
                "USDC"
              );
              console.log('✅ Kamino instructions attached to Ultra transaction');
           } catch (e: any) {
              console.warn('⚠️ Kamino attachment failed:', e.message);
           }
        }

        return res.json({
          success: true,
          intentId,
          status: 'requires_action',
          quote: {
            outAmount: order.outAmount,
            priceImpactPct: order.priceImpactPct
          },
          transaction: finalTransaction, 
          requestId: order.requestId,
          executionMode: isGasless ? 'async' : 'sync', // Gasless usually requires async landing
          lastValidBlockHeight: order.lastValidBlockHeight,
          provider: 'jupiter-ultra',
          isGasless,
          settings: {
            yieldEnabled: creatorYieldEnabled,
            gaslessEnabled: creatorGaslessEnabled,
            autoConvertUsdc: creatorAutoConvertUsdc !== false
          }
        })

    } catch (ultraErr: any) {
      if (ultraErr.message !== 'NO_ULTRA_KEY') {
        console.error('❌ Jupiter Ultra Error:', ultraErr.response?.data || ultraErr.message)
      }
      
      // Secondary Fallback: Jupiter V6 (Classic)
      const JUP_V6_API = 'https://quote-api.jup.ag/v6'
      const platformFeeBps = isDirect ? 0 : 500
      const feeBpsParam = platformFeeBps > 0 ? `&platformFeeBps=${platformFeeBps}` : ''
      
      const quoteUrl = `${JUP_V6_API}/quote?inputMint=${inputTokenMint}&outputMint=${outputMint}&amount=${normalizedAmount}&slippageBps=50${feeBpsParam}`
      
      const quoteResponse = await axios.get(quoteUrl)
      const quote = quoteResponse.data

      if (!quote) {
        throw new Error('Both Ultra and V6 engines failed.')
      }

      // ─── ELITE SECURITY: DYNAMIC PRIORITY FEES ───
      // According to Helius/QuickNode docs, hardcoded fees fail during congestion.
      // We fetch real-time estimates for the destination account.
      let prioritizationFeeLamports: any = 'auto'
      try {
          const { getPriorityFeeEstimate } = await import('../../_lib/helius.js')
          const fees = await getPriorityFeeEstimate([payoutAddress])
          prioritizationFeeLamports = Math.max(fees.medium, 1000) 
          console.log(`🚀 Priority Fee Adjusted: ${prioritizationFeeLamports} microlamports`)
      } catch (feeErr) {
          console.warn('Priority fee estimation failed, falling back to auto.')
      }

      const treasuryWallet = process.env.TREASURY_WALLET || process.env.VITE_TREASURY_WALLET;
      
      const swapPayload = {
        quoteResponse: quote,
        userPublicKey: sourceWalletAddress,
        destinationWallet: payoutAddress,
        wrapAndUnwrapSol: true,
        feeAccount: treasuryWallet,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports
      }

      const swapResponse = await axios.post(`${JUP_V6_API}/swap`, swapPayload, {
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
        executionMode: 'sync',
        provider: 'jupiter-v6',
        settings: {
          yieldEnabled: creatorYieldEnabled,
          gaslessEnabled: creatorGaslessEnabled,
          autoConvertUsdc: creatorAutoConvertUsdc !== false
        }
      })
    }


  } catch (err: any) {
    console.error('Payment Intent Error:', err.response?.data || err.message)
    return res.status(500).json({ success: false, error: 'Failed to create payment intent' })
  }
}
