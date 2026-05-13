import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import axios from "axios"
import { getSessionUser } from "../../lib/session.js"

/**
 * Task 2.2: Standalone Vercel Function for Helius Smart Sender
 * SECURITY PATCH: Enforced authentication and payload validation.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  // SECURITY: Require an active session
  const authUser = await getSessionUser(req as any)
  if (!authUser) {
    return res.status(401).json({ error: 'Unauthorized: Session required to broadcast transactions' })
  }

  const { transaction } = req.body
  if (!transaction || typeof transaction !== 'string' || transaction.length > 5000) {
    return res.status(400).json({ error: 'Valid transaction base64 required' })
  }

  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY 
    
    const response = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      jsonrpc: '2.0',
      id: 'smart-send',
      method: 'sendTransaction',
      params: [transaction, { 
        skipPreflight: true, 
        maxRetries: 0,
        preflightCommitment: 'confirmed'
      }]
    })
    
    res.status(200).json(response.data)
  } catch (err: any) {
    console.error('Smart Sender Error:', err.response?.data || err.message)
    res.status(500).json({ error: 'Zero-Gas submission failed' })
  }
}
