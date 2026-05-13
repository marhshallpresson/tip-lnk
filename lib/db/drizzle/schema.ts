import { pgTable, pgPolicy, text, timestamp, foreignKey, uuid, boolean, unique, numeric, index, varchar, bigint, uniqueIndex, primaryKey, date, integer } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const authexchangecode = pgTable("authexchangecode", {
	id: text().primaryKey().notNull(),
	sessionId: text(),
	codeHash: text().notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	usedAt: timestamp({ withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: text("user_id"),
	title: text().notNull(),
	body: text().notNull(),
	type: text().default('info'),
	data: text(),
	isRead: boolean("is_read").default(false),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "notifications_user_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const payouts = pgTable("payouts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	pajcashReference: text("pajcash_reference").notNull(),
	status: text().notNull(),
	amountNgn: numeric("amount_ngn", { precision: 20, scale:  2 }).notNull(),
	walletAddress: text("wallet_address").notNull(),
	rawPayload: text("raw_payload"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	userId: text("user_id"),
}, (table) => [
	unique("payouts_pajcash_reference_key").on(table.pajcashReference),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const tips = pgTable("tips", {
	signature: varchar({ length: 255 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	slot: bigint({ mode: "number" }).notNull(),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	sender: varchar({ length: 255 }).notNull(),
	recipient: varchar({ length: 255 }).notNull(),
	amount: numeric({ precision: 20, scale:  8 }).notNull(),
	tokenMint: varchar({ length: 255 }).notNull(),
	tokenSymbol: varchar({ length: 255 }).notNull(),
	status: varchar({ length: 255 }).default('confirmed'),
	type: varchar({ length: 255 }).default('tip'),
	senderId: text("sender_id"),
	recipientId: text("recipient_id"),
	metadata: text(),
	recipientHash: varchar("recipient_hash", { length: 255 }),
	senderHash: varchar("sender_hash", { length: 255 }),
}, (table) => [
	index("idx_tips_recipient").using("btree", table.recipient.asc().nullsLast().op("text_ops")),
	index("idx_tips_recipient_id").using("btree", table.recipientId.asc().nullsLast().op("text_ops")),
	index("idx_tips_sender").using("btree", table.sender.asc().nullsLast().op("text_ops")),
	index("idx_tips_sender_id").using("btree", table.senderId.asc().nullsLast().op("text_ops")),
	index("idx_tips_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	index().using("btree", table.recipientHash.asc().nullsLast().op("text_ops")),
	index().using("btree", table.recipient.asc().nullsLast().op("text_ops")),
	index().using("btree", table.senderHash.asc().nullsLast().op("text_ops")),
	index().using("btree", table.sender.asc().nullsLast().op("text_ops")),
	index().using("btree", table.timestamp.asc().nullsLast().op("timestamptz_ops")),
	pgPolicy("Authenticated users can create tips", { as: "permissive", for: "insert", to: ["public"], withCheck: sql`(auth.role() = 'authenticated'::text)`  }),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"] }),
	pgPolicy("Tips are publicly readable", { as: "permissive", for: "select", to: ["public"] }),
	pgPolicy("Users can only view their own tips", { as: "permissive", for: "select", to: ["public"] }),
]);

export const passwordResetToken = pgTable("password_reset_token", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar({ length: 255 }),
	tokenHash: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "password_reset_token_userid_foreign"
		}).onDelete("cascade"),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const fiatWebhookEvents = pgTable("fiat_webhook_events", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	reference: varchar({ length: 255 }).notNull(),
	txHash: varchar("tx_hash", { length: 255 }),
	destinationWallet: varchar("destination_wallet", { length: 255 }),
	status: varchar({ length: 255 }),
	eventType: varchar("event_type", { length: 255 }),
	payloadDigest: varchar("payload_digest", { length: 255 }),
	payloadJson: text("payload_json"),
	processingState: varchar("processing_state", { length: 255 }).default('received'),
	errorMessage: text("error_message"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index().using("btree", table.destinationWallet.asc().nullsLast().op("text_ops")),
	index().using("btree", table.payloadDigest.asc().nullsLast().op("text_ops")),
	index().using("btree", table.processingState.asc().nullsLast().op("text_ops")),
	index().using("btree", table.reference.asc().nullsLast().op("text_ops")),
	index().using("btree", table.status.asc().nullsLast().op("text_ops")),
	index().using("btree", table.txHash.asc().nullsLast().op("text_ops")),
	unique("fiat_webhook_events_reference_unique").on(table.reference),
	unique("fiat_webhook_events_tx_hash_unique").on(table.txHash),
	unique("fiat_webhook_events_payload_digest_unique").on(table.payloadDigest),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const session = pgTable("session", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar({ length: 255 }),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	userAgent: varchar({ length: 255 }),
	ip: varchar({ length: 255 }),
	revokedAt: timestamp({ withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userid_foreign"
		}),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const user = pgTable("user", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	email: varchar({ length: 255 }),
	name: varchar({ length: 255 }),
	passwordHash: varchar({ length: 255 }),
	googleSub: varchar({ length: 255 }),
	twitterHandle: varchar({ length: 255 }),
	discordHandle: varchar({ length: 255 }),
	walletAddress: varchar({ length: 255 }),
	emailVerifiedAt: timestamp({ withTimezone: true, mode: 'string' }),
	profileData: text(),
	lastLoginAt: timestamp({ withTimezone: true, mode: 'string' }),
	deletedAt: timestamp({ withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	solDomain: varchar({ length: 255 }),
	onboardingComplete: boolean().default(false),
	encryptedWalletAddress: text(),
	walletAddressHash: text(),
	whitelistedOrigins: text("whitelisted_origins"),
	totalTipsUsdc: numeric({ precision: 20, scale:  8 }).default('0'),
	yieldEnabled: boolean("yield_enabled").default(false),
	gaslessEnabled: boolean("gasless_enabled").default(false),
}, (table) => [
	uniqueIndex("user_wallet_hash_idx").using("btree", table.walletAddressHash.asc().nullsLast().op("text_ops")),
	unique("user_email_unique").on(table.email),
	unique("user_twitterhandle_unique").on(table.twitterHandle),
	unique("user_discordhandle_unique").on(table.discordHandle),
	unique("user_walletaddress_unique").on(table.walletAddress),
	unique("user_soldomain_unique").on(table.solDomain),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
	pgPolicy("Users can only update their own profile", { as: "permissive", for: "update", to: ["public"] }),
	pgPolicy("Users can only view their own profile", { as: "permissive", for: "select", to: ["public"] }),
]);

export const roles = pgTable("roles", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	name: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	unique("roles_name_unique").on(table.name),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const fiatPaymentIntents = pgTable("fiat_payment_intents", {
	intentId: varchar("intent_id", { length: 255 }).primaryKey().notNull(),
	creatorId: varchar("creator_id", { length: 255 }),
	destinationWallet: varchar("destination_wallet", { length: 255 }).notNull(),
	amountUsd: numeric("amount_usd", { precision: 20, scale:  8 }).notNull(),
	status: varchar({ length: 255 }).default('requires_action'),
	provider: varchar({ length: 255 }).default('fossapay'),
	providerSessionId: varchar("provider_session_id", { length: 255 }),
	senderName: varchar("sender_name", { length: 255 }),
	memo: text(),
	metadataJson: text("metadata_json"),
	completedAt: timestamp("completed_at", { withTimezone: true, mode: 'string' }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index().using("btree", table.destinationWallet.asc().nullsLast().op("text_ops")),
	index().using("btree", table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.creatorId],
			foreignColumns: [user.id],
			name: "fiat_payment_intents_creator_id_foreign"
		}).onDelete("set null"),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const transactionsRaw = pgTable("transactions_raw", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	signature: varchar({ length: 255 }).notNull(),
	payload: text().notNull(),
	source: varchar({ length: 255 }).default('helius_webhook'),
	status: varchar({ length: 255 }).default('pending'),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const adminAuditLogs = pgTable("admin_audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	adminId: varchar("admin_id", { length: 255 }),
	actionType: varchar("action_type", { length: 255 }).notNull(),
	targetId: varchar("target_id", { length: 255 }),
	metadataJson: text("metadata_json"),
	ipAddress: varchar("ip_address", { length: 255 }),
	timestamp: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	foreignKey({
			columns: [table.adminId],
			foreignColumns: [user.id],
			name: "admin_audit_logs_admin_id_foreign"
		}).onDelete("set null"),
]);

export const indexerState = pgTable("indexer_state", {
	address: varchar({ length: 255 }).primaryKey().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	lastIndexedSlot: bigint({ mode: "number" }).default(sql`'0'`),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const oauthClients = pgTable("oauth_clients", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar({ length: 255 }),
	name: varchar({ length: 255 }).notNull(),
	secretHash: varchar({ length: 255 }).notNull(),
	redirectUris: varchar({ length: 255 }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "oauth_clients_userid_foreign"
		}).onDelete("cascade"),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const oauthTokens = pgTable("oauth_tokens", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	clientId: varchar({ length: 255 }),
	userId: varchar({ length: 255 }),
	accessTokenHash: varchar({ length: 255 }).notNull(),
	refreshTokenHash: varchar({ length: 255 }),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	scope: varchar({ length: 255 }),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.clientId],
			foreignColumns: [oauthClients.id],
			name: "oauth_tokens_clientid_foreign"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "oauth_tokens_userid_foreign"
		}).onDelete("cascade"),
	unique("oauth_tokens_accesstokenhash_unique").on(table.accessTokenHash),
	unique("oauth_tokens_refreshtokenhash_unique").on(table.refreshTokenHash),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const emailVerificationToken = pgTable("email_verification_token", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	userId: varchar({ length: 255 }),
	email: varchar({ length: 255 }).notNull(),
	tokenHash: varchar({ length: 255 }).notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "email_verification_token_userid_foreign"
		}).onDelete("cascade"),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const userRoles = pgTable("user_roles", {
	userId: varchar({ length: 255 }).notNull(),
	roleId: varchar({ length: 255 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.roleId],
			foreignColumns: [roles.id],
			name: "user_roles_roleid_foreign"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "user_roles_userid_foreign"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.userId, table.roleId], name: "user_roles_pkey"}),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);

export const analyticsDaily = pgTable("analytics_daily", {
	date: date().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	volumeUsdc: numeric("volume_usdc", { precision: 20, scale:  8 }).default('0'),
	tipCount: integer("tip_count").default(0),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "analytics_daily_user_id_foreign"
		}).onDelete("cascade"),
	primaryKey({ columns: [table.date, table.userId], name: "analytics_daily_pkey"}),
	pgPolicy("Internal Access Only", { as: "permissive", for: "all", to: ["service_role"], using: sql`true`, withCheck: sql`true`  }),
]);
