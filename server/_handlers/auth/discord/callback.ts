import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import axios from "axios"
import { db } from "../../../_lib/db.js"
import { getSessionUser } from "../../../_lib/session.js"

/**
 * PHASE 2: SCALABLE BACKEND
 * Official Discord OAuth2 Callback Handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, redirectUri, codeVerifier, state } = req.body
  if (!code) return res.status(400).json({ error: 'Authorization code required' })

  // ─── ELITE SECURITY: BACKEND STATE LOGGING ───
  // We log the state for auditability, though primary verification happens on frontend.
  if (!state) {
      console.warn('🛡️ OAuth Warning: Backend received callback without state parameter.')
  }

  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) return res.status(401).json({ error: 'Session required' })

    const clientId = process.env.DISCORD_CLIENT_ID
    const clientSecret = process.env.DISCORD_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error('🛡️ OAuth: Discord credentials missing in env.')
        return res.status(500).json({ error: 'Discord OAuth not configured on server.' })
    }

    const params: any = {
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      scope: 'identify'
    }

    if (codeVerifier) {
      params.code_verifier = codeVerifier
    }

    const tokenResponse = await axios.post('https://discord.com/api/oauth2/token', 
      new URLSearchParams(params).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    )

    const accessToken = tokenResponse.data.access_token

    const userResponse = await axios.get('https://discord.com/api/users/@me', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    })

    const discordUsername = userResponse.data.username

    await db('user').where({ id: sessionUser.id }).update({
      discordHandle: discordUsername,
      updated_at: new Date()
    })

    res.status(200).json({ success: true, username: discordUsername })
  } catch (err: any) {
    console.error('🛡️ Discord OAuth Error:', err.response?.data || err.message)
    res.status(500).json({ 
      error: 'Identity provider rejected the authorization code.',
      details: err.response?.data
    })
  }
}
