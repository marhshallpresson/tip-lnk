import type { VercelRequest, VercelResponse } from '@vercel/node'
import { PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'

/**
 * PHASE 4: TRANSACTION PIPELINE (ENFORCED)
 * - Constructs Jupiter swap with exact destination routing
 * - Requires destinationWallet (Creator)
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { inputMint, outputMint, amount, userPublicKey, destinationWallet } = req.body
  const slippageBps = req.body.slippageBps || 50

  if (!inputMint || !outputMint || !amount || !userPublicKey || !destinationWallet) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    // 1. Quote Intelligence (DFlow pre-routing analytics)
    const dflowQuoteResponse = await fetch(
      `https://quote-api.dflow.net/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
    ).then((r) => r.json()).catch(() => null)
    
    // 2. Execution Layer (Jupiter V6)
    let feeBps = 0;
    const TREASURY_WALLET = process.env.VITE_TREASURY_WALLET;
    
    // Applying fee based on token
    if (TREASURY_WALLET && inputMint !== outputMint) {
        feeBps = 100; // 1% platform fee for complex swaps
    }

    const quoteUrl = new URL('https://quote-api.jup.ag/v6/quote');
    quoteUrl.searchParams.append('inputMint', inputMint);
    quoteUrl.searchParams.append('outputMint', outputMint);
    quoteUrl.searchParams.append('amount', amount);
    quoteUrl.searchParams.append('slippageBps', slippageBps.toString());
    if (feeBps > 0) {
        quoteUrl.searchParams.append('platformFeeBps', feeBps.toString());
    }

    const quoteResponse = await fetch(quoteUrl.toString()).then((r) => r.json())

    if (quoteResponse.error) {
      return res.status(400).json({ error: quoteResponse.error })
    }

    // 3. Destination Routing
    const destinationPubkey = new PublicKey(destinationWallet)
    const outputMintPubkey = new PublicKey(outputMint)
    
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      outputMintPubkey,
      destinationPubkey,
      true // allowOwnerOffCurve
    )

    let feeAccount;
    if (feeBps > 0 && TREASURY_WALLET) {
        feeAccount = getAssociatedTokenAddressSync(
            outputMintPubkey,
            new PublicKey(TREASURY_WALLET),
            true
        )
    }

    // 4. Build Jupiter Swap Payload
    const swapRequestBody = {
      userPublicKey,
      quoteResponse,
      destinationTokenAccount: destinationTokenAccount.toBase58(),
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
      ...(feeAccount && { feeAccount: feeAccount.toBase58() })
    }

    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapRequestBody)
    }).then((r) => r.json())

    if (swapResponse.error) {
      return res.status(400).json({ error: swapResponse.error })
    }

    // 5. Return Serialized Transaction
    res.status(200).json({
      transaction: swapResponse.swapTransaction,
      quote: quoteResponse,
      dflowAnalytics: dflowQuoteResponse,
      executionMode: 'sync'
    })

  } catch (err: any) {
    console.error('Swap Generation Error:', err.message)
    res.status(500).json({ error: 'Transaction building failed' })
  }
}
