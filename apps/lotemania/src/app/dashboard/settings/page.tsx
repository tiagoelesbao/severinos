import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { siteConfigSchema } from "@/lib/validations/site-config";
import { SettingsTabs } from "./settings-tabs";

export default async function SettingsPage() {
  const user = await requireUser();
  const [row] = await db
    .select()
    .from(settings)
    .where(eq(settings.tenantId, user.tenantId))
    .limit(1);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-muted-foreground">Configurações</p>
      </div>
      <SettingsTabs
        initialSiteName={row?.siteName ?? "Lotemania"}
        initialLogoUrl={row?.logoUrl ?? ""}
        initialTwoFactor={row?.twoFactorRequired ?? false}
        initialCaptcha={row?.captchaEnabled ?? true}
        initial={siteConfigSchema.parse((row?.siteConfig as object) ?? {})}
      />
    </div>
  );
}
