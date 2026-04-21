import type { VercelRequest, VercelResponse } from "@vercel/node"
import * as oidc from "openid-client"
import { randomUUID } from "crypto"
import { applyCors } from "../../_cors.js"
import { 
  getGoogleConfig, 
  oauthRedirectUrl, 
  patchResponse, 
  inferredOrigin, 
  apiUrl, 
  appUrl,
  normalizeEmail,
  findUserByEmailInsensitive,
  issueAuthExchangeCode,
  redirectToLoginWithOAuthError
} from "../_utils.js"
import { db } from "../../../_lib/db.js"
import { getCookieOptions, createSession, getUserRoles } from "../../../_lib/session.js"

/**
 * Task 2.2: Standalone Vercel Function for Google OAuth Callback
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!applyCors(req, res)) return
  patchResponse(res)

  try {
    const config = await getGoogleConfig()

    // Vercel cookies helper
    const stateCookie = req.cookies?.g_state
    const verifierCookie = req.cookies?.g_verifier
    const nonceCookie = req.cookies?.g_nonce
    const nextCookie = req.cookies?.g_next || '/'

    const opts = getCookieOptions(req as any)
    const clearOpts = { ...opts, maxAge: 0 }
    
    ;(res as any).cookie('g_state', '', clearOpts)
    ;(res as any).cookie('g_verifier', '', clearOpts)
    ;(res as any).cookie('g_nonce', '', clearOpts)
    ;(res as any).cookie('g_next', '', clearOpts)

    if (!stateCookie || !verifierCookie || !nonceCookie) {
      redirectToLoginWithOAuthError(req, res, 'missing_state', nextCookie)
      return
    }

    const proto = inferredOrigin(req) || apiUrl(req)
    const currentUrl = new URL(req.url!, proto)
    
    const tokenSet = await oidc.authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: verifierCookie,
      expectedState: stateCookie,
      expectedNonce: nonceCookie,
      idTokenExpected: true,
    })

    const claims = tokenSet.claims()
    if (!claims) {
      redirectToLoginWithOAuthError(req, res, 'oauth_failed', nextCookie)
      return
    }
    const sub = typeof claims.sub === 'string' ? claims.sub : null
    const email = typeof claims.email === 'string' ? normalizeEmail(claims.email) : null
    const emailVerified = Boolean((claims as any).email_verified)
    const name = typeof claims.name === 'string' ? claims.name.trim() : email
    const picture = typeof (claims as any)?.picture === 'string' ? (claims as any).picture : null

    if (!sub || !email || !emailVerified) {
      redirectToLoginWithOAuthError(req, res, 'oauth_failed', nextCookie)
      return
    }

    let user = await db('user').where({ googleSub: sub }).whereNull('deletedAt').first()
    if (!user) {
      user = await findUserByEmailInsensitive(email)
      if (user) {
        await db('user').where({ id: user.id }).update({ googleSub: sub, updated_at: new Date() })
      } else {
        const userId = randomUUID()
        await db('user').insert({
          id: userId,
          email,
          name: name || email,
          googleSub: sub,
          emailVerifiedAt: new Date(),
          profileData: JSON.stringify({ photo_url: picture }),
          created_at: new Date(),
          updated_at: new Date(),
        })
        user = await db('user').where({ id: userId }).first()

        const role = await db('roles').where({ name: 'user' }).first()
        if (role) await db('user_roles').insert({ userId, roleId: role.id })
      }
    }

    await db('user').where({ id: user.id }).update({ lastLoginAt: new Date() })
    const session = await createSession(req as any, res as any, user.id)
    const { code } = await issueAuthExchangeCode(session.sessionId)

    const redirect = new URL('/auth/callback', appUrl(req))
    redirect.searchParams.set('code', code)
    redirect.searchParams.set('next', nextCookie)
    
    res.setHeader('Location', redirect.toString())
    res.status(302).end()
  } catch (e: any) {
    console.error('[auth/google/callback]', e)
    redirectToLoginWithOAuthError(req, res, 'oauth_failed')
  }
}
