import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { tenants } from "@/db/schema";
import { getSitePage } from "@/lib/actions/site-config";

const DEFAULT_CONTENT = `Ao adquirir um título de capitalização ou participar de um sorteio nesta plataforma, você declara estar ciente e de acordo com as regras de cada campanha, incluindo valor, quantidade de números, data e forma de apuração do resultado.

Os dados pessoais informados no cadastro ou no checkout são usados exclusivamente para processar sua compra, identificar o ganhador e cumprir obrigações legais e regulatórias aplicáveis a produtos de capitalização.

Números reservados e não pagos dentro do prazo informado voltam automaticamente a ficar disponíveis para outros participantes.`;

export default async function TermsPage({
  params,
}: {
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) notFound();

  const page = await getSitePage(tenant.id, "termos");
  const content = page?.content || DEFAULT_CONTENT;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-4 rounded-xl bg-card p-5">
      <h1 className="flex items-center gap-2 text-lg font-semibold">
        <span>📄</span> {page?.title || "Termos de Uso"}
      </h1>
      <div className="flex flex-col gap-3 whitespace-pre-line text-sm text-muted-foreground">
        {content}
      </div>
    </div>
  );
}
