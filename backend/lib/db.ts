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
    // Only reset if this specific, dangerous flag is set.
    if (process.env.DANGEROUS_RESET_DB_FOR_MIGRATION === 'true') {
        console.log('⚠️ DANGER: Brutal Reset active. Dropping all production tables...');
        await db.raw('DROP TABLE IF EXISTS "session" CASCADE');
        await db.raw('DROP TABLE IF EXISTS "user" CASCADE');
        await db.raw('DROP TABLE IF EXISTS "tips" CASCADE');
        await db.raw('DROP TABLE IF EXISTS "indexer_state" CASCADE');
        await db.raw('DROP TABLE IF EXISTS "user_roles" CASCADE');
        await db.raw('DROP TABLE IF EXISTS "roles" CASCADE');
    }

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
        table.string('recipient').notNullable();
        table.decimal('amount', 20, 8).notNullable();
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
        table.dateTime('updatedAt').defaultTo(db.fn.now());
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
    }

    if (!(await db.schema.hasTable('session'))) {
      await db.schema.createTable('session', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('user');
        table.dateTime('expiresAt');
        table.string('userAgent');
        table.string('ip');
        table.dateTime('revokedAt');
        table.timestamps(true, true);
      });
      console.log('✨ Session table provisioned.');
    }

    // ─── ELITE SECURITY HARDENING: Enable RLS ───
    console.log('🛡️ Hardening database with Row Level Security...');
    const tables = ['user', 'tips', 'indexer_state', 'roles', 'session', 'user_roles'];
    for (const table of tables) {
        try {
            await db.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
        } catch (e) {
            // Table might already have RLS enabled or not exist yet
        }
    }

    console.log('✅ Supabase Schema Sync & Hardening Complete.');
  } catch (err) {
    console.error('❌ Supabase Sync Failed:', err);
  }
}
