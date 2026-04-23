import knex from 'knex';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: '.env.local' });

const db = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  }
});

async function checkAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    console.log(`Checking admin email from env: ${adminEmail}`);

    if (!adminEmail) {
      console.error('❌ Error: ADMIN_EMAIL not found in env.');
      return;
    }

    const user = await db('user').where({ email: adminEmail }).first();
    if (!user) {
      console.warn(`⚠️ Warning: User with email ${adminEmail} not found in database.`);
    } else {
      console.log(`✅ User found: ID=${user.id}`);
      
      const roles = await db('user_roles')
        .join('roles', 'user_roles.roleId', 'roles.id')
        .where({ userId: user.id })
        .select('roles.name');
      
      console.log(`Roles: ${roles.map(r => r.name).join(', ')}`);
      
      const hasAdmin = roles.some(r => r.name === 'admin');
      if (!hasAdmin) {
        console.warn('⚠️ Warning: User does not have the "admin" role.');
      }
    }
  } catch (err) {
    console.error('❌ Error:', err.message);
  } finally {
    await db.destroy();
  }
}

checkAdmin();
