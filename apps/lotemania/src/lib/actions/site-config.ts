"use server";

import { eq, and, asc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { faqs, utmLinks, sitePages, settings, tenants } from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/auth/require-user";

// --- FAQ ---

export async function createFaq(question: string, answer: string) {
  const user = await requireAdmin();
  await db.insert(faqs).values({ tenantId: user.tenantId, question, answer });
  revalidatePath("/dashboard/faq");
}

export async function deleteFaq(id: string) {
  const user = await requireAdmin();
  await db.delete(faqs).where(and(eq(faqs.id, id), eq(faqs.tenantId, user.tenantId)));
  revalidatePath("/dashboard/faq");
}

export async function toggleFaqActive(id: string, isActive: boolean) {
  const user = await requireAdmin();
  await db
    .update(faqs)
    .set({ isActive })
    .where(and(eq(faqs.id, id), eq(faqs.tenantId, user.tenantId)));
  revalidatePath("/dashboard/faq");
}

// --- UTM links ---

export async function createUtmLink(input: {
  name: string;
  destinationPath: string;
  source: string;
  medium: string;
  campaign: string;
}) {
  const user = await requireAdmin();
  await db.insert(utmLinks).values({ tenantId: user.tenantId, ...input });
  revalidatePath("/dashboard/utm-links");
}

export async function deleteUtmLink(id: string) {
  const user = await requireAdmin();
  await db
    .delete(utmLinks)
    .where(and(eq(utmLinks.id, id), eq(utmLinks.tenantId, user.tenantId)));
  revalidatePath("/dashboard/utm-links");
}

export async function registerUtmClick(tenantSlug: string, linkId: string) {
  const [tenant] = await db
    .select({ id: tenants.id })
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant) return;
  const [link] = await db
    .select({ clicks: utmLinks.clicks })
    .from(utmLinks)
    .where(and(eq(utmLinks.id, linkId), eq(utmLinks.tenantId, tenant.id)))
    .limit(1);
  if (!link) return;
  await db
    .update(utmLinks)
    .set({ clicks: link.clicks + 1 })
    .where(eq(utmLinks.id, linkId));
}

// --- Static legal/info pages ---

export async function upsertSitePage(slug: string, title: string, content: string) {
  const user = await requireAdmin();
  await db
    .insert(sitePages)
    .values({ tenantId: user.tenantId, slug, title, content, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [sitePages.tenantId, sitePages.slug],
      set: { title, content, updatedAt: new Date() },
    });
  revalidatePath(`/dashboard/legal/${slug}`);
}

export async function getSitePage(tenantId: string, slug: string) {
  const [row] = await db
    .select()
    .from(sitePages)
    .where(and(eq(sitePages.tenantId, tenantId), eq(sitePages.slug, slug)))
    .limit(1);
  return row ?? null;
}

// --- Social media links (settings.socialMedias) ---

export async function updateSocialMedias(data: Record<string, string>) {
  const admin = await requireAdmin();
  await db
    .insert(settings)
    .values({ tenantId: admin.tenantId, socialMedias: data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.tenantId,
      set: { socialMedias: data, updatedAt: new Date() },
    });
  revalidatePath("/dashboard/social");
}

// --- Theme (settings.themeConfig) ---

export async function updateThemeConfig(data: {
  accentColor: string;
  background: string;
  panelBackground: string;
}) {
  const admin = await requireAdmin();
  await db
    .insert(settings)
    .values({ tenantId: admin.tenantId, themeConfig: data, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: settings.tenantId,
      set: { themeConfig: data, updatedAt: new Date() },
    });
  revalidatePath("/dashboard/theme");
}

// --- Philanthropy ---

export async function updatePhilanthropy(enabled: boolean, description: string) {
  const admin = await requireAdmin();
  await db
    .insert(settings)
    .values({
      tenantId: admin.tenantId,
      philanthropyEnabled: enabled,
      philanthropyDescription: description,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.tenantId,
      set: {
        philanthropyEnabled: enabled,
        philanthropyDescription: description,
        updatedAt: new Date(),
      },
    });
  revalidatePath("/dashboard/philanthropy");
}

// --- Custom domain / certificate ---

export async function updateCustomDomain(domain: string) {
  const admin = await requireAdmin();
  await db
    .update(tenants)
    .set({ customDomain: domain || null, customDomainVerified: false })
    .where(eq(tenants.id, admin.tenantId));
  revalidatePath("/dashboard/certificate");
}
