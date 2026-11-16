"use server";

import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { tenants, users, affiliates } from "@/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { z } from "zod";

const affiliateSignupSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().min(8),
});

export async function signupAffiliate(
  tenantSlug: string,
  input: z.infer<typeof affiliateSignupSchema>,
) {
  const data = affiliateSignupSchema.parse(input);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
  if (!tenant) return { error: "Operador não encontrado." };

  const [existingByEmail] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.email, data.email.toLowerCase())))
    .limit(1);

  let userId: string;
  if (existingByEmail) {
    userId = existingByEmail.id;
    await db.update(users).set({ role: "affiliate" }).where(eq(users.id, userId));
  } else {
    const [newUser] = await db
      .insert(users)
      .values({
        tenantId: tenant.id,
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash: await hashPassword(randomBytes(16).toString("base64url")),
        role: "affiliate",
        affiliateCode: randomBytes(4).toString("hex"),
      })
      .returning();
    userId = newUser.id;
  }

  const [existingAffiliate] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.userId, userId))
    .limit(1);
  if (existingAffiliate) return { error: "Este email já está cadastrado como afiliado." };

  await db.insert(affiliates).values({ tenantId: tenant.id, userId });

  return { ok: true };
}

export async function getAffiliateByPhone(tenantSlug: string, phone: string) {
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
  if (!tenant) return { error: "Operador não encontrado." };

  const [user] = await db
    .select()
    .from(users)
    .where(and(eq(users.tenantId, tenant.id), eq(users.phone, phone)))
    .limit(1);
  if (!user) return { affiliate: null };

  const [affiliate] = await db
    .select()
    .from(affiliates)
    .where(eq(affiliates.userId, user.id))
    .limit(1);
  if (!affiliate) return { affiliate: null };

  return {
    affiliate: {
      code: user.affiliateCode,
      commissionRate: affiliate.commissionRate,
      totalSales: affiliate.totalSales,
      totalCommission: affiliate.totalCommission,
      isActive: affiliate.isActive,
    },
  };
}
