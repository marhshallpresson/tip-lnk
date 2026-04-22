import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"
/**
 * Task 2.2: Standalone Vercel Function for Helius Smart Sender
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { transaction } = req.body
  if (!transaction) return res.status(400).json({ error: 'Transaction required' })

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
