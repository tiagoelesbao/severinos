import { SupportForm } from "./support-form";

export default async function SupportPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 rounded-xl bg-card p-5">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-semibold">
          <span>✉️</span> Contato
          <span className="ml-1 text-xs font-normal text-muted-foreground">
            Tire suas dúvidas
          </span>
        </h1>
      </div>
      <p className="text-sm font-semibold">
        Sinta-se livre para nos contatar.
        <br />
        Ficaremos felizes em ouvir de você.
      </p>
      <SupportForm tenantSlug={tenantSlug} />
    </div>
  );
}
