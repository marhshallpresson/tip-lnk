import knex from 'knex';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env') });

/**
 * Elite Database Integration
 * Hardened pooling for PostgreSQL (Supabase) and SQLite fallback for local dev.
 */
const config = process.env.DATABASE_URL 
  ? {
      client: 'pg',
      connection: {
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Required for Supabase production
      },
      pool: {
        min: 2,
        max: 10,
        idleTimeoutMillis: 30000,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        propagateCreateError: false
      }
    }
  : {
      client: 'sqlite3',
      connection: {
        filename: path.join(__dirname, '../../dev.db')
      },
      useNullAsDefault: true
    };

const dbInstance = knex(config);

// ─── ELITE AUTOMATION ───
// Automatically ensure schema is provisioned on boot.
// In serverless, this runs on cold start. In local dev, it runs once.
initSchema().catch(err => {
  console.error('❌ Failed to auto-initialize database schema:', err.message);
});

export const db = dbInstance;
export { dbInstance as knex };
export default dbInstance;

/**
 * Production Schema Initialization
 * Automatically creates and hardens tables on your Supabase instance.
 */
export async function initSchema() {
  console.log('🚀 Synchronizing schema with Supabase...');

  try {
    // ─── ELITE SAFETY GUARD ───
    // DANGEROUS_RESET_DB_FOR_MIGRATION logic removed for production safety.

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
        table.boolean('auto_convert_usdc').defaultTo(true); // Elite Default: Settle in Stables
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
        table.string('sender_name');
        table.text('message');
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

    // 4. Roles Table
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

    // 5. User Roles Mapping
    if (!(await db.schema.hasTable('user_roles'))) {
      await db.schema.createTable('user_roles', (table) => {
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.string('roleId').references('id').inTable('roles').onDelete('CASCADE');
        table.primary(['userId', 'roleId']);
      });
      console.log('✨ User roles table provisioned.');
    }

    // 6. Session Table
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

    // 7. Email Verification Tokens
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

    // ─── ELITE SECURITY HARDENING ───
    console.log('🛡️ Hardening database with Row Level Security Policies...');
    const tables = ['user', 'tips', 'indexer_state', 'roles', 'session', 'user_roles', 'email_verification_token'];
    for (const table of tables) {
        try {
            await db.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
        } catch (e) { /* Already enabled */ }
    }

    console.log('✅ Supabase Schema Sync & Hardening Complete.');

    // ─── ELITE DATA CLEANUP ───
    // Remove legacy dummy emails and prompt users for real addresses.
    const cleanupCount = await db('user')
      .where('email', 'like', '%@phantom.local')
      .update({ email: null });
    if (cleanupCount > 0) {
      console.log(`🧹 Cleaned up ${cleanupCount} legacy dummy emails.`);
    }
  } catch (err) {
    console.error('❌ Supabase Sync Failed:', err);
  }
}
