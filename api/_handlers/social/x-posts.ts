import type { VercelRequest, VercelResponse } from "@vercel/node"
import axios from "axios"
/**
 * Task 2.2: Standalone Vercel Function for Twitter Post Fetching
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  let { username } = req.query
  
  // Extract from URL parts if not in query (e.g. /api/social/x-posts/USERNAME)
  if (!username) {
    const parts = req.url?.split('?')[0].split('/').filter(Boolean) || []
    username = parts[parts.length - 1]
  }

  if (typeof username !== 'string' || username === 'x-posts') {
    return res.status(400).json({ error: 'Username required' })
  }
    
  // Task 1.2: Strict username validation to prevent SSRF
  if (!/^[a-zA-Z0-9_]{1,15}$/.test(username)) {
    return res.status(400).json({ error: 'Invalid Twitter username format' })
  }

  const bearerToken = process.env.TWITTER_BEARER_TOKEN

  if (!bearerToken) {
    return res.status(500).json({ 
      error: 'Twitter API credentials are not configured on the server.' 
    })
  }

  try {
    const userLookupUrl = `https://api.twitter.com/2/users/by/username/${username}`
    const userRes = await axios.get(userLookupUrl, {
      headers: { 'Authorization': `Bearer ${bearerToken}` }
    })

    if (!userRes.data?.data?.id) {
      return res.status(404).json({ error: 'Twitter user not found.' })
    }
    const userId = userRes.data.data.id

    const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets`
    const tweetsRes = await axios.get(tweetsUrl, {
      headers: { 'Authorization': `Bearer ${bearerToken}` },
      params: {
        'max_results': 5,
        'tweet.fields': 'created_at,public_metrics,entities',
        'expansions': 'attachments.media_keys',
        'media.fields': 'url,preview_image_url,type'
      }
    })

    res.json(tweetsRes.data)
  } catch (err: any) {
    console.error('Twitter Proxy Error:', err.response?.data || err.message)
    res.status(err.response?.status || 500).json({ 
      error: 'Failed to fetch posts from X.',
      details: err.response?.data 
    })
  }
}
