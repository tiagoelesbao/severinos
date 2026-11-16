"use server";

import { eq, and, or } from "drizzle-orm";
import { db } from "@/db";
import { tenants, users } from "@/db/schema";
import { signupSchema, type SignupInput } from "@/lib/validations/signup";
import { hashPassword } from "@/lib/auth/password";

export async function signupCustomer(tenantSlug: string, input: SignupInput) {
  const data = signupSchema.parse(input);

  const [tenant] = await db
    .select()
    .from(tenants)
    .where(eq(tenants.slug, tenantSlug))
    .limit(1);
  if (!tenant || !tenant.isActive) return { error: "Operador não encontrado." };

  // A buyer who already reserved numbers via the phone-only quick
  // checkout has a bare guest row (phone, no password). Completing
  // Cadastro fills that same row in rather than creating a duplicate.
  const [existing] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.tenantId, tenant.id),
        or(eq(users.phone, data.phone), eq(users.email, data.email.toLowerCase())),
      ),
    )
    .limit(1);

  if (existing?.passwordHash) {
    return { error: "Já existe uma conta com este telefone ou email." };
  }

  const passwordHash = await hashPassword(data.password);
  const values = {
    name: data.name,
    socialName: data.socialName || null,
    cpf: data.cpf,
    phone: data.phone,
    email: data.email.toLowerCase(),
    birthDate: new Date(data.birthDate),
    zipCode: data.zipCode,
    street: data.street,
    addressNumber: data.addressNumber,
    neighborhood: data.neighborhood,
    state: data.state,
    city: data.city,
    complement: data.complement || null,
    passwordHash,
  };

  if (existing) {
    await db.update(users).set(values).where(eq(users.id, existing.id));
  } else {
    await db.insert(users).values({ tenantId: tenant.id, role: "subscriber", ...values });
  }

  return { ok: true };
}
