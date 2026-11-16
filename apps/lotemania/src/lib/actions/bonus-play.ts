"use server";

import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import {
  tenants,
  users,
  bonusGamePlays,
  bankingTransactions,
  awardedBoxes,
  awardedBoxCombos,
  rewardSpins,
  rewardSpinCombos,
  scratchCards,
  scratchCardCombos,
} from "@/db/schema";
import { z } from "zod";

const kindTables = {
  awardedBox: { parent: awardedBoxes, combo: awardedBoxCombos, comboParentCol: "awardedBoxId" },
  rewardSpin: { parent: rewardSpins, combo: rewardSpinCombos, comboParentCol: "rewardSpinId" },
  scratchCard: { parent: scratchCards, combo: scratchCardCombos, comboParentCol: "scratchCardId" },
} as const;

const purchaseSchema = z.object({
  tenantSlug: z.string(),
  kind: z.enum(["awardedBox", "rewardSpin", "scratchCard"]),
  comboId: z.string().uuid(),
  phone: z.string().min(8),
});

export async function purchaseBonusGamePlay(input: z.infer<typeof purchaseSchema>) {
  const data = purchaseSchema.parse(input);

  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, data.tenantSlug)).limit(1);
  if (!tenant) return { error: "Operador não encontrado." };

  const tables = kindTables[data.kind];
  const [combo] = await db
    .select()
    .from(tables.combo)
    .where(eq(tables.combo.id, data.comboId))
    .limit(1);
  if (!combo) return { error: "Combo não encontrado." };

  const parentId = (combo as unknown as Record<string, string>)[tables.comboParentCol];

  const [existingUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.phone, data.phone)))
    .limit(1);

  const userId = existingUser
    ? existingUser.id
    : (
        await db
          .insert(users)
          .values({ tenantId: tenant.id, phone: data.phone, role: "subscriber" })
          .returning()
      )[0].id;

  const [play] = await db
    .insert(bonusGamePlays)
    .values({
      tenantId: tenant.id,
      userId,
      kind: data.kind,
      parentId,
      comboId: combo.id,
      quantity: combo.quantity,
      amount: combo.price,
      status: "pending",
    })
    .returning();

  return { playId: play.id };
}

// Dev/test-only, mirrors simulatePayment for raffle orders: marks the
// play paid and draws its outcome server-side from the configured
// items/prizes/segments — never from anything the client sent.
export async function simulateBonusGamePaymentAndReveal(playId: string) {
  const [play] = await db.select().from(bonusGamePlays).where(eq(bonusGamePlays.id, playId)).limit(1);
  if (!play || play.status !== "pending") return { error: "Jogada inválida." };

  const tables = kindTables[play.kind as keyof typeof kindTables];
  const [parent] = await db
    .select()
    .from(tables.parent)
    .where(eq(tables.parent.id, play.parentId))
    .limit(1);
  if (!parent) return { error: "Jogo não encontrado." };

  const pool = (("prizes" in parent ? parent.prizes : parent.segments) as string[]) ?? [];
  const outcome = Array.from({ length: play.quantity }, () =>
    pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : "Sem prêmio desta vez",
  );

  await db
    .update(bonusGamePlays)
    .set({ status: "paid", paidAt: new Date(), outcome })
    .where(eq(bonusGamePlays.id, playId));

  await db.insert(bankingTransactions).values({
    tenantId: play.tenantId,
    type: "credit",
    amount: play.amount,
    description: `Pagamento simulado — jogo bônus (${play.kind})`,
  });

  return { outcome };
}

export async function getBonusGamePlay(playId: string) {
  const [play] = await db.select().from(bonusGamePlays).where(eq(bonusGamePlays.id, playId)).limit(1);
  return play ?? null;
}
