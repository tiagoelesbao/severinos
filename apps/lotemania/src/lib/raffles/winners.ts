// O REGISTRO DO GANHADOR de um título sorteado, já rateado (LTM-07).
//
// ════════════════════════════════════════════════════════════════════════
// O SORTEIO NÃO É NOSSO
//
// Nada aqui escolhe número. O operador conduz o sorteio fora do sistema e
// informa QUAL número saiu; esta função transforma isso em uma linha de
// `winners` por ganhador, com `prize_amount` já rateado (ADR-0001 → Notas,
// e a tarefa "Rateio" da LTM-07).
//
// Até esta story, NADA no código escrevia em `winners` — conferido pelo @po
// em duas validações. Esta é a primeira escrita, e ela é registro de
// resultado, não automação de sorteio.
//
// ⚠️ A TELA é a LTM-08. Aqui fica a decisão, verificável contra o Postgres
// de verdade; o botão "Definir ganhadores" e a exibição de `42 (metade)` são
// da story da superfície. Mesmo recorte de `lib/raffles/divisibility.ts`.
// ════════════════════════════════════════════════════════════════════════

import { and, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, productNumbers, products, users, winners } from "@/db/schema";
import { fromCents } from "@/lib/payments/money";
import { centsOrNull, halvesPerTitleOf } from "@/lib/validations/product";
import { productAdvancedSettingsSchema } from "@/lib/validations/product-settings";

import { splitPrizeAmongHalves, type PrizeShare, type SoldHalf } from "./prize-split";

export type RecordWinnersRefusalCode =
  /** Nenhum sorteio com esse id para este operador. */
  | "raffle_not_found"
  /** O prêmio não é dinheiro, ou não tem valor: não há o que ratear. */
  | "prize_not_rateable"
  /** Ninguém comprou o título sorteado. */
  | "no_sold_units"
  /** Já existe registro para esse número — não se grava duas vezes. */
  | "already_recorded";

export interface RecordWinnersRefusal {
  readonly code: RecordWinnersRefusalCode;
  readonly message: string;
}

export interface RecordedWinner {
  readonly id: string;
  readonly winnerName: string;
  readonly winningNumber: number;
  readonly winningHalf: number | null;
  /** Reais, string decimal de duas casas — como o banco o guarda. */
  readonly prizeAmount: string;
}

export type RecordWinnersResult =
  | { readonly ok: true; readonly recorded: RecordedWinner[] }
  | { readonly ok: false; readonly refusal: RecordWinnersRefusal };

export interface RecordWinnersInput {
  readonly tenantId: string;
  readonly productId: string;
  /** O número que saiu no sorteio, conduzido fora do sistema. */
  readonly winningNumber: number;
  /** Vai para `winners.prize_description`. */
  readonly prizeDescription?: string;
  /**
   * O valor DESTE lugar de prêmio, em reais (string decimal, duas casas) —
   * acrescentado pela LTM-27 por decisão do founder de 2026-11-20
   * (*"devo poder cadastrar quantos [ganhadores] eu quiser"*).
   *
   * AUSENTE (ou vazio) = comportamento de antes, intacto: o valor vem de
   * `advanced_settings.prizeAmount` e as recusas são as mesmas. É isso que
   * faz esta mudança ser aditiva — nenhum chamador anterior muda de
   * comportamento, e nenhum teste da LTM-07 precisou ser tocado.
   *
   * PRESENTE = é este o valor rateado. Com mais de um lugar de prêmio, o
   * sorteio tem mais de um valor, e `advanced_settings` guarda UM só; ler o
   * mesmo valor N vezes pagaria N× o prêmio. Dividir o valor declarado
   * entre os lugares, ou assumir que o 2º vale metade, seria inventar no
   * caminho do prêmio — `prizes` é descrição livre SEM valor
   * (`product-settings.ts:39`). A única fonte sem invenção é o operador.
   */
  readonly prizeAmount?: string | null;
  readonly announcedAt?: Date;
}

export async function recordWinnersForDrawnTitle(
  input: RecordWinnersInput,
): Promise<RecordWinnersResult> {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.tenantId, input.tenantId)))
      .limit(1);

    if (!product) {
      return {
        ok: false,
        refusal: {
          code: "raffle_not_found",
          message: `Nenhum sorteio com id ${input.productId} para este operador.`,
        },
      };
    }

    // ── O prêmio ────────────────────────────────────────────────────────
    //
    // Lido por `parse` e nunca por acesso cru ao jsonb, pelo motivo de
    // sempre: sorteio antigo tem `advanced_settings = {}` e são os defaults
    // que entregam o valor.
    //
    // Prêmio não monetário é RECUSADO aqui, e isso não tira função de
    // ninguém: ratear "um carro" entre duas pessoas não tem resultado
    // definido, e registrar ganhador de prêmio não monetário é a tela de
    // ganhadores da LTM-08, que grava descrição sem valor.
    const settings = productAdvancedSettingsSchema.safeParse(
      product.advancedSettings ?? {},
    );
    const prizeKind = settings.success ? settings.data.prizeKind : "other";
    const declaredAmount = settings.success ? settings.data.prizeAmount : null;
    // ── O VALOR INFORMADO PULA A RECUSA DE `prizeKind` (LTM-27) ────────
    //
    // Pular, e não contornar. O default de `prizeKind` é `"other"`
    // (`product-settings.ts:67`), conservador de propósito — então sorteio
    // com `advanced_settings` vazio, que é O CASO COMUM, cai nele. Se o
    // valor explícito tivesse de atravessar esta condição, o operador
    // informaria quanto o 2º lugar paga e levaria `prize_not_rateable` na
    // cara exatamente nos sorteios que mais precisam da capacidade.
    //
    // O rigor não se perde: o caminho do valor informado atravessa o MESMO
    // `centsOrNull` e a MESMA recusa de valor ≤ 0, logo abaixo. E ele é
    // STRING decimal, nunca `number`, pela razão de `money.ts:36-39` —
    // `number` chega tendo passado por ponto flutuante, e depois do fato não
    // se distingue "o dado tem três casas" de "o binário deixou resíduo".
    //
    // Sem valor informado, a condição abaixo é a de antes, caractere por
    // caractere.
    const informedAmount =
      input.prizeAmount !== undefined &&
      input.prizeAmount !== null &&
      input.prizeAmount.trim() !== ""
        ? input.prizeAmount.trim()
        : null;
    const prizeAmount = informedAmount ?? declaredAmount;
    if (
      (informedAmount === null && prizeKind !== "cash") ||
      prizeAmount === null ||
      prizeAmount.trim() === ""
    ) {
      return {
        ok: false,
        refusal: {
          code: "prize_not_rateable",
          message:
            "O rateio precisa de um prêmio em dinheiro com valor declarado, e " +
            `este sorteio tem prêmio "${prizeKind}"` +
            (prizeAmount ? ` de valor "${prizeAmount}"` : " sem valor") +
            ". Declare o valor na aba Prêmios.",
        },
      };
    }
    const prizeCents = centsOrNull(prizeAmount);
    if (prizeCents === null || prizeCents <= 0) {
      return {
        ok: false,
        refusal: {
          code: "prize_not_rateable",
          message:
            `O valor do prêmio declarado ("${prizeAmount}") não é um valor em ` +
            "dinheiro válido, e o rateio não parte de um valor que não se sabe ler.",
        },
      };
    }

    // ── Não gravar duas vezes o mesmo número ────────────────────────────
    //
    // Sem esta guarda, chamar duas vezes produziria quatro linhas para o
    // mesmo `winning_number` — e aí sim seriam indistinguíveis de duplicata
    // acidental, que é exatamente o estado que o AC11 existe para impedir.
    const [jaExiste] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(winners)
      .where(
        and(
          eq(winners.productId, input.productId),
          eq(winners.winningNumber, input.winningNumber),
        ),
      );
    if ((jaExiste?.total ?? 0) > 0) {
      return {
        ok: false,
        refusal: {
          code: "already_recorded",
          message:
            `O título ${input.winningNumber} deste sorteio já tem ` +
            `${jaExiste.total} ganhador(es) registrado(s). Registrar de novo ` +
            "criaria linhas indistinguíveis de duplicata. Nada foi alterado.",
        },
      };
    }

    // ── Quem comprou o título sorteado ──────────────────────────────────
    //
    // Só unidade VENDIDA (`status = 'sold'`) concorre. Reserva não paga não
    // é compra — e é o que torna a metade órfã um caso real em vez de
    // teórico: a outra metade pode ter sido reservada e abandonada.
    const vendidas = await tx
      .select({
        half: productNumbers.half,
        orderId: orders.id,
        name: users.name,
        phone: users.phone,
      })
      .from(productNumbers)
      .innerJoin(orders, eq(orders.id, productNumbers.orderId))
      .innerJoin(users, eq(users.id, orders.userId))
      .where(
        and(
          eq(productNumbers.productId, input.productId),
          eq(productNumbers.number, input.winningNumber),
          eq(productNumbers.status, "sold"),
        ),
      )
      .orderBy(productNumbers.half);

    if (vendidas.length === 0) {
      return {
        ok: false,
        refusal: {
          code: "no_sold_units",
          message:
            `Ninguém comprou o título ${input.winningNumber} deste sorteio. ` +
            "Não há ganhador a registrar.",
        },
      };
    }

    const soldHalves: SoldHalf[] = vendidas.map((linha) => ({
      half: linha.half,
      // `winner_name` é NOT NULL e o comprador do checkout rápido só informa
      // telefone (`reserve.ts:300-304` cria o usuário com `phone` e nada
      // mais). O telefone é o identificador que o operador de fato tem para
      // falar com a pessoa; quem decide como EXIBIR isso em público é a
      // LTM-08, que já tem a coluna `phone` ao lado.
      winnerName: linha.name ?? linha.phone ?? "Comprador sem nome",
      phone: linha.phone,
      orderId: linha.orderId,
    }));

    const shares: PrizeShare[] = splitPrizeAmongHalves({
      prizeCents,
      halvesPerTitle: halvesPerTitleOf(product),
      soldHalves,
    });

    const gravadas = await tx
      .insert(winners)
      .values(
        shares.map((share) => ({
          tenantId: input.tenantId,
          productId: input.productId,
          winnerName: share.winnerName,
          phone: share.phone,
          prizeDescription:
            input.prizeDescription ?? `Prêmio do título ${input.winningNumber}`,
          prizeAmount: fromCents(share.prizeAmountCents),
          winningNumber: input.winningNumber,
          winningHalf: share.winningHalf,
          ...(input.announcedAt ? { announcedAt: input.announcedAt } : {}),
        })),
      )
      .returning({
        id: winners.id,
        winnerName: winners.winnerName,
        winningNumber: winners.winningNumber,
        winningHalf: winners.winningHalf,
        prizeAmount: winners.prizeAmount,
      });

    return {
      ok: true,
      recorded: gravadas.map((linha) => ({
        id: linha.id,
        winnerName: linha.winnerName,
        // `winning_number` e `prize_amount` são nuláveis no schema por causa
        // do registro manual de ganhador; nesta porta eles SEMPRE existem,
        // porque é esta função que os escreve.
        winningNumber: linha.winningNumber ?? input.winningNumber,
        winningHalf: linha.winningHalf,
        prizeAmount: linha.prizeAmount ?? "0.00",
      })),
    };
  });
}
