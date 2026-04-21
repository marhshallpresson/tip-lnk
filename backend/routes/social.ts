import express from 'express';
import axios from 'axios';

const router = express.Router();

/**
 * Elite X (Twitter) Post Fetcher
 * Securely proxies requests to the Twitter v2 API to fetch a creator's latest posts.
 */
router.get('/x-posts/:username', async (req: express.Request, res: express.Response) => {
  const { username } = req.params;
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;

  if (!bearerToken) {
    return res.status(500).json({ 
      error: 'Twitter API credentials are not configured on the server.' 
    });
  }

  try {
    // 1. Get User ID from username
    const userLookupUrl = `https://api.twitter.com/2/users/by/username/${username}`;
    const userRes = await axios.get(userLookupUrl, {
      headers: { 'Authorization': `Bearer ${bearerToken}` }
    });

    if (!userRes.data?.data?.id) {
      return res.status(404).json({ error: 'Twitter user not found.' });
    }
    const userId = userRes.data.data.id;

    // 2. Get User's Tweets
    const tweetsUrl = `https://api.twitter.com/2/users/${userId}/tweets`;
    const tweetsRes = await axios.get(tweetsUrl, {
      headers: { 'Authorization': `Bearer ${bearerToken}` },
      params: {
        'max_results': 5,
        'tweet.fields': 'created_at,public_metrics,entities',
        'expansions': 'attachments.media_keys',
        'media.fields': 'url,preview_image_url,type'
      }
    });

    res.json(tweetsRes.data);
  } catch (err: any) {
    console.error('Twitter Proxy Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ 
      error: 'Failed to fetch posts from X.',
      details: err.response?.data 
    });
  }
});

export default router;
