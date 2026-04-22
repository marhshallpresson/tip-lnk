import type { VercelRequest, VercelResponse } from "@vercel/node"
import { getSessionUser } from "../../_lib/session.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
    res.status(200).json({ success: true, user: sessionUser })
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Internal server error' })
  }
}
