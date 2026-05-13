import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const intentId = String(req.query.intentId || '')
  if (!intentId) return res.status(400).json({ error: 'intentId required' })

  try {
    // 1. Check tips table first (indexed via webhook)
    const tip = await db('tips')
      .where({ signature: intentId }) // Fiat case
      .orWhere('message', 'like', `%${intentId}%`) // Crypto case (memo)
      .first()

    if (tip) {
      return res.json({ success: true, intentId, status: 'completed', signature: tip.signature })
    }

    // 2. Check fiat intents for pending state
    const fiatIntent = await db('fiat_payment_intents').where({ intent_id: intentId }).first()
    
    return res.json({ 
      success: true, 
      intentId, 
      status: fiatIntent?.status || 'pending' 
    })
  } catch (err: any) {
    console.error('Status check failed:', err.message)
    return res.status(500).json({ error: 'Status check failed' })
  }
}
