import { db } from './lib/db.js';
import { hashPassword } from './lib/password.js';

async function setAdminPassword() {
  const email = 'admin@tiplnk.me';
  const password = 'tiplnk-elite-god-mode-2026';
  
  console.log(`🔐 Setting secure password for ${email}...`);

  try {
    const user = await db('user').where({ email }).first();
    if (!user) {
      console.error('❌ Admin user not found. Run provision-admin.ts first.');
      process.exit(1);
    }

    const passwordHash = await hashPassword(password);
    
    await db('user').where({ id: user.id }).update({
      passwordHash,
      updated_at: new Date()
    });

    console.log('✅ Admin password set and hashed in Supabase.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to set password:', err);
    process.exit(1);
  }
}

setAdminPassword();
