import Link from "next/link";
import { and, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { Zap } from "lucide-react";
import { db } from "@/db";
import { products, productNumbers, tenants } from "@/db/schema";

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
    <div className="rounded-xl bg-card">
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

      {featured && (
        <Link href={`/loja/${tenantSlug}/${featured.slug}`} className="block">
          {featured.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={featured.imageUrl}
              alt={featured.title}
              className="aspect-video w-full object-cover"
            />
          )}
          <div className="border-b border-border px-5 py-3">
            <p className="font-semibold">{featured.title}</p>
            {featured.description && (
              <p className="text-sm text-muted-foreground">{featured.description}</p>
            )}
          </div>
        </Link>
      )}

      <div className="flex flex-col">
        {rest.map((raffle) => (
          <Link
            key={raffle.id}
            href={`/loja/${tenantSlug}/${raffle.slug}`}
            className="flex items-center gap-3 border-b border-border px-5 py-3 last:border-b-0 hover:bg-muted/40"
          >
            {raffle.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={raffle.imageUrl}
                alt={raffle.title}
                className="size-14 shrink-0 rounded-md object-cover"
              />
            )}
            <div className="min-w-0">
              <p className="truncate font-semibold">{raffle.title}</p>
              {raffle.description && (
                <p className="truncate text-sm text-muted-foreground">
                  {raffle.description}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
