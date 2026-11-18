// A fronteira de dinheiro (LTM-03a, AC-E1 e AC-E2).
//
// Não toca o banco. Está em `tests/money-path/` porque é literalmente a
// fronteira do caminho do dinheiro: é aqui que `value_cents` do provedor
// encontra o `numeric(12,2)` de `orders.amount`.

import { describe, expect, it } from "vitest";

import { MoneyPrecisionError, fromCents, toCents } from "@/lib/payments/money";

describe("toCents / fromCents", () => {
  // AC-E1 — o conjunto é o que a story nomeia, mais os extremos que o
  // `numeric(12,2)` admite.
  const ida: [string, number][] = [
    ["61.00", 6100],
    ["0.05", 5],
    ["1234567.89", 123456789],
    ["0.00", 0],
    ["0.5", 50],
    ["10", 1000],
    ["9999999999.99", 999999999999],
  ];

  it.each(ida)("AC-E1: \"%s\" vale %i centavos", (texto, centavos) => {
    expect(toCents(texto)).toBe(centavos);
  });

  it.each([
    ["61.00", 6100],
    ["0.05", 5],
    ["1234567.89", 123456789],
    ["0.00", 0],
  ] as [string, number][])(
    "AC-E1: ida e volta fecha para \"%s\"",
    (texto, centavos) => {
      expect(fromCents(toCents(texto))).toBe(texto);
      expect(toCents(fromCents(centavos))).toBe(centavos);
    },
  );

  it("AC-E1: a volta normaliza para duas casas", () => {
    // "0.5" é entrada válida e sai como "0.50": a ida e volta fecha no
    // VALOR, não na grafia. Sem isto declarado, a asserção acima de
    // igualdade de string pareceria contradizer esta.
    expect(fromCents(toCents("0.5"))).toBe("0.50");
    expect(fromCents(toCents("10"))).toBe("10.00");
  });

  it("AC-E2: três casas decimais FALHAM, não são arredondadas", () => {
    // Metade de R$ 5,01. Arredondar para 2,50 ou 2,51 cria desconto ou ágio
    // de um centavo num caminho de dinheiro — e nenhum dos dois aparece em
    // log.
    expect(() => toCents("2.505")).toThrow(MoneyPrecisionError);
    expect(() => toCents("61.001")).toThrow(MoneyPrecisionError);
    expect(() => toCents("0.999")).toThrow(MoneyPrecisionError);
  });

  it("AC-E2: a mensagem diz que recusou em vez de arredondar", () => {
    // O texto do erro é o que alguém vai ler às 2 da manhã. Se ele não
    // disser que a recusa é deliberada, a reação é "arredonda e segue".
    expect(() => toCents("2.505")).toThrow(/recusad[ao] em vez de arredondad[ao]/i);
  });

  it("ramo de falha: texto que não é número", () => {
    for (const ruim of ["", "   ", "abc", "61,00", "R$ 61,00", "1e3", "NaN", "61."]) {
      expect(() => toCents(ruim)).toThrow(MoneyPrecisionError);
    }
  });

  it("ramo de falha: number em vez de string é recusado na entrada", () => {
    // Aceitar `number` seria aceitar um valor que já passou por ponto
    // flutuante — e depois do fato não há como distinguir "o dado tem três
    // casas" de "o binário deixou resíduo".
    expect(() => toCents(61 as unknown as string)).toThrow(MoneyPrecisionError);
  });

  it("ramo de falha: fração de centavo na volta", () => {
    expect(() => fromCents(10.5)).toThrow(MoneyPrecisionError);
    expect(() => fromCents(Number.NaN)).toThrow(MoneyPrecisionError);
  });

  it("valor negativo atravessa nos dois sentidos", () => {
    // Estorno é valor negativo. Não é usado nesta story (estorno automático
    // está no Escopo OUT), e a fronteira já tem de saber representá-lo para
    // não ser o lugar onde a LTM que o implementar precise de uma exceção.
    expect(toCents("-61.00")).toBe(-6100);
    expect(fromCents(-6100)).toBe("-61.00");
  });
});
