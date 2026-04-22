import type { VercelRequest, VercelResponse } from '@vercel/node'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.url?.split('/').filter(Boolean)[2]
  try {
    let module;
    if (action === 'creators') module = await import('./creators.js')
    if (action === 'ledger') module = await import('./ledger.js')
    if (action === 'stats') module = await import('./stats.js')

    if (module?.default) return await module.default(req, res)
    res.status(404).json({ error: 'Admin action not found' })
  } catch (err: any) {
    res.status(500).json({ error: 'Admin Dispatch Error', details: err.message })
  }
}
