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
  connection: process.env.DATABASE_URL,
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
    // 1. User Table
    if (!(await db.schema.hasTable('user'))) {
      await db.schema.createTable('user', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
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
    }

    // 3. Indexer State
    if (!(await db.schema.hasTable('indexer_state'))) {
      await db.schema.createTable('indexer_state', (table) => {
        table.string('address').primary();
        table.bigInteger('lastIndexedSlot').defaultTo(0);
        table.dateTime('updatedAt').defaultTo(db.fn.now());
      });
    }

    // 4. Roles & Auth Tables
    if (!(await db.schema.hasTable('roles'))) {
      await db.schema.createTable('roles', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.string('name').unique();
        table.timestamps(true, true);
      });
      await db('roles').insert({ name: 'user' }).onConflict('name').ignore();
    }

    if (!(await db.schema.hasTable('session'))) {
      await db.schema.createTable('session', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('userId').references('id').inTable('user');
        table.dateTime('expiresAt');
        table.string('userAgent');
        table.string('ip');
        table.dateTime('revokedAt');
        table.timestamps(true, true);
      });
    }

    console.log('✅ Supabase Schema Sync Complete.');
  } catch (err) {
    console.error('❌ Supabase Sync Failed:', err);
    // Do not exit process, allow backend to attempt reconnect
  }
}
