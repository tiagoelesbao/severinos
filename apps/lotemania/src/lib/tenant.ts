import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, settings } from "@/db/schema";

export async function getTenantBySlug(slug: string) {
  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, slug))
    .limit(1);
  if (!tenant || !tenant.isActive) return null;

  const [tenantSettings] = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, tenant.id))
    .limit(1);

  return { ...tenant, settings: tenantSettings ?? null };
}

export type TenantWithSettings = NonNullable<
  Awaited<ReturnType<typeof getTenantBySlug>>
>;
