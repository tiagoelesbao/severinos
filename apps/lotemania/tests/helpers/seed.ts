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
}

export async function createRaffle(opts: CreateRaffleOptions): Promise<SeededRaffle> {
  const slug = `s-${uniqueSuffix()}`.slice(0, 255);
  const totalNumbers = opts.totalNumbers ?? 10;
  const pricePerNumber = opts.pricePerNumber ?? "10.00";
  const halvesPerTitle = opts.halvesPerTitle ?? (opts.isDivisible ? 2 : 1);

  const product = await queryOne<{ id: string }>(
    `INSERT INTO products
       (tenant_id, title, slug, status, price_per_number, total_numbers, is_divisible)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      opts.tenantId,
      `Sorteio sintetico ${slug}`,
      slug,
      opts.status ?? "active",
      pricePerNumber,
      totalNumbers,
      opts.isDivisible ?? false,
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
  isActive?: boolean;
}): Promise<{ id: string; webhookSecret: string | null }> {
  // Segredo gerado por execução, nunca literal de credencial de provedor.
  const webhookSecret =
    opts.webhookSecret === undefined
      ? `segredo-sintetico-${uniqueSuffix()}`
      : opts.webhookSecret;
  const row = await queryOne<{ id: string }>(
    `INSERT INTO payment_gateways (tenant_id, provider, webhook_secret, is_active)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [opts.tenantId, opts.provider, webhookSecret, opts.isActive ?? true],
  );
  return { id: row.id, webhookSecret };
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
  amount: string;
  paid_at: string | null;
  user_id: string;
}

export async function readOrders(productId: string): Promise<OrderRow[]> {
  return query<OrderRow>(
    `SELECT id, status, quantity, amount, paid_at, user_id
       FROM orders
      WHERE product_id = $1
      ORDER BY created_at`,
    [productId],
  );
}

export async function readOrder(orderId: string): Promise<OrderRow> {
  return queryOne<OrderRow>(
    `SELECT id, status, quantity, amount, paid_at, user_id
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

export async function readWebhookEvents(tenantId: string): Promise<
  {
    id: string;
    provider: string;
    signature_valid: boolean;
    payload: unknown;
  }[]
> {
  return query(
    `SELECT id, provider, signature_valid, payload
       FROM payment_webhook_events
      WHERE tenant_id = $1
      ORDER BY received_at`,
    [tenantId],
  );
}

export async function readBankingTransactions(orderId: string): Promise<
  { id: string; type: string; amount: string; description: string | null }[]
> {
  return query(
    `SELECT id, type, amount, description
       FROM banking_transactions
      WHERE order_id = $1`,
    [orderId],
  );
}
