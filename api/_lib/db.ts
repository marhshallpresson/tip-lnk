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
        ssl: { rejectUnauthorized: false }
      },
      pool: {
        min: 0,
        max: 5,
        idleTimeoutMillis: 10000,
        createTimeoutMillis: 30000,
        acquireTimeoutMillis: 30000,
        propagateCreateError: false
      }
    }
  : {
    client: 'sqlite3',
    connection: {
        filename: process.env.SQLITE_DATABASE_PATH || path.join(__dirname, '../../dev.db')
      },
      useNullAsDefault: true
    };

const dbInstance = knex(config);

export const db = dbInstance;
export { dbInstance as knex };
export default dbInstance;

import { getSolPrice } from './price.js';
import { decrypt } from './crypto.js';

/**
 * Professional Ledger Utility
 * Calculates current spendable balance for a user.
 */
export async function getCreatorBalance(userId: string) {
    if (!userId) return { totalTipsUSD: 0, totalWithdrawnUSD: 0, balance: 0 };

    try {
        const user = await db('user').where({ id: userId }).first();
        if (!user) return { totalTipsUSD: 0, totalWithdrawnUSD: 0, balance: 0 };

        const address = user.walletAddress || (user.encryptedWalletAddress ? decrypt(user.encryptedWalletAddress) : null);
        if (!address) return { totalTipsUSD: 0, totalWithdrawnUSD: 0, balance: 0 };

        const tips = await db('tips')
            .where({ recipient_id: userId, status: 'confirmed' })
            .orWhere({ recipient: address, status: 'confirmed' });
        
        const solPrice = await getSolPrice();

        const totalTipsUSD = tips.reduce((acc, tip) => {
            const amount = Number(tip.amount);
            if (tip.tokenSymbol === 'SOL') {
                return acc + (amount * solPrice);
            }
            return acc + amount;
        }, 0);
        
        const payoutRows = await db('payouts')
            .where({ wallet_address: address })
            .whereIn('status', ['pending', 'processing', 'submitted', 'completed']);

        const totalWithdrawnUSD = payoutRows.reduce((acc, payout) => {
            try {
                const raw = payout.raw_payload ? JSON.parse(payout.raw_payload) : {};
                const amountUSDC = Number(raw.amountUSDC || raw.amount_usdc || 0);
                if (Number.isFinite(amountUSDC) && amountUSDC > 0) return acc + amountUSDC;
            } catch {}
            return acc + (Number(payout.amount_ngn || 0) / 1500);
        }, 0);

        return {
            totalTipsUSD,
            totalWithdrawnUSD,
            balance: totalTipsUSD - totalWithdrawnUSD
        };
    } catch (err) {
        console.error('🛡️ Ledger Fault:', err);
        return { totalTipsUSD: 0, totalWithdrawnUSD: 0, balance: 0 };
    }
}

let schemaInitPromise: Promise<void> | null = null;

export function initSchema() {
  if (!schemaInitPromise) {
    schemaInitPromise = initSchemaInternal();
  }
  return schemaInitPromise;
}

initSchema().catch(err => {
});

/**
 * Production Schema Initialization
 * Automatically creates and hardens tables on your Supabase instance.
 */
async function initSchemaInternal() {
  try {
    console.log('🛡️ initSchema: Starting...');
    if (!(await db.schema.hasTable('user'))) {
      console.log('🛡️ initSchema: Creating user table...');
      await db.schema.createTable('user', (table) => {
        table.string('id').primary(); 
        table.string('email').unique();
        table.string('name');
        table.string('passwordHash');
        table.string('googleSub');
        table.string('twitterHandle').unique();
        table.string('discordHandle').unique();
        table.string('walletAddress').unique(); // Deprecated: move to encrypted
        table.string('encryptedWalletAddress');
        table.string('walletAddressHash').unique().index();
        table.string('solDomain').unique();
        table.boolean('auto_convert_usdc').defaultTo(true);
        table.boolean('yield_enabled').defaultTo(false);
        table.boolean('gasless_enabled').defaultTo(false);
        table.boolean('onboardingComplete').defaultTo(false);
        table.integer('followers_count').defaultTo(0);
        table.integer('following_count').defaultTo(0);
        table.string('bio', 1000);
        table.string('location');
        table.dateTime('emailVerifiedAt');
        table.text('profileData');
        table.dateTime('lastLoginAt');
        table.dateTime('deletedAt');
        table.timestamps(true, true);
      });
    } else {
        const hasSolDomain = await db.schema.hasColumn('user', 'solDomain');
        if (!hasSolDomain) {
            await db.schema.table('user', (table) => {
                table.string('solDomain').unique();
            });
            console.log('🛡️ Migration: Added solDomain column to user table.');
        }

        const hasOnboardingComplete = await db.schema.hasColumn('user', 'onboardingComplete');
        if (!hasOnboardingComplete) {
            await db.schema.table('user', (table) => {
                table.boolean('onboardingComplete').defaultTo(false);
            });
            console.log('🛡️ Migration: Added onboardingComplete column to user table.');
        }

        const hasYieldEnabled = await db.schema.hasColumn('user', 'yield_enabled');
        if (!hasYieldEnabled) {
            await db.schema.table('user', (table) => {
                table.boolean('yield_enabled').defaultTo(false);
            });
            console.log('🛡️ Migration: Added yield_enabled column to user table.');
        }

        const hasGaslessEnabled = await db.schema.hasColumn('user', 'gasless_enabled');
        if (!hasGaslessEnabled) {
            await db.schema.table('user', (table) => {
                table.boolean('gasless_enabled').defaultTo(false);
            });
            console.log('🛡️ Migration: Added gasless_enabled column to user table.');
        }

        const hasEncryptedWallet = await db.schema.hasColumn('user', 'encryptedWalletAddress');
        if (!hasEncryptedWallet) {
            await db.schema.table('user', (table) => {
                table.string('encryptedWalletAddress');
                table.string('walletAddressHash').unique().index();
            });
            console.log('🛡️ Migration: Added encrypted address columns to user table.');
        }

        const tipsTableExists = await db.schema.hasTable('tips');
        const hasTipIds = tipsTableExists ? await db.schema.hasColumn('tips', 'recipient_id') : true;
        if (!hasTipIds) {
            await db.schema.table('tips', (table) => {
                table.string('sender_id').references('id').inTable('user').onDelete('SET NULL');
                table.string('recipient_id').references('id').inTable('user').onDelete('SET NULL');
            });
            console.log('🛡️ Migration: Added user ID relations to tips table.');
        }

        const payoutsTableExists = await db.schema.hasTable('payouts');
        const hasPayoutUserId = payoutsTableExists ? await db.schema.hasColumn('payouts', 'user_id') : true;
        if (!hasPayoutUserId) {
            await db.schema.table('payouts', (table) => {
                table.string('user_id').references('id').inTable('user').onDelete('SET NULL');
            });
            console.log('🛡️ Migration: Added user_id column to payouts table.');
        }

        const hasWhitelistedOrigins = await db.schema.hasColumn('user', 'whitelisted_origins');
        if (!hasWhitelistedOrigins) {
            await db.schema.table('user', (table) => {
                table.text('whitelisted_origins'); // JSON array of strings
            });
            console.log('🛡️ Migration: Added whitelisted_origins column to user table.');
        }

        const hasTotalTips = await db.schema.hasColumn('user', 'totalTipsUSDC');
        if (!hasTotalTips) {
            await db.schema.table('user', (table) => {
                table.decimal('totalTipsUSDC', 20, 8).defaultTo(0);
            });
            console.log('🛡️ Migration: Added totalTipsUSDC column to user table.');
        }
    }

    if (!(await db.schema.hasTable('transactions_raw'))) {
      await db.schema.createTable('transactions_raw', (table) => {
        if (db.client.config.client === 'pg') {
          table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        } else {
          table.uuid('id').primary();
        }
        table.string('signature').unique().notNullable();
        table.text('payload').notNullable();
        table.string('source').defaultTo('helius_webhook');
        table.string('status').defaultTo('pending');
        table.timestamps(true, true);
      });
    }

    if (!(await db.schema.hasTable('tips'))) {
      await db.schema.createTable('tips', (table) => {
        table.string('signature').primary();
        table.bigInteger('slot').notNullable();
        table.dateTime('timestamp').notNullable();
        table.string('sender').notNullable().index();
        table.string('sender_id').references('id').inTable('user').onDelete('SET NULL');
        table.string('sender_name');
        table.text('message');
        table.string('recipient').notNullable().index();
        table.string('recipient_id').references('id').inTable('user').onDelete('SET NULL');
        table.decimal('amount', 20, 8).notNullable();
        table.decimal('fee_amount', 20, 8).defaultTo(0);
        table.string('treasury_address');
        table.string('tokenMint').notNullable();
        table.string('tokenSymbol').notNullable();
        table.string('method').defaultTo('crypto');
        table.string('status').defaultTo('confirmed');
        table.string('type').defaultTo('tip');
        table.text('metadata');
      });
      await db.raw('CREATE INDEX IF NOT EXISTS idx_tips_timestamp ON "tips" (timestamp DESC);');
    }

    if (await db.schema.hasTable('tips')) {
      const hasTipMetadata = await db.schema.hasColumn('tips', 'metadata');
      if (!hasTipMetadata) {
        await db.schema.table('tips', (table) => {
          table.text('metadata');
        });
        console.log('🛡️ Migration: Added metadata column to tips table.');
      }
    }

    if (!(await db.schema.hasTable('analytics_daily'))) {
      await db.schema.createTable('analytics_daily', (table) => {
        table.date('date').notNullable();
        table.string('user_id').references('id').inTable('user').onDelete('CASCADE');
        table.decimal('volume_usdc', 20, 8).defaultTo(0);
        table.integer('tip_count').defaultTo(0);
        table.primary(['date', 'user_id']);
      });
    }

    if (!(await db.schema.hasTable('indexer_state'))) {
      await db.schema.createTable('indexer_state', (table) => {
        table.string('address').primary();
        table.bigInteger('lastIndexedSlot').defaultTo(0);
        table.dateTime('updated_at').defaultTo(db.fn.now());
      });
    }

    if (!(await db.schema.hasTable('roles'))) {
      await db.schema.createTable('roles', (table) => {
        table.string('id').primary();
        table.string('name').unique();
        table.timestamps(true, true);
      });
      console.log('✨ Roles table provisioned.');
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
    }

    if (!(await db.schema.hasTable('email_verification_token'))) {
      await db.schema.createTable('email_verification_token', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.string('email').notNullable();
        table.string('tokenHash').notNullable();
        table.dateTime('expiresAt').notNullable();
        table.timestamps(true, true);
      });
    }

    if (!(await db.schema.hasTable('password_reset_token'))) {
      await db.schema.createTable('password_reset_token', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.string('tokenHash').notNullable();
        table.dateTime('expiresAt').notNullable();
        table.timestamps(true, true);
      });
    }

    if (!(await db.schema.hasTable('payouts'))) {
      console.log('🛡️ initSchema: Creating payouts table...');
      await db.schema.createTable('payouts', (table) => {
        if (db.client.config.client === 'pg') {
           table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        } else {
           table.uuid('id').primary();
        }
        table.string('pajcash_reference').unique().notNullable();
        table.string('status').notNullable();
        table.decimal('amount_ngn', 20, 2).notNullable();
        table.string('wallet_address').notNullable();
        table.string('user_id').references('id').inTable('user').onDelete('SET NULL');
        table.text('raw_payload');
        table.timestamps(true, true);
      });
    }

    if (!(await db.schema.hasTable('fiat_payment_intents'))) {
      await db.schema.createTable('fiat_payment_intents', (table) => {
        table.string('intent_id').primary();
        table.string('creator_id').references('id').inTable('user').onDelete('SET NULL');
        table.string('destination_wallet').notNullable().index();
        table.decimal('amount_usd', 20, 8).notNullable();
        table.string('status').defaultTo('requires_action').index();
        table.string('provider').defaultTo('fossapay');
        table.string('provider_session_id');
        table.string('sender_name');
        table.text('memo');
        table.text('metadata_json');
        table.dateTime('completed_at');
        table.timestamps(true, true);
      });
      console.log('🛡️ initSchema: Created fiat_payment_intents table.');
    }

    if (!(await db.schema.hasTable('fiat_webhook_events'))) {
      await db.schema.createTable('fiat_webhook_events', (table) => {
        if (db.client.config.client === 'pg') {
          table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        } else {
          table.uuid('id').primary();
        }
        table.string('reference').notNullable().unique().index();
        table.string('tx_hash').unique().index();
        table.string('destination_wallet').index();
        table.string('status').index();
        table.string('event_type');
        table.string('payload_digest').unique().index();
        table.text('payload_json');
        table.string('processing_state').defaultTo('received').index();
        table.text('error_message');
        table.timestamps(true, true);
      });
      console.log('🛡️ initSchema: Created fiat_webhook_events table.');
    }

    if (!(await db.schema.hasTable('oauth_clients'))) {
      await db.schema.createTable('oauth_clients', (table) => {
        table.string('id').primary();
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.string('name').notNullable();
        table.string('secretHash').notNullable();
        table.string('redirectUris').notNullable();
        table.timestamps(true, true);
      });
    }

    if (!(await db.schema.hasTable('oauth_tokens'))) {
      await db.schema.createTable('oauth_tokens', (table) => {
        table.string('id').primary();
        table.string('clientId').references('id').inTable('oauth_clients').onDelete('CASCADE');
        table.string('userId').references('id').inTable('user').onDelete('CASCADE');
        table.string('accessTokenHash').notNullable().unique();
        table.string('refreshTokenHash').unique();
        table.dateTime('expiresAt').notNullable();
        table.string('scope');
        table.timestamps(true, true);
      });
    }

    const tables = ['user', 'tips', 'indexer_state', 'roles', 'session', 'user_roles', 'email_verification_token', 'password_reset_token', 'payouts', 'fiat_payment_intents', 'fiat_webhook_events', 'oauth_clients', 'oauth_tokens', 'analytics_daily'];
    for (const table of tables) {
        try {
            await db.raw(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
            
            await db.raw(`
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM pg_policies 
                        WHERE tablename = '${table}' AND policyname = 'Internal Access Only'
                    ) THEN
                        CREATE POLICY "Internal Access Only" ON "${table}" 
                        FOR ALL 
                        TO service_role 
                        USING (true) 
                        WITH CHECK (true);
                    END IF;
                END
                $$;
            `);
        } catch (e) { 
        }
    }

    await db('user')
      .where('email', 'like', '%@phantom.local')
      .update({ email: null });

    try {
        const usersToFix = await db('user')
            .where({ onboardingComplete: false })
            .whereNotNull('profileData');
        
        for (const user of usersToFix) {
            try {
                const profile = JSON.parse(user.profileData);
                if (profile.onboardingComplete === true) {
                    await db('user').where({ id: user.id }).update({ onboardingComplete: true });
                    console.log(`🛡️ Recovery: Restored onboarding status for ${user.id}`);
                }
            } catch (e) {}
        }
    } catch (e) {
        console.error('🛡️ Recovery: Failed to execute automated account restoration:', e.message);
    }

  } catch (err: any) {
      console.error('🛡️ initSchema: CRITICAL FAULT:', err.message);
  }
}
