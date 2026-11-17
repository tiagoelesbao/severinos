import { config } from "dotenv";
config({ path: ".env.local" });

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, and } from "drizzle-orm";
import * as schema from "./schema";
import { hashPassword } from "../lib/auth/password";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(
      `\n${name} não está definida.\n\n` +
        `O seed cria a conta de administrador do tenant. Defina as duas em\n` +
        `.env.local antes de rodar:\n\n` +
        `  SEED_ADMIN_EMAIL=voce@exemplo.com\n` +
        `  SEED_ADMIN_PASSWORD=<senha forte, gerada, não reaproveitada>\n`,
    );
    process.exit(1);
  }
  return value;
}

async function main() {
  const tenantSlug = process.env.SEED_TENANT_SLUG ?? "imperio";
  const tenantName = process.env.SEED_TENANT_NAME ?? "Imperio";

  // Sem valor padrão para e-mail e senha do admin, de propósito.
  //
  // Este repositório é PÚBLICO. Um fallback em literal aqui significa que o par
  // usuário/senha do primeiro admin está publicado: quem rodar o seed sem
  // definir as variáveis cria uma conta administrativa cuja credencial
  // qualquer pessoa consegue ler no GitHub. "É só um placeholder" não ajuda —
  // o que vale é o que fica no banco quando ninguém lê o comentário.
  //
  // Falhar aqui é barato; descobrir depois, não.
  const email = requireEnv("SEED_ADMIN_EMAIL");
  const password = requireEnv("SEED_ADMIN_PASSWORD");

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
