// A divisibilidade de um sorteio — a ÚNICA porta que a altera (LTM-07).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ISTO NÃO MORA NA SERVER ACTION
//
// Mesmo motivo registrado em `lib/payments/gateway-config.ts` e conferido
// em `tests/money-path/gateway-config.test.tsx:16-21`: a server action
// chama `requireUser()`, que lê `cookies()` do Next, e `cookies()` não
// existe fora de uma requisição. Testar a regra através da action obrigaria
// a mockar a autenticação — e aí o que a suíte prova é o dublê.
//
// A decisão fica aqui, verificável contra o Postgres de verdade; a action
// (`actions/products.ts`) é a casca que só autoriza e revalida a tela.
//
// ════════════════════════════════════════════════════════════════════════
// MUDAR A DIVISIBILIDADE REESCREVE O ESTOQUE
//
// A metade é uma LINHA, não uma coluna (ADR-0001). Então habilitar não é
// virar um booleano: é fazer cada título passar de uma linha para duas, e
// desabilitar é o contrário. As duas escritas e o booleano vão na MESMA
// transação, porque o estado intermediário — sorteio marcado como divisível
// com uma linha por título — faria a reserva vender o título inteiro
// cobrando metade, que é exatamente a venda dupla silenciosa que o ADR
// nomeia.
//
// É seguro apagar linha ao desabilitar porque o congelamento já garantiu
// que NENHUMA está fora do estoque: nenhuma tem dono, nenhuma tem prazo.
// A ordem das verificações abaixo não é estilo — o congelamento vem antes
// de qualquer escrita.
// ════════════════════════════════════════════════════════════════════════

import { and, eq, ne, sql } from "drizzle-orm";

import { db } from "@/db";
import { productNumbers, products } from "@/db/schema";
import {
  divisibilityRefusalFor,
  halvesPerTitleOf,
  sellingFreezeRefusal,
  type DivisibilityRefusal,
} from "@/lib/validations/product";
import { productAdvancedSettingsSchema } from "@/lib/validations/product-settings";

export interface SetDivisibilityInput {
  readonly tenantId: string;
  readonly productId: string;
  readonly isDivisible: boolean;
}

export type SetDivisibilityResult =
  | {
      readonly ok: true;
      /** `false` quando o sorteio já estava nesse estado — nada foi escrito. */
      readonly changed: boolean;
      readonly isDivisible: boolean;
      /** Linhas de `product_numbers` que o sorteio tem depois da operação. */
      readonly sellableUnits: number;
    }
  | { readonly ok: false; readonly refusal: DivisibilityRefusal };

/**
 * O prêmio do sorteio, lido da aba Prêmios.
 *
 * ⚠️ SEMPRE por `productAdvancedSettingsSchema.parse`, nunca por acesso cru
 * ao jsonb: sorteio criado antes desta story tem `advanced_settings = {}`, e
 * são os defaults do schema que entregam `prizeKind: "other"` — acesso cru
 * devolveria `undefined` e a comparação `!== "cash"` passaria por acidente,
 * não por regra. Mesma razão escrita em `validations/reserve.ts:56-60`.
 */
function prizeOf(advancedSettings: unknown):
  | { ok: true; prizeKind: "cash" | "other"; prizeAmount: string | null }
  | { ok: false; reason: string } {
  const parsed = productAdvancedSettingsSchema.safeParse(advancedSettings ?? {});
  if (!parsed.success) {
    return { ok: false, reason: parsed.error.issues.map((i) => i.message).join("; ") };
  }
  return {
    ok: true,
    prizeKind: parsed.data.prizeKind,
    prizeAmount: parsed.data.prizeAmount,
  };
}

export async function setRaffleDivisibilityForTenant(
  input: SetDivisibilityInput,
): Promise<SetDivisibilityResult> {
  return db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(and(eq(products.id, input.productId), eq(products.tenantId, input.tenantId)))
      .limit(1)
      .for("update");

    if (!product) {
      return {
        ok: false,
        refusal: {
          code: "raffle_not_found",
          message: `Nenhum sorteio com id ${input.productId} para este operador.`,
        },
      };
    }

    const unitsNow = await countSellableUnits(tx, input.productId);

    // Já está no estado pedido: nada a alterar, e portanto nada a congelar.
    // O congelamento proíbe ALTERAR (AC9); reafirmar o que já vale não é uma
    // alteração, e recusar aqui faria uma chamada idempotente parecer erro.
    if (product.isDivisible === input.isDivisible) {
      return {
        ok: true,
        changed: false,
        isDivisible: product.isDivisible,
        sellableUnits: unitsNow,
      };
    }

    // ── AC9: o congelamento, ANTES de qualquer escrita ──────────────────
    const [fora] = await tx
      .select({ total: sql<number>`count(*)::int` })
      .from(productNumbers)
      .where(
        and(
          eq(productNumbers.productId, input.productId),
          ne(productNumbers.status, "available"),
        ),
      );
    const congelado = sellingFreezeRefusal(fora?.total ?? 0);
    if (congelado) return { ok: false, refusal: congelado };

    // ── AC10 e AC12: o prêmio, só quando se está HABILITANDO ────────────
    //
    // Desabilitar não precisa de prêmio divisível: volta-se ao caso de cota
    // inteira, que não divide nada. Exigir a mesma prova para sair seria
    // prender o operador num estado por causa da regra que protege a
    // entrada dele.
    if (input.isDivisible) {
      const prize = prizeOf(product.advancedSettings);
      if (!prize.ok) {
        return {
          ok: false,
          refusal: {
            code: "prize_settings_unreadable",
            message:
              `A aba Prêmios deste sorteio não pôde ser lida (${prize.reason}). ` +
              "Corrija a configuração antes de habilitar a meia cota.",
          },
        };
      }
      const recusa = divisibilityRefusalFor({
        prize: { prizeKind: prize.prizeKind, prizeAmount: prize.prizeAmount },
        pricePerNumber: product.pricePerNumber,
      });
      if (recusa) return { ok: false, refusal: recusa };
    }

    // ── As escritas. Daqui para baixo não há decisão, só efeito ─────────
    const halves = halvesPerTitleOf({ isDivisible: input.isDivisible });
    if (input.isDivisible) {
      // Uma linha por metade a partir das que já existem. `generate_series`
      // começa em 2 porque a metade 1 É a linha de hoje: o caso de cota
      // inteira é o degenerado de uma metade só, e reaproveitá-la preserva
      // o id da linha e qualquer coisa que aponte para ela.
      await tx.execute(sql`
        INSERT INTO product_numbers (product_id, number, half)
        SELECT pn.product_id, pn.number, h
          FROM product_numbers pn
          CROSS JOIN generate_series(2, ${halves}) AS h
         WHERE pn.product_id = ${input.productId}
           AND pn.half = 1
      `);
    } else {
      await tx.execute(sql`
        DELETE FROM product_numbers
         WHERE product_id = ${input.productId}
           AND half > 1
      `);
    }

    await tx
      .update(products)
      .set({ isDivisible: input.isDivisible, updatedAt: new Date() })
      .where(eq(products.id, input.productId));

    return {
      ok: true,
      changed: true,
      isDivisible: input.isDivisible,
      sellableUnits: await countSellableUnits(tx, input.productId),
    };
  });
}

/** A transação do Drizzle, como o driver neon-serverless a entrega. */
type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function countSellableUnits(
  tx: DbTransaction,
  productId: string,
): Promise<number> {
  const [row] = await tx
    .select({ total: sql<number>`count(*)::int` })
    .from(productNumbers)
    .where(eq(productNumbers.productId, productId));
  return row?.total ?? 0;
}
