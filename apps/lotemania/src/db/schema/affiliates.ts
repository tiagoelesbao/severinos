import {
  pgTable,
  text,
  uuid,
  timestamp,
  integer,
  numeric,
  varchar,
  boolean,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { products } from "./raffles";
import { tenants } from "./tenants";

export const affiliates = pgTable("affiliates", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  commissionRate: numeric("commission_rate", { precision: 5, scale: 2 })
    .notNull()
    .default("10.00"),
  totalSales: numeric("total_sales", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  totalCommission: numeric("total_commission", { precision: 14, scale: 2 })
    .notNull()
    .default("0"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const discountLinks = pgTable(
  "discount_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    title: text("title").notNull().default(""),
    code: varchar("code", { length: 32 }).notNull(),
    productId: uuid("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    affiliateId: uuid("affiliate_id").references(() => affiliates.id, {
      onDelete: "set null",
    }),
    discountPercent: numeric("discount_percent", { precision: 5, scale: 2 }),
    checkoutType: varchar("checkout_type", { length: 16 }).notNull().default("direto"),
    ticketQuantity: integer("ticket_quantity").notNull().default(0),
    minQuantity: integer("min_quantity").notNull().default(1),
    usageLimit: integer("usage_limit").notNull().default(0),
    perUserLimit: integer("per_user_limit").notNull().default(0),
    reservedCount: integer("reserved_count").notNull().default(0),
    clicks: integer("clicks").notNull().default(0),
    conversions: integer("conversions").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("discount_links_tenant_code_idx").on(table.tenantId, table.code),
  ],
);
