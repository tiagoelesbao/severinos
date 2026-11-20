// O MARCADOR DE DIVISIBILIDADE NO EDITOR (LTM-08, AC4 e AC7).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO É O QUE TORNA A MEIA COTA ALCANÇÁVEL
//
// Medido em 2026-11-20: `setProductDivisibility` existia com ZERO chamadores
// de produção, nenhum `.tsx` enviava `isDivisible`, e `productSchema:25` o
// resolve para `false`. Três ACs da LTM-07 guardavam uma transição que
// NENHUM caminho de produção disparava — cobertura que parece completa e não
// é. O controle testado aqui é o caminho real.
//
// ── O QUE SE VERIFICA, E O QUE NÃO
//
// A REGRA não é testada aqui: o congelamento, a recusa de prêmio não
// monetário e a de prêmio indivisível são da LTM-07 e estão verificadas
// contra o Postgres em `money-path/half-quota-domain.test.ts`. O que se
// verifica aqui é que a TELA mostra o motivo que o domínio dá — e que ela o
// mostra COM AS PALAVRAS DELE, não com uma segunda redação que possa
// divergir no dia em que a regra mudar.
//
// Por isso as mensagens esperadas saem de `sellingFreezeRefusal` e
// `divisibilityRefusalFor`, chamadas aqui: comparar com string escrita à mão
// provaria que alguém digitou a mesma frase duas vezes, não que a tela
// mostra a recusa do servidor.
// ════════════════════════════════════════════════════════════════════════

import { renderToStaticMarkup } from "react-dom/server";

import { describe, expect, it } from "vitest";

import { DivisibilityControl } from "@/app/dashboard/products/[id]/advanced-settings-tabs";
import { UNIT_NAMES } from "@/lib/raffles/orphan-halves";
import {
  divisibilityRefusalFor,
  sellingFreezeRefusal,
} from "@/lib/validations/product";

const IGNORA = () => {};

function render(over: {
  divisible?: boolean;
  freezeReason?: string | null;
  refusal?: string | null;
  halfPriceText?: string | null;
}) {
  return renderToStaticMarkup(
    <DivisibilityControl
      divisible={over.divisible ?? false}
      freezeReason={over.freezeReason ?? null}
      refusal={over.refusal ?? null}
      halfPriceText={over.halfPriceText ?? null}
      unitNames={UNIT_NAMES}
      onChange={IGNORA}
    />,
  );
}

describe("o controle existe e é a porta da meia cota", () => {
  it("renderiza um interruptor habilitado em sorteio sem venda", () => {
    const html = render({});
    expect(html).toContain('role="switch"');
    expect(html).toContain('aria-checked="false"');
    // ⚠️ A asserção é sobre `aria-disabled`, não sobre a palavra "disabled":
    // a classe do interruptor carrega `data-disabled:cursor-not-allowed` e
    // `data-disabled:opacity-50` SEMPRE, então `not.toContain("disabled")`
    // falhava num controle perfeitamente habilitado. Medido no render.
    expect(html).not.toContain('aria-disabled="true"');
  });

  it("em sorteio já divisível, o interruptor aparece ligado", () => {
    expect(render({ divisible: true })).toContain('aria-checked="true"');
  });

  it("diz o preço da metade quando a meia cota está ligada", () => {
    const html = render({ divisible: true, halfPriceText: "2.00" });
    expect(html).toContain("metade");
    // R$ 2,00 formatado em pt-BR. O espaço do `Intl` é NBSP.
    expect(html.replace(/ /g, " ")).toContain("R$ 2,00");
  });
});

describe("AC4 — o congelamento é visível, com o motivo escrito", () => {
  const congelado = sellingFreezeRefusal(7);

  it("com venda feita, o interruptor fica desabilitado — e anuncia isso", () => {
    const html = render({ freezeReason: congelado?.message ?? null });
    expect(html).toContain('aria-disabled="true"');
    // Para leitor de tela também: inerte sem anúncio é metade do AC4.
    expect(html).toContain('data-disabled=""');
  });

  it("e o motivo aparece na tela, nas palavras do domínio", () => {
    expect(congelado).not.toBeNull();
    const html = render({ freezeReason: congelado!.message });

    // A frase inteira, não uma paráfrase: é o texto que `sellingFreezeRefusal`
    // produz, e ele nomeia QUANTAS unidades já saíram do estoque.
    expect(html).toContain("7 unidade(s) fora do estoque");
    expect(html).toContain("somente-leitura a partir da primeira venda");
    // "Nada foi alterado" é a parte que evita o operador achar que salvou.
    expect(html).toContain("Nada foi alterado");
  });

  it("sem venda nenhuma, não há motivo nem bloqueio — e nada é insinuado", () => {
    expect(sellingFreezeRefusal(0)).toBeNull();
    const html = render({ freezeReason: null });
    expect(html).not.toContain("fora do estoque");
    expect(html).not.toContain('aria-disabled="true"');
  });
});

describe("AC7 — a recusa de prêmio não divisível mostra o MOTIVO, não um erro genérico", () => {
  it("prêmio que não é dinheiro: a tela diz por que metade de um carro não serve", () => {
    const recusa = divisibilityRefusalFor({
      prize: { prizeKind: "other", prizeAmount: null },
      pricePerNumber: "4.00",
    });
    expect(recusa?.code).toBe("prize_not_cash");

    const html = render({ refusal: recusa!.message });
    expect(html).toContain("Metade de um carro");
    expect(html).toContain("aba Prêmios");
    // E o que NÃO pode acontecer: a tela só dizendo que não deu.
    expect(html).not.toContain("Não foi possível");
  });

  it("prêmio em dinheiro que não divide: a tela mostra o valor e os dois vizinhos exatos", () => {
    const recusa = divisibilityRefusalFor({
      prize: { prizeKind: "cash", prizeAmount: "100000.01" },
      pricePerNumber: "4.00",
    });
    expect(recusa?.code).toBe("prize_not_divisible");

    const html = render({ refusal: recusa!.message }).replace(/ /g, " ");
    expect(html).toContain("não se divide em duas metades");
    expect(html).toContain("meio centavo não existe");
    // Os dois valores que FUNCIONARIAM — é o que transforma a recusa em
    // instrução em vez de parede.
    expect(html).toContain("R$ 100.000,00");
    expect(html).toContain("R$ 100.000,02");
  });

  it("preço que não divide: a recusa é sobre o PREÇO, e diz isso", () => {
    const recusa = divisibilityRefusalFor({
      prize: { prizeKind: "cash", prizeAmount: "100000.00" },
      pricePerNumber: "5.01",
    });
    expect(recusa?.code).toBe("price_not_divisible");

    const html = render({ refusal: recusa!.message }).replace(/ /g, " ");
    expect(html).toContain("R$ 5,01");
    expect(html).toContain("sem ágio e sem desconto");
  });

  it("a recusa é anunciada como alerta, para leitor de tela não perdê-la", () => {
    const html = render({ refusal: "qualquer motivo" });
    expect(html).toContain('role="alert"');
  });

  it("prêmio em dinheiro que divide exato: NENHUMA recusa — a porta abre", () => {
    // O contrapeso dos casos acima. Sem este, um controle que recusasse
    // sempre passaria em todos os outros testes deste bloco.
    expect(
      divisibilityRefusalFor({
        prize: { prizeKind: "cash", prizeAmount: "100000.00" },
        pricePerNumber: "4.00",
      }),
    ).toBeNull();
    expect(render({ refusal: null })).not.toContain('role="alert"');
  });
});
