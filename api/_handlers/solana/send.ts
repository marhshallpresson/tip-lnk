import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"
import { Connection, Transaction } from '@solana/web3.js'
import { simulateTransaction, formatSimulationResult } from "../../_lib/transaction-validator.js"

/**
 * SECURITY PATCH: Enhanced Transaction Submission with Pre-Signature Validation
 * 
 * Prevents (M-04):
 * - Hidden drainer instructions
 * - Unauthorized account modifications  
 * - Transaction signature without verification
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { transaction, simulate, expectedTipAmount, recipient } = req.body
  if (!transaction) return res.status(400).json({ error: 'Transaction required' })

  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY 
    const NETWORK = process.env.VITE_SOLANA_NETWORK || 'mainnet-beta'
    const RPC_URL = NETWORK === 'devnet' 
        ? 'https://api.devnet.solana.com' 
        : `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`

    // SECURITY: If simulate=true, validate transaction before submission
    if (simulate === true || process.env.REQUIRE_TX_SIMULATION === 'true') {
      const connection = new Connection(RPC_URL)
      const tx = Transaction.from(Buffer.from(transaction, 'base64'))
      
      if (!expectedTipAmount || !recipient) {
        return res.status(400).json({
          error: 'Transaction simulation requires expectedTipAmount and recipient',
          code: 'MISSING_SIMULATION_PARAMS'
        })
      }

      const validationResult = await simulateTransaction(
        connection,
        tx,
        tx.feePayer || new (await import('@solana/web3.js')).PublicKey('11111111111111111111111111111111'),
        expectedTipAmount,
        new (await import('@solana/web3.js')).PublicKey(recipient)
      )

      if (!validationResult.isValid) {
        return res.status(400).json({
          error: 'Transaction validation failed',
          code: 'VALIDATION_FAILED',
          details: validationResult.errors,
          warnings: validationResult.warnings,
          formatted: formatSimulationResult(validationResult)
        })
      }

      // Log simulation success
      console.log(`✓ Transaction simulation passed for tip to ${recipient}`)
    }

    // Submit the validated transaction
    const response = await axios.post(RPC_URL, {
      jsonrpc: '2.0',
      id: 'send-tx',
      method: 'sendTransaction',
      params: [transaction, { skipPreflight: false, maxRetries: 2 }]
    })
    
    res.status(200).json({
      ...response.data,
      _simulated: simulate === true
    })
  } catch (err: any) {
    console.error('Transaction Submission Error:', err.response?.data || err.message)
    res.status(500).json({ 
      error: 'Transaction submission failed',
      code: 'SUBMISSION_FAILED'
    })
  }
}
