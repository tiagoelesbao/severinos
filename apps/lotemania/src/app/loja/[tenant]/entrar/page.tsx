import { KeyRound } from "lucide-react";
import { LookupForm } from "../meus-titulos/lookup-form";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl bg-card p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <KeyRound className="size-5" /> Login
      </h1>
      <LookupForm tenantSlug={tenantSlug} />
    </div>
  );
}
