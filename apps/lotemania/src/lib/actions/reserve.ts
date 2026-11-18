"use server";

import { eq, and, or, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  tenants,
  products,
  orders,
  users,
  productNumbers,
  blockedNumbers,
} from "@/db/schema";
import {
  reserveNumbersSchema,
  HALVES_PER_DIVISIBLE_TITLE,
  reservationMinutesFor,
  type ReserveNumbersInput,
} from "@/lib/validations/reserve";

const ANTI_SPAM_THRESHOLD = 3;
const ANTI_SPAM_BLOCK_MINUTES = 30;

// ⚠️ A JANELA DA RESERVA NÃO É UM NÚMERO DESTE ARQUIVO (LTM-03b, AC14).
//
// Era `const RESERVATION_MINUTES = 15` aqui, e a tarefa da story pedia para
// EXPORTÁ-LA. As duas coisas estão erradas, por razões diferentes:
//
//   • exportar é IMPOSSÍVEL. Este arquivo é `"use server"`, e num arquivo
//     `"use server"` o Next só admite exportação de função assíncrona.
//     Exportar a constante faz o módulo perder TODAS as exportações no
//     grafo do cliente e `pnpm build` morrer em `number-grid.tsx`. Medido
//     contra `next build` em 2026-11-18.
//
//   • constante é a forma ERRADA. A janela vai virar configuração POR
//     SORTEIO (o campo já existe na tela e ninguém o lê), então ela é
//     função do sorteio, não do módulo.
//
// A fonte única é `reservationMinutesFor(product)`, em
// `@/lib/validations/reserve` — módulo puro, com a razão inteira escrita.

const CONFLITO =
  "Algum dos números escolhidos acabou de ser reservado por outra pessoa. Atualize a página e tente de novo.";

// ════════════════════════════════════════════════════════════════════════
// ISOLAMENTO, TRAVAMENTO E QUEM GANHA A DISPUTA (LTM-02)
//
// Esta é a resposta à pergunta aberta que o @po registrou em 2026-11-16 e
// repetiu em 17-11: exclusão mútua POR LINHA não garante, sozinha, o AC3.
// Ela garante que ninguém leva a metade de outro; não garante que ALGUÉM
// leve as 10. O resultado ruim que ela admite é "dois tomam subconjuntos
// diferentes, os dois voltam com menos do que pediram, os dois desfazem" —
// 10 unidades livres, zero reservas, nenhum comprador atendido.
//
// O que decide isso é a ORDEM DE TRAVAMENTO, e aqui ela é explícita:
//
//   1. `READ COMMITTED` (o padrão do Postgres). Não há `SERIALIZABLE` nem
//      `REPEATABLE READ`, e não é omissão: sob isolamento maior a disputa
//      viraria erro de serialização a ser repetido, trocando um mecanismo
//      determinístico por uma repetição que ninguém mediu.
//
//   2. A tomada das unidades é UMA instrução, e ela trava o conjunto
//      inteiro em ordem determinística — `ORDER BY number, half ... FOR
//      UPDATE` dentro de uma subconsulta, com o `UPDATE` condicional por
//      `status` por cima. Todos os disputantes pedem as linhas na MESMA
//      ordem, então não existe emparelhamento cruzado (A espera por B
//      enquanto B espera por A) e não existe subconjunto: quem chega
//      segundo espera no primeiro par, e quando o primeiro comete, a
//      recontagem do Postgres (EvalPlanQual) reavalia `status =
//      'available'`, a linha deixa de casar, e o segundo volta com ZERO.
//      Um vencedor com tudo; os outros com nada.
//
//   3. A transação é o que torna a sequência REVERSÍVEL — não é o que
//      resolve a corrida. A corrida continua resolvida pelo `UPDATE`
//      condicional com a unicidade de `(product_id, number, half)` da
//      LTM-01, exatamente como o ADR-0001 descreve. O que a transação
//      elimina é a compensação manual: o pedido do perdedor não nasce.
//
// Verificação: `tests/money-path/reserve-concurrency.test.ts`, 20
// disputantes sobre as mesmas 10 unidades, repetível com
// `LTM02_AC3_RODADAS=10`. É a diferença entre mecanismo e sorte.
//
// Não há risco de emparelhamento cruzado com a varredura de expiração: ela
// só mexe em linhas `reserved` de pedidos vencidos DO PRÓPRIO comprador, e
// a reserva só mexe em linhas `available`. Os conjuntos são disjuntos por
// construção — uma linha não está nos dois estados.
// ════════════════════════════════════════════════════════════════════════

/** A unidade vendável que a reserva de fato vai tomar: o par, sempre resolvido. */
interface TargetUnit {
  number: number;
  half: number;
}

/**
 * Erro de disputa perdida. Existe para ser LANÇADO dentro da transação:
 * lançar é o que faz o Postgres desfazer o pedido e a tomada das unidades
 * juntos. É a substituição do bloco de compensação manual que vivia aqui
 * (devolver números a disponível + marcar o pedido como cancelado), e é o
 * AC2 desta story.
 */
class ReservationConflictError extends Error {
  constructor(readonly pedidas: number, readonly tomadas: number) {
    super(`Pedidas ${pedidas} unidades, tomadas ${tomadas}.`);
    this.name = "ReservationConflictError";
  }
}

/** Centavos inteiros de um título, a partir do `numeric(12,2)` do banco. */
function titleCents(pricePerNumber: string): number {
  const parsed = Number(pricePerNumber);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`price_per_number inválido no sorteio: "${pricePerNumber}".`);
  }
  // `numeric(12,2)` já vem com duas casas; o arredondamento aqui é contra o
  // resíduo binário de `0.07 * 100 = 7.000000000000001`, não contra o dado.
  return Math.round(parsed * 100);
}

// Releases this user's numbers whose reservation already expired, and
// tallies how many unpaid reservations they've abandoned in a row —
// mirrors the original's "Anti Spam": too many no-pay reservations in a
// row gets you temporarily blocked from reserving more.
//
// As três escritas (liberar unidades → expirar pedidos → atualizar o
// contador do comprador) rodam numa transação só (AC6). Antes eram soltas,
// e a ordem importava do jeito errado: dava para o contador anti-spam subir
// — bloqueando o comprador — sem que as unidades dele tivessem sido
// liberadas, o que é o pior dos dois mundos.
async function expireStaleReservationsAndCheckSpam(
  tenantId: string,
  userId: string,
): Promise<{ blocked: boolean; blockedUntil?: Date }> {
  return db.transaction(async (tx) => {
    const [user] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return { blocked: false };

    if (user.blockedUntil && user.blockedUntil > new Date()) {
      return { blocked: true, blockedUntil: user.blockedUntil };
    }

    const expiredOrders = await tx
      .select({ id: orders.id })
      .from(orders)
      .innerJoin(productNumbers, eq(productNumbers.orderId, orders.id))
      .where(
        and(
          eq(orders.tenantId, tenantId),
          eq(orders.userId, userId),
          eq(orders.status, "pending"),
          // `status = 'reserved'` não é filtro redundante: é o predicado do
          // índice parcial que a LTM-01 criou
          // (`product_numbers_status_reserved_until_idx ... WHERE status =
          // 'reserved'`). Sem ele o Postgres não alcança o índice e a
          // varredura fica fora do plano para o qual o índice foi feito —
          // o índice existiria órfão. Comportamento idêntico: unidade com
          // prazo vencido e status diferente de `reserved` pertence a
          // pedido pago, que o filtro `orders.status = 'pending'` já exclui.
          eq(productNumbers.status, "reserved"),
          sql`${productNumbers.reservedUntil} < now()`,
        ),
      )
      .groupBy(orders.id);

    if (expiredOrders.length === 0) return { blocked: false };

    const expiredIds = expiredOrders.map((o) => o.id);
    await tx
      .update(productNumbers)
      .set({ status: "available", orderId: null, reservedUntil: null })
      .where(inArray(productNumbers.orderId, expiredIds));
    await tx
      .update(orders)
      .set({ status: "expired" })
      .where(inArray(orders.id, expiredIds));

    const newCount = user.consecutiveUnpaidReservations + expiredOrders.length;
    if (newCount >= ANTI_SPAM_THRESHOLD) {
      const blockedUntil = new Date(Date.now() + ANTI_SPAM_BLOCK_MINUTES * 60 * 1000);
      await tx
        .update(users)
        .set({ consecutiveUnpaidReservations: 0, blockedUntil })
        .where(eq(users.id, userId));
      return { blocked: true, blockedUntil };
    }

    await tx
      .update(users)
      .set({ consecutiveUnpaidReservations: newCount })
      .where(eq(users.id, userId));
    return { blocked: false };
  });
}

/**
 * Resolve a seleção do comprador em unidades vendáveis concretas.
 *
 * `half: null` quer dizer "o título inteiro": uma unidade em sorteio de cota
 * inteira, as DUAS metades em sorteio divisível — tomadas juntas ou nenhuma,
 * porque a contagem exigida é exata.
 */
function resolveTargetUnits(
  selection: ReserveNumbersInput["units"],
  halvesPerTitle: number,
): { units: TargetUnit[] } | { error: string } {
  const units: TargetUnit[] = [];
  for (const item of selection) {
    if (item.half === null) {
      for (let half = 1; half <= halvesPerTitle; half++) {
        units.push({ number: item.number, half });
      }
      continue;
    }
    if (item.half > halvesPerTitle) {
      // Pedir a metade 2 de um sorteio de cota inteira. Recusar é a única
      // resposta honesta: converter em silêncio para o título inteiro
      // cobraria o dobro do que a tela mostrou.
      return { error: "Este sorteio não é vendido em metades." };
    }
    units.push({ number: item.number, half: item.half });
  }
  return { units };
}

export async function reserveSelectedNumbers(input: ReserveNumbersInput) {
  const data = reserveNumbersSchema.parse(input);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, data.tenantSlug))
    .limit(1);
  if (!tenant || !tenant.isActive) return { error: "Operador não encontrado." };

  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenant.id),
        eq(products.slug, data.productSlug),
        eq(products.status, "active"),
      ),
    )
    .limit(1);
  if (!product) return { error: "Sorteio não encontrado ou encerrado." };

  // A unidade do sorteio (GLOSSARY → Unidade): o título, ou a metade num
  // sorteio divisível. Tudo abaixo — preço, contagem e `quantity` — conta
  // nesta unidade, nunca em títulos.
  const halvesPerTitle = product.isDivisible ? HALVES_PER_DIVISIBLE_TITLE : 1;

  const resolved = resolveTargetUnits(data.units, halvesPerTitle);
  if ("error" in resolved) return { error: resolved.error };
  const targetUnits = resolved.units;

  // AC10 — o preço é da UNIDADE, e metade custa exatamente metade, sem
  // ágio (ADR-0001 → Decisões de domínio). Em sorteio de cota inteira o
  // cálculo é o de sempre: uma unidade por título, preço cheio.
  const cents = titleCents(product.pricePerNumber);
  if (cents % halvesPerTitle !== 0) {
    // Metade de R$ 5,01 é R$ 2,505, que não existe em centavos. Em vez de
    // arredondar — e criar ágio ou desconto de um centavo num caminho de
    // dinheiro —, recusa-se. É a mesma regra de desenho que o ADR-0001
    // registrou para o prêmio: proibir o caso na entrada em vez de
    // carregar para sempre uma política de desempate. A recusa na CRIAÇÃO
    // do sorteio (preço que não divide exato não pode virar divisível) é
    // regra da LTM-07; aqui fica a rede de segurança.
    return {
      error:
        "Este sorteio está configurado com um preço que não se divide em metades exatas. Avise o suporte.",
    };
  }
  const unitCents = cents / halvesPerTitle;
  const amount = ((unitCents * targetUnits.length) / 100).toFixed(2);

  const [blockedPhone] = await db
    .select()
    .from(blockedNumbers)
    .where(
      and(eq(blockedNumbers.tenantId, tenant.id), eq(blockedNumbers.phone, data.phone)),
    )
    .limit(1);
  if (blockedPhone) {
    return { error: "Este número está bloqueado. Entre em contato com o suporte." };
  }

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.phone, data.phone)))
    .limit(1);

  // A identidade do comprador fica FORA da transação da reserva, de
  // propósito: ela não é parte do pedido, é quem o faz. Desfazê-la junto
  // apagaria o cadastro de quem perdeu uma disputa — e com ele a ficha do
  // anti-spam, que é por comprador.
  const userId = existingUser
    ? existingUser.id
    : (
        await db
          .insert(users)
          .values({ tenantId: tenant.id, phone: data.phone, role: "subscriber" })
          .returning()
      )[0].id;

  const spamCheck = await expireStaleReservationsAndCheckSpam(tenant.id, userId);
  if (spamCheck.blocked) {
    return {
      error: `Muitas reservas sem pagamento. Tente novamente após ${spamCheck.blockedUntil?.toLocaleTimeString("pt-BR")}.`,
    };
  }

  // ── A reserva, de uma vez ───────────────────────────────────────────
  // Pedido + unidades numa transação só (AC2). Se a disputa for perdida,
  // LANÇA — e o banco desfaz as duas escritas. Nenhum caminho daqui para
  // baixo devolve unidade a disponível nem marca pedido como cancelado para
  // desfazer a própria operação.
  try {
    return await db.transaction(async (tx) => {
      const [order] = await tx
        .insert(orders)
        .values({
          tenantId: tenant.id,
          userId,
          productId: product.id,
          // `quantity` conta o que o pedido CONTÉM, e o que ele contém são
          // unidades vendáveis (ADR-0001, custo aceito). Num sorteio
          // divisível, dois títulos inteiros são 4.
          quantity: targetUnits.length,
          amount,
          status: "pending",
        })
        .returning({ id: orders.id });

      // ⚠️ O `WHERE` ENDEREÇA A UNIDADE, NÃO O NÚMERO (AC9).
      //
      // Era `inArray(productNumbers.number, data.numbers)`. Com duas linhas
      // por número, aquele predicado casava AS DUAS: quem pedia uma metade
      // levava o título inteiro e pagava por metade — sem erro, sem log, só
      // um título desaparecendo do estoque a cada compra de meia cota.
      // Agora cada alvo é o par `(number, half)`.
      const pairMatch = or(
        ...targetUnits.map((unit) =>
          and(
            eq(productNumbers.number, unit.number),
            eq(productNumbers.half, unit.half),
          ),
        ),
      );

      // A ordem do travamento é o que garante o vencedor único — ver o bloco
      // de isolamento no topo do arquivo.
      const lockedUnits = tx
        .select({ id: productNumbers.id })
        .from(productNumbers)
        .where(
          and(
            eq(productNumbers.productId, product.id),
            pairMatch,
            eq(productNumbers.status, "available"),
          ),
        )
        .orderBy(productNumbers.number, productNumbers.half)
        .for("update");

      const taken = await tx
        .update(productNumbers)
        .set({
          status: "reserved",
          orderId: order.id,
          // A janela vem do SORTEIO, nunca de um número deste arquivo —
          // é a mesma função que a tela do pedido e o
          // `expiration_seconds` da cobrança PIX consultam (AC14).
          reservedUntil: new Date(
            Date.now() + reservationMinutesFor(product) * 60 * 1000,
          ),
        })
        .where(
          and(
            eq(productNumbers.productId, product.id),
            inArray(productNumbers.id, lockedUnits),
            eq(productNumbers.status, "available"),
          ),
        )
        // `half` no retorno não é enfeite: sem ele, duas metades do 42
        // voltam como `[42, 42]` e o retorno não diz qual foi tomada.
        .returning({ number: productNumbers.number, half: productNumbers.half });

      if (taken.length !== targetUnits.length) {
        throw new ReservationConflictError(targetUnits.length, taken.length);
      }

      return { orderId: order.id };
    });
  } catch (error) {
    // Disputa perdida é resposta de negócio. Qualquer outra falha é
    // infraestrutura e tem de continuar subindo alta: engolir aqui
    // devolveria "o número foi reservado por outra pessoa" para uma conexão
    // caída, e o comprador tentaria de novo contra um banco que não responde.
    if (error instanceof ReservationConflictError) return { error: CONFLITO };
    throw error;
  }
}
