"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/require-user";
import {
  defineWinnersForRaffle,
  parseAnnouncedAt,
  type DefineWinnersResult,
} from "@/lib/raffles/define-winners";

// ════════════════════════════════════════════════════════════════════════
// A CASCA DA DEFINIÇÃO DE GANHADORES (LTM-27)
//
// Autoriza, delega e revalida. A decisão inteira — a leitura do número, a
// validação de dígitos, a leitura do valor de cada lugar e o acionamento do
// rateio — mora em `lib/raffles/define-winners.ts`, para ser verificável
// contra o Postgres de verdade sem mockar `cookies()`. Mesmo desenho de
// `setProductDivisibility` (`actions/products.ts:179`).
//
// ⚠️ DUAS REGRAS QUE ESTE ARQUIVO NÃO PODE QUEBRAR
//
// 1. SÓ função assíncrona é exportada daqui. Um módulo `"use server"` que
//    exporta um valor não-assíncrono ZERA todas as exportações dele no grafo
//    do cliente; `lint` e `typecheck` passam, e só `next build` acusa — num
//    outro arquivo. Já aconteceu três vezes nesta base. Tipo e constante
//    ficam no módulo irmão puro, e a tela os importa com `import type`.
//
// 2. NUNCA lança para dizer "não deu". Não existe `error.tsx` em nenhum
//    nível de `src/app` (medido em 2026-11-20), então uma action que lança
//    deixa a tela muda — o defeito da LTM-26. Toda saída daqui é
//    `{ ok: false, refusal }` com razão nomeada, inclusive a falha não
//    prevista, que vira `unexpected_error` em vez de sumir.
// ════════════════════════════════════════════════════════════════════════

export async function defineWinners(input: {
  productId: string;
  /** Uma linha por ganhador — quantas o operador quiser cadastrar. */
  entries: {
    prizeIndex: number;
    rawNumber: string;
    prizeDescription?: string | null;
    /**
     * O valor daquele lugar, em reais. STRING, nunca `number`, pela razão de
     * `money.ts:36-39`: `number` chega tendo passado por ponto flutuante e
     * depois não se distingue dado de resíduo binário.
     */
    rawPrizeAmount?: string | null;
  }[];
  /** A `Data do sorteio` do modal, como o `datetime-local` a entrega. */
  announcedAt?: string | null;
}): Promise<DefineWinnersResult> {
  try {
    const user = await requireUser();

    const quando = parseAnnouncedAt(input.announcedAt);
    if (!quando.ok) return { ok: false, refusal: quando.refusal };

    const result = await defineWinnersForRaffle({
      tenantId: user.tenantId,
      productId: input.productId,
      entries: input.entries,
      announcedAt: quando.announcedAt,
    });

    // Revalida só quando algo FOI gravado. Revalidar depois de uma recusa
    // recarregaria a lista para mostrar exatamente o mesmo estado, e o
    // operador leria isso como "salvou".
    if (result.ok && result.recordedCount > 0) {
      revalidatePath("/dashboard/products");
      revalidatePath(`/dashboard/products/${input.productId}`);
    }

    return result;
  } catch (error) {
    return {
      ok: false,
      refusal: {
        code: "unexpected_error",
        message:
          error instanceof Error
            ? error.message
            : "Falha inesperada ao definir ganhadores. Nada foi gravado.",
      },
    };
  }
}
