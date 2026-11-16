import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { ThemeForm } from "./theme-form";

export default async function ThemePage() {
  const user = await requireUser();
  const [row] = await db
    .select({ themeConfig: settings.themeConfig })
    .from(settings)
    .where(eq(settings.tenantId, user.tenantId))
    .limit(1);

  const theme = (row?.themeConfig ?? {}) as {
    accentColor?: string;
    background?: string;
    panelBackground?: string;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Personalizar Tema</h1>
        <p className="text-muted-foreground">
          Cores usadas na sua loja (os painéis admin seguem o tema padrão Lotemania).
        </p>
      </div>
      <ThemeForm
        initialAccent={theme.accentColor ?? "#10b981"}
        initialBackground={theme.background ?? "#0d1117"}
        initialPanel={theme.panelBackground ?? "#171e2b"}
      />
    </div>
  );
}
