// O teto do pool é real (LTM-02, AC8).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE TESTE NÃO RODA NA SUÍTE POR PADRÃO
//
// Ele faz 200 reservas SEQUENCIAIS contra um Postgres de verdade: ~3 a 5
// minutos, sozinho mais que o dobro de toda a suíte. Suíte lenta é suíte
// que a equipe para de rodar — é um risco [Médio] registrado na LTM-05, e
// não se paga esse preço todo dia por uma medição que muda quando o TETO
// muda, não quando o código muda.
//
// Então ele é explícito:
//
//   LTM02_POOL_MEASURE=1 pnpm test pool-cap
//
// A medição vai para o Dev Record da story. Sem essa prova, a troca de
// driver troca varredura sequencial por esgotamento de conexão — que é o
// risco [Médio] que a própria LTM-02 registrou.
// ════════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";

import { DB_APPLICATION_NAME } from "@/db";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { isReserveOk, titulos } from "../helpers/actions";
import { query } from "../helpers/db";
import { assertProductInvariants } from "../helpers/invariants";
import { createRaffle, createTenant, syntheticPhone } from "../helpers/seed";

const MEDIR = process.env.LTM02_POOL_MEASURE === "1";
const RESERVAS = Number(process.env.LTM02_POOL_RESERVAS ?? 200);

/** O teto efetivo do pool do app, lido da mesma variável que o `src/db`. */
const TETO = Number(process.env.DATABASE_POOL_MAX ?? 10);

async function conexoesDoApp(): Promise<number> {
  const rows = await query<{ total: string }>(
    `SELECT count(*)::text AS total
       FROM pg_stat_activity
      WHERE datname = current_database()
        AND application_name = $1`,
    [DB_APPLICATION_NAME],
  );
  return Number(rows[0].total);
}

describe.skipIf(!MEDIR)("AC8 — teto de conexões do pool", () => {
  it(`${RESERVAS} reservas sequenciais mantêm as conexões abertas <= ${TETO}`, async () => {
    const tenant = await createTenant();
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: RESERVAS + 20,
    });

    let maxConexoes = 0;
    const amostras: number[] = [];
    const latencias: number[] = [];

    for (let i = 0; i < RESERVAS; i++) {
      const comecou = performance.now();
      const outcome = await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(i),
        // Telefone novo por reserva: o anti-spam é por comprador e
        // bloquearia o loop na quarta tentativa do mesmo telefone.
        phone: syntheticPhone(),
      });
      latencias.push(performance.now() - comecou);
      expect(isReserveOk(outcome), `reserva ${i} falhou: ${JSON.stringify(outcome)}`).toBe(
        true,
      );

      const abertas = await conexoesDoApp();
      amostras.push(abertas);
      maxConexoes = Math.max(maxConexoes, abertas);
    }

    const ordenadas = [...latencias].sort((a, b) => a - b);
    const p50 = ordenadas[Math.floor(ordenadas.length * 0.5)];
    const p95 = ordenadas[Math.floor(ordenadas.length * 0.95)];

    console.log(
      `[LTM-02] AC8: ${RESERVAS} reservas sequenciais · conexões do app: ` +
        `máx ${maxConexoes}, última ${amostras[amostras.length - 1]}, teto ${TETO} · ` +
        `latência por reserva p50 ${p50.toFixed(0)} ms, p95 ${p95.toFixed(0)} ms, ` +
        `máx ${ordenadas[ordenadas.length - 1].toFixed(0)} ms`,
    );

    expect(
      maxConexoes,
      `o pool passou do teto: ${maxConexoes} conexões abertas contra um teto de ${TETO}`,
    ).toBeLessThanOrEqual(TETO);

    await assertProductInvariants(raffle.id, `AC8 — depois de ${RESERVAS} reservas sequenciais`);
  },
  // Teto próprio: cada reserva mede ~1 s contra o Neon, e o teto global de
  // 60 s da suíte derrubaria a medição por relógio na quinquagésima.
  60_000 + RESERVAS * 4_000);
});
