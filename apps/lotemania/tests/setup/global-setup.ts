// Ciclo de vida da base descartável (LTM-05, AC2).
//
// Roda uma vez por execução de `pnpm test`, antes de qualquer arquivo de
// teste, e a função devolvida roda uma vez no final — INCLUSIVE quando a
// suíte falha, que é metade do AC2. Se o provisionamento falhar, a suíte
// morre aqui com a mensagem dizendo o que falta: ela nunca passa vazia.

import { provisionDatabase } from "./provisioning";

interface GlobalSetupProject {
  provide: (key: "ltmDatabaseUrl" | "ltmRunId" | "ltmProvisionMode", value: string) => void;
}

export default async function setup(project: GlobalSetupProject) {
  // Sem try/catch: se o provisionamento falhar, a mensagem de
  // `provisioning.ts` já é a instrução, e deixá-la subir mata a suíte com
  // ela à vista. Capturar aqui só poderia piorar o relato.
  const provisioned = await provisionDatabase();

  process.env.DATABASE_URL = provisioned.databaseUrl;
  project.provide("ltmDatabaseUrl", provisioned.databaseUrl);
  project.provide("ltmRunId", provisioned.runId);
  project.provide("ltmProvisionMode", provisioned.mode);

  console.log(
    `[LTM-05] base descartável pronta — modo ${provisioned.mode}, ` +
      `identidade ${provisioned.identity}, ${provisioned.provisionMs} ms.`,
  );

  const suiteStartedAt = Date.now();

  return async () => {
    const suiteMs = Date.now() - suiteStartedAt;
    try {
      await provisioned.destroy();
      console.log(
        `[LTM-05] base ${provisioned.identity} destruída. ` +
          `Provisionamento ${provisioned.provisionMs} ms · suíte ${suiteMs} ms.`,
      );
    } catch (error) {
      // Falhar aqui em silêncio deixaria base órfã acumulando. A varredura
      // de restos na entrada cobre o caso, mas o aviso tem de aparecer.
      console.error(
        `[LTM-05] NÃO foi possível destruir ${provisioned.identity} ` +
          `(modo ${provisioned.mode}): ${(error as Error).message}\n` +
          `A próxima execução varre restos com mais de 2 h, mas confira à mão.`,
      );
      throw error;
    }
  };
}
