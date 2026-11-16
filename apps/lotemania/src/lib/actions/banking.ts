"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { bankAccounts, paymentRequests } from "@/db/schema";
import { bankAccountSchema, type BankAccountInput } from "@/lib/validations/payment-gateway";
import { requireUser, requireAdmin } from "@/lib/auth/require-user";

export async function createBankAccount(input: BankAccountInput) {
  const user = await requireUser();
  const data = bankAccountSchema.parse(input);
  await db.insert(bankAccounts).values({ ...data, tenantId: user.tenantId });
  revalidatePath("/dashboard/transactions");
}

export async function setPaymentRequestStatus(
  id: string,
  status: "approved" | "rejected" | "paid",
) {
  const user = await requireAdmin();
  await db
    .update(paymentRequests)
    .set({
      status,
      // O ternario anterior era `status === "pending" ? null : new Date()`:
      // ramo morto, porque esta funcao so aceita approved | rejected | paid.
      // "pending" e o default da coluna, atribuido na criacao da solicitacao,
      // nunca por aqui. Os tres status que chegam aqui sao todos terminais, e
      // todos devem carimbar a data — que e o que o codigo ja fazia de fato.
      processedAt: new Date(),
    })
    .where(
      and(eq(paymentRequests.id, id), eq(paymentRequests.tenantId, user.tenantId)),
    );
  revalidatePath("/dashboard/transactions");
}
