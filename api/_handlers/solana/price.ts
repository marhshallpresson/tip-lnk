import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"

/**
 * Professional Price Proxy
 * Proxies Jupiter V2 Price API to bypass client-side CORS.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const ids = req.query.ids as string
  if (!ids) return res.status(400).json({ error: 'IDs parameter required' })

  try {
    const response = await axios.get(`https://api.jup.ag/price/v2?ids=${ids}`)
    
    // Forward the Jupiter response
    res.status(200).json(response.data)
  } catch (err: any) {
    console.error('🛡️ Price Proxy Fault:', err.message)
    res.status(500).json({ 
        error: 'Price Fetch Error', 
        message: 'Could not retrieve market prices.' 
    })
  }
}
