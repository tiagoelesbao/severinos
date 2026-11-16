"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { settings, communications } from "@/db/schema";
import {
  settingsSchema,
  communicationSchema,
  type SettingsInput,
  type CommunicationInput,
} from "@/lib/validations/settings";
import { siteConfigSchema, type SiteConfig } from "@/lib/validations/site-config";
import { requireAdmin, requireUser } from "@/lib/auth/require-user";

export async function updateSettings(input: SettingsInput) {
  const admin = await requireAdmin();
  const data = settingsSchema.parse(input);

  await db
    .insert(settings)
    .values({
      tenantId: admin.tenantId,
      siteName: data.siteName,
      logoUrl: data.logoUrl || null,
      twoFactorRequired: data.twoFactorRequired,
      captchaEnabled: data.captchaEnabled,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.tenantId,
      set: {
        siteName: data.siteName,
        logoUrl: data.logoUrl || null,
        twoFactorRequired: data.twoFactorRequired,
        captchaEnabled: data.captchaEnabled,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard/settings");
}

export async function updateSiteConfig(input: SiteConfig) {
  const admin = await requireAdmin();
  const data = siteConfigSchema.parse(input);

  await db
    .insert(settings)
    .values({ tenantId: admin.tenantId, siteConfig: data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.tenantId,
      set: { siteConfig: data, updatedAt: new Date() },
    });

  revalidatePath("/dashboard/settings");
}

export async function createCommunication(input: CommunicationInput) {
  const user = await requireUser();
  const data = communicationSchema.parse(input);
  await db.insert(communications).values({ ...data, tenantId: user.tenantId });
  revalidatePath("/dashboard/communications");
}

export async function toggleCommunicationActive(id: string, isActive: boolean) {
  const user = await requireUser();
  await db
    .update(communications)
    .set({ isActive })
    .where(
      and(eq(communications.id, id), eq(communications.tenantId, user.tenantId)),
    );
  revalidatePath("/dashboard/communications");
}
