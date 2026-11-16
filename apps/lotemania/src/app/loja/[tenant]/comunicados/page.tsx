import { desc, eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { communications, tenants } from "@/db/schema";
import { formatDate } from "@/lib/format";

export default async function CommunicationsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) notFound();

  const rows = await db
    .select()
    .from(communications)
    .where(and(eq(communications.tenantId, tenant.id), eq(communications.isActive, true)))
    .orderBy(desc(communications.createdAt));

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl bg-card p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <span>📣</span> Comunicados
      </h1>
      {rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Nenhum comunicado até o momento!</p>
      )}
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border p-4">
            <p className="font-semibold">{row.title}</p>
            <p className="text-sm text-muted-foreground">{row.body}</p>
            <p className="mt-1 text-xs text-muted-foreground">{formatDate(row.createdAt)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
