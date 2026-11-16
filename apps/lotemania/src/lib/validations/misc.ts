import { z } from "zod";

export const capitalizerSchema = z.object({
  name: z.string().min(2),
  susepProcessNumber: z.string().optional(),
  terms: z.string().optional(),
});
export type CapitalizerInput = z.infer<typeof capitalizerSchema>;

export const blockedNumberSchema = z.object({
  phone: z.string().min(8),
  reason: z.string().optional(),
});
export type BlockedNumberInput = z.infer<typeof blockedNumberSchema>;

export const createUserSchema = z.object({
  name: z.string().min(3),
  email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8, "Mínimo 8 caracteres"),
  role: z.enum(["admin", "operator", "affiliate", "subscriber"]),
});
export type CreateUserInput = z.infer<typeof createUserSchema>;
