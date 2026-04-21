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
    const routeKey = `${moduleName}${action ? '/' + action : ''}${subAction ? '/' + subAction : ''}`;
    let handlerModule;

    switch (routeKey) {
        // Auth Module
        case 'auth/login': handlerModule = await import('./_handlers/auth/login.js'); break;
        case 'auth/register': handlerModule = await import('./_handlers/auth/register.js'); break;
        case 'auth/logout': handlerModule = await import('./_handlers/auth/logout.js'); break;
        case 'auth/me': handlerModule = await import('./_handlers/auth/me.js'); break;
        case 'auth/csrf': handlerModule = await import('./_handlers/auth/csrf.js'); break;
        case 'auth/wallet-login': handlerModule = await import('./_handlers/auth/wallet-login.js'); break;
        case 'auth/exchange': handlerModule = await import('./_handlers/auth/exchange.js'); break;
        case 'auth/admin-login': handlerModule = await import('./_handlers/auth/admin-login.js'); break;
        case 'auth/google/start': handlerModule = await import('./_handlers/auth/google/start.js'); break;
        case 'auth/google/callback': handlerModule = await import('./_handlers/auth/google/callback.js'); break;
        case 'auth/link-email/start': handlerModule = await import('./_handlers/auth/link-email/start.js'); break;
        case 'auth/link-email/verify': handlerModule = await import('./_handlers/auth/link-email/verify.js'); break;
        case 'auth/phantom-google-callback': handlerModule = await import('./_handlers/auth/phantom-google-callback.js'); break;
        
        // Solana Module
        case 'solana/priority-fee': handlerModule = await import('./_handlers/solana/priority-fee.js'); break;
        case 'solana/assets': handlerModule = await import('./_handlers/solana/assets.js'); break;
        case 'solana/send': handlerModule = await import('./_handlers/solana/send.js'); break;
        case 'solana/send-smart': handlerModule = await import('./_handlers/solana/send-smart.js'); break;
        case 'solana/sns-check': handlerModule = await import('./_handlers/solana/sns-check.js'); break;
        case 'solana/backfill': handlerModule = await import('./_handlers/solana/backfill.js'); break;
        case 'solana/diagnostic-check': handlerModule = await import('./_handlers/solana/diagnostic-check.js'); break;
        case 'solana/profile/get': handlerModule = await import('./_handlers/solana/profile/get.js'); break;
        case 'solana/profile/update': handlerModule = await import('./_handlers/solana/profile/update.js'); break;
        case 'solana/tips/get': handlerModule = await import('./_handlers/solana/tips/get.js'); break;
        case 'solana/tips/log': handlerModule = await import('./_handlers/solana/tips/log.js'); break;
        case 'solana/dflow/quote': handlerModule = await import('./_handlers/solana/dflow/quote.js'); break;
        case 'solana/webhooks/helius': handlerModule = await import('./_handlers/solana/webhooks/helius.js'); break;

        // Admin Module
        case 'admin/stats': handlerModule = await import('./_handlers/admin/stats.js'); break;
        case 'admin/ledger': handlerModule = await import('./_handlers/admin/ledger.js'); break;
        case 'admin/creators': handlerModule = await import('./_handlers/admin/creators.js'); break;

        // Social Module
        case 'social/x-posts': handlerModule = await import('./_handlers/social/x-posts.js'); break;

        // Deep Link Module
        case 'deep-link/resolve': handlerModule = await import('./_handlers/deep-link/resolve.js'); break;
        case 'deep-link/link-social': handlerModule = await import('./_handlers/deep-link/link-social.js'); break;

        // Payouts Module
        case 'payouts/webhook': handlerModule = await import('./_handlers/payouts/webhook.js'); break;

        default:
            return res.status(404).json({ error: `Unified Route '/api/${routeKey}' not found` });
    }

    if (handlerModule?.default) {
      return await handlerModule.default(req, res)
    }

    res.status(404).json({ error: `Unified Route '/api/${routeKey}' handler export default not found` })
  } catch (err: any) {
    console.error(`🛡️ Unified Dispatch Error [${moduleName}/${action}]:`, err.message)
    res.status(500).json({ error: 'Internal Server Error', details: err.message })
  }
}
