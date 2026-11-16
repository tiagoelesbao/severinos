"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders, productNumbers, bankingTransactions, users } from "@/db/schema";

// Dev/test-only: marks an order paid without a real gateway, since no
// live PIX credentials are connected yet. Clearly labeled in the UI —
// remove once a real payment_gateways row is wired up for a tenant.
export async function simulatePayment(orderId: string) {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order || order.status !== "pending") return { error: "Pedido inválido." };

  await db
    .update(orders)
    .set({ status: "paid", paidAt: new Date() })
    .where(eq(orders.id, orderId));

  await db
    .update(productNumbers)
    .set({ status: "sold" })
    .where(eq(productNumbers.orderId, orderId));

  await db.insert(bankingTransactions).values({
    tenantId: order.tenantId,
    type: "credit",
    amount: order.amount,
    orderId: order.id,
    description: "Pagamento simulado (ambiente de teste)",
  });

  // A successful payment clears the anti-spam strike count.
  await db
    .update(users)
    .set({ consecutiveUnpaidReservations: 0 })
    .where(eq(users.id, order.userId));

  return { ok: true };
}
