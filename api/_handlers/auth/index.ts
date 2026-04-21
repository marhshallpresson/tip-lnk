import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from '../_cors.js'

// Master Dispatcher for Hobby Plan Compliance (Limit: 12 Functions)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return

  // Extract the sub-route from the URL or a custom header
  // Path format: /api/auth/login -> subRoute: login
  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  
  // parts[0] is 'api', parts[1] is 'auth'
  const action = parts[2] 
  const subAction = parts[3]

  try {
    let module;
    
    if (action === 'google') {
        if (subAction === 'start') module = await import('./google/start.js')
        if (subAction === 'callback') module = await import('./google/callback.js')
    } else if (action === 'link-email') {
        if (subAction === 'start') module = await import('./link-email/start.js')
        if (subAction === 'verify') module = await import('./link-email/verify.ts')
    } else {
        // Direct actions: login, register, logout, me, exchange, etc.
        if (action === 'login') module = await import('./login.js')
        if (action === 'register') module = await import('./register.js')
        if (action === 'logout') module = await import('./logout.js')
        if (action === 'me') module = await import('./me.js')
        if (action === 'exchange') module = await import('./exchange.js')
        if (action === 'csrf') module = await import('./csrf.js')
        if (action === 'wallet-login') module = await import('./wallet-login.js')
        if (action === 'admin-login') module = await import('./admin-login.js')
        if (action === 'phantom-google-callback') module = await import('./phantom-google-callback.js')
    }

    if (module?.default) {
      return await module.default(req, res)
    }

    res.status(404).json({ error: `Auth action '${action}' not found` })
  } catch (err: any) {
    console.error(`🛡️ Dispatch Error [${action}]:`, err.message)
    res.status(500).json({ error: 'Internal Dispatch Error', details: err.message })
  }
}
