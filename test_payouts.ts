import { db } from './api/_lib/db.js';
async function test() {
  const exists = await db.schema.hasTable('payouts');
  console.log('Payouts exists:', exists);
  process.exit(0);
}
test();
