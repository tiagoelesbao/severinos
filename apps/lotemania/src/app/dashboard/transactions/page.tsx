import { desc, eq, and, sql } from "drizzle-orm";
import { db } from "@/db";
import { orders, users, products, paymentWebhookEvents } from "@/db/schema";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth/require-user";
import { TransactionsSearch } from "./transactions-search";

const statusLabel: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  expired: "Expirado",
  refunded: "Reembolsado",
  canceled: "Cancelado",
};

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const filters = [eq(orders.tenantId, user.tenantId)];
  if (sp.txid) {
    const ids = sp.txid.split(",").map((s) => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      filters.push(sql`${orders.id}::text ilike any(${ids.map((i) => `%${i}%`)})`);
    }
  }

  const rows = await db
    .select({
      id: orders.id,
      status: orders.status,
      amount: orders.amount,
      createdAt: orders.createdAt,
      buyerName: users.name,
      buyerPhone: users.phone,
      productTitle: products.title,
      e2eId: sql<string | null>`${paymentWebhookEvents.payload}->>'e2eId'`,
    })
    .from(orders)
    .innerJoin(users, eq(users.id, orders.userId))
    .innerJoin(products, eq(products.id, orders.productId))
    .leftJoin(paymentWebhookEvents, eq(paymentWebhookEvents.orderId, orders.id))
    .where(and(...filters))
    .orderBy(desc(orders.createdAt))
    .limit(50);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Transações Bancárias</h1>
        <p className="text-sm text-muted-foreground">Consulta de Pagamentos</p>
      </div>

      <TransactionsSearch />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>TXId</TableHead>
              <TableHead>E2EId</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-mono text-xs">{row.id.slice(0, 8)}</TableCell>
                <TableCell className="font-mono text-xs">{row.e2eId ?? "--"}</TableCell>
                <TableCell className="font-medium">{row.buyerName}</TableCell>
                <TableCell className="font-mono text-sm">{row.buyerPhone ?? "--"}</TableCell>
                <TableCell className="max-w-40 truncate">{row.productTitle}</TableCell>
                <TableCell>
                  <Badge variant={row.status === "paid" ? "default" : "outline"}>
                    {statusLabel[row.status]}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{formatDate(row.createdAt)}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatCurrency(Number(row.amount))}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
