// As DUAS máscaras de telefone da loja, e o nome (LTM-14 / LTM-15 / LTM-21).
//
// ⚠️ ESTE ARQUIVO É O ÚNICO CONSUMIDOR DE `maskPhoneKeepingNinth` HOJE, e
// isso é deliberado. A função nasceu nesta story para a tela de pedido; a
// decisão do founder de 2026-11-19 — telefone INTEIRO na tela do próprio
// pedido — tirou essa tela da lista de quem mascara. Quem vai usá-la é a
// `LTM-21`, no modal de Checkout, onde a forma `(11) 9****-****` está
// medida (`fluxo-de-compra.md`, passo 2).
//
// A função foi mantida em vez de apagada porque o caro não é o código: é a
// medição das duas formas e a decisão de revelar o dígito REAL em vez de
// cravar um `9`. Enquanto não houver tela, é este teste que prende as duas
// formas — sem ele a função seria código sem nenhuma afirmação sobre si.

import { describe, expect, it } from "vitest";

import { maskName, maskPhone, maskPhoneKeepingNinth } from "@/lib/mask";

// Telefone sintético: DDD 00 não existe no plano de numeração brasileiro,
// então nenhum valor daqui é discável.
const CELULAR = "00987654321";
const FIXO = "0034567890";

describe("maskPhone — a forma do CARTÃO DE GANHADOR, pública", () => {
  it("não revela NENHUM dígito do número do assinante", () => {
    expect(maskPhone(CELULAR)).toBe("(00) ****-****");
    expect(maskPhone(FIXO)).toBe("(00) ****-****");
  });

  it("aceita o número já formatado e ignora a pontuação", () => {
    expect(maskPhone("(00) 98765-4321")).toBe("(00) ****-****");
  });

  it("sem telefone, devolve vazio — quem exibe decide o traço", () => {
    expect(maskPhone(null)).toBe("");
  });
});

describe("maskPhoneKeepingNinth — a forma do MODAL DE CHECKOUT", () => {
  it("revela o DDD e o nono dígito, e mais nada", () => {
    expect(maskPhoneKeepingNinth(CELULAR)).toBe("(00) 9****-****");
  });

  it("o 9 exibido é o dígito REAL, não um caractere cravado", () => {
    // Cravar `9` faria a tela afirmar que o número é celular mesmo quando
    // não é. Afirmar o que não se mediu é invenção, ainda que num dígito.
    expect(maskPhoneKeepingNinth("00887654321")).toBe("(00) 8****-****");
  });

  it("telefone FIXO não tem nono dígito — cai na forma sem ele", () => {
    expect(maskPhoneKeepingNinth(FIXO)).toBe("(00) ****-****");
    expect(maskPhoneKeepingNinth(FIXO)).toBe(maskPhone(FIXO));
  });

  it("as duas formas são DIFERENTES — é por isso que existem duas", () => {
    expect(maskPhoneKeepingNinth(CELULAR)).not.toBe(maskPhone(CELULAR));
  });

  it("nenhuma das duas deixa escapar o número inteiro", () => {
    for (const mascarado of [maskPhone(CELULAR), maskPhoneKeepingNinth(CELULAR)]) {
      expect(mascarado).not.toContain("87654321");
      expect(mascarado).not.toContain("4321");
    }
  });
});

describe("maskName — serve às duas telas sem mudança", () => {
  it("mantém o primeiro nome e corta o resto", () => {
    expect(maskName("Comprador Sintetico Da Suite")).toBe("Comprador ***");
  });

  it("nome de uma palavra continua mascarado", () => {
    expect(maskName("Comprador")).toBe("Comprador ***");
  });

  it("espaço sobrando não vira nome vazio", () => {
    expect(maskName("  Comprador   Sintetico  ")).toBe("Comprador ***");
  });
});
