import { z } from "zod";

export const affiliateSchema = z.object({
  name: z.string().min(3, "Nome muito curto"),
  email: z.string().email(),
  phone: z.string().optional(),
  commissionRate: z.coerce.number().min(0).max(100).default(10),
});

export type AffiliateInput = z.infer<typeof affiliateSchema>;

export const discountLinkSchema = z.object({
  title: z.string().min(2, "Título muito curto"),
  code: z
    .string()
    .min(3)
    .regex(/^[a-zA-Z0-9_-]+$/, "Use apenas letras, números, - e _"),
  productId: z.string().uuid().optional().or(z.literal("")),
  affiliateId: z.string().uuid().optional().or(z.literal("")),
  discountPercent: z.coerce.number().min(0).max(100).optional(),
  checkoutType: z.enum(["direto", "manual"]).default("direto"),
  ticketQuantity: z.coerce.number().int().min(0).default(0),
  minQuantity: z.coerce.number().int().min(1).default(1),
  usageLimit: z.coerce.number().int().min(0).default(0),
  perUserLimit: z.coerce.number().int().min(0).default(0),
});

export type DiscountLinkInput = z.infer<typeof discountLinkSchema>;
