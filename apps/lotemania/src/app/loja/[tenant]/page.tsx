import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";
import { db } from "@/db";
import { products, productNumbers, tenants } from "@/db/schema";
import { CampaignCard } from "@/components/loja/campaign-card";

export default async function StorefrontHomePage({
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

  const raffles = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      description: products.description,
      imageUrl: products.imageUrl,
      sold: sql<string>`count(${productNumbers.id}) filter (where ${productNumbers.status} = 'sold')`,
    })
    .from(products)
    .leftJoin(productNumbers, eq(productNumbers.productId, products.id))
    .where(
      and(
        eq(products.tenantId, tenant.id),
        eq(products.status, "active"),
        eq(products.privacy, "public"),
      ),
    )
    .groupBy(products.id)
    .orderBy(products.createdAt);

  const [featured, ...rest] = raffles;

  return (
    <div className="-mx-4 -mt-6 bg-card">
      <div className="flex items-center gap-2 px-5 pt-5 pb-4">
        <Zap className="size-4 fill-amber-400 text-amber-400" />
        <h1 className="font-semibold">Campanhas</h1>
        <span className="text-sm text-muted-foreground">Escolha sua sorte</span>
      </div>

      {raffles.length === 0 && (
        <p className="px-5 pb-5 text-muted-foreground">
          Nenhum sorteio disponível no momento.
        </p>
      )}

      {/* DESTAQUE: a primeira campanha ganha a arte grande. Proporcao 1.23
          medida (500x408) — e retrato, nao 16/9 como estava aqui. Raio 8px na
          arte, 16px no cartao. */}
      {featured && (
        <Link href={`/loja/${tenantSlug}/${featured.slug}`} className="block px-3 pb-3">
          {featured.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.imageUrl}
              alt={featured.title}
              className="w-full rounded-lg object-cover"
              style={{ aspectRatio: "1.23" }}
            />
          )}
          <div className="flex flex-col gap-1 pt-2">
            <p className="text-base font-semibold text-white">{featured.title}</p>
            {featured.description && (
              <p className="text-sm font-normal text-white">{featured.description}</p>
            )}
            <span className="w-fit self-start animate-[pulse_2.5s_ease-in-out_infinite] rounded-[6px] bg-[#198754] px-2 py-[2px] text-[8px] font-semibold text-white">
              Adquira Já!
            </span>
          </div>
        </Link>
      )}

      <div className="flex flex-col">
        {rest.map((raffle) => (
          /* O cartao do catalogo e o MESMO da tela de pedido (bloco 6 da
             LTM-14). A marcacao saiu de inline para `components/loja/
             campaign-card.tsx` para as duas telas lerem as mesmas medidas. */
          <div key={raffle.id} className="mx-3 mt-2">
            <CampaignCard
              title={raffle.title}
              subtitle={raffle.description}
              imageUrl={raffle.imageUrl}
              href={`/loja/${tenantSlug}/${raffle.slug}`}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
