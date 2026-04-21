import app from '../backend/app.js';
import { initSchema } from '../backend/lib/db.js';

let isInitialized = false;

/**
 * Vercel Serverless Function entry point.
 * Wraps the Express app and ensures DB schema is synchronized.
 */
export default async function handler(req: any, res: any) {
  try {
    if (!isInitialized) {
      console.log('Vercel cold start: Synchronizing schema...');
      await initSchema();
      isInitialized = true;
    }
    
    // Express app handles the rest
    return app(req, res);
  } catch (err: any) {
    console.error('Vercel Function Error:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
}
