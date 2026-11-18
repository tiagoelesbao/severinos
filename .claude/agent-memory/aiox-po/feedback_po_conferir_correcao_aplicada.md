---
name: feedback-po-conferir-correcao-aplicada
description: Em revalidação, conferir a lista de correções exigidas item por item contra o arquivo — "apliquei as correções" não é evidência, e correção parcial costuma deixar contradição nova
metadata:
  type: feedback
---

Quando uma story volta para revalidação com "as correções foram aplicadas", percorrer a **lista
numerada que eu mesmo exigi** e marcar cada item com o estado conferido no arquivo. Ler só o que
mudou não basta: o que derruba é o que **não** mudou e o que mudou **pela metade**.

**Why:** 2026-11-17, `EPIC-LTM`. O resumo de quem corrigiu dizia que a `LTM-04` estava resolvida
("o AC3 deixou de ser impossível e o OUT foi revogado por escrito"). Conferido no arquivo: **1 das
8** correções aplicada, e o `OUT` **continuava** proibindo tocar o `client_api.py` *"porque o AC3
prova que não é necessário"* — exatamente a contradição que o AC3 corrigido criava. Correção
parcial é pior que correção ausente: a story passa a afirmar as duas coisas, e o @dev escolhe a que
der menos trabalho. No mesmo lote, a `LTM-01` e a `LTM-05` tinham 4 de 5 e 3 de 4 — as pendências
eram pequenas (uma conta de seed obsoleta, uma invariante importada de outro sistema) e deu para
aplicá-las na própria validação em vez de devolver a story.

**How to apply:** na revalidação, montar a tabela *correção exigida × estado × como conferi*, com
a evidência (linha, `grep`, nome do campo) em cada linha. Três perguntas que pegam o defeito:
a correção entrou **onde o @dev lê** (Contexto, AC, tarefa) ou só no histórico de validação? ela
**desfez** a afirmação antiga ou só acrescentou a nova ao lado? o `Files:` acompanhou a mudança de
AC — isto é, o novo AC é implementável dentro do conjunto declarado? Pendência de redação eu
corrijo na hora e registro; pendência de escopo ou de sequenciamento volta como NO-GO.
