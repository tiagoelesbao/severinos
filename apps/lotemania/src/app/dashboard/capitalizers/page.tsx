import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { capitalizers } from "@/db/schema";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireUser } from "@/lib/auth/require-user";
import { NewCapitalizerDialog } from "./new-capitalizer-dialog";
import { CapitalizerActiveSwitch } from "./capitalizer-active-switch";

export default async function CapitalizersPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(capitalizers)
    .where(eq(capitalizers.tenantId, user.tenantId))
    .orderBy(desc(capitalizers.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Capitalizadoras</h1>
          <p className="text-muted-foreground">
            Produtos de capitalização regulados pela SUSEP vinculados aos sorteios.
          </p>
        </div>
        <NewCapitalizerDialog />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Processo SUSEP</TableHead>
              <TableHead>Ativa</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhuma capitalizadora cadastrada ainda.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="font-medium">{row.name}</TableCell>
                <TableCell className="font-mono">{row.susepProcessNumber ?? "—"}</TableCell>
                <TableCell>
                  <CapitalizerActiveSwitch id={row.id} isActive={row.isActive} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
