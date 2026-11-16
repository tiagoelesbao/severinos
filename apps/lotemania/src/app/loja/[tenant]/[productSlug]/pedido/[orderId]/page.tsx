import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { orders, products, productNumbers } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/format";
import { PaymentStatus } from "./payment-status";

export default async function OrderStatusPage({
  params,
}: {
  params: Promise<{ tenant: string; productSlug: string; orderId: string }>;
}) {
  const { orderId } = await params;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId)).limit(1);
  if (!order) notFound();

  const [product] = await db
    .select({ title: products.title })
    .from(products)
    .where(eq(products.id, order.productId))
    .limit(1);

  const numbers = await db
    .select({ number: productNumbers.number })
    .from(productNumbers)
    .where(eq(productNumbers.orderId, orderId));

  return (
    <div className="mx-auto flex max-w-md flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Pedido #{orderId.slice(0, 8)}
      </h1>

      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">{product?.title}</CardTitle>
          <PaymentStatus orderId={order.id} status={order.status} />
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total</span>
            <span className="font-mono text-lg font-semibold tabular-nums">
              {formatCurrency(Number(order.amount))}
            </span>
          </div>
          <div>
            <p className="mb-1 text-sm text-muted-foreground">Seus números</p>
            <div className="flex flex-wrap gap-1.5">
              {numbers.map((n) => (
                <span
                  key={n.number}
                  className="rounded-md border bg-muted px-2 py-1 font-mono text-xs tabular-nums"
                >
                  {String(n.number).padStart(3, "0")}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Pedido criado em {formatDate(order.createdAt)}. Números reservados
            por 15 minutos até a confirmação do pagamento.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
