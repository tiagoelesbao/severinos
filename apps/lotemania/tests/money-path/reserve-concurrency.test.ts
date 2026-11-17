// Reserva sob disputa — 20 operações realmente paralelas sobre os mesmos 10
// números (LTM-05, AC3).
//
// Este arquivo tem testes das DUAS naturezas, e é o lugar onde a regra de
// verde e vermelho do AC1 aparece inteira:
//
//   VERDE   os invariantes ficam íntegros depois da disputa, e no máximo um
//           pedido sai vencedor. É verdade hoje — o `UPDATE` condicional já
//           é atômico por linha —, e é o valor composto do verificador.
//   VERMELHO a disputa não deixa resíduo de pedido cancelado. É FALSO hoje,
//           por construção e sem depender de sorte: com 20 pedidos sobre as
//           mesmas 10 unidades, no máximo um pode vencer, então ao menos 19
//           perdedores criam um pedido e o cancelam. Vira verdade quando a
//           reserva passar a ser atômica de ponta a ponta na LTM-02.
//
// Nenhuma asserção sobre ordem de vencedores nem sobre tempo: as duas
// seriam intermitentes, e teste intermitente é o pior resultado possível
// porque treina a equipe a ignorar vermelho.

import { describe, expect, it } from "vitest";

import { reserveSelectedNumbers } from "@/lib/actions/reserve";

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

async function disputarMesmosNumeros() {
  const tenant = await createTenant();
  const raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: TITULOS });
  const numeros = raffle.numbers;

  // Um telefone por comprador: 20 pessoas disputando, não uma pessoa
  // clicando 20 vezes. O anti-spam é por comprador e não entra nesta
  // medição.
  const telefones = Array.from({ length: COMPRADORES }, () => syntheticPhone());

  const result = await fanOut(COMPRADORES, (i) =>
    reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      numbers: numeros,
      phone: telefones[i],
    }),
  );

  return { raffle, result };
}

describe("reserva sob disputa", () => {
  it("os invariantes ficam íntegros, e no máximo um pedido vence", async () => {
    const { raffle, result } = await disputarMesmosNumeros();

    console.log(describeFanOut("disputa 20x sobre os mesmos 10 títulos", result));

    // Toda chamada RETORNOU — recusa aqui é valor de retorno, não exceção.
    // Exceção vazando seria erro de infraestrutura, não disputa.
    expect(result.rejected, JSON.stringify(result.rejected.map((o) => String(o.error)))).toHaveLength(0);

    const orders = await readOrders(raffle.id);
    expect(orders).toHaveLength(COMPRADORES);

    const vencedores = orders.filter((o) => o.status === "pending");
    expect(vencedores.length).toBeLessThanOrEqual(1);

    const units = await readUnits(raffle.id);
    if (vencedores.length === 1) {
      const reservadas = units.filter((u) => u.status === "reserved");
      expect(reservadas).toHaveLength(TITULOS);
      expect(reservadas.every((u) => u.order_id === vencedores[0].id)).toBe(true);
    } else {
      expect(units.every((u) => u.status === "available")).toBe(true);
    }

    // O estado de hoje, registrado em número: ao menos 19 pedidos
    // cancelados. É o que o teste vermelho abaixo nega.
    expect(orders.filter((o) => o.status === "canceled").length).toBeGreaterThanOrEqual(
      COMPRADORES - 1,
    );

    await assertProductInvariants(raffle.id, "20 reservas paralelas sobre os mesmos 10 títulos");
  });

  // ⚠️ VERMELHO ESPERADO — [vira verde na LTM-02]
  //
  // Quando a LTM-02 tornar a reserva atômica, este teste passa, `it.fails`
  // quebra a suíte e obriga a remover a marcação. É assim que o vermelho de
  // hoje vira o aceite de amanhã sem ninguém precisar lembrar.
  //
  // PROIBIDO tornar isto verde consertando `reserve.ts` ou `db/index.ts`:
  // é escopo da LTM-02, e esta story não altera código de produção.
  it.fails(
    "a disputa não deixa resíduo de pedido cancelado [vira verde na LTM-02]",
    async () => {
      const { raffle, result } = await disputarMesmosNumeros();

      console.log(describeFanOut("vermelho esperado — resíduo em canceled", result));

      const orders = await readOrders(raffle.id);
      const canceladas = orders.filter((o) => o.status === "canceled");

      // Hoje: >= 19. Depois da LTM-02: 0 — o pedido do perdedor não chega a
      // nascer, porque pedido e unidades passam a ser escritos juntos.
      expect(
        canceladas.map((o) => ({ id: o.id, quantity: o.quantity })),
        `${canceladas.length} pedido(s) cancelado(s) sobraram da disputa. Cada um ` +
          `aparece no extrato de um comprador que nunca pediu cancelamento, e cada ` +
          `um tomou unidades do estoque por um instante antes de devolvê-las.`,
      ).toHaveLength(0);

      await assertProductInvariants(raffle.id, "vermelho esperado da LTM-02");
    },
  );
});
