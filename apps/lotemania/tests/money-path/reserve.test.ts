// Reserva — o comportamento que existe hoje (LTM-05, AC6 e AC7).
//
// Todos os testes deste arquivo são VERDES contra o código atual, inclusive
// os que descrevem defeito. A suíte descreve o que o código faz; mudar o
// código é escopo da LTM-02.

import { beforeEach, describe, expect, it } from "vitest";

import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { errorOf, orderIdOf, titulos } from "../helpers/actions";
import { assertProductInvariants } from "../helpers/invariants";
import {
  blockPhone,
  createRaffle,
  createTenant,
  readOrders,
  readUnits,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

describe("reserveSelectedNumbers", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    // Tenant e sorteio próprios por teste: é assim que os testes se isolam
    // compartilhando uma base só (ver vitest.config.ts).
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  });

  it("caminho feliz: reserva as unidades pedidas e abre um pedido pendente", async () => {
    const phone = syntheticPhone();

    const outcome = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(0, 1, 2),
      phone,
    });
    const orderId = orderIdOf(outcome);

    const units = await readUnits(raffle.id);
    const reserved = units.filter((u) => u.status === "reserved");
    expect(reserved).toHaveLength(3);
    expect(reserved.map((u) => u.number)).toEqual([0, 1, 2]);
    expect(new Set(reserved.map((u) => u.order_id))).toEqual(new Set([orderId]));
    for (const unit of reserved) {
      expect(unit.reserved_until, "reserva sem prazo é unidade presa para sempre").not.toBeNull();
      expect(new Date(unit.reserved_until as string).getTime()).toBeGreaterThan(Date.now());
    }

    // As 7 restantes continuam no estoque.
    expect(units.filter((u) => u.status === "available")).toHaveLength(7);

    const orders = await readOrders(raffle.id);
    expect(orders).toHaveLength(1);
    expect(orders[0].status).toBe("pending");
    // `quantity` conta o que o pedido CONTÉM — unidades vendáveis (ADR-0001).
    expect(orders[0].quantity).toBe(3);
    expect(orders[0].amount).toBe("30.00");

    await assertProductInvariants(raffle.id, "reserva no caminho feliz");
  });

  it("ramo de falha: operador que não existe", async () => {
    const outcome = await reserveSelectedNumbers({
      tenantSlug: `operador-que-nao-existe-${Date.now()}`,
      productSlug: raffle.slug,
      units: titulos(0),
      phone: syntheticPhone(),
    });

    expect(errorOf(outcome)).toBe("Operador não encontrado.");
    // Recusa antes de tocar em nada: nenhum pedido, nenhuma unidade.
    expect(await readOrders(raffle.id)).toHaveLength(0);
    await assertProductInvariants(raffle.id, "operador inexistente");
  });

  it("ramo de falha: operador desativado é tratado como inexistente", async () => {
    const inactive = await createTenant({ isActive: false });
    const otherRaffle = await createRaffle({ tenantId: inactive.id, totalNumbers: 5 });

    const outcome = await reserveSelectedNumbers({
      tenantSlug: inactive.slug,
      productSlug: otherRaffle.slug,
      units: titulos(0),
      phone: syntheticPhone(),
    });

    expect(errorOf(outcome)).toBe("Operador não encontrado.");
    await assertProductInvariants(otherRaffle.id, "operador desativado");
  });

  it("ramo de falha: sorteio que não está ativo", async () => {
    const draft = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 5,
      status: "draft",
    });

    const outcome = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: draft.slug,
      units: titulos(0),
      phone: syntheticPhone(),
    });

    expect(errorOf(outcome)).toBe("Sorteio não encontrado ou encerrado.");
    expect(await readOrders(draft.id)).toHaveLength(0);
    await assertProductInvariants(draft.id, "sorteio em rascunho");
  });

  it("ramo de falha: telefone bloqueado", async () => {
    const phone = syntheticPhone();
    await blockPhone(tenant.id, phone);

    const outcome = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(0, 1),
      phone,
    });

    expect(errorOf(outcome)).toMatch(/bloqueado/i);
    expect(await readOrders(raffle.id)).toHaveLength(0);
    await assertProductInvariants(raffle.id, "telefone bloqueado");
  });

  it("AC4: reserva parcial é tudo-ou-nada e NÃO deixa resíduo em canceled", async () => {
    // ⚠️ REESCRITO NA LTM-02, e a reescrita é o aceite.
    //
    // A LTM-05 deixou este teste verde afirmando o DEFEITO — "deixa resíduo
    // em canceled" — com a instrução escrita de que ele quebraria quando a
    // reserva virasse atômica, e que a quebra tinha de ser deliberada e
    // visível no diff. Foi o que aconteceu: medido contra o código novo, a
    // disputa perdida passou a produzir 1 pedido em vez de 2.
    //
    // O que mudou de fato: o pedido do perdedor não chega a NASCER, porque
    // pedido e unidades são escritos na mesma transação e a perda da
    // disputa desfaz as duas. Antes, cada disputa perdida deixava um pedido
    // `canceled` no extrato de um comprador que nunca pediu cancelamento —
    // e com esgotamento a ~5,5 unidades/minuto, disputa perdida é rotina.
    const primeiro = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(0, 1),
      phone: syntheticPhone(),
    });
    const vencedor = orderIdOf(primeiro);

    const segundo = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(1, 2, 3),
      phone: syntheticPhone(),
    });

    expect(errorOf(segundo)).toMatch(/acabou de ser reservado/i);

    const units = await readUnits(raffle.id);
    // O vencedor manteve as suas duas; o perdedor devolveu tudo o que tomou.
    expect(units.filter((u) => u.status === "reserved").map((u) => u.number)).toEqual([0, 1]);
    expect(
      units.filter((u) => u.status === "reserved").every((u) => u.order_id === vencedor),
    ).toBe(true);
    for (const unit of units.filter((u) => u.status === "available")) {
      expect(unit.order_id, "unidade devolvida ao estoque não pode guardar pedido").toBeNull();
      expect(unit.reserved_until).toBeNull();
    }

    // ZERO resíduo: só o pedido do vencedor existe. A contagem de linhas em
    // `orders` é a medida do AC4, e ela é IDÊNTICA à de antes da chamada
    // perdida.
    const orders = await readOrders(raffle.id);
    expect(orders.map((o) => ({ id: o.id, status: o.status }))).toHaveLength(1);
    expect(orders[0].id).toBe(vencedor);
    expect(orders[0].status).toBe("pending");
    expect(
      orders.filter((o) => o.status === "canceled"),
      "pedido em canceled aqui é o resíduo que esta story existiu para eliminar",
    ).toHaveLength(0);

    await assertProductInvariants(raffle.id, "reserva parcial sem resíduo");
  });

  it("ramo de falha: número que não existe no sorteio recusa e não cria pedido", async () => {
    // ⚠️ REESCRITO NA LTM-02 (era "...e deixa o mesmo resíduo"). O que mudou
    // é a mesma coisa do teste acima: o pedido não nasce. O que NÃO mudou, e
    // continua registrado: o código não distingue "número inexistente" de
    // "número já tomado" — a mesma recusa sai nos dois casos, porque a
    // contagem exata de unidades tomadas é o único critério. Mensagem nova
    // seria mudança de UX que nenhum AC pediu.
    const outcome = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      // O sorteio tem 0..9; 999 não existe.
      units: titulos(0, 999),
      phone: syntheticPhone(),
    });

    expect(errorOf(outcome)).toMatch(/acabou de ser reservado/i);

    const units = await readUnits(raffle.id);
    expect(units.filter((u) => u.status !== "available")).toHaveLength(0);
    expect(
      await readOrders(raffle.id),
      "nem mesmo um pedido em canceled: a tentativa inteira foi desfeita",
    ).toHaveLength(0);

    await assertProductInvariants(raffle.id, "número inexistente no sorteio");
  });
});
