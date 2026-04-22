import type { VercelRequest, VercelResponse } from '@vercel/node'
import { applyCors } from './_cors.js'
import { rateLimit } from './_ratelimit.js'
import { verifyCsrfToken } from './_lib/csrf.js'

// Import Handlers
import { default as authMe } from './_handlers/auth/me.js'
import { default as authLogin } from './_handlers/auth/login.js'
import { default as authRegister } from './_handlers/auth/register.js'
import { default as authLogout } from './_handlers/auth/logout.js'
import { default as authCsrf } from './_handlers/auth/csrf.js'
import { default as authWalletLogin } from './_handlers/auth/wallet-login.js'
import { default as authAdminLogin } from './_handlers/auth/admin-login.js'
import { default as authExchange } from './_handlers/auth/exchange.js'
import { default as authGoogleStart } from './_handlers/auth/google/start.js'
import { default as authGoogleCallback } from './_handlers/auth/google/callback.js'
import { default as authLinkEmailStart } from './_handlers/auth/link-email/start.js'
import { default as authLinkEmailVerify } from './_handlers/auth/link-email/verify.js'

import { default as solanaProfile } from './_handlers/solana/index.js'
import { default as solanaProfileGet } from './_handlers/solana/profile/get.js'
import { default as solanaProfileUpdate } from './_handlers/solana/profile/update.js'
import { default as solanaAssets } from './_handlers/solana/assets.js'
import { default as solanaSend } from './_handlers/solana/send.js'
import { default as solanaSendSmart } from './_handlers/solana/send-smart.js'
import { default as solanaPriorityFee } from './_handlers/solana/priority-fee.js'
import { default as solanaSnsCheck } from './_handlers/solana/sns-check.js'
import { default as solanaTipsGet } from './_handlers/solana/tips/get.js'
import { default as solanaTipsLog } from './_handlers/solana/tips/log.js'
import { default as solanaWebhookHelius } from './_handlers/solana/webhooks/helius.js'
import { default as solanaDflowQuote } from './_handlers/solana/dflow/quote.js'
import { default as solanaBirdeyePortfolio } from './_handlers/solana/birdeye/portfolio.js'

import { default as payoutsWebhook } from './_handlers/payouts/webhook.js'
import { default as payoutsHistory } from './_handlers/payouts/history.js'
import { default as payoutsWithdraw } from './_handlers/payouts/withdraw.js'

import { default as adminStats } from './_handlers/admin/stats.js'
import { default as adminCreators } from './_handlers/admin/creators.js'
import { default as adminLedger } from './_handlers/admin/ledger.js'

// Route Registry
const ROUTES: Record<string, Function> = {
  // Auth
  'auth/me': authMe,
  'auth/login': authLogin,
  'auth/register': authRegister,
  'auth/logout': authLogout,
  'auth/csrf': authCsrf,
  'auth/wallet-login': authWalletLogin,
  'auth/admin-login': authAdminLogin,
  'auth/exchange': authExchange,
  'auth/google/start': authGoogleStart,
  'auth/google/callback': authGoogleCallback,
  'auth/link-email/start': authLinkEmailStart,
  'auth/link-email/verify': authLinkEmailVerify,

  // Solana
  'solana/profile': solanaProfile,
  'solana/profile/get': solanaProfileGet,
  'solana/profile/update': solanaProfileUpdate,
  'solana/assets': solanaAssets,
  'solana/send': solanaSend,
  'solana/send-smart': solanaSendSmart,
  'solana/priority-fee': solanaPriorityFee,
  'solana/sns-check': solanaSnsCheck,
  'solana/tips/get': solanaTipsGet,
  'solana/tips/log': solanaTipsLog,
  'solana/webhooks/helius': solanaWebhookHelius,
  'solana/dflow/quote': solanaDflowQuote,
  'solana/birdeye/portfolio': solanaBirdeyePortfolio,

  // Payouts
  'payouts/webhook': payoutsWebhook,
  'payouts/history': payoutsHistory,
  'payouts/withdraw': payoutsWithdraw,

  // Admin
  'admin/stats': adminStats,
  'admin/creators': adminCreators,
  'admin/ledger': adminLedger,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return

  const path = req.url?.split('?')[0] || ''
  const parts = path.split('/').filter(Boolean)
  
  // Base health check
  if (parts.length <= 1) {
    return res.status(200).json({ service: 'tiplnk-unified-api', status: 'online' })
  }

  const moduleName = parts[1]
  const action = parts[2]
  const subAction = parts[3]

  // Construct route key
  let routeKey = `${moduleName}/${action}`
  if (subAction) routeKey += `/${subAction}`

  // ─── ELITE GATEWAY SECURITY ───
  // Apply Ratelimit for sensitive modules
  const sensitiveModules = ['auth', 'payouts'];
  const sensitiveActions = ['update']; // e.g., solana/profile/update
  
  if (sensitiveModules.includes(moduleName) || sensitiveActions.includes(action)) {
    if (!rateLimit(req, res)) return
  }

  // ─── ELITE CSRF ENFORCEMENT ───
  const isMutation = ['POST', 'PUT', 'DELETE'].includes(req.method || '')
  const bypassCsrf = ['auth/csrf', 'payouts/webhook', 'solana/webhooks/helius'].includes(routeKey)
  
  if (isMutation && !bypassCsrf) {
    if (!verifyCsrfToken(req as any)) {
      console.warn(`🛡️ CSRF: Blocked potential attack on [${routeKey}] from ${req.headers['origin']}`)
      return res.status(403).json({ error: 'Security Breach', message: 'Invalid CSRF token.' })
    }
  }

  // ─── PERFORMANCE: CACHE CONTROL ───
  if (req.method === 'GET') {
    // Shared cache for 60s, client cache for 10s
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=30')
  }

  try {
    const handlerFunc = ROUTES[routeKey]

    if (typeof handlerFunc === 'function') {
      return await handlerFunc(req, res)
    }

    res.status(404).json({ error: `Route not found: ${routeKey}` })
  } catch (err: any) {
    // ─── ERROR MASKING (Anti-Information Leakage) ───
    console.error(`🛡️ Critical Dispatch Error [${routeKey}]:`, err.message)
    res.status(500).json({ 
        error: 'Internal Server Error', 
        message: 'An unexpected error occurred. Please try again later.' 
    })
  }
}
