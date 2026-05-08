import type { VercelRequest, VercelResponse } from '@vercel/node'
import { NIGERIAN_BANKS } from '../../_lib/nigeria-banks.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })
  return res.status(200).json({ success: true, banks: NIGERIAN_BANKS })
}
