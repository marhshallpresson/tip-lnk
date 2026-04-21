import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from './_cors.js'
import { rateLimit } from './_ratelimit.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return

  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  
  // Root diagnostic
  if (parts.length <= 1) {
    return res.status(200).json({ 
        service: 'tiplnk-unified-api', 
        status: 'online', 
        timestamp: new Date().toISOString() 
    })
  }

  const moduleName = parts[1] // auth, solana, admin, etc.
  const action = parts[2]
  const subAction = parts[3]

  // Task 1.4: Critical Rate Limiting for Auth
  if (moduleName === 'auth' && (action === 'login' || action === 'register')) {
    if (!rateLimit(req, res)) return
  }

  try {
    let handlerModule;

    // High-speed dynamic dispatcher
    if (moduleName === 'auth') {
        if (action === 'google') {
            if (subAction === 'start') handlerModule = await import('./_handlers/auth/google/start.js')
            if (subAction === 'callback') handlerModule = await import('./_handlers/auth/google/callback.js')
        } else if (action === 'link-email') {
            if (subAction === 'start') handlerModule = await import('./_handlers/auth/link-email/start.js')
            if (subAction === 'verify') handlerModule = await import('./_handlers/auth/link-email/verify.js')
        } else {
            handlerModule = await import(`./_handlers/auth/${action}.js`)
        }
    } 
    
    else if (moduleName === 'solana') {
        if (action === 'dflow' && subAction === 'quote') {
            handlerModule = await import('./_handlers/solana/dflow/quote.js')
        } else if (action === 'profile') {
            handlerModule = await import(`./_handlers/solana/profile/${subAction}.js`)
        } else if (action === 'tips') {
            handlerModule = await import(`./_handlers/solana/tips/${subAction}.js`)
        } else if (action === 'webhooks' && subAction === 'helius') {
            handlerModule = await import('./_handlers/solana/webhooks/helius.js')
        } else {
            handlerModule = await import(`./_handlers/solana/${action}.js`)
        }
    }

    else if (moduleName === 'admin') {
        handlerModule = await import(`./_handlers/admin/${action}.js`)
    }

    else if (moduleName === 'social') {
        handlerModule = await import(`./_handlers/social/${action}.js`)
    }

    else if (moduleName === 'deep-link') {
        handlerModule = await import(`./_handlers/deep-link/${action}.js`)
    }

    else if (moduleName === 'payouts') {
        handlerModule = await import(`./_handlers/payouts/${action}.js`)
    }

    if (handlerModule?.default) {
      return await handlerModule.default(req, res)
    }

    res.status(404).json({ error: `Unified Route '/api/${moduleName}/${action}' not found` })
  } catch (err: any) {
    console.error(`🛡️ Unified Dispatch Error [${moduleName}/${action}]:`, err.message)
    res.status(500).json({ error: 'Internal Server Error', details: err.message })
  }
}
