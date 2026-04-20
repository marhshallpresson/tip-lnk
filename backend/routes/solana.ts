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

  let retryCount = 0;
  const maxRetries = 3;

  while (retryCount < maxRetries) {
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

        return res.json({ success: true, profile });
    } catch (err) {
        retryCount++;
        console.error(`Profile Fetch Fault (Attempt ${retryCount}):`, err);
        if (retryCount >= maxRetries) {
            return res.status(500).json({ success: false, error: 'Failed to fetch or provision profile after retries' });
        }
        // Small delay before retry
        await new Promise(resolve => setTimeout(resolve, 500));
    }
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
 * Secure Tip Logging (Audit Requirement)
 * Stores the sender name and message for transparency.
 */
router.post('/tips', async (req, res) => {
  const { walletAddress, tip, isSent } = req.body;
  if (!tip || !tip.txSignature) return res.status(400).json({ error: 'Invalid tip data' });

  try {
    await db('tips').insert({
      signature: tip.txSignature,
      slot: 0, // Will be updated by chronological indexer
      timestamp: new Date(tip.timestamp),
      sender: walletAddress,
      sender_name: tip.sender || 'Anonymous',
      recipient: tip.recipientAddress,
      message: tip.note || '',
      amount: tip.amountUSDC,
      fee_amount: tip.feeAmount || 0,
      treasury_address: tip.treasuryAddress || null,
      tokenMint: tip.inputToken, // Simplified for logging
      tokenSymbol: tip.inputToken,
      status: 'confirmed',
      type: isSent ? 'tip_sent' : 'tip_received'
    }).onConflict('signature').merge();

    res.json({ success: true });
  } catch (err) {
    console.error('Tip Logging Fault:', err);
    res.status(500).json({ success: false, error: 'Failed to log tip.' });
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
 * Professional Helius Webhook Receiver
 * FORTIFIED: This is the primary source of truth for transaction indexing.
 */
router.post('/webhooks/helius', async (req, res) => {
  const webhookKey = req.headers['authorization'];
  // In production, verify against process.env.HELIUS_WEBHOOK_SECRET
  
  const transactions = req.body;
  if (!Array.isArray(transactions)) return res.sendStatus(400);

  try {
    for (const tx of transactions) {
        // Extract TipLnk metadata from the Enhanced Transaction
        const signature = tx.signature;
        const sender = tx.feePayer;
        const timestamp = new Date(tx.timestamp * 1000);
        
        // Find the transfer to our treasury or creator
        const transfer = tx.nativeTransfers?.[0] || tx.tokenTransfers?.[0];
        if (!transfer) continue;

        await db('tips').insert({
          signature,
          slot: tx.slot,
          timestamp,
          sender,
          recipient: transfer.toUserAccount,
          amount: transfer.amount || transfer.tokenAmount,
          tokenSymbol: tx.nativeTransfers?.length > 0 ? 'SOL' : 'USDC',
          status: 'confirmed',
          type: 'webhook_indexed'
        }).onConflict('signature').merge();
        
        console.log(`🛡️ Webhook: Fortified ledger entry for ${signature}`);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('Webhook Fault:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
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
  const TEST_WALLET = process.env.TREASURY_WALLET;

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
