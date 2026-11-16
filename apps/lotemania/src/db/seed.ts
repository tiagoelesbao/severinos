import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "../lib/auth/password";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

async function main() {
  const tenantSlug = process.env.SEED_TENANT_SLUG ?? "imperio";
  const tenantName = process.env.SEED_TENANT_NAME ?? "Imperio";
  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@imperio.local";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "TrocarSenha123!";

  let [tenant] = await db
    .select()
    .from(schema.tenants)
    .where(eq(schema.tenants.slug, tenantSlug))
    .limit(1);

  if (!tenant) {
    [tenant] = await db
      .insert(schema.tenants)
      .values({ slug: tenantSlug, name: tenantName })
      .returning();
    console.log(`Tenant criado: ${tenant.name} (${tenant.slug})`);
  } else {
    console.log(`Tenant já existe: ${tenant.name} (${tenant.slug})`);
  }

  await db
    .insert(schema.settings)
    .values({ tenantId: tenant.id, siteName: tenantName })
    .onConflictDoNothing();

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(
      and(eq(schema.users.tenantId, tenant.id), eq(schema.users.email, email)),
    )
    .limit(1);

  if (existing) {
    console.log(`Admin já existe: ${email}`);
    return;
  }

  const passwordHash = await hashPassword(password);
  await db.insert(schema.users).values({
    tenantId: tenant.id,
    name: "Admin",
    email,
    passwordHash,
    role: "admin",
    status: "active",
  });

  console.log(
    `Admin criado: empresa="${tenantSlug}" email="${email}" senha="${password}"`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
