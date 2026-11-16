import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { CertificateForm } from "./certificate-form";

export default async function CertificatePage() {
  const user = await requireUser();
  const [tenant] = await db
    .select({ customDomain: tenants.customDomain, customDomainVerified: tenants.customDomainVerified })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Certificado</h1>
        <p className="text-muted-foreground">
          Configure um domínio próprio para sua loja, com SSL automático.
        </p>
      </div>
      <CertificateForm
        initialDomain={tenant?.customDomain ?? ""}
        verified={tenant?.customDomainVerified ?? false}
      />
    </div>
  );
}
