"use server";

import { eq, and, desc } from "drizzle-orm";
import { db } from "@/db";
import { tenants, users, orders, products, productNumbers } from "@/db/schema";
import { markedUnitLabel } from "@/lib/raffles/orphan-halves";

// ════════════════════════════════════════════════════════════════════════
// A METADE MARCADA EM "MEUS TÍTULOS" (LTM-08, AC5)
//
// O defeito estava NA CONSULTA, não na tela: `.select({ number: ... })`
// descartava `half` na própria leitura, e por isso marcar a metade no
// componente era impossível — o dado não chegava lá. Quem tem a metade do
// 42 e o 43 inteiro via `42` e `43`, indistinguíveis, e `42` para uma metade
// é a ambiguidade que o GLOSSARY nomeia como "disputa com o ganhador".
//
// ⚠️ QUEM DIZ SE É METADE É `orders.unit`, NÃO `product_numbers.half`.
//
// Em sorteio de cota inteira toda linha tem `half = 1` (o caso degenerado),
// então `half === 1` marcaria como metade todo título inteiro já vendido.
// `orders.unit` é a unidade em que AQUELE pedido foi contado e cobrado
// quando nasceu (`raffles.ts:48-59`) — e usá-lo é o que impede o relato de
// um pedido antigo de ser relido pela configuração de hoje. A divisibilidade
// é congelada na primeira venda justamente para esse relato nunca mudar.
// ════════════════════════════════════════════════════════════════════════

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
      quantity: orders.quantity,
      unit: orders.unit,
      createdAt: orders.createdAt,
      productTitle: products.title,
      productSlug: products.slug,
    })
    .from(orders)
    .innerJoin(products, eq(products.id, orders.productId))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt));

  const withUnits = await Promise.all(
    rows.map(async (row) => {
      const units = await db
        .select({ number: productNumbers.number, half: productNumbers.half })
        .from(productNumbers)
        .where(eq(productNumbers.orderId, row.id))
        .orderBy(productNumbers.number, productNumbers.half);
      const isHalf = row.unit === "half";
      return {
        ...row,
        // O RÓTULO vem montado do servidor, e não é preguiça de componente:
        // `markedUnitLabel` mora em `raffles/orphan-halves.ts`, que importa
        // `@/db` — `lookup-form.tsx` é componente de cliente e não pode
        // importá-lo. A convenção *metade marcada* fica num lugar só, e a
        // tela só imprime.
        units: units.map((unit) => ({
          number: unit.number,
          half: unit.half,
          label: markedUnitLabel({ number: unit.number, isHalf }),
        })),
      };
    }),
  );

  return { orders: withUnits };
}
