import { z } from "zod";

import { MoneyPrecisionError, fromCents, toCents } from "@/lib/payments/money";
import { HALVES_PER_DIVISIBLE_TITLE } from "@/lib/validations/reserve";

export const productSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  slug: z.string().min(3, "URL muito curta").optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  privacy: z.enum(["public", "private"]).default("public"),
  pricePerNumber: z.coerce.number().positive("Preço deve ser positivo"),
  totalNumbers: z.coerce
    .number()
    .int()
    .positive("Quantidade de números deve ser positiva"),
  drawDate: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
  // Sorteio divisível (meia cota). O MARCADOR é coluna desde a LTM-01
  // (`raffles.ts:74`); o que entra aqui é a porta de criação dele, para que
  // a geração dos títulos saiba quantas linhas fazer por número.
  //
  // `false` por default porque é o caso historicamente único — e porque
  // nenhum sorteio deve virar divisível por omissão de um formulário.
  isDivisible: z.boolean().default(false),
  // O PRÊMIO, na criação. Mora em `advanced_settings` (aba Prêmios) — ver a
  // razão em `validations/product-settings.ts` —, e aparece aqui porque
  // `isDivisible: true` na criação tem de passar pelas MESMAS recusas do
  // AC10 e do AC12 que a habilitação posterior. Sem isto, criar o sorteio já
  // divisível seria a porta dos fundos por onde um prêmio indivisível entra.
  prizeKind: z.enum(["cash", "other"]).optional(),
  prizeAmount: z.string().nullable().optional(),
});

/** Values the form holds before zod coercion/defaults run. */
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductInput = z.output<typeof productSchema>;

// ════════════════════════════════════════════════════════════════════════
// A UNIDADE DO SORTEIO (GLOSSARY → Unidade)
//
// "A coisa que se conta naquele sorteio": o título em sorteio de cota
// inteira, a metade em sorteio divisível. Derivada em UM lugar, para que
// `orders.unit`, a geração dos títulos e a reserva não possam discordar
// entre si.
// ════════════════════════════════════════════════════════════════════════

/** Os dois valores do enum `order_unit` (`raffles.ts`). */
export type RaffleUnit = "title" | "half";

export function raffleUnitOf(product: { isDivisible: boolean }): RaffleUnit {
  return product.isDivisible ? "half" : "title";
}

/** Quantas linhas de `product_numbers` cada título deste sorteio tem. */
export function halvesPerTitleOf(product: { isDivisible: boolean }): number {
  return product.isDivisible ? HALVES_PER_DIVISIBLE_TITLE : 1;
}

// ════════════════════════════════════════════════════════════════════════
// AS RECUSAS DA DIVISIBILIDADE (LTM-07: AC9, AC10, AC12)
//
// Todas são RESTRIÇÃO NA ENTRADA, não política de desempate na saída — e
// essa é a regra de desenho que o ADR-0001 registrou com a razão inteira:
// quando o dono do negócio diz que um caso não ocorre ("os prêmios do
// Império são sempre valores cheios"), tratá-lo com uma política faz o
// sistema carregar para sempre a complexidade de um caso que nunca chega;
// proibi-lo faz a restrição aparecer quando alguém tenta criá-lo, que é
// quando a decisão ainda é barata.
//
// É por isso que o AC4 ("a soma dos rateios é EXATAMENTE o prêmio") não tem
// ramo condicional: o prêmio indivisível não entra.
//
// Toda recusa tem CÓDIGO e MENSAGEM. O código é para quem decide; a
// mensagem é para quem lê — e ela nomeia o prêmio e diz por que ele não
// serve, porque "não foi possível habilitar" manda o operador adivinhar.
// ════════════════════════════════════════════════════════════════════════

export type DivisibilityRefusalCode =
  /** O prêmio não é em dinheiro — AC10. */
  | "prize_not_cash"
  /** Declarado como dinheiro e sem valor. */
  | "prize_amount_missing"
  /** Valor declarado que não é dinheiro representável (3 casas, texto...). */
  | "prize_amount_invalid"
  /** Dinheiro, válido, e que não divide exato em centavos — AC12. */
  | "prize_not_divisible"
  /** O PREÇO do título não divide exato em centavos. */
  | "price_not_divisible"
  /** Já houve venda: a divisibilidade está congelada — AC9. */
  | "raffle_already_selling"
  /** A aba Prêmios tem conteúdo que o schema não consegue ler. */
  | "prize_settings_unreadable"
  /** Nenhum sorteio com esse id para este operador. */
  | "raffle_not_found";

export interface DivisibilityRefusal {
  readonly code: DivisibilityRefusalCode;
  readonly message: string;
}

/**
 * R$ a partir de centavos inteiros, no formato brasileiro.
 *
 * Formatação à mão em vez de `Intl.NumberFormat`: a mensagem de recusa é
 * verificada por teste, e build de Node com ICU reduzido troca o separador
 * sem avisar. Aqui o resultado é o mesmo em qualquer máquina.
 */
function reais(cents: number): string {
  const [inteiro, decimais] = fromCents(cents).split(".");
  const negativo = inteiro.startsWith("-");
  const digitos = negativo ? inteiro.slice(1) : inteiro;
  const agrupado = digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `R$ ${negativo ? "-" : ""}${agrupado},${decimais}`;
}

/**
 * Centavos de um valor monetário, ou `null` se ele não for representável.
 *
 * `toCents` LANÇA para valor com mais de duas casas (`money.ts:18-20`), e
 * lançar é certo lá — aqui a mesma condição é uma recusa com nome, não uma
 * falha de infraestrutura. A conversão é a única que decide: nenhum chamador
 * reimplementa "parece dinheiro".
 */
export function centsOrNull(amount: string | null | undefined): number | null {
  if (amount === null || amount === undefined || amount.trim() === "") return null;
  try {
    return toCents(amount);
  } catch (error) {
    if (error instanceof MoneyPrecisionError) return null;
    throw error;
  }
}

export interface DivisibilityPrize {
  readonly prizeKind: "cash" | "other";
  /** Reais, string decimal de até duas casas. `null` = não declarado. */
  readonly prizeAmount: string | null;
}

/**
 * Pode este sorteio ser divisível? `null` = pode.
 *
 * Pura: recebe o prêmio e o preço, não toca banco. Quem consulta o estado de
 * venda é `sellingFreezeRefusal`, abaixo, porque essa pergunta é do banco.
 */
export function divisibilityRefusalFor(input: {
  readonly prize: DivisibilityPrize;
  /** `products.price_per_number` cru, como o driver o entrega. */
  readonly pricePerNumber: string;
}): DivisibilityRefusal | null {
  const { prize, pricePerNumber } = input;

  // ── AC10: só prêmio em dinheiro ───────────────────────────────────────
  if (prize.prizeKind !== "cash") {
    return {
      code: "prize_not_cash",
      message:
        "A meia cota só existe em sorteio de prêmio em dinheiro, e o prêmio " +
        "deste sorteio não está declarado como dinheiro. Metade de um carro " +
        "não é pagável: ou se vende o carro e se divide o valor, e aí o " +
        "prêmio é dinheiro, ou o título não se divide. Declare o prêmio na " +
        "aba Prêmios como valor em dinheiro antes de habilitar.",
    };
  }

  const prizeCents = centsOrNull(prize.prizeAmount);
  if (prizeCents === null) {
    const declarado = prize.prizeAmount;
    if (declarado === null || declarado.trim() === "") {
      return {
        code: "prize_amount_missing",
        message:
          "O prêmio está declarado como dinheiro mas não tem valor. Sem o " +
          "valor não há como verificar se ele se divide em duas metades " +
          "exatas, e o rateio do sorteio ficaria sem base. Informe o valor " +
          "do prêmio na aba Prêmios.",
      };
    }
    return {
      code: "prize_amount_invalid",
      message:
        `O valor do prêmio (${declarado}) não é um valor em dinheiro ` +
        "válido: esperado um decimal de até duas casas, como 100000.00. " +
        "Fração de centavo é recusada em vez de arredondada.",
    };
  }

  if (prizeCents <= 0) {
    return {
      code: "prize_amount_missing",
      message:
        `O prêmio declarado é ${reais(prizeCents)}, que não é um prêmio. ` +
        "Informe o valor do prêmio na aba Prêmios antes de habilitar a meia cota.",
    };
  }

  // ── AC12: o prêmio divide exato em centavos ───────────────────────────
  if (prizeCents % HALVES_PER_DIVISIBLE_TITLE !== 0) {
    const metadeEmReais = (prizeCents / HALVES_PER_DIVISIBLE_TITLE / 100)
      .toFixed(3)
      .replace(".", ",");
    return {
      code: "prize_not_divisible",
      message:
        `O prêmio de ${reais(prizeCents)} não se divide em duas metades ` +
        `exatas: cada metade daria R$ ${metadeEmReais}, e meio centavo não ` +
        "existe. Quem ganha meia cota recebe metade do prêmio, e essa " +
        "divisão tem de fechar no centavo — nem um a mais, que o operador " +
        "pagaria, nem um a menos, que o ganhador reclamaria. Use um valor " +
        `de divisão exata (${reais(prizeCents - 1)} ou ${reais(prizeCents + 1)}).`,
    };
  }

  // ── O preço do título também tem de dividir ───────────────────────────
  //
  // Não é AC desta story: é a dívida que `actions/reserve.ts:264-267` deixou
  // escrita e endereçou AQUI — "a recusa na CRIAÇÃO do sorteio (preço que
  // não divide exato não pode virar divisível) é regra da LTM-07; aqui fica
  // a rede de segurança". Sem esta recusa, a rede de segurança de lá vira o
  // único aviso, e ela só dispara quando um comprador já está na tela
  // tentando pagar.
  const priceCents = centsOrNull(pricePerNumber);
  if (priceCents === null) {
    return {
      code: "prize_amount_invalid",
      message: `O preço do título (${pricePerNumber}) não é um valor em dinheiro válido.`,
    };
  }
  if (priceCents % HALVES_PER_DIVISIBLE_TITLE !== 0) {
    return {
      code: "price_not_divisible",
      message:
        `O título custa ${reais(priceCents)}, que não se divide em duas ` +
        "metades exatas. A meia cota custa exatamente metade, sem ágio e sem " +
        "desconto (ADR-0001), e meio centavo não existe. Ajuste o preço do " +
        "título para um valor de divisão exata antes de habilitar.",
    };
  }

  return null;
}

/**
 * O congelamento (AC9): a divisibilidade é editável até a primeira venda.
 *
 * ⚠️ "VENDA" AQUI É A UNIDADE QUE SAIU DO ESTOQUE — `status <> 'available'`
 * —, não só a paga. Três razões, e a terceira é a que decide:
 *
 *   1. Mudar a divisibilidade REESCREVE `product_numbers` (uma linha por
 *      número vira duas, ou o contrário). Linha reservada não pode ser
 *      apagada: ela tem dono e prazo.
 *   2. Quem está com uma reserva aberta já viu um preço e uma unidade na
 *      tela. Mudar a regra embaixo dele é o que o GLOSSARY chama de
 *      "comprar sob regra diferente".
 *   3. Reserva abandonada NÃO congela o sorteio para sempre: a varredura de
 *      expiração devolve a unidade a `available` (`reserve.ts:167-170`), e o
 *      sorteio volta a ser editável. O congelamento por reserva viva é
 *      temporário; o por venda paga é definitivo. Nenhum estado fica preso
 *      por engano.
 */
export function sellingFreezeRefusal(
  unitsOutOfStock: number,
): DivisibilityRefusal | null {
  if (unitsOutOfStock <= 0) return null;
  return {
    code: "raffle_already_selling",
    message:
      `Este sorteio já tem ${unitsOutOfStock} unidade(s) fora do estoque ` +
      "(reservada(s) ou vendida(s)), e a divisibilidade é somente-leitura a " +
      "partir da primeira venda. Habilitar agora faria quem comprou antes " +
      "ter comprado sob regra diferente de quem compra depois; desabilitar " +
      "deixaria metades já vendidas sem destino. Nada foi alterado.",
  };
}
