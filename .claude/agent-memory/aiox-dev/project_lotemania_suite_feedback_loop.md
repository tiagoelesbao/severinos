---
name: lotemania-suite-feedback-loop
description: Como extrair informação da suíte do lotemania sem pagar 10 minutos — um arquivo só custa ~75s, e console.log do teste não aparece no Vitest 5 (a informação sai por mensagem de asserção)
metadata:
  type: project
---

A suíte do `apps/lotemania` provisiona uma branch Neon efêmera por execução. Dois fatos medidos em
2026-11-19 que mudam como se investiga ali.

## 1. Um arquivo só custa ~75s, não 10 minutos

`npm run test` inteiro: **~584s**. `npx vitest run tests/money-path/<um-arquivo>.test.ts`: **~26-75s**,
dos quais **~19s são o provisionamento** (que é pago igual nos dois casos).

**Why:** eu quase investiguei uma falha de concorrência às cegas por achar que cada tentativa
custava 10 minutos. Custava 75 segundos. A diferença entre "deduzir" e "medir" nesta base é de um
minuto.

**How to apply:** ao caçar uma falha intermitente ou validar uma hipótese contra o Postgres de
verdade, rodar **só o arquivo** em laço (`for (let i=0;i<5;i++)` dentro do próprio teste, para
forçar a corrida). Guardar `npm run test` completo para a porta final (AC de suíte verde).

## 2. `console.log` dentro do teste não aparece — a informação sai por asserção

No Vitest 5 com esta configuração (`fileParallelism: false`, `globalSetup`, reporter default),
`console.log` de dentro de um `it()` **não** chega ao stdout capturado: rodei duas vezes grepando
por um prefixo próprio e não havia nenhuma linha, nem com `> log 2>&1`.

**Why:** perdi uma rodada inteira tentando imprimir a mensagem de um erro capturado. A informação
não saiu, e a conclusão fácil — "então não houve erro" — era falsa.

**How to apply:** para extrair um valor de dentro de um teste, embutir no **texto da asserção** e
deixá-la falhar de propósito:
`expect(erros.join(" || ")).toBe("")` — o diff do Vitest imprime o recebido inteiro. Serve de sonda
descartável; depois apaga-se o arquivo.

Relacionado: [[build-verification-traps]] (contagem de teste como prova), [[source-scan-assertions]].
