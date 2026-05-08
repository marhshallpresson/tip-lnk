import type { VercelRequest, VercelResponse } from '@vercel/node'
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
    } else if (action === 'otp') {
        if (subAction === 'start') module = await import('./otp-start.js')
        if (subAction === 'verify') module = await import('./otp-verify.js')
    } else {
        if (action === 'login') module = await import('./login.js')
        if (action === 'register') module = await import('./register.js')
        if (action === 'logout') module = await import('./logout.js')
        if (action === 'me') module = await import('./me.js')
        if (action === 'exchange') module = await import('./exchange.js')
        if (action === 'csrf') module = await import('./csrf.js')
        if (action === 'wallet-login') module = await import('./wallet-login.js')
        if (action === 'admin-login') module = await import('./admin-login.js')
        if (action === 'reset-password-start') module = await import('./reset-password-start.js')
        if (action === 'reset-password-verify') module = await import('./reset-password-verify.js')
        if (action === 'dynamic-verify') module = await import('./dynamic-verify.js')
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
