// A RESERVA ABANDONADA VOLTA AO ESTOQUE PARA QUALQUER UM (LTM-20).
//
// ════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO EXISTE, E POR QUE A SUÍTE ANTIGA NÃO PEGOU NADA
//
// `expiration.test.ts` tem teste de expiração, e ele PASSA — porque
// exercita a expiração do PRÓPRIO comprador, que é o caminho que sempre
// funcionou. O defeito mora entre DUAS pessoas:
//
//   Ana reserva o 4 e some. O prazo vence. Bruno tenta o 4, a varredura
//   antiga rodava filtrando por `orders.user_id = Bruno`, a reserva morta da
//   Ana não era tocada, e Bruno levava "reservado por outra pessoa" sobre
//   uma reserva que já tinha morrido.
//
// É um buraco que só aparece com dois atores, e não é falta de teste por
// descuido: é um caso que não ocorre a quem escreve teste pensando num ator
// só. Todo teste daqui tem DOIS compradores de propósito.
//
// ── O RELÓGIO
//
// O predicado é `reserved_until < now()` em SQL, e `now()` é do POSTGRES.
// Adiantar o relógio do Node não o move um segundo. Todo prazo vencido aqui
// é SEMEADO no passado (`expireReservation` / `setReservedUntil`), nunca
// esperado nem falsificado.
//
// ── ONDE ESTE ARQUIVO MORA
//
// A nota de ondas da story sugeria `tests/reserva/expiracao-entre-compradores/`.
// Fica em `tests/money-path/` com os outros: é a pasta que a suíte inteira
// usa, o `vitest.config.ts` varre `tests/**` de qualquer jeito, e uma
// segunda árvore de testes de reserva só criaria dois lugares para procurar.
// ════════════════════════════════════════════════════════════════════════

import { isValidElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import RaffleDetailPage from "@/app/loja/[tenant]/[productSlug]/page";
import { NumberGrid } from "@/app/loja/[tenant]/[productSlug]/number-grid";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";
import { releaseExpiredReservations } from "@/lib/raffles/expire-reservations";

import { errorOf, isReserveOk, orderIdOf, titulos } from "../helpers/actions";
import { fanOut } from "../helpers/concurrency";
import { query } from "../helpers/db";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createBuyer,
  createRaffle,
  createTenant,
  expireReservation,
  readBuyerByPhone,
  readOrder,
  readUnits,
  setOrderStatus,
  setReservedUntil,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

/** O número disputado pelos dois compradores — o "42" do relato. */
const DISPUTADO = 4;

describe("expiração entre compradores diferentes", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  });

  // ── AC1 — o defeito, no caso em que ele existe ────────────────────────

  it("AC1: Ana abandona o número, o prazo vence, e BRUNO consegue reservá-lo", async () => {
    const ana = syntheticPhone();
    const bruno = syntheticPhone();

    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );

    // Ana some. O prazo vence no dado — não no relógio.
    await expireReservation(abandonado);

    const tentativaDoBruno = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(DISPUTADO),
      phone: bruno,
    });

    expect(
      isReserveOk(tentativaDoBruno),
      "é ESTE o defeito da LTM-20: antes, Bruno levava CONFLITO sobre uma " +
        "reserva morta, e o número ficava travado até a Ana voltar",
    ).toBe(true);
    const pedidoDoBruno = orderIdOf(tentativaDoBruno);

    const unidade = (await readUnits(raffle.id)).find((u) => u.number === DISPUTADO);
    expect(unidade?.status).toBe("reserved");
    expect(unidade?.order_id, "a unidade é do Bruno agora").toBe(pedidoDoBruno);

    expect((await readOrder(abandonado)).status).toBe("expired");

    await assertProductInvariants(raffle.id, "AC1 — reserva abandonada tomada por outro");
  });

  it("AC1: o sorteio ESGOTA mesmo com um número abandonado no meio", async () => {
    // O custo exato do defeito, na forma em que ele foi medido na Sorteamos:
    // uma desistência de R$ 4,00 travava a rodada inteira em 99 de 100.
    // Aqui são 10 unidades: Ana abandona uma, Bruno leva as dez.
    const ana = syntheticPhone();
    const bruno = syntheticPhone();

    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );
    await expireReservation(abandonado);

    const esgotamento = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(...raffle.numbers),
      phone: bruno,
    });

    expect(
      isReserveOk(esgotamento),
      "sem a varredura global o sorteio pararia em 9 de 10, para sempre",
    ).toBe(true);

    const units = await readUnits(raffle.id);
    expect(units.filter((u) => u.status === "available")).toHaveLength(0);
    expect(units.filter((u) => u.status === "reserved")).toHaveLength(10);

    await assertProductInvariants(raffle.id, "AC1 — sorteio esgotado após abandono");
  });

  // ── AC2 — a grade não mente ───────────────────────────────────────────

  it("AC2: a grade do sorteio mostra o número como LIVRE sem que ninguém tenha tentado reservar", async () => {
    const ana = syntheticPhone();

    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );
    await expireReservation(abandonado);

    // Confere o estado ANTES: a unidade está amarela e o prazo já morreu. É
    // exatamente o que o comprador via e do que ele reclamou.
    const antes = (await readUnits(raffle.id)).find((u) => u.number === DISPUTADO);
    expect(antes?.status).toBe("reserved");

    // Nenhuma reserva aqui: só a PÁGINA sendo montada. O componente de
    // servidor é chamado como função — é o que o Next faz —, e o que se
    // inspeciona é a grade que ele entrega, não um `SELECT` escrito à mão.
    const arvore = await RaffleDetailPage({
      params: Promise.resolve({ tenant: tenant.slug, productSlug: raffle.slug }),
    });

    const grade = findElementByType<GradeProps>(arvore, NumberGrid);
    expect(grade, "a página tem de entregar uma NumberGrid").not.toBeNull();

    const naGrade = (grade?.props.numbers ?? []).find((n) => n.number === DISPUTADO);
    expect(
      naGrade?.status,
      "é o que o COMPRADOR vê — a grade não pode pintar de amarelo um número livre",
    ).toBe("available");

    const depois = (await readUnits(raffle.id)).find((u) => u.number === DISPUTADO);
    expect(depois?.status).toBe("available");
    expect(depois?.order_id).toBeNull();
    expect(depois?.reserved_until).toBeNull();
    expect((await readOrder(abandonado)).status).toBe("expired");

    await assertProductInvariants(raffle.id, "AC2 — grade montada depois do prazo vencido");
  });

  it("AC2: montar a grade sem nada vencido não mexe em reserva viva", async () => {
    const ana = syntheticPhone();

    const viva = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );

    await RaffleDetailPage({
      params: Promise.resolve({ tenant: tenant.slug, productSlug: raffle.slug }),
    });

    const unidade = (await readUnits(raffle.id)).find((u) => u.number === DISPUTADO);
    expect(unidade?.status, "reserva no prazo é intocável").toBe("reserved");
    expect(unidade?.order_id).toBe(viva);
    expect((await readOrder(viva)).status).toBe("pending");
  });

  // ── AC3 — a regressão que impede o conserto de criar defeito pior ─────

  it("AC3: o abandono da Ana NÃO bloqueia o Bruno — e a ficha vai para a Ana", async () => {
    const ana = syntheticPhone();
    const bruno = syntheticPhone();

    // Três reservas vivas da Ana, abandonadas de uma vez. Expirar uma a uma
    // entre as reservas faria a varredura dela mesma contá-las, que é o
    // caminho de um ator só — o que esta story NÃO está testando.
    const abandonadas: string[] = [];
    for (const numero of [0, 1, 2]) {
      abandonadas.push(
        orderIdOf(
          await reserveSelectedNumbers({
            tenantSlug: tenant.slug,
            productSlug: raffle.slug,
            units: titulos(numero),
            phone: ana,
          }),
        ),
      );
    }
    for (const orderId of abandonadas) await expireReservation(orderId);

    const tentativaDoBruno = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(DISPUTADO),
      phone: bruno,
    });

    expect(
      isReserveOk(tentativaDoBruno),
      "ser bloqueado pelo abandono de estranhos é o defeito PIOR que o " +
        "original, e está a uma linha de distância: bastaria tirar o " +
        "`user_id` do filtro inteiro",
    ).toBe(true);

    const fichaDoBruno = await readBuyerByPhone(tenant.id, bruno);
    expect(fichaDoBruno.consecutive_unpaid_reservations).toBe(0);
    expect(fichaDoBruno.blocked_until).toBeNull();

    // E o outro lado da mesma moeda: o anti-spam não pode MORRER por causa
    // da varredura global. Quem abandonou foi a Ana, e é a ficha dela que
    // tem de ter sido debitada — pelas três, de uma vez, o que a bloqueia.
    const fichaDaAna = await readBuyerByPhone(tenant.id, ana);
    expect(
      fichaDaAna.blocked_until,
      "se a ficha ficasse pendurada na próxima tentativa DA ANA, ela nunca " +
        "acharia nada para contar (o pedido já estaria `expired`) e o " +
        "anti-spam morreria em silêncio",
    ).not.toBeNull();

    await assertProductInvariants(raffle.id, "AC3 — anti-spam continua por comprador");
  });

  it("AC3: a varredura da GRADE também debita a ficha de quem abandonou, e só dele", async () => {
    const ana = syntheticPhone();
    const bruno = syntheticPhone();

    const daAna = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(0),
        phone: ana,
      }),
    );
    const doBruno = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(1),
        phone: bruno,
      }),
    );
    await expireReservation(daAna);

    await RaffleDetailPage({
      params: Promise.resolve({ tenant: tenant.slug, productSlug: raffle.slug }),
    });

    expect((await readBuyerByPhone(tenant.id, ana)).consecutive_unpaid_reservations).toBe(1);
    expect(
      (await readBuyerByPhone(tenant.id, bruno)).consecutive_unpaid_reservations,
      "a reserva do Bruno está VIVA — ele não abandonou nada",
    ).toBe(0);
    expect((await readOrder(doBruno)).status).toBe("pending");
  });

  // ── AC4 — pedido pago nunca é tocado ──────────────────────────────────

  it("AC4: unidade de pedido PAGO não é liberada, mesmo com o prazo no passado", async () => {
    const ana = syntheticPhone();
    const bruno = syntheticPhone();

    const pago = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );

    // O estado mais hostil que existe para a varredura: o pagamento já
    // fechou o PEDIDO e a unidade ainda está `reserved` com o prazo
    // vencido — a janela entre o aviso do gateway e a troca do estoque.
    // Quem tem de barrar isto é o filtro `orders.status = 'pending'`.
    await setOrderStatus(pago, "paid");
    await expireReservation(pago);

    await releaseExpiredReservations({ tenantId: tenant.id, productId: raffle.id });

    // E pelo outro caminho também — o AC fala nos DOIS.
    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(7),
      phone: bruno,
    });
    await RaffleDetailPage({
      params: Promise.resolve({ tenant: tenant.slug, productSlug: raffle.slug }),
    });

    const unidade = (await readUnits(raffle.id)).find((u) => u.number === DISPUTADO);
    expect(unidade?.status, "unidade de pedido pago não volta ao estoque").toBe("reserved");
    expect(unidade?.order_id).toBe(pago);
    expect((await readOrder(pago)).status).toBe("paid");

    // ⚠️ Sem `assertProductInvariants` aqui, e de propósito: o estado
    // montado VIOLA a I4 ("reserva vencida não liberada") por construção.
    // É o ponto do teste — a unidade tem de continuar fora do estoque
    // justamente porque o pedido dela está pago.
  });

  it("AC4: quem já está VENDIDO não é tocado por nenhum dos caminhos", async () => {
    const ana = syntheticPhone();

    const pago = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );
    await setOrderStatus(pago, "paid");
    // A forma normal depois do fechamento: unidade `sold`, prazo residual no
    // passado. A guarda `status = 'reserved'` do `UPDATE` é o que a protege.
    await expireReservation(pago);
    await setUnitsSold(pago);

    await releaseExpiredReservations({ tenantId: tenant.id });
    await RaffleDetailPage({
      params: Promise.resolve({ tenant: tenant.slug, productSlug: raffle.slug }),
    });

    const unidade = (await readUnits(raffle.id)).find((u) => u.number === DISPUTADO);
    expect(unidade?.status).toBe("sold");
    expect(unidade?.order_id).toBe(pago);

    await assertProductInvariants(raffle.id, "AC4 — unidade vendida intocada");
  });

  // ── AC5 — sob concorrência, não libera duas vezes ─────────────────────

  it("AC5: duas varreduras simultâneas sobre o mesmo pedido vencido não erram nem contam em dobro", async () => {
    const ana = syntheticPhone();

    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );
    await expireReservation(abandonado);

    const resultado = await fanOut(4, () =>
      releaseExpiredReservations({ tenantId: tenant.id, productId: raffle.id }),
    );

    expect(resultado.rejected, "nenhuma varredura pode estourar").toHaveLength(0);

    // O `UPDATE ... WHERE status = 'pending'` é o ponto de serialização: o
    // pedido transiciona UMA vez, e só a varredura que levou a linha o
    // reporta. As outras voltam vazias.
    const liberados = resultado.fulfilled.flatMap((o) => o.value ?? []);
    expect(
      liberados.filter((r) => r.orderId === abandonado),
      "o mesmo pedido não pode ser expirado por duas varreduras",
    ).toHaveLength(1);

    const unidade = (await readUnits(raffle.id)).find((u) => u.number === DISPUTADO);
    expect(unidade?.status).toBe("available");
    expect(unidade?.order_id).toBeNull();
    expect((await readOrder(abandonado)).status).toBe("expired");
    expect(
      (await readBuyerByPhone(tenant.id, ana)).consecutive_unpaid_reservations,
      "ficha dobrada bloquearia o comprador por um abandono só",
    ).toBe(1);

    await assertProductInvariants(raffle.id, "AC5 — quatro varreduras simultâneas");
  });

  it("AC5: varredura e reserva do MESMO número ao mesmo tempo terminam em estado consistente", async () => {
    const ana = syntheticPhone();
    const bruno = syntheticPhone();

    // ⚠️ A IDENTIDADE DO BRUNO É PRÉ-CRIADA, E ISSO NÃO É CONVENIÊNCIA.
    //
    // Sem ela, este teste não mede a varredura: mede um defeito ALHEIO, e
    // ele foi medido aqui em 2026-11-19. `reserveSelectedNumbers` cria o
    // comprador com um `INSERT` cru (`actions/reserve.ts:251-258`), fora de
    // transação e sem `onConflict`, contra o índice ÚNICO
    // `users_tenant_phone_idx` em `(tenant_id, phone)`. Três primeiras
    // reservas simultâneas do MESMO telefone novo: uma insere, as outras
    // estouram com `Failed query: insert into "users"`, e a server action
    // RELANÇA (é infraestrutura, não disputa) — 500 na cara de quem tocou
    // duas vezes em "Reservar" na primeira compra da vida.
    //
    // Medido nos dois estados: sem a identidade pré-criada, 5 rodadas de 6
    // operações deram 6 rejeições; COM ela, 5 rodadas deram ZERO. Ou seja: a
    // varredura em corrida com a reserva não produz impasse nem erro — o que
    // é exatamente o que o AC5 pede —, e o defeito da identidade é
    // pré-existente a esta story. Está no relato do Dev Agent Record.
    //
    // `reserve-concurrency.test.ts:66` nunca o viu porque usa um telefone
    // DISTINTO por disputante.
    await createBuyer({ tenantId: tenant.id, phone: bruno });

    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(DISPUTADO),
        phone: ana,
      }),
    );
    await expireReservation(abandonado);

    // `unknown` explícito: as duas metades do disparo devolvem coisas
    // diferentes, e o que está sob teste aqui é o ESTADO final do sorteio,
    // não o retorno de nenhuma das duas.
    const resultado = await fanOut<unknown>(6, (index) =>
      index % 2 === 0
        ? releaseExpiredReservations({ tenantId: tenant.id, productId: raffle.id })
        : reserveSelectedNumbers({
            tenantSlug: tenant.slug,
            productSlug: raffle.slug,
            units: titulos(DISPUTADO),
            phone: bruno,
          }),
    );

    expect(
      resultado.rejected.map((o) => (o.error as Error)?.message),
      "varredura e reserva na mesma corrida não podem produzir ERRO — " +
        "impasse entre as duas seria defeito desta story",
    ).toHaveLength(0);

    // A reserva morta da Ana sai do caminho de um jeito ou de outro: alguma
    // das varreduras — ou a que roda dentro da própria reserva — a expira.
    // Não há caminho em que ela sobreviva à corrida.
    expect((await readOrder(abandonado)).status).toBe("expired");

    await assertProductInvariants(raffle.id, "AC5 — varredura e reserva em corrida");
  });

  // ── AC6 — a janela é a do sorteio ─────────────────────────────────────

  it("AC6: cada sorteio expira pelo SEU prazo, não por um relógio comum", async () => {
    // A `LTM-17` ainda não existe, então a janela é única hoje. O que já é
    // verdade — e é o que esta asserção prende para quando ela existir — é
    // que a varredura decide pelo `reserved_until` DA UNIDADE, que é onde a
    // janela do sorteio se materializa no momento da reserva. Dois sorteios,
    // dois prazos: só o vencido é liberado, e a varredura do operador
    // inteiro não arrasta o vizinho junto.
    const curto = await createRaffle({ tenantId: tenant.id, totalNumbers: 5 });
    const longo = await createRaffle({ tenantId: tenant.id, totalNumbers: 5 });
    const ana = syntheticPhone();

    const noCurto = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: curto.slug,
        units: titulos(1),
        phone: ana,
      }),
    );
    const noLongo = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: longo.slug,
        units: titulos(1),
        phone: ana,
      }),
    );

    // Janela de 10 minutos já vencida contra janela de 120 minutos — dois
    // dos cinco valores que a tela do operador já oferece e que a `LTM-17`
    // vai passar a respeitar.
    await setReservedUntil(noCurto, new Date(Date.now() - 60_000));
    await setReservedUntil(noLongo, new Date(Date.now() + 120 * 60_000));

    await releaseExpiredReservations({ tenantId: tenant.id });

    expect((await readOrder(noCurto)).status).toBe("expired");
    expect(
      (await readUnits(curto.id)).find((u) => u.number === 1)?.status,
    ).toBe("available");

    expect((await readOrder(noLongo)).status, "o prazo dele não venceu").toBe("pending");
    expect((await readUnits(longo.id)).find((u) => u.number === 1)?.status).toBe("reserved");

    await assertProductInvariants(curto.id, "AC6 — sorteio de janela curta");
    await assertProductInvariants(longo.id, "AC6 — sorteio de janela longa");
  });

  it("AC6: a varredura não atravessa a fronteira do operador", async () => {
    const outroOperador = await createTenant();
    const sorteioVizinho = await createRaffle({
      tenantId: outroOperador.id,
      totalNumbers: 5,
    });
    const ana = syntheticPhone();

    const vizinho = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: outroOperador.slug,
        productSlug: sorteioVizinho.slug,
        units: titulos(1),
        phone: ana,
      }),
    );
    await expireReservation(vizinho);

    await releaseExpiredReservations({ tenantId: tenant.id });

    expect(
      (await readOrder(vizinho)).status,
      "varredura de um operador não escreve no estoque de outro",
    ).toBe("pending");
  });

  // ── O caso que a suíte antiga NÃO cobria, dito de outro jeito ─────────

  it("a recusa por conflito continua existindo quando a reserva do outro está VIVA", async () => {
    const ana = syntheticPhone();
    const bruno = syntheticPhone();

    await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(DISPUTADO),
      phone: ana,
    });

    const tentativa = await reserveSelectedNumbers({
      tenantSlug: tenant.slug,
      productSlug: raffle.slug,
      units: titulos(DISPUTADO),
      phone: bruno,
    });

    expect(
      errorOf(tentativa),
      "a varredura global não pode virar uma licença para roubar reserva viva",
    ).toMatch(/reservado por outra pessoa/i);
  });
});

// ── Ferramental deste arquivo ───────────────────────────────────────────

/** O que a página entrega à grade — só a parte que o AC2 inspeciona. */
interface GradeProps extends Record<string, unknown> {
  numbers: { number: number; status: string }[];
}

/**
 * Acha o primeiro elemento de um tipo dado na árvore que o componente de
 * servidor devolveu.
 *
 * Comparação por REFERÊNCIA do componente, nunca por nome em string: nome
 * em string continuaria verde depois de a grade ser renomeada ou removida,
 * e aí o teste estaria afirmando sobre nada.
 */
function findElementByType<P extends Record<string, unknown>>(
  node: ReactNode,
  type: (props: never) => ReactNode,
): { props: P } | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findElementByType<P>(child, type);
      if (found) return found;
    }
    return null;
  }

  if (!isValidElement(node)) return null;
  if (node.type === type) return node as unknown as { props: P };

  const props = node.props as { children?: ReactNode };
  return findElementByType<P>(props?.children ?? null, type);
}

/** O estado de depois do fechamento: as unidades do pedido viram `sold`. */
async function setUnitsSold(orderId: string): Promise<void> {
  await query(`UPDATE product_numbers SET status = 'sold' WHERE order_id = $1`, [orderId]);
}
