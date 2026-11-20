---
name: feedback-po-conferir-correcao-aplicada
description: Em revalidação, conferir a lista de correções exigidas item por item contra o arquivo — "apliquei as correções" não é evidência, correção parcial deixa contradição nova, e trocar o Status é o último passo (eu mesmo marquei Ready sem escrever o bloco Files que prometi)
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

**E em 2026-11-20 eu fiz o mesmo defeito, que é a razão de esta memória ganhar um item.** Marquei a
`LTM-08` como `Ready` escrevendo no cabeçalho que o bloco `Files:` *"agora se mede"* — e **não
escrevi o bloco**. O corte de sessão pegou no meio, e o arquivo foi comitado afirmando as duas
coisas: `Ready` no topo, *"permanece `Draft` até o bloco `Files:` ser declarado"* na seção de
validação, e `⚠️ sem bloco Files:` na pontuação. Pela `parallel-waves.md` isso a tornava
**indespachável** com cara de pronta — que é precisamente o dano que esta memória descreve, agora
com a minha assinatura. Na mesma rodada, as outras três eram de terceiros: `LTM-04` (rota `product`
singular corrigida no `Files:` e **não** na checklist), `LTM-17` (a tabela *"o que já existe"*
atualizada e o parágrafo abaixo dela ainda descrevendo o código de duas stories atrás) e a `LTM-02`
(aviso de `Draft` sobrevivendo à correção que ele exigia).

**A regra que sai disso: trocar o `Status` é o ÚLTIMO passo, nunca o primeiro.** Enquanto a correção
não estiver no arquivo, o cabeçalho tem de continuar dizendo o que falta — um cabeçalho que promete
o que o corpo não entrega é pior que um NO-GO honesto, porque o próximo leitor despacha.

**How to apply:** na revalidação, montar a tabela *correção exigida × estado × como conferi*, com
a evidência (linha, `grep`, nome do campo) em cada linha. Três perguntas que pegam o defeito:
a correção entrou **onde o @dev lê** (Contexto, AC, tarefa) ou só no histórico de validação? ela
**desfez** a afirmação antiga ou só acrescentou a nova ao lado? o `Files:` acompanhou a mudança de
AC — isto é, o novo AC é implementável dentro do conjunto declarado? Pendência de redação eu
corrijo na hora e registro; pendência de escopo ou de sequenciamento volta como NO-GO.

**E no fim, reler o cabeçalho e a pontuação antigos.** O veredito vive em **três** lugares — o bloco
de status, a seção de validação e a tabela de pontuação — e a correção que só entra em um deixa o
arquivo discordando de si mesmo. Antes de fechar: `grep` o próprio arquivo por `Draft`, por
`sem bloco` e por `permanece` e conferir se ainda são verdade.
