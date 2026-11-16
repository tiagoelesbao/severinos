import { CreditCard } from "lucide-react";
import { AffiliatePanel } from "./affiliate-panel";

export default async function AffiliatesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4">
      <div className="rounded-xl bg-card p-5">
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <CreditCard className="size-5" /> Painel dos Afiliados
        </h1>
      </div>
      <AffiliatePanel tenantSlug={tenantSlug} />
    </div>
  );
}
