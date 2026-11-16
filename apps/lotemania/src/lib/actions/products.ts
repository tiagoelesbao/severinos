"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, productNumbers } from "@/db/schema";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { slugify } from "@/lib/slugify";
import { requireUser } from "@/lib/auth/require-user";

export async function createProduct(input: ProductInput) {
  const user = await requireUser();
  const data = productSchema.parse(input);

  const slug = `${slugify(data.title)}-${Date.now().toString(36)}`;

  const [product] = await db
    .insert(products)
    .values({
      tenantId: user.tenantId,
      title: data.title,
      slug,
      description: data.description || null,
      category: data.category || null,
      privacy: data.privacy,
      pricePerNumber: data.pricePerNumber.toFixed(2),
      totalNumbers: data.totalNumbers,
      drawDate: data.drawDate ? new Date(data.drawDate) : null,
      imageUrl: data.imageUrl || null,
      status: "draft",
    })
    .returning();

  // Generate the sellable ticket numbers in bulk (0..totalNumbers-1).
  const rows = Array.from({ length: data.totalNumbers }, (_, i) => ({
    productId: product.id,
    number: i,
  }));
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(productNumbers).values(rows.slice(i, i + BATCH));
  }

  revalidatePath("/dashboard/products");
  redirect(`/dashboard/products/${product.id}`);
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const user = await requireUser();
  const data = productSchema.partial().parse(input);

  await db
    .update(products)
    .set({
      ...(data.title && { title: data.title }),
      ...(data.slug && { slug: data.slug }),
      ...(data.description !== undefined && {
        description: data.description || null,
      }),
      ...(data.category !== undefined && { category: data.category || null }),
      ...(data.privacy && { privacy: data.privacy }),
      ...(data.pricePerNumber !== undefined && {
        pricePerNumber: data.pricePerNumber.toFixed(2),
      }),
      ...(data.drawDate !== undefined && {
        drawDate: data.drawDate ? new Date(data.drawDate) : null,
      }),
      ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl || null }),
      updatedAt: new Date(),
    })
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)));

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
}

export async function setProductStatus(
  id: string,
  status: "draft" | "active" | "finished" | "canceled",
) {
  const user = await requireUser();
  await db
    .update(products)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)));
  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${id}`);
}

export async function deleteProduct(id: string) {
  const user = await requireUser();
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)));
  revalidatePath("/dashboard/products");
}

export async function toggleProductFavorite(id: string) {
  const user = await requireUser();
  const [product] = await db
    .select({ isFavorite: products.isFavorite })
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)))
    .limit(1);
  if (!product) return;
  await db
    .update(products)
    .set({ isFavorite: !product.isFavorite })
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)));
  revalidatePath("/dashboard/products");
}

export async function duplicateProduct(id: string) {
  const user = await requireUser();
  const [source] = await db
    .select()
    .from(products)
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)))
    .limit(1);
  if (!source) return;

  const slug = `${slugify(source.title)}-copia-${Date.now().toString(36)}`;
  const [copy] = await db
    .insert(products)
    .values({
      tenantId: user.tenantId,
      title: `${source.title} (cópia)`,
      slug,
      description: source.description,
      category: source.category,
      privacy: source.privacy,
      pricePerNumber: source.pricePerNumber,
      totalNumbers: source.totalNumbers,
      drawDate: source.drawDate,
      imageUrl: source.imageUrl,
      advancedSettings: source.advancedSettings,
      status: "draft",
    })
    .returning();

  const rows = Array.from({ length: source.totalNumbers }, (_, i) => ({
    productId: copy.id,
    number: i,
  }));
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(productNumbers).values(rows.slice(i, i + BATCH));
  }

  revalidatePath("/dashboard/products");
  return copy.id;
}
