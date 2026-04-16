import express from 'express';
import { backfillTransactions, getPriorityFeeEstimate, getAssetsByOwner } from '../lib/helius';
import { db } from '../lib/db';

const router = express.Router();

/**
 * Fetch indexed tips for a specific wallet.
 * High-performance retrieval from local DB instead of raw RPC.
 */
router.get('/tips/:address', async (req, res) => {
  const { address } = req.params;
  try {
    const tips = await db('tips')
      .where('recipient', address)
      .orWhere('sender', address)
      .orderBy('timestamp', 'desc')
      .limit(50);
    
    res.json({ success: true, tips });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch tips from indexer.' });
  }
});

/**
 * Trigger an on-demand backfill for a wallet.
 * Uses gTFA for speed and efficiency.
 */
router.post('/backfill', async (req, res) => {
  const { address } = req.body;
  if (!address) return res.status(400).json({ error: 'Address required' });

  try {
    const tips = await backfillTransactions(address);
    res.json({ success: true, count: tips.length });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Backfill failed.' });
  }
});

/**
 * Professional Priority Fee Estimation.
 * Critical for landing transactions in high-congestion periods.
 */
router.get('/priority-fee', async (req, res) => {
  const { accounts } = req.query;
  const accountList = typeof accounts === 'string' ? accounts.split(',') : [];

  try {
    const fees = await getPriorityFeeEstimate(accountList);
    res.json({ success: true, fees });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch priority fees.' });
  }
});

/**
 * Unified Asset Fetching (DAS API).
 */
router.get('/assets/:owner', async (req, res) => {
  const { owner } = req.params;
  try {
    const assets = await getAssetsByOwner(owner);
    res.json({ success: true, assets });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to fetch assets.' });
  }
});

export default router;
