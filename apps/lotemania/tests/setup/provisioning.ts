// Provisionamento da base descartável por execução (LTM-05, AC2).
//
// Por que base de verdade e não mock: os problemas da fundação são
// comportamentos do BANCO — violação de unicidade, plano de execução,
// reversão e colisão de chave concorrente. Um mock de `db` passaria verde
// em todos e não provaria nada.
//
// Duas rotas, porque depender de rede e credencial de nuvem para rodar
// teste é risco registrado na story:
//
//   neon-branch      branch efêmera de um projeto Neon, criada e apagada
//                    pela própria suíte. Funciona sem mais nada porque o
//                    driver de produção (`neon-http`) fala com o endpoint
//                    HTTP do Neon nativamente.
//   postgres-server  Postgres qualquer (container local), onde a suíte
//                    CRIA e DERRUBA um banco por execução. Exige um proxy
//                    HTTP do Neon na frente, porque `src/db/index.ts` usa
//                    `drizzle-orm/neon-http` e um Postgres nu não tem
//                    endpoint `/sql`.
//
// Em nenhuma hipótese a suíte roda contra a base de desenvolvimento: a
// variável lida aqui é própria (`LTM_TEST_*`), nunca `DATABASE_URL`.

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { Client } from "pg";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export type ProvisionMode = "neon-branch" | "postgres-server";

export interface ProvisionedDatabase {
  mode: ProvisionMode;
  /** Nome do banco (postgres-server) ou da branch (neon-branch). */
  identity: string;
  databaseUrl: string;
  runId: string;
  provisionMs: number;
  destroy: () => Promise<void>;
}

const EPHEMERAL_PREFIX = "ltm05";
const NEON_API = "https://console.neon.tech/api/v2";
/** Resto de execução interrompida mais velho que isto é varrido na entrada. */
const STALE_AFTER_MS = 2 * 60 * 60 * 1000;

export function newRunId(): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[^0-9]/g, "")
    .slice(0, 14);
  const salt = Math.random().toString(36).slice(2, 8);
  return `${stamp}${salt}`;
}

export function missingEnvironmentError(): Error {
  return new Error(
    [
      "",
      "A suíte da LTM-05 não rodou: falta a base Postgres descartável.",
      "",
      "Ela NÃO usa mock do banco de propósito (AC2) — violação de unicidade,",
      "plano de execução e disputa concorrente são comportamentos do Postgres,",
      "e um mock passaria verde em todos eles sem provar nada.",
      "",
      "Escolha UMA das duas rotas e defina as variáveis dela:",
      "",
      "  A) branch efêmera no Neon (nada para instalar)",
      "       LTM_TEST_NEON_API_KEY=<token de API do Neon>",
      "       LTM_TEST_NEON_PROJECT_ID=<id do projeto>",
      "       LTM_TEST_NEON_PARENT_BRANCH=<opcional: id da branch mãe>",
      "",
      "  B) Postgres local em container + proxy HTTP do Neon",
      "       docker run -d --name ltm-pg -e POSTGRES_PASSWORD=postgres \\",
      "         -p 5432:5432 postgres:17",
      "       docker run -d --name ltm-neon-proxy -p 4444:4444 \\",
      "         -e PG_CONNECTION_STRING=postgres://postgres:postgres@host.docker.internal:5432/postgres \\",
      "         ghcr.io/timowilhelm/local-neon-http-proxy:main",
      "",
      "       LTM_TEST_ADMIN_DATABASE_URL=postgres://postgres:postgres@localhost:5432/postgres",
      "       LTM_TEST_NEON_HTTP_PROXY=http://localhost:4444/sql",
      "",
      "A rota B precisa do proxy porque o código de produção usa o driver",
      "neon-http (`src/db/index.ts`), que fala HTTP — um Postgres nu não tem",
      "endpoint /sql. Trocar o driver é código de produção, fora do escopo",
      "desta story.",
      "",
      "Detalhe e comandos exatos: apps/lotemania/README.md, seção Testes.",
      "",
    ].join("\n"),
  );
}

export function resolveMode(): ProvisionMode {
  const explicit = process.env.LTM_TEST_DB_MODE;
  if (explicit) {
    if (explicit === "neon-branch" || explicit === "postgres-server") return explicit;
    throw new Error(
      `LTM_TEST_DB_MODE="${explicit}" não existe. Use "neon-branch" ou "postgres-server".`,
    );
  }
  if (process.env.LTM_TEST_NEON_API_KEY && process.env.LTM_TEST_NEON_PROJECT_ID) {
    return "neon-branch";
  }
  if (process.env.LTM_TEST_ADMIN_DATABASE_URL) return "postgres-server";
  throw missingEnvironmentError();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} não está definida, e o modo escolhido depende dela.\n` +
        `Ver apps/lotemania/README.md, seção Testes.`,
    );
  }
  return value;
}

function pgClient(connectionString: string): Client {
  // `sslmode` vem da própria URL. A fuga abaixo existe para container local
  // com certificado autoassinado e é explícita de propósito: desligar
  // verificação de TLS por padrão seria pior que pedir uma variável.
  const noVerify = process.env.LTM_TEST_PG_SSL_NO_VERIFY === "1";
  return new Client(
    noVerify
      ? { connectionString, ssl: { rejectUnauthorized: false } }
      : { connectionString },
  );
}

/**
 * Aplica a linha de base versionada da LTM-01.
 *
 * Deliberadamente NÃO é `drizzle-kit push`: push compara o schema vivo com o
 * arquivo TypeScript e decide o que fazer, o que é bom em desenvolvimento e
 * ruim num runner — o que a suíte precisa é da mesma forma, byte a byte, em
 * toda execução. A linha de base é o artefato versionado que a LTM-01
 * entregou para isso.
 */
export async function applyBaselineSchema(databaseUrl: string): Promise<number> {
  const baselinePath = path.resolve(dirname, "../../drizzle/0000_baseline_schema.sql");
  let sqlText: string;
  try {
    sqlText = await readFile(baselinePath, "utf8");
  } catch {
    throw new Error(
      [
        `Linha de base do schema não encontrada em ${baselinePath}.`,
        "",
        "Ela é o artefato da LTM-01 e é o que a suíte aplica na base",
        "descartável. Se o arquivo não existe neste clone, gere a migração",
        "antes de rodar os testes:",
        "",
        "  pnpm db:generate",
        "",
      ].join("\n"),
    );
  }

  const statements = sqlText
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const client = pgClient(databaseUrl);
  await client.connect();
  try {
    // Zera o schema ANTES de aplicar a linha de base.
    //
    // Uma branch do Neon e copia-sob-escrita do pai, entao ela nasce COM o
    // schema que o pai tem — e a linha de base quebra no primeiro CREATE TYPE
    // ("type user_role already exists"). Nao e caso de borda: e o caminho
    // normal, porque o pai e o banco que o app usa.
    //
    // Derrubar e recriar o schema publico deixa a base no estado que a story
    // exige: descartavel e identica a um banco novo. So e seguro porque isto
    // roda em branch efemera — nunca aponte este runner para um banco que
    // voce nao esteja disposto a perder.
    await client.query('DROP SCHEMA IF EXISTS "public" CASCADE');
    await client.query('CREATE SCHEMA "public"');

    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i]);
      } catch (error) {
        const head = statements[i].slice(0, 160).replace(/\s+/g, " ");
        throw new Error(
          `Falha ao aplicar a instrução ${i + 1}/${statements.length} da linha de base ` +
            `("${head}..."): ${(error as Error).message}`,
        );
      }
    }
  } finally {
    await client.end();
  }
  return statements.length;
}

// ── Rota A: branch efêmera no Neon ──────────────────────────────────────

interface NeonBranch {
  id: string;
  name: string;
  created_at?: string;
}

async function neonFetch(
  apiKey: string,
  pathname: string,
  init?: { method?: string; body?: unknown },
): Promise<unknown> {
  const response = await fetch(`${NEON_API}${pathname}`, {
    method: init?.method ?? "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init?.body === undefined ? undefined : JSON.stringify(init.body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(
      `API do Neon respondeu ${response.status} em ${init?.method ?? "GET"} ${pathname}: ${text}`,
    );
  }
  return text.length > 0 ? (JSON.parse(text) as unknown) : {};
}

async function deleteStaleNeonBranches(apiKey: string, projectId: string): Promise<void> {
  try {
    const payload = (await neonFetch(apiKey, `/projects/${projectId}/branches`)) as {
      branches?: NeonBranch[];
    };
    const now = Date.now();
    for (const branch of payload.branches ?? []) {
      if (!branch.name?.startsWith(`${EPHEMERAL_PREFIX}-`)) continue;
      const createdAt = branch.created_at ? Date.parse(branch.created_at) : 0;
      if (createdAt > 0 && now - createdAt < STALE_AFTER_MS) continue;
      await neonFetch(apiKey, `/projects/${projectId}/branches/${branch.id}`, {
        method: "DELETE",
      }).catch(() => undefined);
    }
  } catch {
    // Varrer resto de execução interrompida é higiene, não pré-requisito:
    // falhar aqui esconderia o erro real do provisionamento que vem a seguir.
  }
}

async function provisionNeonBranch(runId: string): Promise<ProvisionedDatabase> {
  const startedAt = Date.now();
  const apiKey = requireEnv("LTM_TEST_NEON_API_KEY");
  const projectId = requireEnv("LTM_TEST_NEON_PROJECT_ID");
  const parentId = process.env.LTM_TEST_NEON_PARENT_BRANCH;
  const branchName = `${EPHEMERAL_PREFIX}-${runId}`;

  await deleteStaleNeonBranches(apiKey, projectId);

  const created = (await neonFetch(apiKey, `/projects/${projectId}/branches`, {
    method: "POST",
    body: {
      branch: parentId ? { name: branchName, parent_id: parentId } : { name: branchName },
      endpoints: [{ type: "read_write" }],
    },
  })) as {
    branch?: NeonBranch;
    connection_uris?: { connection_uri?: string }[];
  };

  const branchId = created.branch?.id;
  const databaseUrl = created.connection_uris?.[0]?.connection_uri;
  if (!branchId || !databaseUrl) {
    throw new Error(
      "A API do Neon criou a branch mas não devolveu connection_uri. " +
        "Confira se o projeto tem um banco e um role padrão.",
    );
  }

  await applyBaselineSchema(databaseUrl);

  return {
    mode: "neon-branch",
    identity: branchName,
    databaseUrl,
    runId,
    provisionMs: Date.now() - startedAt,
    destroy: async () => {
      await neonFetch(apiKey, `/projects/${projectId}/branches/${branchId}`, {
        method: "DELETE",
      });
    },
  };
}

// ── Rota B: banco efêmero num servidor Postgres ─────────────────────────

function withDatabase(adminUrl: string, databaseName: string): string {
  const url = new URL(adminUrl);
  url.pathname = `/${databaseName}`;
  return url.toString();
}

function isNeonHost(adminUrl: string): boolean {
  try {
    return new URL(adminUrl).hostname.endsWith(".neon.tech");
  } catch {
    return false;
  }
}

async function dropStaleDatabases(admin: Client): Promise<void> {
  try {
    const { rows } = await admin.query<{ datname: string }>(
      `SELECT datname FROM pg_database WHERE datname LIKE '${EPHEMERAL_PREFIX}\\_%'`,
    );
    const cutoff = Date.now() - STALE_AFTER_MS;
    for (const row of rows) {
      const stamp = row.datname.slice(EPHEMERAL_PREFIX.length + 1, EPHEMERAL_PREFIX.length + 15);
      const asDate = Date.parse(
        `${stamp.slice(0, 4)}-${stamp.slice(4, 6)}-${stamp.slice(6, 8)}T` +
          `${stamp.slice(8, 10)}:${stamp.slice(10, 12)}:${stamp.slice(12, 14)}Z`,
      );
      if (Number.isFinite(asDate) && asDate > cutoff) continue;
      await admin
        .query(`DROP DATABASE IF EXISTS "${row.datname}" WITH (FORCE)`)
        .catch(() => undefined);
    }
  } catch {
    // Mesma razão da varredura de branches: higiene, não pré-requisito.
  }
}

async function provisionPostgresDatabase(runId: string): Promise<ProvisionedDatabase> {
  const startedAt = Date.now();
  const adminUrl = requireEnv("LTM_TEST_ADMIN_DATABASE_URL");

  if (!process.env.LTM_TEST_NEON_HTTP_PROXY && !isNeonHost(adminUrl)) {
    throw new Error(
      [
        "",
        "LTM_TEST_NEON_HTTP_PROXY não está definida, e sem ela a suíte não",
        "consegue falar com este Postgres.",
        "",
        "O código de produção usa `drizzle-orm/neon-http` (src/db/index.ts),",
        "que conversa por HTTP com um endpoint /sql. Um Postgres nu não tem",
        "esse endpoint. Trocar o driver é código de produção — fora do escopo",
        "da LTM-05 e assunto da LTM-02.",
        "",
        "Suba o proxy e aponte a variável para ele:",
        "",
        "  docker run -d --name ltm-neon-proxy -p 4444:4444 \\",
        "    -e PG_CONNECTION_STRING=postgres://postgres:postgres@host.docker.internal:5432/postgres \\",
        "    ghcr.io/timowilhelm/local-neon-http-proxy:main",
        "",
        "  LTM_TEST_NEON_HTTP_PROXY=http://localhost:4444/sql",
        "",
      ].join("\n"),
    );
  }

  const databaseName = `${EPHEMERAL_PREFIX}_${runId}`;
  const admin = pgClient(adminUrl);
  await admin.connect();
  try {
    await dropStaleDatabases(admin);
    await admin.query(`CREATE DATABASE "${databaseName}"`);
  } finally {
    await admin.end();
  }

  const databaseUrl = withDatabase(adminUrl, databaseName);
  await applyBaselineSchema(databaseUrl);

  return {
    mode: "postgres-server",
    identity: databaseName,
    databaseUrl,
    runId,
    provisionMs: Date.now() - startedAt,
    destroy: async () => {
      const client = pgClient(adminUrl);
      await client.connect();
      try {
        await client.query(`DROP DATABASE IF EXISTS "${databaseName}" WITH (FORCE)`);
      } finally {
        await client.end();
      }
    },
  };
}

export async function provisionDatabase(): Promise<ProvisionedDatabase> {
  const mode = resolveMode();
  const runId = newRunId();
  return mode === "neon-branch"
    ? provisionNeonBranch(runId)
    : provisionPostgresDatabase(runId);
}
