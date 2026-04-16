import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbInstance = knex({
  client: 'better-sqlite3',
  connection: {
    filename: path.join(__dirname, '../../data.sqlite'),
  },
  useNullAsDefault: true,
});

export const db = dbInstance;
export { dbInstance as knex };
export default dbInstance;

/**
 * Basic schema initialization for TipLnk Auth
 */
export async function initSchema() {
  if (!(await db.schema.hasTable('user'))) {
    await db.schema.createTable('user', (table) => {
      table.uuid('id').primary();
      table.string('email').unique();
      table.string('name');
      table.string('passwordHash');
      table.string('googleSub');
      table.dateTime('emailVerifiedAt');
      table.text('profileData');
      table.dateTime('lastLoginAt');
      table.dateTime('deletedAt');
      table.timestamps(true, true);
    });
  }

  if (!(await db.schema.hasTable('roles'))) {
    await db.schema.createTable('roles', (table) => {
      table.uuid('id').primary();
      table.string('name').unique();
      table.timestamps(true, true);
    });
    // Seed default role
    await db('roles').insert({ id: '00000000-0000-4000-8000-000000000001', name: 'user' });
  }

  if (!(await db.schema.hasTable('user_roles'))) {
    await db.schema.createTable('user_roles', (table) => {
      table.uuid('userId').references('id').inTable('user').onDelete('CASCADE');
      table.uuid('roleId').references('id').inTable('roles').onDelete('CASCADE');
      table.primary(['userId', 'roleId']);
    });
  }

  if (!(await db.schema.hasTable('emailverificationtoken'))) {
    await db.schema.createTable('emailverificationtoken', (table) => {
      table.uuid('id').primary();
      table.uuid('userId').references('id').inTable('user');
      table.string('tokenHash');
      table.dateTime('expiresAt');
      table.timestamps(true, true);
    });
  }

  if (!(await db.schema.hasTable('authexchangecode'))) {
    await db.schema.createTable('authexchangecode', (table) => {
      table.uuid('id').primary();
      table.string('sessionId');
      table.string('codeHash');
      table.dateTime('expiresAt');
      table.dateTime('usedAt');
      table.timestamps(true, true);
    });
  }

  if (!(await db.schema.hasTable('session'))) {
    await db.schema.createTable('session', (table) => {
      table.uuid('id').primary();
      table.uuid('userId').references('id').inTable('user');
      table.dateTime('expiresAt');
      table.string('userAgent');
      table.string('ip');
      table.dateTime('revokedAt');
      table.timestamps(true, true);
    });
  }
}
