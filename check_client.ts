import { db } from './api/_lib/db.js';
console.log('DB Client:', db.client.config.client);
process.exit(0);
