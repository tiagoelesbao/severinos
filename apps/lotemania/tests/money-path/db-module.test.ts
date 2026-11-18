// `src/db/index.ts` — o ramo de falha dele (LTM-05, AC7; reescrito na LTM-02).
//
// ⚠️ REESCRITO PORQUE O DRIVER MUDOU, e a mensagem de erro mudou com ele.
//
// A LTM-05 mediu, contra `neon-http`, que o módulo NÃO quebra na importação
// e que o `undefined` de `DATABASE_URL` viaja até a primeira consulta — e
// que o erro que chega lá (`Wrong URL scheme or missing user, host or
// database in connection parameters`, embrulhado pelo Drizzle) não nomeia a
// variável que falta.
//
// Medido de novo em 2026-11-17 contra `neon-serverless` com `Pool`:
//
//   • o módulo continua NÃO quebrando na importação — `new Pool({
//     connectionString: undefined })` é construção válida, e o pool só tenta
//     conectar na primeira consulta;
//   • a mensagem melhorou um pouco e continua insuficiente. Agora é "No
//     database host or connection string was set, and key parameters have
//     default values (host: localhost, user: ..., db: ..., password: null).
//     Is an environment variable missing?" — ela ao menos SUGERE variável de
//     ambiente, mas não diz QUAL, e continua embrulhada em "Failed query".
//
// Os dois testes abaixo descrevem o comportamento novo como ele é. Dar nome
// à variável que falta continua sendo melhoria sem AC em nenhuma story —
// registrar, não inventar escopo.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("src/db/index.ts — ramo de falha: DATABASE_URL ausente", () => {
  const original = process.env.DATABASE_URL;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env.DATABASE_URL = original;
    vi.resetModules();
  });

  it("importa sem erro mesmo sem DATABASE_URL — a falha NÃO é alta", async () => {
    delete process.env.DATABASE_URL;

    const mod = await import("@/db");

    // Se algum dia isto passar a rejeitar, o comportamento melhorou e este
    // teste tem de ser reescrito de propósito — é o aviso.
    expect(mod.db).toBeDefined();
  });

  it("o undefined viaja até a primeira consulta, e o erro de lá não nomeia DATABASE_URL", async () => {
    delete process.env.DATABASE_URL;

    const { db } = await import("@/db");
    const { sql } = await import("drizzle-orm");

    let captured: Error | undefined;
    try {
      await db.execute(sql`SELECT 1`);
    } catch (error) {
      captured = error as Error;
    }

    expect(captured, "a consulta tinha de falhar sem string de conexão").toBeDefined();

    // O Drizzle EMBRULHA o erro do driver: o que chega ao chamador começa
    // em "Failed query: SELECT 1". Com `neon-http` a causa real ficava no
    // `cause`; com o `Pool` ela vem anexada à própria mensagem.
    expect(captured?.message).toMatch(/Failed query/i);

    const cadeia = [
      captured?.message,
      (captured?.cause as Error | undefined)?.message,
    ]
      .filter(Boolean)
      .join(" | ");

    // A causa, na forma que o driver novo dá. O trecho com host, usuário e
    // banco varia por máquina (ele cai nos padrões do sistema operacional),
    // então a asserção fica nas partes estáveis da frase.
    expect(cadeia).toMatch(/no database host or connection string was set/i);
    expect(cadeia).toMatch(/environment variable missing/i);

    // O ponto do teste: em NENHUMA camada a falha diz qual variável falta.
    expect(cadeia).not.toMatch(/DATABASE_URL/);
  });
});
