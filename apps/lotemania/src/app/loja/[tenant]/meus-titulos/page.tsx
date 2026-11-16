import { LookupForm } from "./lookup-form";

export default async function MyTitlesPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl bg-card p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <span>🎟️</span> Meus títulos
      </h1>
      <LookupForm tenantSlug={tenantSlug} />
    </div>
  );
}
