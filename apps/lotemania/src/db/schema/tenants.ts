import { pgTable, uuid, text, varchar, boolean, timestamp } from "drizzle-orm/pg-core";

// One row per white-label operator (e.g. "Imperio"). Every domain table
// in the platform carries a tenantId so each operator's campaigns,
// customers, and money stay fully isolated from every other operator
// running on Lotemania.
export const tenants = pgTable("tenants", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 64 }).notNull().unique(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  customDomain: varchar("custom_domain", { length: 255 }),
  customDomainVerified: boolean("custom_domain_verified").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});
