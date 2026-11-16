import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { communications } from "@/db/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth/require-user";
import { NewCommunicationDialog } from "./new-communication-dialog";
import { CommunicationActiveSwitch } from "./communication-active-switch";

export default async function CommunicationsPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(communications)
    .where(eq(communications.tenantId, user.tenantId))
    .orderBy(desc(communications.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Comunicados</h1>
          <p className="text-muted-foreground">Avisos exibidos para a equipe e usuários.</p>
        </div>
        <NewCommunicationDialog />
      </div>

      <div className="flex flex-col gap-3">
        {rows.length === 0 && (
          <p className="text-muted-foreground">Nenhum comunicado publicado ainda.</p>
        )}
        {rows.map((row) => (
          <Card key={row.id}>
            <CardHeader className="flex-row items-start justify-between space-y-0">
              <div>
                <CardTitle className="text-base">{row.title}</CardTitle>
                <p className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</p>
              </div>
              <CommunicationActiveSwitch id={row.id} isActive={row.isActive} />
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{row.body}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
