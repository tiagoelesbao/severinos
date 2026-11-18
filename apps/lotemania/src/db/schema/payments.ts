import {
  pgTable,
  pgEnum,
  text,
  uuid,
  timestamp,
  numeric,
  varchar,
  boolean,
  integer,
  jsonb,
  index,
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
  // Os dois identificadores do pagamento, criados pela LTM-03a (item 10 da
  // arquitetura) e preenchidos pelo fechamento.
  //
  // ⚠️ Aresta combinada com a LTM-04: "quem chegar primeiro cria o campo"
  // ficou decidido como A LTM-03a CRIA. A LTM-04 LÊ e expõe no contrato do
  // ETL, e NÃO toca este arquivo — sem essa divisão as duas colidiriam no
  // mesmo arquivo na mesma onda.
  //
  // `paymentId` é a referência do pagamento no provedor (o `reference_code`
  // da Paysure); `endToEndId` é o E2E do arranjo PIX (`end_to_end`), que é o
  // identificador que o Banco Central reconhece e o único que serve para
  // rastrear o dinheiro fora daqui. O ETL do Império já lê os dois da
  // Sorteamos (`client_api.py:508-509`) — aqui eles passam a existir.
  paymentId: text("payment_id"),
  endToEndId: text("end_to_end_id"),
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
// key (never plaintext). Because credentials are per-tenant, the inbound
// webhook URL must carry the tenant slug too.
//
// ⚠️ ESTA É A PRIMEIRA DE DUAS CÓPIAS DA LISTA DE PROVEDORES.
//
// A segunda é `PAYMENT_GATEWAY_PROVIDERS` em
// `src/lib/validations/payment-gateway.ts`, e é DELA que saem os três
// efeitos visíveis (404 da rota, recusa na validação, ausência na tela).
// Acrescentar provedor só aqui não resolve nenhum deles — as duas andam
// juntas. Derivar uma da outra é decisão de @architect e está no Escopo OUT
// da LTM-03a.
//
// Sobre `webhookSecret`: o comentário anterior dizia que "todo gateway tem
// de informar um antes de `isActive` poder ser ligado". Isso deixou de ser
// verdade na LTM-03a, e a razão é do provedor, não nossa: a Paysure NÃO
// ASSINA os avisos — sem HMAC, sem cabeçalho, sem segredo compartilhado
// (`docs/research/2026-11-16-paysure-contrato.md` §2). O campo continua
// existindo e continua obrigatório para provedor que de fato assine
// (`signsWebhooks` na descrição do provedor); a autenticidade de quem não
// assina vem de `webhookToken`, abaixo.
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
  "paysure",
  "resetpay",
  "starkbank",
]);

// O estado de processamento de um aviso recebido (LTM-03a, item 8).
//
// Fail-loud mora AQUI, não no código HTTP. A orientação da Paysure é
// responder sempre 200, mesmo para evento não reconhecido — e a razão é
// concreta: três reentregas não fazem um adaptador aparecer, e depois delas
// o evento é marcado `client_error` no painel DELA, isto é, o problema sai
// da nossa vista. Então cada aviso sai daqui com um estado nomeado e um
// motivo, e a lista do operador (`/dashboard/integrations/payments/events`)
// é o que substitui a reentrega.
export const paymentWebhookMatchStateEnum = pgEnum(
  "payment_webhook_match_state",
  [
    // Gravado antes de qualquer decisão — é o valor padrão, e nenhum caminho
    // de código deve deixar um evento parado nele. Existe para a coluna
    // poder ser NOT NULL sem inventar estado para linha antiga.
    "received",
    // Token da URL ausente/errado, ou assinatura do adaptador inválida.
    "unauthenticated",
    // Provedor na lista, sem adaptador implementado. O estado da `paysure`
    // até a LTM-03b (AC-F2).
    "unsupported_provider",
    // O adaptador não conseguiu traduzir o corpo.
    "invalid_payload",
    // Status que esta story não trata (`refunded`, `expired`): registrado,
    // não aplicado (AC-F3).
    "not_actionable",
    // Verificado, traduzido, e não casa com pedido nenhum (AC-F1).
    "unmatched",
    // Casou, mas o valor não corresponde a `orders.amount` (AC-E3).
    // Pagamento parcial existe, e fechar pedido por menos é entregar título
    // por menos.
    "amount_mismatch",
    // O pedido não tem mais as unidades vendáveis que deveria ter — alguma
    // foi liberada por expiração ou já pertence a outro pedido (AC-C5).
    "unit_conflict",
    // O pedido já estava pago. Reentrega fora da janela de idempotência, ou
    // pagamento simulado antes do aviso.
    "already_settled",
    // Pagamento chegou depois de a reserva expirar e as unidades serem
    // liberadas (AC-C6). O pedido vai para revisão manual COM registro de
    // estorno pendente — e, por construção, sem lançamento em
    // `banking_transactions`.
    "refund_pending",
    // Pedido fechado por este aviso.
    "settled",
  ],
);

export const paymentGateways = pgTable(
  "payment_gateways",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    provider: paymentGatewayProviderEnum("provider").notNull(),
    // Um ÚNICO blob AES-256-GCM com o OBJETO de credencial serializado —
    // `{"ci":"...","cs":"..."}` para a paysure, `{"apiKey":"..."}` para quem
    // usa uma chave só. Era uma string solta, e uma string não cabe os dois
    // cabeçalhos que a Paysure exige: a tela salvaria metade da credencial e
    // toda chamada voltaria 401. A coluna não mudou de tipo e
    // `src/lib/crypto.ts` não mudou de algoritmo — mudou O QUE se cifra.
    //
    // Blob legado em formato de string solta é lido como
    // `{ apiKey: <valor> }` (AC-A2): nenhuma linha existente se perde e
    // nenhuma migração de dado é necessária.
    credentialsEncrypted: text("credentials_encrypted"),
    webhookSecret: text("webhook_secret"),
    // O token opaco que torna a URL do webhook autêntica (LTM-03a, item 2).
    //
    // Emitido por NÓS, por (tenant, provider), e entra no caminho da rota:
    // `/api/webhooks/payment/{tenant}/{provider}/{token}`. É o que substitui
    // a assinatura para provedor que não assina — e a Paysure não assina.
    //
    // Nulável porque linha legada não tem token; sem token a rota tokenizada
    // recusa (nada a comparar), que é falhar fechado.
    webhookToken: text("webhook_token"),
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
//
// A partir da LTM-03a esta tabela faz TRÊS trabalhos, não um:
//
//   1. trilha de auditoria (o que já era);
//   2. CHAVE DE IDEMPOTÊNCIA da entrada — a inserção com unicidade em
//      (tenant_id, provider, external_event_id) é a reivindicação do evento.
//      Quem insere, processa; quem colide, reconhece a duplicata. É o
//      mecanismo do AC-D2, e não "consultei antes de escrever";
//   3. FILA DE REVISÃO do operador — `matchState` + `matchReason` + o
//      `orderId` quando há — porque fail-loud mora no registro, não no
//      código HTTP.
export const paymentWebhookEvents = pgTable(
  "payment_webhook_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").references(() => tenants.id, {
      onDelete: "set null",
    }),
    provider: paymentGatewayProviderEnum("provider").notNull(),
    signatureValid: boolean("signature_valid").notNull(),
    // ⚠️ Mascarado na escrita. Ver `src/lib/payments/redact.ts` (portão G7):
    // o aviso de cash-in traz `payer_name` e `payer_document` (CPF), e nada
    // no fechamento precisa deles.
    payload: jsonb("payload").notNull(),
    orderId: uuid("order_id").references(() => orders.id),
    // A chave composta pelo adaptador: `{fluxo}:{referência}:{status}`.
    //
    // ⚠️ NÃO é o `reference_code` pelado, e a diferença custa dinheiro: o
    // aviso de `paid` e o de `refunded` da MESMA transação chegam com o
    // MESMO `reference_code`. Unicidade só por ele recusaria o estorno como
    // duplicata (AC-D3).
    //
    // Nulável, e aqui o NULL é usado DE PROPÓSITO ao contrário do `half` do
    // ADR-0001: em índice único o Postgres trata NULL como distinto de si
    // mesmo, então todo aviso recusado ANTES de ser traduzido (token errado,
    // assinatura errada, provedor sem adaptador, corpo ilegível) é gravado
    // com NULL e nenhum deles bloqueia a reivindicação de um aviso legítimo
    // com a mesma referência depois. Se guardássemos a referência de um
    // aviso rejeitado, uma entrega falsa com `reference_code` adivinhado
    // bloquearia o pagamento de verdade — negação de serviço de graça.
    externalEventId: text("external_event_id"),
    matchState: paymentWebhookMatchStateEnum("match_state")
      .notNull()
      .default("received"),
    matchReason: text("match_reason"),
    // Quantas vezes ESTE evento foi entregue. A Paysure reentrega três vezes
    // (imediata, ~5 min, ~30 min); a 2ª a 5ª entrega não podem desaparecer
    // (AC-D4) — reentrega invisível é incidente sem rastro.
    deliveryCount: integer("delivery_count").notNull().default(1),
    // O valor que o aviso afirmou, em centavos — a unidade em que o provedor
    // o manda. Fica aqui para a lista do operador poder mostrar "valor"
    // (AC-F4) sem reler e reinterpretar o payload.
    amountCents: integer("amount_cents"),
    receivedAt: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("payment_webhook_events_idempotency_idx").on(
      table.tenantId,
      table.provider,
      table.externalEventId,
    ),
    // A lista do operador (AC-F4) lê por tenant, do mais recente para o mais
    // antigo. É a consulta real, não precaução.
    index("payment_webhook_events_tenant_received_idx").on(
      table.tenantId,
      table.receivedAt,
    ),
  ],
);

// A cobrança PIX criada no provedor (LTM-03b, item 4 da arquitetura).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTA TABELA EXISTE: O 409 DA PAYSURE É IRRECUPERÁVEL SEM ELA
//
// `external_id` repetido devolve **409** — *"Já existe uma transação com
// esse ID Externo"* (§3 do contrato). Isso é idempotência de graça do lado
// do provedor, e o desenho a usa em vez de reimplementá-la. O problema é o
// que o 409 **não** traz: o `content`, isto é, o BR Code.
//
// E a consulta não salva: `POST /v1/pix/cashin/consult` existe (confirmado
// em 2026-11-18, §9.1) e devolve `status`, `reference_code`, `value_cents`,
// `end_to_end` e `payment_date` — **não devolve `content`**. Então, sem a
// nossa linha, um retry deixa o comprador com uma tela sem código para
// pagar e sem caminho de recuperação.
//
// Criar a cobrança passa a ser: ler a nossa linha; se não houver, chamar o
// provedor e gravar. O 409 vira um caminho COM saída — ler o que já temos.
// Se não tivermos (estado que só ocorre se a gravação falhar depois da
// chamada), falha alto para o operador, nunca tela sem código.
//
// As duas unicidades fazem trabalhos diferentes:
//   (order_id)                              uma cobrança por pedido — é o
//                                           espelho do `external_id` único
//                                           que mandamos
//   (tenant_id, provider, reference_code)   a referência do provedor não se
//                                           repete dentro do operador
// ════════════════════════════════════════════════════════════════════════
export const pixCharges = pgTable(
  "pix_charges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id")
      .notNull()
      .references(() => tenants.id, { onDelete: "cascade" }),
    // `orders.id` é o `external_id` que foi para a Paysure. Um pedido, uma
    // cobrança.
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: paymentGatewayProviderEnum("provider").notNull(),
    /** `qrcode.reference_code` — o id da cobrança no provedor. */
    referenceCode: text("reference_code").notNull(),
    /**
     * `qrcode.content` — o BR Code copia-e-cola.
     *
     * É o artefato que o comprador de fato usa, e é o único campo que NÃO
     * dá para recuperar depois: nem o 409 nem a consulta o devolvem.
     */
    brCode: text("br_code").notNull(),
    /**
     * Quando a cobrança expira no provedor.
     *
     * Derivado de `expiration_seconds`, que por sua vez deriva de
     * `RESERVATION_MINUTES` — é a amarração dos dois relógios (AC7). Sem
     * ela o QR dura 24 h (ou 1 h, o padrão da API) para um número que
     * deixou de ser do comprador em 15 minutos.
     */
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex("pix_charges_order_idx").on(table.orderId),
    uniqueIndex("pix_charges_tenant_provider_reference_idx").on(
      table.tenantId,
      table.provider,
      table.referenceCode,
    ),
  ],
);

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
