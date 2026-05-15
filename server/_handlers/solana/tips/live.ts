import type { Request as VercelRequest, Response as VercelResponse } from 'express'
import { getLiveFeed } from "../../../_lib/kv.js"
import { rateLimit } from "../../../_lib/ratelimit.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  // Apply light rate limiting for the polling feed
  if (!(await rateLimit(req, res))) return;

  try {
    const feed = await getLiveFeed();
    return res.status(200).json({ success: true, feed });
  } catch (err: any) {
    console.error('Live Feed Error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to fetch live feed' });
  }
}
