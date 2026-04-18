import { db } from './lib/db.js';

async function checkWallet() {
  const wallet = '5yZArHwv64pVrSyDhXvEQtVhweHv7RzeGHhwbMkbgmYp';
  const user = await db('user').where({ walletAddress: wallet }).first();
  console.log('Current owner of treasury wallet:', user);
  process.exit(0);
}

checkWallet();
