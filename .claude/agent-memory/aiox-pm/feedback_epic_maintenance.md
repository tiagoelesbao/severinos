---
name: feedback-epic-maintenance
description: Como o founder quer que documento de epic seja atualizado — cortar o envelhecido, nomear o que estava errado, não mexer em Status de story
metadata:
  type: feedback
---

Ao atualizar documento de epic: **cortar o que envelheceu**, não só acrescentar. Se uma afirmação do
documento ficou falsa à luz do que foi medido, **dizer que estava errada e por quê** — nunca apagar
em silêncio. O epic precisa responder quatro perguntas para quem o abre no dia: o que já funciona, o
que falta para a próxima meta, o que falta para o destino final, e quais decisões esperam o founder.

**Why:** epic longo acumula camadas de decisão e a tentação é empilhar. Um epic que só cresce deixa
de ser mapa e vira arquivo histórico; e apagar uma afirmação errada em silêncio perde a razão pela
qual ela era crível — que é justamente o que impede repetir o erro. Na atualização de 2026-11-19 o
`EPIC-LTM` caiu de 562 para 346 linhas cobrindo mais fatos.

**How to apply:**
- Histórico de validação e revalidação: **uma tabela**, não uma seção por rodada.
- Decisão superada: **uma linha** numa tabela de linha de decisões, com "o que sobrevive dela".
- Contradição resolvida: uma linha em "correções que já se fecharam". Contradição **nova**: seção
  própria, nomeada.

## Dois limites duros que valem além deste epic

1. **Não mudar `Status` de story.** `Ready → InProgress → InReview` é do @dev; `InReview → Done` é
   do @qa (`.claude/rules/story-lifecycle.md`). O @pm **registra** a divergência numa seção própria
   e segue. Divergência real e recorrente: story marcada `Ready` com o código já commitado, porque
   quando implementação e documentação saem no mesmo commit o campo `Status` é a única linha que
   ninguém relê.
2. **Não executar `test`/`build`/`typecheck` quando há implementação em curso no mesmo app.** Eles
   disputam `.next`, `tsconfig.tsbuildinfo` e **a cota de branches do Neon** com o trabalho em voo.
   Ler o código à vontade; medir por `find`/`grep` e pelos Dev Records das stories, que já trazem a
   contagem de testes e os códigos de saída. Medição estática por decisão, declarada como tal.
