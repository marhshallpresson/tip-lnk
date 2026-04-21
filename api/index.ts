import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Task 2.2: Universal API Entrypoint
 * This file satisfies the Vercel "Services" requirement for a root entrypoint.
 * Granular routes in api/*.ts will continue to handle specific requests.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({ 
    service: 'tiplnk-api',
    status: 'online',
    timestamp: new Date().toISOString()
  });
}
