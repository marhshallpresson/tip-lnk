import type { VercelRequest, VercelResponse } from '@vercel/node'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.url?.split('/').filter(Boolean)[2]
  try {
    let module;
    if (action === 'link-social') module = await import('./link-social.js')
    if (action === 'resolve') module = await import('./resolve.js')

    if (module?.default) return await module.default(req, res)
    res.status(404).json({ error: 'Deep-link action not found' })
  } catch (err: any) {
    res.status(500).json({ error: 'Deep-link Dispatch Error', details: err.message })
  }
}
