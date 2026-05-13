import type { Request as VercelRequest, Response as VercelResponse } from 'express'
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  const action = parts[2]
  const subAction = parts[3]

  try {
    let module;
    if (action === 'twitter') {
        if (subAction === 'callback') module = await import('./twitter/callback.js')
    } else if (action === 'discord') {
        if (subAction === 'callback') module = await import('./discord/callback.js')
    } else if (action === 'link-email') {
        if (subAction === 'start') module = await import('./link-email/start.js')
        if (subAction === 'verify') module = await import('./link-email/verify.js')
    } else {
        if (action === 'logout') module = await import('./logout.js')
        if (action === 'me') module = await import('./me.js')
        if (action === 'exchange') module = await import('./exchange.js')
        if (action === 'csrf') module = await import('./csrf.js')
        if (action === 'admin-login') module = await import('./admin-login.js')
        if (action === 'dynamic-verify') module = await import('./dynamic-verify.js')
        if (action === 'update-name') module = await import('./update-name.js')
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
