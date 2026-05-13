/**
 * Backend Logic Deep Verification
 * Forces SQLite usage and tests the tiered lookup logic.
 */
delete process.env.DATABASE_URL;

async function run() {
  const { getSessionUser } = await import('./api/_lib/session.js');
  const { db } = await import('./api/_lib/db.js');

  console.log('🛡️ Testing Backend Logic Directly...');

  const sid = 'test-session-1778557573795';
  
  const mockReq = {
    headers: {
      cookie: `sid=${sid}`
    },
    cookies: {},
    signedCookies: {},
    hostname: 'localhost'
  };

  try {
    const user = await getSessionUser(mockReq);
    if (user && user.id === 'test-user-1778557573795') {
      console.log('✅ Backend Tier 3 (Cookie) Lookup verified!');
    } else {
      console.error('❌ Backend Tier 3 Lookup FAILED. User:', user);
    }
  } catch (err) {
    console.error('❌ Backend logic error:', err);
  } finally {
    process.exit(0);
  }
}

run();
