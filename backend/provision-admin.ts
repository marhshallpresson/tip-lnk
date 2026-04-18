import { db } from './lib/db.js';
import { randomUUID } from 'crypto';

async function provisionEliteAdmin() {
  console.log('🛡️ Provisioning Protocol Admin: admin@tiplnk.me...');

  try {
    // 1. Ensure Roles Table has 'admin'
    let adminRole = await db('roles').where({ name: 'admin' }).first();
    if (!adminRole) {
        const roleId = randomUUID();
        await db('roles').insert({ id: roleId, name: 'admin' });
        adminRole = { id: roleId, name: 'admin' };
        console.log('✨ Created "admin" role.');
    }

    // 2. Provision Admin User
    let adminUser = await db('user').where({ email: 'admin@tiplnk.me' }).first();
    const adminId = adminUser?.id || randomUUID();

    if (!adminUser) {
        await db('user').insert({
            id: adminId,
            email: 'admin@tiplnk.me',
            name: 'TipLnk Administrator',
            profileData: JSON.stringify({ displayName: 'Protocol Admin', isSystem: true }),
            created_at: new Date(),
            updated_at: new Date()
        });
        console.log('✨ Created admin@tiplnk.me user account.');
    }

    // 3. Bind Role (User Roles)
    // First, ensure user_roles table exists (Elite Hardening)
    if (!(await db.schema.hasTable('user_roles'))) {
        await db.schema.createTable('user_roles', (table) => {
            table.string('userId').references('id').inTable('user').onDelete('CASCADE');
            table.string('roleId').references('id').inTable('roles').onDelete('CASCADE');
            table.primary(['userId', 'roleId']);
        });
        console.log('✨ Created "user_roles" mapping table.');
    }

    const hasRole = await db('user_roles').where({ userId: adminId, roleId: adminRole.id }).first();
    if (!hasRole) {
        await db('user_roles').insert({ userId: adminId, roleId: adminRole.id });
        console.log('🚀 Escalated admin@tiplnk.me to Protocol Admin privileges.');
    }

    console.log('\n✅ Administrative Provisioning Successful.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Provisioning Failed:', err);
    process.exit(1);
  }
}

provisionEliteAdmin();
