import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { discountLinks, products } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { requireUser } from "@/lib/auth/require-user";
import { NewLinkDialog } from "./new-link-dialog";
import { LinkActiveSwitch } from "./link-active-switch";

export default async function DiscountLinksPage() {
  const user = await requireUser();
  const rows = await db
    .select({
      id: discountLinks.id,
      title: discountLinks.title,
      productTitle: products.title,
      isActive: discountLinks.isActive,
      reservedCount: discountLinks.reservedCount,
      conversions: discountLinks.conversions,
      usageLimit: discountLinks.usageLimit,
      perUserLimit: discountLinks.perUserLimit,
      checkoutType: discountLinks.checkoutType,
      discountPercent: discountLinks.discountPercent,
      ticketQuantity: discountLinks.ticketQuantity,
      minQuantity: discountLinks.minQuantity,
    })
    .from(discountLinks)
    .leftJoin(products, eq(products.id, discountLinks.productId))
    .where(eq(discountLinks.tenantId, user.tenantId))
    .orderBy(desc(discountLinks.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Links de Desconto</h1>
          <p className="text-sm text-muted-foreground">Links de Desconto</p>
        </div>
        <NewLinkDialog />
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Produto</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Qtd. Reservada</TableHead>
              <TableHead>Qtd. Uso</TableHead>
              <TableHead>Lim. Uso</TableHead>
              <TableHead>Lim. por Usuário</TableHead>
              <TableHead>Checkout</TableHead>
              <TableHead>Desconto</TableHead>
              <TableHead>Qtd de Títulos</TableHead>
              <TableHead>Qtd Mínima</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={11}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.title || "--"}</TableCell>
                <TableCell>{row.productTitle ?? "--"}</TableCell>
                <TableCell>
                  <LinkActiveSwitch id={row.id} isActive={row.isActive} />
                </TableCell>
                <TableCell className="font-mono tabular-nums">{row.reservedCount}</TableCell>
                <TableCell className="font-mono tabular-nums">{row.conversions}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {row.usageLimit || "Ilimitado"}
                </TableCell>
                <TableCell className="font-mono tabular-nums">
                  {row.perUserLimit || "Ilimitado"}
                </TableCell>
                <TableCell className="capitalize">{row.checkoutType}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {row.discountPercent ? `${Number(row.discountPercent)}%` : "--"}
                </TableCell>
                <TableCell className="font-mono tabular-nums">{row.ticketQuantity}</TableCell>
                <TableCell className="font-mono tabular-nums">{row.minQuantity}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
