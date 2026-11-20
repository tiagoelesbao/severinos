// A MEIA COTA VISTA DE FORA DO DOMÍNIO (LTM-08).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO NÃO É `"use server"`
//
// Mesma razão escrita em `raffles/expire-reservations.ts:23-32` e em
// `raffles/divisibility.ts:1-14`, e ela é de BUILD, não de estilo: num
// arquivo `"use server"` o Next só admite exportação de função ASSÍNCRONA.
// Uma constante (`UNIT_NAMES`) ou uma função síncrona (`markedUnitLabel`)
// exportada de lá faz o módulo inteiro perder TODAS as exportações no grafo
// do cliente, e o `next build` morre acusando OUTRO arquivo. Já aconteceu
// três vezes nesta base (medido em `validations/reserve.ts:77-99`).
//
// E há a razão de desenho: `halfPanelFor` roda em COMPONENTE DE SERVIDOR
// (`dashboard/products/[id]/page.tsx`), não numa ação do operador.
// Exportá-la de um arquivo `"use server"` a transformaria num endpoint POST
// público — ela é leitura de painel, não ação de ninguém.
//
// ⚠️ ESTE MÓDULO IMPORTA `@/db`, então NENHUM componente de cliente pode
// importá-lo. Quem precisa dos rótulos no cliente os recebe como PROP, já
// montada pelo servidor: `number-grid.tsx`, `lookup-form.tsx` e
// `advanced-settings-tabs.tsx` fazem exatamente isso.
// ════════════════════════════════════════════════════════════════════════

import { eq, sql } from "drizzle-orm";

import { db } from "@/db";
import { productNumbers } from "@/db/schema";
import { fromCents } from "@/lib/payments/money";
import { centsOrNull, type RaffleUnit } from "@/lib/validations/product";
import { productAdvancedSettingsSchema } from "@/lib/validations/product-settings";
import { HALVES_PER_DIVISIBLE_TITLE } from "@/lib/validations/reserve";

// ── O NOME DA UNIDADE (GLOSSARY → Unidade; AC2) ─────────────────────────
//
// "A interface escreve o nome da unidade em vez de deixar o número solto. O
// perigo nunca foi a contagem mudar; é mudar sem dizer." Num sorteio
// divisível, "comprar 10" dá dez METADES — cinco títulos —, e o número
// sozinho não diz qual das duas coisas é.
//
// Os dois nomes vivem aqui, e não em cada tela, porque a divergência que
// importa não é de tradução: é duas telas chamando a mesma coisa de nomes
// diferentes no mesmo sorteio.

export interface UnitName {
  readonly one: string;
  readonly many: string;
}

export const UNIT_NAMES: Record<RaffleUnit, UnitName> = {
  title: { one: "título", many: "títulos" },
  half: { one: "metade", many: "metades" },
};

/** O nome da unidade do sorteio, pelo marcador de divisibilidade. */
export function unitNamesFor(product: { isDivisible: boolean }): UnitName {
  return product.isDivisible ? UNIT_NAMES.half : UNIT_NAMES.title;
}

/** `3 metades`, `1 título` — contagem NUNCA sem o nome da unidade (AC2). */
export function countWithUnit(count: number, unit: UnitName): string {
  return `${count} ${count === 1 ? unit.one : unit.many}`;
}

// ── A METADE MARCADA (GLOSSARY → Metade marcada; AC5, AC8) ──────────────

/**
 * `42 (metade)` para uma metade, `43` nu para o título inteiro.
 *
 * ⚠️ QUEM DECIDE SE É METADE É O CHAMADOR, e isso não é delegação
 * preguiçosa: as duas fontes confiáveis são DIFERENTES e nenhuma delas é
 * `product_numbers.half`.
 *
 *   • no cartão de ganhador  →  `winners.winning_half !== null`. A coluna é
 *     nulável de propósito (`raffles.ts:306-316`): `null` carrega "não foi
 *     meia cota".
 *   • em "Meus títulos"      →  `orders.unit === "half"`. É a unidade em que
 *     AQUELE pedido foi contado e cobrado quando nasceu (`raffles.ts:48-59`),
 *     e é o que impede o passado de ser relido pela configuração do presente.
 *
 * `half` NÃO serve para essa pergunta: em sorteio de cota inteira toda linha
 * tem `half = 1` (o caso degenerado, `raffles.ts:98-101`), então
 * `half === 1` marcaria como metade todo título inteiro que já se vendeu.
 *
 * O preenchimento com zero à esquerda é o de hoje em todas as telas da loja
 * (`String(n).padStart(2, "0")`) e fica aqui para o título inteiro continuar
 * saindo EXATAMENTE como sai hoje.
 */
export function markedUnitLabel(input: {
  readonly number: number;
  readonly isHalf: boolean;
  readonly padTo?: number;
}): string {
  const texto = String(input.number).padStart(input.padTo ?? 2, "0");
  return input.isHalf ? `${texto} (metade)` : texto;
}

// ════════════════════════════════════════════════════════════════════════
// O ANÚNCIO DOS DOIS VALORES (AC3)
//
// Mostrar "R$ 100.000" ao lado do preço da metade induz a erro: a pessoa
// compra achando que concorre ao valor cheio. Isso cai em
// `.claude/rules/claims-ledger.md` — afirmação que não se sustenta não sai —
// e valor inflado ao lado do preço é prática enganosa pelo CDC, não só UX
// ruim. É o risco [Alto] da story, o único com consequência fora do
// software.
//
// Então o anúncio é DERIVADO, nunca escrito na tela: quem compra uma metade
// de um sorteio de R$ 100.000,00 vê R$ 50.000,00 ao lado do preço dela,
// porque é o que ela concorre (GLOSSARY → Rateio: metades iguais, rateio
// igual).
//
// ⚠️ TUDO EM STRING DECIMAL, nunca `number`. `money.ts:36-39`: `number`
// chegaria aqui tendo passado por ponto flutuante e depois do fato não se
// distingue "o dado tem três casas" de "o binário deixou resíduo".
// `100000 / 2` em IEEE-754 dá certo por sorte; `0.07 * 100` não, e o anúncio
// não pode depender de qual dos dois é o valor do dia.
//
// E é SERIALIZÁVEL de propósito: atravessa a fronteira servidor→cliente como
// prop de `NumberGrid`, que é componente de cliente e não pode importar este
// módulo (ver o bloco do topo).
// ════════════════════════════════════════════════════════════════════════

export interface RaffleAnnouncement {
  readonly isDivisible: boolean;
  readonly unit: UnitName;
  /**
   * Preço de UMA unidade, string decimal.
   *
   * `null` quando o preço do título não divide exato em centavos num sorteio
   * divisível — estado que o domínio recusa criar (`price_not_divisible`) e
   * que a reserva ainda barra como rede de segurança (`reserve.ts:295`).
   * Nulo aqui significa "não anuncie preço de metade", não "zero".
   */
  readonly unitPriceText: string | null;
  /**
   * O que UMA unidade concorre, string decimal. `null` quando o prêmio não
   * está declarado como dinheiro — e aí não há valor honesto a anunciar.
   */
  readonly unitPrizeText: string | null;
  /** O prêmio cheio do sorteio, como declarado na aba Prêmios. */
  readonly fullPrizeText: string | null;
}

export function buildRaffleAnnouncement(product: {
  readonly isDivisible: boolean;
  /** `products.price_per_number` cru, como o driver o entrega. */
  readonly pricePerNumber: string;
  /** `products.advanced_settings` cru. Lido SEMPRE por `parse`. */
  readonly advancedSettings: unknown;
}): RaffleAnnouncement {
  // Via `parse`, nunca por acesso cru ao jsonb: sorteio criado antes da
  // LTM-07 tem `advanced_settings = {}`, e são os defaults do schema que
  // entregam `prizeKind: "other"`. Acesso cru devolveria `undefined`, a
  // comparação passaria por acidente e o anúncio sairia com um valor que
  // ninguém declarou. Mesma razão escrita em `divisibility.ts:61-69`.
  const settings = productAdvancedSettingsSchema.safeParse(product.advancedSettings ?? {});
  const prizeKind = settings.success ? settings.data.prizeKind : "other";
  const declaredPrize = settings.success ? settings.data.prizeAmount : null;

  const halves = product.isDivisible ? HALVES_PER_DIVISIBLE_TITLE : 1;
  const unit = unitNamesFor(product);

  const priceCents = centsOrNull(product.pricePerNumber);
  const unitPriceText =
    priceCents !== null && priceCents % halves === 0
      ? fromCents(priceCents / halves)
      : null;

  // O prêmio só vira número anunciável se for dinheiro E dividir exato. As
  // duas condições são as mesmas que `divisibilityRefusalFor` aplica na
  // entrada; aqui elas decidem se existe valor a MOSTRAR, e na dúvida não se
  // mostra nada.
  const prizeCents = prizeKind === "cash" ? centsOrNull(declaredPrize) : null;
  const fullPrizeText = prizeCents !== null ? fromCents(prizeCents) : null;
  const unitPrizeText =
    prizeCents !== null && prizeCents % halves === 0
      ? fromCents(prizeCents / halves)
      : null;

  return { isDivisible: product.isDivisible, unit, unitPriceText, unitPrizeText, fullPrizeText };
}

// ── O PAINEL DA MEIA COTA, PARA O OPERADOR (AC4 e AC6) ──────────────────

export interface HalfPanel {
  /**
   * Unidades fora do estoque (`status <> 'available'`) — reservadas OU
   * vendidas. É o número que CONGELA a divisibilidade (AC9 da LTM-07), e a
   * definição é a de `sellingFreezeRefusal`, não uma segunda: o painel
   * mostra o motivo que o domínio recusaria.
   */
  readonly unitsOutOfStock: number;
  /**
   * Títulos com METADE ÓRFÃ (GLOSSARY → Metade órfã): exatamente uma das
   * duas metades vendida.
   *
   * Três decisões dentro de uma consulta:
   *
   *   1. `count(*) > 1` é a guarda de DADO que dispensa o booleano: título
   *      com uma linha só é cota inteira e não pode ter órfã. Passar
   *      `isDivisible` daria ao chamador a chance de discordar do estoque.
   *   2. ÓRFÃ é `status = 'sold'`, não `<> 'available'`: metade apenas
   *      reservada pode voltar ao estoque pela varredura de expiração
   *      (`expire-reservations.ts`), e contá-la mostraria órfã que o prazo
   *      desfaz em 15 minutos.
   *   3. É uma FOTOGRAFIA, não um veredito. O número muda até o sorteio, e é
   *      exatamente por isso que o AC6 exige que ele esteja na tela ANTES —
   *      quem tem metade órfã sorteada leva o prêmio inteiro, e o operador
   *      precisa saber quantos títulos estão nessa situação enquanto ainda dá
   *      para vender a outra metade.
   */
  readonly orphanTitles: number;
}

export async function halfPanelFor(productId: string): Promise<HalfPanel> {
  // Uma ida ao banco para os dois números: o agregado externo responde o
  // congelamento, e a subconsulta escalar responde a órfã. Sem `GROUP BY`
  // externo o Postgres devolve linha mesmo com zero unidades, então não há
  // caso de `undefined` escondido num sorteio recém-criado.
  const [row] = await db
    .select({
      unitsOutOfStock: sql<number>`count(*) filter (where ${productNumbers.status} <> 'available')::int`,
      orphanTitles: sql<number>`(
        select count(*)::int
          from (
            select pn.number
              from product_numbers pn
             where pn.product_id = ${productId}
             group by pn.number
            having count(*) > 1
               and count(*) filter (where pn.status = 'sold') = 1
          ) orfaos
      )`,
    })
    .from(productNumbers)
    .where(eq(productNumbers.productId, productId));

  return {
    unitsOutOfStock: row?.unitsOutOfStock ?? 0,
    orphanTitles: row?.orphanTitles ?? 0,
  };
}
