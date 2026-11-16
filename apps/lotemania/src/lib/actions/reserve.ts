"use server";

import { eq, and, sql, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  tenants,
  products,
  orders,
  users,
  productNumbers,
  blockedNumbers,
} from "@/db/schema";
import { reserveNumbersSchema, type ReserveNumbersInput } from "@/lib/validations/reserve";

const ANTI_SPAM_THRESHOLD = 3;
const ANTI_SPAM_BLOCK_MINUTES = 30;
const RESERVATION_MINUTES = 15;

// Releases this user's numbers whose reservation already expired, and
// tallies how many unpaid reservations they've abandoned in a row —
// mirrors the original's "Anti Spam": too many no-pay reservations in a
// row gets you temporarily blocked from reserving more.
async function expireStaleReservationsAndCheckSpam(
  tenantId: string,
  userId: string,
): Promise<{ blocked: boolean; blockedUntil?: Date }> {
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return { blocked: false };

  if (user.blockedUntil && user.blockedUntil > new Date()) {
    return { blocked: true, blockedUntil: user.blockedUntil };
  }

  const expiredOrders = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(productNumbers, eq(productNumbers.orderId, orders.id))
    .where(
      and(
        eq(orders.tenantId, tenantId),
        eq(orders.userId, userId),
        eq(orders.status, "pending"),
        sql`${productNumbers.reservedUntil} < now()`,
      ),
    )
    .groupBy(orders.id);

  if (expiredOrders.length === 0) return { blocked: false };

  const expiredIds = expiredOrders.map((o) => o.id);
  await db
    .update(productNumbers)
    .set({ status: "available", orderId: null, reservedUntil: null })
    .where(inArray(productNumbers.orderId, expiredIds));
  await db
    .update(orders)
    .set({ status: "expired" })
    .where(inArray(orders.id, expiredIds));

  const newCount = user.consecutiveUnpaidReservations + expiredOrders.length;
  if (newCount >= ANTI_SPAM_THRESHOLD) {
    const blockedUntil = new Date(Date.now() + ANTI_SPAM_BLOCK_MINUTES * 60 * 1000);
    await db
      .update(users)
      .set({ consecutiveUnpaidReservations: 0, blockedUntil })
      .where(eq(users.id, userId));
    return { blocked: true, blockedUntil };
  }

  await db
    .update(users)
    .set({ consecutiveUnpaidReservations: newCount })
    .where(eq(users.id, userId));
  return { blocked: false };
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

  const amount = (data.numbers.length * Number(product.pricePerNumber)).toFixed(2);

  const [order] = await db
    .insert(orders)
    .values({
      tenantId: tenant.id,
      userId,
      productId: product.id,
      quantity: data.numbers.length,
      amount,
      status: "pending",
    })
    .returning();

  const reserved = await db
    .update(productNumbers)
    .set({
      status: "reserved",
      orderId: order.id,
      reservedUntil: new Date(Date.now() + RESERVATION_MINUTES * 60 * 1000),
    })
    .where(
      and(
        eq(productNumbers.productId, product.id),
        inArray(productNumbers.number, data.numbers),
        eq(productNumbers.status, "available"),
      ),
    )
    .returning({ number: productNumbers.number });

  if (reserved.length < data.numbers.length) {
    await db
      .update(productNumbers)
      .set({ status: "available", orderId: null, reservedUntil: null })
      .where(eq(productNumbers.orderId, order.id));
    await db.update(orders).set({ status: "canceled" }).where(eq(orders.id, order.id));
    return {
      error:
        "Algum dos números escolhidos acabou de ser reservado por outra pessoa. Atualize a página e tente de novo.",
    };
  }

  return { orderId: order.id };
}
