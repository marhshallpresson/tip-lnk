import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../_cors.js"
import { db } from "../../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Admin Ledger
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const adminSecret = req.headers['x-admin-secret']
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Elite Admin Access Required' })
  }

  try {
    const ledger = await db('tips')
      .select('*')
      .orderBy('timestamp', 'desc')
      .limit(100)

    res.json({ success: true, ledger })
  } catch (error: any) {
    console.error('Admin Ledger Error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch global ledger.' })
  }
}
