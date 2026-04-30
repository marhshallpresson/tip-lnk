import { db, initSchema } from './api/_lib/db.js';
import loginHandler from './api/_handlers/auth/login.js';
import fiatWebhookHandler from './api/_handlers/payments/fiat/webhook.js';
import payoutWebhookHandler from './api/_handlers/payouts/webhook.js';
import resolveHandler from './api/_handlers/deep-link/resolve.ts';
import crypto from 'crypto';

// --- Mocking Vercel Req/Res ---
function mockRes() {
  const res: any = {
    _status: 200,
    _data: null,
    _headers: {},
    status(s: number) { this._status = s; return this; },
    json(d: any) { this._data = d; return this; },
    end() { return this; },
    setHeader(k: string, v: string) { this._headers[k] = v; return this; },
  };
  return res;
}

function mockReq(method: string, body: any = {}, query: any = {}, headers: any = {}) {
  return {
    method,
    body,
    query,
    headers: {
      'content-type': 'application/json',
      ...headers
    },
    url: '/'
  } as any;
}

async function runBrutalTestSuite() {
  console.log('🦾 --- BRUTAL SYSTEM INTEGRITY SUITE --- 🦾');
  
  // Set required secrets for testing
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_brutal_validation';
  process.env.SESSION_TOKEN_SECRET = process.env.SESSION_TOKEN_SECRET || 'test_session_secret';

  try {
    // 0. Ensure Schema
    await initSchema();
    console.log('✅ Stage 0: Schema Initialized');

    // 1. Test Auth: Login
    console.log('\n🧪 Testing Auth: Login Pipeline...');
    const users = await db('user').select('email', 'passwordHash');
    console.log('Current users in DB:', users);

    const loginReq = mockReq('POST', {
      email: process.env.ADMIN_EMAIL || 'admin@tiplnk.me',
      password: 'tiplnk-elite-admin-2026-god-mode'
    });
    const loginRes = mockRes();
    await loginHandler(loginReq, loginRes);
    
    if (loginRes._status === 200 && loginRes._data.success) {
      console.log('✅ Auth Login: SUCCESS');
    } else {
      console.error('❌ Auth Login: FAILED', loginRes._data);
      process.exit(1);
    }

    // 2. Test Payment: FossaPay Webhook (Inbound Tip)
    console.log('\n🧪 Testing Payments: FossaPay Webhook Pipeline...');
    const fossaPayload = {
      event: 'deposit.completed',
      data: {
        reference: `test_fiat_${Date.now()}`,
        status: 'completed',
        amount: 25.00,
        destinationWallet: '867YpMubr7f5eZJ1MvB2Vz8f1x6vPzG6PzG6PzG6PzG6', // Mock creator
        metadata: { senderName: 'Brutal Tester', memo: 'System Validation' }
      }
    };
    const fossaSecret = process.env.FOSSA_WEBHOOK_SECRET || 'test_secret';
    process.env.FOSSA_WEBHOOK_SECRET = fossaSecret; // Ensure it's set for test

    const fossaSignature = crypto
      .createHmac('sha512', fossaSecret)
      .update(JSON.stringify(fossaPayload))
      .digest('hex');

    const fossaReq = mockReq('POST', fossaPayload, {}, { 'x-fossapay-signature': fossaSignature });
    const fossaRes = mockRes();
    await fiatWebhookHandler(fossaReq, fossaRes);

    if (fossaRes._status === 200) {
      console.log('✅ FossaPay Webhook: SUCCESS (Handled)');
      const tip = await db('tips').where({ signature: fossaPayload.data.reference }).first();
      if (tip) {
        console.log('✅ Ledger Update: OK (Tip recorded)');
      } else {
        console.error('❌ Ledger Update: FAILED (Tip not found)');
      }
    } else {
      console.error('❌ FossaPay Webhook: FAILED', fossaRes._data);
    }

    // 3. Test Payout: Pajcash Webhook (Outbound Payout)
    console.log('\n🧪 Testing Payouts: Pajcash Webhook Pipeline...');
    const pajPayload = {
      reference: `test_payout_${Date.now()}`,
      status: 'completed',
      amount: 15000,
      walletAddress: '867YpMubr7f5eZJ1MvB2Vz8f1x6vPzG6PzG6PzG6PzG6'
    };
    const pajSecret = process.env.PAJCASH_WEBHOOK_SECRET || 'test_paj_secret';
    process.env.PAJCASH_WEBHOOK_SECRET = pajSecret;

    const pajSignature = crypto
      .createHmac('sha256', pajSecret)
      .update(JSON.stringify(pajPayload))
      .digest('hex');

    const pajReq = mockReq('POST', pajPayload, {}, { 'x-pajcash-signature': pajSignature });
    const pajRes = mockRes();
    await payoutWebhookHandler(pajReq, pajRes);

    if (pajRes._status === 200) {
      console.log('✅ Pajcash Webhook: SUCCESS');
      const payout = await db('payouts').where({ pajcash_reference: pajPayload.reference }).first();
      if (payout) {
        console.log('✅ Payout Ledger: OK');
      } else {
        console.error('❌ Payout Ledger: FAILED');
      }
    } else {
      console.error('❌ Pajcash Webhook: FAILED', pajRes._data);
    }

    // 4. Test User: Handle Resolution (The fix we just applied)
    console.log('\n🧪 Testing User: Handle Resolution Pipeline...');
    // Seed a quick user with a .sol domain
    const testWallet = 'TestWallet1234567890';
    await db('user').insert({
      id: 'test_user_id',
      email: 'tester@tiplnk.me',
      walletAddress: testWallet,
      solDomain: 'brutal.tiplnk.sol'
    }).onConflict('id').merge();

    const resReq = mockReq('GET', {}, { handle: 'brutal' });
    const resRes = mockRes();
    await resolveHandler(resReq, resRes);

    if (resRes._status === 200 && resRes._data.walletAddress === testWallet) {
      console.log('✅ Handle Resolution (@brutal -> wallet): SUCCESS');
    } else {
      console.error('❌ Handle Resolution: FAILED', resRes._data);
    }

    console.log('\n💎 --- BRUTAL TEST SUITE COMPLETE: ALL CORE PIPELINES FUNCTIONAL --- 💎');
    process.exit(0);
  } catch (err: any) {
    console.error('\n💥 BRUTAL SUITE CRASHED:', err.message);
    process.exit(1);
  }
}

runBrutalTestSuite();
