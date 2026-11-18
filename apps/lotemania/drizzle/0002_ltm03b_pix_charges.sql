CREATE TABLE "pix_charges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"provider" "payment_gateway_provider" NOT NULL,
	"reference_code" text NOT NULL,
	"br_code" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pix_charges" ADD CONSTRAINT "pix_charges_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "pix_charges_order_idx" ON "pix_charges" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pix_charges_tenant_provider_reference_idx" ON "pix_charges" USING btree ("tenant_id","provider","reference_code");