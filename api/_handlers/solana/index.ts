import type { VercelRequest, VercelResponse } from '@vercel/node'
// Master Dispatcher for Solana Logic (Compliance with 12-function limit)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  
  // parts: ['api', 'solana', 'action', ...]
  const action = parts[2]
  const subAction = parts[3]

  try {
    let module;

    if (action === 'dflow' && subAction === 'quote') {
        module = await import('./dflow/quote.js')
    } else if (action === 'profile') {
        if (subAction === 'get') module = await import('./profile/get.js')
        if (subAction === 'update') module = await import('./profile/update.js')
    } else if (action === 'tips') {
        if (subAction === 'get') module = await import('./tips/get.js')
        if (subAction === 'log') module = await import('./tips/log.js')
    } else if (action === 'webhooks' && subAction === 'helius') {
        module = await import('./webhooks/helius.js')
    } else {
        if (action === 'sns-check') module = await import('./sns-check.js')
        if (action === 'send') module = await import('./send.js')
        if (action === 'send-smart') module = await import('./send-smart.js')
        if (action === 'backfill') module = await import('./backfill.js')
        if (action === 'priority-fee') module = await import('./priority-fee.js')
        if (action === 'assets') module = await import('./assets.js')
        if (action === 'diagnostic-check') module = await import('./diagnostic-check.js')
    }

    if (module?.default) {
      return await module.default(req, res)
    }

    res.status(404).json({ error: `Solana action '${action}' not found` })
  } catch (err: any) {
    console.error(`🛡️ Solana Dispatch Error [${action}]:`, err.message)
    res.status(500).json({ error: 'Internal Dispatch Error', details: err.message })
  }
}
