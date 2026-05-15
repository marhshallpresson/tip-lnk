import app from "../server/_app.js";
import { logger } from "../server/_lib/logger.js";

/**
 * Vercel Serverless Function entry point
 * Consolidates all /api routes into a single function.
 */
export default async function handler(req: any, res: any) {
  try {
    // Handle the request through Express
    return app(req, res);
  } catch (err: any) {
    logger.error({ err, url: req.url }, "Vercel Entry Point Crash");
    res.status(500).json({ 
      success: false, 
      error: "Internal Server Error", 
      details: err.message 
    });
  }
}
