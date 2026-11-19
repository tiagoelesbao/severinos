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
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
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

// A UNIDADE em que `orders.quantity` conta (GLOSSARY → Unidade; LTM-07,
// AC7).
//
// ⚠️ Isto NÃO é redundante com `products.is_divisible`, e a diferença é de
// confiança, não de normalização. `is_divisible` é o estado ATUAL do
// sorteio; `orders.unit` é a unidade em que AQUELE pedido foi contado e
// cobrado, no momento em que nasceu. Derivar a unidade de um pedido antigo
// a partir do sorteio é pedir que o passado seja relido pela configuração
// do presente — e a divisibilidade é congelada justamente para esse
// relato nunca mudar.
//
// `title` é o default porque é o que todo pedido já existente é: 177
// sorteios/semana de cota inteira. Nenhuma linha antiga precisa ser
// reescrita, e nenhuma vira `half` por omissão.
export const orderUnitEnum = pgEnum("order_unit", ["title", "half"]);

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
  // Sorteio divisível (meia cota): cada título vale duas metades vendáveis
  // separadamente — uma linha de product_numbers por metade, ver ADR-0001.
  // Falso é o caso degenerado e historicamente único: cota inteira, uma
  // linha por título com half = 1.
  //
  // Aqui está SÓ o marcador. As regras que o governam — recusar prêmio que
  // não seja em dinheiro ou não divida exato em centavos, congelar na
  // primeira venda, gerar uma ou duas linhas por número — são da LTM-07.
  // A coluna nasce nesta migração (LTM-01) porque a LTM-02 precisa dela
  // para cobrar metade do preço, e ela vem antes da LTM-07.
  isDivisible: boolean("is_divisible").notNull().default(false),
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

// Uma linha por UNIDADE VENDÁVEL, não por título (ADR-0001). Em sorteio
// divisível a unidade é a metade: cem títulos são 200 linhas, com half 1 e
// 2. Em sorteio de cota inteira é uma linha por título, com half = 1.
//
// Chaves declaradas abaixo, e os três índices são os acessos reais do
// código, não precaução:
//   - unique (product_id, number, half) — a invariante de "um dono por
//     linha", que é o que torna atômico o UPDATE condicional por status da
//     reserva (reserve.ts:147-161)
//   - (order_id) — reserve.ts:54, reserve.ts:167 e checkout.ts:22
//   - (status, reserved_until) parcial — a varredura de expiração
//     (reserve.ts:34-46)
//
// order_id NÃO tem chave estrangeira para orders.id. Isso é estado de
// hoje, não decisão registrada: a questão está aberta com
// @architect/@data-engineer (LTM-01, AC8). Enquanto não houver FK, "número
// reservado apontando para pedido inexistente" é um estado que só a
// aplicação e o verificador de invariantes da LTM-05 impedem — o banco
// não impede.
export const productNumbers = pgTable(
  "product_numbers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    // Qual metade do título esta linha é: 1 ou 2. NOT NULL inclusive no
    // caso degenerado de cota inteira, onde vale 1 — e isso não é estilo.
    // Em índice único o Postgres trata NULL como DISTINTO de si mesmo:
    // com a coluna nulável, duas linhas (produto, 42, NULL) conviveriam e
    // a restrição abaixo pararia de proteger em silêncio, sem erro em
    // lugar nenhum.
    half: integer("half").notNull().default(1),
    status: ticketStatusEnum("status").notNull().default("available"),
    orderId: uuid("order_id"),
    reservedUntil: timestamp("reserved_until", { withTimezone: true }),
  },
  (table) => [
    // Sobre a unidade vendável, não sobre o número: duas linhas com o
    // mesmo (product_id, number) e half diferente são o estado CORRETO de
    // todo sorteio divisível. Reduzir esta chave a (product_id, number)
    // torna a meia cota impossível de inserir.
    uniqueIndex("product_numbers_product_number_half_idx").on(
      table.productId,
      table.number,
      table.half,
    ),
    index("product_numbers_order_idx").on(table.orderId),
    // Parcial: as reservas vivas são sempre uma fração mínima da tabela.
    // Um índice cheio pagaria escrita por ~900 mil linhas/ano para
    // encontrar algumas dezenas.
    index("product_numbers_status_reserved_until_idx")
      .on(table.status, table.reservedUntil)
      .where(sql`status = 'reserved'`),
  ],
);

// As três chaves estrangeiras abaixo (tenant_id, user_id, product_id) NÃO
// criam índice no Postgres — só a referência. O único índice declarado aqui
// é o do caminho quente, e cada índice novo custa escrita em todo pedido
// pago (10.550/semana): não se acrescenta um "por garantia", só com a
// consulta real que o escolhe no EXPLAIN (LTM-01, AC4).
export const orders = pgTable(
  "orders",
  {
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
    // `quantity` conta O QUE O PEDIDO CONTÉM — unidades vendáveis, nunca
    // títulos (ADR-0001, custo aceito; LTM-07, AC7). Num sorteio divisível,
    // 3 metades são `quantity = 3`; o título inteiro é `quantity = 2`,
    // porque foram duas linhas de `product_numbers` que a reserva tomou.
    // Num sorteio de cota inteira, 3 títulos são `quantity = 3`.
    //
    // Contar títulos aqui dessincronizaria o pedido do estoque, e isso não é
    // abstrato: `settle-order.ts:220` recusa o fechamento quando
    // `units.length !== order.quantity`. Um pedido que conta títulos e um
    // estoque que conta metades se desencontram em TODA meia cota paga.
    quantity: integer("quantity").notNull(),
    // A unidade em que o `quantity` acima está contado (GLOSSARY →
    // Unidade). Existe para que nenhum consumidor descubra a unidade por
    // adivinhação — e o consumidor que mais importa está fora deste
    // repositório: `services/Meta/imperio-premios/bi_aggregator.py:1128` faz
    // `numeros_vendidos = ("Quantidade", "sum")`. Sob a forma do ADR-0001,
    // "números vendidos" no BI do Império passa a contar METADES em sorteio
    // divisível. O conserto é do lado do BI; esta coluna é o que o torna
    // possível em vez de obrigá-lo a uma heurística sobre o sorteio.
    unit: orderUnitEnum("unit").notNull().default("title"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    status: orderStatusEnum("status").notNull().default("pending"),
    paymentGatewayProvider: varchar("payment_gateway_provider", {
      length: 64,
    }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // Lado `orders` da varredura de expiração e do anti-spam, que é o
    // caminho de toda reserva: reserve.ts:34-46 filtra tenant_id, user_id
    // e status = 'pending' antes de juntar com product_numbers por
    // order_id. Sem este índice, a junção varre orders inteira e o AC5
    // continua falhando mesmo com product_numbers indexada.
    index("orders_tenant_user_status_idx").on(
      table.tenantId,
      table.userId,
      table.status,
    ),
  ],
);

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
  // QUAL metade do título ganhou (LTM-07, AC11). `null` = o título
  // inteiro; 1 ou 2 = uma meia cota nomeada.
  //
  // Sem isto, duas linhas de `winners` com o mesmo `winning_number` — que é
  // o estado CORRETO de um título divisível sorteado com as duas metades
  // vendidas — ficam indistinguíveis de uma duplicata acidental, e o feed
  // público só sabe dizer "42", contra a regra *metade marcada* do
  // GLOSSARY. Quem EXIBE `42 (metade)` é a LTM-08; aqui fica o dado que
  // torna a exibição possível.
  //
  // ⚠️ NULÁVEL de propósito, e o contraste com `product_numbers.half`
  // (NOT NULL, `:127`) é deliberado, não incoerência. Lá o `NULL` seria
  // fatal porque a coluna participa de um ÍNDICE ÚNICO, e em índice único o
  // Postgres trata `NULL` como distinto de si mesmo — a restrição pararia
  // de proteger em silêncio. Aqui não há índice único nenhum, e `NULL`
  // carrega informação real: "não foi meia cota". Marcar 1 num título
  // inteiro seria registrar uma metade que nunca existiu.
  winningHalf: integer("winning_half"),
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
