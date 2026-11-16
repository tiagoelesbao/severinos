import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  varchar,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

export const userRoleEnum = pgEnum("user_role", [
  "admin",
  "operator",
  "affiliate",
  "subscriber",
]);

export const userStatusEnum = pgEnum("user_status", [
  "active",
  "inactive",
  "blocked",
]);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    name: text("name"),
    socialName: text("social_name"),
    username: varchar("username", { length: 64 }),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 32 }),
    cpf: varchar("cpf", { length: 14 }),
    birthDate: timestamp("birth_date", { withTimezone: true }),
    // Address — collected at full account signup (not the phone-only
    // quick checkout), matching the original's CEP-first address form.
    zipCode: varchar("zip_code", { length: 9 }),
    street: text("street"),
    addressNumber: varchar("address_number", { length: 20 }),
    neighborhood: text("neighborhood"),
    complement: text("complement"),
    passwordHash: text("password_hash"),
    role: userRoleEnum("role").notNull().default("subscriber"),
    status: userStatusEnum("status").notNull().default("active"),
    affiliateCode: varchar("affiliate_code", { length: 32 }),
    city: text("city"),
    state: varchar("state", { length: 2 }),
    twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
    twoFactorSecret: text("two_factor_secret"),
    // Anti-spam: consecutive reservations the user never paid for.
    // Reset to 0 on any paid order; past the configured threshold the
    // user is temporarily blocked from reserving new numbers.
    consecutiveUnpaidReservations: integer("consecutive_unpaid_reservations")
      .notNull()
      .default(0),
    blockedUntil: timestamp("blocked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Emails, phones, and affiliate codes only need to be unique within a
    // tenant — the same person could be a customer of two different
    // operators. Nullable columns: Postgres treats each NULL as distinct,
    // so guest rows without an email/phone never collide.
    uniqueIndex("users_tenant_email_idx").on(table.tenantId, table.email),
    uniqueIndex("users_tenant_username_idx").on(table.tenantId, table.username),
    uniqueIndex("users_tenant_phone_idx").on(table.tenantId, table.phone),
    uniqueIndex("users_tenant_affiliate_code_idx").on(
      table.tenantId,
      table.affiliateCode,
    ),
  ],
);

// Refresh tokens: rotated on use, revocable. Fixes the original system's
// localStorage-only access token with no observed refresh flow.
export const refreshTokens = pgTable("refresh_tokens", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  deviceId: varchar("device_id", { length: 128 }),
  userAgent: text("user_agent"),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const contacts = pgTable("contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 32 }),
  message: text("message"),
  category: varchar("category", { length: 32 }).notNull().default("outro"),
  status: varchar("status", { length: 32 }).notNull().default("open"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// One row per storefront page load: backs the dashboard's Visitas
// Hoje/Ontem/Total cards with real counts instead of static numbers.
export const pageViews = pgTable("page_views", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const blockedNumbers = pgTable(
  "blocked_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    phone: varchar("phone", { length: 32 }).notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("blocked_numbers_tenant_phone_idx").on(
      table.tenantId,
      table.phone,
    ),
  ],
);
