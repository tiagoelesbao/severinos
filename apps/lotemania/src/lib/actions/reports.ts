"use server";

import { eq, and, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, products } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";

export type ReportType =
  | "vendas_por_dia"
  | "relatorio_vendas"
  | "relatorio_expirados"
  | "relatorio_participantes"
  | "faturamento";

export async function generateReport(input: {
  type: ReportType;
  productId?: string;
  startDate: string;
  endDate: string;
}) {
  const user = await requireUser();
  const start = new Date(input.startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(input.endDate);
  end.setHours(23, 59, 59, 999);

  const baseFilters = [
    eq(orders.tenantId, user.tenantId),
    gte(orders.createdAt, start),
    lte(orders.createdAt, end),
  ];
  if (input.productId) baseFilters.push(eq(orders.productId, input.productId));

  if (input.type === "vendas_por_dia") {
    const rows = await db
      .select({
        day: sql<string>`to_char(${orders.createdAt}, 'DD/MM/YYYY')`,
        pagos: sql<string>`count(*) filter (where ${orders.status} = 'paid')`,
        reservados: sql<string>`count(*) filter (where ${orders.status} = 'pending')`,
        expirados: sql<string>`count(*) filter (where ${orders.status} in ('expired','canceled'))`,
        faturamento: sql<string>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'paid'), 0)`,
      })
      .from(orders)
      .where(and(...baseFilters))
      .groupBy(sql`to_char(${orders.createdAt}, 'DD/MM/YYYY')`)
      .orderBy(sql`to_char(${orders.createdAt}, 'DD/MM/YYYY')`);
    return {
      columns: ["Data", "Pagos", "Reservados", "Expirados", "Faturamento"],
      rows: rows.map((r) => [r.day, r.pagos, r.reservados, r.expirados, r.faturamento]),
    };
  }

  if (input.type === "relatorio_vendas") {
    const rows = await db
      .select({
        title: products.title,
        createdAt: sql<string>`to_char(${orders.createdAt}, 'DD/MM/YYYY HH24:MI')`,
        quantity: orders.quantity,
        amount: orders.amount,
      })
      .from(orders)
      .innerJoin(products, eq(products.id, orders.productId))
      .where(and(...baseFilters, eq(orders.status, "paid")))
      .orderBy(orders.createdAt);
    return {
      columns: ["Sorteio", "Data", "Quantidade", "Valor"],
      rows: rows.map((r) => [r.title, r.createdAt, r.quantity, r.amount]),
    };
  }

  if (input.type === "relatorio_expirados") {
    const rows = await db
      .select({
        title: products.title,
        createdAt: sql<string>`to_char(${orders.createdAt}, 'DD/MM/YYYY HH24:MI')`,
        quantity: orders.quantity,
        amount: orders.amount,
      })
      .from(orders)
      .innerJoin(products, eq(products.id, orders.productId))
      .where(and(...baseFilters, sql`${orders.status} in ('expired','canceled')`))
      .orderBy(orders.createdAt);
    return {
      columns: ["Sorteio", "Data", "Quantidade", "Valor"],
      rows: rows.map((r) => [r.title, r.createdAt, r.quantity, r.amount]),
    };
  }

  if (input.type === "relatorio_participantes") {
    const rows = await db
      .select({
        userId: orders.userId,
        totalQuantity: sql<string>`sum(${orders.quantity})`,
        totalSpent: sql<string>`sum(${orders.amount})`,
        purchases: sql<string>`count(*)`,
      })
      .from(orders)
      .where(and(...baseFilters, eq(orders.status, "paid")))
      .groupBy(orders.userId);
    return {
      columns: ["Participante", "Compras", "Títulos", "Total Gasto"],
      rows: rows.map((r) => [r.userId.slice(0, 8), r.purchases, r.totalQuantity, r.totalSpent]),
    };
  }

  // faturamento
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${orders.amount}) filter (where ${orders.status} = 'paid'), 0)`,
      count: sql<string>`count(*) filter (where ${orders.status} = 'paid')`,
    })
    .from(orders)
    .where(and(...baseFilters));
  return {
    columns: ["Faturamento Total", "Pedidos Pagos"],
    rows: [[row?.total ?? "0", row?.count ?? "0"]],
  };
}
