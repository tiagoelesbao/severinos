"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { products } from "@/db/schema";
import {
  awardedBoxes,
  awardedBoxCombos,
  rewardSpins,
  rewardSpinCombos,
  scratchCards,
  scratchCardCombos,
} from "@/db/schema";
import {
  bonusGameSchema,
  bonusGameComboSchema,
  type BonusGameKind,
  type BonusGameInput,
  type BonusGameComboInput,
} from "@/lib/validations/bonus-game";
import { requireUser } from "@/lib/auth/require-user";

function parseItems(items: string): string[] {
  return items
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Ownership check: the product must belong to the caller's tenant before
// any bonus game can be attached to it.
async function assertOwnsProduct(productId: string, tenantId: string) {
  const [product] = await db
    .select({ id: products.id })
    .from(products)
    .where(and(eq(products.id, productId), eq(products.tenantId, tenantId)))
    .limit(1);
  if (!product) throw new Error("Sorteio não encontrado.");
}

export async function createBonusGame(
  kind: BonusGameKind,
  productId: string,
  input: BonusGameInput,
) {
  const user = await requireUser();
  await assertOwnsProduct(productId, user.tenantId);
  const data = bonusGameSchema.parse(input);
  const items = parseItems(data.items);

  if (kind === "awardedBox") {
    await db.insert(awardedBoxes).values({
      productId,
      title: data.title,
      totalBoxes: data.totalBoxes ?? items.length,
      prizes: items,
    });
  } else if (kind === "rewardSpin") {
    await db.insert(rewardSpins).values({
      productId,
      title: data.title,
      segments: items,
    });
  } else {
    await db.insert(scratchCards).values({
      productId,
      title: data.title,
      prizes: items,
    });
  }

  revalidatePath(`/dashboard/products/${productId}`);
}

export async function toggleBonusGameActive(
  kind: BonusGameKind,
  id: string,
  productId: string,
  isActive: boolean,
) {
  const user = await requireUser();
  await assertOwnsProduct(productId, user.tenantId);

  const table =
    kind === "awardedBox" ? awardedBoxes : kind === "rewardSpin" ? rewardSpins : scratchCards;
  await db.update(table).set({ isActive }).where(eq(table.id, id));

  revalidatePath(`/dashboard/products/${productId}`);
}

export async function createBonusGameCombo(
  kind: BonusGameKind,
  parentId: string,
  productId: string,
  input: BonusGameComboInput,
) {
  const user = await requireUser();
  await assertOwnsProduct(productId, user.tenantId);
  const data = bonusGameComboSchema.parse(input);
  const price = data.price.toFixed(2);

  if (kind === "awardedBox") {
    await db
      .insert(awardedBoxCombos)
      .values({ awardedBoxId: parentId, quantity: data.quantity, price });
  } else if (kind === "rewardSpin") {
    await db
      .insert(rewardSpinCombos)
      .values({ rewardSpinId: parentId, quantity: data.quantity, price });
  } else {
    await db
      .insert(scratchCardCombos)
      .values({ scratchCardId: parentId, quantity: data.quantity, price });
  }

  revalidatePath(`/dashboard/products/${productId}`);
}
