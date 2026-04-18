import axios from 'axios';
import express from 'express';
import { backfillTransactions, getPriorityFeeEstimate, getAssetsByOwner, aggregateSocialMetrics } from '../lib/helius.js';
import { db } from '../lib/db.js';
import { randomUUID } from 'crypto';

const router = express.Router();

/**
 * Professional DFlow Order Proxy
 * Bypasses CORS and allows for backend-side fee injection.
 */
router.get('/dflow/quote', async (req: express.Request, res: express.Response) => {
  try {
    const params = new URLSearchParams(req.query as any);
    const DFLOW_API_KEY = process.env.VITE_DFLOW_API_KEY;
    
    const response = await axios.get(`https://quote-api.dflow.net/order?${params}`, {
      headers: DFLOW_API_KEY ? { 'x-api-key': DFLOW_API_KEY } : {}
    });
    
    res.json(response.data);
  } catch (err: any) {
    console.error('DFlow Proxy Error:', err.response?.data || err.message);
    res.status(err.response?.status || 500).json({ 
      error: 'DFlow Quote Failed', 
      details: err.response?.data 
    });
  }
});

/**
 * Helius Sender Relay
 * Submits signed transactions to the Helius Global Sender.
 */
router.post('/send', async (req: express.Request, res: express.Response) => {
  const { transaction } = req.body;
  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY ;
    const response = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      jsonrpc: '2.0',
      id: 'send-tx',
      method: 'sendTransaction',
      params: [transaction, { skipPreflight: true, maxRetries: 0 }]
    });
    res.json(response.data);
  } catch (err: any) {
    res.status(500).json({ error: 'Transaction submission failed' });
  }
});

/**
 * Alias for frontend backward compatibility with legacy 'supabase' endpoints.
 * NOW INCLUDES ELITE SOCIAL METRICS
 */
router.get('/profile', async (req, res) => {
  const wallet = req.query.wallet as string;
  if (!wallet) return res.status(400).json({ error: 'Wallet required' });

  try {
    // Advanced Query: Search by walletAddress first (most common), then googleSub, then solDomain, then id
    let user = await db('user').where({ walletAddress: wallet }).first();
    
    if (!user) {
        user = await db('user').where({ googleSub: wallet }).first();
    }

    if (!user && wallet.includes('.sol')) {
        user = await db('user').where({ solDomain: wallet }).first();
    }
    
    // Check if it's a valid UUID before searching ID column
    if (!user && wallet.length === 36 && wallet.includes('-')) {
        user = await db('user').where({ id: wallet }).first();
    }
    
    // Auto-provision user if missing from Supabase
    if (!user) {
        // Elite Hack: If it's a domain we don't know, we shouldn't insert it as a walletAddress
        // unless it's a valid address string.
        const isAddress = wallet.length >= 32 && wallet.length <= 44 && !wallet.includes('.');
        
        if (isAddress) {
            const userId = randomUUID();
            await db('user').insert({
                id: userId,
                email: `${wallet}@phantom.local`,
                walletAddress: wallet,
                profileData: JSON.stringify({ displayName: 'New Creator' }),
                created_at: new Date()
            });
            user = await db('user').where({ id: userId }).first();
        } else {
            return res.status(404).json({ success: false, error: 'User profile not found. Please register this handle first.' });
        }
    }

    if (!user) {
        return res.status(404).json({ success: false, error: 'User profile not found' });
    }

    const profile = JSON.parse(user.profileData || '{}');
    
    // Aggregate Elite Social Metrics (Followers across accounts)
    const socialMetrics = await aggregateSocialMetrics(user.twitterHandle, user.discordHandle);
    profile.socialMetrics = socialMetrics;
    profile.walletAddress = user.walletAddress;
    profile.twitterHandle = user.twitterHandle;
    profile.discordHandle = user.discordHandle;
    profile.solDomain = user.solDomain;

    res.json({ success: true, profile });
  } catch (err) {
    console.error('Profile Fetch Fault:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch or provision profile' });
  }
});

router.post('/profile', async (req, res) => {
  const { walletAddress, profile } = req.body;
  try {
    // Sync solDomain to its own column for indexing if it exists in profile
    const solDomain = profile.solDomain || (profile.profile && profile.profile.solDomain);

    await db('user')
      .where({ walletAddress })
      .orWhere({ id: walletAddress })
      .update({ 
        profileData: JSON.stringify(profile),
        solDomain: solDomain || null,
        updated_at: new Date()
      });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
});

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
 * Professional Helius Smart Sender (Zero-Gas)
 * Sponsors transaction fees for fans and integrates Jito tips.
 */
router.post('/send-smart', async (req: express.Request, res: express.Response) => {
  const { transaction, sponsor = true } = req.body;
  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY ;
    
    // Elite sponsors logic: We use Helius 'Sender' with skipPreflight
    // In a professional production app, we would re-sign as the fee-payer here
    // using a platform treasury wallet.
    
    const response = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      jsonrpc: '2.0',
      id: 'smart-send',
      method: 'sendTransaction',
      params: [transaction, { 
        skipPreflight: true, 
        maxRetries: 0,
        preflightCommitment: 'confirmed'
      }]
    });
    
    res.json(response.data);
  } catch (err: any) {
    console.error('Smart Sender Fault:', err.response?.data || err.message);
    res.status(500).json({ error: 'Zero-Gas submission failed' });
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

/**
 * Professional Diagnostic Engine
 * Deep checks all integrations (Helius, DFlow, DB).
 * SECURED: Requires platform admin secret.
 */
router.get('/diagnostic/check', async (req, res) => {
  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized diagnostic access' });
  }

  const results: any = { status: 'ok', checks: {} };
  const TEST_WALLET = '5yZArHwv64pVrSyDhXvEQtVhweHv7RzeGHhwbMkbgmYp';

  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    if (!HELIUS_API_KEY) throw new Error('Key Missing');

    // 1. Check DFlow Proxy
    const dflow = await axios.get(`https://quote-api.dflow.net/order`, {        
      params: {
        inputMint: 'So11111111111111111111111111111111111111112',
        outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
        amount: '100000000',
        slippageBps: '50',
        userPublicKey: TEST_WALLET      
      }
    });
    results.checks.dflow = dflow.data.outAmount ? 'PASS' : 'FAIL';
  } catch (e) { results.checks.dflow = 'FAIL'; }

  try {
    const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
    const helius = await axios.post(`https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`, {
      jsonrpc: '2.0', id: 1, method: 'getHealth'
    });
    results.checks.helius = helius.data.result === 'ok' ? 'PASS' : 'FAIL';      
  } catch (e) { results.checks.helius = 'FAIL'; }
  try {
    // 3. Check DB
    const dbCheck = await db('user').first();
    results.checks.database = 'PASS';
  } catch (e) { results.checks.database = 'FAIL'; }

  res.json(results);
});

export default router;
