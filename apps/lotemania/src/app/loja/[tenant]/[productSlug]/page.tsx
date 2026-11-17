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
import { formatCurrency } from "@/lib/format";
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
    /* A PAGINA INTEIRA sangra de borda a borda. As margens negativas cancelam
       o `px-4 py-6` do <main> do layout, e so aqui — as outras telas da loja
       seguem com a caixa centralizada. Sem `gap`: no original os blocos sao
       colados um no outro, e e isso que da a sensacao de continuidade entre a
       arte, a faixa de titulo e a de "Meus titulos". */
    <div className="-mx-4 -mt-6 flex flex-col bg-card">
      {product.imageUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.imageUrl}
            alt={product.title}
            /* 1.752 e a proporcao medida na arte da Sorteamos (543x310), mais
               baixa que o 16/9 que estava aqui. Raio 8px, tambem medido. */
            className="w-full object-cover"
            style={{ aspectRatio: "1.752" }}
          />
          {/* A faixa do titulo e `relative` para o badge poder se ancorar NELA.
              O gradiente desce ate o preto solido no rodape, e a faixa de
              "Meus titulos" encosta logo abaixo — a continuidade do degrade e
              o que o original faz. */}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-b from-black/60 to-black px-5 pb-3 pt-4">
            {settings.statusText && (
              /* Centro do badge SOBRE a linha de topo do gradiente, alinhado a
                 esquerda — nao no canto da imagem. O campo `statusText` ja
                 existia no schema com o default "Adquira Ja!" e nunca tinha
                 sido renderizado. */
              <span className="pointer-events-none absolute left-4 top-0 -translate-y-1/2 animate-[pulse_2s_ease-in-out_infinite] rounded-[4px] bg-[#198754] px-2 py-1 text-[11px] font-bold uppercase leading-none text-white">
                {settings.statusText}
              </span>
            )}
            <p className="font-semibold text-white">{product.title}</p>
            {product.description && (
              <p className="text-sm text-white/70">{product.description}</p>
            )}
          </div>
        </div>
      )}

      <MeusTitulosRow tenantSlug={tenantSlug} />

      {/* "Por apenas" 12px/600 branco; o valor com FUNDO PRETO, branco
          16px/700, raio 6px, padding 12px 8px — tudo medido na Sorteamos.
          A linha "Sorteio em ..." nao existe no original e saiu daqui. */}
      {/* Compacto: a linha toda ocupa a mesma altura da faixa de "Meus
          titulos" (27px medidos). Antes o py-3 do badge empurrava o bloco para
          ~40px e comia espaco vertical a toa. */}
      <div className="flex items-center justify-center gap-2 px-5 py-1.5">
        <span className="text-xs font-semibold text-white">Por apenas</span>
        <span className="rounded-[6px] bg-black px-2.5 py-1 text-sm font-bold tabular-nums text-white">
          {formatCurrency(Number(product.pricePerNumber))}
        </span>
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

      {/* px-2, nao px-5: no original a legenda e a grade vao quase ate a borda
          da tela. O container estreito era o que deixava aquelas faixas
          escuras nas laterais. */}
      <div className="px-2 pb-5">
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
