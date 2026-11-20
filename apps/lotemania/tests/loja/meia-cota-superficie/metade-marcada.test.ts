// A METADE MARCADA EM "MEUS TÍTULOS" (LTM-08, AC5).
//
// ════════════════════════════════════════════════════════════════════════
// O AC5 É EXATAMENTE ESTE PAR: `42 (metade)` E `43`
//
// GLOSSARY → Metade marcada: "uma metade nunca aparece como número nu em
// relatório, export ou interface. Quem tem a metade do título 42 e o 43
// inteiro aparece como `42 (metade)` e `43`. Export que devolve `42` para
// uma metade é ambiguidade que vira disputa com o ganhador."
//
// E o defeito estava NA CONSULTA, não na tela: `actions/my-titles.ts`
// descartava `half` no próprio `.select()`. Então este arquivo vai ao banco
// de verdade e passa pela action de produção — marcar a metade só no
// componente era impossível, e um teste que montasse a lista à mão provaria
// o dublê.
//
// ── POR QUE DOIS SORTEIOS
//
// O par do AC só existe com dois: "a metade do 42" vem de um sorteio
// DIVISÍVEL e "o 43 inteiro" vem de um de COTA INTEIRA. Num sorteio
// divisível não existe título inteiro — comprar os dois lados do 43 são duas
// metades, que continuam duas (GLOSSARY → Meia cota). A marcação é por
// PEDIDO, lida de `orders.unit`, e é por isso que ela acerta os dois.
// ════════════════════════════════════════════════════════════════════════

import { beforeAll, describe, expect, it } from "vitest";

import { lookupOrdersByPhone } from "@/lib/actions/my-titles";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { markedUnitLabel } from "@/lib/raffles/orphan-halves";

import { metade, orderIdOf, titulos } from "../../helpers/actions";
import {
  createRaffle,
  createTenant,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../../helpers/seed";

/**
 * Os pedidos, ou falha alto.
 *
 * ⚠️ `result.orders` chega como `OrderRow[] | undefined` e não como união
 * limpa: os dois `return` de `lookupOrdersByPhone` são literais no mesmo
 * corpo de função, então o TypeScript normaliza a união acrescentando
 * `orders?: undefined` ao ramo de erro. `"orders" in result` sozinho não
 * estreita — medido aqui com `TS18048`. É a mesma normalização registrada em
 * `number-grid.tsx` e no toggle de divisibilidade.
 */
function pedidosDe(
  result: Awaited<ReturnType<typeof lookupOrdersByPhone>>,
) {
  if (!("orders" in result) || result.orders === undefined) {
    throw new Error(`Esperava pedidos e veio: ${JSON.stringify(result)}`);
  }
  return result.orders;
}

describe("markedUnitLabel — a convenção, isolada", () => {
  it("metade sai marcada, título inteiro sai nu", () => {
    expect(markedUnitLabel({ number: 42, isHalf: true })).toBe("42 (metade)");
    expect(markedUnitLabel({ number: 43, isHalf: false })).toBe("43");
  });

  it("o zero à esquerda é o de hoje — o título inteiro não muda de forma", () => {
    expect(markedUnitLabel({ number: 7, isHalf: false })).toBe("07");
    expect(markedUnitLabel({ number: 7, isHalf: true })).toBe("07 (metade)");
    expect(markedUnitLabel({ number: 100, isHalf: false })).toBe("100");
  });

  it("não nomeia QUAL metade: a convenção do GLOSSARY é `42 (metade)`", () => {
    // Duas metades do mesmo título aparecem como duas linhas iguais, e isso
    // é correto: são duas unidades, não uma com rótulo diferente.
    expect(markedUnitLabel({ number: 42, isHalf: true })).toBe(
      markedUnitLabel({ number: 42, isHalf: true }),
    );
  });
});

describe("AC5 — a consulta de 'Meus títulos' entrega a metade marcada", () => {
  let tenant: SeededTenant;
  let divisivel: SeededRaffle;
  let cotaInteira: SeededRaffle;
  let comprador: string;

  beforeAll(async () => {
    tenant = await createTenant();
    divisivel = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 50,
      pricePerNumber: "4.00",
      isDivisible: true,
      // Prêmio em dinheiro que divide exato: é o que a meia cota exige
      // (AC10 e AC12 da LTM-07).
      prize: { kind: "cash", amount: "100000.00" },
    });
    cotaInteira = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 50,
      pricePerNumber: "10.00",
    });
    comprador = syntheticPhone();

    // A METADE 1 DO 42, no sorteio divisível.
    orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: divisivel.slug,
        units: [metade(42, 1)],
        phone: comprador,
      }),
    );
    // O 43 INTEIRO, no sorteio de cota inteira.
    orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: cotaInteira.slug,
        units: titulos(43),
        phone: comprador,
      }),
    );
  });

  it("produz `42 (metade)` e `43`, que é o par literal do AC", async () => {
    const result = await lookupOrdersByPhone(tenant.slug, comprador);
    const orders = pedidosDe(result);
    expect(orders).toHaveLength(2);

    const rotulos = orders.flatMap((order) => order.units.map((u) => u.label)).sort();
    expect(rotulos).toEqual(["42 (metade)", "43"]);
  });

  it("a METADE vem com a sua identidade: número e metade, não só o número", async () => {
    const result = await lookupOrdersByPhone(tenant.slug, comprador);
    const orders = pedidosDe(result);

    const pedidoDivisivel = orders.find((o) => o.unit === "half");
    expect(pedidoDivisivel, "o pedido de metade tem de existir").toBeDefined();
    expect(pedidoDivisivel!.units).toEqual([
      { number: 42, half: 1, label: "42 (metade)" },
    ]);
    // E a OUTRA metade do 42 não entra: ela não é deste comprador.
    expect(pedidoDivisivel!.units).toHaveLength(1);
  });

  it("o pedido de cota inteira segue contado em título, e o número sai nu", async () => {
    const result = await lookupOrdersByPhone(tenant.slug, comprador);
    const orders = pedidosDe(result);

    const pedidoInteiro = orders.find((o) => o.unit === "title");
    expect(pedidoInteiro, "o pedido de título inteiro tem de existir").toBeDefined();
    expect(pedidoInteiro!.units.map((u) => u.label)).toEqual(["43"]);
    // Toda linha de cota inteira tem `half = 1` no banco, e é justamente por
    // isso que a marcação NÃO pode sair de `half`: aqui ela sairia marcada.
    expect(pedidoInteiro!.units[0].half).toBe(1);
  });

  it("as DUAS metades do mesmo título aparecem como duas linhas marcadas", async () => {
    const outro = syntheticPhone();
    orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: divisivel.slug,
        units: [metade(10, 1), metade(10, 2)],
        phone: outro,
      }),
    );

    const result = await lookupOrdersByPhone(tenant.slug, outro);
    const orders = pedidosDe(result);
    expect(orders).toHaveLength(1);
    // Não se fundem em cota inteira (GLOSSARY → Meia cota), então são duas
    // linhas marcadas e a contagem do pedido é 2 metades.
    expect(orders[0].units.map((u) => u.label)).toEqual([
      "10 (metade)",
      "10 (metade)",
    ]);
    expect(orders[0].units.map((u) => u.half)).toEqual([1, 2]);
    expect(orders[0].quantity).toBe(2);
    expect(orders[0].unit).toBe("half");
  });

  it("telefone sem pedido nenhum devolve lista vazia, não erro", async () => {
    const result = await lookupOrdersByPhone(tenant.slug, syntheticPhone());
    expect(pedidosDe(result)).toEqual([]);
  });
});
