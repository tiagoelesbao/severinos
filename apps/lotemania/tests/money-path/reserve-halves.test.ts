// A reserva na forma de METADES (LTM-02: AC9, AC10 e os três cenários do AC4).
//
// ════════════════════════════════════════════════════════════════════════
// O AC9 É UMA LINHA DE TESTE CONTRA UMA VENDA DUPLA SILENCIOSA.
//
// O predicado da reserva era `inArray(productNumbers.number, ...)`, que casa
// por NÚMERO. Com uma linha por metade (ADR-0001), aquele `WHERE` casava AS
// DUAS: quem pedia uma metade do 4 levava o 4 inteiro e pagava metade. Sem
// erro, sem log — só um título desaparecendo do estoque a cada meia cota
// vendida. O teste "a outra metade continua disponível" é o que impede essa
// regressão de voltar.
//
// A LTM-05 deixou isto de fora de propósito e com a razão escrita: um teste
// de metade precisaria de regra de cobrança que ainda não existia. Ela
// existe agora, e é o AC10.
// ════════════════════════════════════════════════════════════════════════

import { beforeEach, describe, expect, it } from "vitest";

import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { errorOf, metade, orderIdOf, titulos } from "../helpers/actions";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createRaffle,
  createTenant,
  readOrder,
  readOrders,
  readUnits,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

describe("reserva em sorteio divisível", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    // 10 títulos divisíveis = 20 unidades vendáveis, com half 1 e 2.
    raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      isDivisible: true,
      pricePerNumber: "10.00",
    });
  });

  it("AC9: reservar UMA metade do 4 deixa a OUTRA metade do 4 disponível", async () => {
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(4, 1)],
        phone: syntheticPhone(),
      }),
    );

    const doQuatro = (await readUnits(raffle.id)).filter((u) => u.number === 4);
    expect(doQuatro).toHaveLength(2);

    const tomada = doQuatro.find((u) => u.half === 1);
    const livre = doQuatro.find((u) => u.half === 2);
    expect(tomada?.status).toBe("reserved");
    expect(tomada?.order_id).toBe(orderId);
    expect(
      livre?.status,
      "a outra metade do mesmo título não podia sair do estoque — é a venda dupla do AC9",
    ).toBe("available");
    expect(livre?.order_id).toBeNull();

    // E a outra metade continua VENDÁVEL a outra pessoa, que é o ponto da
    // feature e não só a ausência do defeito.
    const segundoPedido = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(4, 2)],
        phone: syntheticPhone(),
      }),
    );
    expect(segundoPedido).not.toBe(orderId);

    const depois = (await readUnits(raffle.id)).filter((u) => u.number === 4);
    expect(new Set(depois.map((u) => u.order_id)).size, "duas metades, dois donos").toBe(2);

    await assertProductInvariants(raffle.id, "AC9 — duas metades do mesmo título");
  });

  it("AC10: a metade custa exatamente metade, e o título inteiro custa o cheio", async () => {
    const umaMetade = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(0, 1)],
        phone: syntheticPhone(),
      }),
    );
    const pedidoDaMetade = await readOrder(umaMetade);
    expect(pedidoDaMetade.amount, "metade de R$ 10,00 é R$ 5,00, sem ágio").toBe("5.00");
    expect(pedidoDaMetade.quantity, "uma metade é UMA unidade vendável").toBe(1);

    const tituloInteiro = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(1),
        phone: syntheticPhone(),
      }),
    );
    const pedidoDoTitulo = await readOrder(tituloInteiro);
    expect(pedidoDoTitulo.amount, "o título inteiro custa o preço cheio").toBe("10.00");
    expect(pedidoDoTitulo.quantity, "o título inteiro são DUAS unidades vendáveis").toBe(2);

    // As duas metades do 1 foram tomadas juntas, pelo mesmo pedido.
    const doUm = (await readUnits(raffle.id)).filter((u) => u.number === 1);
    expect(doUm.every((u) => u.order_id === tituloInteiro)).toBe(true);

    await assertProductInvariants(raffle.id, "AC10 — preço da unidade");
  });

  it("AC10 (regressão): em sorteio de cota inteira o preço é idêntico ao de hoje", async () => {
    const inteiro = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
    });

    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: inteiro.slug,
        units: titulos(0, 1, 2),
        phone: syntheticPhone(),
      }),
    );
    const order = await readOrder(orderId);
    expect(order.amount).toBe("30.00");
    expect(order.quantity).toBe(3);

    await assertProductInvariants(inteiro.id, "AC10 — regressão de cota inteira");
  });

  it("AC10: pedir metade em sorteio de cota inteira é recusado, não convertido", async () => {
    const inteiro = await createRaffle({ tenantId: tenant.id, totalNumbers: 5 });

    const outcome = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: inteiro.slug,
      units: [metade(0, 2)],
      phone: syntheticPhone(),
    });

    // Converter em silêncio para o título inteiro cobraria o dobro do que a
    // tela somou — por isso recusa, e com mensagem própria.
    expect(errorOf(outcome)).toMatch(/não é vendido em metades/i);
    expect(await readOrders(inteiro.id)).toHaveLength(0);
  });

  it("AC4 (a): 5 metades avulsas com 2 já tomadas não cria pedido nenhum", async () => {
    const primeiro = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: [metade(0, 1), metade(1, 1)],
      phone: syntheticPhone(),
    });
    const vencedor = orderIdOf(primeiro);
    const pedidosAntes = (await readOrders(raffle.id)).length;

    const segundo = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: [metade(0, 1), metade(1, 1), metade(2, 1), metade(3, 1), metade(4, 1)],
      phone: syntheticPhone(),
    });

    expect(errorOf(segundo)).toMatch(/acabou de ser reservado/i);
    expect(
      (await readOrders(raffle.id)).length,
      "a contagem de linhas em orders tem de ser IDÊNTICA à de antes da chamada",
    ).toBe(pedidosAntes);

    const units = await readUnits(raffle.id);
    for (const number of [2, 3, 4]) {
      const metades = units.filter((u) => u.number === number);
      expect(
        metades.every((u) => u.status === "available" && u.order_id === null),
        `as metades livres do ${number} tinham de continuar livres`,
      ).toBe(true);
    }
    expect(units.filter((u) => u.status === "reserved").map((u) => u.order_id)).toEqual([
      vencedor,
      vencedor,
    ]);

    await assertProductInvariants(raffle.id, "AC4 (a) — 5 metades avulsas");
  });

  it("AC4 (b): 5 títulos inteiros (10 unidades) com 2 unidades tomadas não cria pedido nenhum", async () => {
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(0),
      phone: syntheticPhone(),
    });
    const pedidosAntes = (await readOrders(raffle.id)).length;

    const segundo = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(0, 1, 2, 3, 4),
      phone: syntheticPhone(),
    });

    expect(errorOf(segundo)).toMatch(/acabou de ser reservado/i);
    expect((await readOrders(raffle.id)).length).toBe(pedidosAntes);

    const units = await readUnits(raffle.id);
    for (const number of [1, 2, 3, 4]) {
      expect(
        units.filter((u) => u.number === number).every((u) => u.status === "available"),
        `tudo-ou-nada: as duas metades do ${number} tinham de continuar livres`,
      ).toBe(true);
    }

    await assertProductInvariants(raffle.id, "AC4 (b) — 5 títulos inteiros");
  });

  it("AC4 (c): o carrinho MISTURADO funciona, e falha inteiro quando falha", async () => {
    // O ADR-0001 afirma que o carrinho misturado "sai de graça" com a metade
    // virando linha. Afirmação de graça é exatamente o tipo que merece
    // teste, e são duas metades da mesma prova: ele funciona, e ele é
    // tudo-ou-nada.

    // 1) Funciona: o 6 inteiro (2 unidades) + metade do 7 (1 unidade) = 3
    //    unidades, R$ 10,00 + R$ 5,00.
    const misturado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [...titulos(6), metade(7, 1)],
        phone: syntheticPhone(),
      }),
    );
    const order = await readOrder(misturado);
    expect(order.quantity).toBe(3);
    expect(order.amount).toBe("15.00");

    const units = await readUnits(raffle.id);
    expect(units.filter((u) => u.number === 6).every((u) => u.order_id === misturado)).toBe(
      true,
    );
    expect(units.find((u) => u.number === 7 && u.half === 1)?.order_id).toBe(misturado);
    expect(
      units.find((u) => u.number === 7 && u.half === 2)?.status,
      "a outra metade do 7 continua à venda",
    ).toBe("available");

    // 2) Tudo-ou-nada: outro carrinho misturado pedindo a metade que já foi
    //    tomada não cria pedido e não toma o título inteiro que também
    //    pediu.
    const pedidosAntes = (await readOrders(raffle.id)).length;
    const recusado = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: [...titulos(8), metade(7, 1)],
      phone: syntheticPhone(),
    });

    expect(errorOf(recusado)).toMatch(/acabou de ser reservado/i);
    expect((await readOrders(raffle.id)).length).toBe(pedidosAntes);
    expect(
      (await readUnits(raffle.id))
        .filter((u) => u.number === 8)
        .every((u) => u.status === "available"),
      "o 8 inteiro não podia ter sido tomado por um carrinho que falhou",
    ).toBe(true);

    await assertProductInvariants(raffle.id, "AC4 (c) — carrinho misturado");
  });

  it("seleção repetida é recusada em vez de cobrada duas vezes", async () => {
    // Deduplicar em silêncio cobraria um valor diferente do que a tela
    // somou; cobrar duas vezes a mesma metade é impossível. Recusa.
    await expect(
      reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(0, 1), metade(0, 1)],
        phone: syntheticPhone(),
      }),
    ).rejects.toThrow(/duas vezes/i);

    await expect(
      reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [...titulos(0), metade(0, 1)],
        phone: syntheticPhone(),
      }),
    ).rejects.toThrow(/título inteiro e como metade/i);

    expect(await readOrders(raffle.id)).toHaveLength(0);
  });
});
