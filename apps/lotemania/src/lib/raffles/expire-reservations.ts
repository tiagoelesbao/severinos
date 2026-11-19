// A LIBERAÇÃO DA RESERVA VENCIDA — global, de qualquer comprador (LTM-20).
//
// ════════════════════════════════════════════════════════════════════════
// O DEFEITO QUE ESTE ARQUIVO EXISTE PARA CONSERTAR
//
// A varredura vivia DENTRO de `actions/reserve.ts`, numa função só, e ela
// filtrava por `orders.user_id = <quem está reservando agora>`. Duas
// consequências, e as duas foram relatadas pelo founder usando o produto em
// 2026-11-19:
//
//   1. Ana reserva o 42 e some. O prazo vence. Bruno tenta o 42, a varredura
//      roda PARA O BRUNO, a reserva morta da Ana não é tocada, e o
//      `UPDATE ... WHERE status = 'available'` não acha a linha. Bruno leva
//      "reservado por outra pessoa" sobre uma reserva que já morreu, e o 42
//      fica travado até a Ana voltar — se ela nunca voltar, para sempre.
//
//   2. Um sorteio com isso NÃO ESGOTA. Medido na Sorteamos no mesmo dia:
//      uma reserva real abandonada no número 95 da `46º RAPIDINHA` voltou ao
//      estoque sozinha e a rodada fechou em `1 Livre · 0 Reservados · 99
//      Pagos`. No lotemania ela teria parado em 99 de 100, para sempre, por
//      causa de uma desistência de R$ 4,00.
//
// ── POR QUE AQUI, E NÃO EM `actions/reserve.ts`
//
// Mesmo motivo de `raffles/divisibility.ts` e de `payments/gateway-config.ts`:
// a regra fica num módulo PURO, verificável contra o Postgres de verdade, e a
// server action vira a casca que a chama. E há uma razão a mais, específica
// desta story: a liberação também roda na GRADE do sorteio
// (`app/loja/[tenant]/[productSlug]/page.tsx`), que é um componente de
// servidor. Exportá-la de um arquivo `"use server"` a transformaria num
// endpoint POST público e chamável por qualquer um — ela não é uma ação do
// comprador, é manutenção de estoque.
//
// ── O QUE FOI SEPARADO, E POR QUE A SEPARAÇÃO É O PONTO DA STORY
//
// A função antiga fazia DUAS coisas de escopos diferentes:
//
//   liberar unidades vencidas   → tem de ser GLOBAL (qualquer comprador)
//   contar abandono do comprador → tem de ser POR COMPRADOR
//
// Tirar o `user_id` do filtro inteiro faria o comprador ser bloqueado pelo
// abandono de ESTRANHOS — defeito pior que o original, e a uma linha de
// distância. Aqui a liberação é global e a ficha do anti-spam é debitada de
// QUEM ABANDONOU, um a um (`applyAbandonmentStrikes`), nunca de quem passou
// por ali. `tests/money-path/expiracao-entre-compradores.test.ts` é a
// regressão que prende isso.
//
// ⚠️ E a ficha é debitada PELA EXPIRAÇÃO, não pela próxima reserva do
// abandonador — essa mudança não é cosmética e não é opcional. Com a
// varredura global, quem expira o pedido da Ana é a visita do Bruno; se a
// contagem continuasse pendurada na próxima tentativa DA ANA, ela nunca
// encontraria nada para contar (o pedido já estaria `expired`) e o anti-spam
// morreria em silêncio — todo mundo com ficha limpa para sempre. A
// transição `pending → expired` é o evento de abandono, e é onde a ficha
// pertence.
//
// ── A ORDEM DAS ESCRITAS NÃO É ESTILO (e não pode ser invertida)
//
// `product_numbers` PRIMEIRO, `orders` DEPOIS. É a ordem que a varredura
// sempre teve, e `payments/settle-order.ts:123-141` TRAVA NA MESMA ORDEM de
// propósito, com a razão escrita lá: inverter aqui criaria emparelhamento
// cruzado com o fechamento do pagamento, o Postgres abortaria uma das duas, o
// webhook responderia 500 e o provedor reentregaria contra o mesmo impasse.
//
// É também o que torna o AC4 (pedido pago nunca é tocado) um MECANISMO e não
// uma esperança. Os dois `UPDATE` carregam guarda de estado —
// `status = 'reserved'` nas unidades, `status = 'pending'` no pedido —, e o
// travamento das unidades vem antes:
//
//   • se o pagamento chega primeiro, ele trava as unidades, marca `sold` e
//     `paid`; a varredura destrava depois, reavalia as guardas, não casa
//     nenhuma linha e não escreve nada;
//   • se a varredura chega primeiro, o fechamento espera nas unidades e,
//     quando entra, relê o pedido já `expired` e recusa com `order_expired`
//     (`settle-order.ts:170`) — caminho que já existia e já tem teste.
//
// A guarda `status = 'reserved'` no `UPDATE` das unidades é NOVA. O código
// anterior escrevia `WHERE order_id IN (...)` sem olhar o estado da linha, e
// nessa janela uma unidade recém-vendida voltava a `available` com o pedido
// pago. Era corrida estreita enquanto a varredura rodava uma vez por reserva
// do próprio comprador; com a varredura global na grade ela deixaria de ser.
// ════════════════════════════════════════════════════════════════════════

import { and, eq, inArray, sql } from "drizzle-orm";

import { db } from "@/db";
import { orders, productNumbers, users } from "@/db/schema";

/** Três reservas não pagas contadas levam a bloqueio temporário. */
const ANTI_SPAM_THRESHOLD = 3;
const ANTI_SPAM_BLOCK_MINUTES = 30;

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * O recorte da varredura.
 *
 * `tenantId` é obrigatório — varredura sem operador varreria a base inteira.
 * `productId` estreita para UM sorteio, que é o que a grade precisa: ela é o
 * caminho de leitura mais quente da loja e não tem por que olhar o estoque
 * dos outros sorteios do operador.
 *
 * ⚠️ A reserva passa o recorte LARGO (só `tenantId`), de propósito. A ficha
 * do anti-spam sempre contou o abandono do comprador no operador inteiro, e
 * estreitar para o sorteio perderia o abandono em sorteio vizinho.
 */
export interface ReleaseScope {
  tenantId: string;
  productId?: string;
}

/** Um pedido que a varredura acabou de expirar, e de quem ele era. */
export interface ExpiredReservation {
  orderId: string;
  userId: string;
}

/** O veredito do anti-spam sobre UM comprador. */
export interface BuyerBlock {
  blocked: boolean;
  blockedUntil?: Date;
}

/**
 * O predicado do pedido ABANDONADO: pendente, com pelo menos uma unidade
 * reservada de prazo vencido, dentro do recorte.
 *
 * Fonte única das duas leituras abaixo — a sonda fora da transação e a
 * releitura dentro dela. Duas cópias deste `and` seriam duas definições de
 * "abandonado", e a segunda a divergir seria a que ninguém leu.
 */
function abandonedOrderFilter(scope: ReleaseScope) {
  return and(
    eq(orders.tenantId, scope.tenantId),
    scope.productId ? eq(orders.productId, scope.productId) : undefined,
    eq(orders.status, "pending"),
    // `status = 'reserved'` não é filtro redundante: é o predicado do
    // índice parcial da LTM-01
    // (`product_numbers_status_reserved_until_idx ... WHERE status =
    // 'reserved'`). Sem ele o Postgres não alcança o índice e a varredura
    // fica fora do plano para o qual o índice foi feito.
    eq(productNumbers.status, "reserved"),
    // ⚠️ `now()` é do POSTGRES, não do JS. Quem for escrever teste daqui:
    // adiantar o relógio do Node não move este predicado um segundo — o
    // prazo tem de ser SEMEADO no passado (`tests/helpers/seed.ts` →
    // `expireReservation`).
    sql`${productNumbers.reservedUntil} < now()`,
  );
}

/**
 * Os pedidos candidatos, lidos DENTRO da transação da varredura.
 *
 * Leitura pura — nenhuma trava aqui. As travas vêm nos dois `UPDATE`, com
 * guarda de estado por cima, que é o que torna a varredura segura contra o
 * pagamento que chega no mesmo instante.
 */
async function findAbandonedOrderIdsWithin(
  tx: DbTransaction,
  scope: ReleaseScope,
): Promise<string[]> {
  const rows = await tx
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(productNumbers, eq(productNumbers.orderId, orders.id))
    .where(abandonedOrderFilter(scope))
    .groupBy(orders.id);

  return rows.map((row) => row.id);
}

/**
 * A sonda barata, FORA de qualquer transação.
 *
 * É ela que mantém o caminho de leitura honesto quando não há nada a liberar
 * — o caso comum: sem linha aqui, nenhuma transação é aberta e nenhuma
 * escrita acontece.
 */
async function probeAbandonedOrderIds(scope: ReleaseScope): Promise<string[]> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(productNumbers, eq(productNumbers.orderId, orders.id))
    .where(abandonedOrderFilter(scope))
    .groupBy(orders.id);

  return rows.map((row) => row.id);
}

/**
 * Debita a ficha do anti-spam de UM comprador — o que abandonou, nunca o que
 * está passando por ali.
 *
 * Trava a linha do comprador: duas varreduras simultâneas sobre pedidos
 * diferentes do mesmo abandonador não podem ler o mesmo contador e escrever
 * por cima uma da outra.
 *
 * Comprador com bloqueio DE PÉ não acumula ficha — é o comportamento que a
 * função antiga tinha (ela voltava antes de contar) e ele continua: quem já
 * está cumprindo a pena não a aumenta sem ter voltado a tentar.
 */
async function applyAbandonmentStrikes(
  tx: DbTransaction,
  userId: string,
  abandoned: number,
): Promise<void> {
  if (abandoned <= 0) return;

  const [buyer] = await tx
    .select({
      id: users.id,
      consecutiveUnpaidReservations: users.consecutiveUnpaidReservations,
      blockedUntil: users.blockedUntil,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
    .for("update");

  if (!buyer) return;
  if (buyer.blockedUntil && buyer.blockedUntil > new Date()) return;

  const newCount = buyer.consecutiveUnpaidReservations + abandoned;
  if (newCount >= ANTI_SPAM_THRESHOLD) {
    await tx
      .update(users)
      // O contador zera no bloqueio: quem cumpre a pena volta com a ficha
      // limpa. Comportamento de hoje, preservado.
      .set({
        consecutiveUnpaidReservations: 0,
        blockedUntil: new Date(Date.now() + ANTI_SPAM_BLOCK_MINUTES * 60 * 1000),
      })
      .where(eq(users.id, userId));
    return;
  }

  await tx
    .update(users)
    .set({ consecutiveUnpaidReservations: newCount })
    .where(eq(users.id, userId));
}

/**
 * A varredura, dentro de uma transação que o chamador abriu.
 *
 * Existe separada de `releaseExpiredReservations` para a reserva poder
 * emendar a varredura e a leitura do bloqueio do comprador numa transação
 * só. Ler a ordem das escritas no bloco do topo antes de mexer.
 */
export async function releaseExpiredReservationsWithin(
  tx: DbTransaction,
  scope: ReleaseScope,
): Promise<ExpiredReservation[]> {
  const candidateIds = await findAbandonedOrderIdsWithin(tx, scope);
  if (candidateIds.length === 0) return [];

  // ── 1. As unidades. Travadas em ordem determinística e com guarda de
  // estado — ver o bloco do topo para as duas razões.
  //
  // A ordem `(product_id, number, half)` casa com a de `settle-order.ts:140`
  // DENTRO do conjunto de unidades de um mesmo pedido, que é o único
  // conjunto que as duas disputam. Entre duas varreduras, a ordem é a mesma
  // dos dois lados por ser a mesma consulta.
  const lockedUnits = tx
    .select({ id: productNumbers.id })
    .from(productNumbers)
    .where(
      and(
        inArray(productNumbers.orderId, candidateIds),
        eq(productNumbers.status, "reserved"),
      ),
    )
    .orderBy(productNumbers.productId, productNumbers.number, productNumbers.half)
    .for("update");

  await tx
    .update(productNumbers)
    .set({ status: "available", orderId: null, reservedUntil: null })
    .where(
      and(
        inArray(productNumbers.id, lockedUnits),
        eq(productNumbers.status, "reserved"),
      ),
    );

  // ── 2. O pedido, com a guarda `pending` por cima da trava ordenada.
  //
  // Este `UPDATE` é o ponto de serialização do abandono: ele transiciona
  // `pending → expired` UMA vez e só uma, e é por isso que a ficha do
  // anti-spam sai do que ELE devolve, nunca da lista de candidatos. Duas
  // varreduras simultâneas sobre o mesmo pedido: uma leva a linha, a outra
  // reavalia a guarda, não casa nada e devolve vazio — sem ficha dobrada,
  // sem erro (AC5).
  const lockedOrders = tx
    .select({ id: orders.id })
    .from(orders)
    .where(and(inArray(orders.id, candidateIds), eq(orders.status, "pending")))
    .orderBy(orders.id)
    .for("update");

  const expired = await tx
    .update(orders)
    .set({ status: "expired" })
    .where(and(inArray(orders.id, lockedOrders), eq(orders.status, "pending")))
    .returning({ orderId: orders.id, userId: orders.userId });

  if (expired.length === 0) return [];

  // ── 3. A ficha, do dono de cada pedido abandonado.
  const abandonedByBuyer = new Map<string, number>();
  for (const row of expired) {
    abandonedByBuyer.set(row.userId, (abandonedByBuyer.get(row.userId) ?? 0) + 1);
  }
  // Ordenado por comprador: duas varreduras que pegaram abandonos de dois
  // compradores em comum travariam as mesmas duas linhas de `users`, e em
  // ordens diferentes isso é impasse.
  for (const userId of [...abandonedByBuyer.keys()].sort()) {
    await applyAbandonmentStrikes(tx, userId, abandonedByBuyer.get(userId) ?? 0);
  }

  return expired;
}

/**
 * Libera TODA reserva vencida do recorte — de qualquer comprador.
 *
 * É o ponto de entrada dos dois caminhos que a LTM-20 escolheu (A + B): a
 * reserva, que conserta a disputa real pelo número, e a grade do sorteio,
 * que conserta o que o comprador VÊ. Não há agendador neste app, e isto não
 * é um substituto para um — é o que funciona sem infraestrutura que não
 * existe. Quando houver agendador, ele substitui a chamada da grade.
 *
 * Sem nada a liberar, nenhuma transação é aberta e nenhuma linha é escrita:
 * a sonda é uma leitura amparada pelo índice parcial. É o que torna a
 * chamada no caminho de leitura pagável.
 */
export async function releaseExpiredReservations(
  scope: ReleaseScope,
): Promise<ExpiredReservation[]> {
  const candidateIds = await probeAbandonedOrderIds(scope);
  if (candidateIds.length === 0) return [];

  return db.transaction((tx) => releaseExpiredReservationsWithin(tx, scope));
}

/**
 * A varredura global E o veredito do anti-spam sobre UM comprador, na ordem
 * que a reserva precisa.
 *
 * Primeiro libera o que venceu (de todo mundo), depois lê a ficha de QUEM
 * ESTÁ RESERVANDO. A ordem importa: a ficha do próprio comprador pode ter
 * acabado de ser debitada pela varredura que ele mesmo disparou, e é esse
 * débito que o bloqueia na quarta tentativa — comportamento de hoje,
 * preservado.
 *
 * ⚠️ O que este veredito NÃO carrega: abandono alheio. A varredura debita a
 * ficha de cada abandonador separadamente; aqui só se LÊ a do comprador da
 * vez. É o AC3 da story, e a razão de a função antiga ter sido partida em
 * duas.
 */
export async function releaseExpiredAndCheckBuyerBlock(
  scope: ReleaseScope,
  userId: string,
): Promise<BuyerBlock> {
  return db.transaction(async (tx) => {
    await releaseExpiredReservationsWithin(tx, scope);

    const [buyer] = await tx
      .select({ blockedUntil: users.blockedUntil })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!buyer) return { blocked: false };
    if (buyer.blockedUntil && buyer.blockedUntil > new Date()) {
      return { blocked: true, blockedUntil: buyer.blockedUntil };
    }
    return { blocked: false };
  });
}
