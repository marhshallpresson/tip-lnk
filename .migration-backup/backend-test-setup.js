import knex from 'knex';
import { randomUUID } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'dev.db')
  },
  useNullAsDefault: true
});

async function runDeepTest() {
  console.log('🛡️ Starting Backend Deep Test...');

  const userId = 'test-user-' + Date.now();
  const sessionId = 'test-session-' + Date.now();
  const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

  try {
    // 1. Create Mock User
    await db('user').insert({
      id: userId,
      email: `${userId}@example.com`,
      name: 'Deep Test User',
      onboardingComplete: true
    });
    console.log(`✅ Mock user created: ${userId}`);

    // 2. Create Mock Session
    await db('session').insert({
      id: sessionId,
      userId,
      expiresAt,
      created_at: new Date()
    });
    console.log(`✅ Mock session created: ${sessionId}`);

    // 3. Insert Role
    await db('user_roles').insert({
      userId,
      roleId: '00000000-0000-4000-8000-000000000001' // 'user' role
    });

    console.log('\n--- Test Credentials ---');
    console.log(`SID (for Cookie): ${sessionId}`);
    console.log(`USER_ID: ${userId}`);
    console.log('------------------------\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Test Setup Failed:', err);
    process.exit(1);
  }
}

runDeepTest();
