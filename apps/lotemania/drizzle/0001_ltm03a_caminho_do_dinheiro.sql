CREATE TYPE "public"."payment_webhook_match_state" AS ENUM('received', 'unauthenticated', 'unsupported_provider', 'invalid_payload', 'not_actionable', 'unmatched', 'amount_mismatch', 'unit_conflict', 'already_settled', 'refund_pending', 'settled');--> statement-breakpoint
ALTER TYPE "public"."payment_gateway_provider" ADD VALUE 'paysure' BEFORE 'resetpay';--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD COLUMN "payment_id" text;--> statement-breakpoint
ALTER TABLE "banking_transactions" ADD COLUMN "end_to_end_id" text;--> statement-breakpoint
ALTER TABLE "payment_gateways" ADD COLUMN "webhook_token" text;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD COLUMN "external_event_id" text;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD COLUMN "match_state" "payment_webhook_match_state" DEFAULT 'received' NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD COLUMN "match_reason" text;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD COLUMN "delivery_count" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "payment_webhook_events" ADD COLUMN "amount_cents" integer;--> statement-breakpoint
CREATE UNIQUE INDEX "payment_webhook_events_idempotency_idx" ON "payment_webhook_events" USING btree ("tenant_id","provider","external_event_id");--> statement-breakpoint
CREATE INDEX "payment_webhook_events_tenant_received_idx" ON "payment_webhook_events" USING btree ("tenant_id","received_at");