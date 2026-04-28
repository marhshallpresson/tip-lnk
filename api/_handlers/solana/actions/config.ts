import type { VercelRequest, VercelResponse } from "@vercel/node"
import { ACTIONS_CORS_HEADERS, type ActionsJson } from "@solana/actions"

/**
 * PHASE 1: Solana Blinks (Actions)
 * Configures the discovery manifest for Solana Actions.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Always include standard Solana Actions CORS headers
  Object.entries(ACTIONS_CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value)
  })

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  const payload: ActionsJson = {
    rules: [
      {
        pathPattern: "/tip/**",
        apiPath: "/api/solana/actions/tip/**",
      },
      {
        pathPattern: "/api/solana/actions/tip/**",
        apiPath: "/api/solana/actions/tip/**",
      }
    ],
  }

  return res.json(payload)
}
