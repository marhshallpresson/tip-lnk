import express, { Request, Response } from 'express';
import { db } from '../lib/db.js';

const router = express.Router();

/**
 * Elite Admin Middleware
 * Secures all /api/admin routes with the platform admin secret.
 */
const requireAdmin = (req: Request, res: Response, next: express.NextFunction) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ success: false, error: 'Unauthorized: Elite Admin Access Required' });
  }
  next();
};

router.use(requireAdmin);

/**
 * GET /api/admin/stats
 * Aggregates protocol-level metrics (TVL, Revenue, Active Creators).
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // 1. Total Volume & Platform Revenue
    const tipStats: any = await db('tips')
      .select(
        db.raw('COUNT(signature) as total_tips'),
        db.raw('COALESCE(SUM(amount), 0) as total_volume_usdc'),
        // Calculate estimated revenue assuming fee_amount exists in schema or via calculation
        db.raw('COALESCE(SUM(amount * 0.05), 0) as estimated_revenue') 
      )
      .where('status', 'confirmed')
      .first();

    // 2. Creator Growth
    const userStats: any = await db('user')
      .select(db.raw('COUNT(id) as total_creators'))
      .first();

    res.json({
      success: true,
      stats: {
        totalTips: parseInt(tipStats?.total_tips || '0'),
        totalVolumeUSDC: parseFloat(tipStats?.total_volume_usdc || '0'),
        platformRevenue: parseFloat(tipStats?.estimated_revenue || '0'),
        totalCreators: parseInt(userStats?.total_creators || '0'),
      }
    });
  } catch (error: any) {
    console.error('Admin Stats Fault:', error);
    res.status(500).json({ success: false, error: 'Failed to aggregate platform stats.' });
  }
});

/**
 * GET /api/admin/creators
 * The Creator CRM: Fetches all registered creators for management.
 */
router.get('/creators', async (req: Request, res: Response) => {
  try {
    const creators = await db('user')
      .select('id', 'email', 'name', 'walletAddress', 'twitterHandle', 'discordHandle', 'created_at', 'lastLoginAt')
      .orderBy('created_at', 'desc')
      .limit(100);

    res.json({ success: true, creators });
  } catch (error: any) {
    console.error('Admin Creators Fault:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch creators list.' });
  }
});

/**
 * GET /api/admin/ledger
 * The global tip ledger for tracking all transactions across the protocol.
 */
router.get('/ledger', async (req: Request, res: Response) => {
  try {
    const ledger = await db('tips')
      .select('*')
      .orderBy('timestamp', 'desc')
      .limit(100);

    res.json({ success: true, ledger });
  } catch (error: any) {
    console.error('Admin Ledger Fault:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch global ledger.' });
  }
});

export default router;
