import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import { applyCors } from '../../_cors.js'
import { validateSwapParams } from '../../../backend/lib/swap-validator.js'

/**
 * Task 3.2: Professional DFlow Quote Proxy with Hardened Validation
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { inputMint, outputMint, amount, userPublicKey } = req.query
  const slippageBps = parseInt(req.query.slippageBps as string) || 50

  try {
    const DFLOW_API_KEY = process.env.VITE_DFLOW_API_KEY
    
    // 1. Fetch quote from DFlow
    const response = await axios.get('https://quote-api.dflow.net/order', {
      params: {
        inputMint,
        outputMint,
        amount,
        slippageBps,
        userPublicKey
      },
      headers: DFLOW_API_KEY ? { 'x-api-key': DFLOW_API_KEY } : {}
    })
    
    const quoteData = response.data

    // 2. Task 3.2 Hardening: Validate params BEFORE returning to client
    validateSwapParams({
        inputAmount: amount as string,
        outputAmount: quoteData.outAmount,
        slippageBps: slippageBps,
        quotedAt: Date.now(),
        userPublicKey: userPublicKey as string
    })
    
    res.status(200).json(quoteData)
  } catch (err: any) {
    console.error('DFlow Proxy Error:', err.response?.data || err.message)
    res.status(err.response?.status || 500).json({ 
      error: err.message || 'DFlow Quote Failed', 
      details: err.response?.data 
    })
  }
}
