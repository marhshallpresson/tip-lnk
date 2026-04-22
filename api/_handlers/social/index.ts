import type { VercelRequest, VercelResponse } from '@vercel/node'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const action = req.url?.split('/').filter(Boolean)[2]
  try {
    let module;
    if (action === 'x-posts') module = await import('./x-posts.js')

    if (module?.default) return await module.default(req, res)
    res.status(404).json({ error: 'Social action not found' })
  } catch (err: any) {
    res.status(500).json({ error: 'Social Dispatch Error', details: err.message })
  }
}
