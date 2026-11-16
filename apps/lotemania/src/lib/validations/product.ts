import { z } from "zod";

export const productSchema = z.object({
  title: z.string().min(3, "Título muito curto"),
  slug: z.string().min(3, "URL muito curta").optional(),
  description: z.string().optional(),
  category: z.string().optional(),
  privacy: z.enum(["public", "private"]).default("public"),
  pricePerNumber: z.coerce.number().positive("Preço deve ser positivo"),
  totalNumbers: z.coerce
    .number()
    .int()
    .positive("Quantidade de números deve ser positiva"),
  drawDate: z.string().optional(),
  imageUrl: z.string().url().optional().or(z.literal("")),
});

/** Values the form holds before zod coercion/defaults run. */
export type ProductFormInput = z.input<typeof productSchema>;
export type ProductInput = z.output<typeof productSchema>;
