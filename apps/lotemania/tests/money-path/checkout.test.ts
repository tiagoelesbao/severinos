// Pagamento simulado (LTM-05, AC6 e AC7) — verde contra o código atual.
//
// `simulatePayment` é o único caminho que hoje leva um pedido a `paid`: o
// webhook de verdade para num TODO. É por aqui que uma unidade vendável
// chega ao estado `sold`, então é caminho do dinheiro mesmo sendo rotulado
// como ambiente de teste no app.

import { beforeEach, describe, expect, it } from "vitest";

import { simulatePayment } from "@/lib/actions/checkout";
import { reserveSelectedNumbers } from "@/lib/actions/reserve";

import { orderIdOf } from "../helpers/actions";
import { assertProductInvariants } from "../helpers/invariants";
import {
  createRaffle,
  createTenant,
  readBankingTransactions,
  readBuyerByPhone,
  readOrder,
  readUnits,
  syntheticPhone,
  type SeededRaffle,
  type SeededTenant,
} from "../helpers/seed";

describe("simulatePayment", () => {
  let tenant: SeededTenant;
  let raffle: SeededRaffle;

  beforeEach(async () => {
    tenant = await createTenant();
    raffle = await createRaffle({ tenantId: tenant.id, totalNumbers: 10 });
  });

  it("caminho feliz: paga o pedido, vende as unidades e lança o crédito", async () => {
    const phone = syntheticPhone();
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        numbers: [0, 1],
        phone,
      }),
    );

    const result = await simulatePayment(orderId);
    expect(result).toEqual({ ok: true });

    const order = await readOrder(orderId);
    expect(order.status).toBe("paid");
    expect(order.paid_at).not.toBeNull();

    const units = await readUnits(raffle.id);
    const vendidas = units.filter((u) => u.status === "sold");
    expect(vendidas.map((u) => u.number)).toEqual([0, 1]);
    expect(vendidas.every((u) => u.order_id === orderId)).toBe(true);

    const lancamentos = await readBankingTransactions(orderId);
    expect(lancamentos).toHaveLength(1);
    expect(lancamentos[0].type).toBe("credit");
    expect(lancamentos[0].amount).toBe("20.00");

    // Pagamento limpa a ficha do anti-spam.
    expect((await readBuyerByPhone(tenant.id, phone)).consecutive_unpaid_reservations).toBe(0);

    await assertProductInvariants(raffle.id, "pedido pago");
  });

  it("ramo de falha: pedido que não existe", async () => {
    const inexistente = "00000000-0000-4000-8000-000000000000";

    expect(await simulatePayment(inexistente)).toEqual({ error: "Pedido inválido." });

    await assertProductInvariants(raffle.id, "pagamento de pedido inexistente");
  });

  it("ramo de falha: pedido que já está pago não é pago de novo", async () => {
    const orderId = orderIdOf(
      await reserveSelectedNumbers({
        tenantSlug: tenant.slug,
        productSlug: raffle.slug,
        numbers: [2],
        phone: syntheticPhone(),
      }),
    );
    await simulatePayment(orderId);

    expect(await simulatePayment(orderId)).toEqual({ error: "Pedido inválido." });

    // O que importa aqui é não haver dois créditos para o mesmo pedido: é a
    // única defesa contra pagamento em dobro que existe hoje, e ela é a
    // comparação `order.status !== "pending"`.
    expect(await readBankingTransactions(orderId)).toHaveLength(1);

    await assertProductInvariants(raffle.id, "segunda tentativa de pagamento");
  });
});
