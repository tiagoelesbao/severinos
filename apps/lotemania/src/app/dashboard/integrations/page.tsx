import {
  Bell,
  MessageCircle,
  Share2,
  Building2,
  Phone,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/db";
import { integrations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { INTEGRATION_PROVIDERS } from "@/lib/validations/integration";
import { requireUser } from "@/lib/auth/require-user";
import { IntegrationCard } from "./integration-card";

const ICONS: Record<string, { icon: typeof Bell; className: string }> = {
  onesignal: { icon: Bell, className: "bg-red-500/20 text-red-400" },
  "z-api": { icon: MessageCircle, className: "bg-foreground/10 text-foreground" },
  wizebot: { icon: MessageCircle, className: "bg-emerald-500/20 text-emerald-400" },
  "meta-ads": { icon: Share2, className: "bg-blue-500/20 text-blue-400" },
  dxhub: { icon: Building2, className: "bg-foreground/10 text-foreground" },
  liguelead: { icon: Phone, className: "bg-sky-500/20 text-sky-400" },
  paposms: { icon: MessageSquare, className: "bg-orange-500/20 text-orange-400" },
  captcha: { icon: ShieldCheck, className: "bg-orange-500/20 text-orange-400" },
};

export default async function IntegrationsPage() {
  const user = await requireUser();
  const configured = await db
    .select()
    .from(integrations)
    .where(eq(integrations.tenantId, user.tenantId));
  const byProvider = new Set(configured.map((i) => i.provider));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Integrações</h1>
        <p className="text-sm text-muted-foreground">Integrações</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {INTEGRATION_PROVIDERS.map((provider) => {
          const meta = ICONS[provider] ?? { icon: Bell, className: "bg-muted text-muted-foreground" };
          const Icon = meta.icon;
          return (
            <IntegrationCard
              key={provider}
              provider={provider}
              icon={<Icon className="size-5" />}
              iconClassName={meta.className}
              configured={byProvider.has(provider)}
            />
          );
        })}
      </div>
    </div>
  );
}
