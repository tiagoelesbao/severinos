import { and, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import { bankingTransactions, orders, productNumbers, users } from "@/db/schema";

import { toCents } from "./money";

// ════════════════════════════════════════════════════════════════════════
// O FECHAMENTO DO PEDIDO — UMA IMPLEMENTAÇÃO, UM ARQUIVO (AC-C3)
//
// A sequência "pedido para pago + unidades vendáveis para vendidas + UM
// crédito em banking_transactions + contador anti-spam zerado" existe AQUI e
// só aqui. Quem fecha pedido chama esta função:
//
//   • o webhook de verdade  → [tenant]/[provider]/[token]/route.ts
//   • o pagamento simulado  → lib/actions/checkout.ts
//
// Duas implementações do fechamento é como se cria divergência entre o
// caminho de teste e o caminho real — e era o estado anterior: o
// `simulatePayment` tinha a sequência inteira inline, e o webhook tinha um
// `TODO`. O resultado foi que o caminho real nunca fechou pedido nenhum.
//
// ⚠️ `src/lib/actions/bonus-play.ts` NÃO chama esta função, e isso é
// decisão registrada, não esquecimento. Ver a nota ao fim deste arquivo.
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE TODA RECUSA É VALOR DE RETORNO, E NÃO EXCEÇÃO
//
// Porque quem chama precisa REGISTRAR a recusa antes de responder — o AC-F1
// proíbe responder sucesso sem ter gravado o que foi feito ou deixou de ser
// feito. Exceção dentro de uma transação desfaz o registro junto com o
// fechamento, e o aviso desapareceria exatamente nos casos em que mais
// importa saber que ele chegou.
//
// Exceção aqui fica reservada ao que é mesmo inesperado: falha de infra, que
// tem de continuar subindo alta.
// ════════════════════════════════════════════════════════════════════════

/** A transação do Drizzle, como o driver neon-serverless a entrega. */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SettlementRefusal =
  /** Nenhum pedido com esse id (ou de outro operador). */
  | "order_not_found"
  /** Já estava pago. A defesa contra pagamento em dobro. */
  | "already_settled"
  /** Reserva expirou e as unidades foram liberadas — AC-C6. */
  | "order_expired"
  /** `refunded` ou `canceled`: transição inválida, recusada e registrada. */
  | "order_not_live"
  /** O aviso afirma um valor que não é o do pedido — AC-E3. */
  | "amount_mismatch"
  /** O pedido não tem mais as unidades que deveria ter — AC-C5. */
  | "unit_conflict";

export interface SettleOrderInput {
  readonly orderId: string;
  /** Vai para `banking_transactions.description`. */
  readonly description: string;
  /** Restringe o fechamento a um operador. O webhook sempre informa. */
  readonly tenantId?: string;
  /**
   * O valor que o aviso afirmou, em centavos.
   *
   * Quando informado, é CONFERIDO contra `orders.amount` e divergência
   * recusa o fechamento (AC-E3). Pagamento parcial existe, e fechar pedido
   * com valor menor é entregar título por menos. `undefined` significa "não
   * há valor externo a conferir" — é o caso do pagamento simulado.
   */
  readonly expectedAmountCents?: number | null;
  readonly paymentId?: string | null;
  readonly endToEndId?: string | null;
  readonly externalReference?: string | null;
  readonly paidAt?: Date | null;
}

export type SettleOrderResult =
  | {
      ok: true;
      orderId: string;
      /** Quantas unidades vendáveis passaram para `sold`. */
      unitsSold: number;
      amount: string;
    }
  | { ok: false; refusal: SettlementRefusal; detail: string };

/**
 * Fecha o pedido DENTRO de uma transação já aberta.
 *
 * É esta a forma que o webhook usa, porque lá o fechamento e a reivindicação
 * do evento têm de ser atômicos entre si: ou o evento está reivindicado e o
 * pedido está pago, ou nenhum dos dois.
 */
export async function settleOrderInTransaction(
  tx: DbTransaction,
  input: SettleOrderInput,
): Promise<SettleOrderResult> {
  // ── 1. Existe o pedido? Leitura SEM trava, só para saber se há o que
  // fechar e de quem é.
  const [preview] = await tx
    .select({ id: orders.id, tenantId: orders.tenantId })
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1);

  if (!preview) {
    return {
      ok: false,
      refusal: "order_not_found",
      detail: `Nenhum pedido com id ${input.orderId}.`,
    };
  }
  if (input.tenantId && preview.tenantId !== input.tenantId) {
    // Pedido de OUTRO operador. Tratado como inexistente de propósito: a
    // resposta não deve confirmar a quem pergunta que o id existe.
    return {
      ok: false,
      refusal: "order_not_found",
      detail: `O pedido ${input.orderId} não pertence a este operador.`,
    };
  }

  // ── 2. Travar as unidades ANTES do pedido.
  //
  // ⚠️ A ORDEM DAS DUAS TRAVAS NÃO É ESTILO. A varredura de expiração
  // escreve em `product_numbers` (`raffles/expire-reservations.ts:277`) e
  // DEPOIS em `orders` (`:302`).
  //
  // ⭕ A referência era `reserve.ts:149-156`, e a `LTM-20` mudou a varredura
  // de lugar sem atualizar este comentário — achado pelo @qa no portão da
  // `LTM-20`. Lá hoje há outra função, e quem fosse conferir a justificativa
  // não encontraria varredura nenhuma no destino. **É esta linha, e só ela,
  // que protege a ordem**: a conclusão natural de quem não a encontra é que o
  // comentário virou lixo, e inverter a ordem traz o impasse de volta.
  // Travar aqui na ordem inversa (pedido, depois unidades) criaria
  // emparelhamento cruzado com ela: o Postgres detectaria o impasse e
  // abortaria uma das duas — o webhook responderia 500 e o provedor
  // reentregaria contra o mesmo impasse. Mesma ordem, nenhum impasse.
  const units = await tx
    .select({
      id: productNumbers.id,
      number: productNumbers.number,
      half: productNumbers.half,
      status: productNumbers.status,
    })
    .from(productNumbers)
    .where(eq(productNumbers.orderId, input.orderId))
    .orderBy(productNumbers.number, productNumbers.half)
    .for("update");

  // ── 3. Agora o pedido, travado, e relido: entre a leitura de conferência
  // e aqui, outro caminho pode tê-lo pago.
  const [order] = await tx
    .select()
    .from(orders)
    .where(eq(orders.id, input.orderId))
    .limit(1)
    .for("update");

  if (!order) {
    return {
      ok: false,
      refusal: "order_not_found",
      detail: `O pedido ${input.orderId} desapareceu durante o fechamento.`,
    };
  }

  if (order.status === "paid") {
    return {
      ok: false,
      refusal: "already_settled",
      detail: `O pedido ${order.id} já estava pago${
        order.paidAt ? ` desde ${order.paidAt.toISOString()}` : ""
      }.`,
    };
  }

  if (order.status === "expired") {
    return {
      ok: false,
      refusal: "order_expired",
      detail:
        `A reserva do pedido ${order.id} expirou e as unidades foram liberadas. ` +
        `O pagamento não fecha o pedido e NÃO é lançado em banking_transactions.`,
    };
  }

  if (order.status !== "pending") {
    return {
      ok: false,
      refusal: "order_not_live",
      detail: `O pedido ${order.id} está "${order.status}" — transição inválida para pago.`,
    };
  }

  // ── 4. O valor. Conferido, nunca usado para casar (o casamento é por
  // referência externa explícita).
  if (input.expectedAmountCents !== undefined && input.expectedAmountCents !== null) {
    const orderCents = toCents(order.amount);
    if (orderCents !== input.expectedAmountCents) {
      return {
        ok: false,
        refusal: "amount_mismatch",
        detail:
          `O aviso afirma ${input.expectedAmountCents} centavos e o pedido ${order.id} ` +
          `vale ${orderCents} (R$ ${order.amount}). Pagamento parcial não fecha pedido.`,
      };
    }
  }

  // ── 5. As unidades vendáveis.
  //
  // ⚠️ A CHAVE É A LINHA DE `product_numbers`, NUNCA O NÚMERO (ADR-0001).
  //
  // Em sorteio divisível, "o número 42 já está vendido por outro pedido" é
  // estado CORRETO: a outra metade do 42 pertence legitimamente a outra
  // pessoa. Uma guarda chavada no número recusaria o fechamento de um
  // pagamento válido e mandaria para revisão manual um pedido perfeito —
  // com dinheiro já capturado. Correção do @po em 2026-11-17.
  //
  // O que se compara é o conjunto de unidades QUE ESTE PEDIDO AINDA TEM
  // contra o que ele diz conter. Unidade que foi liberada por expiração e
  // tomada por outro pedido simplesmente não está mais neste conjunto —
  // `order_id` deixou de apontar para cá —, e é assim que o conflito
  // aparece. Nenhuma escrita abaixo toca linha de outro pedido: todo
  // predicado é `order_id = <este pedido>`.
  if (units.length !== order.quantity) {
    return {
      ok: false,
      refusal: "unit_conflict",
      detail:
        `O pedido ${order.id} declara ${order.quantity} unidade(s) vendável(is) e ` +
        `tem ${units.length} — alguma foi liberada por expiração ou já pertence a ` +
        `outro pedido. Revisão manual.`,
    };
  }

  const alreadySold = units.filter((unit) => unit.status === "sold");
  if (alreadySold.length > 0) {
    return {
      ok: false,
      refusal: "unit_conflict",
      detail:
        `O pedido ${order.id} está "${order.status}" e já tem ` +
        `${alreadySold.length} unidade(s) marcada(s) como vendida(s) ` +
        `(${alreadySold.map((u) => `${u.number}/${u.half}`).join(", ")}). Revisão manual.`,
    };
  }

  // ── 6. As quatro escritas. Daqui para baixo não há decisão, só efeito.
  await tx
    .update(orders)
    .set({ status: "paid", paidAt: input.paidAt ?? new Date() })
    .where(eq(orders.id, order.id));

  const soldUnits = await tx
    .update(productNumbers)
    .set({ status: "sold" })
    .where(
      and(
        eq(productNumbers.orderId, order.id),
        inArray(
          productNumbers.id,
          units.map((unit) => unit.id),
        ),
      ),
    )
    .returning({ id: productNumbers.id });

  await tx.insert(bankingTransactions).values({
    tenantId: order.tenantId,
    type: "credit",
    // O valor vem do PEDIDO, não do aviso. Os dois já foram conferidos
    // iguais quando havia o que conferir; usar o do pedido mantém a moeda
    // na forma em que o banco a guarda, sem reconversão.
    amount: order.amount,
    orderId: order.id,
    description: input.description,
    externalReference: input.externalReference ?? null,
    paymentId: input.paymentId ?? null,
    endToEndId: input.endToEndId ?? null,
  });

  // Pagamento bem-sucedido limpa a ficha do anti-spam.
  await tx
    .update(users)
    .set({ consecutiveUnpaidReservations: 0 })
    .where(eq(users.id, order.userId));

  return {
    ok: true,
    orderId: order.id,
    unitsSold: soldUnits.length,
    amount: order.amount,
  };
}

/** Fecha o pedido numa transação própria. */
export async function settleOrder(
  input: SettleOrderInput,
): Promise<SettleOrderResult> {
  return db.transaction((tx) => settleOrderInTransaction(tx, input));
}

// ════════════════════════════════════════════════════════════════════════
// A TERCEIRA CÓPIA QUE NÃO É CÓPIA — `bonus-play.ts` (decisão, 2026-11-18)
//
// O bloco `Files:` da LTM-03a levantou que `src/lib/actions/bonus-play.ts`
// "espelha a sequência de fechamento" (o comentário dele diz isso,
// `bonus-play.ts:80`) e que, com ele de fora, o AC-C3 falharia na própria
// verificação que define. Conferido no código: a premissa está errada e a
// conclusão não se sustenta.
//
// `simulateBonusGamePaymentAndReveal` faz DUAS escritas, e nenhuma das duas
// é da sequência que o AC-C3 nomeia:
//
//   AC-C3 exige          bonus-play faz
//   ─────────────────────────────────────────────────────────────────
//   pedido para pago     `bonus_game_plays` para pago — NÃO é `orders`
//   unidades vendidas    nada: `bonus_game_plays` não tem product_numbers
//   crédito bancário     insere em banking_transactions SEM `orderId`
//
// Duas das três peças não existem lá, e a terceira é deliberadamente
// diferente: o crédito do jogo bônus não tem `orderId` porque não há pedido
// por trás. Uma busca pela sequência do AC-C3 encontra UM arquivo — este.
//
// DECISÃO: `bonus-play.ts` continua com o seu próprio fechamento, e o AC-C3
// vale como escrito. É também o que o Escopo OUT da própria story já
// determinava ("Unificar `simulateBonusGamePaymentAndReveal` com
// settle-order … é outra entidade, com outro ciclo"). A nota do bloco
// `Files:` e o Escopo OUT se contradiziam; prevalece o Escopo OUT, porque é
// o que a leitura do código sustenta.
//
// O que NÃO fica resolvido, e está registrado como tal: as duas escritas do
// jogo bônus continuam SOLTAS, sem transação. É a mesma classe de defeito
// que a LTM-02 corrigiu no pedido, com consequência menor (não há estoque de
// unidade em jogo) — e é story própria, como o Escopo OUT prevê.
// ════════════════════════════════════════════════════════════════════════
