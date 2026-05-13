-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "authexchangecode" (
	"id" text PRIMARY KEY NOT NULL,
	"sessionId" text,
	"codeHash" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"usedAt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "authexchangecode" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"type" text DEFAULT 'info',
	"data" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pajcash_reference" text NOT NULL,
	"status" text NOT NULL,
	"amount_ngn" numeric(20, 2) NOT NULL,
	"wallet_address" text NOT NULL,
	"raw_payload" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	"user_id" text,
	CONSTRAINT "payouts_pajcash_reference_key" UNIQUE("pajcash_reference")
);
--> statement-breakpoint
ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tips" (
	"signature" varchar(255) PRIMARY KEY NOT NULL,
	"slot" bigint NOT NULL,
	"timestamp" timestamp with time zone NOT NULL,
	"sender" varchar(255) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"amount" numeric(20, 8) NOT NULL,
	"tokenMint" varchar(255) NOT NULL,
	"tokenSymbol" varchar(255) NOT NULL,
	"status" varchar(255) DEFAULT 'confirmed',
	"type" varchar(255) DEFAULT 'tip',
	"sender_id" text,
	"recipient_id" text,
	"metadata" text,
	"recipient_hash" varchar(255),
	"sender_hash" varchar(255)
);
--> statement-breakpoint
ALTER TABLE "tips" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "password_reset_token" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"tokenHash" varchar(255) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "password_reset_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fiat_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reference" varchar(255) NOT NULL,
	"tx_hash" varchar(255),
	"destination_wallet" varchar(255),
	"status" varchar(255),
	"event_type" varchar(255),
	"payload_digest" varchar(255),
	"payload_json" text,
	"processing_state" varchar(255) DEFAULT 'received',
	"error_message" text,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "fiat_webhook_events_reference_unique" UNIQUE("reference"),
	CONSTRAINT "fiat_webhook_events_tx_hash_unique" UNIQUE("tx_hash"),
	CONSTRAINT "fiat_webhook_events_payload_digest_unique" UNIQUE("payload_digest")
);
--> statement-breakpoint
ALTER TABLE "fiat_webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "session" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"expiresAt" timestamp with time zone,
	"userAgent" varchar(255),
	"ip" varchar(255),
	"revokedAt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"email" varchar(255),
	"name" varchar(255),
	"passwordHash" varchar(255),
	"googleSub" varchar(255),
	"twitterHandle" varchar(255),
	"discordHandle" varchar(255),
	"walletAddress" varchar(255),
	"emailVerifiedAt" timestamp with time zone,
	"profileData" text,
	"lastLoginAt" timestamp with time zone,
	"deletedAt" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"solDomain" varchar(255),
	"onboardingComplete" boolean DEFAULT false,
	"encryptedWalletAddress" text,
	"walletAddressHash" text,
	"whitelisted_origins" text,
	"totalTipsUSDC" numeric(20, 8) DEFAULT '0',
	"yield_enabled" boolean DEFAULT false,
	"gasless_enabled" boolean DEFAULT false,
	CONSTRAINT "user_email_unique" UNIQUE("email"),
	CONSTRAINT "user_twitterhandle_unique" UNIQUE("twitterHandle"),
	CONSTRAINT "user_discordhandle_unique" UNIQUE("discordHandle"),
	CONSTRAINT "user_walletaddress_unique" UNIQUE("walletAddress"),
	CONSTRAINT "user_soldomain_unique" UNIQUE("solDomain")
);
--> statement-breakpoint
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "roles" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "fiat_payment_intents" (
	"intent_id" varchar(255) PRIMARY KEY NOT NULL,
	"creator_id" varchar(255),
	"destination_wallet" varchar(255) NOT NULL,
	"amount_usd" numeric(20, 8) NOT NULL,
	"status" varchar(255) DEFAULT 'requires_action',
	"provider" varchar(255) DEFAULT 'fossapay',
	"provider_session_id" varchar(255),
	"sender_name" varchar(255),
	"memo" text,
	"metadata_json" text,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fiat_payment_intents" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "transactions_raw" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"signature" varchar(255) NOT NULL,
	"payload" text NOT NULL,
	"source" varchar(255) DEFAULT 'helius_webhook',
	"status" varchar(255) DEFAULT 'pending',
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "transactions_raw" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "admin_audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"admin_id" varchar(255),
	"action_type" varchar(255) NOT NULL,
	"target_id" varchar(255),
	"metadata_json" text,
	"ip_address" varchar(255),
	"timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "indexer_state" (
	"address" varchar(255) PRIMARY KEY NOT NULL,
	"lastIndexedSlot" bigint DEFAULT '0',
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
ALTER TABLE "indexer_state" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_clients" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"name" varchar(255) NOT NULL,
	"secretHash" varchar(255) NOT NULL,
	"redirectUris" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "oauth_clients" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"clientId" varchar(255),
	"userId" varchar(255),
	"accessTokenHash" varchar(255) NOT NULL,
	"refreshTokenHash" varchar(255),
	"expiresAt" timestamp with time zone NOT NULL,
	"scope" varchar(255),
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "oauth_tokens_accesstokenhash_unique" UNIQUE("accessTokenHash"),
	CONSTRAINT "oauth_tokens_refreshtokenhash_unique" UNIQUE("refreshTokenHash")
);
--> statement-breakpoint
ALTER TABLE "oauth_tokens" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "email_verification_token" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"email" varchar(255) NOT NULL,
	"tokenHash" varchar(255) NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "email_verification_token" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user_roles" (
	"userId" varchar(255) NOT NULL,
	"roleId" varchar(255) NOT NULL,
	CONSTRAINT "user_roles_pkey" PRIMARY KEY("userId","roleId")
);
--> statement-breakpoint
ALTER TABLE "user_roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "analytics_daily" (
	"date" date NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"volume_usdc" numeric(20, 8) DEFAULT '0',
	"tip_count" integer DEFAULT 0,
	CONSTRAINT "analytics_daily_pkey" PRIMARY KEY("date","user_id")
);
--> statement-breakpoint
ALTER TABLE "analytics_daily" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_token" ADD CONSTRAINT "password_reset_token_userid_foreign" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userid_foreign" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fiat_payment_intents" ADD CONSTRAINT "fiat_payment_intents_creator_id_foreign" FOREIGN KEY ("creator_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_audit_logs" ADD CONSTRAINT "admin_audit_logs_admin_id_foreign" FOREIGN KEY ("admin_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_clients" ADD CONSTRAINT "oauth_clients_userid_foreign" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_clientid_foreign" FOREIGN KEY ("clientId") REFERENCES "public"."oauth_clients"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_tokens" ADD CONSTRAINT "oauth_tokens_userid_foreign" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_verification_token" ADD CONSTRAINT "email_verification_token_userid_foreign" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleid_foreign" FOREIGN KEY ("roleId") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userid_foreign" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_daily" ADD CONSTRAINT "analytics_daily_user_id_foreign" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tips_recipient" ON "tips" USING btree ("recipient" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tips_recipient_id" ON "tips" USING btree ("recipient_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tips_sender" ON "tips" USING btree ("sender" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tips_sender_id" ON "tips" USING btree ("sender_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_tips_timestamp" ON "tips" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "tips_recipient_hash_index" ON "tips" USING btree ("recipient_hash" text_ops);--> statement-breakpoint
CREATE INDEX "tips_recipient_index" ON "tips" USING btree ("recipient" text_ops);--> statement-breakpoint
CREATE INDEX "tips_sender_hash_index" ON "tips" USING btree ("sender_hash" text_ops);--> statement-breakpoint
CREATE INDEX "tips_sender_index" ON "tips" USING btree ("sender" text_ops);--> statement-breakpoint
CREATE INDEX "tips_timestamp_index" ON "tips" USING btree ("timestamp" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "fiat_webhook_events_destination_wallet_index" ON "fiat_webhook_events" USING btree ("destination_wallet" text_ops);--> statement-breakpoint
CREATE INDEX "fiat_webhook_events_payload_digest_index" ON "fiat_webhook_events" USING btree ("payload_digest" text_ops);--> statement-breakpoint
CREATE INDEX "fiat_webhook_events_processing_state_index" ON "fiat_webhook_events" USING btree ("processing_state" text_ops);--> statement-breakpoint
CREATE INDEX "fiat_webhook_events_reference_index" ON "fiat_webhook_events" USING btree ("reference" text_ops);--> statement-breakpoint
CREATE INDEX "fiat_webhook_events_status_index" ON "fiat_webhook_events" USING btree ("status" text_ops);--> statement-breakpoint
CREATE INDEX "fiat_webhook_events_tx_hash_index" ON "fiat_webhook_events" USING btree ("tx_hash" text_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "user_wallet_hash_idx" ON "user" USING btree ("walletAddressHash" text_ops);--> statement-breakpoint
CREATE INDEX "fiat_payment_intents_destination_wallet_index" ON "fiat_payment_intents" USING btree ("destination_wallet" text_ops);--> statement-breakpoint
CREATE INDEX "fiat_payment_intents_status_index" ON "fiat_payment_intents" USING btree ("status" text_ops);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "authexchangecode" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "notifications" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "payouts" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Authenticated users can create tips" ON "tips" AS PERMISSIVE FOR INSERT TO public WITH CHECK ((auth.role() = 'authenticated'::text));--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "tips" AS PERMISSIVE FOR ALL TO "service_role";--> statement-breakpoint
CREATE POLICY "Tips are publicly readable" ON "tips" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Users can only view their own tips" ON "tips" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "password_reset_token" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "fiat_webhook_events" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "session" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "user" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Users can only update their own profile" ON "user" AS PERMISSIVE FOR UPDATE TO public;--> statement-breakpoint
CREATE POLICY "Users can only view their own profile" ON "user" AS PERMISSIVE FOR SELECT TO public;--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "roles" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "fiat_payment_intents" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "indexer_state" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "oauth_clients" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "oauth_tokens" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "email_verification_token" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "user_roles" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "Internal Access Only" ON "analytics_daily" AS PERMISSIVE FOR ALL TO "service_role" USING (true) WITH CHECK (true);
*/