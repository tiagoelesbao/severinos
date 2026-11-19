// Seed sintético (LTM-05, AC8).
//
// ZERO dado pessoal. Nenhum nome, telefone, e-mail, CPF ou identificador de
// pagamento real, e nada vindo de amostra do Império — nem anonimizado.
// Tudo aqui é gerado:
//
//   telefone  DDD 00, que não existe no plano de numeração brasileiro:
//             nenhum valor gerado aqui pode ser discado
//   e-mail    domínio .invalid, reservado pela RFC 2606 para exatamente isto
//   nome      rotulado como sintético no próprio texto
//   CPF       nenhum. Não há coluna preenchida com CPF em lugar nenhum
//
// Fidelidade à forma do dado real (risco [Baixo] da story): o seed respeita
// as invariantes que ESTE schema de fato tem —
//
//   • uma linha de `product_numbers` por UNIDADE VENDÁVEL (ADR-0001), com
//     `half` começando em 1;
//   • numeração dos títulos de 0 a totalNumbers-1, que é como a produção
//     gera (`src/lib/actions/products.ts:35-38`), e não 1..N.
//
// O que o seed NÃO importa: o par `numbers`/`quantity`. `orders` não tem
// coluna `numbers` — esse par é invariante do contrato da Sorteamos, lido
// pelo nosso ETL, não deste schema. Os números de um pedido vivem em
// `product_numbers.order_id`.

import { inject } from "vitest";

import { query, queryOne } from "./db";

let sequence = 0;

function nextSeq(): number {
  sequence += 1;
  return sequence;
}

function runId(): string {
  return inject("ltmRunId") || "local";
}

/**
 * Sufixo único por execução, por ARQUIVO e por entidade.
 *
 * O componente aleatório não é redundância com o contador: no Vitest cada
 * arquivo de teste carrega o módulo em sua própria instância, então
 * `nextSeq()` reinicia do 1 em cada um. Com `runId` + sequência apenas, o
 * primeiro tenant de `reserve.test.ts` e o de `webhook.test.ts` nascem com o
 * MESMO slug, e o segundo arquivo morre em `tenants_slug_unique` — foi
 * exatamente o que aconteceu na primeira execução da suíte, em 13 testes.
 *
 * Os arquivos compartilham a base de propósito (provisionar oito vezes
 * deixaria a suíte lenta demais para ser rodada), então o isolamento tem de
 * vir do dado, não do banco.
 */
function uniqueSuffix(): string {
  const aleatorio = Math.random().toString(36).slice(2, 8);
  return `${runId()}-${aleatorio}-${nextSeq()}`;
}

/**
 * Telefone sintético. DDD 00 não existe no plano de numeração brasileiro,
 * então o valor é inequivocamente inventado e não é discável.
 */
export function syntheticPhone(): string {
  return `5500${String(nextSeq()).padStart(7, "0")}`;
}

export function syntheticName(): string {
  return `Comprador sintetico ${nextSeq()}`;
}

export function syntheticEmail(): string {
  return `comprador-${nextSeq()}@example.invalid`;
}

export interface SeededTenant {
  id: string;
  slug: string;
}

export async function createTenant(
  opts: { isActive?: boolean } = {},
): Promise<SeededTenant> {
  const slug = `t-${uniqueSuffix()}`.slice(0, 64);
  return queryOne<SeededTenant>(
    `INSERT INTO tenants (slug, name, is_active)
     VALUES ($1, $2, $3)
     RETURNING id, slug`,
    [slug, `Operador sintetico ${slug}`, opts.isActive ?? true],
  );
}

export interface SeededRaffle {
  id: string;
  slug: string;
  totalNumbers: number;
  halvesPerTitle: number;
  pricePerNumber: string;
  /** Os números do sorteio, 0..totalNumbers-1. */
  numbers: number[];
}

export interface CreateRaffleOptions {
  tenantId: string;
  totalNumbers?: number;
  pricePerNumber?: string;
  status?: "draft" | "active" | "finished" | "canceled";
  /**
   * Marcador de sorteio divisível (coluna da LTM-01).
   *
   * Quando verdadeiro, o padrão de `halvesPerTitle` passa a 2 — uma linha
   * por metade, como manda o ADR-0001.
   *
   * ⚠️ Nenhum teste desta story usa isto. A LTM-05 não escreve teste de
   * meia cota (está no OUT dela, com a razão escrita: um teste de metade
   * precisaria de regra de geração e de cobrança que ainda não existem, e
   * `typecheck` verde é AC daqui). O parâmetro existe porque o seed tem de
   * respeitar "uma linha por unidade vendável" nos dois mundos, e para a
   * LTM-07 ESTENDER este helper em vez de reescrevê-lo.
   */
  isDivisible?: boolean;
  halvesPerTitle?: number;
  /**
   * O premio, na forma que a aba Premios guarda (LTM-07).
   *
   * Vai para `products.advanced_settings` como jsonb PARCIAL, so as duas
   * chaves. E de proposito: `productAdvancedSettingsSchema.parse` preenche
   * o resto com os defaults, e e esse caminho que o codigo de producao usa.
   * Gravar o blob inteiro aqui esconderia um default quebrado.
   */
  prize?: { kind: "cash" | "other"; amount: string | null };
}

export async function createRaffle(opts: CreateRaffleOptions): Promise<SeededRaffle> {
  const slug = `s-${uniqueSuffix()}`.slice(0, 255);
  const totalNumbers = opts.totalNumbers ?? 10;
  const pricePerNumber = opts.pricePerNumber ?? "10.00";
  const halvesPerTitle = opts.halvesPerTitle ?? (opts.isDivisible ? 2 : 1);

  const product = await queryOne<{ id: string }>(
    `INSERT INTO products
       (tenant_id, title, slug, status, price_per_number, total_numbers,
        is_divisible, advanced_settings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)
     RETURNING id`,
    [
      opts.tenantId,
      `Sorteio sintetico ${slug}`,
      slug,
      opts.status ?? "active",
      pricePerNumber,
      totalNumbers,
      opts.isDivisible ?? false,
      opts.prize
        ? JSON.stringify({ prizeKind: opts.prize.kind, prizeAmount: opts.prize.amount })
        : "{}",
    ],
  );

  // Uma linha por unidade vendável. Em sorteio de cota inteira é uma por
  // título, com half = 1 — o caso degenerado, e o único exercitado aqui.
  await query(
    `INSERT INTO product_numbers (product_id, number, half)
     SELECT $1, n, h
       FROM generate_series(0, $2::int - 1) AS n,
            generate_series(1, $3::int) AS h`,
    [product.id, totalNumbers, halvesPerTitle],
  );

  return {
    id: product.id,
    slug,
    totalNumbers,
    halvesPerTitle,
    pricePerNumber,
    numbers: Array.from({ length: totalNumbers }, (_, i) => i),
  };
}

export interface SeededBuyer {
  id: string;
  phone: string;
}

export async function createBuyer(opts: {
  tenantId: string;
  phone?: string;
  consecutiveUnpaidReservations?: number;
  blockedUntil?: Date | null;
}): Promise<SeededBuyer> {
  const phone = opts.phone ?? syntheticPhone();
  return queryOne<SeededBuyer>(
    `INSERT INTO users
       (tenant_id, phone, name, role, consecutive_unpaid_reservations, blocked_until)
     VALUES ($1, $2, $3, 'subscriber', $4, $5)
     RETURNING id, phone`,
    [
      opts.tenantId,
      phone,
      syntheticName(),
      opts.consecutiveUnpaidReservations ?? 0,
      opts.blockedUntil ?? null,
    ],
  );
}

export async function blockPhone(tenantId: string, phone: string): Promise<void> {
  await query(
    `INSERT INTO blocked_numbers (tenant_id, phone, reason)
     VALUES ($1, $2, 'bloqueio sintetico da suite de testes')`,
    [tenantId, phone],
  );
}

export async function createPaymentGateway(opts: {
  tenantId: string;
  provider: string;
  webhookSecret?: string | null;
  /**
   * O token da URL de webhook (LTM-03a). `null` monta o estado "gateway sem
   * token", que a rota tem de recusar — é um caso de teste, não um descuido.
   */
  webhookToken?: string | null;
  isActive?: boolean;
}): Promise<{
  id: string;
  webhookSecret: string | null;
  webhookToken: string | null;
}> {
  // Segredo e token gerados por execução, nunca literal de credencial de
  // provedor. O token sintético imita a FORMA do real (base64url, 43
  // caracteres) sem ser produzido pelo código sob teste.
  const webhookSecret =
    opts.webhookSecret === undefined
      ? `segredo-sintetico-${uniqueSuffix()}`
      : opts.webhookSecret;
  const webhookToken =
    opts.webhookToken === undefined
      ? `tok-sintetico-${uniqueSuffix()}-${Math.random().toString(36).slice(2, 10)}`
      : opts.webhookToken;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO payment_gateways
       (tenant_id, provider, webhook_secret, webhook_token, is_active)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [
      opts.tenantId,
      opts.provider,
      webhookSecret,
      webhookToken,
      opts.isActive ?? true,
    ],
  );
  return { id: row.id, webhookSecret, webhookToken };
}

export async function readPaymentGateway(
  tenantId: string,
  provider: string,
): Promise<{
  id: string;
  credentials_encrypted: string | null;
  webhook_secret: string | null;
  webhook_token: string | null;
  is_active: boolean;
} | null> {
  const rows = await query<{
    id: string;
    credentials_encrypted: string | null;
    webhook_secret: string | null;
    webhook_token: string | null;
    is_active: boolean;
  }>(
    `SELECT id, credentials_encrypted, webhook_secret, webhook_token, is_active
       FROM payment_gateways
      WHERE tenant_id = $1 AND provider = $2`,
    [tenantId, provider],
  );
  return rows[0] ?? null;
}

export async function setGatewayActive(
  tenantId: string,
  provider: string,
  isActive: boolean,
): Promise<void> {
  await query(
    `UPDATE payment_gateways SET is_active = $3
      WHERE tenant_id = $1 AND provider = $2`,
    [tenantId, provider, isActive],
  );
}

/**
 * Transfere a unidade vendável para OUTRO pedido, já vendida.
 *
 * Monta exatamente o estado do AC-C5: a linha que o pedido original tomou
 * agora pertence a outro pedido, que a pagou. Mexe só no dado da base —
 * quem tem de decidir o que fazer com esse estado é o código de produção.
 */
export async function reassignUnitToOrder(opts: {
  productId: string;
  number: number;
  half: number;
  orderId: string;
  status?: "available" | "reserved" | "sold";
}): Promise<void> {
  await query(
    `UPDATE product_numbers
        SET order_id = $4, status = $5, reserved_until = NULL
      WHERE product_id = $1 AND number = $2 AND half = $3`,
    [
      opts.productId,
      opts.number,
      opts.half,
      opts.orderId,
      opts.status ?? "sold",
    ],
  );
}

/**
 * Devolve as unidades do pedido ao estoque, como a varredura de expiração
 * faz (`reserve.ts:149-156`) — inclusive apagando o `order_id`.
 *
 * ⚠️ Apagar o `order_id` é o que torna a primeira metade da política default
 * do AC-C6 ("se o número ainda estiver disponível, reservar e fechar")
 * inimplementável: depois da expiração não existe registro de QUAIS unidades
 * eram daquele pedido. Está registrado no Dev Agent Record da LTM-03a.
 */
export async function releaseUnitsOfOrder(orderId: string): Promise<void> {
  await query(
    `UPDATE product_numbers
        SET status = 'available', order_id = NULL, reserved_until = NULL
      WHERE order_id = $1`,
    [orderId],
  );
}

export async function setOrderStatus(
  orderId: string,
  status: "pending" | "paid" | "expired" | "refunded" | "canceled",
): Promise<void> {
  await query(`UPDATE orders SET status = $2 WHERE id = $1`, [orderId, status]);
}

export async function countBankingTransactions(tenantId: string): Promise<number> {
  const rows = await query<{ total: string }>(
    `SELECT count(*)::text AS total FROM banking_transactions WHERE tenant_id = $1`,
    [tenantId],
  );
  return Number(rows[0].total);
}

// ── Leituras de conferência, usadas pelas asserções ─────────────────────

export interface UnitRow {
  number: number;
  half: number;
  status: string;
  order_id: string | null;
  reserved_until: string | null;
}

export async function readUnits(productId: string): Promise<UnitRow[]> {
  return query<UnitRow>(
    `SELECT number, half, status, order_id, reserved_until
       FROM product_numbers
      WHERE product_id = $1
      ORDER BY number, half`,
    [productId],
  );
}

export interface OrderRow {
  id: string;
  status: string;
  quantity: number;
  /** A unidade em que `quantity` esta contado: "title" ou "half" (AC7). */
  unit: string;
  amount: string;
  paid_at: string | null;
  user_id: string;
}

export async function readOrders(productId: string): Promise<OrderRow[]> {
  return query<OrderRow>(
    `SELECT id, status, quantity, unit, amount, paid_at, user_id
       FROM orders
      WHERE product_id = $1
      ORDER BY created_at`,
    [productId],
  );
}

export async function readOrder(orderId: string): Promise<OrderRow> {
  return queryOne<OrderRow>(
    `SELECT id, status, quantity, unit, amount, paid_at, user_id
       FROM orders WHERE id = $1`,
    [orderId],
  );
}

export async function readBuyerByPhone(
  tenantId: string,
  phone: string,
): Promise<{
  id: string;
  consecutive_unpaid_reservations: number;
  blocked_until: string | null;
}> {
  return queryOne(
    `SELECT id, consecutive_unpaid_reservations, blocked_until
       FROM users WHERE tenant_id = $1 AND phone = $2`,
    [tenantId, phone],
  );
}

/**
 * Força o vencimento da reserva de um pedido, sem esperar 15 minutos de
 * relógio. Mexe só no dado da base — não toca o código de produção, que é
 * quem tem de decidir o que fazer com a reserva vencida.
 */
export async function expireReservation(orderId: string): Promise<void> {
  await query(
    `UPDATE product_numbers
        SET reserved_until = now() - interval '1 minute'
      WHERE order_id = $1`,
    [orderId],
  );
}

export async function setBlockedUntil(userId: string, when: Date | null): Promise<void> {
  await query(`UPDATE users SET blocked_until = $2 WHERE id = $1`, [userId, when]);
}

export interface WebhookEventRow {
  id: string;
  provider: string;
  signature_valid: boolean;
  payload: unknown;
  external_event_id: string | null;
  match_state: string;
  match_reason: string | null;
  delivery_count: number;
  amount_cents: number | null;
  order_id: string | null;
}

export async function readWebhookEvents(
  tenantId: string,
): Promise<WebhookEventRow[]> {
  return query<WebhookEventRow>(
    `SELECT id, provider, signature_valid, payload, external_event_id,
            match_state, match_reason, delivery_count, amount_cents, order_id
       FROM payment_webhook_events
      WHERE tenant_id = $1
      ORDER BY received_at, id`,
    [tenantId],
  );
}

export async function readBankingTransactions(orderId: string): Promise<
  {
    id: string;
    type: string;
    amount: string;
    description: string | null;
    external_reference: string | null;
    payment_id: string | null;
    end_to_end_id: string | null;
  }[]
> {
  return query(
    `SELECT id, type, amount, description, external_reference,
            payment_id, end_to_end_id
       FROM banking_transactions
      WHERE order_id = $1`,
    [orderId],
  );
}

// ── Leituras e montagens da meia cota (LTM-07) ──────────────────────────

export interface WinnerRow {
  id: string;
  winner_name: string;
  phone: string | null;
  prize_description: string;
  prize_amount: string | null;
  winning_number: number | null;
  /** `null` = titulo inteiro; 1 ou 2 = a metade nomeada (AC11). */
  winning_half: number | null;
}

export async function readWinners(productId: string): Promise<WinnerRow[]> {
  return query<WinnerRow>(
    `SELECT id, winner_name, phone, prize_description, prize_amount,
            winning_number, winning_half
       FROM winners
      WHERE product_id = $1
      ORDER BY winning_number, winning_half NULLS FIRST, id`,
    [productId],
  );
}

export interface RaffleRow {
  is_divisible: boolean;
  price_per_number: string;
  advanced_settings: Record<string, unknown>;
}

export async function readRaffle(productId: string): Promise<RaffleRow> {
  return queryOne<RaffleRow>(
    `SELECT is_divisible, price_per_number, advanced_settings
       FROM products WHERE id = $1`,
    [productId],
  );
}

/**
 * Troca o premio do sorteio na aba Premios, sem passar pelo codigo de
 * producao — monta o estado, nao o exercita.
 */
export async function setRafflePrize(
  productId: string,
  prize: { kind: "cash" | "other"; amount: string | null },
): Promise<void> {
  await query(
    `UPDATE products
        SET advanced_settings = advanced_settings || $2::jsonb
      WHERE id = $1`,
    [productId, JSON.stringify({ prizeKind: prize.kind, prizeAmount: prize.amount })],
  );
}
