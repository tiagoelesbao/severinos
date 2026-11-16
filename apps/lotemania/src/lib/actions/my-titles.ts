"use server";

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { tenants, users, orders, products, productNumbers } from "@/db/schema";

export async function lookupOrdersByPhone(tenantSlug: string, phone: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
  if (!tenant) return { error: "Operador não encontrado." };

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.phone, phone)))
    .limit(1);
  if (!user) return { orders: [] };

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      amount: orders.amount,
      createdAt: orders.createdAt,
      productTitle: products.title,
      productSlug: products.slug,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  const withNumbers = await Promise.all(
    rows.map(async (row) => {
      const numbers = await db
        .select({ number: productNumbers.number })
        .from(productNumbers)
        .where(eq(productNumbers.orderId, row.id));
      return { ...row, numbers: numbers.map((n) => n.number) };
    }),
  );

  return { orders: withNumbers };
}
