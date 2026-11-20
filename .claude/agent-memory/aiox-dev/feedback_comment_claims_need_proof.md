---
name: comment-claims-need-proof
description: Nunca escrever comentário (ou nota de story) afirmando que um conserto funciona antes do teste provar — comentário que descreve conserto que não funciona é pior que nenhum
metadata:
  type: feedback
---

Comentário de código, nota de story e Dev Agent Record só podem **afirmar** que um conserto
funciona depois de a porta de verificação provar. Antes disso, a redação tem de dizer o que foi
tentado, não o que foi resolvido.

**Why:** LTM-27, 2026-11-20. O erro `42702` (coluna ambígua) na junta da `Data da compra` foi
diagnosticado certo e consertado com `alias(winners, "w")`. Escrevi o comentário afirmando que o
apelido resolvia — `lint` e `typecheck` ficaram verdes e eu segui. O coordenador rodou o teste: os
**mesmos 2** testes continuavam vermelhos, porque `alias()` qualifica a consulta de fora mas **não**
o que é interpolado dentro de um template `sql`. A frase dele: *"o comentário afirmava que o
problema estava resolvido e o teste provou que não — e isso é pior que não ter comentário"*. Rima
com a preferência já registrada de **rodar a ferramenta em vez de contar o artefato**: contagem de
linha e raciocínio plausível não respondem *"funciona?"*.

**How to apply:** ao escrever qualquer comentário que explique um conserto de comportamento
(SQL emitido, condição de guarda, ordem de efeito), rodar a porta que o exercita **antes** de
redigir a afirmação. Se a porta não puder ser rodada naquele momento, redigir como hipótese
(*"a intenção é X"*) e dizer ao coordenador o que falta verificar. Vale em dobro quando os testes
vermelhos são os que tocam o caminho do dinheiro: na LTM-27 os 2 que falhavam eram exatamente os 2
únicos que gravavam ganhador de verdade — a parte vermelha não era detalhe de consulta.
