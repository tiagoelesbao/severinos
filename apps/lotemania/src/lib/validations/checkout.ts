import { z } from "zod";

export const checkoutSchema = z.object({
  tenantSlug: z.string().min(1),
  productSlug: z.string().min(1),
  quantity: z.coerce.number().int().positive().max(1000),
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email(),
  phone: z.string().min(8, "Telefone inválido"),
  cpf: z.string().min(11, "CPF inválido"),
});
export type CheckoutInput = z.infer<typeof checkoutSchema>;
