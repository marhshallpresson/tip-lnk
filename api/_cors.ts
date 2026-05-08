const ALLOWED_ORIGINS = [
  ...(process.env.CORS_ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || []),
  ...(process.env.NODE_ENV === 'production' ? ['https://tipstack.fun', 'https://www.tipstack.fun'] : []),
  ...(process.env.NODE_ENV === 'development' ? ['http://localhost:5173'] : [])
]

/**
 * Professional CORS Enforcement
 */
export function applyCors(req: any, res: any): boolean {
  const origin = req.headers.origin
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    res.status(403).json({ error: 'CORS: origin not allowed' })
    return false
  }

  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, Content-Encoding, Accept-Encoding, X-Accept-Blockchain-IDs, X-Accept-Action-Version')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  // Professional CSP Headers - prevents XSS and enforces security standards
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline' blob: https://app.dynamic.xyz https://*.dynamic.xyz https://*.dynamic-js.com https://*.dynamic-js.io https://*.dynamic.xyz https://*.dynamic-js.com https://*.dynamic-js.io https://dynamic-static-assets.com https://*.dynamic-static-assets.com https://dynamic-static-assets.com https://*.dynamicauth.com'sha256-w9Gn6hxxqmmYiSBD85TknzSe316/NXpWY53J0mhbBbQ='",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://*.dynamic.xyz https://*.dynamic-js.com https://*.dynamic-js.io https://*.helius-rpc.com https://*.dynamic.xyz https://*.dynamic-js.com https://*.dynamic-js.io https://dynamic-static-assets.com https://*.dynamic-static-assets.com https://dynamic-static-assets.com https://*.dynamicauth.com",
    "connect-src 'self' data: https://*.dynamic.xyz https://*.dynamic-js.com https://*.dynamic-js.io https://*.helius-rpc.com https://api.mainnet-beta.solana.com https://api.devnet.solana.com https://solana-mainnet.rpc.extnode.com https://api.torquemarketing.xyz https://api.fossapay.com https://api.pajcash.com https://api.dynamic.xyz wss://*.dynamic.xyz https://*.dynamic.xyz https://*.dynamic-js.com https://*.dynamic-js.io https://dynamic-static-assets.com https://*.dynamic-static-assets.com https://dynamic-static-assets.com https://*.dynamicauth.com",
    "frame-src 'self' https://app.dynamic.xyz https://*.dynamic-js.io https://*.dynamic.xyz https://*.dynamic-js.com https://*.dynamic-js.io https://dynamic-static-assets.com https://*.dynamic-static-assets.com https://dynamic-static-assets.com https://*.dynamicauth.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "upgrade-insecure-requests"
  ]

  res.setHeader('Content-Security-Policy', cspDirectives.join('; '))
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return false
  }
  return true
}
