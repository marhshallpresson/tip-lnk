import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../../_cors.js"
import { destroySession } from "../../_lib/session.js"
import { patchResponse } from "./_utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  patchResponse(res)

  try {
    await destroySession(req as any, res as any)
    res.status(200).json({ success: true })
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Logout failed' })
  }
}
