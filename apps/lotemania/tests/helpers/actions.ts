// Atalhos de leitura do retorno das server actions.
//
// Não embrulham nem substituem nada: chamam a função de produção como ela é
// e só estreitam o tipo do retorno, que é uma união de `{ orderId }` com
// `{ error }`. Zero mock do `db` — AC2.

import type { reserveSelectedNumbers } from "@/lib/actions/reserve";

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
