"use server";

import { eq, and } from "drizzle-orm";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { integrations, outboundWebhooks } from "@/db/schema";
import {
  integrationSchema,
  outboundWebhookSchema,
  type IntegrationInput,
  type OutboundWebhookInput,
} from "@/lib/validations/integration";
import { encryptSecret } from "@/lib/crypto";
import { requireAdmin, requireUser } from "@/lib/auth/require-user";

export async function saveIntegration(input: IntegrationInput) {
  const admin = await requireAdmin();
  const data = integrationSchema.parse(input);

  await db
    .insert(integrations)
    .values({
      tenantId: admin.tenantId,
      provider: data.provider,
      credentialsEncrypted: encryptSecret(data.apiKey),
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [integrations.tenantId, integrations.provider],
      set: {
        credentialsEncrypted: encryptSecret(data.apiKey),
        isActive: true,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard/integrations");
}

export async function toggleIntegrationActive(provider: string, isActive: boolean) {
  const admin = await requireAdmin();
  await db
    .update(integrations)
    .set({ isActive, updatedAt: new Date() })
    .where(
      and(
        eq(integrations.provider, provider as never),
        eq(integrations.tenantId, admin.tenantId),
      ),
    );
  revalidatePath("/dashboard/integrations");
}

export async function createOutboundWebhook(input: OutboundWebhookInput) {
  const user = await requireUser();
  const data = outboundWebhookSchema.parse(input);

  await db.insert(outboundWebhooks).values({
    tenantId: user.tenantId,
    url: data.url,
    events: data.events,
    secret: randomBytes(24).toString("base64url"),
  });

  revalidatePath("/dashboard/integrations/webhooks");
}

export async function toggleOutboundWebhookActive(id: string, isActive: boolean) {
  const user = await requireUser();
  await db
    .update(outboundWebhooks)
    .set({ isActive })
    .where(
      and(eq(outboundWebhooks.id, id), eq(outboundWebhooks.tenantId, user.tenantId)),
    );
  revalidatePath("/dashboard/integrations/webhooks");
}

export async function deleteOutboundWebhook(id: string) {
  const user = await requireUser();
  await db
    .delete(outboundWebhooks)
    .where(
      and(eq(outboundWebhooks.id, id), eq(outboundWebhooks.tenantId, user.tenantId)),
    );
  revalidatePath("/dashboard/integrations/webhooks");
}
