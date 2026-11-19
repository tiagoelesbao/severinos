"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { products, productNumbers } from "@/db/schema";
import { setRaffleDivisibilityForTenant } from "@/lib/raffles/divisibility";
import {
  divisibilityRefusalFor,
  halvesPerTitleOf,
  productSchema,
  type ProductInput,
} from "@/lib/validations/product";
import { productAdvancedSettingsSchema } from "@/lib/validations/product-settings";
import { slugify } from "@/lib/slugify";
import { requireUser } from "@/lib/auth/require-user";

// ════════════════════════════════════════════════════════════════════════
// A GERAÇÃO DOS TÍTULOS CONTA UNIDADES VENDÁVEIS, NÃO TÍTULOS (LTM-07)
//
// `total_numbers` é quantos TÍTULOS o sorteio tem. As linhas de
// `product_numbers` são uma por UNIDADE VENDÁVEL (ADR-0001): num sorteio
// divisível, 100 títulos são 200 linhas, com `half` 1 e 2.
//
// Gerar uma linha por título num sorteio divisível é o defeito que não
// aparece em teste de caminho feliz: a reserva de metade encontraria só a
// metade 1, a metade 2 nunca existiria, e metade do estoque simplesmente
// não estaria à venda.
// ════════════════════════════════════════════════════════════════════════

/** As linhas de `product_numbers` de um sorteio, na unidade dele. */
function unitRowsFor(opts: {
  productId: string;
  totalNumbers: number;
  isDivisible: boolean;
}): { productId: string; number: number; half: number }[] {
  const halves = halvesPerTitleOf({ isDivisible: opts.isDivisible });
  const rows: { productId: string; number: number; half: number }[] = [];
  // Numeração de 0 a totalNumbers-1 — é como esta base sempre gerou, e o
  // seed da suíte depende disso (`tests/helpers/seed.ts:18-19`).
  for (let number = 0; number < opts.totalNumbers; number += 1) {
    for (let half = 1; half <= halves; half += 1) {
      rows.push({ productId: opts.productId, number, half });
    }
  }
  return rows;
}

async function insertUnitRows(
  rows: { productId: string; number: number; half: number }[],
) {
  const BATCH = 1000;
  for (let i = 0; i < rows.length; i += BATCH) {
    await db.insert(productNumbers).values(rows.slice(i, i + BATCH));
  }
}

export async function createProduct(input: ProductInput) {
  const user = await requireUser();
  const data = productSchema.parse(input);

  // O prêmio declarado na criação, na forma em que a aba Prêmios o guarda.
  // `undefined` nos dois campos = nada declarado, e o sorteio nasce com
  // `advanced_settings = {}` como sempre nasceu.
  const declarouPremio =
    data.prizeKind !== undefined || data.prizeAmount !== undefined;
  const advancedSettings = declarouPremio
    ? productAdvancedSettingsSchema.parse({
        ...(data.prizeKind !== undefined ? { prizeKind: data.prizeKind } : {}),
        ...(data.prizeAmount !== undefined ? { prizeAmount: data.prizeAmount } : {}),
      })
    : null;

  // ⚠️ AC10/AC12 TAMBÉM NA CRIAÇÃO.
  //
  // `setProductDivisibility` é a porta normal, e é onde o congelamento vive
  // (AC9 — um sorteio recém-criado não tem venda, então o congelamento não
  // se aplica aqui). Mas nascer divisível sem passar pelas recusas de prêmio
  // seria a porta dos fundos: o sorteio chegaria ao primeiro rateio com um
  // prêmio que não fecha, e aí o erro cai sobre o ganhador.
  if (data.isDivisible) {
    const recusa = divisibilityRefusalFor({
      prize: {
        prizeKind: advancedSettings?.prizeKind ?? "other",
        prizeAmount: advancedSettings?.prizeAmount ?? null,
      },
      pricePerNumber: data.pricePerNumber.toFixed(2),
    });
    // Lançar, e não devolver `{ error }`: esta função já comunica entrada
    // inválida lançando (`productSchema.parse` acima), e termina em
    // `redirect`, que também lança. Um canal só.
    if (recusa) throw new Error(recusa.message);
  }

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
      isDivisible: data.isDivisible,
      drawDate: data.drawDate ? new Date(data.drawDate) : null,
      imageUrl: data.imageUrl || null,
      status: "draft",
      ...(advancedSettings ? { advancedSettings } : {}),
    })
    .returning();

  await insertUnitRows(
    unitRowsFor({
      productId: product.id,
      totalNumbers: data.totalNumbers,
      isDivisible: data.isDivisible,
    }),
  );

  revalidatePath("/dashboard/products");
  redirect(`/dashboard/products/${product.id}`);
}

export async function updateProduct(id: string, input: Partial<ProductInput>) {
  const user = await requireUser();
  const data = productSchema.partial().parse(input);

  // ⚠️ `isDivisible` NÃO entra neste `set`, e a omissão é a regra.
  //
  // Mudar a divisibilidade reescreve `product_numbers` e tem de passar pelo
  // congelamento (AC9) e pelas recusas de prêmio (AC10, AC12). Um
  // `...(data.isDivisible !== undefined && { isDivisible: data.isDivisible })`
  // aqui pareceria coerente com as linhas abaixo e seria a forma exata de
  // contornar as três: o booleano viraria `true` e o estoque continuaria com
  // uma linha por título. A porta é `setProductDivisibility`.
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

/**
 * A ÚNICA porta que liga e desliga a meia cota de um sorteio (LTM-07).
 *
 * Casca: autoriza, delega e revalida a tela. A decisão inteira — o
 * congelamento (AC9), a recusa de prêmio não monetário (AC10) e a de prêmio
 * indivisível (AC12), mais a reescrita das linhas de `product_numbers` —
 * mora em `lib/raffles/divisibility.ts`, para ser verificável contra o
 * Postgres de verdade sem mockar `cookies()`. Mesmo desenho de
 * `lib/payments/gateway-config.ts`.
 *
 * Devolve a recusa em vez de lançar: o operador precisa LER por que não deu,
 * e o motivo nomeado é metade do AC.
 */
export async function setProductDivisibility(productId: string, isDivisible: boolean) {
  const user = await requireUser();
  const result = await setRaffleDivisibilityForTenant({
    tenantId: user.tenantId,
    productId,
    isDivisible,
  });

  if (!result.ok) return { error: result.refusal.message, code: result.refusal.code };

  revalidatePath("/dashboard/products");
  revalidatePath(`/dashboard/products/${productId}`);
  return {
    isDivisible: result.isDivisible,
    changed: result.changed,
    sellableUnits: result.sellableUnits,
  };
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
      // ⚠️ A CÓPIA HERDA A DIVISIBILIDADE, e antes não herdava.
      //
      // `advanced_settings` já era copiado — com o prêmio dentro —, mas
      // `is_divisible` ficava no default `false`. Duplicar um sorteio
      // divisível produzia um sorteio de cota inteira com a configuração de
      // prêmio de um divisível, e o operador só descobriria quando a grade
      // partida não aparecesse.
      isDivisible: source.isDivisible,
      drawDate: source.drawDate,
      imageUrl: source.imageUrl,
      advancedSettings: source.advancedSettings,
      status: "draft",
    })
    .returning();

  await insertUnitRows(
    unitRowsFor({
      productId: copy.id,
      totalNumbers: source.totalNumbers,
      isDivisible: source.isDivisible,
    }),
  );

  revalidatePath("/dashboard/products");
  return copy.id;
}
