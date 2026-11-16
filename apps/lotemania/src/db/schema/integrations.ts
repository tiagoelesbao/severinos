import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const integrationProviderEnum = pgEnum("integration_provider", [
  "captcha",
  "dxmidia",
  "dxhub",
  "liguelead",
  "nexopro",
  "onesignal",
  "paposms",
  "wizebot",
  "z-api",
  "meta-ads",
]);

// One configurable row per (tenant, provider) instead of a bespoke
// endpoint set per integration (the original had 21 separate
// /api/integration/* routes for this, shared globally).
export const integrations = pgTable(
  "integrations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: integrationProviderEnum("provider").notNull(),
    credentialsEncrypted: text("credentials_encrypted"),
    config: jsonb("config").notNull().default({}),
    isActive: boolean("is_active").notNull().default(false),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("integrations_tenant_provider_idx").on(
      table.tenantId,
      table.provider,
    ),
  ],
);

// Operator-configured outbound webhooks (developer-facing).
export const outboundWebhooks = pgTable("outbound_webhooks", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  url: text("url").notNull(),
  events: jsonb("events").notNull().default([]),
  secret: text("secret").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const outboundWebhookDeliveries = pgTable(
  "outbound_webhook_deliveries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    webhookId: uuid("webhook_id")
      .notNull()
      .references(() => outboundWebhooks.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: jsonb("payload").notNull(),
    responseStatus: text("response_status"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
