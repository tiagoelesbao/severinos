import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { getSitePage } from "@/lib/actions/site-config";
import { LegalPageForm } from "./legal-page-form";

const PAGES: Record<string, string> = {
  termos: "Termos De Uso",
  privacidade: "Privacidade",
  sobre: "Sobre",
};

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const label = PAGES[slug];
  if (!label) notFound();

  const user = await requireUser();
  const row = await getSitePage(user.tenantId, slug);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{label}</h1>
        <p className="text-muted-foreground">
          Conteúdo exibido na página pública &ldquo;{label}&rdquo; da loja.
        </p>
      </div>
      <LegalPageForm
        slug={slug}
        initialTitle={row?.title ?? label}
        initialContent={row?.content ?? ""}
      />
    </div>
  );
}
