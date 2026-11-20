---
name: lotemania-gate-evidencia
description: Como colher evidência num portão de qualidade do apps/lotemania — suíte cheia estoura o teto do Bash, relógio falso não prova expiração, varredura de fonte acusa o comentário
metadata:
  type: project
---

Três armadilhas de **medição** no `apps/lotemania` que já produziram asserção falsa ou portão
sem evidência.

**1. Suíte cheia não cabe num Bash.** `npm run test` provisiona uma branch efêmera do Neon e leva
~613s (346 passed | 2 skipped). Rodar arquivo específico é a rota: `cd apps/lotemania && npx
vitest run tests/caminho/arquivo.test.ts` — três arquivos de `money-path` juntos deram 147,88s,
com provisionamento próprio de ~19s.

**2. `reserved_until < now()` é SQL.** O `now()` é do **Postgres**. Relógio falso de JS não o move
um segundo, e teste que finge o relógio no cliente para provar expiração **não prova nada**. A
semeadura correta é SQL: `tests/helpers/seed.ts` → `expireReservation` (empurra para o passado) e
`setReservedUntil` (instante escolhido, para quando a diferença entre dois prazos é o que está sob
teste). Conferido: zero ocorrências de `useFakeTimers`/`setSystemTime`/`advanceTimers` em `src/` e
`tests/` — manter assim.

**3. Varredura de fonte precisa ler código, não prosa.** Esta base documenta muito dentro do
código, e documentar bem significa **escrever a forma errada para condená-la**. Teste que faz
`grep` no texto cru reprova o arquivo por conter exatamente o que ele promete não conter — foram
medidas 6 das 12 primeiras falhas assim, em quatro arquivos. O idioma correto já existe:
`tests/payments/paysure/source.ts` → `codigoDe()` remove comentário **e** literal de string;
`fonteDe()` só para asserção sobre o que o arquivo *explica*.

**Why:** cada uma destas três já transformou um portão verde em portão sem valor. Contar o
artefato não responde "funciona?".

**How to apply:** num portão deste app, não repetir a suíte cheia se o lead já a rodou com código
de saída; rodar os arquivos do par de stories em revisão para ter evidência de primeira mão. E ao
julgar um teste de expiração ou de varredura de fonte, conferir **qual relógio** e **qual texto**
ele está lendo antes de aceitar o verde. Ver [[lotemania-test-blindspot]].
