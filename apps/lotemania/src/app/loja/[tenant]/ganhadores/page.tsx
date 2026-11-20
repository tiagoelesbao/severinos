import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { winners, products, tenants } from "@/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import { maskName, maskPhone } from "@/lib/mask";
import { markedUnitLabel } from "@/lib/raffles/orphan-halves";

// ════════════════════════════════════════════════════════════════════════
// A METADE MARCADA NO CARTÃO PÚBLICO (LTM-08, AC5 / AC8 da LTM-27)
//
// Decisão do founder, 2026-11-20: um sorteio com meia cota pode ter ATÉ DOIS
// ganhadores por número sorteado. Sem a marcação, esse estado — que é o
// estado CORRETO de um título divisível com as duas metades vendidas — sai
// como `42` para DUAS pessoas diferentes no mesmo feed, e fica
// indistinguível de uma duplicata acidental.
//
// `winners.winning_half` é nulável de propósito (`raffles.ts:306-316`):
// `null` carrega "não foi meia cota", 1 ou 2 nomeiam a metade. O dado já
// existia; o que faltava era exibi-lo — e o comentário da coluna já atribuía
// a exibição a esta story.
// ════════════════════════════════════════════════════════════════════════

export default async function WinnersPage({
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

  const rows = await db
    .select({
      id: winners.id,
      winnerName: winners.winnerName,
      phone: winners.phone,
      prizeDescription: winners.prizeDescription,
      prizeAmount: winners.prizeAmount,
      winningNumber: winners.winningNumber,
      winningHalf: winners.winningHalf,
      announcedAt: winners.announcedAt,
      productTitle: products.title,
      productImageUrl: products.imageUrl,
    })
    .from(winners)
    .innerJoin(products, eq(products.id, winners.productId))
    .where(eq(winners.tenantId, tenant.id))
    .orderBy(desc(winners.announcedAt));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">🎉 Ganhadores</h1>
        <p className="text-muted-foreground">sortudos</p>
      </div>

      {rows.length === 0 && (
        <p className="text-muted-foreground">Nenhum ganhador anunciado ainda.</p>
      )}

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.id} className="flex gap-4 rounded-lg border p-4">
            {row.productImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.productImageUrl}
                alt={row.productTitle}
                className="size-20 shrink-0 rounded-md object-cover"
              />
            )}
            <div className="flex flex-col gap-0.5">
              <p className="font-semibold">{maskName(row.winnerName)}</p>
              <p className="text-sm">
                ✅ {row.productTitle}
              </p>
              {row.prizeAmount && (
                <p className="text-xs text-muted-foreground">
                  Prêmio: {formatCurrency(Number(row.prizeAmount))}
                </p>
              )}
              {row.winningNumber !== null && (
                <p className="text-xs text-muted-foreground">
                  Número da sorte:{" "}
                  <b>
                    {markedUnitLabel({
                      number: row.winningNumber,
                      isHalf: row.winningHalf !== null,
                    })}
                  </b>
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Data da premiação: {formatDate(row.announcedAt)}
              </p>
              {row.phone && (
                <p className="text-xs text-muted-foreground">
                  Telefone {maskPhone(row.phone)}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
