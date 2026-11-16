import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth/require-user";
import { ContactCard } from "./contact-card";

export default async function ContactsPage() {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(contacts)
    .where(eq(contacts.tenantId, user.tenantId))
    .orderBy(desc(contacts.createdAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Contatos</h1>
        <p className="text-sm text-muted-foreground">Contatos</p>
      </div>

      <div className="rounded-md bg-sky-500/10 p-3 text-sm text-sky-400">
        Aqui estão todas as mensagens dos clientes que entraram em contato com você. Você pode
        visualizar os detalhes de cada contato e marcar como lido quando tiver respondido.
      </div>

      {rows.length === 0 && (
        <div className="rounded-lg border bg-card">
          <EmptyState />
        </div>
      )}

      <div className="flex flex-col gap-4">
        {rows.map((row) => (
          <ContactCard
            key={row.id}
            id={row.id}
            name={row.name}
            email={row.email}
            phone={row.phone}
            message={row.message ?? ""}
            category={row.category}
            status={row.status}
            createdAt={formatDate(row.createdAt)}
          />
        ))}
      </div>
    </div>
  );
}
