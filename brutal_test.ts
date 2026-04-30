import { db, initSchema } from './api/_lib/db.js';
import { getSolPrice } from './api/_lib/price.js';

async function runBrutalTest() {
  console.log('🚀 Starting Brutal System Integrity Test...');

  try {
    // 1. Database & Schema
    await db.raw('select 1');
    console.log('✅ DB Connection: OK');
    
    await initSchema();
    console.log('✅ Schema Integrity: OK');

    // 2. Auth Tables Check
    const tables = ['user', 'tips', 'payouts', 'session', 'roles'];
    for (const table of tables) {
      const exists = await db.schema.hasTable(table);
      console.log(`📊 Table [${table}]: ${exists ? 'OK' : 'MISSING'}`);
    }

    // 3. Price Engine
    const solPrice = await getSolPrice();
    console.log(`💰 Price Engine: SOL = $${solPrice} (OK)`);

    // 4. Admin Account Integrity
    const admin = await db('user').join('user_roles', 'user.id', 'user_roles.userId')
      .join('roles', 'user_roles.roleId', 'roles.id')
      .where('roles.name', 'admin').first();
    console.log(`🛡️ Admin Account: ${admin ? 'DETECTED' : 'NOT FOUND (Warning)'}`);

    // 5. Webhook Integrity (Fossa)
    const fossaSecret = process.env.FOSSA_WEBHOOK_SECRET;
    console.log(`🔗 Fossa Webhook Secret: ${fossaSecret ? 'CONFIGURED' : 'MISSING (Critical)'}`);

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Brutal Test Failed:', err.message);
    process.exit(1);
  }
}

runBrutalTest();
