import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../_lib/db.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const intentId = String(req.query.intentId || '')
  if (!intentId) return res.status(400).json({ error: 'intentId required' })

  try {
    console.log(`[StatusCheck] Checking intent: ${intentId}`);
    
    // 1. Check tips table first (indexed via webhook)
    let tip = null;
    try {
      tip = await db('tips')
        .where({ signature: intentId }) // Fiat case
        .orWhere('message', 'like', `%${intentId}%`) // Crypto case (memo)
        .first()
    } catch (dbErr: any) {
      console.warn(`[StatusCheck] Tips table query failed (normal if not yet created): ${dbErr.message}`);
    }

    if (tip) {
      console.log(`[StatusCheck] Tip found for intent ${intentId}: status=${tip.status}`);
      return res.json({ success: true, intentId, status: 'completed', signature: tip.signature })
    }

    // 2. Check fiat intents for pending state
    let fiatIntent = null;
    try {
      fiatIntent = await db('fiat_payment_intents').where({ intent_id: intentId }).first()
    } catch (dbErr: any) {
      console.warn(`[StatusCheck] Fiat intents query failed: ${dbErr.message}`);
    }
    
    const status = fiatIntent?.status || 'pending';
    console.log(`[StatusCheck] Status for ${intentId}: ${status}`);

    return res.json({ 
      success: true, 
      intentId, 
      status: status
    })
  } catch (err: any) {
    console.error('[StatusCheck] CRITICAL FAULT:', err.message, err.stack)
    return res.status(500).json({ 
      success: false, 
      error: 'Status check failed', 
      details: err.message,
      intentId 
    })
  }
}
