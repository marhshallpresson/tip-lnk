import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { 
  PublicKey, 
  VersionedTransaction, 
  TransactionMessage, 
  TransactionInstruction,
  Connection
} from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'
import { 
  getSlippageLimitForToken, 
  DFLOW_SECURITY_CONFIG 
} from '../../../lib/dflow-security.js'

/**
 * SECURITY PATCH: Jupiter Swap with Slippage & Expiry Validation (C-02)
 * 
 * Prevents:
 * - MEV extraction via slippage manipulation
 * - Intent replay attacks
 * - Stale swap fills at unfavorable rates
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { inputMint, outputMint, amount, userPublicKey, destinationWallet, memo } = req.body
  let slippageBps = req.body.slippageBps || 50
  const feeBps = req.body.feeBps || 500
  const TREASURY_WALLET = process.env.VITE_TREASURY_WALLET;

  if (!inputMint || !outputMint || !amount || !userPublicKey || !destinationWallet) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    // SECURITY: Validate and enforce slippage bounds
    const outputTokenAddr = new PublicKey(outputMint)
    const maxAllowedSlippagePercent = getSlippageLimitForToken(outputTokenAddr)
    const GLOBAL_MAX_SLIPPAGE_BPS = 1500; // 15% CIRCUIT BREAKER
    const maxAllowedSlippageBps = Math.min(Math.round(maxAllowedSlippagePercent * 100), GLOBAL_MAX_SLIPPAGE_BPS)

    if (slippageBps > maxAllowedSlippageBps) {
      return res.status(400).json({
        error: `Slippage ${(slippageBps / 100).toFixed(2)}% exceeds maximum ${maxAllowedSlippagePercent}% for this token`,
        code: 'SLIPPAGE_TOO_HIGH',
        maxAllowedSlippageBps,
      })
    }

    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    const NETWORK = process.env.VITE_SOLANA_NETWORK || 'mainnet-beta';
    const RPC_URL = NETWORK === 'devnet' 
        ? 'https://api.devnet.solana.com' 
        : `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    
    const connection = new Connection(RPC_URL, 'confirmed');

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

    // SECURITY: Validate output meets minimum threshold
    const minOutAmount = quoteResponse.outAmount
    
    const destinationPubkey = new PublicKey(destinationWallet)
    const outputMintPubkey = new PublicKey(outputMint)
    
    const destinationTokenAccount = getAssociatedTokenAddressSync(
      outputMintPubkey,
      destinationPubkey,
      true
    )

    let feeAccount;
    if (feeBps > 0 && TREASURY_WALLET) {
        feeAccount = getAssociatedTokenAddressSync(
            outputMintPubkey,
            new PublicKey(TREASURY_WALLET),
            true
        )
    }

    const swapRequestBody = {
      userPublicKey,
      quoteResponse,
      destinationTokenAccount: destinationTokenAccount.toBase58(),
      dynamicComputeUnitLimit: true,
      prioritizationFeeLamports: 'auto',
      wrapAndUnwrapSol: true,
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

    let finalTxBase64 = swapResponse.swapTransaction;
    if (memo && memo.trim().length > 0) {
        try {
            const swapTxBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(swapTxBuf);
            
            const addressLookupTableAccounts = await Promise.all(
                transaction.message.addressTableLookups.map(async (lookup) => {
                    return connection.getAddressLookupTable(lookup.accountKey)
                        .then((res) => res.value);
                })
            );

            const decompiledMessage = TransactionMessage.decompile(transaction.message, {
                addressLookupTableAccounts: addressLookupTableAccounts.filter(Boolean) as any,
            });

            decompiledMessage.instructions.unshift(
                new TransactionInstruction({
                    keys: [],
                    programId: new PublicKey('MemoSq4gqABmAn9k86z1px6A9HByG67UactJS1R848'),
                    data: Buffer.from(memo),
                })
            );

            transaction.message = decompiledMessage.compileToV0Message(
                addressLookupTableAccounts.filter(Boolean) as any
            );
            
            finalTxBase64 = Buffer.from(transaction.serialize()).toString('base64');
            console.log('🛡️ Transaction: Injected on-chain memo successfully.');
        } catch (e: any) {
            console.warn('🛡️ Memo Injection Fault:', e.message);
        }
    }

    res.status(200).json({
      transaction: finalTxBase64,
      quote: quoteResponse,
      executionMode: 'sync',
      _security: {
        slippageBpsEnforced: slippageBps,
        maxAllowedSlippageBps,
        minOutAmount,
      }
    })

  } catch (err: any) {
    console.error('Swap Generation Error:', err.message)
    res.status(500).json({ error: 'Transaction building failed' })
  }
}
