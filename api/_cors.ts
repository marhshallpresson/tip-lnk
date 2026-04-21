const ALLOWED_ORIGINS = [
  ...(process.env.CORS_ALLOWED_ORIGINS?.split(',').map(s => s.trim()).filter(Boolean) || []),
  ...(process.env.NODE_ENV === 'production' ? ['https://tiplnk.me', 'https://www.tiplnk.me'] : []),
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

  // Allow requests with no origin (like same-origin or server-to-server)
  res.setHeader('Access-Control-Allow-Origin', origin || '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token')
  res.setHeader('Access-Control-Allow-Credentials', 'true')

  if (req.method === 'OPTIONS') {
    res.status(204).end()
    return false
  }
  return true
}
