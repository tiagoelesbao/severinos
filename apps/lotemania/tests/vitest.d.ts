// O `globalSetup` provisiona a base e entrega a URL aos workers por
// `provide`/`inject`, não por variável de ambiente herdada: herança de env
// entre o processo principal e os forks é detalhe de implementação do pool,
// e a URL da base é o dado de que toda a suíte depende.
declare module "vitest" {
  interface ProvidedContext {
    /** URL da base descartável desta execução. */
    ltmDatabaseUrl: string;
    /** Identificador da execução — entra no nome de tenant e sorteio. */
    ltmRunId: string;
    /** `neon-branch` ou `postgres-server`. */
    ltmProvisionMode: string;
  }
}

export {};
