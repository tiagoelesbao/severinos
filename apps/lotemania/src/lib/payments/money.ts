// A fronteira de dinheiro, num lugar só (LTM-03a, item 9 da arquitetura).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ISTO NÃO É `Number(x) * 100`
//
// Os dois lados da fronteira usam unidades diferentes:
//
//   provedor                  `value_cents` — INTEIRO em centavos
//   orders.amount             numeric(12,2) — reais, duas casas, e o driver
//                             o entrega como STRING ("61.00")
//   banking_transactions.amount  numeric(14,2) — idem
//
// `Number("0.07") * 100` é `7.000000000000001` em IEEE-754. Arredondar o
// resíduo é correto; arredondar o DADO não é. As duas coisas são
// indistinguíveis quando a conversão é uma multiplicação solta no meio de
// outro arquivo — e é por isso que ela mora aqui, com teste de ida e volta.
//
// A regra que fecha o buraco: valor com mais de duas casas decimais FALHA
// ALTO (AC-E2). Arredondar R$ 2,505 para R$ 2,50 ou R$ 2,51 em silêncio é
// criar desconto ou ágio de um centavo num caminho de dinheiro.
// ════════════════════════════════════════════════════════════════════════

/** Uma string decimal com no máximo duas casas, com sinal opcional. */
const DECIMAL_WITH_UP_TO_TWO_PLACES = /^(-?)(\d+)(?:\.(\d{1,2}))?$/;

export class MoneyPrecisionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MoneyPrecisionError";
  }
}

/**
 * Reais (string decimal) → centavos inteiros.
 *
 * Aceita só STRING de propósito. `number` já chegaria aqui tendo passado por
 * ponto flutuante, e não há como distinguir "o dado tem três casas" de "o
 * binário produziu resíduo" depois do fato. `numeric` do Postgres sai do
 * driver como string, que é a forma em que o dado de verdade chega.
 */
export function toCents(amount: string): number {
  if (typeof amount !== "string") {
    throw new MoneyPrecisionError(
      `toCents espera string decimal e recebeu ${typeof amount}. ` +
        `numeric do Postgres chega como string — converter para number antes ` +
        `é perder a precisão no caminho.`,
    );
  }

  const match = DECIMAL_WITH_UP_TO_TWO_PLACES.exec(amount.trim());
  if (!match) {
    throw new MoneyPrecisionError(
      `Valor monetário inválido: "${amount}". Esperado decimal com no máximo ` +
        `duas casas (ex.: "61.00", "0.05"). Mais de duas casas é recusado em ` +
        `vez de arredondado.`,
    );
  }

  const [, sign, whole, fraction = ""] = match;
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(cents)) {
    throw new MoneyPrecisionError(
      `Valor monetário fora da faixa representável em centavos: "${amount}".`,
    );
  }
  return sign === "-" ? -cents : cents;
}

/** Centavos inteiros → reais (string decimal com duas casas). */
export function fromCents(cents: number): string {
  if (!Number.isInteger(cents)) {
    throw new MoneyPrecisionError(
      `fromCents espera inteiro de centavos e recebeu ${cents}. ` +
        `Fração de centavo não existe — arredondar aqui esconderia o defeito ` +
        `de quem produziu o valor.`,
    );
  }
  if (!Number.isSafeInteger(cents)) {
    throw new MoneyPrecisionError(`Centavos fora da faixa segura: ${cents}.`);
  }

  const negative = cents < 0;
  const absolute = Math.abs(cents);
  const whole = Math.trunc(absolute / 100);
  const fraction = absolute % 100;
  return `${negative ? "-" : ""}${whole}.${String(fraction).padStart(2, "0")}`;
}
