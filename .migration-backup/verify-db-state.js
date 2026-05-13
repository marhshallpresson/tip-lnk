import knex from 'knex';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const db = knex({
  client: 'sqlite3',
  connection: {
    filename: path.join(__dirname, 'dev.db')
  },
  useNullAsDefault: true
});

async function verifyDb() {
  const users = await db('user').select('id', 'email');
  const sessions = await db('session').select('id', 'userId', 'expiresAt');
  console.log('--- DB State ---');
  console.log('Users:', JSON.stringify(users, null, 2));
  console.log('Sessions:', JSON.stringify(sessions, null, 2));
  process.exit(0);
}

verifyDb();
