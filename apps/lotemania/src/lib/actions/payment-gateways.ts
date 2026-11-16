"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { paymentGateways } from "@/db/schema";
import {
  paymentGatewaySchema,
  type PaymentGatewayInput,
} from "@/lib/validations/payment-gateway";
import { encryptSecret } from "@/lib/crypto";
import { requireAdmin } from "@/lib/auth/require-user";

export async function savePaymentGateway(input: PaymentGatewayInput) {
  const user = await requireAdmin();
  const data = paymentGatewaySchema.parse(input);

  await db
    .insert(paymentGateways)
    .values({
      tenantId: user.tenantId,
      provider: data.provider,
      credentialsEncrypted: encryptSecret(data.apiKey),
      webhookSecret: data.webhookSecret,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: [paymentGateways.tenantId, paymentGateways.provider],
      set: {
        credentialsEncrypted: encryptSecret(data.apiKey),
        webhookSecret: data.webhookSecret,
        isActive: true,
        updatedAt: new Date(),
      },
    });

  revalidatePath("/dashboard/integrations/payments");
}

export async function togglePaymentGatewayActive(
  provider: string,
  isActive: boolean,
) {
  const user = await requireAdmin();
  await db
    .update(paymentGateways)
    .set({ isActive, updatedAt: new Date() })
    .where(
      and(
        eq(paymentGateways.provider, provider as never),
        eq(paymentGateways.tenantId, user.tenantId),
      ),
    );
  revalidatePath("/dashboard/integrations/payments");
}
