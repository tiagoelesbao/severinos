// Acesso direto da suíte à base, por TCP.
//
// Isto NÃO é um mock nem um substituto do `db` de produção (AC2 proíbe, e
// com razão). É o lado de fora: o verificador de invariantes e o seed
// precisam ler e escrever sem passar pelo código sob teste, senão a
// verificação herdaria o defeito que procura.
//
// O código sob teste continua usando `src/db/index.ts` intocado, com o
// driver neon-http de produção.

import { Pool } from "pg";

let pool: Pool | null = null;

function connectionString(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL vazia no worker de teste. O setup (tests/setup/test-env.ts) " +
        "é quem a define a partir da base descartável — rode com `pnpm test`.",
    );
  }
  return url;
}

export function testPool(): Pool {
  if (!pool) {
    const noVerify = process.env.LTM_TEST_PG_SSL_NO_VERIFY === "1";
    pool = new Pool({
      connectionString: connectionString(),
      ...(noVerify ? { ssl: { rejectUnauthorized: false } } : {}),
      // O cenário de carga abre centenas de fluxos; o pool é do verificador
      // e do seed, não do caminho sob teste, e não precisa ser largo.
      max: 8,
    });
  }
  return pool;
}

// Os tipos de retorno são declarados por quem chama, com `interface`, e não
// se amarram ao `QueryResultRow` do pg de propósito: aquele tipo é uma
// assinatura de índice, e TypeScript não dá assinatura de índice implícita a
// `interface`. Amarrar aqui obrigaria todo chamador a usar `type` em vez de
// `interface` por um motivo que não tem nada a ver com o domínio.
export async function query<T>(text: string, params: unknown[] = []): Promise<T[]> {
  const result = await testPool().query(text, params);
  return result.rows as T[];
}

export async function queryOne<T>(text: string, params: unknown[] = []): Promise<T> {
  const rows = await query<T>(text, params);
  if (rows.length !== 1) {
    throw new Error(
      `Esperava exatamente 1 linha e vieram ${rows.length}. Consulta: ${text.replace(/\s+/g, " ").slice(0, 160)}`,
    );
  }
  return rows[0];
}

export async function closeTestPool(): Promise<void> {
  if (pool) {
    const current = pool;
    pool = null;
    await current.end();
  }
}
