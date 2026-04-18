import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Professional Supabase (PostgreSQL) Integration
 * Replaces MockDB with a production-grade cloud database.
 */
const dbInstance = knex({
  client: 'pg',
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  },
  pool: {
    min: 2,
    max: 10
  },
  acquireConnectionTimeout: 10000
});

export const db = dbInstance;
export { dbInstance as knex };
export default dbInstance;

/**
 * Production Schema Initialization
 * Automatically creates tables on your Supabase instance.
 */
export async function initSchema() {
  console.log('🚀 Synchronizing schema with Supabase...');

  try {
    // ─── ELITE SAFETY GUARD ───
    // Migration reset logic removed for production safety.

    // 1. User Table
    if (!(await db.schema.hasTable('user'))) {
      await db.schema.createTable('user', (table) => {
        table.string('id').primary();
        table.string('email').unique();
        table.string('name');
        table.string('passwordHash');
        table.string('googleSub');
        table.string('twitterHandle').unique();
        table.string('discordHandle').unique();
        table.string('walletAddress').unique();
        table.string('solDomain').unique();
        table.dateTime('emailVerifiedAt');
        table.text('profileData');
        table.dateTime('lastLoginAt');
        table.dateTime('deletedAt');
        table.timestamps(true, true);
      });
      console.log('✨ User table provisioned.');
    }

    // 2. Tips Table
    if (!(await db.schema.hasTable('tips'))) {
      await db.schema.createTable('tips', (table) => {
        table.string('signature').primary();
        table.bigInteger('slot').notNullable();
        table.dateTime('timestamp').notNullable();
        table.string('sender').notNullable();
        table.string('sender_name'); // Audit Requirement
        table.text('message');      // Audit Requirement
        table.string('recipient').notNullable();
        table.decimal('amount', 20, 8).notNullable();
        table.decimal('fee_amount', 20, 8).defaultTo(0);
        table.string('treasury_address');
        table.string('tokenMint').notNullable();
        table.string('tokenSymbol').notNullable();
        table.string('status').defaultTo('confirmed');
        table.string('type').defaultTo('tip');
        table.index(['sender']);
        table.index(['recipient']);
        table.index(['timestamp']);
      });
      console.log('✨ Tips table provisioned.');
    }

    // 3. Indexer State
    if (!(await db.schema.hasTable('indexer_state'))) {
      await db.schema.createTable('indexer_state', (table) => {
        table.string('address').primary();
        table.bigInteger('lastIndexedSlot').defaultTo(0);
        table.dateTime('updated_at').defaultTo(db.fn.now());
      });
      console.log('✨ Indexer state table provisioned.');
    }

    // 4. Roles & Auth Tables
    if (!(await db.schema.hasTable('roles'))) {
      await db.schema.createTable('roles', (table) => {
        table.string('id').primary();
        table.string('name').unique();
        table.timestamps(true, true);
      });
      console.log('✨ Roles table provisioned.');
      // Seed default user role
      await db('roles').insert({ id: '00000000-0000-4000-8000-000000000001', name: 'user' }).onConflict('name').ignore();
      await db('roles').insert({ id: '00000000-0000-4000-8000-000000000002', name: 'admin' }).onConflict('name').ignore();
    }

    if (!(await db.schema.hasTable('user_roles'))) {
      await db.schema.createTable('user_roles', (table) => {
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.string('roleId').references('id').inTable('roles').onDelete('CASCADE');
        table.primary(['userId', 'roleId']);
      });

    }
    if (!(await db.schema.hasTable('session'))) {
      await db.schema.createTable('session', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.dateTime('expiresAt');
        table.string('userAgent');
        table.string('ip');
        table.dateTime('revokedAt');
        table.timestamps(true, true);
      });
      console.log('✨ Session table provisioned.');
    }
    // 6. Email Verification Tokens
    if (!(await db.schema.hasTable('email_verification_token'))) {
      await db.schema.createTable('email_verification_token', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.string('email').notNullable();
        table.string('tokenHash').notNullable();
        table.dateTime('expiresAt').notNullable();
        table.timestamps(true, true);
      });
      console.log('✨ Email verification table provisioned.');
    }

    // ─── ELITE SECURITY HARDENING: Enable RLS ───
    console.log('🛡️ Hardening database with Row Level Security Policies...');
    const tables = ['user', 'tips', 'indexer_state', 'roles', 'session', 'user_roles'];
    for (const table of tables) {
      try {
        await db.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);

        // Define Basic Isolation Policies (Defense in Depth)
        // Note: These assume the app user context is set if accessing via Supabase Client
        if (table === 'user') {
          await db.raw(`CREATE POLICY "Users can only view their own profile" ON "${table}" FOR SELECT USING (id::text = current_setting('app.current_user_id', true));`);
          await db.raw(`CREATE POLICY "Users can only update their own profile" ON "${table}" FOR UPDATE USING (id::text = current_setting('app.current_user_id', true));`);
        }
        if (table === 'tips') {
          await db.raw(`CREATE POLICY "Users can only view their own tips" ON "${table}" FOR SELECT USING (sender = current_setting('app.current_user_wallet', true) OR recipient = current_setting('app.current_user_wallet', true));`);
        }
      } catch (e) {
        // Policy might already exist
      }
    }

    console.log('✅ Supabase Schema Sync & Hardening Complete.');
  } catch (err) {
    console.error('❌ Supabase Sync Failed:', err);
  }
}
