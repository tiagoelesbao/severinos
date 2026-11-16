"use server";

import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { users, affiliates, discountLinks } from "@/db/schema";
import {
  affiliateSchema,
  discountLinkSchema,
  type AffiliateInput,
  type DiscountLinkInput,
} from "@/lib/validations/affiliate";
import { hashPassword } from "@/lib/auth/password";
import { requireUser } from "@/lib/auth/require-user";

export async function createAffiliate(input: AffiliateInput) {
  const user = await requireUser();
  const data = affiliateSchema.parse(input);

  const [existingUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.tenantId, user.tenantId),
        eq(users.email, data.email.toLowerCase()),
      ),
    )
    .limit(1);

  let userId: string;
  if (existingUser) {
    userId = existingUser.id;
    await db
      .update(users)
      .set({ role: "affiliate" })
      .where(eq(users.id, userId));
  } else {
    const tempPassword = randomBytes(12).toString("base64url");
    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: user.tenantId,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone || null,
        passwordHash: await hashPassword(tempPassword),
        role: "affiliate",
        affiliateCode: randomBytes(4).toString("hex"),
      })
      .returning();
    userId = newUser.id;
  }

  await db.insert(affiliates).values({
    tenantId: user.tenantId,
    userId,
    commissionRate: data.commissionRate.toFixed(2),
  });

  revalidatePath("/dashboard/affiliates");
}

export async function toggleAffiliateActive(id: string, isActive: boolean) {
  const user = await requireUser();
  await db
    .update(affiliates)
    .set({ isActive })
    .where(and(eq(affiliates.id, id), eq(affiliates.tenantId, user.tenantId)));
  revalidatePath("/dashboard/affiliates");
}

export async function createDiscountLink(input: DiscountLinkInput) {
  const user = await requireUser();
  const data = discountLinkSchema.parse(input);

  await db.insert(discountLinks).values({
    tenantId: user.tenantId,
    title: data.title,
    code: data.code,
    productId: data.productId || null,
    affiliateId: data.affiliateId || null,
    discountPercent:
      data.discountPercent !== undefined
        ? data.discountPercent.toFixed(2)
        : null,
    checkoutType: data.checkoutType,
    ticketQuantity: data.ticketQuantity,
    minQuantity: data.minQuantity,
    usageLimit: data.usageLimit,
    perUserLimit: data.perUserLimit,
  });

  revalidatePath("/dashboard/discount-links");
}

export async function toggleDiscountLinkActive(id: string, isActive: boolean) {
  const user = await requireUser();
  await db
    .update(discountLinks)
    .set({ isActive })
    .where(
      and(
        eq(discountLinks.id, id),
        eq(discountLinks.tenantId, user.tenantId),
      ),
    );
  revalidatePath("/dashboard/discount-links");
}
