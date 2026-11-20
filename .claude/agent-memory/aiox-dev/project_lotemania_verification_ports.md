---
name: lotemania-verification-ports
description: Como verificar mudança no apps/lotemania sem queimar a cota do Neon — a suíte provisiona branch efêmera e não se roda inteira em onda paralela
metadata:
  type: project
---

No `apps/lotemania`, `pnpm test` provisiona uma **branch efêmera do Neon** por execução
(`tests/setup/global-setup.ts`), gasta ~19 s só no provisionamento e a cota é **compartilhada entre
agentes**. Em onda paralela, rodar a suíte inteira nos dois lados é o que estoura.

**Why:** a cota do Neon é finita e o provisionamento é por execução da suíte, não por arquivo —
duas ondas rodando ao mesmo tempo disputam o mesmo recurso, e o `vitest.config.ts` tem
`fileParallelism: false` justamente porque os arquivos compartilham a base.

**How to apply:** em trabalho de onda, rodar **só o diretório da própria story**
(`npx vitest run tests/<meu-dir>/`), deixar `pnpm build` e a suíte inteira para o controlador na
árvore combinada, e apagar `tsconfig.tsbuildinfo` antes de cada `pnpm typecheck` — ele é
`incremental: true` e **compartilhado** entre agentes, então sub-reporta e devolve verde falso.
`pnpm lint` tem **5 avisos pré-existentes** de `no-unused-vars`; o alvo é 0 erros, não 0 avisos.

Relacionado: [[lotemania-superficie-meia-cota]].
