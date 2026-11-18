"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, productNumbers, bankingTransactions, users } from "@/db/schema";

// Dev/test-only: marks an order paid without a real gateway, since no
// live PIX credentials are connected yet. Clearly labeled in the UI —
// remove once a real payment_gateways row is wired up for a tenant.
//
// As quatro escritas rodam numa transação só (LTM-02, AC6). Soltas, elas
// admitiam estados que custam dinheiro: pedido marcado como pago sem as
// unidades virarem vendidas, ou unidades vendidas sem o lançamento no
// extrato. É também o ponto de reuso da LTM-03 — o fechamento de pedido
// pelo webhook de verdade nasce desta forma.
export async function simulatePayment(orderId: string) {
  return db.transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, orderId)).limit(1);
    if (!order || order.status !== "pending") return { error: "Pedido inválido." };

    await tx
      .update(orders)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(orders.id, orderId));

    await tx
      .update(productNumbers)
      .set({ status: "sold" })
      .where(eq(productNumbers.orderId, orderId));

    await tx.insert(bankingTransactions).values({
      tenantId: order.tenantId,
      type: "credit",
      amount: order.amount,
      orderId: order.id,
      description: "Pagamento simulado (ambiente de teste)",
    });

    // A successful payment clears the anti-spam strike count.
    await tx
      .update(users)
      .set({ consecutiveUnpaidReservations: 0 })
      .where(eq(users.id, order.userId));

    return { ok: true };
  });
}
