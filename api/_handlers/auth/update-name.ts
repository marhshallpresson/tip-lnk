import type { VercelRequest, VercelResponse } from "@vercel/node"
import { db } from "../../_lib/db.js"
import { getSessionUser } from "../../_lib/session.js"
import { patchResponse, normalizeName } from "./_utils.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  patchResponse(res)

  const user = await getSessionUser(req as any)
  if (!user) return res.status(401).json({ error: 'Session required' })

  const name = normalizeName(req.body?.name)
  if (!name || name.length < 2 || name.length > 100) {
    return res.status(400).json({ error: 'Invalid name. Must be between 2 and 100 characters.' })
  }

  try {
    await db('user').where({ id: user.id }).update({
      name,
      updated_at: new Date()
    })

    res.status(200).json({ success: true, message: 'Name updated successfully.' })
  } catch (err) {
    console.error('Update Name Fault:', err)
    res.status(500).json({ error: 'Failed to update name.' })
  }
}
