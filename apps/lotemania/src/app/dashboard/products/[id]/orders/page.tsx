import Link from "next/link";
import { and, eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, orders, users, productNumbers } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth/require-user";
import { OrderDetailDialog } from "./order-detail-dialog";

const tabs = [
  { key: "all", label: "Todos" },
  { key: "paid", label: "Pagos" },
  { key: "pending", label: "Reservados" },
  { key: "expired", label: "Expirados" },
] as const;

const statusLabel: Record<string, string> = {
  pending: "Reservado",
  paid: "Pago",
  expired: "Expirado",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

const statusVariant: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  pending: "outline",
  paid: "default",
  expired: "destructive",
  refunded: "secondary",
  canceled: "destructive",
};

export default async function ProductOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  const { status } = await searchParams;
  const user = await requireUser();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)))
    .limit(1);
  if (!product) notFound();

  const activeTab = status && tabs.some((t) => t.key === status) ? status : "all";

  const whereClause =
    activeTab === "all"
      ? eq(orders.productId, id)
      : and(eq(orders.productId, id), eq(orders.status, activeTab as never));

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      quantity: orders.quantity,
      amount: orders.amount,
      createdAt: orders.createdAt,
      paidAt: orders.paidAt,
      buyerName: users.name,
      buyerPhone: users.phone,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .where(whereClause)
    .orderBy(desc(orders.createdAt))
    .limit(100);

  const withNumbers = await Promise.all(
    rows.map(async (row) => {
      const nums = await db
        .select({ number: productNumbers.number })
        .from(productNumbers)
        .where(eq(productNumbers.orderId, row.id));
      return { ...row, numbers: nums.map((n) => n.number) };
    }),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-4 rounded-lg border p-4">
        {product.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt={product.title}
            className="size-16 rounded-md object-cover"
          />
        ) : (
          <div className="size-16 rounded-md bg-muted" />
        )}
        <div>
          <h1 className="text-xl font-semibold">{product.title}</h1>
          <p className="font-mono text-sm text-muted-foreground">
            {formatCurrency(Number(product.pricePerNumber))} / número
          </p>
        </div>
      </div>

      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <Link
            key={tab.key}
            href={`/dashboard/products/${id}/orders?status=${tab.key}`}
            className={`border-b-2 px-4 py-2 text-sm font-medium ${
              activeTab === tab.key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Comprador</TableHead>
              <TableHead>Qtd × Preço</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {withNumbers.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Nenhuma compra encontrada.
                </TableCell>
              </TableRow>
            )}
            {withNumbers.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  {row.buyerName ?? row.buyerPhone ?? "—"}
                </TableCell>
                <TableCell className="font-mono text-xs tabular-nums">
                  {row.quantity}x
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatCurrency(Number(row.amount))}
                </TableCell>
                <TableCell>
                  <Badge variant={statusVariant[row.status]}>
                    {statusLabel[row.status] ?? row.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDate(row.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <OrderDetailDialog order={row} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
