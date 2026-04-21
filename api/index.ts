import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from './_cors.js'
import { rateLimit } from './_ratelimit.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return

  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  
  if (parts.length <= 1) {
    return res.status(200).json({ service: 'tiplnk-unified-api', status: 'online' })
  }

  const moduleName = parts[1]
  const action = parts[2]
  const subAction = parts[3]

  if (moduleName === 'auth' && (action === 'login' || action === 'register')) {
    if (!rateLimit(req, res)) return
  }

  try {
    let handler;
    // Map paths directly to the files in _handlers/
    if (moduleName === 'auth') {
        if (action === 'google') {
            handler = await import(`./_handlers/auth/google/${subAction}.js`)
        } else if (action === 'link-email') {
            handler = await import(`./_handlers/auth/link-email/${subAction}.js`)
        } else {
            handler = await import(`./_handlers/auth/${action}.js`)
        }
    } else if (moduleName === 'solana') {
        if (action === 'dflow') {
            handler = await import(`./_handlers/solana/dflow/${subAction}.js`)
        } else if (action === 'profile' || action === 'tips' || action === 'webhooks') {
            handler = await import(`./_handlers/solana/${action}/${subAction}.js`)
        } else {
            handler = await import(`./_handlers/solana/${action}.js`)
        }
    } else {
        handler = await import(`./_handlers/${moduleName}/${action}.js`)
    }

    if (handler?.default) return await handler.default(req, res)
    res.status(404).json({ error: 'Route not found' })
  } catch (err: any) {
    console.error('Dispatch Error:', err.message)
    res.status(500).json({ error: 'Internal Error', details: err.message })
  }
}
