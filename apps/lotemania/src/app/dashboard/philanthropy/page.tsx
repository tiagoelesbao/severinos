import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { PhilanthropyForm } from "./philanthropy-form";

export default async function PhilanthropyPage() {
  const user = await requireUser();
  const [row] = await db
    .select({
      philanthropyEnabled: settings.philanthropyEnabled,
      philanthropyDescription: settings.philanthropyDescription,
    })
    .from(settings)
    .where(eq(settings.tenantId, user.tenantId))
    .limit(1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Filantropia</h1>
        <p className="text-muted-foreground">
          Destine parte da arrecadação a uma causa social e divulgue na loja.
        </p>
      </div>
      <PhilanthropyForm
        initialEnabled={row?.philanthropyEnabled ?? false}
        initialDescription={row?.philanthropyDescription ?? ""}
      />
    </div>
  );
}
