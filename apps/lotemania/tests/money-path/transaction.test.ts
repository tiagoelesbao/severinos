// A transação existe de verdade, e o que ela desfaz (LTM-02: AC1, AC5, AC6).
//
// Este arquivo é a prova de que o driver mudou. Contra `neon-http` nenhum
// dos testes abaixo era possível de passar: HTTP não tem sessão, e sem
// sessão `db.transaction()` não tem onde acontecer.
//
// Nenhuma falha aqui é simulada por dublê — todas vêm do Postgres. Ver o
// cabeçalho de `tests/helpers/fault.ts` para o porquê.

import { and, eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@/db";
import { orders, productNumbers } from "@/db/schema";
import { simulatePayment } from "@/lib/actions/checkout";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { orderIdOf, titulos } from "../helpers/actions";
import {
  errorChain,
  holdUnitLock,
  settle,
  terminateBackendBlockedOn,
  withFailingWrite,
} from "../helpers/fault";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createBuyer,
  createRaffle,
  createTenant,
  expireReservation,
  readBankingTransactions,
  readBuyerByPhone,
  readOrder,
  readOrders,
  readUnits,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

describe("transação", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  });

  it("AC1: escreve em orders e em product_numbers, lança, e NENHUMA das duas persiste", async () => {
    const buyer = await createBuyer({ tenantId: tenant.id });

    await expect(
      db.transaction(async (tx) => {
        await tx.insert(orders).values({
          tenantId: tenant.id,
          userId: buyer.id,
          productId: raffle.id,
          quantity: 1,
          amount: "10.00",
          status: "pending",
        });
        await tx
          .update(productNumbers)
          .set({ status: "reserved", reservedUntil: new Date(Date.now() + 60_000) })
          .where(
            and(eq(productNumbers.productId, raffle.id), eq(productNumbers.number, 0)),
          );

        throw new Error("desfaz tudo");
      }),
    ).rejects.toThrow("desfaz tudo");

    expect(
      await readOrders(raffle.id),
      "o pedido escrito dentro da transação não podia ter sobrado",
    ).toHaveLength(0);
    expect(
      (await readUnits(raffle.id)).every((u) => u.status === "available"),
      "a unidade tomada dentro da transação não podia ter sobrado reservada",
    ).toBe(true);

    await assertProductInvariants(raffle.id, "AC1 — transação desfeita");
  });

  it("AC5: conexão morta entre o pedido e a tomada das unidades não deixa estado inválido", async () => {
    // A suíte trava as unidades 0 e 1 numa conexão própria. Com elas
    // travadas, a transação da reserva fica PARADA no `FOR UPDATE` — isto
    // é, depois de inserir o pedido e antes de tomar as unidades, que é
    // exatamente o ponto que o AC5 nomeia.
    const lock = await holdUnitLock(raffle.id, [0, 1]);

    const reserva = settle(
      reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(0, 1),
        phone: syntheticPhone(),
      }),
    );

    try {
      const pid = await terminateBackendBlockedOn("product_numbers");
      console.log(`[LTM-02] AC5: backend ${pid} derrubado no meio da reserva.`);
    } finally {
      await lock.release();
    }

    // A reserva tem de FALHAR ALTO. Conexão caída não é disputa perdida, e
    // devolver "o número acabou de ser reservado por outra pessoa" aqui
    // mandaria o comprador tentar de novo contra um banco que não responde.
    const resultado = await reserva;
    expect(resultado.ok, "conexão derrubada tinha de virar exceção, não recusa de negócio").toBe(
      false,
    );
    if (!resultado.ok) {
      console.log(`[LTM-02] AC5: a reserva falhou com "${errorChain(resultado.error)}".`);
    }

    expect(
      await readOrders(raffle.id),
      "zero linha nova em orders — nem mesmo em canceled",
    ).toHaveLength(0);
    expect((await readUnits(raffle.id)).every((u) => u.status === "available")).toBe(true);

    await assertProductInvariants(raffle.id, "AC5 — conexão derrubada no meio");
  });

  it("AC6: falha no meio da varredura de expiração não libera unidade nem mexe no anti-spam", async () => {
    const phone = syntheticPhone();
    const abandonado = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(0, 1),
        phone,
      }),
    );
    await expireReservation(abandonado);

    const antes = await readBuyerByPhone(tenant.id, phone);
    expect(antes.consecutive_unpaid_reservations).toBe(0);

    // A varredura escreve em três lugares, nesta ordem: libera as unidades,
    // expira os pedidos, atualiza o contador. A falha é plantada no SEGUNDO
    // — então a primeira escrita já aconteceu quando o banco recusa.
    await withFailingWrite(
      {
        table: "orders",
        when: "BEFORE UPDATE",
        onlyIf: "NEW.status = 'expired'",
        label: "falha injetada na expiracao do pedido (LTM-02 AC6)",
      },
      async () => {
        const resultado = await settle(
          reserveSelectedNumbers({
            tenantSlug: tenant.slug,
            productSlug: raffle.slug,
            units: titulos(5),
            phone,
          }),
        );
        expect(resultado.ok).toBe(false);
        if (!resultado.ok) {
          expect(errorChain(resultado.error)).toMatch(/falha injetada na expiracao/i);
        }
      },
    );

    // Nada da varredura persistiu: nem a liberação das unidades (que foi a
    // escrita que DEU certo antes da falha), nem o contador anti-spam —
    // que, solto, podia subir e bloquear o comprador sem que as unidades
    // dele tivessem voltado ao estoque.
    expect((await readOrder(abandonado)).status).toBe("pending");
    const units = await readUnits(raffle.id);
    for (const number of [0, 1]) {
      const unit = units.find((u) => u.number === number);
      expect(unit?.status, "a unidade liberada antes da falha tinha de voltar a reserved").toBe(
        "reserved",
      );
      expect(unit?.order_id).toBe(abandonado);
    }
    const depois = await readBuyerByPhone(tenant.id, phone);
    expect(depois.consecutive_unpaid_reservations).toBe(0);
    expect(depois.blocked_until).toBeNull();
  });

  it("AC6: falha no meio do pagamento não deixa pedido pago, unidade vendida nem crédito", async () => {
    const phone = syntheticPhone();
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        units: titulos(2, 3),
        phone,
      }),
    );

    // `simulatePayment` escreve em quatro lugares: pedido pago → unidades
    // vendidas → crédito no extrato → ficha do anti-spam zerada. A falha é
    // plantada no TERCEIRO, com as duas primeiras já feitas.
    await withFailingWrite(
      {
        table: "banking_transactions",
        when: "BEFORE INSERT",
        label: "falha injetada no lancamento do credito (LTM-02 AC6)",
      },
      async () => {
        const resultado = await settle(simulatePayment(orderId));
        expect(resultado.ok).toBe(false);
        if (!resultado.ok) {
          expect(errorChain(resultado.error)).toMatch(/falha injetada no lancamento/i);
        }
      },
    );

    expect((await readOrder(orderId)).status, "pedido não podia ficar pago").toBe("pending");
    expect((await readOrder(orderId)).paid_at).toBeNull();
    const units = await readUnits(raffle.id);
    for (const number of [2, 3]) {
      expect(units.find((u) => u.number === number)?.status).toBe("reserved");
    }
    expect(await readBankingTransactions(orderId)).toHaveLength(0);

    await assertProductInvariants(raffle.id, "AC6 — pagamento desfeito");

    // E o caminho feliz continua funcionando depois: a falha injetada não
    // deixou o pedido num estado do qual ele não sai.
    expect(await simulatePayment(orderId)).toEqual({ ok: true });
    expect((await readOrder(orderId)).status).toBe("paid");
  });
});
