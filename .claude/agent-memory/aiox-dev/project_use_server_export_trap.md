---
name: use-server-export-trap
description: Num arquivo "use server" do Next, exportar qualquer coisa que não seja função assíncrona faz o módulo perder TODAS as exportações no grafo do cliente e o build falhar longe da causa — e tsc --noEmit não vê nada
metadata:
  type: project
---

Num arquivo que começa com `"use server"`, o Next só admite exportação de **função
assíncrona**. Exportar uma constante, um objeto ou uma função síncrona faz o módulo
perder **todas** as exportações no grafo do cliente/SSR — não só a nova.

Medido no `apps/lotemania` em 2026-11-18 (Next 16.4.6). Bastou trocar
`const RESERVATION_MINUTES = 15` por `export const` em `src/lib/actions/reserve.ts` para
`pnpm build` morrer com:

```
./src/app/loja/[tenant]/[productSlug]/number-grid.tsx:18:1
Error: Export reserveSelectedNumbers doesn't exist in target module
  The export reserveSelectedNumbers was not found in module
  [project]/src/lib/actions/reserve.ts [app-client] (ecmascript).
  The module has no exports at all.
```

**Why:** a mensagem acusa o arquivo **consumidor** e a exportação **antiga** — nunca a
linha que você escreveu. Quem lê isso conclui que quebrou o `number-grid.tsx` ou que
apagou `reserveSelectedNumbers` por acidente, e vai procurar no lugar errado. Pior:
`pnpm lint` e `pnpm typecheck` passam limpos, porque é transformação do bundler, não
tipo nem estilo. É um sinal de verificação que falha só na terceira porta — ver
[[build-verification-traps]].

Exportação de **tipo** (`export type`, `export interface`) é segura: é apagada antes da
transformação. Precedente no repo: `src/lib/actions/reports.ts` é `"use server"` e exporta
`ReportType`, e sempre buildou.

**How to apply:** antes de pôr qualquer `export` novo num arquivo `"use server"`,
perguntar se é `async function` ou tipo. Se não for nenhum dos dois, o valor **não mora
ali** — e a saída não é tornar a função `async` para caber (isso a transforma em endpoint
chamável pelo cliente e obriga `await` para derivar um número em componente de servidor e
em texto de tela). A saída é um módulo irmão puro: no caso da janela de reserva, foi
`src/lib/validations/reserve.ts`, que já era a casa do outro invariante do domínio.

E quando uma story **pedir** a exportação por nome (a LTM-03b pedia "exportar
`RESERVATION_MINUTES` de `actions/reserve.ts`"), a tarefa está errada — não o código.
Cumpri-la ao pé da letra derrubaria o AC de build da própria story. Medir com `pnpm build`
e reportar a premissa falsa vale mais que a tarefa.
