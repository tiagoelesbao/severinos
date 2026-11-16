import { desc, eq, and, ilike } from "drizzle-orm";
import { db } from "@/db";
import { users, blockedNumbers } from "@/db/schema";
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
import { requireUser } from "@/lib/auth/require-user";
import { NewUserDialog } from "./new-user-dialog";
import { UserStatusSelect } from "./user-status-select";
import { BlockedNumbersCard } from "./blocked-numbers-card";
import { UsersFilters } from "./users-filters";
import { ExportUsersButton } from "./export-users-button";

const roleLabel: Record<string, string> = {
  admin: "Admin",
  operator: "Operador",
  affiliate: "Afiliado",
  subscriber: "Assinante",
};

function maskCpf(cpf: string | null) {
  if (!cpf) return "--";
  const digits = cpf.replace(/\D/g, "");
  return digits.length === 11 ? `${digits.slice(0, 3)}.***.**${digits.slice(-2)}` : cpf;
}

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sessionUser = await requireUser();
  const sp = await searchParams;

  const filters = [eq(users.tenantId, sessionUser.tenantId)];
  if (sp.name) filters.push(ilike(users.name, `%${sp.name}%`));
  if (sp.cpf) filters.push(ilike(users.cpf, `%${sp.cpf}%`));
  if (sp.email) filters.push(ilike(users.email, `%${sp.email}%`));
  if (sp.phone) filters.push(ilike(users.phone, `%${sp.phone}%`));
  if (sp.code) filters.push(ilike(users.affiliateCode, `%${sp.code}%`));
  if (sp.role) filters.push(eq(users.role, sp.role as "admin" | "operator" | "affiliate" | "subscriber"));

  const rows = await db
    .select()
    .from(users)
    .where(and(...filters))
    .orderBy(desc(users.createdAt));

  const blocked = await db
    .select()
    .from(blockedNumbers)
    .where(eq(blockedNumbers.tenantId, sessionUser.tenantId))
    .orderBy(desc(blockedNumbers.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground">Usuários · Lista</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportUsersButton
            rows={rows.map((r) => ({
              name: r.name ?? "",
              phone: r.phone ?? "",
              email: r.email ?? "",
              cpf: r.cpf ?? "",
              role: roleLabel[r.role],
              status: r.status,
            }))}
          />
          <NewUserDialog />
        </div>
      </div>

      <UsersFilters />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Telefone</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>CPF</TableHead>
              <TableHead>Afiliado</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>UF</TableHead>
              <TableHead>Cidade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9}>
                  <EmptyState />
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-blue-500 text-xs font-semibold text-white">
                      {(row.name ?? "U").charAt(0).toUpperCase()}
                    </div>
                    {row.name}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">{row.phone ?? "--"}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{row.email ?? "--"}</TableCell>
                <TableCell className="font-mono text-sm">{maskCpf(row.cpf)}</TableCell>
                <TableCell>
                  {row.affiliateCode ? (
                    <Badge variant="outline" className="font-mono">
                      {row.affiliateCode}
                    </Badge>
                  ) : (
                    "--"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{roleLabel[row.role]}</Badge>
                </TableCell>
                <TableCell>
                  <UserStatusSelect id={row.id} status={row.status} />
                </TableCell>
                <TableCell>{row.state ?? "--"}</TableCell>
                <TableCell>{row.city ?? "--"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <BlockedNumbersCard numbers={blocked} />
    </div>
  );
}
