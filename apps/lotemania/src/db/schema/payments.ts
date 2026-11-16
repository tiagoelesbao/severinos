import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  numeric,
  varchar,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { orders } from "./raffles";
import { tenants } from "./tenants";

export const transactionTypeEnum = pgEnum("transaction_type", [
  "credit",
  "debit",
]);

export const paymentRequestStatusEnum = pgEnum("payment_request_status", [
  "pending",
  "approved",
  "rejected",
  "paid",
]);

export const bankAccounts = pgTable("bank_accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  bankName: text("bank_name").notNull(),
  holderName: text("holder_name").notNull(),
  document: varchar("document", { length: 20 }),
  pixKey: text("pix_key"),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const bankingTransactions = pgTable("banking_transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  bankAccountId: uuid("bank_account_id").references(() => bankAccounts.id),
  type: transactionTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  description: text("description"),
  externalReference: text("external_reference"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const paymentRequests = pgTable("payment_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
  status: paymentRequestStatusEnum("status").notNull().default("pending"),
  requestedAt: timestamp("requested_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  processedAt: timestamp("processed_at", { withTimezone: true }),
});

// One configurable gateway per (tenant, provider), instead of 18 bespoke
// `/api/<provider>/webhook` routes shared globally. `credentialsEncrypted`
// holds each operator's own provider API keys sealed with an app-level
// key (never plaintext). `webhookSecret` is required to verify inbound
// signatures — every gateway must set one before `isActive` can be turned
// on. Because credentials are per-tenant, the inbound webhook URL must
// carry the tenant slug too (see /api/webhooks/payment/[tenant]/[provider]).
export const paymentGatewayProviderEnum = pgEnum("payment_gateway_provider", [
  "apipay",
  "authbank",
  "basspago",
  "codetech",
  "e2pay",
  "efipay",
  "fyhub",
  "hyperwallet",
  "infopago",
  "metapay",
  "mutualpay",
  "nexo",
  "onlyup",
  "paggue",
  "pagstar",
  "pay2m",
  "resetpay",
  "starkbank",
]);

export const paymentGateways = pgTable(
  "payment_gateways",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: paymentGatewayProviderEnum("provider").notNull(),
    credentialsEncrypted: text("credentials_encrypted"),
    webhookSecret: text("webhook_secret"),
    config: jsonb("config").notNull().default({}),
    isActive: boolean("is_active").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_gateways_tenant_provider_idx").on(
      table.tenantId,
      table.provider,
    ),
  ],
);

// Audit trail for every inbound webhook call, verified or not —
// the original system gave no visibility into this.
export const paymentWebhookEvents = pgTable("payment_webhook_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id").references(() => tenants.id, {
    onDelete: "set null",
  }),
  provider: paymentGatewayProviderEnum("provider").notNull(),
  signatureValid: boolean("signature_valid").notNull(),
  payload: jsonb("payload").notNull(),
  orderId: uuid("order_id").references(() => orders.id),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const capitalizers = pgTable("capitalizers", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  susepProcessNumber: varchar("susep_process_number", { length: 64 }),
  terms: text("terms"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
