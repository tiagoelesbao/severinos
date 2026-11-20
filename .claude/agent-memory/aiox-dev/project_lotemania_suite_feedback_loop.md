---
name: lotemania-suite-feedback-loop
description: Como extrair informação da suíte do lotemania — um arquivo custa ~38s, a suíte inteira ~590s e ESTOURA o teto de 10 min do Bash em primeiro plano; console.log do teste não aparece; e com agente paralelo a contagem de testes não é sua
metadata:
  type: project
---

A suíte do `apps/lotemania` provisiona uma branch Neon efêmera por execução. Quatro fatos medidos
(2026-11-19, LTM-20 e LTM-23) que mudam como se investiga ali.

## 1. Um arquivo custa ~38s; a suíte inteira estoura o teto da ferramenta

Medido na LTM-23: `npx vitest run tests/<um-arquivo>.test.ts` = **~38s**, dos quais **~20s são o
provisionamento da branch Neon** (pago igual nos dois casos). A suíte inteira = **590s de testes +
20s de provisionamento ≈ 10min10s**.

**Why:** `pnpm test` em primeiro plano **morre em exit 143** no teto de 10 min do Bash tool — e
exit 143 parece falha da suíte quando é só o relógio da ferramenta. Perdi uma rodada inteira de
~10 min assim.

**How to apply:** suíte inteira **sempre** em `run_in_background`, redirecionando para arquivo, com
`echo "EXIT=$?"` no fim (o reporter default do Vitest bufferiza: o arquivo fica vazio durante quase
toda a execução, e isso não é travamento). Para esperar sem `sleep` em primeiro plano:
`until grep -aq EXIT "$LOG"; do ping -n 6 127.0.0.1 >/dev/null; done`. Investigação de hipótese:
**só o arquivo**, em laço dentro do próprio teste.

## 2. `console.log` dentro do teste não aparece — a informação sai por asserção

No Vitest 5 com esta configuração (`fileParallelism: false`, `globalSetup`, reporter default),
`console.log` de dentro de um `it()` **não** chega ao stdout capturado: rodei duas vezes grepando
por um prefixo próprio e não havia nenhuma linha, nem com `> log 2>&1`.

**Why:** perdi uma rodada tentando imprimir a mensagem de um erro capturado. A informação não saiu,
e a conclusão fácil — "então não houve erro" — era falsa.

**How to apply:** embutir o valor no **texto da asserção**. Na LTM-23 isso virou desenho
permanente, não sonda: `expect(result.rejected, JSON.stringify(...)).toHaveLength(0)` — quando
vermelho, o diff do Vitest imprime as 5 exceções inteiras, com a query e os params.

## 3. Com agente paralelo, a contagem de testes NÃO é sua

Na LTM-23 a base era 276 e a suíte voltou **332**. Meus testes eram 6. Os outros 50 eram de
`tests/loja/pedido/` — três arquivos que outro agente acrescentou ao working tree **durante** a
minha execução.

**Why:** eu quase reportei "+56 testes" como entrega minha. A suíte roda sobre o working tree
inteiro, não sobre o seu recorte, e `fileParallelism: false` não isola nada disso.

**How to apply:** antes de reportar delta de suíte, `git status --short` **de novo** (o tree de 30
min atrás não vale) e feche a aritmética arquivo por arquivo:
`grep -cE "^\s*(it|test)\(" <os arquivos alheios>`. Reportar o número bruto sem reconciliar é
reivindicar trabalho de outro.

## 4. Teste que não fica vermelho sem o conserto não prova conserto

Na LTM-23 removi **uma linha** (`.onConflictDoNothing`), rodei só o arquivo (38s) e li a mensagem
do defeito de verdade — 5 exceções em 6 abas, o N-1 previsto —, depois restaurei de uma cópia em
scratchpad.

**How to apply:** o custo é 38s + a cópia de segurança. Fazer sempre, e **guardar a saída
vermelha** no Dev Agent Record: ela é a única prova de que o verde significa algo.

Relacionado: [[build-verification-traps]], [[source-scan-assertions]],
[[lotemania-reserve-known-defects]].
