import Link from "next/link";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  products,
  awardedBoxes,
  awardedBoxCombos,
  rewardSpins,
  rewardSpinCombos,
  scratchCards,
  scratchCardCombos,
} from "@/db/schema";
import { requireUser } from "@/lib/auth/require-user";
import { fromCents } from "@/lib/payments/money";
import { halfPanelFor, UNIT_NAMES } from "@/lib/raffles/orphan-halves";
import {
  centsOrNull,
  sellingFreezeRefusal,
} from "@/lib/validations/product";
import {
  productAdvancedSettingsSchema,
  type ProductAdvancedSettings,
} from "@/lib/validations/product-settings";
import { AdvancedSettingsTabs } from "./advanced-settings-tabs";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();

  const [product] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)));
  if (!product) notFound();

  // O PAINEL DA MEIA COTA (LTM-08, AC4 e AC6). Duas leituras num número
  // cada: quantas unidades já saíram do estoque — que é o que CONGELA a
  // divisibilidade — e quantos títulos estão com metade órfã.
  //
  // Entra no mesmo `Promise.all` dos jogos bônus de propósito: é uma ida ao
  // banco a mais numa tela que já faz seis, e serializá-la somaria latência
  // na tela que o operador abre toda hora.
  const [halfPanel, boxes, boxCombos, spins, spinCombos, scratches, scratchCombos] =
    await Promise.all([
      halfPanelFor(id),
      db.select().from(awardedBoxes).where(eq(awardedBoxes.productId, id)),
      db
        .select()
        .from(awardedBoxCombos)
        .innerJoin(awardedBoxes, eq(awardedBoxes.id, awardedBoxCombos.awardedBoxId))
        .where(eq(awardedBoxes.productId, id)),
      db.select().from(rewardSpins).where(eq(rewardSpins.productId, id)),
      db
        .select()
        .from(rewardSpinCombos)
        .innerJoin(rewardSpins, eq(rewardSpins.id, rewardSpinCombos.rewardSpinId))
        .where(eq(rewardSpins.productId, id)),
      db.select().from(scratchCards).where(eq(scratchCards.productId, id)),
      db
        .select()
        .from(scratchCardCombos)
        .innerJoin(scratchCards, eq(scratchCards.id, scratchCardCombos.scratchCardId))
        .where(eq(scratchCards.productId, id)),
    ]);

  const awardedBoxGames = boxes.map((b) => ({
    id: b.id,
    title: b.title,
    isActive: b.isActive,
    items: (b.prizes as string[]) ?? [],
    combos: boxCombos
      .filter((c) => c.awarded_box_combos.awardedBoxId === b.id)
      .map((c) => c.awarded_box_combos),
  }));
  const rewardSpinGames = spins.map((s) => ({
    id: s.id,
    title: s.title,
    isActive: s.isActive,
    items: (s.segments as string[]) ?? [],
    combos: spinCombos
      .filter((c) => c.reward_spin_combos.rewardSpinId === s.id)
      .map((c) => c.reward_spin_combos),
  }));
  const scratchCardGames = scratches.map((s) => ({
    id: s.id,
    title: s.title,
    isActive: s.isActive,
    items: (s.prizes as string[]) ?? [],
    combos: scratchCombos
      .filter((c) => c.scratch_card_combos.scratchCardId === s.id)
      .map((c) => c.scratch_card_combos),
  }));

  // ── O que a aba Títulos precisa saber sobre a meia cota ───────────────
  //
  // O congelamento (AC4) é o MOTIVO ESCRITO, não um booleano: quem decide o
  // texto é `sellingFreezeRefusal`, a mesma função que o domínio usa para
  // recusar a alteração (`validations/product.ts:262`). Derivar aqui um
  // "já tem venda, não pode" próprio faria a tela e a recusa divergirem no
  // dia em que a regra mudar.
  const freezeReason = sellingFreezeRefusal(halfPanel.unitsOutOfStock)?.message ?? null;

  // O preço da metade, em STRING decimal — nunca `price / 2` em `number`.
  // A razão está em `money.ts:36-39`: `number` chega aqui tendo passado por
  // ponto flutuante e depois do fato não se distingue "o dado tem três
  // casas" de "o binário deixou resíduo". `null` quando o preço não divide
  // exato em centavos — e aí a recusa `price_not_divisible` do domínio é
  // quem explica, não esta tela.
  const priceCents = centsOrNull(product.pricePerNumber);
  const halfPriceText =
    priceCents !== null && priceCents % 2 === 0 ? fromCents(priceCents / 2) : null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Editar Sorteio</h1>
        <p className="text-sm text-muted-foreground">
          <Link href="/dashboard/products" className="hover:underline">
            Sorteios
          </Link>{" "}
          · {product.id}
        </p>
      </div>

      {/* AC6 — A METADE ÓRFÃ, NA TELA QUE O OPERADOR JÁ ABRE.
          Sem filtro, sem aba: aqui, embaixo do título. Quem tem metade órfã
          sorteada leva o prêmio INTEIRO (GLOSSARY → Metade órfã), e o
          operador precisa saber disso enquanto ainda dá para vender a outra
          metade. Só em sorteio divisível — em cota inteira a frase não tem
          sujeito. */}
      {product.isDivisible && (
        <div className="rounded-md bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
          <b>Meia cota habilitada.</b>{" "}
          {halfPanel.orphanTitles === 0 ? (
            <>
              Nenhum título com metade órfã — todo título vendido está com as duas
              metades vendidas.
            </>
          ) : (
            <>
              {halfPanel.orphanTitles === 1
                ? "1 título com metade órfã"
                : `${halfPanel.orphanTitles} títulos com metade órfã`}{" "}
              (uma metade vendida, a outra não). Se um deles for sorteado, o dono
              da metade vendida leva o prêmio inteiro.
            </>
          )}
        </div>
      )}

      <AdvancedSettingsTabs
        productId={product.id}
        title={product.title}
        slug={product.slug}
        description={product.description ?? ""}
        privacy={product.privacy}
        pricePerNumber={Number(product.pricePerNumber)}
        totalNumbers={product.totalNumbers}
        isDivisible={product.isDivisible}
        freezeReason={freezeReason}
        halfPriceText={halfPriceText}
        unitNames={UNIT_NAMES}
        drawDate={product.drawDate}
        imageUrl={product.imageUrl}
        category={product.category}
        initial={productAdvancedSettingsSchema.parse(
          (product.advancedSettings as Partial<ProductAdvancedSettings>) ?? {},
        )}
        awardedBoxGames={awardedBoxGames}
        rewardSpinGames={rewardSpinGames}
        scratchCardGames={scratchCardGames}
      />
    </div>
  );
}
