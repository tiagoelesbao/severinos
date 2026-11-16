"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { products } from "@/db/schema";
import {
  productAdvancedSettingsSchema,
  type ProductAdvancedSettings,
} from "@/lib/validations/product-settings";
import { requireUser } from "@/lib/auth/require-user";

export async function updateProductSettings(
  productId: string,
  settings: ProductAdvancedSettings,
) {
  const user = await requireUser();
  const data = productAdvancedSettingsSchema.parse(settings);

  await db
    .update(products)
    .set({ advancedSettings: data, updatedAt: new Date() })
    .where(and(eq(products.id, productId), eq(products.tenantId, user.tenantId)));

  revalidatePath(`/dashboard/products/${productId}`);
}
