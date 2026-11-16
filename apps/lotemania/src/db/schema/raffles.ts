import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  integer,
  numeric,
  varchar,
  boolean,
  jsonb,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./core";
import { tenants } from "./tenants";

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "active",
  "finished",
  "canceled",
]);

export const productPrivacyEnum = pgEnum("product_privacy", [
  "public",
  "private",
]);

export const ticketStatusEnum = pgEnum("ticket_status", [
  "available",
  "reserved",
  "sold",
]);

export const orderStatusEnum = pgEnum("order_status", [
  "pending",
  "paid",
  "expired",
  "refunded",
  "canceled",
]);

// A raffle (sorteio): numbered tickets sold toward a prize draw.
export const products = pgTable(
  "products",
  {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  slug: varchar("slug", { length: 255 }).notNull(),
  description: text("description"),
  category: varchar("category", { length: 64 }),
  status: productStatusEnum("status").notNull().default("draft"),
  privacy: productPrivacyEnum("privacy").notNull().default("public"),
  pricePerNumber: numeric("price_per_number", {
    precision: 12,
    scale: 2,
  }).notNull(),
  totalNumbers: integer("total_numbers").notNull(),
  drawDate: timestamp("draw_date", { withTimezone: true }),
  imageUrl: text("image_url"),
  // Everything from the other ~12 configuration tabs (Títulos, Prêmios,
  // Pagamento, Promoções, Alertas, Upsell, Anti-Spam, Suporte,
  // Capitalizadora, Restrições, ...) lives here as one structured blob
  // instead of a few dozen dedicated columns — see
  // ProductAdvancedSettings in validations/product.ts for its shape.
  advancedSettings: jsonb("advanced_settings").notNull().default({}),
  isFavorite: boolean("is_favorite").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  },
  (table) => [uniqueIndex("products_tenant_slug_idx").on(table.tenantId, table.slug)],
);

// One row per sellable ticket number. Indexed by (productId, number).
export const productNumbers = pgTable("product_numbers", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  number: integer("number").notNull(),
  status: ticketStatusEnum("status").notNull().default("available"),
  orderId: uuid("order_id"),
  reservedUntil: timestamp("reserved_until", { withTimezone: true }),
});

export const orders = pgTable("orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id),
  affiliateId: uuid("affiliate_id"),
  quantity: integer("quantity").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: orderStatusEnum("status").notNull().default("pending"),
  paymentGatewayProvider: varchar("payment_gateway_provider", {
    length: 64,
  }),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// --- Bonus games, each tied to a raffle product ---

export const awardedBoxes = pgTable("awarded_boxes", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  totalBoxes: integer("total_boxes").notNull(),
  prizes: jsonb("prizes").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

export const awardedBoxCombos = pgTable("awarded_box_combos", {
  id: uuid("id").primaryKey().defaultRandom(),
  awardedBoxId: uuid("awarded_box_id")
    .notNull()
    .references(() => awardedBoxes.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
});

export const rewardSpins = pgTable("reward_spins", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  segments: jsonb("segments").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

export const rewardSpinCombos = pgTable("reward_spin_combos", {
  id: uuid("id").primaryKey().defaultRandom(),
  rewardSpinId: uuid("reward_spin_id")
    .notNull()
    .references(() => rewardSpins.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
});

export const scratchCards = pgTable("scratch_cards", {
  id: uuid("id").primaryKey().defaultRandom(),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  prizes: jsonb("prizes").notNull().default([]),
  isActive: boolean("is_active").notNull().default(true),
});

// Winners announced for a raffle — set by the operator's "Definir
// ganhadores" action, shown on the public Ganhadores feed as social
// proof. Independent of orders so a prize can be recorded even for a
// manually-picked or external draw.
export const winners = pgTable("winners", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  productId: uuid("product_id")
    .notNull()
    .references(() => products.id, { onDelete: "cascade" }),
  winnerName: text("winner_name").notNull(),
  phone: varchar("phone", { length: 32 }),
  prizeDescription: text("prize_description").notNull(),
  prizeAmount: numeric("prize_amount", { precision: 12, scale: 2 }),
  winningNumber: integer("winning_number"),
  announcedAt: timestamp("announced_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const scratchCardCombos = pgTable("scratch_card_combos", {
  id: uuid("id").primaryKey().defaultRandom(),
  scratchCardId: uuid("scratch_card_id")
    .notNull()
    .references(() => scratchCards.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
});

export const bonusGameKindEnum = pgEnum("bonus_game_kind", [
  "awardedBox",
  "rewardSpin",
  "scratchCard",
]);

// One purchased play of a bonus game (spin, scratch, or box pick). The
// outcome is drawn server-side only after payment, from that game's own
// configured items/prizes — never trust a client-submitted result.
export const bonusGamePlays = pgTable("bonus_game_plays", {
  id: uuid("id").primaryKey().defaultRandom(),
  tenantId: uuid("tenant_id")
    .notNull()
    .references(() => tenants.id, { onDelete: "cascade" }),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  kind: bonusGameKindEnum("kind").notNull(),
  parentId: uuid("parent_id").notNull(),
  comboId: uuid("combo_id"),
  quantity: integer("quantity").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  status: varchar("status", { length: 16 }).notNull().default("pending"),
  outcome: jsonb("outcome"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});
