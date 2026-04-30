import { db } from './api/_lib/db.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

async function createAdmin() {
  console.log('🛡️ Creating Elite Admin...');
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tiplnk.me';
    const password = 'tiplnk-elite-admin-2026-god-mode'; 
    const hash = await bcrypt.hash(password, 10);
    
    const existing = await db('user').where({ email: adminEmail }).first();
    let userId = existing?.id;

    if (!existing) {
      userId = uuidv4();
      await db('user').insert({
        id: userId,
        email: adminEmail,
        name: 'Elite Admin',
        passwordHash: hash,
        onboardingComplete: true
      });
      console.log('✅ Admin User Created');
    } else {
      await db('user').where({ id: userId }).update({ passwordHash: hash });
      console.log('✅ Admin Password Reset');
    }

    const adminRole = await db('roles').where({ name: 'admin' }).first();
    if (adminRole) {
      const hasRole = await db('user_roles').where({ userId, roleId: adminRole.id }).first();
      if (!hasRole) {
        await db('user_roles').insert({ userId, roleId: adminRole.id });
        console.log('✅ Admin Role Assigned');
      }
    }

    process.exit(0);
  } catch (err: any) {
    console.error('❌ Failed to create admin:', err.message);
    process.exit(1);
  }
}

createAdmin();
