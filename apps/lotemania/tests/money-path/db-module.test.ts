// `src/db/index.ts` — o ramo de falha dele (LTM-05, AC7).
//
// O arquivo tem 7 linhas e um único ramo de falha: `process.env.DATABASE_URL!`
// é asserção de não-nulo, então nada no código checa se a variável existe.
//
// ⚠️ ACHADO QUE CONTRARIA A PREMISSA DO AC7. O AC esperava que "sem a
// variável, o módulo quebra na importação" e que o teste verificasse que "a
// falha é alta e nomeada, não um undefined viajando até a primeira
// consulta".
//
// Medido: o módulo NÃO quebra na importação. `neon()` do
// @neondatabase/serverless@1.2.0 trata argumento não-string como se fosse o
// objeto de opções (`typeof r != "string" && (e = r ?? {}, r = void 0)`) e
// resolve a string de conexão só na hora da consulta. O `undefined` VIAJA
// até a primeira consulta — exatamente o cenário que o AC chamava de pior —
// e o erro que chega lá é `NeonDbError: Wrong URL scheme or missing user,
// host or database in connection parameters`, que não nomeia
// `DATABASE_URL`, não nomeia o app e não diz o que fazer.
//
// Os dois testes abaixo são VERDES e descrevem esse comportamento como ele
// é. Consertar é código de produção, proibido no escopo desta story
// (registrar, não corrigir — ver Dev Record da LTM-05).

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

    // O Drizzle EMBRULHA o erro do driver: o que chega ao chamador é
    // "Failed query: SELECT 1", e o NeonDbError original fica no `cause`.
    // Medido em 2026-11-17 — a primeira redação deste teste assertava a
    // mensagem do driver e falhava, porque mirava na camada de baixo.
    //
    // Isso torna o achado PIOR, não melhor: além de o erro não nomear a
    // variável que falta, a camada de cima esconde até a pista do driver.
    expect(captured?.message).toMatch(/Failed query/i);

    const cadeia = [
      captured?.message,
      (captured?.cause as Error | undefined)?.message,
    ]
      .filter(Boolean)
      .join(" | ");

    // A causa de verdade só aparece se alguém souber abrir o `cause`.
    expect(cadeia).toMatch(/missing user, host or database/i);

    // O ponto do teste: em NENHUMA camada a falha diz qual variável falta.
    expect(cadeia).not.toMatch(/DATABASE_URL/);
  });
});
