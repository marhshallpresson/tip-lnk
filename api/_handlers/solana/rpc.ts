import type { VercelRequest, VercelResponse } from '@vercel/node'
import axios from 'axios'
import { applyCors } from '../../_cors.js'

/**
 * Elite Quicknode RPC Proxy
 * Protects API keys while providing high-performance Solana access.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Gateway handles CORS and Rate Limiting
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const QUICKNODE_RPC = process.env.VITE_SOLANA_RPC_URL
    if (!QUICKNODE_RPC) throw new Error('RPC Configuration missing')

    // Forward the JSON-RPC request to Quicknode
    const response = await axios.post(QUICKNODE_RPC, req.body, {
      headers: { 'Content-Type': 'application/json' }
    })

    res.status(200).json(response.data)
  } catch (err: any) {
    console.error('🛡️ RPC Proxy Fault:', err.message)
    res.status(500).json({ 
        error: 'RPC Error', 
        message: 'Could not communicate with Solana cluster.' 
    })
  }
}
