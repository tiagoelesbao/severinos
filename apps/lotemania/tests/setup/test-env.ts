// Ambiente de cada arquivo de teste.
//
// Roda antes de o arquivo de teste ser importado — e essa ordem é o ponto:
// `src/db/index.ts` lê `process.env.DATABASE_URL` no momento da importação,
// então a URL da base descartável tem de estar no lugar antes de qualquer
// `import { db }`.

import { randomBytes } from "node:crypto";

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

// A chave de cifragem das credenciais de gateway (LTM-03a).
//
// GERADA POR WORKER, nunca literal versionado: a suíte precisa de UMA chave
// válida de 32 bytes para cifrar e decifrar no mesmo processo, e nenhum valor
// aqui pode parecer com a chave de produção. `override: false` na prática —
// quem exportar a variável no shell (CI com chave própria) ganha do valor
// gerado.
//
// ⚠️ Por que gerada e não fixa: chave fixa num arquivo de teste é chave
// publicada. Um blob cifrado com ela e vazado de um banco de teste seria
// legível por qualquer pessoa com acesso ao repositório.
if (!process.env.CREDENTIALS_ENCRYPTION_KEY) {
  process.env.CREDENTIALS_ENCRYPTION_KEY = randomBytes(32).toString("base64");
}

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
