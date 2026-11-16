import { z } from "zod";

export const reserveNumbersSchema = z.object({
  tenantSlug: z.string().min(1),
  productSlug: z.string().min(1),
  numbers: z.array(z.number().int().min(0)).min(1, "Selecione ao menos um número"),
  phone: z.string().min(8, "Telefone inválido"),
});
export type ReserveNumbersInput = z.infer<typeof reserveNumbersSchema>;
