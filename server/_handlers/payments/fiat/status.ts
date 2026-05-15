import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { db } from "../../../_lib/db.js"

/**
 * Fetches current status for a fiat payment intent.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const intentId = String(req.query.intentId || '')
  if (!intentId) {
    return res.status(400).json({ success: false, error: 'intentId is required' })
  }

  try {
    const intent = await db('fiat_payment_intents').where({ intent_id: intentId }).first()
    if (!intent) {
      return res.status(404).json({ success: false, error: 'Intent not found' })
    }

    const tipRecord = await db('tips').where({ signature: intentId }).first()
    const effectiveStatus = tipRecord ? 'completed' : (intent.status || 'requires_action')

    return res.json({
      success: true,
      intentId,
      status: effectiveStatus,
      completedAt: intent.completed_at || tipRecord?.timestamp || null
    })
  } catch (error: any) {
    console.error('Fiat status lookup failed:', error?.message || error)
    return res.status(500).json({ success: false, error: 'Failed to fetch fiat status' })
  }
}
