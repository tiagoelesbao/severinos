// A DEFINIÇÃO DOS GANHADORES — o caminho de produção até o rateio (LTM-27).
//
// ════════════════════════════════════════════════════════════════════════
// O FIM ABERTO QUE ESTE ARQUIVO FECHA
//
// `raffles/winners.ts` (LTM-07) faz o rateio certo e, até esta story, tinha
// UM importador em todo o repositório — e era um teste. O sorteio nascia,
// vendia, recebia pagamento, encerrava, e não existia como dizer quem
// ganhou. O que faltava não era o domínio: era a fiação e a tela.
//
// Este módulo é a fiação. Ele recebe o que o operador digitou no modal
// `Ganhadores` — uma linha por ganhador, com número, descrição e valor do
// prêmio daquele lugar, mais a data do sorteio —, valida o que é validável
// sem ir ao banco, e aciona `recordWinnersForDrawnTitle` UMA VEZ POR LINHA.
//
// ── QUANTOS GANHADORES, E A FORMA EXATA QUE O FOUNDER PEDIU
//
// Decisão do founder, 2026-11-20, textual: *"vários números e também apenas
// no caso de sorteio com meia cota vai poder haver até 2 ganhadores por cada
// número vencedor que pode ser mais de 1"*.
//
// Ou seja: N NÚMEROS SORTEADOS, e por número 1 ganhador (título inteiro) ou
// 2 (as duas metades). E essa forma é EXATAMENTE a que o domínio entregue
// já tem: uma chamada de `recordWinnersForDrawnTitle` por número devolve
// `recorded[]` com 1 ou 2 linhas, cada uma com seu `winningHalf` — as duas
// metades saem de uma chamada só, sem nada de novo.
//
// ⛔ A guarda `already_recorded` do domínio NÃO MUDA, e isto não é
// limitação contornada: ela é chaveada no par `(productId, winningNumber)`
// (`winners.ts:134-154`), e como cada lugar de prêmio é um número
// DIFERENTE, cada chamada passa. Mais de dois ganhadores no MESMO número
// está fora por decisão do founder — nada de coluna de ordem, nada de faixa
// de prêmio inventada.
//
// O que cada chamada leva de novo é O VALOR DAQUELE LUGAR, digitado pelo
// operador: `advanced_settings` guarda UM valor por sorteio, e reusá-lo em N
// chamadas pagaria N× o prêmio.
//
// ── POR QUE AQUI, E NÃO DENTRO DE `actions/winners.ts`
//
// Mesma razão de `raffles/divisibility.ts`, `payments/gateway-config.ts` e
// `raffles/expire-reservations.ts`, e ela está escrita no topo de
// `gateway-config.test.tsx`: a server action chama `requireUser()`, que lê
// `cookies()`, e `cookies()` não existe fora de uma requisição. Mockar a
// autenticação para verificar uma regra do caminho do prêmio verificaria o
// dublê. A decisão mora aqui, verificável contra o Postgres de verdade; a
// server action é a casca que autoriza e revalida.
//
// ── NADA AQUI LANÇA PARA DIZER "NÃO DEU"
//
// `src/app` não tem UMA fronteira de erro (`find src/app -name error.tsx`
// devolve vazio — medido em 2026-11-20). Uma action que LANÇA deixa a tela
// muda: o operador clica, o botão volta a habilitar, e nada aparece. É o
// defeito registrado na LTM-26. Então o idioma é o do domínio — DEVOLVER
// `{ ok: false, refusal }` com a razão nomeada — e ele é propagado intacto
// até o modal, por lugar de prêmio (AC2).
// ════════════════════════════════════════════════════════════════════════

import { and, eq, inArray, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";

import { db } from "@/db";
import { products, winners } from "@/db/schema";
import { centsOrNull } from "@/lib/validations/product";
import { productAdvancedSettingsSchema } from "@/lib/validations/product-settings";

import {
  recordWinnersForDrawnTitle,
  type RecordWinnersRefusalCode,
  type RecordedWinner,
} from "./winners";

// ── O vocabulário das recusas ───────────────────────────────────────────
//
// As quatro primeiras são do domínio (`winners.ts:30-38`) e chegam aqui
// INTACTAS, com a mensagem que ele escreveu. As demais nascem neste módulo,
// que é onde a entrada do operador é lida.

export type DefineWinnersRefusalCode =
  | RecordWinnersRefusalCode
  /** Nenhum campo foi preenchido — salvar vazio não é salvar. */
  | "no_number_informed"
  /** Veio ponto, vírgula, espaço ou letra onde só cabe dígito. */
  | "number_not_numeric"
  /** Quantidade de dígitos diferente da do sorteio. */
  | "number_wrong_digits"
  /** Dígitos certos, título que não existe neste sorteio. */
  | "number_out_of_range"
  /** A data do sorteio informada no modal não se lê como data. */
  | "announced_at_invalid"
  /** O valor digitado para o lugar não se lê como dinheiro. */
  | "prize_amount_invalid"
  /** Falha não prevista: chega à tela em vez de sumir num throw. */
  | "unexpected_error";

export interface DefineWinnersRefusal {
  readonly code: DefineWinnersRefusalCode;
  readonly message: string;
}

/**
 * Um LUGAR de prêmio do sorteio — a linha do modal.
 *
 * `label` é o que o modal escreve ao lado de "Ganhador:"; `description` é o
 * texto que o operador de fato configurou na aba Prêmios, ou `null` quando
 * ele não configurou nenhum. A distinção importa: `label` nunca é vazio
 * (a tela precisa de rótulo), `description` só vai para
 * `winners.prize_description` quando é texto do operador — inventar
 * "Prêmio 1" como descrição de prêmio seria escrever no caminho do prêmio
 * uma informação que ninguém declarou.
 */
export interface PrizePlace {
  readonly index: number;
  readonly label: string;
  readonly description: string | null;
}

// ── As partes puras: nenhuma vai ao banco ───────────────────────────────

/**
 * Quantos dígitos tem o título deste sorteio — a validação que a Sorteamos
 * faz e que vale copiar (*"Essa campanha é de 1 dígitos"*).
 *
 * A numeração desta base vai de 0 a `totalNumbers - 1`
 * (`actions/products.ts:40-42`, e o seed da suíte depende disso), então o
 * maior título de um sorteio de 100 é o 99: dois dígitos. É barato e evita
 * o operador digitar `042` num sorteio de 100 ou `7` num de 1.000 — erro no
 * caminho do prêmio.
 */
export function digitsForRaffle(totalNumbers: number): number {
  return String(Math.max(0, Math.trunc(totalNumbers) - 1)).length;
}

/**
 * Os lugares de prêmio do sorteio, a partir da aba Prêmios — o PONTO DE
 * PARTIDA do modal, não um limite: o operador acrescenta quantas linhas de
 * ganhador quiser (decisão do founder, 2026-11-20).
 *
 * [AUTO-DECISÃO 2026-11-20] Sorteio SEM prêmio configurado tem UM lugar, e
 * não zero. Zero lugares renderizaria um modal sem campo nenhum, e a
 * funcionalidade ficaria inalcançável exatamente no caso do ensaio ponta a
 * ponta — `prizes` é descrição livre e opcional, e um sorteio pode declarar
 * `prizeAmount` sem nunca escrever uma linha de descrição. A captura da
 * Sorteamos mostra UM campo, rotulado `Ganhador: Prêmio 1`; é essa a forma
 * reproduzida aqui.
 */
export function prizePlacesFor(prizes: readonly string[] | undefined): PrizePlace[] {
  const descriptions = prizes && prizes.length > 0 ? prizes : [""];
  return descriptions.map((description, index) => {
    const limpa = description.trim();
    return {
      index,
      label: limpa === "" ? `Prêmio ${index + 1}` : limpa,
      description: limpa === "" ? null : limpa,
    };
  });
}

export type DrawnNumberParse =
  | { readonly ok: true; readonly winningNumber: number }
  | { readonly ok: false; readonly refusal: DefineWinnersRefusal };

/**
 * Lê o número que o operador digitou (AC6).
 *
 * A ordem das recusas é a ordem em que elas informam: primeiro "isto não é
 * número", depois "não é do tamanho deste sorteio", por fim "é do tamanho
 * mas não existe". `042` num sorteio de 100 morre na segunda; `99` num
 * sorteio de 50, na terceira.
 *
 * ⚠️ Recusar, e não truncar. Um `maxLength` no campo cortaria `042` em `04`
 * em silêncio e registraria ganhador do título 4 — a recusa com razão
 * nomeada é mais segura que a correção invisível.
 */
export function parseDrawnNumber(
  raw: string,
  raffle: { readonly digits: number; readonly totalNumbers: number },
): DrawnNumberParse {
  const informado = raw.trim();

  if (!/^\d+$/.test(informado)) {
    return {
      ok: false,
      refusal: {
        code: "number_not_numeric",
        message:
          `"${raw}" não é um número de título. Informe os números ` +
          "corretamente, sem ponto, vírgula, espaço ou letra.",
      },
    };
  }

  if (informado.length !== raffle.digits) {
    return {
      ok: false,
      refusal: {
        code: "number_wrong_digits",
        message:
          `Esta campanha é de ${raffle.digits} ` +
          `${raffle.digits === 1 ? "dígito" : "dígitos"}, e "${informado}" tem ` +
          `${informado.length}. Utilize os dígitos corretos para os números.`,
      },
    };
  }

  const winningNumber = Number(informado);
  if (winningNumber > raffle.totalNumbers - 1) {
    return {
      ok: false,
      refusal: {
        code: "number_out_of_range",
        message:
          `O título ${winningNumber} não existe neste sorteio, que vai de 0 a ` +
          `${raffle.totalNumbers - 1}.`,
      },
    };
  }

  return { ok: true, winningNumber };
}

export type AnnouncedAtParse =
  | { readonly ok: true; readonly announcedAt: Date | null }
  | { readonly ok: false; readonly refusal: DefineWinnersRefusal };

/**
 * Lê a `Data do sorteio` do modal (AC7).
 *
 * Vazio devolve `null`, e `null` significa "não informou" — aí
 * `winners.announced_at` fica com o `defaultNow()` do schema
 * (`raffles.ts:317-319`). Qualquer outra coisa que não se leia como data é
 * RECUSA, nunca "usa hoje": a data do sorteio é editável porque o sorteio
 * aconteceu fora do sistema, e trocar em silêncio a data real pela data do
 * clique falsificaria o registro do prêmio.
 */
export function parseAnnouncedAt(raw: string | null | undefined): AnnouncedAtParse {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return { ok: true, announcedAt: null };
  }
  const quando = new Date(raw);
  if (Number.isNaN(quando.getTime())) {
    return {
      ok: false,
      refusal: {
        code: "announced_at_invalid",
        message:
          `"${raw}" não se lê como data do sorteio. Informe a data e a hora ` +
          "em que o sorteio aconteceu.",
      },
    };
  }
  return { ok: true, announcedAt: quando };
}

export type PrizeAmountParse =
  | { readonly ok: true; readonly prizeAmount: string | null }
  | { readonly ok: false; readonly refusal: DefineWinnersRefusal };

/**
 * Lê o VALOR do prêmio daquele lugar, digitado no modal.
 *
 * ════════════════════════════════════════════════════════════════════════
 * POR QUE O VALOR É DIGITADO, E NÃO DERIVADO
 *
 * Decisão do founder, 2026-11-20: *"assim como na sorteamos, aqui devemos
 * poder como usuário definir mais de um ganhador, devo poder cadastrar
 * quantos eu quiser"*. Cadastrar N ganhadores é REQUISITO — a objeção do
 * prêmio pago N vezes foi levada a ele e ele reafirmou a capacidade.
 *
 * Só que `advanced_settings.prizeAmount` guarda UM valor por sorteio, e
 * `recordWinnersForDrawnTitle` ratearia esse mesmo valor em cada chamada: N
 * lugares pagariam N× o prêmio. E não há de onde derivar o valor do 2º
 * lugar — `prizes` é `z.array(z.string())`, descrição livre SEM valor
 * (`product-settings.ts:39`).
 *
 * ⛔ Dividir o valor declarado entre os lugares, ou assumir que o 2º vale
 * metade, seria inventar no caminho do prêmio (Artigo IV, `claims-ledger`).
 * A única fonte sem invenção é o operador, que sabe quanto cada lugar paga.
 *
 * Vazio devolve `null`, e `null` quer dizer "não informei" — aí o domínio
 * usa o valor do cadastro, como sempre fez. Valor ilegível é RECUSA, nunca
 * arredondamento: `toCents` recusa mais de duas casas em vez de arredondar
 * (`money.ts:18-20`), e aqui a recusa só é repassada.
 * ════════════════════════════════════════════════════════════════════════
 */
export function parsePrizeAmount(raw: string | null | undefined): PrizeAmountParse {
  if (raw === null || raw === undefined || raw.trim() === "") {
    return { ok: true, prizeAmount: null };
  }
  const informado = raw.trim();
  const centavos = centsOrNull(informado);
  if (centavos === null || centavos <= 0) {
    return {
      ok: false,
      refusal: {
        code: "prize_amount_invalid",
        message:
          `"${raw}" não é um valor de prêmio válido. Informe reais com ponto ` +
          'decimal e até duas casas — "100000.00" para cem mil. Mais de duas ' +
          "casas é recusado em vez de arredondado, e nada é gravado com valor " +
          "adivinhado.",
      },
    };
  }
  return { ok: true, prizeAmount: informado };
}

// ── A entrada e a saída da definição ────────────────────────────────────

/**
 * UM ganhador a cadastrar — uma linha do modal.
 *
 * O operador acrescenta quantas quiser (decisão do founder, 2026-11-20). As
 * primeiras vêm dos prêmios configurados (`prizePlacesFor`), que é o ponto
 * de partida da tela, não um limite.
 */
export interface DefineWinnersEntry {
  /** A posição da linha no modal: 0 é a primeira. */
  readonly prizeIndex: number;
  /** O que o operador digitou, cru — a validação é deste módulo. */
  readonly rawNumber: string;
  /**
   * A descrição do prêmio DAQUELE lugar. Vazio cai na descrição configurada
   * na aba Prêmios e, na falta das duas, no texto do domínio.
   */
  readonly prizeDescription?: string | null;
  /** O valor DAQUELE lugar, cru. Vazio = usa o valor do cadastro. */
  readonly rawPrizeAmount?: string | null;
}

export interface DefineWinnersInput {
  readonly tenantId: string;
  readonly productId: string;
  readonly entries: readonly DefineWinnersEntry[];
  /** `null` = não informada; o schema usa `defaultNow()`. */
  readonly announcedAt?: Date | null;
}

/** O resultado de UM lugar de prêmio. Cada lugar tem o seu. */
export type WinnersPlaceOutcome =
  | {
      readonly ok: true;
      readonly prizeIndex: number;
      readonly prizeLabel: string;
      readonly winningNumber: number;
      readonly recorded: readonly RecordedWinner[];
    }
  | {
      readonly ok: false;
      readonly prizeIndex: number;
      readonly prizeLabel: string;
      readonly refusal: DefineWinnersRefusal;
    };

/**
 * `ok: false` = nada foi tentado (não há sorteio, ou não veio número).
 * `ok: true` = a tela tem resultado POR LUGAR — e cada lugar carrega o seu
 * próprio `ok`. Um salvamento pode gravar três ganhadores e recusar o
 * quarto, e a tela tem de mostrar a razão de cada recusa (AC2).
 */
export type DefineWinnersResult =
  | { readonly ok: false; readonly refusal: DefineWinnersRefusal }
  | {
      readonly ok: true;
      readonly places: readonly WinnersPlaceOutcome[];
      readonly recordedCount: number;
    };

export async function defineWinnersForRaffle(
  input: DefineWinnersInput,
): Promise<DefineWinnersResult> {
  const [product] = await db
    .select({
      id: products.id,
      totalNumbers: products.totalNumbers,
      advancedSettings: products.advancedSettings,
    })
    .from(products)
    .where(and(eq(products.id, input.productId), eq(products.tenantId, input.tenantId)))
    .limit(1);

  if (!product) {
    return {
      ok: false,
      refusal: {
        code: "raffle_not_found",
        message: `Nenhum sorteio com id ${input.productId} para este operador.`,
      },
    };
  }

  // Lido por `safeParse` e nunca por acesso cru ao jsonb, pela razão de
  // sempre: sorteio antigo tem `advanced_settings = {}` e são os defaults
  // que entregam o valor (`product-settings.ts:59-62`).
  const settings = productAdvancedSettingsSchema.safeParse(product.advancedSettings ?? {});
  const places = prizePlacesFor(settings.success ? settings.data.prizes : []);
  const digits = digitsForRaffle(product.totalNumbers);

  const informadas = input.entries
    .filter((entry) => entry.rawNumber.trim() !== "")
    .slice()
    .sort((a, b) => a.prizeIndex - b.prizeIndex);

  if (informadas.length === 0) {
    return {
      ok: false,
      refusal: {
        code: "no_number_informed",
        message:
          "Nenhum número sorteado foi informado. Informe o número do título " +
          "que saiu no sorteio para registrar o ganhador.",
      },
    };
  }

  const resultados: WinnersPlaceOutcome[] = [];
  let recordedCount = 0;

  for (const entry of informadas) {
    const place = places[entry.prizeIndex];
    // A descrição digitada ganha da configurada. `label` é rótulo de tela e
    // NUNCA vira descrição gravada: "Prêmio 2" no banco seria texto que
    // ninguém escreveu.
    const descricaoDigitada = entry.prizeDescription?.trim() ?? "";
    const prizeDescription =
      descricaoDigitada !== "" ? descricaoDigitada : place?.description ?? null;
    const prizeLabel =
      descricaoDigitada !== ""
        ? descricaoDigitada
        : place?.label ?? `Prêmio ${entry.prizeIndex + 1}`;

    // O valor do lugar, antes de qualquer ida ao banco.
    const valor = parsePrizeAmount(entry.rawPrizeAmount);
    if (!valor.ok) {
      resultados.push({
        ok: false,
        prizeIndex: entry.prizeIndex,
        prizeLabel,
        refusal: valor.refusal,
      });
      continue;
    }

    const lido = parseDrawnNumber(entry.rawNumber, {
      digits,
      totalNumbers: product.totalNumbers,
    });
    if (!lido.ok) {
      resultados.push({
        ok: false,
        prizeIndex: entry.prizeIndex,
        prizeLabel,
        refusal: lido.refusal,
      });
      continue;
    }

    const gravacao = await recordWinnersForDrawnTitle({
      tenantId: input.tenantId,
      productId: input.productId,
      winningNumber: lido.winningNumber,
      // Só a descrição que o operador de fato escreveu. Sem ela, o domínio
      // escreve `Prêmio do título N`, que é descrição e não invenção.
      ...(prizeDescription ? { prizeDescription } : {}),
      // O valor DESTE lugar. Ausente = o domínio lê o cadastro exatamente
      // como antes desta story, e é o que faz um sorteio de um prêmio só
      // continuar funcionando sem digitar valor nenhum.
      ...(valor.prizeAmount !== null ? { prizeAmount: valor.prizeAmount } : {}),
      ...(input.announcedAt ? { announcedAt: input.announcedAt } : {}),
    });

    if (!gravacao.ok) {
      resultados.push({
        ok: false,
        prizeIndex: entry.prizeIndex,
        prizeLabel,
        // A recusa do domínio chega à tela com a mensagem DELE. As quatro
        // dizem coisas diferentes, e a tela tem de mostrar a razão de cada
        // uma em vez de um erro genérico (AC2).
        refusal: gravacao.refusal,
      });
      continue;
    }

    recordedCount += gravacao.recorded.length;
    resultados.push({
      ok: true,
      prizeIndex: entry.prizeIndex,
      prizeLabel,
      winningNumber: lido.winningNumber,
      recorded: gravacao.recorded,
    });
  }

  return { ok: true, places: resultados, recordedCount };
}

// ── A exibição no painel ────────────────────────────────────────────────

export interface RecordedWinnerRow {
  readonly id: string;
  readonly productId: string;
  readonly winnerName: string;
  readonly winningNumber: number | null;
  readonly winningHalf: number | null;
  readonly prizeAmount: string | null;
  readonly announcedAt: Date;
  /**
   * Quando o ganhador comprou o título — a `Data da compra` que a Sorteamos
   * exibe inline na lista.
   *
   * ⚠️ `winners` NÃO guarda isto, e nem deve: a tabela não tem referência ao
   * pedido (`raffles.ts:286-320`). A data vem da junta
   * `product_numbers.order_id → orders.created_at` NA HORA DE EXIBIR, e o
   * @po nomeou essa junta no AC1 justamente para ela não virar "mostra o que
   * der" no meio da implementação.
   *
   * `null` quando a unidade vendida não é mais localizável — ganhador
   * registrado à mão, ou título que mudou de dono depois do anúncio.
   */
  readonly purchasedAt: Date | string | null;
}

/**
 * Os ganhadores já registrados dos sorteios listados, com a data da compra.
 *
 * Vive neste módulo, e não na página, para que a junta do AC1 seja
 * verificável contra o Postgres de verdade — é a parte da exibição onde
 * errar significa mostrar a data de outra pessoa.
 */
export async function readRecordedWinnersForRaffles(
  tenantId: string,
  productIds: readonly string[],
): Promise<RecordedWinnerRow[]> {
  if (productIds.length === 0) return [];

  // ═════════════════════════════════════════════════════════════════════
  // A COLUNA AMBÍGUA (42702), E POR QUE O APELIDO SÓ NÃO BASTA
  //
  // Numa consulta de tabela Única o drizzle emite a coluna SEM qualificar:
  // `"product_id"`. Dentro da subconsulta correlacionada abaixo, que tem
  // `product_numbers pn` no escopo e TAMBÉM uma `product_id`, essa
  // referência fica ambígua — o Postgres responde 42702 e a lista de
  // sorteios inteira morre.
  //
  // `alias(winners, "w")` resolve a consulta de FORA (`"w"."tenant_id"`),
  // mas NÃO o que é interpolado dentro do template `sql`: `${w.productId}`
  // continuava saindo como `"product_id"` cru. Foi medido — o apelido
  // entrou, as duas asserções que GRAVAM ganhador continuaram vermelhas com
  // 42702, e a versão anterior deste comentário afirmava que estava
  // resolvido. Comentário que descreve um conserto que não funciona é pior
  // que comentário nenhum.
  //
  // O conserto é qualificar LITERALMENTE no template. `from(w)` põe o
  // apelido `w` no escopo, então `w."product_id"` é válido e inequívoco.
  // ═════════════════════════════════════════════════════════════════════
  const w = alias(winners, "w");

  const rows = await db
    .select({
      id: w.id,
      productId: w.productId,
      winnerName: w.winnerName,
      winningNumber: w.winningNumber,
      winningHalf: w.winningHalf,
      prizeAmount: w.prizeAmount,
      announcedAt: w.announcedAt,
      // A metade importa na junta, e não é detalhe de exibição: num título
      // divisível com as duas metades vendidas, ignorá-la casaria as DUAS
      // linhas de ganhador com a MESMA compra — a data de uma pessoa
      // aparecendo ao lado do nome da outra.
      purchasedAt: sql<Date | string | null>`(
        SELECT o.created_at
          FROM product_numbers pn
          JOIN orders o ON o.id = pn.order_id
         WHERE pn.product_id = w."product_id"
           AND pn.number = w."winning_number"
           AND (w."winning_half" IS NULL OR pn.half = w."winning_half")
           AND pn.status = 'sold'
         ORDER BY o.created_at
         LIMIT 1)`,
    })
    .from(w)
    .where(and(eq(w.tenantId, tenantId), inArray(w.productId, [...productIds])))
    .orderBy(w.winningNumber, w.winningHalf);

  return rows;
}
