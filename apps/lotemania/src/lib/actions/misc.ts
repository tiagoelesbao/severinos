"use server";

import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import {
  capitalizers,
  blockedNumbers,
  contacts,
  users,
} from "@/db/schema";
import {
  capitalizerSchema,
  blockedNumberSchema,
  createUserSchema,
  type CapitalizerInput,
  type BlockedNumberInput,
  type CreateUserInput,
} from "@/lib/validations/misc";
import { hashPassword } from "@/lib/auth/password";
import { requireUser, requireAdmin } from "@/lib/auth/require-user";

export async function createCapitalizer(input: CapitalizerInput) {
  const user = await requireUser();
  const data = capitalizerSchema.parse(input);
  await db.insert(capitalizers).values({ ...data, tenantId: user.tenantId });
  revalidatePath("/dashboard/capitalizers");
}

export async function toggleCapitalizerActive(id: string, isActive: boolean) {
  const user = await requireUser();
  await db
    .update(capitalizers)
    .set({ isActive })
    .where(and(eq(capitalizers.id, id), eq(capitalizers.tenantId, user.tenantId)));
  revalidatePath("/dashboard/capitalizers");
}

export async function createBlockedNumber(input: BlockedNumberInput) {
  const user = await requireUser();
  const data = blockedNumberSchema.parse(input);
  await db.insert(blockedNumbers).values({ ...data, tenantId: user.tenantId });
  revalidatePath("/dashboard/users");
}

export async function deleteBlockedNumber(id: string) {
  const user = await requireUser();
  await db
    .delete(blockedNumbers)
    .where(and(eq(blockedNumbers.id, id), eq(blockedNumbers.tenantId, user.tenantId)));
  revalidatePath("/dashboard/users");
}

export async function resolveContact(id: string) {
  const user = await requireUser();
  await db
    .update(contacts)
    .set({ status: "resolved" })
    .where(and(eq(contacts.id, id), eq(contacts.tenantId, user.tenantId)));
  revalidatePath("/dashboard/contacts");
}

export async function createUser(input: CreateUserInput) {
  const admin = await requireAdmin();
  const data = createUserSchema.parse(input);
  await db.insert(users).values({
    tenantId: admin.tenantId,
    name: data.name,
    email: data.email.toLowerCase(),
    phone: data.phone || null,
    passwordHash: await hashPassword(data.password),
    role: data.role,
  });
  revalidatePath("/dashboard/users");
}

export async function setUserStatus(
  id: string,
  status: "active" | "inactive" | "blocked",
) {
  const admin = await requireAdmin();
  await db
    .update(users)
    .set({ status })
    .where(and(eq(users.id, id), eq(users.tenantId, admin.tenantId)));
  revalidatePath("/dashboard/users");
}
