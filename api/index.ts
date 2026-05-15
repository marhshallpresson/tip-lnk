import app from "../server/_app.js";
import { logger } from "../server/_lib/logger.js";

// Vercel Serverless Function entry point
// Exports the Express app directly for Vercel to handle
export default app;
