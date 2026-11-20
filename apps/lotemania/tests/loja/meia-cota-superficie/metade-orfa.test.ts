// A CONTAGEM DE METADES ÓRFÃS NO PAINEL (LTM-08, AC6).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE NÚMERO IMPORTA PARA O OPERADOR
//
// GLOSSARY → Metade órfã: metade de um título cuja outra metade não foi
// vendida até o sorteio. Se um título com metade órfã é sorteado, **o dono da
// metade vendida leva o prêmio inteiro** — decisão de 2026-11-17, porque
// qualquer outra saída pagaria menos a quem não teve culpa ou mudaria a
// chance do bilhete depois de vendido.
//
// Então o número é exposição financeira do operador, e o AC6 exige que ele
// esteja na tela que o operador JÁ abre, ANTES do sorteio — enquanto ainda dá
// para vender a outra metade.
//
// ── O ESTADO É SEMEADO, NÃO EXERCITADO
//
// Os `UPDATE` abaixo mexem só no dado, como `tests/helpers/seed.ts` faz: quem
// tem de decidir o que esse estado significa é o código de produção
// (`halfPanelFor`). Semear também é o único jeito honesto de montar "metade
// vendida há tempo" sem passar por pagamento de verdade.
// ════════════════════════════════════════════════════════════════════════

import { beforeAll, describe, expect, it } from "vitest";

import { halfPanelFor } from "@/lib/raffles/orphan-halves";

import { query } from "../../helpers/db";
import {
  createRaffle,
  createTenant,
  type SeededRaffle,
  type SeededTenant,
} from "../../helpers/seed";

async function setStatus(
  productId: string,
  number: number,
  half: number,
  status: "available" | "reserved" | "sold",
): Promise<void> {
  await query(
    `UPDATE product_numbers SET status = $4
      WHERE product_id = $1 AND number = $2 AND half = $3`,
    [productId, number, half, status],
  );
}

describe("AC6 — o painel conta os títulos com metade órfã", () => {
  let tenant: SeededTenant;
  let divisivel: SeededRaffle;

  beforeAll(async () => {
    tenant = await createTenant();
    divisivel = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 4,
      pricePerNumber: "4.00",
      isDivisible: true,
      prize: { kind: "cash", amount: "100000.00" },
    });

    // título 0 — UMA metade vendida: é a órfã.
    await setStatus(divisivel.id, 0, 1, "sold");
    // título 1 — as duas vendidas: não é órfã, o rateio fecha em dois donos.
    await setStatus(divisivel.id, 1, 1, "sold");
    await setStatus(divisivel.id, 1, 2, "sold");
    // título 2 — uma metade apenas RESERVADA: não conta (ver o teste abaixo).
    await setStatus(divisivel.id, 2, 1, "reserved");
    // título 3 — intocado.
  });

  it("conta exatamente os títulos com UMA metade vendida", async () => {
    const painel = await halfPanelFor(divisivel.id);
    expect(painel.orphanTitles).toBe(1);
  });

  it("título com as DUAS metades vendidas não é órfão", async () => {
    // Se a consulta contasse "tem metade vendida", este título entraria — e o
    // operador veria exposição que não existe.
    const painel = await halfPanelFor(divisivel.id);
    expect(painel.orphanTitles).not.toBe(2);
    expect(painel.orphanTitles).toBe(1);
  });

  it("metade apenas RESERVADA não vira órfã — o prazo pode devolvê-la", async () => {
    // A varredura de expiração devolve reserva vencida ao estoque
    // (`expire-reservations.ts`), então contar reserva como venda mostraria
    // uma órfã que 15 minutos desfazem.
    const painel = await halfPanelFor(divisivel.id);
    // O título 2 tem uma metade reservada e nenhuma vendida.
    const soReservado = await query<{ total: string }>(
      `SELECT count(*)::text AS total FROM product_numbers
        WHERE product_id = $1 AND number = 2 AND status = 'reserved'`,
      [divisivel.id],
    );
    expect(Number(soReservado[0].total)).toBe(1);
    expect(painel.orphanTitles).toBe(1);
  });

  it("vender a outra metade RESOLVE a órfã, e o painel acompanha", async () => {
    await setStatus(divisivel.id, 0, 2, "sold");
    expect((await halfPanelFor(divisivel.id)).orphanTitles).toBe(0);

    // E desfazer recria: o número é uma fotografia do estoque, não um
    // acumulado.
    await setStatus(divisivel.id, 0, 2, "available");
    expect((await halfPanelFor(divisivel.id)).orphanTitles).toBe(1);
  });

  it("conta as unidades fora do estoque, que é o que CONGELA a divisibilidade (AC4)", async () => {
    // 0:1 vendida, 1:1 e 1:2 vendidas, 2:1 reservada = 4 fora do estoque.
    // Reservada conta aqui e não conta na órfã, e a diferença é de propósito:
    // o congelamento protege quem está com uma reserva aberta.
    const painel = await halfPanelFor(divisivel.id);
    expect(painel.unitsOutOfStock).toBe(4);
  });
});

describe("AC6 — nenhum falso positivo em sorteio de cota inteira", () => {
  it("título vendido em sorteio indivisível NUNCA é metade órfã", async () => {
    // É o falso positivo que derrubaria o número: em cota inteira cada
    // título tem UMA linha, então "exatamente uma vendida" seria verdade
    // para todo título vendido. A guarda é de DADO — `count(*) > 1` —, não um
    // booleano que o chamador pudesse passar errado.
    const tenant = await createTenant();
    const inteiro = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 3,
      pricePerNumber: "10.00",
    });
    await setStatus(inteiro.id, 0, 1, "sold");
    await setStatus(inteiro.id, 1, 1, "reserved");

    const painel = await halfPanelFor(inteiro.id);
    expect(painel.orphanTitles).toBe(0);
    expect(painel.unitsOutOfStock).toBe(2);
  });

  it("sorteio recém-criado devolve zero nos dois números, sem explodir", async () => {
    const tenant = await createTenant();
    const novo = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 2,
      isDivisible: true,
      prize: { kind: "cash", amount: "100000.00" },
    });
    expect(await halfPanelFor(novo.id)).toEqual({
      unitsOutOfStock: 0,
      orphanTitles: 0,
    });
  });
});
