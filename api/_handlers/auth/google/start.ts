import type { VercelRequest, VercelResponse } from "@vercel/node"
import * as oidc from "openid-client"
import { applyCors } from "../../_cors.js"
import { getGoogleConfig, oauthRedirectUrl, patchResponse } from "../_utils.js"
import { getCookieOptions } from "../../../_lib/session.js"

/**
 * Task 2.2: Standalone Vercel Function for Google OAuth Start
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  patchResponse(res)

  const next = (req.query.next as string) || '/'
  try {
    const config = await getGoogleConfig()
    const redirect_uri = oauthRedirectUrl(req)
    const state = oidc.randomState()
    const verifier = oidc.randomPKCECodeVerifier()
    const nonce = oidc.randomNonce()
    const code_challenge = await oidc.calculatePKCECodeChallenge(verifier)

    const opts = { ...getCookieOptions(req as any), maxAge: 600000 }
    
    // patchResponse added res.cookie for Vercel
    ;(res as any).cookie('g_state', state, opts)
    ;(res as any).cookie('g_verifier', verifier, opts)
    ;(res as any).cookie('g_nonce', nonce, opts)
    ;(res as any).cookie('g_next', next, opts)

    const url = oidc.buildAuthorizationUrl(config, {
      redirect_uri,
      scope: 'openid email profile',
      state,
      nonce,
      code_challenge,
      code_challenge_method: 'S256',
    })

    res.setHeader('Location', url.href)
    res.status(302).end()
  } catch (e: any) {
    console.error('[auth/google/start]', e)
    res.status(500).json({ error: 'OAuth initialization failed' })
  }
}
