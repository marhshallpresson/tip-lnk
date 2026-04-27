import type { VercelRequest, VercelResponse } from '@vercel/node'
import { 
  PublicKey, 
  VersionedTransaction, 
  TransactionMessage, 
  TransactionInstruction,
  Connection
} from '@solana/web3.js'
import { getAssociatedTokenAddressSync } from '@solana/spl-token'

/**
 * PHASE 4: TRANSACTION PIPELINE (ENFORCED)
 * - Constructs Jupiter swap with exact destination routing
 * - Injects on-chain Memo for supporter messages
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { inputMint, outputMint, amount, userPublicKey, destinationWallet, memo } = req.body
  const slippageBps = req.body.slippageBps || 50

  if (!inputMint || !outputMint || !amount || !userPublicKey || !destinationWallet) {
    return res.status(400).json({ error: 'Missing required parameters' })
  }

  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    const NETWORK = process.env.VITE_SOLANA_NETWORK || 'mainnet-beta';
    const RPC_URL = NETWORK === 'devnet' 
        ? 'https://api.devnet.solana.com' 
        : `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;
    
    const connection = new Connection(RPC_URL, 'confirmed');

    // 1. Quote Intelligence (DFlow pre-routing analytics)
    const dflowQuoteResponse = await fetch(
      `https://quote-api.dflow.net/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`
    ).then((r) => r.json()).catch(() => null)
    
    // 2. Execution Layer (Jupiter V6)
    const isDirect = inputMint === outputMint;
    let feeBps = isDirect ? 0 : 500; // 0% direct, 5% swap
    const TREASURY_WALLET = process.env.VITE_TREASURY_WALLET;
    
    if (!TREASURY_WALLET) feeBps = 0;

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

    // ─── ELITE MEMO INJECTION ───
    let finalTxBase64 = swapResponse.swapTransaction;
    if (memo && memo.trim().length > 0) {
        try {
            const swapTxBuf = Buffer.from(swapResponse.swapTransaction, 'base64');
            const transaction = VersionedTransaction.deserialize(swapTxBuf);
            
            // Fetch LUT accounts referenced in the transaction
            const addressLookupTableAccounts = await Promise.all(
                transaction.message.addressTableLookups.map(async (lookup) => {
                    return connection.getAddressLookupTable(lookup.accountKey)
                        .then((res) => res.value);
                })
            );

            // Decompile the message into instructions
            const decompiledMessage = TransactionMessage.decompile(transaction.message, {
                addressLookupTableAccounts: addressLookupTableAccounts.filter(Boolean) as any,
            });

            // Prepend Memo Instruction
            decompiledMessage.instructions.unshift(
                new TransactionInstruction({
                    keys: [],
                    programId: new PublicKey('MemoSq4gqABmAn9k86z1px6A9HByG67UactJS1R848'),
                    data: Buffer.from(memo),
                })
            );

            // Re-compile
            transaction.message = decompiledMessage.compileToV0Message(
                addressLookupTableAccounts.filter(Boolean) as any
            );
            
            finalTxBase64 = Buffer.from(transaction.serialize()).toString('base64');
            console.log('🛡️ Transaction: Injected on-chain memo successfully.');
        } catch (e: any) {
            console.warn('🛡️ Memo Injection Fault:', e.message);
        }
    }

    // 5. Return Serialized Transaction
    res.status(200).json({
      transaction: finalTxBase64,
      quote: quoteResponse,
      dflowAnalytics: dflowQuoteResponse,
      executionMode: 'sync'
    })

  } catch (err: any) {
    console.error('Swap Generation Error:', err.message)
    res.status(500).json({ error: 'Transaction building failed' })
  }
}
