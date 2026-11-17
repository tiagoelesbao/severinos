// Disparo realmente paralelo de N operações, e coleta do que cada uma
// devolveu (LTM-05, AC3 e AC4).
//
// "Realmente paralelo" aqui quer dizer: todas as N operações entram na
// primeira ida ao banco antes de qualquer uma voltar. Um laço com `await`
// dentro seria sequencial e provaria o contrário do que se quer. O portão
// abaixo existe porque mesmo `Promise.all` sobre funções já chamadas deixa
// a primeira correr sozinha enquanto as outras ainda estão sendo
// construídas — com o portão, todas param no mesmo lugar e saem juntas.
//
// Nenhuma asserção de TEMPO sai daqui, de propósito: latência medida em
// ambiente de teste afirma o que o ambiente dá, não o que o sistema faz. Os
// números de latência são devolvidos para REGISTRO (o portão G4 do epic os
// usa), nunca para `expect`.

export interface Outcome<T> {
  index: number;
  ok: boolean;
  value?: T;
  error?: unknown;
  latencyMs: number;
}

export interface FanOutResult<T> {
  outcomes: Outcome<T>[];
  fulfilled: Outcome<T>[];
  rejected: Outcome<T>[];
  /** Do disparo ao último retorno. */
  wallMs: number;
  latency: { p50: number; p95: number; max: number };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[index];
}

export async function fanOut<T>(
  count: number,
  task: (index: number) => Promise<T>,
): Promise<FanOutResult<T>> {
  let open: (() => void) | undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });

  const runs = Array.from({ length: count }, (_, index) =>
    (async (): Promise<Outcome<T>> => {
      await gate;
      const startedAt = performance.now();
      try {
        const value = await task(index);
        return { index, ok: true, value, latencyMs: performance.now() - startedAt };
      } catch (error) {
        return { index, ok: false, error, latencyMs: performance.now() - startedAt };
      }
    })(),
  );

  const wallStartedAt = performance.now();
  open?.();
  const outcomes = await Promise.all(runs);
  const wallMs = performance.now() - wallStartedAt;

  const sorted = outcomes.map((o) => o.latencyMs).sort((a, b) => a - b);

  return {
    outcomes,
    fulfilled: outcomes.filter((o) => o.ok),
    rejected: outcomes.filter((o) => !o.ok),
    wallMs,
    latency: {
      p50: percentile(sorted, 50),
      p95: percentile(sorted, 95),
      max: sorted.length > 0 ? sorted[sorted.length - 1] : 0,
    },
  };
}

/**
 * Formata a medição para o relato do Dev Record. É o que fecha o "medir o
 * tempo total e registrar" do risco [Médio] da story — sem virar asserção.
 */
export function describeFanOut(label: string, result: FanOutResult<unknown>): string {
  return (
    `[LTM-05] ${label}: ${result.outcomes.length} operações em ` +
    `${result.wallMs.toFixed(0)} ms · ok ${result.fulfilled.length} · ` +
    `erro ${result.rejected.length} · latência p50 ${result.latency.p50.toFixed(0)} ms, ` +
    `p95 ${result.latency.p95.toFixed(0)} ms, máx ${result.latency.max.toFixed(0)} ms`
  );
}
