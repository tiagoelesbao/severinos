"use server";

import { eq } from "drizzle-orm";
import { db } from "@/db";
import { tenants, contacts } from "@/db/schema";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  category: z.enum(["outro", "vendas", "suporte", "reclamacao"]).default("outro"),
  message: z.string().min(5),
});

export async function sendContactMessage(tenantSlug: string, input: z.infer<typeof contactSchema>) {
  const data = contactSchema.parse(input);
  const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, tenantSlug)).limit(1);
  if (!tenant) return { error: "Operador não encontrado." };

  await db.insert(contacts).values({
    tenantId: tenant.id,
    name: data.name,
    email: data.email || null,
    phone: data.phone || null,
    category: data.category,
    message: data.message,
  });

  return { ok: true };
}
