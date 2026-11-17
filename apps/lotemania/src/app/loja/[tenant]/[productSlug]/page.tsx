import { and, eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  products,
  productNumbers,
  tenants,
  rewardSpins,
  rewardSpinCombos,
  scratchCards,
  scratchCardCombos,
  awardedBoxes,
  awardedBoxCombos,
  winners,
} from "@/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import { productAdvancedSettingsSchema } from "@/lib/validations/product-settings";
import { NumberGrid } from "./number-grid";
import { BonusGamePlayer } from "./bonus-game-player";
import {
  MeusTitulosRow,
  PrizesPanel,
  DescriptionPanel,
  ShareRow,
  FloatingSupportButtons,
  WinnersInline,
} from "./raffle-extras";

export default async function RaffleDetailPage({
  params,
}: {
  params: Promise<{ tenant: string; productSlug: string }>;
}) {
  const { tenant: tenantSlug, productSlug } = await params;

  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) notFound();

  const [product] = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.tenantId, tenant.id),
        eq(products.slug, productSlug),
        sql`${products.status} in ('active', 'finished')`,
      ),
    )
    .limit(1);
  if (!product) notFound();

  const productWinners = await db
    .select({
      winnerName: winners.winnerName,
      prizeAmount: winners.prizeAmount,
      winningNumber: winners.winningNumber,
    })
    .from(winners)
    .where(eq(winners.productId, product.id));

  const numbers = await db
    .select({ number: productNumbers.number, status: productNumbers.status })
    .from(productNumbers)
    .where(eq(productNumbers.productId, product.id))
    .orderBy(productNumbers.number);

  const [spins, scratch, boxes] = await Promise.all([
    db
      .select()
      .from(rewardSpins)
      .where(and(eq(rewardSpins.productId, product.id), eq(rewardSpins.isActive, true))),
    db
      .select()
      .from(scratchCards)
      .where(and(eq(scratchCards.productId, product.id), eq(scratchCards.isActive, true))),
    db
      .select()
      .from(awardedBoxes)
      .where(and(eq(awardedBoxes.productId, product.id), eq(awardedBoxes.isActive, true))),
  ]);

  const [spinCombos, scratchCombos, boxCombos] = await Promise.all([
    Promise.all(
      spins.map((s) =>
        db.select().from(rewardSpinCombos).where(eq(rewardSpinCombos.rewardSpinId, s.id)),
      ),
    ),
    Promise.all(
      scratch.map((s) =>
        db.select().from(scratchCardCombos).where(eq(scratchCardCombos.scratchCardId, s.id)),
      ),
    ),
    Promise.all(
      boxes.map((s) =>
        db.select().from(awardedBoxCombos).where(eq(awardedBoxCombos.awardedBoxId, s.id)),
      ),
    ),
  ]);

  const hasExtras = spins.length > 0 || scratch.length > 0 || boxes.length > 0;
  const settings = productAdvancedSettingsSchema.parse(product.advancedSettings ?? {});

  return (
    <div className="flex flex-col gap-3 bg-card">
      {/* A arte sangra de borda a borda e o titulo mora SOBRE ela: na loja da
          Sorteamos a imagem e o topo da pagina, nao uma figura dentro de um
          cartao. As margens negativas cancelam o `px-4 py-6` do <main> do
          layout, sem alterar as outras telas da loja. */}
      {product.imageUrl && (
        <div className="relative -mx-4 -mt-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.title}
            className="aspect-video w-full object-cover"
          />
          <div className="absolute inset-x-0 bottom-0 bg-black/70 px-5 py-3">
            <p className="font-semibold text-white">{product.title}</p>
            {product.description && (
              <p className="text-sm text-white/70">{product.description}</p>
            )}
          </div>
        </div>
      )}

      <MeusTitulosRow tenantSlug={tenantSlug} />

      <div className="flex flex-col items-center gap-1 px-5 pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Por apenas</span>
          <span className="rounded-md bg-foreground px-3 py-1 font-mono font-bold tabular-nums text-background">
            {formatCurrency(Number(product.pricePerNumber))}
          </span>
        </div>
        {product.drawDate && (
          <p className="text-xs text-muted-foreground">
            Sorteio em {formatDate(product.drawDate)}
          </p>
        )}
      </div>

      {productWinners.length > 0 ? (
        <WinnersInline winners={productWinners} />
      ) : (
        settings.showPrizes && <PrizesPanel prizes={settings.prizes} title={product.title} />
      )}

      {hasExtras && (
        <div className="mx-5 flex flex-col gap-2 rounded-lg border border-border p-4">
          <p className="text-sm font-medium">Jogos bônus disponíveis</p>
          <div className="flex flex-wrap gap-2">
            {spins.map((s, i) => (
              <BonusGamePlayer
                key={s.id}
                tenantSlug={tenantSlug}
                kind="rewardSpin"
                title={s.title}
                combos={spinCombos[i]}
              />
            ))}
            {scratch.map((s, i) => (
              <BonusGamePlayer
                key={s.id}
                tenantSlug={tenantSlug}
                kind="scratchCard"
                title={s.title}
                combos={scratchCombos[i]}
              />
            ))}
            {boxes.map((s, i) => (
              <BonusGamePlayer
                key={s.id}
                tenantSlug={tenantSlug}
                kind="awardedBox"
                title={s.title}
                combos={boxCombos[i]}
              />
            ))}
          </div>
        </div>
      )}

      <div className="px-5 pb-5">
        <NumberGrid
          tenantSlug={tenantSlug}
          productSlug={productSlug}
          pricePerNumber={Number(product.pricePerNumber)}
          numbers={numbers}
        />
      </div>

      <DescriptionPanel description={settings.fullDescription} />
      <ShareRow title={product.title} />

      <FloatingSupportButtons
        whatsapp={settings.support.whatsapp}
        whatsappGroup={settings.support.whatsappGroup}
      />
    </div>
  );
}
