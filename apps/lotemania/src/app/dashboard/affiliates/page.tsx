import { desc, eq, and, ilike, sql } from "drizzle-orm";
import { db } from "@/db";
import { affiliates, users, orders, products } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency } from "@/lib/format";
import { requireUser } from "@/lib/auth/require-user";
import { NewAffiliateDialog } from "./new-affiliate-dialog";
import { AffiliateActiveSwitch } from "./affiliate-active-switch";
import { AffiliatesFilters } from "./affiliates-filters";

function maskCpf(cpf: string | null) {
  if (!cpf) return "--";
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11 ? `${digits.slice(0, 3)}.***.**${digits.slice(-2)}` : cpf;
}

export default async function AffiliatesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;

  const filters = [eq(affiliates.tenantId, user.tenantId)];
  if (sp.name) filters.push(ilike(users.name, `%${sp.name}%`));
  if (sp.cpf) filters.push(ilike(users.cpf, `%${sp.cpf}%`));
  if (sp.phone) filters.push(ilike(users.phone, `%${sp.phone}%`));
  if (sp.code) filters.push(ilike(users.affiliateCode, `%${sp.code}%`));

  const productList = await db
    .select({ id: products.id, title: products.title })
    .from(products)
    .where(eq(products.tenantId, user.tenantId));

  const orderFilters = [eq(orders.status, "paid")];
  if (sp.product) orderFilters.push(eq(orders.productId, sp.product));

  const rows = await db
    .select({
      id: affiliates.id,
      name: users.name,
      phone: users.phone,
      cpf: users.cpf,
      affiliateCode: users.affiliateCode,
      isActive: affiliates.isActive,
      tickets: sql<string>`coalesce(sum(${orders.quantity}) filter (where ${and(...orderFilters)}), 0)`,
      purchases: sql<string>`count(${orders.id}) filter (where ${and(...orderFilters)})`,
      revenue: sql<string>`coalesce(sum(${orders.amount}) filter (where ${and(...orderFilters)}), 0)`,
    })
    .from(affiliates)
    .innerJoin(users, eq(users.id, affiliates.userId))
    .leftJoin(orders, eq(orders.affiliateId, affiliates.id))
    .where(and(...filters))
    .groupBy(affiliates.id, users.name, users.phone, users.cpf, users.affiliateCode, affiliates.isActive)
    .orderBy(desc(affiliates.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Afiliados</h1>
          <p className="text-sm text-muted-foreground">Afiliados · Lista</p>
        </div>
        <NewAffiliateDialog />
      </div>

      <AffiliatesFilters products={productList} />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Código</TableHead>
              <TableHead>Títulos</TableHead>
              <TableHead>Compras</TableHead>
              <TableHead>Faturamento</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="font-mono text-sm">{row.phone ?? "--"}</TableCell>
                <TableCell className="font-mono text-sm">{maskCpf(row.cpf)}</TableCell>
                <TableCell className="font-mono">{row.affiliateCode}</TableCell>
                <TableCell className="font-mono tabular-nums">{row.tickets}</TableCell>
                <TableCell className="font-mono tabular-nums">{row.purchases}</TableCell>
                <TableCell className="font-mono tabular-nums">
                  {formatCurrency(Number(row.revenue))}
                </TableCell>
                <TableCell>
                  <AffiliateActiveSwitch id={row.id} isActive={row.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
