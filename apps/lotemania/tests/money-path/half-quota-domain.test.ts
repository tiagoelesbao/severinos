// O DOMÍNIO DA MEIA COTA (LTM-07) — contra Postgres de verdade.
//
// ════════════════════════════════════════════════════════════════════════
// O QUE ESTE ARQUIVO PROVA, E O QUE ELE DELIBERADAMENTE NÃO REPETE
//
// A LTM-02 já entregou a reserva na forma de metades, e a prova dela vive em
// `reserve-halves.test.ts` e `reserve-concurrency.test.ts`. Reescrever
// aquelas asserções aqui criaria uma segunda cópia da verdade — e cópia de
// teste diverge exatamente como cópia de código.
//
// O que é desta story:
//
//   AC1   uma metade, um dono, SOB CONCORRÊNCIA e em sorteio DIVISÍVEL.
//         A suíte da LTM-02 dispara 20 disputantes sobre cota inteira; o
//         dobro de contenção que a meia cota cria não estava medido.
//   AC2   o título inteiro é tudo-ou-nada quando a metade B já é de outro
//         PEDIDO — e a metade A não fica presa ao perdedor.
//   AC3   expiração entre PEDIDOS DIFERENTES (não dentro de um).
//   AC4   a soma do rateio é exatamente o prêmio.
//   AC5   metade órfã paga inteiro.
//   AC6   duas metades do mesmo dono não se fundem.
//   AC7   `quantity` conta unidades e `unit` nomeia a unidade.
//   AC9   congelamento na primeira venda.
//   AC10  prêmio não monetário recusa a divisibilidade.
//   AC11  `winners` sabe dizer qual metade.
//   AC12  prêmio que não divide exato em centavos recusa.
//
// AC8 (regressão de cota inteira) não tem teste PRÓPRIO de propósito: ele é
// a afirmação de que os outros arquivos da suíte passam sem alteração. Um
// teste novo chamado "AC8" provaria o que ele mesmo escreveu; o que prova o
// AC8 é `reserve.test.ts`, `expiration.test.ts`, `anti-spam.test.ts`,
// `checkout.test.ts` e `settle-order.test.ts` continuarem verdes sem uma
// linha mudada. A única linha tocada em `helpers/seed.ts` foi acrescentar
// `unit` ao SELECT — leitura, não comportamento.
// ════════════════════════════════════════════════════════════════════════

import { beforeEach, describe, expect, it } from "vitest";

import { settleOrder } from "@/lib/payments/settle-order";
import { setRaffleDivisibilityForTenant } from "@/lib/raffles/divisibility";
import { PrizeSplitError, splitPrizeAmongHalves } from "@/lib/raffles/prize-split";
import { recordWinnersForDrawnTitle } from "@/lib/raffles/winners";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { divisibilityRefusalFor } from "@/lib/validations/product";

import { errorOf, metade, orderIdOf, titulos } from "../helpers/actions";
import { fanOut } from "../helpers/concurrency";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createBuyer,
  createRaffle,
  createTenant,
  expireReservation,
  readOrder,
  readOrders,
  readRaffle,
  readUnits,
  readWinners,
  releaseUnitsOfOrder,
  setRafflePrize,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

/** O prêmio cheio do Império: cem mil, divisão limpa. */
const PREMIO_CHEIO = "100000.00";
/** O mesmo prêmio com um centavo ímpar — o caso que o AC12 recusa. */
const PREMIO_IMPAR = "100000.01";

async function criarDivisivel(tenant: SeededTenant, totalNumbers = 10) {
  return createRaffle({
    tenantId: tenant.id,
    totalNumbers,
    isDivisible: true,
    pricePerNumber: "10.00",
    prize: { kind: "cash", amount: PREMIO_CHEIO },
  });
}

/** Reserva e PAGA, pelo caminho de produção — a unidade fica `sold`. */
async function comprar(
  tenant: SeededTenant,
  raffle: SeededRaffle,
  units: Parameters<typeof reserveSelectedNumbers>[0]["units"],
  phone: string,
): Promise<string> {
  const orderId = orderIdOf(
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units,
      phone,
    }),
  );
  const pago = await settleOrder({
    orderId,
    tenantId: tenant.id,
    description: "Pagamento sintetico — LTM-07",
  });
  if (!pago.ok) throw new Error(`Esperava pagamento fechado e veio ${pago.refusal}.`);
  return orderId;
}

describe("LTM-07 — a unidade do pedido (AC7)", () => {
  let tenant: SeededTenant;

  beforeEach(async () => {
    tenant = await createTenant();
  });

  it("AC7: 3 metades em sorteio divisível dão quantity = 3 e unit = half", async () => {
    const raffle = await criarDivisivel(tenant);

    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(0, 1), metade(1, 1), metade(2, 2)],
        phone: syntheticPhone(),
      }),
    );
    const order = await readOrder(orderId);

    // A asserção que DISCRIMINA. Na forma oposta — `quantity` contando
    // títulos — este mesmo pedido valeria 1,5 título, que nem é inteiro.
    // Só a forma do ADR-0001 produz 3.
    expect(order.quantity, "3 metades são 3 unidades vendáveis").toBe(3);
    expect(order.unit, "e o pedido DIZ que a unidade é a metade").toBe("half");

    // E o estoque confirma que foram 3 linhas, não 6: o pedido não levou os
    // títulos inteiros.
    const tomadas = (await readUnits(raffle.id)).filter((u) => u.order_id === orderId);
    expect(tomadas).toHaveLength(3);

    await assertProductInvariants(raffle.id, "AC7 — 3 metades");
  });

  it("AC7: 3 títulos em sorteio de cota inteira dão quantity = 3 e unit = title", async () => {
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

    expect(order.quantity).toBe(3);
    expect(order.unit, "sorteio de cota inteira conta TÍTULOS").toBe("title");

    await assertProductInvariants(inteiro.id, "AC7 — 3 títulos");
  });

  it("AC7: o título inteiro num sorteio divisível são 2 unidades, e a unidade continua metade", async () => {
    // O caso que separa "unidade do SORTEIO" de "o que o comprador escolheu".
    // Ele comprou um título; a unidade do sorteio continua sendo a metade, e
    // `quantity` conta 2 porque foram duas linhas.
    const raffle = await criarDivisivel(tenant);
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(3),
        phone: syntheticPhone(),
      }),
    );
    const order = await readOrder(orderId);
    expect(order.quantity).toBe(2);
    expect(order.unit).toBe("half");
  });
});

describe("LTM-07 — uma metade, um dono (AC1, AC2, AC3)", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await criarDivisivel(tenant);
  });

  it("AC1: duas reservas em paralelo disputando a MESMA metade produzem um dono só", async () => {
    const DISPUTANTES = 8;

    const result = await fanOut(DISPUTANTES, async () =>
      reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(5, 1)],
        phone: syntheticPhone(),
      }),
    );

    const vencedores = result.outcomes.filter(
      (o) => o.ok && o.value && "orderId" in o.value,
    );
    expect(
      vencedores.length,
      "exatamente um dono da metade 1 do título 5, sob disputa real",
    ).toBe(1);

    const doCinco = (await readUnits(raffle.id)).filter((u) => u.number === 5);
    const metadeDisputada = doCinco.find((u) => u.half === 1);
    const metadeLivre = doCinco.find((u) => u.half === 2);
    expect(metadeDisputada?.status).toBe("reserved");
    expect(
      metadeLivre?.status,
      "a disputa pela metade 1 não podia tirar a metade 2 do estoque",
    ).toBe("available");

    // Contagem medida: uma linha reservada, e ela pertence ao vencedor.
    const reservadas = (await readUnits(raffle.id)).filter(
      (u) => u.status === "reserved",
    );
    expect(reservadas).toHaveLength(1);

    await assertProductInvariants(raffle.id, "AC1 — disputa pela mesma metade");
  });

  it("AC2: com a metade B de outro pedido, o título inteiro falha e a metade A não fica presa", async () => {
    // Monta o estado do AC: a metade 2 do 7 já é de outra pessoa.
    const dona = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(7, 2)],
        phone: syntheticPhone(),
      }),
    );
    const pedidosAntes = (await readOrders(raffle.id)).length;

    const perdedor = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(7),
      phone: syntheticPhone(),
    });

    expect(errorOf(perdedor)).toMatch(/acabou de ser reservado/i);
    expect(
      (await readOrders(raffle.id)).length,
      "o pedido do perdedor não pode nascer",
    ).toBe(pedidosAntes);

    const doSete = (await readUnits(raffle.id)).filter((u) => u.number === 7);
    const metadeA = doSete.find((u) => u.half === 1);
    const metadeB = doSete.find((u) => u.half === 2);

    expect(
      metadeA?.status,
      "a metade A tinha de voltar ao estoque — presa ao pedido perdedor ela " +
        "sairia de venda sem comprador, em silêncio",
    ).toBe("available");
    expect(metadeA?.order_id).toBeNull();
    expect(metadeB?.order_id, "a metade B continua de quem a tomou").toBe(dona);

    await assertProductInvariants(raffle.id, "AC2 — tudo ou nada");
  });

  it("AC3: expirar o pedido X não toca a metade do pedido Y do mesmo título", async () => {
    const phoneX = syntheticPhone();
    const phoneY = syntheticPhone();

    const pedidoX = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(4, 1)],
        phone: phoneX,
      }),
    );
    const pedidoY = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: [metade(4, 2)],
        phone: phoneY,
      }),
    );

    const antes = (await readUnits(raffle.id)).filter((u) => u.number === 4);
    const bAntes = antes.find((u) => u.half === 2);
    expect(antes.filter((u) => u.status === "reserved")).toHaveLength(2);

    // Vence a reserva de X e faz a varredura rodar — ela só roda dentro de
    // uma reserva nova DO PRÓPRIO comprador (`reserve.ts:306`).
    await expireReservation(pedidoX);
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: [metade(9, 1)],
      phone: phoneX,
    });

    const depois = (await readUnits(raffle.id)).filter((u) => u.number === 4);
    const aDepois = depois.find((u) => u.half === 1);
    const bDepois = depois.find((u) => u.half === 2);

    expect(aDepois?.status, "a metade do pedido X foi liberada").toBe("available");
    expect(aDepois?.order_id).toBeNull();

    // As três colunas do AC, uma a uma.
    expect(bDepois?.status, "status da metade do pedido Y").toBe("reserved");
    expect(bDepois?.order_id, "order_id da metade do pedido Y").toBe(pedidoY);
    // `toStrictEqual` e nao `toBe`: o driver `pg` devolve TIMESTAMPTZ como
    // objeto `Date`, entao `toBe` compara identidade de instancia e falha
    // com dois valores iguais. (A declaracao `reserved_until: string | null`
    // em `helpers/seed.ts` esta errada desde a LTM-05 — ver o relato.)
    expect(
      bDepois?.reserved_until,
      "reserved_until da metade do pedido Y",
    ).toStrictEqual(bAntes?.reserved_until);

    await assertProductInvariants(raffle.id, "AC3 — expiração entre pedidos");
  });
});

describe("LTM-07 — as recusas da divisibilidade (AC9, AC10, AC12)", () => {
  let tenant: SeededTenant;

  beforeEach(async () => {
    tenant = await createTenant();
  });

  it("AC12: R$ 100.000,01 recusa e R$ 100.000,00 aceita", async () => {
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_IMPAR },
    });

    const recusado = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });

    expect(recusado.ok).toBe(false);
    if (recusado.ok) throw new Error("inalcançável");
    expect(recusado.refusal.code).toBe("prize_not_divisible");
    // O motivo é NOMEADO: diz qual é o prêmio e por que ele não serve.
    expect(recusado.refusal.message).toContain("R$ 100.000,01");
    expect(recusado.refusal.message).toMatch(/não se divide em duas metades/i);

    // E nada foi alterado: nem o marcador, nem o estoque.
    expect((await readRaffle(raffle.id)).is_divisible).toBe(false);
    expect(await readUnits(raffle.id)).toHaveLength(10);

    // O mesmo sorteio, com o prêmio cheio, aceita.
    await setRafflePrize(raffle.id, { kind: "cash", amount: PREMIO_CHEIO });
    const aceito = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });

    expect(aceito.ok).toBe(true);
    if (!aceito.ok) throw new Error("inalcançável");
    expect(aceito.changed).toBe(true);
    expect(
      aceito.sellableUnits,
      "10 títulos divisíveis são 20 unidades vendáveis",
    ).toBe(20);
    expect((await readRaffle(raffle.id)).is_divisible).toBe(true);

    const units = await readUnits(raffle.id);
    expect(units.filter((u) => u.half === 1)).toHaveLength(10);
    expect(units.filter((u) => u.half === 2)).toHaveLength(10);
    expect(units.every((u) => u.status === "available")).toBe(true);

    await assertProductInvariants(raffle.id, "AC12 — prêmio cheio aceito");
  });

  it("AC10: prêmio que não é dinheiro recusa, com motivo próprio", async () => {
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 5,
      pricePerNumber: "10.00",
      prize: { kind: "other", amount: null },
    });

    const result = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("inalcançável");
    expect(result.refusal.code).toBe("prize_not_cash");
    expect(result.refusal.message).toMatch(/prêmio em dinheiro/i);
    // Motivo DISTINTO do AC12 — as duas recusas não podem ser a mesma frase.
    expect(result.refusal.message).not.toMatch(/não se divide em duas metades/i);

    expect((await readRaffle(raffle.id)).is_divisible).toBe(false);
    expect(await readUnits(raffle.id)).toHaveLength(5);
  });

  it("AC10: sorteio sem prêmio declarado também recusa — o default não deixa passar", async () => {
    // `advanced_settings = {}` é o estado de todo sorteio criado antes desta
    // story. O default `prizeKind: "other"` do schema é o que impede que a
    // ausência de configuração vire permissão.
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 5,
      pricePerNumber: "10.00",
    });

    const result = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("inalcançável");
    expect(result.refusal.code).toBe("prize_not_cash");
  });

  it("AC9: com uma venda, alterar a divisibilidade falha e NÃO altera nada", async () => {
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });

    // Uma venda de verdade, pelo caminho de produção.
    await comprar(tenant, raffle, titulos(0), syntheticPhone());

    const unidadesAntes = await readUnits(raffle.id);
    const result = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("inalcançável");
    expect(result.refusal.code).toBe("raffle_already_selling");
    expect(result.refusal.message).toMatch(/somente-leitura a partir da primeira venda/i);

    // "não altera nada": o marcador, a contagem e o estado linha a linha.
    expect((await readRaffle(raffle.id)).is_divisible).toBe(false);
    const unidadesDepois = await readUnits(raffle.id);
    expect(unidadesDepois).toEqual(unidadesAntes);
  });

  it("AC9: reserva viva também congela, e a liberação da unidade descongela", async () => {
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });

    const pedido = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(0),
        phone: syntheticPhone(),
      }),
    );

    const congelado = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });
    expect(
      congelado.ok,
      "quem está com uma reserva aberta já viu um preço e uma unidade na tela",
    ).toBe(false);
    if (congelado.ok) throw new Error("inalcançável");
    expect(congelado.refusal.code).toBe("raffle_already_selling");

    // O congelamento por reserva viva é TEMPORÁRIO: a varredura de expiração
    // devolve a unidade ao estoque (`reserve.ts:167-170`), e o sorteio volta
    // a ser editável. Aqui o estado é montado direto, como a varredura o
    // deixa — provar a varredura é de `expiration.test.ts`.
    await releaseUnitsOfOrder(pedido);

    const descongelado = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });
    expect(
      descongelado.ok,
      "reserva abandonada não pode prender o sorteio para sempre",
    ).toBe(true);
    if (!descongelado.ok) throw new Error("inalcançável");
    expect(descongelado.sellableUnits).toBe(20);
  });

  it("desabilitar é possível antes da venda, e apaga as metades 2", async () => {
    const raffle = await criarDivisivel(tenant, 6);
    expect(await readUnits(raffle.id)).toHaveLength(12);

    const result = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: false,
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("inalcançável");
    expect(result.sellableUnits).toBe(6);
    const units = await readUnits(raffle.id);
    expect(units.every((u) => u.half === 1)).toBe(true);
    expect((await readRaffle(raffle.id)).is_divisible).toBe(false);
  });

  it("reafirmar o estado atual não é alterar — não escreve e não recusa", async () => {
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 5,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });
    await comprar(tenant, raffle, titulos(0), syntheticPhone());

    const result = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: false,
    });

    expect(result.ok, "pedir o que já vale não é uma alteração").toBe(true);
    if (!result.ok) throw new Error("inalcançável");
    expect(result.changed).toBe(false);
    expect(result.sellableUnits).toBe(5);
  });

  it("o PREÇO que não divide em metades exatas também recusa", async () => {
    // Dívida que `actions/reserve.ts:264-267` deixou escrita e endereçou à
    // LTM-07: sem esta recusa, a rede de segurança de lá vira o único aviso,
    // e ela só dispara com um comprador na tela tentando pagar.
    const raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 5,
      pricePerNumber: "5.01",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });

    const result = await setRaffleDivisibilityForTenant({
      tenantId: tenant.id,
      productId: raffle.id,
      isDivisible: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("inalcançável");
    expect(result.refusal.code).toBe("price_not_divisible");
    expect(result.refusal.message).toContain("R$ 5,01");
  });
});

describe("LTM-07 — o rateio (AC4, AC5, AC6, AC11)", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await criarDivisivel(tenant);
  });

  it("AC4 + AC11: as duas metades vendidas dão dois rateios que somam exatamente o prêmio", async () => {
    const compradorA = await createBuyer({ tenantId: tenant.id });
    const compradorB = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, [metade(2, 1)], compradorA.phone);
    await comprar(tenant, raffle, [metade(2, 2)], compradorB.phone);

    const result = await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: raffle.id,
      winningNumber: 2,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.refusal.message);

    const linhas = await readWinners(raffle.id);
    expect(linhas).toHaveLength(2);

    // AC4 — a soma fecha no centavo, contada em centavos inteiros.
    const somaCentavos = linhas.reduce(
      (total, linha) => total + Math.round(Number(linha.prize_amount) * 100),
      0,
    );
    expect(somaCentavos, "nem um centavo a mais, nem a menos").toBe(10_000_000);
    expect(linhas.map((l) => l.prize_amount)).toEqual(["50000.00", "50000.00"]);

    // AC11 — duas linhas do mesmo número, DISTINGUÍVEIS.
    expect(linhas.map((l) => l.winning_number)).toEqual([2, 2]);
    expect(
      linhas.map((l) => l.winning_half),
      "sem isto as duas linhas são indistinguíveis de duplicata acidental",
    ).toEqual([1, 2]);
  });

  it("AC5: metade órfã leva o prêmio INTEIRO", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, [metade(3, 1)], comprador.phone);
    // A metade 2 do 3 continua à venda, e o sorteio acontece assim.

    const result = await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: raffle.id,
      winningNumber: 3,
    });
    expect(result.ok).toBe(true);

    const linhas = await readWinners(raffle.id);
    expect(linhas, "uma linha, não duas — a outra metade não tem dono").toHaveLength(1);
    expect(linhas[0].prize_amount, "prêmio integral").toBe("100000.00");
    expect(linhas[0].winning_half, "e ela continua sabendo que foi meia cota").toBe(1);
  });

  it("AC6: as duas metades do mesmo dono aparecem como DOIS rateios", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    // Duas compras separadas do mesmo comprador, uma metade cada.
    await comprar(tenant, raffle, [metade(6, 1)], comprador.phone);
    await comprar(tenant, raffle, [metade(6, 2)], comprador.phone);

    const result = await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: raffle.id,
      winningNumber: 6,
    });
    expect(result.ok).toBe(true);

    const linhas = await readWinners(raffle.id);
    expect(linhas, "duas metades, dois rateios — não um pagamento único").toHaveLength(2);
    expect(new Set(linhas.map((l) => l.winner_name)).size, "mesmo dono").toBe(1);
    expect(linhas.map((l) => l.winning_half)).toEqual([1, 2]);
    expect(linhas.map((l) => l.prize_amount)).toEqual(["50000.00", "50000.00"]);
  });

  it("AC4 (cota inteira): um ganhador, prêmio integral, sem marcador de metade", async () => {
    const inteiro = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, inteiro, titulos(4), comprador.phone);

    const result = await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: inteiro.id,
      winningNumber: 4,
    });
    expect(result.ok).toBe(true);

    const linhas = await readWinners(inteiro.id);
    expect(linhas).toHaveLength(1);
    expect(linhas[0].prize_amount).toBe("100000.00");
    expect(
      linhas[0].winning_half,
      "em cota inteira não existe metade — marcar 1 registraria uma meia cota que nunca foi vendida",
    ).toBeNull();
  });

  it("registrar duas vezes o mesmo número é recusado, e não duplica", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, [metade(1, 1)], comprador.phone);

    expect((await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: raffle.id,
      winningNumber: 1,
    })).ok).toBe(true);

    const segunda = await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: raffle.id,
      winningNumber: 1,
    });
    expect(segunda.ok).toBe(false);
    if (segunda.ok) throw new Error("inalcançável");
    expect(segunda.refusal.code).toBe("already_recorded");
    expect(await readWinners(raffle.id)).toHaveLength(1);
  });

  it("título sorteado que ninguém comprou não vira linha vazia", async () => {
    const result = await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: raffle.id,
      winningNumber: 8,
    });
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("inalcançável");
    expect(result.refusal.code).toBe("no_sold_units");
    expect(await readWinners(raffle.id)).toHaveLength(0);
  });

  it("metade RESERVADA e não paga não concorre", async () => {
    // Reserva sem pagar: a unidade fica `reserved`, não `sold`.
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: [metade(0, 1)],
      phone: syntheticPhone(),
    });

    const result = await recordWinnersForDrawnTitle({
      tenantId: tenant.id,
      productId: raffle.id,
      winningNumber: 0,
    });
    expect(result.ok, "reserva não é compra").toBe(false);
  });
});

// ── O rateio, sem banco: os casos que não dependem de estado ────────────
describe("LTM-07 — o rateio é exato ou falha alto", () => {
  const base = { winnerName: "A", phone: null, orderId: "o1" };

  it("prêmio ímpar com as duas metades vendidas FALHA em vez de arredondar", () => {
    expect(() =>
      splitPrizeAmongHalves({
        prizeCents: 10_000_001,
        halvesPerTitle: 2,
        soldHalves: [
          { ...base, half: 1 },
          { ...base, half: 2, orderId: "o2" },
        ],
      }),
    ).toThrow(PrizeSplitError);
  });

  it("prêmio ímpar com metade órfã NÃO falha — não há divisão a fazer", () => {
    const shares = splitPrizeAmongHalves({
      prizeCents: 10_000_001,
      halvesPerTitle: 2,
      soldHalves: [{ ...base, half: 2 }],
    });
    expect(shares).toHaveLength(1);
    expect(shares[0].prizeAmountCents).toBe(10_000_001);
    expect(shares[0].winningHalf).toBe(2);
  });

  it("mais donos do que unidades vendáveis falha alto", () => {
    expect(() =>
      splitPrizeAmongHalves({
        prizeCents: 1000,
        halvesPerTitle: 1,
        soldHalves: [
          { ...base, half: 1 },
          { ...base, half: 2, orderId: "o2" },
        ],
      }),
    ).toThrow(PrizeSplitError);
  });

  it("a regra pura do AC12 discrimina 100.000,01 de 100.000,00", () => {
    const premio = (amount: string) =>
      divisibilityRefusalFor({
        prize: { prizeKind: "cash", prizeAmount: amount },
        pricePerNumber: "10.00",
      });

    expect(premio(PREMIO_CHEIO)).toBeNull();
    expect(premio(PREMIO_IMPAR)?.code).toBe("prize_not_divisible");
    // Três casas decimais não é "quase dois centavos": é valor que não
    // existe, e ele é recusado em vez de arredondado.
    expect(premio("100000.005")?.code).toBe("prize_amount_invalid");
  });
});
