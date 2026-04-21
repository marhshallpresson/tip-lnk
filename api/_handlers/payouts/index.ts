import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from '../../_cors.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  const action = req.url?.split('/').filter(Boolean)[2]
  try {
    let module;
    if (action === 'webhook') module = await import('./webhook.js')

    if (module?.default) return await module.default(req, res)
    res.status(404).json({ error: 'Payouts action not found' })
  } catch (err: any) {
    res.status(500).json({ error: 'Payouts Dispatch Error', details: err.message })
  }
}
