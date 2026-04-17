import { initSchema } from './lib/db.js';

async function forceSync() {
  console.log('🔥 Triggering Elite Schema Sync...');
  await initSchema();
  console.log('✅ Sync Complete. System is ready.');
  process.exit(0);
}

forceSync();
