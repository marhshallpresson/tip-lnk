import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from './_cors.js'
import { rateLimit } from './_ratelimit.js'

/**
 * ELITE MASTER ROUTER (Hobby Plan Compliance: 1 Function)
 * This is the ONLY serverless function seen by Vercel.
 * It dynamically dispatches to modules in backend/api/
 */
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

  const module = parts[1] // auth, solana, admin, etc.
  const action = parts[2]
  const subAction = parts[3]

  // Task 1.4: Critical Rate Limiting for Auth
  if (module === 'auth' && (action === 'login' || action === 'register')) {
    if (!rateLimit(req, res)) return
  }

  try {
    let handlerModule;

    // High-speed dynamic dispatcher
    if (module === 'auth') {
        if (action === 'google') {
            if (subAction === 'start') handlerModule = await import('../backend/api/auth/google/start.js')
            if (subAction === 'callback') handlerModule = await import('../backend/api/auth/google/callback.js')
        } else if (action === 'link-email') {
            if (subAction === 'start') handlerModule = await import('../backend/api/auth/link-email/start.js')
            if (subAction === 'verify') handlerModule = await import('../backend/api/auth/link-email/verify.js')
        } else {
            handlerModule = await import(`../backend/api/auth/${action}.js`)
        }
    } 
    
    else if (module === 'solana') {
        if (action === 'dflow' && subAction === 'quote') {
            handlerModule = await import('../backend/api/solana/dflow/quote.js')
        } else if (action === 'profile') {
            handlerModule = await import(`../backend/api/solana/profile/${subAction}.js`)
        } else if (action === 'tips') {
            handlerModule = await import(`../backend/api/solana/tips/${subAction}.js`)
        } else if (action === 'webhooks' && subAction === 'helius') {
            handlerModule = await import('../backend/api/solana/webhooks/helius.js')
        } else {
            handlerModule = await import(`../backend/api/solana/${action}.js`)
        }
    }

    else if (module === 'admin') {
        handlerModule = await import(`../backend/api/admin/${action}.js`)
    }

    else if (module === 'social') {
        handlerModule = await import(`../backend/api/social/${action}.js`)
    }

    else if (module === 'deep-link') {
        handlerModule = await import(`../backend/api/deep-link/${action}.js`)
    }

    else if (module === 'payouts') {
        handlerModule = await import(`../backend/api/payouts/${action}.js`)
    }

    if (handlerModule?.default) {
      return await handlerModule.default(req, res)
    }

    res.status(404).json({ error: `Unified Route '/api/${module}/${action}' not found` })
  } catch (err: any) {
    console.error(`🛡️ Unified Dispatch Error [${module}/${action}]:`, err.message)
    res.status(500).json({ error: 'Internal Server Error', details: err.message })
  }
}
