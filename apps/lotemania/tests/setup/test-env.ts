// Ambiente de cada arquivo de teste.
//
// Roda antes de o arquivo de teste ser importado — e essa ordem é o ponto:
// `src/db/index.ts` lê `process.env.DATABASE_URL` no momento da importação,
// então a URL da base descartável tem de estar no lugar antes de qualquer
// `import { db }`.

import { neonConfig } from "@neondatabase/serverless";
import { afterAll, inject } from "vitest";

import { closeTestPool } from "../helpers/db";

const databaseUrl = inject("ltmDatabaseUrl");

if (!databaseUrl) {
  throw new Error(
    "A base descartável não foi provisionada (ltmDatabaseUrl vazio). " +
      "Isto só acontece se o globalSetup for ignorado — rode pela raiz do app, " +
      "com `pnpm test`.",
  );
}

process.env.DATABASE_URL = databaseUrl;

// Rota B (Postgres local): o driver de produção é neon-http e precisa de um
// endpoint /sql na frente do Postgres. Ver tests/setup/provisioning.ts.
const httpProxy = process.env.LTM_TEST_NEON_HTTP_PROXY;
if (httpProxy) {
  neonConfig.fetchEndpoint = httpProxy;
  neonConfig.useSecureWebSocket = false;
  neonConfig.poolQueryViaFetch = true;
}

afterAll(async () => {
  await closeTestPool();
});
