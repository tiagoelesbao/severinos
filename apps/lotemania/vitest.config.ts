import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Suíte do caminho do dinheiro (LTM-05). Três escolhas aqui não são estilo:
//
// 1. `globalSetup` provisiona UMA base Postgres de verdade por execução da
//    suíte inteira e a destrói no final, inclusive quando a suíte falha
//    (AC2). Não há base por arquivo: provisionar 8 vezes deixaria a suíte
//    lenta o bastante para a equipe parar de rodá-la, que é o risco [Médio]
//    registrado na story.
// 2. `fileParallelism: false` — os arquivos compartilham a base. Isolamento
//    entre testes é por tenant e produto próprios, não por base própria;
//    rodar arquivos em paralelo sobre a mesma base reintroduziria
//    exatamente a intermitência que a story chama de "o pior resultado
//    possível".
// 3. `passWithNoTests: false` — suíte que passa sem rodar nada é pior que
//    suíte ausente, porque relata verde.
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["./tests/setup/global-setup.ts"],
    setupFiles: ["./tests/setup/test-env.ts"],
    fileParallelism: false,
    passWithNoTests: false,
    // Toda asserção aqui é uma ida ao banco por HTTP. 5 s (o padrão) derruba
    // teste de concorrência por motivo alheio ao código.
    testTimeout: 60_000,
    hookTimeout: 120_000,
    teardownTimeout: 120_000,
    sequence: {
      concurrent: false,
    },
  },
});
