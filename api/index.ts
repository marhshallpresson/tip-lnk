import app from "./app";
import { logger } from "./lib/logger";

// Vercel Serverless Function entry point
// Exports the Express app directly for Vercel to handle
export default app;
