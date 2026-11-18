// Reserva sob disputa — 20 operações realmente paralelas sobre as mesmas 10
// unidades vendáveis (LTM-05 escreveu; LTM-02 tornou verde).
//
// ════════════════════════════════════════════════════════════════════════
// AC3 DA LTM-02, NA FORMA FORTE QUE A STORY PEDE.
//
// A LTM-05 deixou aqui dois testes: um verde que afirmava "NO MÁXIMO um
// pedido vence" e um `it.fails` que negava o resíduo em `canceled`. Os dois
// foram reescritos nesta story, de propósito e com a razão escrita:
//
//   • "no máximo um vencedor" é a forma FRACA. Ela aceita o resultado que o
//     @po nomeou como risco aberto na validação de 2026-11-16 — "dois
//     desfazem, nenhum leva": 10 unidades livres, zero reserva, nenhum
//     comprador atendido numa rodada que esgota em 18 minutos. O AC3 exige
//     EXATAMENTE um vencedor COM as 10 unidades, e é isso que se asserta
//     abaixo. Fraquejar aqui é aprovar o portão G4 do epic pelo motivo
//     errado.
//
//   • o `it.fails` do resíduo saiu da marcação e virou asserção comum, como
//     a própria LTM-05 instruiu ("quando a LTM-02 tornar a reserva atômica,
//     este teste passa, `it.fails` quebra a suíte e obriga a remover a
//     marcação").
//
// O MECANISMO que garante o vencedor único, e que esta story documenta em
// `src/lib/actions/reserve.ts`: a tomada das unidades trava o conjunto
// inteiro em ORDEM DETERMINÍSTICA (`ORDER BY number, half ... FOR UPDATE`)
// dentro da transação. Ordem igual para todos os disputantes é o que
// impede o emparelhamento cruzado — e é por isso que ninguém sai com um
// subconjunto.
// ════════════════════════════════════════════════════════════════════════
//
// Nenhuma asserção sobre ordem de vencedores nem sobre tempo: as duas
// seriam intermitentes, e teste intermitente é o pior resultado possível
// porque treina a equipe a ignorar vermelho.

import { describe, expect, it } from "vitest";

import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { titulos } from "../helpers/actions";
import { describeFanOut, fanOut } from "../helpers/concurrency";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createRaffle,
  createTenant,
  readOrders,
  readUnits,
  syntheticPhone,
} from "../helpers/seed";

const COMPRADORES = 20;
const TITULOS = 10;

// Mecanismo não se prova numa rodada. O padrão é 1 para a suíte seguir
// rápida o bastante para ser rodada; a prova de 10 rodadas do Dev Record
// sai de `LTM02_AC3_RODADAS=10 pnpm test`.
const RODADAS = Math.max(1, Number(process.env.LTM02_AC3_RODADAS ?? 1));

async function disputarMesmasUnidades() {
  const tenant = await createTenant();
  const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: TITULOS });

  // Um telefone por comprador: 20 pessoas disputando, não uma pessoa
  // clicando 20 vezes. O anti-spam é por comprador e não entra nesta
  // medição.
  const telefones = Array.from({ length: COMPRADORES }, () => syntheticPhone());

  const result = await fanOut(COMPRADORES, (i) =>
    reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(...raffle.numbers),
      phone: telefones[i],
    }),
  );

  return { raffle, result };
}

describe("reserva sob disputa", () => {
  it(
    `AC3: exatamente um vencedor com as ${TITULOS} unidades, e zero resíduo (${RODADAS}x)`,
    async () => {
      for (let rodada = 1; rodada <= RODADAS; rodada++) {
        const { raffle, result } = await disputarMesmasUnidades();

        console.log(describeFanOut(`AC3 rodada ${rodada}/${RODADAS}`, result));

        // Toda chamada RETORNOU — recusa aqui é valor de retorno, não
        // exceção. Exceção vazando seria erro de infraestrutura, não disputa.
        expect(
          result.rejected,
          JSON.stringify(result.rejected.map((o) => String(o.error))),
        ).toHaveLength(0);

        const orders = await readOrders(raffle.id);
        const units = await readUnits(raffle.id);

        // (a) UM pedido, e ele é o do vencedor. Nada de "no máximo um".
        expect(
          orders.map((o) => ({ id: o.id, status: o.status, quantity: o.quantity })),
          "a disputa tem de produzir exatamente UM pedido: o do vencedor",
        ).toHaveLength(1);
        expect(orders[0].status).toBe("pending");
        expect(orders[0].quantity).toBe(TITULOS);

        // (b) ZERO resíduo em canceled — o pedido do perdedor não chega a
        // nascer, porque pedido e unidades passaram a ser escritos juntos.
        expect(orders.filter((o) => o.status === "canceled")).toHaveLength(0);

        // (c) a soma das unidades reservadas é 10, e cada uma tem UM dono.
        const reservadas = units.filter((u) => u.status === "reserved");
        expect(reservadas).toHaveLength(TITULOS);
        expect(new Set(reservadas.map((u) => u.order_id))).toEqual(
          new Set([orders[0].id]),
        );
        expect(
          new Set(reservadas.map((u) => `${u.number}:${u.half}`)).size,
          "duas linhas para a mesma unidade vendável é venda dupla",
        ).toBe(TITULOS);

        // (d) os 19 perdedores receberam recusa, e nenhum deles levou nada.
        const recusas = result.fulfilled.filter(
          (o) => o.value && "error" in o.value,
        );
        expect(recusas).toHaveLength(COMPRADORES - 1);

        // (e) nenhuma unidade sobrou presa sem dono.
        expect(units.filter((u) => u.status === "available")).toHaveLength(0);

        // (f) os invariantes — inclusive "pedido pendente sem unidade" (I6)
        // e "unidade apontando para pedido inexistente" (I5), que o AC3
        // nomeia um por um.
        await assertProductInvariants(
          raffle.id,
          `AC3 rodada ${rodada}: 20 reservas paralelas sobre as mesmas 10 unidades`,
        );
      }
    },
    // Teto próprio, proporcional às rodadas: uma rodada mede ~5 s contra o
    // Neon (seed + 20 disputas + conferência). Com o teto global de 60 s da
    // suíte, a prova de 10 rodadas morria por relógio DEPOIS de as dez já
    // terem passado — vermelho que não era defeito do código, que é o pior
    // tipo de vermelho.
    30_000 + RODADAS * 20_000,
  );
});
