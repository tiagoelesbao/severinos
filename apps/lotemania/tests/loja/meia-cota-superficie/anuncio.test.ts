// O ANÚNCIO NÃO ENGANA (LTM-08, AC3).
//
// ════════════════════════════════════════════════════════════════════════
// O RISCO QUE ESTE ARQUIVO VIGIA É O ÚNICO COM CONSEQUÊNCIA FORA DO SOFTWARE
//
// "R$ 100.000" ao lado do preço da metade faz a pessoa comprar achando que
// concorre ao valor cheio. Isso é prática enganosa pelo CDC, e cai em
// `.claude/rules/claims-ledger.md`: afirmação que não se sustenta não sai.
// Um bug de reserva perde um pedido; este perde a defesa do operador.
//
// O anúncio é DERIVADO do prêmio declarado, nunca escrito na tela — então o
// que se verifica aqui é a derivação, em string decimal, do mesmo jeito que
// `money.test.ts` verifica a fronteira do dinheiro.
// ════════════════════════════════════════════════════════════════════════

import { describe, expect, it } from "vitest";

import { buildRaffleAnnouncement } from "@/lib/raffles/orphan-halves";

const RAPIDINHA_100K = { prizeKind: "cash" as const, prizeAmount: "100000.00" };

describe("AC3 — sorteio divisível: a metade anuncia o preço E o que ela concorre", () => {
  it("R$ 100.000,00 em metades de R$ 4,00: a metade custa 2,00 e concorre a 50.000,00", () => {
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "4.00",
      advancedSettings: RAPIDINHA_100K,
    });

    expect(anuncio.unit.one).toBe("metade");
    expect(anuncio.unitPriceText).toBe("2.00");
    expect(anuncio.unitPrizeText).toBe("50000.00");
    expect(anuncio.fullPrizeText).toBe("100000.00");
  });

  it("o valor que a metade concorre NUNCA é o prêmio cheio", () => {
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "4.00",
      advancedSettings: RAPIDINHA_100K,
    });

    // É literalmente o teste que o AC3 pede: a página de um sorteio
    // divisível de R$ 100.000 não exibe "R$ 100.000" como o valor de uma
    // compra de metade. Os dois campos que a tela põe ao lado do preço da
    // metade são estes dois, e nenhum deles carrega o valor cheio.
    expect(anuncio.unitPrizeText).not.toBe(anuncio.fullPrizeText);
    expect(anuncio.unitPriceText).not.toBe(anuncio.fullPrizeText);
    expect(anuncio.unitPrizeText).not.toContain("100000");
  });

  it("a soma dos dois rateios é EXATAMENTE o prêmio — nem um centavo a mais", () => {
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "4.00",
      advancedSettings: RAPIDINHA_100K,
    });
    const metadeEmCentavos = Math.round(Number(anuncio.unitPrizeText) * 100);
    const cheioEmCentavos = Math.round(Number(anuncio.fullPrizeText) * 100);
    expect(metadeEmCentavos * 2).toBe(cheioEmCentavos);
  });

  it("prêmio que não divide exato em centavos não gera valor anunciável", () => {
    // R$ 100.000,01 daria R$ 50.000,005 por metade, e meio centavo não
    // existe. O domínio RECUSA habilitar a divisibilidade nesse sorteio
    // (`prize_not_divisible`); se um chegasse aqui, o anúncio prefere não
    // dizer nada a arredondar na tela.
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "4.00",
      advancedSettings: { prizeKind: "cash", prizeAmount: "100000.01" },
    });
    expect(anuncio.unitPrizeText).toBeNull();
    expect(anuncio.fullPrizeText).toBe("100000.01");
  });

  it("preço que não divide exato não gera preço de metade", () => {
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "5.01",
      advancedSettings: RAPIDINHA_100K,
    });
    expect(anuncio.unitPriceText).toBeNull();
  });

  it("prêmio que não é dinheiro não tem valor a anunciar — e nada é inventado", () => {
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "4.00",
      advancedSettings: { prizeKind: "other", prizeAmount: "100000.00" },
    });
    // Mesmo com valor declarado: se o prêmio não é dinheiro, metade dele não
    // é pagável (AC10 da LTM-07), e anunciar um número aqui seria afirmar o
    // que não se sustenta.
    expect(anuncio.unitPrizeText).toBeNull();
    expect(anuncio.fullPrizeText).toBeNull();
  });

  it("sorteio antigo, com `advanced_settings = {}`, não anuncia prêmio nenhum", () => {
    // Os defaults do schema entregam `prizeKind: "other"`. Acesso cru ao
    // jsonb devolveria `undefined` e a comparação passaria por acidente —
    // razão escrita em `divisibility.ts:61-69`.
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "4.00",
      advancedSettings: {},
    });
    expect(anuncio.unitPriceText).toBe("2.00");
    expect(anuncio.unitPrizeText).toBeNull();
    expect(anuncio.fullPrizeText).toBeNull();
  });

  it("`advanced_settings` ilegível não derruba a página — só não anuncia", () => {
    const anuncio = buildRaffleAnnouncement({
      isDivisible: true,
      pricePerNumber: "4.00",
      advancedSettings: { prizeKind: "dinheiro vivo" },
    });
    expect(anuncio.unitPrizeText).toBeNull();
    expect(anuncio.unitPriceText).toBe("2.00");
  });
});

describe("AC3 — sorteio de cota inteira: o anúncio é o de sempre", () => {
  it("a unidade é o título, o preço é o cheio e o prêmio é o cheio", () => {
    const anuncio = buildRaffleAnnouncement({
      isDivisible: false,
      pricePerNumber: "4.00",
      advancedSettings: RAPIDINHA_100K,
    });

    expect(anuncio.isDivisible).toBe(false);
    expect(anuncio.unit.one).toBe("título");
    expect(anuncio.unitPriceText).toBe("4.00");
    // Aqui o título inteiro concorre ao valor INTEIRO, e os dois campos
    // coincidirem é o certo — é a única configuração em que coincidir não é
    // engano.
    expect(anuncio.unitPrizeText).toBe("100000.00");
    expect(anuncio.fullPrizeText).toBe("100000.00");
  });

  it("preço com centavo ímpar continua válido em cota inteira", () => {
    // Não há metade a tirar, então `5.01` não tem por que recusar nada — e
    // recusar aqui quebraria 177 sorteios/semana que não dividem nada.
    const anuncio = buildRaffleAnnouncement({
      isDivisible: false,
      pricePerNumber: "5.01",
      advancedSettings: {},
    });
    expect(anuncio.unitPriceText).toBe("5.01");
  });
});
