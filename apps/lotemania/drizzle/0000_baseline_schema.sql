CREATE TYPE "public"."user_role" AS ENUM('admin', 'operator', 'affiliate', 'subscriber');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'inactive', 'blocked');--> statement-breakpoint
CREATE TYPE "public"."bonus_game_kind" AS ENUM('awardedBox', 'rewardSpin', 'scratchCard');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'paid', 'expired', 'refunded', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."product_privacy" AS ENUM('public', 'private');--> statement-breakpoint
CREATE TYPE "public"."product_status" AS ENUM('draft', 'active', 'finished', 'canceled');--> statement-breakpoint
CREATE TYPE "public"."ticket_status" AS ENUM('available', 'reserved', 'sold');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway_provider" AS ENUM('apipay', 'authbank', 'basspago', 'codetech', 'e2pay', 'efipay', 'fyhub', 'hyperwallet', 'infopago', 'metapay', 'mutualpay', 'nexo', 'onlyup', 'paggue', 'pagstar', 'pay2m', 'resetpay', 'starkbank');--> statement-breakpoint
CREATE TYPE "public"."payment_request_status" AS ENUM('pending', 'approved', 'rejected', 'paid');--> statement-breakpoint
CREATE TYPE "public"."transaction_type" AS ENUM('credit', 'debit');--> statement-breakpoint
CREATE TYPE "public"."integration_provider" AS ENUM('captcha', 'dxmidia', 'dxhub', 'liguelead', 'nexopro', 'onesignal', 'paposms', 'wizebot', 'z-api', 'meta-ads');--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"custom_domain" varchar(255),
	"custom_domain_verified" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "blocked_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"phone" varchar(32) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"message" text,
	"category" varchar(32) DEFAULT 'outro' NOT NULL,
	"status" varchar(32) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_views" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"path" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"device_id" varchar(128),
	"user_agent" text,
	"revoked_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text,
	"social_name" text,
	"username" varchar(64),
	"email" varchar(255),
	"phone" varchar(32),
	"cpf" varchar(14),
	"birth_date" timestamp with time zone,
	"zip_code" varchar(9),
	"street" text,
	"address_number" varchar(20),
	"neighborhood" text,
	"complement" text,
	"password_hash" text,
	"role" "user_role" DEFAULT 'subscriber' NOT NULL,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"affiliate_code" varchar(32),
	"city" text,
	"state" varchar(2),
	"two_factor_enabled" boolean DEFAULT false NOT NULL,
	"two_factor_secret" text,
	"consecutive_unpaid_reservations" integer DEFAULT 0 NOT NULL,
	"blocked_until" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "awarded_box_combos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"awarded_box_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "awarded_boxes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"total_boxes" integer NOT NULL,
	"prizes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bonus_game_plays" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"kind" "bonus_game_kind" NOT NULL,
	"parent_id" uuid NOT NULL,
	"combo_id" uuid,
	"quantity" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" varchar(16) DEFAULT 'pending' NOT NULL,
	"outcome" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"affiliate_id" uuid,
	"quantity" integer NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"payment_gateway_provider" varchar(64),
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_numbers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"half" integer DEFAULT 1 NOT NULL,
	"status" "ticket_status" DEFAULT 'available' NOT NULL,
	"order_id" uuid,
	"reserved_until" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(64),
	"status" "product_status" DEFAULT 'draft' NOT NULL,
	"privacy" "product_privacy" DEFAULT 'public' NOT NULL,
	"price_per_number" numeric(12, 2) NOT NULL,
	"total_numbers" integer NOT NULL,
	"is_divisible" boolean DEFAULT false NOT NULL,
	"draw_date" timestamp with time zone,
	"image_url" text,
	"advanced_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_favorite" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_spin_combos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reward_spin_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reward_spins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"segments" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scratch_card_combos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scratch_card_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scratch_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"title" text NOT NULL,
	"prizes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "winners" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"winner_name" text NOT NULL,
	"phone" varchar(32),
	"prize_description" text NOT NULL,
	"prize_amount" numeric(12, 2),
	"winning_number" integer,
	"announced_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "affiliates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"commission_rate" numeric(5, 2) DEFAULT '10.00' NOT NULL,
	"total_sales" numeric(14, 2) DEFAULT '0' NOT NULL,
	"total_commission" numeric(14, 2) DEFAULT '0' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "affiliates_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "discount_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"code" varchar(32) NOT NULL,
	"product_id" uuid,
	"affiliate_id" uuid,
	"discount_percent" numeric(5, 2),
	"checkout_type" varchar(16) DEFAULT 'direto' NOT NULL,
	"ticket_quantity" integer DEFAULT 0 NOT NULL,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"usage_limit" integer DEFAULT 0 NOT NULL,
	"per_user_limit" integer DEFAULT 0 NOT NULL,
	"reserved_count" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"conversions" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bank_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bank_name" text NOT NULL,
	"holder_name" text NOT NULL,
	"document" varchar(20),
	"pix_key" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "banking_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"bank_account_id" uuid,
	"type" "transaction_type" NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"order_id" uuid,
	"description" text,
	"external_reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "capitalizers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"susep_process_number" varchar(64),
	"terms" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_gateways" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "payment_gateway_provider" NOT NULL,
	"credentials_encrypted" text,
	"webhook_secret" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	"status" "payment_request_status" DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "payment_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid,
	"provider" "payment_gateway_provider" NOT NULL,
	"signature_valid" boolean NOT NULL,
	"payload" jsonb NOT NULL,
	"order_id" uuid,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"provider" "integration_provider" NOT NULL,
	"credentials_encrypted" text,
	"config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"webhook_id" uuid NOT NULL,
	"event" text NOT NULL,
	"payload" jsonb NOT NULL,
	"response_status" text,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "outbound_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"url" text NOT NULL,
	"events" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"secret" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faqs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"question" text NOT NULL,
	"answer" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"tenant_id" uuid PRIMARY KEY NOT NULL,
	"site_name" text DEFAULT 'Lotemania' NOT NULL,
	"logo_url" text,
	"theme_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"social_medias" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"required_signup_fields" jsonb DEFAULT '["name","email","phone"]'::jsonb NOT NULL,
	"two_factor_required" boolean DEFAULT false NOT NULL,
	"captcha_enabled" boolean DEFAULT true NOT NULL,
	"philanthropy_enabled" boolean DEFAULT false NOT NULL,
	"philanthropy_description" text,
	"site_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"slug" varchar(32) NOT NULL,
	"title" text NOT NULL,
	"content" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "utm_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"name" text NOT NULL,
	"destination_path" text DEFAULT '/' NOT NULL,
	"source" varchar(64) NOT NULL,
	"medium" varchar(64) NOT NULL,
	"campaign" varchar(64) NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blocked_numbers" ADD CONSTRAINT "blocked_numbers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "page_views" ADD CONSTRAINT "page_views_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awarded_box_combos" ADD CONSTRAINT "awarded_box_combos_awarded_box_id_awarded_boxes_id_fk" FOREIGN KEY ("awarded_box_id") REFERENCES "public"."awarded_boxes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "awarded_boxes" ADD CONSTRAINT "awarded_boxes_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_game_plays" ADD CONSTRAINT "bonus_game_plays_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bonus_game_plays" ADD CONSTRAINT "bonus_game_plays_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_numbers" ADD CONSTRAINT "product_numbers_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_spin_combos" ADD CONSTRAINT "reward_spin_combos_reward_spin_id_reward_spins_id_fk" FOREIGN KEY ("reward_spin_id") REFERENCES "public"."reward_spins"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reward_spins" ADD CONSTRAINT "reward_spins_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scratch_card_combos" ADD CONSTRAINT "scratch_card_combos_scratch_card_id_scratch_cards_id_fk" FOREIGN KEY ("scratch_card_id") REFERENCES "public"."scratch_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scratch_cards" ADD CONSTRAINT "scratch_cards_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winners" ADD CONSTRAINT "winners_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "winners" ADD CONSTRAINT "winners_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "affiliates" ADD CONSTRAINT "affiliates_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_links" ADD CONSTRAINT "discount_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_links" ADD CONSTRAINT "discount_links_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "discount_links" ADD CONSTRAINT "discount_links_affiliate_id_affiliates_id_fk" FOREIGN KEY ("affiliate_id") REFERENCES "public"."affiliates"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD CONSTRAINT "banking_transactions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD CONSTRAINT "banking_transactions_bank_account_id_bank_accounts_id_fk" FOREIGN KEY ("bank_account_id") REFERENCES "public"."bank_accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD CONSTRAINT "banking_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capitalizers" ADD CONSTRAINT "capitalizers_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_gateways" ADD CONSTRAINT "payment_gateways_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_requests" ADD CONSTRAINT "payment_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD CONSTRAINT "payment_webhook_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_webhook_deliveries" ADD CONSTRAINT "outbound_webhook_deliveries_webhook_id_outbound_webhooks_id_fk" FOREIGN KEY ("webhook_id") REFERENCES "public"."outbound_webhooks"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outbound_webhooks" ADD CONSTRAINT "outbound_webhooks_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "communications" ADD CONSTRAINT "communications_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faqs" ADD CONSTRAINT "faqs_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "settings" ADD CONSTRAINT "settings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_pages" ADD CONSTRAINT "site_pages_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "utm_links" ADD CONSTRAINT "utm_links_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_numbers_tenant_phone_idx" ON "blocked_numbers" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_email_idx" ON "users" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_username_idx" ON "users" USING btree ("tenant_id","username");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_phone_idx" ON "users" USING btree ("tenant_id","phone");--> statement-breakpoint
CREATE UNIQUE INDEX "users_tenant_affiliate_code_idx" ON "users" USING btree ("tenant_id","affiliate_code");--> statement-breakpoint
CREATE INDEX "orders_tenant_user_status_idx" ON "orders" USING btree ("tenant_id","user_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "product_numbers_product_number_half_idx" ON "product_numbers" USING btree ("product_id","number","half");--> statement-breakpoint
CREATE INDEX "product_numbers_order_idx" ON "product_numbers" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "product_numbers_status_reserved_until_idx" ON "product_numbers" USING btree ("status","reserved_until") WHERE status = 'reserved';--> statement-breakpoint
CREATE UNIQUE INDEX "products_tenant_slug_idx" ON "products" USING btree ("tenant_id","slug");--> statement-breakpoint
CREATE UNIQUE INDEX "discount_links_tenant_code_idx" ON "discount_links" USING btree ("tenant_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_gateways_tenant_provider_idx" ON "payment_gateways" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "integrations_tenant_provider_idx" ON "integrations" USING btree ("tenant_id","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "site_pages_tenant_slug_idx" ON "site_pages" USING btree ("tenant_id","slug");