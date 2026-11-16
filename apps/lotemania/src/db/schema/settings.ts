import {
  pgTable,
  uuid,
  text,
  boolean,
  jsonb,
  integer,
  varchar,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { tenants } from "./tenants";

// One row per tenant: white-label branding + security toggles,
// server-driven (matches the original's "Ativar 2FA" / "Ativar
// Captcha" banners being settings-backed, not hardcoded) — and now
// independently configurable per operator, since each white-label
// tenant runs its own brand.
export const settings = pgTable("settings", {
  tenantId: uuid("tenant_id")
    .primaryKey()
    .references(() => tenants.id, { onDelete: "cascade" }),
  siteName: text("site_name").notNull().default("Lotemania"),
  logoUrl: text("logo_url"),
  themeConfig: jsonb("theme_config").notNull().default({}),
  socialMedias: jsonb("social_medias").notNull().default({}),
  requiredSignupFields: jsonb("required_signup_fields")
    .notNull()
    .default(["name", "email", "phone"]),
  twoFactorRequired: boolean("two_factor_required").notNull().default(false),
  captchaEnabled: boolean("captcha_enabled").notNull().default(true),
  philanthropyEnabled: boolean("philanthropy_enabled").notNull().default(false),
  philanthropyDescription: text("philanthropy_description"),
  // Everything from the original's 6-tab "Configurações" screen beyond
  // branding/security above — see siteConfigSchema in
  // validations/site-config.ts for its shape (same jsonb-blob tradeoff
  // used for product advancedSettings).
  siteConfig: jsonb("site_config").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const communications = pgTable("communications", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const faqs = pgTable("faqs", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  answer: text("answer").notNull(),
  sortOrder: integer("sort_order").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const utmLinks = pgTable("utm_links", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  destinationPath: text("destination_path").notNull().default("/"),
  source: varchar("source", { length: 64 }).notNull(),
  medium: varchar("medium", { length: 64 }).notNull(),
  campaign: varchar("campaign", { length: 64 }).notNull(),
  clicks: integer("clicks").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// Static legal/info pages (Termos de Uso, Privacidade, Sobre), one row per
// tenant per page — editable as rich text from the admin.
export const sitePages = pgTable(
  "site_pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    slug: varchar("slug", { length: 32 }).notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("site_pages_tenant_slug_idx").on(table.tenantId, table.slug)],
);
