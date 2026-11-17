import { notFound } from "next/navigation";
import Link from "next/link";
import { lojaSans } from "@/app/layout";
import { getTenantBySlug } from "@/lib/tenant";
import { db } from "@/db";
import { pageViews } from "@/db/schema";
import { StorefrontNav } from "./storefront-nav";
import { StoreLogo } from "./store-logo";

export default async function StorefrontLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tenant: string }>;
}) {
  const { tenant: tenantSlug } = await params;
  const tenant = await getTenantBySlug(tenantSlug);
  if (!tenant) notFound();

  // Fire-and-forget: backs the admin dashboard's Visitas Hoje/Ontem/Total
  // cards with real traffic instead of static numbers.
  void db.insert(pageViews).values({ tenantId: tenant.id, path: `/loja/${tenantSlug}` });

  const siteName = tenant.settings?.siteName ?? tenant.name;
  const logoUrl = tenant.settings?.logoUrl ?? null;

  return (
    // A loja roda em Montserrat; o painel fica em Public Sans. Reaplicar a
    // variavel aqui troca a familia so no escopo da loja.
    <div className={`${lojaSans.variable} flex min-h-svh flex-col bg-background`}>
      <header className="bg-black">
        {/* h-[70px]: altura medida no cabecalho da loja da Sorteamos. */}
        <div className="mx-auto flex h-[70px] max-w-3xl items-center gap-2 px-4">
          <Link href={`/loja/${tenantSlug}`} className="flex items-center gap-2">
            <StoreLogo tenantSlug={tenantSlug} siteName={siteName} logoUrl={logoUrl} />
          </Link>
          <div className="flex-1" />
          <StorefrontNav tenantSlug={tenantSlug} siteName={siteName} logoUrl={logoUrl} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
      <footer className="py-6 text-center text-xs text-muted-foreground">
        {siteName} · plataforma operada via Lotemania
      </footer>
    </div>
  );
}
