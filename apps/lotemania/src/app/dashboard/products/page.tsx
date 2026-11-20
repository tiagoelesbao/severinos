import Link from "next/link";
import { and, desc, sql, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { products, productNumbers, tenants } from "@/db/schema";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { formatDate } from "@/lib/format";
import { requireUser } from "@/lib/auth/require-user";
import {
  digitsForRaffle,
  prizePlacesFor,
  readRecordedWinnersForRaffles,
} from "@/lib/raffles/define-winners";
import { productAdvancedSettingsSchema } from "@/lib/validations/product-settings";
import { ProductStatusSelect } from "./product-status-select";
import { ProductRowActions } from "./product-row-actions";
import { ProgressRing } from "./progress-ring";
import { ProductsFilters } from "./products-filters";

const PAGE_SIZE = 5;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const [tenant] = await db
    .select({ slug: tenants.slug })
    .from(tenants)
    .where(eq(tenants.id, user.tenantId))
    .limit(1);

  const filters = [eq(products.tenantId, user.tenantId)];
  if (sp.q) filters.push(ilike(products.title, `%${sp.q}%`));
  if (sp.status) filters.push(eq(products.status, sp.status as "draft" | "active" | "finished" | "canceled"));
  if (sp.privacy) filters.push(eq(products.privacy, sp.privacy as "public" | "private"));
  if (sp.category) filters.push(eq(products.category, sp.category));
  if (sp.date) filters.push(sql`${products.drawDate}::date = ${sp.date}::date`);

  const [{ count: totalCount }] = await db
    .select({ count: sql<string>`count(*)` })
    .from(products)
    .where(and(...filters));

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      status: products.status,
      privacy: products.privacy,
      imageUrl: products.imageUrl,
      drawDate: products.drawDate,
      createdAt: products.createdAt,
      totalNumbers: products.totalNumbers,
      isFavorite: products.isFavorite,
      // A contagem do dialogo de estatisticas conta UNIDADES VENDAVEIS, e num
      // sorteio divisivel elas sao METADES. Sem este marcador o dialogo diz
      // "40 / Reservados" sobre 40 metades, que e meio sorteio apresentado
      // como sorteio inteiro (AC2 da LTM-08).
      isDivisible: products.isDivisible,
      // Lido por `safeParse` abaixo, nunca por acesso cru ao jsonb: sorteio
      // antigo tem `advanced_settings = {}` e sao os defaults que entregam
      // `prizes` (`product-settings.ts:59-62`).
      advancedSettings: products.advancedSettings,
      sold: sql<string>`count(${productNumbers.id}) filter (where ${productNumbers.status} = 'sold')`,
      reserved: sql<string>`count(${productNumbers.id}) filter (where ${productNumbers.status} = 'reserved')`,
      available: sql<string>`count(${productNumbers.id}) filter (where ${productNumbers.status} = 'available')`,
    })
    .from(products)
    .leftJoin(productNumbers, eq(productNumbers.productId, products.id))
    .where(and(...filters))
    .groupBy(products.id)
    .orderBy(desc(products.isFavorite), desc(products.createdAt))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  // ── OS GANHADORES JA REGISTRADOS (LTM-27, AC1) ────────────────────────
  //
  // UMA consulta para a pagina inteira, e nao uma por linha: cinco sorteios
  // por pagina viram cinco idas ao banco por render, e a lista e a tela mais
  // aberta do painel. A `Data da compra` sai da junta
  // `product_numbers.order_id -> orders.created_at` — `winners` nao guarda o
  // pedido, e a junta mora no modulo de dominio para ser verificavel.
  const recordedWinners = await readRecordedWinnersForRaffles(
    user.tenantId,
    rows.map((row) => row.id),
  );

  const total = Number(totalCount);
  const from = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, total);
  const hasNext = to < total;
  const hasPrev = page > 1;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sorteios</h1>
          <p className="text-muted-foreground">Sorteios</p>
        </div>
        <Button render={<Link href="/dashboard/products/new" />} nativeButton={false}>
          <Plus />
          Novo Sorteio
        </Button>
      </div>

      <ProductsFilters />

      {rows.length === 0 && (
        <p className="rounded-lg border p-10 text-center text-muted-foreground">
          Nenhum sorteio encontrado.
        </p>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const sold = Number(row.sold);
          const reserved = Number(row.reserved);
          const available = Number(row.available);
          const progress = Math.round((sold / Math.max(1, row.totalNumbers)) * 100);
          const settings = productAdvancedSettingsSchema.safeParse(
            row.advancedSettings ?? {},
          );
          const prizePlaces = prizePlacesFor(
            settings.success ? settings.data.prizes : [],
          );
          const winnersOfRow = recordedWinners.filter((w) => w.productId === row.id);
          return (
            <div
              key={row.id}
              className="flex flex-wrap items-center gap-4 rounded-lg border bg-card p-3"
            >
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.imageUrl}
                  alt={row.title}
                  className="size-14 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div className="size-14 shrink-0 rounded-md bg-muted" />
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{row.title}</p>
                <p className="text-xs text-muted-foreground">
                  {row.drawDate && <>Sorteio: {formatDate(row.drawDate)} · </>}
                  Cadastro: {formatDate(row.createdAt)}
                </p>

                {/*
                  O PAINEL MOSTRA O NOME INTEIRO, e esta certo: quem le e o
                  operador. A LOJA mascara (`loja/[tenant]/ganhadores/page.tsx:62`,
                  `:81`), e a divisao e a do AC8 da LTM-27.

                  A metade aparece aqui porque sem ela um titulo divisivel
                  sorteado produz DUAS linhas identicas — `Titulo: 42` duas
                  vezes — e o operador nao tem como saber que sao duas pessoas.
                */}
                {winnersOfRow.length > 0 && (
                  <div
                    className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground"
                    data-winners-inline
                  >
                    {winnersOfRow.map((ganhador) => (
                      <p key={ganhador.id}>
                        <span className="font-medium text-foreground">
                          Ganhador: {ganhador.winnerName}
                        </span>
                        {" · "}
                        Titulo: {ganhador.winningNumber}
                        {ganhador.winningHalf !== null && (
                          <> (metade {ganhador.winningHalf})</>
                        )}
                        {ganhador.purchasedAt && (
                          <> · Data da compra: {formatDate(ganhador.purchasedAt)}</>
                        )}
                      </p>
                    ))}
                  </div>
                )}
              </div>

              <ProductStatusSelect productId={row.id} status={row.status} />

              <ProductRowActions
                productId={row.id}
                tenantSlug={tenant?.slug ?? ""}
                productSlug={row.slug}
                title={row.title}
                isFavorite={row.isFavorite}
                isDivisible={row.isDivisible}
                available={available}
                reserved={reserved}
                sold={sold}
                total={row.totalNumbers}
                prizePlaces={prizePlaces}
                digits={digitsForRaffle(row.totalNumbers)}
                drawDateIso={row.drawDate ? row.drawDate.toISOString() : null}
              />

              <ProgressRing percent={progress} />
            </div>
          );
        })}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            Linhas por página: {PAGE_SIZE}
          </span>
          <span>
            {from}-{to} de {total}
          </span>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasPrev}
              render={<Link href={`/dashboard/products?${buildPageQuery(sp, page - 1)}`} />}
              nativeButton={false}
            >
              ‹
            </Button>
            <Button
              variant="outline"
              size="icon-sm"
              disabled={!hasNext}
              render={<Link href={`/dashboard/products?${buildPageQuery(sp, page + 1)}`} />}
              nativeButton={false}
            >
              ›
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function buildPageQuery(sp: Record<string, string | undefined>, page: number) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v && k !== "page") params.set(k, v);
  }
  params.set("page", String(page));
  return params.toString();
}
