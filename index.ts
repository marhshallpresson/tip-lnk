/**
 * Root Entrypoint (Hobby Plan / Legacy Detection Fix)
 * This file satisfies the Vercel build engine's requirement for a root entrypoint.
 * Real API logic remains in /api and /backend/api/
 */
export default async function handler(req: any, res: any) {
  res.status(200).json({ status: 'ok', engine: 'tiplnk-unified' });
}
