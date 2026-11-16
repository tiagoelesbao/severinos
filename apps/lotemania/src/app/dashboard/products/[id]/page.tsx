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

  const [boxes, boxCombos, spins, spinCombos, scratches, scratchCombos] =
    await Promise.all([
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

      <AdvancedSettingsTabs
        productId={product.id}
        title={product.title}
        slug={product.slug}
        description={product.description ?? ""}
        privacy={product.privacy}
        pricePerNumber={Number(product.pricePerNumber)}
        totalNumbers={product.totalNumbers}
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
