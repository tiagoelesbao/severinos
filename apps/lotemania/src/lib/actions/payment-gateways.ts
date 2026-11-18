"use server";

import { revalidatePath } from "next/cache";

import {
  savePaymentGatewayForTenant,
  setPaymentGatewayActiveForTenant,
} from "@/lib/payments/gateway-config";
import { type PaymentGatewayInput } from "@/lib/validations/payment-gateway";
import { requireAdmin } from "@/lib/auth/require-user";

// ⚠️ Toda exportação deste arquivo é um endpoint chamável pelo cliente (é o
// que `"use server"` significa). Por isso ele é só a casca de autorização:
// a decisão de gravação mora em `lib/payments/gateway-config.ts`, que não é
// `"use server"` e portanto não é exposto.

export async function savePaymentGateway(input: PaymentGatewayInput) {
  const user = await requireAdmin();
  await savePaymentGatewayForTenant(user.tenantId, input);
  revalidatePath("/dashboard/integrations/payments");
}

export async function togglePaymentGatewayActive(
  provider: string,
  isActive: boolean,
) {
  const user = await requireAdmin();
  await setPaymentGatewayActiveForTenant(user.tenantId, provider, isActive);
  revalidatePath("/dashboard/integrations/payments");
}
