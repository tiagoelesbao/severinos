// O verificador de invariantes (LTM-05, AC5).
//
// ════════════════════════════════════════════════════════════════════════
// A CHAVE É A UNIDADE VENDÁVEL — A LINHA DE `product_numbers` —, NUNCA O
// NÚMERO. Esta é a decisão central do arquivo, e ela é de corretude, não de
// estilo.
//
// Em sorteio divisível o MESMO NÚMERO pertence legitimamente a dois
// pedidos: a metade A é de uma pessoa, a metade B é de outra (ADR-0001).
// Um invariante escrito sobre o número acusaria violação na venda normal da
// feature que o cliente pediu — ficaria vermelho com o sistema CERTO. E a
// primeira reação de qualquer pessoa diante disso é relaxar a asserção, a
// partir do que o verificador deixa de verificar. Como é ele que o portão
// G4 do epic usa como prova, um invariante determinísticamente errado
// aprovaria ou reprovaria a migração pelo motivo errado.
//
// Chaveado na linha, cada invariante abaixo é verdadeiro nos DOIS mundos:
// hoje, uma linha por título (`half = 1`); depois da LTM-07, duas linhas
// por título. Sem uma linha de reescrita — a LTM-07 ESTENDE isto.
//
// Consequência prática no item I1: o total de unidades vendáveis vem do
// próprio `product_numbers`, e não de `products.totalNumbers`, porque
// `totalNumbers` conta TÍTULOS. Num sorteio divisível as linhas são o dobro
// dele, e a soma nunca fecharia.
// ════════════════════════════════════════════════════════════════════════

import { query } from "./db";

export const INVARIANT_CODES = {
  particao: "I1_PARTICAO_DAS_UNIDADES",
  vendidaSemPagamento: "I2_UNIDADE_VENDIDA_SEM_PEDIDO_PAGO",
  unidadeComDoisPedidos: "I3_UNIDADE_VENDAVEL_COM_DOIS_PEDIDOS",
  reservaVencida: "I4_RESERVA_VENCIDA_NAO_LIBERADA",
  pedidoInexistente: "I5_UNIDADE_APONTA_PEDIDO_INEXISTENTE",
  pedidoSemUnidade: "I6_PEDIDO_PENDENTE_SEM_UNIDADE",
  quantidadeDivergente: "I7_QUANTIDADE_DO_PEDIDO_DIVERGE_DAS_UNIDADES",
} as const;

export type InvariantCode = (typeof INVARIANT_CODES)[keyof typeof INVARIANT_CODES];

export interface InvariantViolation {
  code: InvariantCode;
  message: string;
  /** Amostra das linhas ofensoras, truncada — para o relato ser acionável. */
  sample: unknown[];
}

export class InvariantViolationError extends Error {
  readonly violations: InvariantViolation[];

  constructor(productId: string, violations: InvariantViolation[], context?: string) {
    const header = context
      ? `Invariante violada (${context}) no sorteio ${productId}:`
      : `Invariante violada no sorteio ${productId}:`;
    const body = violations
      .map(
        (v) =>
          `  • ${v.code}: ${v.message}` +
          (v.sample.length > 0 ? `\n      amostra: ${JSON.stringify(v.sample)}` : ""),
      )
      .join("\n");
    super(`${header}\n${body}`);
    this.name = "InvariantViolationError";
    this.violations = violations;
  }
}

/** Quantas unidades vendáveis existem de fato — contadas em linhas. */
export async function sellableUnitCount(productId: string): Promise<number> {
  const rows = await query<{ total: string }>(
    `SELECT count(*)::text AS total FROM product_numbers WHERE product_id = $1`,
    [productId],
  );
  return Number(rows[0].total);
}

/**
 * Quantas unidades vendáveis um sorteio DEVE ter, dada a unidade dele.
 *
 * Fica fora do verificador de propósito. Quem sabe quantas metades por
 * título um sorteio tem é quem o criou — o seed, ou (na LTM-07) a geração
 * de produção. O verificador não adivinha isso a partir de `is_divisible`:
 * a regra de geração é escopo da LTM-07, e um invariante que afirma uma
 * regra que ainda não existe é um invariante que fica vermelho sem defeito.
 */
export function expectedSellableUnits(totalNumbers: number, halvesPerTitle: number): number {
  return totalNumbers * halvesPerTitle;
}

export async function checkProductInvariants(
  productId: string,
): Promise<InvariantViolation[]> {
  const violations: InvariantViolation[] = [];

  // I1 — a partição cobre todas as unidades vendáveis do sorteio.
  // Total derivado das LINHAS, não de `products.totalNumbers`.
  const particao = await query<{
    vendidas: string;
    reservadas: string;
    disponiveis: string;
    total: string;
  }>(
    `SELECT
       count(*) FILTER (WHERE status = 'sold')::text      AS vendidas,
       count(*) FILTER (WHERE status = 'reserved')::text  AS reservadas,
       count(*) FILTER (WHERE status = 'available')::text AS disponiveis,
       count(*)::text                                     AS total
     FROM product_numbers
     WHERE product_id = $1`,
    [productId],
  );
  const p = particao[0];
  const soma = Number(p.vendidas) + Number(p.reservadas) + Number(p.disponiveis);
  if (soma !== Number(p.total)) {
    violations.push({
      code: INVARIANT_CODES.particao,
      message:
        `vendidas (${p.vendidas}) + reservadas (${p.reservadas}) + disponíveis ` +
        `(${p.disponiveis}) = ${soma}, e o sorteio tem ${p.total} unidades vendáveis`,
      sample: [p],
    });
  }

  // I2 — unidade vendida que não pertence a pedido pago. Dinheiro marcado
  // como recebido sem pedido pago por trás.
  const vendidaSemPagamento = await query<{
    number: number;
    half: number;
    order_id: string | null;
    order_status: string | null;
  }>(
    `SELECT pn.number, pn.half, pn.order_id, o.status AS order_status
       FROM product_numbers pn
       LEFT JOIN orders o ON o.id = pn.order_id
      WHERE pn.product_id = $1
        AND pn.status = 'sold'
        AND (pn.order_id IS NULL OR o.status IS DISTINCT FROM 'paid')
      LIMIT 20`,
    [productId],
  );
  if (vendidaSemPagamento.length > 0) {
    violations.push({
      code: INVARIANT_CODES.vendidaSemPagamento,
      message: `${vendidaSemPagamento.length}+ unidade(s) com status 'sold' sem pedido pago`,
      sample: vendidaSemPagamento,
    });
  }

  // I3 — A MESMA UNIDADE VENDÁVEL em mais de um pedido.
  //
  // Agrupado por (number, half), nunca só por number: duas linhas com o
  // mesmo número e metades diferentes, cada uma com seu pedido, são o
  // estado CORRETO de todo sorteio divisível. O que não pode existir é a
  // mesma linha — a mesma unidade vendável — associada a dois pedidos, e é
  // isso que este agrupamento pega, inclusive se a restrição única de
  // (product_id, number, half) deixar de existir e surgirem linhas
  // duplicadas.
  const unidadeComDoisPedidos = await query<{
    number: number;
    half: number;
    pedidos: string;
  }>(
    `SELECT number, half, count(DISTINCT order_id)::text AS pedidos
       FROM product_numbers
      WHERE product_id = $1 AND order_id IS NOT NULL
      GROUP BY number, half
     HAVING count(DISTINCT order_id) > 1
      LIMIT 20`,
    [productId],
  );
  if (unidadeComDoisPedidos.length > 0) {
    violations.push({
      code: INVARIANT_CODES.unidadeComDoisPedidos,
      message:
        `${unidadeComDoisPedidos.length}+ unidade(s) vendável(is) associada(s) a mais de ` +
        `um pedido — venda dupla da MESMA metade (não confundir com duas metades ` +
        `do mesmo número, que é o estado correto em sorteio divisível)`,
      sample: unidadeComDoisPedidos,
    });
  }

  // I4 — reserva vencida que ninguém liberou: unidade fora do estoque sem
  // dono e sem prazo.
  const reservaVencida = await query<{
    number: number;
    half: number;
    reserved_until: string | null;
    order_id: string | null;
  }>(
    `SELECT number, half, reserved_until, order_id
       FROM product_numbers
      WHERE product_id = $1 AND status = 'reserved' AND reserved_until < now()
      LIMIT 20`,
    [productId],
  );
  if (reservaVencida.length > 0) {
    violations.push({
      code: INVARIANT_CODES.reservaVencida,
      message: `${reservaVencida.length}+ unidade(s) reservada(s) com prazo vencido e não liberada(s)`,
      sample: reservaVencida,
    });
  }

  // I5 — unidade apontando para pedido que não existe.
  //
  // `product_numbers.order_id` NÃO tem chave estrangeira hoje (estado de
  // hoje, questão aberta na LTM-01/AC8), então o banco não impede este
  // estado: só a aplicação e este verificador impedem.
  const pedidoInexistente = await query<{
    number: number;
    half: number;
    order_id: string;
  }>(
    `SELECT pn.number, pn.half, pn.order_id
       FROM product_numbers pn
       LEFT JOIN orders o ON o.id = pn.order_id
      WHERE pn.product_id = $1 AND pn.order_id IS NOT NULL AND o.id IS NULL
      LIMIT 20`,
    [productId],
  );
  if (pedidoInexistente.length > 0) {
    violations.push({
      code: INVARIANT_CODES.pedidoInexistente,
      message: `${pedidoInexistente.length}+ unidade(s) apontando para pedido inexistente`,
      sample: pedidoInexistente,
    });
  }

  // I6 — pedido pendente sem nenhuma unidade. Cobrança a caminho de um
  // comprador que não tem título nenhum.
  const pedidoSemUnidade = await query<{ id: string; quantity: number }>(
    `SELECT o.id, o.quantity
       FROM orders o
      WHERE o.product_id = $1
        AND o.status = 'pending'
        AND NOT EXISTS (SELECT 1 FROM product_numbers pn WHERE pn.order_id = o.id)
      LIMIT 20`,
    [productId],
  );
  if (pedidoSemUnidade.length > 0) {
    violations.push({
      code: INVARIANT_CODES.pedidoSemUnidade,
      message: `${pedidoSemUnidade.length}+ pedido(s) pendente(s) com zero unidade`,
      sample: pedidoSemUnidade,
    });
  }

  // I7 — `quantity` conta o que o pedido CONTÉM (ADR-0001, custo aceito),
  // e o que ele contém são unidades vendáveis. Só vale para pedido vivo:
  // pedido `canceled` com `quantity` > 0 e zero unidade é o resíduo que a
  // reserva de hoje deixa de propósito — documentado como tal na suíte de
  // reserva, e escopo de eliminação da LTM-02, não violação.
  const quantidadeDivergente = await query<{
    id: string;
    status: string;
    quantity: number;
    unidades: string;
  }>(
    `SELECT o.id, o.status, o.quantity,
            (SELECT count(*) FROM product_numbers pn WHERE pn.order_id = o.id)::text AS unidades
       FROM orders o
      WHERE o.product_id = $1
        AND o.status IN ('pending', 'paid')
        AND o.quantity <> (SELECT count(*) FROM product_numbers pn WHERE pn.order_id = o.id)
      LIMIT 20`,
    [productId],
  );
  if (quantidadeDivergente.length > 0) {
    violations.push({
      code: INVARIANT_CODES.quantidadeDivergente,
      message:
        `${quantidadeDivergente.length}+ pedido(s) vivo(s) cujo \`quantity\` não bate com ` +
        `o número de unidades vendáveis que o pedido tomou`,
      sample: quantidadeDivergente,
    });
  }

  return violations;
}

/**
 * Chamada ao final de TODO teste de concorrência (AC5) e também dos testes
 * de caminho feliz — é de graça e é o que dá valor composto: story nova
 * herda a verificação sem reescrevê-la.
 */
export async function assertProductInvariants(
  productId: string,
  context?: string,
): Promise<void> {
  const violations = await checkProductInvariants(productId);
  if (violations.length > 0) {
    throw new InvariantViolationError(productId, violations, context);
  }
}
