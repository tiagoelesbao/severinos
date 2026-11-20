// DEFINIR GANHADORES (LTM-27) — o caminho de produção até o rateio.
//
// ════════════════════════════════════════════════════════════════════════
// O QUE ESTE ARQUIVO PROVA, E O QUE ELE DELIBERADAMENTE NÃO REPETE
//
// O rateio em si — soma exata, metade órfã pagando inteiro, duas metades do
// mesmo dono não se fundindo — já está provado em `half-quota-domain.test.ts`
// contra o mesmo Postgres. Reescrever aquelas asserções aqui criaria uma
// segunda cópia da verdade, e cópia de teste diverge como cópia de código.
//
// O que é desta story é A FIAÇÃO: até agora `recordWinnersForDrawnTitle`
// tinha UM importador em todo o repositório, e era um teste. Nada em `src/`
// o chamava. Então o que se prova aqui é que O NÚMERO QUE O OPERADOR DIGITA
// chega ao rateio, e que tudo que não pode chegar é recusado com razão
// nomeada antes de tocar `winners`:
//
//   AC1   o número acha o dono, e a `Data da compra` sai da junta certa
//   AC2   as QUATRO recusas do domínio chegam à tela com a razão de cada uma
//   AC3   um campo por prêmio configurado, extraído do render
//   AC4   a meia cota gera dois ganhadores PELO CAMINHO NOVO
//   AC5   a metade órfã leva tudo PELO CAMINHO NOVO
//   AC6   a validação de dígitos recusa `042` e `7`
//   AC7   a data informada no modal é a gravada
//   AC8   a linha nasce com o `tenant_id` que a página pública filtra
//   AC11  N números sorteados, cada um com o VALOR do seu lugar — e a soma
//         paga é a soma do que o operador declarou, nunca N× o cadastro
//
// ⚠️ O AC11 mudou de forma em 2026-11-20, no meio desta implementação, por
// decisão do founder: a versão do @po RECUSAVA o 2º lugar; ele pediu
// *"vários números"*, com até 2 ganhadores por número no sorteio de meia
// cota. Os testes da versão anterior foram REMOVIDOS, não adaptados — um
// teste que afirma o oposto do requisito é pior que nenhum.
//
// AC9 (trilha de auditoria) não tem teste porque não tem implementação:
// depende da LTM-16, e nenhuma das tabelas de hoje serve de trilha. Fica
// declarado no Dev Agent Record, não contornado.
//
// ⚠️ Nenhum relógio falso aqui. `announced_at` é coluna do Postgres e
// `defaultNow()` é `now()` DELE — fake timer de JS não o move um segundo.
// O que se move é o dado.
// ════════════════════════════════════════════════════════════════════════

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { beforeEach, describe, expect, it } from "vitest";

import { WinnersForm } from "@/app/dashboard/products/winners-dialog";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { settleOrder } from "@/lib/payments/settle-order";
import {
  defineWinnersForRaffle,
  digitsForRaffle,
  parseAnnouncedAt,
  parseDrawnNumber,
  prizePlacesFor,
  readRecordedWinnersForRaffles,
  type DefineWinnersResult,
  type WinnersPlaceOutcome,
} from "@/lib/raffles/define-winners";

import { metade, orderIdOf, titulos } from "../helpers/actions";
import { query } from "../helpers/db";
import {
  createBuyer,
  createRaffle,
  createTenant,
  readWinners,
  setRafflePrize,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

/** O prêmio cheio do Império: cem mil, divisão limpa em duas metades. */
const PREMIO_CHEIO = "100000.00";

/** Reserva e PAGA pelo caminho de produção — a unidade fica `sold`. */
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
    description: "Pagamento sintetico — LTM-27",
  });
  if (!pago.ok) throw new Error(`Esperava pagamento fechado e veio ${pago.refusal}.`);
  return orderId;
}

/**
 * Escreve as DESCRIÇÕES de prêmio na aba Prêmios.
 *
 * `createRaffle` sabe semear `prizeKind`/`prizeAmount` (LTM-07) mas não
 * `prizes`, que é a lista de descrições livres de onde o AC3 tira o número
 * de campos. Monta o estado, não exercita código de produção.
 */
async function setPrizeDescriptions(productId: string, prizes: string[]): Promise<void> {
  await query(
    `UPDATE products SET advanced_settings = advanced_settings || $2::jsonb
      WHERE id = $1`,
    [productId, JSON.stringify({ prizes })],
  );
}

/** Um campo preenchido, na forma em que o modal entrega. */
function campo(prizeIndex: number, rawNumber: string) {
  return { prizeIndex, rawNumber };
}

function lugares(result: DefineWinnersResult): readonly WinnersPlaceOutcome[] {
  if (!result.ok) {
    throw new Error(
      `Esperava resultado por lugar e veio recusa global: ${result.refusal.code} — ${result.refusal.message}`,
    );
  }
  return result.places;
}

function recusaGlobal(result: DefineWinnersResult) {
  if (result.ok) {
    throw new Error(`Esperava recusa global e veio resultado: ${JSON.stringify(result)}`);
  }
  return result.refusal;
}

function recusaDoLugar(result: DefineWinnersResult, prizeIndex: number) {
  const lugar = lugares(result).find((place) => place.prizeIndex === prizeIndex);
  if (!lugar) throw new Error(`Nenhum resultado para o lugar ${prizeIndex}.`);
  if (lugar.ok) {
    throw new Error(`Esperava recusa no lugar ${prizeIndex} e ele passou.`);
  }
  return lugar.refusal;
}

// ── As partes puras: a leitura da entrada do operador ───────────────────

describe("LTM-27 — a leitura do que o operador digita (AC6, AC7)", () => {
  it("AC6: a quantidade de dígitos vem do MAIOR título, não do total", () => {
    // A numeração desta base vai de 0 a totalNumbers-1
    // (`actions/products.ts:40-42`), então o maior título de um sorteio de
    // 100 é o 99. Contar os dígitos de `100` diria 3 e recusaria todo
    // número válido do sorteio.
    expect(digitsForRaffle(10), "0..9").toBe(1);
    expect(digitsForRaffle(100), "0..99").toBe(2);
    expect(digitsForRaffle(1000), "0..999").toBe(3);
    expect(digitsForRaffle(1), "sorteio de um título só: o 0").toBe(1);
  });

  it("AC6: `042` e `7` são recusados num sorteio de 100, e `07` passa", () => {
    const sorteio = { digits: digitsForRaffle(100), totalNumbers: 100 };

    const comZeroAMais = parseDrawnNumber("042", sorteio);
    expect(comZeroAMais.ok).toBe(false);
    if (!comZeroAMais.ok) {
      expect(comZeroAMais.refusal.code).toBe("number_wrong_digits");
      // A asserção que DISCRIMINA: truncar `042` em `04` registraria
      // ganhador do título 4 em silêncio. A razão tem de ser legível.
      expect(comZeroAMais.refusal.message).toContain("2 dígitos");
    }

    const comZeroAMenos = parseDrawnNumber("7", sorteio);
    expect(comZeroAMenos.ok).toBe(false);
    if (!comZeroAMenos.ok) expect(comZeroAMenos.refusal.code).toBe("number_wrong_digits");

    const certo = parseDrawnNumber("07", sorteio);
    expect(certo.ok, "dois dígitos, título existente").toBe(true);
    if (certo.ok) expect(certo.winningNumber).toBe(7);
  });

  it("AC6: ponto, vírgula e letra não são número de título", () => {
    const sorteio = { digits: 2, totalNumbers: 100 };
    for (const entrada of ["4,2", "4.2", "4 2", "quarenta", "-4", "4a"]) {
      const lido = parseDrawnNumber(entrada, sorteio);
      expect(lido.ok, `"${entrada}" não é número`).toBe(false);
      if (!lido.ok) expect(lido.refusal.code).toBe("number_not_numeric");
    }
  });

  it("AC6: dígitos certos mas título inexistente é recusa PRÓPRIA", () => {
    // 50 títulos são 0..49. `99` tem os dois dígitos do sorteio e não
    // existe — a recusa de dígitos passaria por ele.
    const lido = parseDrawnNumber("99", { digits: digitsForRaffle(50), totalNumbers: 50 });
    expect(lido.ok).toBe(false);
    if (!lido.ok) {
      expect(lido.refusal.code).toBe("number_out_of_range");
      expect(lido.refusal.message).toContain("0 a 49");
    }
  });

  it("AC7: data vazia é `null` (o schema usa `defaultNow()`), e data ilegível é RECUSA", () => {
    expect(parseAnnouncedAt("")).toEqual({ ok: true, announcedAt: null });
    expect(parseAnnouncedAt(null)).toEqual({ ok: true, announcedAt: null });

    const informada = parseAnnouncedAt("2026-11-19T14:48");
    expect(informada.ok).toBe(true);
    if (informada.ok) expect(informada.announcedAt?.getMinutes()).toBe(48);

    const ilegivel = parseAnnouncedAt("ontem de tarde");
    expect(ilegivel.ok, "nunca cair para a data do clique em silêncio").toBe(false);
    if (!ilegivel.ok) expect(ilegivel.refusal.code).toBe("announced_at_invalid");
  });
});

// ── O modal: um campo por prêmio (AC3) ──────────────────────────────────

describe("LTM-27 — o modal Ganhadores (AC3)", () => {
  it("AC3: três prêmios configurados dão TRÊS campos; um prêmio dá um", () => {
    const tres = prizePlacesFor(["Um Fiat Argo 2026", "Uma moto", "R$ 1.000"]);
    const marcacaoTres = renderToStaticMarkup(
      createElement(WinnersForm, {
        productId: "p-tres",
        prizePlaces: tres,
        digits: 2,
        drawDateIso: null,
      }),
    );
    expect(
      marcacaoTres.match(/data-winner-field=/g) ?? [],
      "o número de campos vem dos prêmios configurados, não de constante",
    ).toHaveLength(3);
    // E o rótulo é o prêmio do operador, não um genérico.
    expect(marcacaoTres).toContain("Um Fiat Argo 2026");

    const umMarcacao = renderToStaticMarkup(
      createElement(WinnersForm, {
        productId: "p-um",
        prizePlaces: prizePlacesFor(["R$ 900,00"]),
        digits: 1,
        drawDateIso: null,
      }),
    );
    expect(umMarcacao.match(/data-winner-field=/g) ?? []).toHaveLength(1);
  });

  it("AC3: sorteio SEM prêmio descrito mostra UM campo, `Prêmio 1`", () => {
    // [AUTO-DECISÃO] Zero campos deixaria a funcionalidade inalcançável
    // exatamente no caso do ensaio ponta a ponta, onde o sorteio declara
    // `prizeAmount` e nenhuma descrição. A captura da Sorteamos mostra um
    // campo, rotulado `Ganhador: Prêmio 1`.
    const places = prizePlacesFor([]);
    expect(places).toHaveLength(1);
    expect(places[0].label).toBe("Prêmio 1");
    expect(
      places[0].description,
      "`Prêmio 1` é rótulo de tela, não descrição declarada — não vai para o banco",
    ).toBeNull();

    const marcacao = renderToStaticMarkup(
      createElement(WinnersForm, {
        productId: "p-zero",
        prizePlaces: places,
        digits: 1,
        drawDateIso: null,
      }),
    );
    expect(marcacao.match(/data-winner-field=/g) ?? []).toHaveLength(1);
    expect(marcacao).toContain("Ganhador: Prêmio 1");
  });

  it("AC6: o aviso de dígitos do modal é derivado do sorteio, não escrito à mão", () => {
    const digits = digitsForRaffle(100);
    const marcacao = renderToStaticMarkup(
      createElement(WinnersForm, {
        productId: "p-aviso",
        prizePlaces: prizePlacesFor([]),
        digits,
        drawDateIso: null,
      }),
    );
    expect(marcacao).toContain("Informe os números corretamente, sem ponto ou vírgula");
    // Extraído do render e comparado com a FUNÇÃO, não com uma string
    // escrita aqui: duas strings à mão discordando entre si foi o defeito
    // real que o AC-B1 da LTM-03a existe para impedir.
    expect(marcacao).toContain(`Essa campanha é de ${digits}`);
    expect(marcacao).toContain("dígitos");
  });
});

// ── O caminho completo, contra o Postgres de verdade ────────────────────

describe("LTM-27 — o número acha o dono (AC1, AC2, AC7, AC8)", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });
  });

  it("AC1/AC8: o número vendido grava o comprador, com tenant e data da compra", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    const orderId = await comprar(tenant, raffle, titulos(3), comprador.phone);
    const [cadastro] = await query<{ name: string | null }>(
      `SELECT name FROM users WHERE id = $1`,
      [comprador.id],
    );

    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "3")],
    });

    expect(lugares(result)).toHaveLength(1);
    const lugar = lugares(result)[0];
    expect(lugar.ok).toBe(true);
    if (lugar.ok) {
      expect(lugar.winningNumber).toBe(3);
      expect(lugar.recorded).toHaveLength(1);
      expect(lugar.recorded[0].prizeAmount).toBe(PREMIO_CHEIO);
    }

    // AC1 — a exibição do painel: nome e DATA DA COMPRA.
    const exibidos = await readRecordedWinnersForRaffles(tenant.id, [raffle.id]);
    expect(exibidos).toHaveLength(1);
    // `winner_name` e o nome do cadastro; o telefone so entra quando nao ha
    // nome, que e o caso do checkout rapido (`winners.ts:181-186`).
    expect(exibidos[0].winnerName).toBe(cadastro.name);
    expect(
      exibidos[0].purchasedAt,
      "`winners` não guarda o pedido; a data vem da junta product_numbers → orders",
    ).not.toBeNull();
    // A asserção que DISCRIMINA: a data exibida é a do PEDIDO daquele
    // título, não a do anúncio nem `now()`.
    const compraDoPedido = await query<{ created_at: string }>(
      `SELECT created_at FROM orders WHERE id = $1`,
      [orderId],
    );
    expect(new Date(exibidos[0].purchasedAt!).toISOString()).toBe(
      new Date(compraDoPedido[0].created_at).toISOString(),
    );

    // AC8 — o que faz a página pública ver a linha é o `tenant_id`, que é o
    // único filtro dela (`loja/[tenant]/ganhadores/page.tsx:36`). A máscara
    // de lá já está construída; o que faltava era a linha existir.
    const doTenant = await query<{ total: string }>(
      `SELECT count(*)::text AS total FROM winners WHERE tenant_id = $1`,
      [tenant.id],
    );
    expect(Number(doTenant[0].total)).toBe(1);
  });

  it("AC7: a data informada no modal é a gravada em `announced_at`", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, titulos(4), comprador.phone);

    // Uma data do PASSADO: o sorteio aconteceu fora do sistema, e a data do
    // clique não é a da extração. É isso que o AC7 protege.
    const extracao = new Date("2026-11-19T22:00:30.000Z");
    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "4")],
      announcedAt: extracao,
    });
    expect(lugares(result)[0].ok).toBe(true);

    const [linha] = await query<{ announced_at: string }>(
      `SELECT announced_at FROM winners WHERE product_id = $1`,
      [raffle.id],
    );
    expect(new Date(linha.announced_at).toISOString()).toBe(extracao.toISOString());
  });

  it("AC2: `no_sold_units` — ninguém comprou o título sorteado", async () => {
    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "9")],
    });
    expect(recusaDoLugar(result, 0).code).toBe("no_sold_units");
    expect(
      await readWinners(raffle.id),
      "é o erro mais caro desta tela: ganhador que não existe numa página pública",
    ).toHaveLength(0);
  });

  it("AC2: `already_recorded` — a segunda gravação do mesmo título é recusada", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, titulos(5), comprador.phone);

    const primeira = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "5")],
    });
    expect(lugares(primeira)[0].ok).toBe(true);

    const segunda = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "5")],
    });
    expect(recusaDoLugar(segunda, 0).code).toBe("already_recorded");
    expect(
      await readWinners(raffle.id),
      "não sobrescreve e não duplica: continua UMA linha",
    ).toHaveLength(1);
  });

  it("AC2: `prize_not_rateable` — é a recusa que o ensaio encontra PRIMEIRO", async () => {
    // Sorteio sem prêmio em dinheiro declarado. O operador vai achar que a
    // funcionalidade está quebrada se a razão não aparecer.
    await setRafflePrize(raffle.id, { kind: "other", amount: null });
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, titulos(6), comprador.phone);

    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "6")],
    });
    const recusa = recusaDoLugar(result, 0);
    expect(recusa.code).toBe("prize_not_rateable");
    expect(recusa.message, "a razão diz O QUE FAZER, não só que não deu").toContain(
      "aba Prêmios",
    );
    expect(await readWinners(raffle.id)).toHaveLength(0);
  });

  it("AC2: `raffle_not_found` — sorteio de outro operador não é alcançável", async () => {
    const outro = await createTenant();
    const alheio = await createRaffle({
      tenantId: outro.id,
      totalNumbers: 10,
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });

    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: alheio.id,
      entries: [campo(0, "1")],
    });
    expect(recusaGlobal(result).code).toBe("raffle_not_found");
  });

  it("salvar com todos os campos vazios recusa, em vez de não fazer nada", async () => {
    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, ""), campo(1, "   ")],
    });
    expect(recusaGlobal(result).code).toBe("no_number_informed");
  });
});

// ── A meia cota pelo caminho novo (AC4, AC5) ────────────────────────────

describe("LTM-27 — a meia cota chega ao rateio pelo número digitado (AC4, AC5)", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      isDivisible: true,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });
  });

  it("AC4: duas metades, dois donos, duas linhas — e o painel distingue as duas", async () => {
    const ana = await createBuyer({ tenantId: tenant.id });
    const bruno = await createBuyer({ tenantId: tenant.id });
    const pedidoAna = await comprar(tenant, raffle, [metade(2, 1)], ana.phone);
    const pedidoBruno = await comprar(tenant, raffle, [metade(2, 2)], bruno.phone);

    // O operador digita UM número, como sempre fez. Quem descobre que o
    // sorteio é divisível e que o 2 tem duas pessoas é o sistema.
    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "2")],
    });
    const lugar = lugares(result)[0];
    expect(lugar.ok).toBe(true);
    if (lugar.ok) expect(lugar.recorded).toHaveLength(2);

    const linhas = await readWinners(raffle.id);
    expect(linhas.map((l) => l.winning_half)).toEqual([1, 2]);
    const somaCentavos = linhas.reduce(
      (soma, l) => soma + Math.round(Number(l.prize_amount) * 100),
      0,
    );
    expect(somaCentavos, "a soma fecha o prêmio no centavo").toBe(10_000_000);

    // A asserção que esta story acrescenta ao que a LTM-07 já provava: o
    // PAINEL casa cada metade com a compra DELA. Ignorar `winning_half` na
    // junta mostraria a data de uma pessoa ao lado do nome da outra.
    const exibidos = await readRecordedWinnersForRaffles(tenant.id, [raffle.id]);
    expect(exibidos).toHaveLength(2);
    const datas = await query<{ id: string; created_at: string }>(
      `SELECT id, created_at FROM orders WHERE id = ANY($1::uuid[])`,
      [[pedidoAna, pedidoBruno]],
    );
    const dataDoPedido = new Map(
      datas.map((d) => [d.id, new Date(d.created_at).toISOString()]),
    );
    const metade1 = exibidos.find((e) => e.winningHalf === 1);
    const metade2 = exibidos.find((e) => e.winningHalf === 2);
    expect(new Date(metade1!.purchasedAt!).toISOString()).toBe(
      dataDoPedido.get(pedidoAna),
    );
    expect(new Date(metade2!.purchasedAt!).toISOString()).toBe(
      dataDoPedido.get(pedidoBruno),
    );
  });

  it("AC5: metade órfã leva o prêmio INTEIRO, pelo número digitado", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, [metade(7, 1)], comprador.phone);
    // A metade 2 do 7 continua à venda, e o sorteio acontece assim.

    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "7")],
    });
    expect(lugares(result)[0].ok).toBe(true);

    const linhas = await readWinners(raffle.id);
    expect(linhas, "uma linha, não duas — a outra metade não tem dono").toHaveLength(1);
    expect(linhas[0].prize_amount).toBe(PREMIO_CHEIO);
    expect(linhas[0].winning_half).toBe(1);
  });
});

// ── N ganhadores, cada um com o valor do seu lugar ──────────────────────
//
// Decisão do founder, 2026-11-20, textual: *"vários números e também apenas
// no caso de sorteio com meia cota vai poder haver até 2 ganhadores por cada
// número vencedor que pode ser mais de 1"*. N números sorteados, e por
// número 1 ou 2 ganhadores — as duas metades. Nada além disso: mais de dois
// no mesmo número está FORA por decisão dele, não por limitação nossa.
//
// O que estes testes provam é que a capacidade existe SEM que o valor seja
// inventado: cada lugar leva o valor que o operador digitou, e a soma paga é
// a soma do que ele declarou — não N× o valor do cadastro.

describe("LTM-27 — N ganhadores, um por número sorteado", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });
    await setPrizeDescriptions(raffle.id, ["1º lugar", "2º lugar", "3º lugar"]);
  });

  it("três lugares, três números, três valores digitados — e a soma é a dos valores", async () => {
    const primeiro = await createBuyer({ tenantId: tenant.id });
    const segundo = await createBuyer({ tenantId: tenant.id });
    const terceiro = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, titulos(1), primeiro.phone);
    await comprar(tenant, raffle, titulos(2), segundo.phone);
    await comprar(tenant, raffle, titulos(3), terceiro.phone);

    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [
        { prizeIndex: 0, rawNumber: "1", rawPrizeAmount: "50000.00" },
        { prizeIndex: 1, rawNumber: "2", rawPrizeAmount: "30000.00" },
        { prizeIndex: 2, rawNumber: "3", rawPrizeAmount: "20000.00" },
      ],
    });

    expect(lugares(result)).toHaveLength(3);
    for (const lugar of lugares(result)) {
      expect(lugar.ok, `o lugar ${lugar.prizeIndex} tem valor informado`).toBe(true);
    }

    const linhas = await readWinners(raffle.id);
    expect(linhas.map((l) => l.winning_number)).toEqual([1, 2, 3]);
    expect(linhas.map((l) => l.prize_amount)).toEqual([
      "50000.00",
      "30000.00",
      "20000.00",
    ]);
    // ⛔ A ASSERÇÃO QUE DISCRIMINA.
    //
    // Sem o valor por lugar, as três chamadas lerriam o MESMO
    // `advanced_settings.prizeAmount` e gravariam R$ 100.000,00 três vezes:
    // R$ 300.000,00 pagos de um prêmio de cem mil. Nada no código de antes
    // impedia, e a trava não é uma recusa — é a entrada ter a informação.
    const pagoCentavos = linhas.reduce(
      (soma, l) => soma + Math.round(Number(l.prize_amount) * 100),
      0,
    );
    expect(pagoCentavos, "paga a soma do que foi declarado, não N× o cadastro").toBe(
      10_000_000,
    );
    // E a descrição de cada lugar é a configurada na aba Prêmios.
    expect(linhas.map((l) => l.prize_description)).toEqual([
      "1º lugar",
      "2º lugar",
      "3º lugar",
    ]);
  });

  it("valor ilegível é recusa nomeada, e nada é gravado para aquele lugar", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    const outro = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, titulos(5), comprador.phone);
    await comprar(tenant, raffle, titulos(6), outro.phone);

    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [
        // A forma que um operador brasileiro digita sem pensar. Recusar é a
        // única saída honesta: "1.000" é mil ou é um? Arredondar ou adivinhar
        // no caminho do prêmio é pior que pedir de novo.
        { prizeIndex: 0, rawNumber: "5", rawPrizeAmount: "100.000,00" },
        // Três casas decimais: `toCents` recusa em vez de arredondar.
        { prizeIndex: 1, rawNumber: "6", rawPrizeAmount: "1000.005" },
      ],
    });

    expect(recusaDoLugar(result, 0).code).toBe("prize_amount_invalid");
    expect(recusaDoLugar(result, 1).code).toBe("prize_amount_invalid");
    expect(await readWinners(raffle.id)).toHaveLength(0);
  });

  it("sorteio sem prêmio em dinheiro aceita o valor digitado — o default é `other`", async () => {
    // A armadilha que o @qa nomeou: `prizeKind` tem default `"other"`
    // (`product-settings.ts:67`), então sorteio com `advanced_settings`
    // vazio — o caso comum — cairia em `prize_not_rateable` mesmo com o
    // valor informado, se o valor explícito tivesse de atravessar aquela
    // recusa. O caminho do valor informado a PULA, e mantém o mesmo
    // `centsOrNull` e a mesma recusa de valor ≤ 0.
    const semPremio = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      pricePerNumber: "10.00",
    });
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, semPremio, titulos(7), comprador.phone);

    const result = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: semPremio.id,
      entries: [
        { prizeIndex: 0, rawNumber: "7", rawPrizeAmount: "900.00" },
      ],
    });
    expect(lugares(result)[0].ok).toBe(true);
    const linhas = await readWinners(semPremio.id);
    expect(linhas[0].prize_amount).toBe("900.00");

    // E sem valor em NENHUMA das duas fontes, a recusa do domínio continua
    // valendo: ganhador não nasce com valor inventado.
    const outro = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, semPremio, titulos(8), outro.phone);
    const semValor = await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: semPremio.id,
      entries: [campo(0, "8")],
    });
    expect(recusaDoLugar(semValor, 0).code).toBe("prize_not_rateable");
    expect(await readWinners(semPremio.id)).toHaveLength(1);
  });

  it("a descrição digitada ganha da configurada, e `Prêmio 1` nunca vai ao banco", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, titulos(9), comprador.phone);

    await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [
        { prizeIndex: 0, rawNumber: "9", prizeDescription: "Um Fiat Argo 2026" },
      ],
    });
    const comDigitada = await readWinners(raffle.id);
    expect(
      comDigitada[0].prize_description,
      "o que o operador escreveu no modal, não o que estava na aba",
    ).toBe("Um Fiat Argo 2026");
  });

  it("a descrição configurada do 1º prêmio é a gravada — e `Prêmio 1` nunca é", async () => {
    const comprador = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, raffle, titulos(9), comprador.phone);

    await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: raffle.id,
      entries: [campo(0, "9")],
    });
    const linhas = await readWinners(raffle.id);
    expect(linhas[0].prize_description).toBe("1º lugar");

    // Num sorteio sem descrição nenhuma, quem escreve a descrição é o
    // domínio (`Prêmio do título N`), não o rótulo da tela.
    const semDescricao = await createRaffle({
      tenantId: tenant.id,
      totalNumbers: 10,
      prize: { kind: "cash", amount: PREMIO_CHEIO },
    });
    const outro = await createBuyer({ tenantId: tenant.id });
    await comprar(tenant, semDescricao, titulos(0), outro.phone);
    await defineWinnersForRaffle({
      tenantId: tenant.id,
      productId: semDescricao.id,
      entries: [campo(0, "0")],
    });
    const semLinhas = await readWinners(semDescricao.id);
    expect(semLinhas[0].prize_description).not.toBe("Prêmio 1");
    expect(semLinhas[0].prize_description).toContain("título 0");
  });
});
