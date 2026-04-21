import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../_cors.js"
import { getPriorityFeeEstimate } from "../../backend/lib/helius.js"

/**
 * Task 2.2: Standalone Vercel Function for Priority Fee Estimation
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const { accounts } = req.query
  const accountList = typeof accounts === 'string' ? accounts.split(',') : []

  try {
    const fees = await getPriorityFeeEstimate(accountList)
    res.json({ success: true, fees })
  } catch (err) {
    console.error('Priority Fee Error:', err)
    res.status(500).json({ success: false, error: 'Failed to fetch priority fees.' })
  }
}
