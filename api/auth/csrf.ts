import type { VercelRequest, VercelResponse } from "@vercel/node"
import { applyCors } from "../_cors.js"
import { ensureCsrfToken } from "../../backend/lib/csrf.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Shim res.cookie for Vercel compatibility with backend libs
  if (!(res as any).cookie) {
    (res as any).cookie = (name: string, value: string, options: any) => {
      let cookieStr = `${name}=${value}; Path=${options.path || '/'}`
      if (options.httpOnly) cookieStr += '; HttpOnly'
      if (options.secure) cookieStr += '; Secure'
      if (options.sameSite) cookieStr += `; SameSite=${options.sameSite}`
      if (options.maxAge) cookieStr += `; Max-Age=${Math.floor(options.maxAge / 1000)}`
      res.setHeader('Set-Cookie', cookieStr)
    }
  }

  try {
    const token = ensureCsrfToken(req as any, res as any)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ success: true, csrfToken: token })
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message })
  }
}
