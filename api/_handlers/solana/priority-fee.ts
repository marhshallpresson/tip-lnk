import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import { applyCors } from '../../_cors.js'

/**
 * Task 3.5: Elite Quicknode Priority Fee Intelligence
 * Uses Quicknode's Priority Fee API to ensure "survivability" during high congestion.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return

  try {
    const QUICKNODE_RPC = process.env.VITE_SOLANA_RPC_URL
    
    // ─── ELITE QUICKNODE INTEGRATION ───
    // Direct call to qn_estimatePriorityFees
    const response = await axios.post(QUICKNODE_RPC, {
      jsonrpc: '2.0',
      id: 1,
      method: 'qn_estimatePriorityFees',
      params: {
        last_n_blocks: 100,
        account: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', // USDC focus
        api_version: 2
      }
    })

    const fees = response.data?.result || {}
    
    // Extract a "Safe but Fast" fee level (e.g., 75th percentile)
    const recommendedFee = fees.per_percentile?.['75'] || fees.medium || 1000

    res.status(200).json({ 
      success: true, 
      recommendedFee,
      levels: fees.per_percentile,
      provider: 'Quicknode'
    })
  } catch (err: any) {
    console.warn('🛡️ Quicknode: Falling back to static high-performance priority fee')
    res.status(200).json({ 
      success: true, 
      recommendedFee: 5000, 
      isFallback: true 
    })
  }
}
