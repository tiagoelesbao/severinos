// Atalhos de leitura do retorno das server actions.
//
// Não embrulham nem substituem nada: chamam a função de produção como ela é
// e só estreitam o tipo do retorno, que é uma união de `{ orderId }` com
// `{ error }`. Zero mock do `db` — AC2.

import type { reserveSelectedNumbers } from "@/lib/actions/reserve";
import type { ReserveUnitInput } from "@/lib/validations/reserve";

// ── A seleção, na unidade do sorteio (LTM-02) ───────────────────────────
//
// O contrato de entrada deixou de ser lista de números e passou a ser lista
// de unidades vendáveis. Estes dois atalhos existem para o teste dizer EM
// QUE UNIDADE está pedindo, sem repetir o literal em 17 chamadas:
//
//   titulos(0, 1, 2)   três títulos INTEIROS. Em sorteio de cota inteira é
//                      uma unidade cada; em sorteio divisível são as duas
//                      metades de cada um, tomadas juntas.
//   metade(42, 1)      UMA metade nomeada — a outra metade do 42 segue à
//                      venda. É o que o AC9 verifica.

/** Títulos inteiros: todas as unidades vendáveis de cada número. */
export function titulos(...numbers: number[]): ReserveUnitInput[] {
  return numbers.map((number) => ({ number, half: null }));
}

/** Uma metade nomeada de um título. */
export function metade(number: number, half: number): ReserveUnitInput {
  return { number, half };
}

export type ReserveOutcome = Awaited<ReturnType<typeof reserveSelectedNumbers>>;

export function isReserveOk(
  outcome: ReserveOutcome,
): outcome is Extract<ReserveOutcome, { orderId: string }> {
  return "orderId" in outcome;
}

export function orderIdOf(outcome: ReserveOutcome): string {
  if (isReserveOk(outcome)) return outcome.orderId;
  throw new Error(
    `Esperava reserva bem-sucedida e veio recusa: ${"error" in outcome ? outcome.error : JSON.stringify(outcome)}`,
  );
}

export function errorOf(outcome: ReserveOutcome): string {
  if (!isReserveOk(outcome) && "error" in outcome) return outcome.error;
  throw new Error(
    `Esperava recusa e a reserva passou: ${JSON.stringify(outcome)}`,
  );
}
