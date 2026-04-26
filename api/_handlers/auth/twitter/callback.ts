import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"
import { db } from "../../../_lib/db.js"
import { getSessionUser } from "../../../_lib/session.js"

/**
 * PHASE 2: SCALABLE BACKEND
 * Official Twitter (X) OAuth2 Callback Handler
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { code, redirectUri, codeVerifier } = req.body
  if (!code) return res.status(400).json({ error: 'Authorization code required' })

  try {
    const sessionUser = await getSessionUser(req as any)
    if (!sessionUser) return res.status(401).json({ error: 'Session required' })

    const clientId = process.env.TWITTER_CLIENT_ID
    const clientSecret = process.env.TWITTER_CLIENT_SECRET

    if (!clientId || !clientSecret) {
        console.error('🛡️ OAuth: Twitter credentials missing in env.')
        return res.status(500).json({ error: 'Twitter OAuth not configured on server.' })
    }

    // 1. Exchange Code for Access Token
    const params: any = {
      code,
      grant_type: 'authorization_code',
      client_id: clientId,
      redirect_uri: redirectUri,
    }

    if (codeVerifier) {
      params.code_verifier = codeVerifier
    }

    const tokenResponse = await axios.post('https://api.twitter.com/2/oauth2/token', 
      new URLSearchParams(params).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
        }
      }
    )

    const accessToken = tokenResponse.data.access_token

    // 2. Fetch User Profile with detailed fields
    const userResponse = await axios.get('https://api.twitter.com/2/users/me', {
      headers: { 'Authorization': `Bearer ${accessToken}` },
      params: {
        'user.fields': 'profile_image_url,description,name'
      }
    })

    const twitterData = userResponse.data.data
    const twitterUsername = twitterData.username
    const twitterName = twitterData.name
    const twitterBio = twitterData.description
    const twitterAvatar = twitterData.profile_image_url?.replace('_normal', '_400x400')

    // 3. Link to User Profile in DB and pre-fill if empty
    const currentUser = await db('user').where({ id: sessionUser.id }).first()
    const currentProfile = JSON.parse(currentUser.profileData || '{}')
    
    const updates: any = {
      twitterHandle: twitterUsername,
      updated_at: new Date()
    }

    // Pre-fill name and bio if not already set
    if (!currentUser.name) updates.name = twitterName
    
    const newProfileData = {
      ...currentProfile,
      displayName: currentProfile.displayName || twitterName,
      bio: currentProfile.bio || twitterBio,
      avatarUrl: currentProfile.avatarUrl || twitterAvatar,
      avatarType: currentProfile.avatarType === 'none' ? 'social' : currentProfile.avatarType
    }
    updates.profileData = JSON.stringify(newProfileData)

    await db('user').where({ id: sessionUser.id }).update(updates)

    res.status(200).json({ 
      success: true, 
      username: twitterUsername,
      details: {
        name: twitterName,
        bio: twitterBio,
        avatar: twitterAvatar
      }
    })
  } catch (err: any) {
    console.error('🛡️ Twitter OAuth Error:', err.response?.data || err.message)
    res.status(500).json({ 
      error: 'Identity provider rejected the authorization code.',
      details: err.response?.data
    })
  }
}
