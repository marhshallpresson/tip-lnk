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
    const JUP_API_KEY = process.env.JUPITER_API_KEY
    const response = await axios.get(`https://api.jup.ag/price/v3?ids=${ids}`, {
      headers: JUP_API_KEY ? { 'x-api-key': JUP_API_KEY } : {}
    })
    
    res.status(200).json(response.data)
  } catch (err: any) {
    console.error('🛡️ Price Proxy Fault:', err.response?.status, err.message)
    res.status(err.response?.status || 500).json({ 
        error: 'Price Fetch Error', 
        message: 'Could not retrieve market prices.',
        details: err.response?.data
    })
  }
}
