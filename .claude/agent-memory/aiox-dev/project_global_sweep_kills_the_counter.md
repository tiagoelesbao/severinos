---
name: global-sweep-kills-the-counter
description: Padrão de defeito: tornar uma varredura global mata em silêncio qualquer contador que contava "na próxima visita do dono" — porque na próxima visita já não há o que contar. Verde na suíte, feature morta
metadata:
  type: project
---

Encontrado na LTM-20 do lotemania (2026-11-19), mas é classe de defeito, não caso isolado.

## A forma

Uma função faz duas coisas no mesmo passo: **age** sobre registros vencidos de um dono, e **conta**
quantos agiu para debitar uma penalidade nele. A ação é disparada pela próxima visita **do próprio
dono**, então ação e contagem coincidem.

Alguém então torna a **ação global** (qualquer dono, disparada por qualquer visitante) — que é o
conserto certo. Se a **contagem** continuar pendurada na próxima visita do dono:

1. o visitante dispara a ação e consome os registros vencidos do dono (muda o estado deles);
2. o dono volta, procura os próprios registros vencidos e **não acha nenhum**;
3. **o contador dele nunca sobe.** A penalidade deixa de existir.

E quanto mais eficaz a varredura global, mais morto o contador. No caso concreto, a varredura passou
a rodar em **toda visita à grade** — ou seja, a penalidade sumiu para praticamente todo mundo.

**Why:** nenhum teste pega. O teste da penalidade é escrito do ponto de vista de *quem não deve ser
penalizado* ("o abandono do outro não me bloqueia"), e esse continua verde. O teste do dono, se
existir, é do caminho de um ator só, que também continua verde. É verde na suíte e feature morta em
produção — e a story pode até ter avisado do risco oposto (penalizar o inocente) sem ver este.

**How to apply:** ao tornar global uma varredura que também contava algo, perguntar **onde a
contagem passa a acontecer**. A resposta certa é: a contagem pertence à **transição de estado**, não
à visita. Quem transiciona `pending → expired` debita a ficha **do dono daquele registro**, e o
`UPDATE ... WHERE status = <o estado antigo>` é o ponto de serialização que garante uma transição,
logo uma ficha. Isso também é o que impede ficha dobrada sob concorrência.

Relacionado: [[lotemania-reserve-known-defects]].
