CREATE TYPE "public"."order_unit" AS ENUM('title', 'half');--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "unit" "order_unit" DEFAULT 'title' NOT NULL;--> statement-breakpoint
ALTER TABLE "winners" ADD COLUMN "winning_half" integer;