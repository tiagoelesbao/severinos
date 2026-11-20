---
name: lotemania-test-blindspot
description: No epic LTM, o defeito mora três vezes no mesmo ponto cego — a suíte modela atores distintos bem e o MESMO ator em paralelo mal
metadata:
  type: project
---

No `EPIC-LTM-Imperio-Migration`, três defeitos de caminho de dinheiro escaparam da suíte pelo
**mesmo** motivo: todo teste de concorrência usa **um ator por disputante**.

- `reserve-concurrency.test.ts:66` usa um telefone distinto por disputante ("20 pessoas
  disputando, não uma pessoa clicando 20 vezes") — desenho natural e correto para o que ele
  testa, e cego para o resto.
- LTM-20 era "dois compradores" (a reserva da Ana só era liberada se **ela** voltasse).
- LTM-23 era "o mesmo comprador, duas abas" (primeira compra da vida devolvia 500).

**Why:** o padrão vale mais que a ocorrência. Quando a pergunta é "o que a suíte não olha?", a
resposta nesta base tem sido *o mesmo ator repetido*, não *atores distintos*.

**How to apply:** ao revisar qualquer story de concorrência deste epic — a próxima é a **LTM-28**,
que replica o conserto da LTM-23 em cinco caminhos de criação de identidade (`bonus-play.ts:48-61`
é cópia byte a byte, no caminho do comprador na loja) — exigir um teste com **um ator só,
repetido**, e conferir que cada ramo pede um recurso **diferente**. Se todas as abas disputarem o
mesmo recurso, as N−1 recusas por disputa ficam indistinguíveis das N−1 falhas do que está sob
teste, e o teste fica verde pelo motivo errado. Ver [[lotemania-gate-evidencia]].
