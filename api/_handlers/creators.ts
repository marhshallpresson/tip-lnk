import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../_lib/db.js"

/**
 * Task 2.2: Standalone Vercel Function for Admin Creator Management
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const adminSecret = req.headers['x-admin-secret']
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Elite Admin Access Required' })
  }

  try {
    const creators = await db('user')
      .select('id', 'email', 'name', 'walletAddress', 'twitterHandle', 'discordHandle', 'created_at', 'lastLoginAt')
      .orderBy('created_at', 'desc')
      .limit(100)

    res.json({ success: true, creators })
  } catch (error: any) {
    console.error('Admin Creators Error:', error)
    res.status(500).json({ success: false, error: 'Failed to fetch creators list.' })
  }
}
