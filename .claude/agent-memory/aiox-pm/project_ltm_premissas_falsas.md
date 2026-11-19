---
name: ltm-premissas-falsas
description: Três premissas do EPIC-LTM que a observação ao vivo da Sorteamos derrubou — gateway, atribuição e paridade de escopo
metadata:
  type: project
---

Três premissas que pareciam fechadas no `EPIC-LTM` e caíram ao serem medidas contra a Sorteamos em
produção (2026-11-18/19). Elas não são bug de código — são erro de enquadramento, e por isso não
aparecem em commit nenhum.

1. **"Só a Paysure importa" era decisão certa sobre premissa falsa.** O founder reduziu 19 gateways
   a um; o epic supôs em seguida que a Paysure **cobre a operação do Império**. Não cobre: o BR Code
   de uma campanha ao vivo aponta para `pix.banprime.com.br`, e o painel tem `Banco paysure` **e**
   `PAY2M` cadastrados, com escolha **por sorteio, obrigatória na criação**. Se as duas rotas
   continuam, falta um adaptador que ninguém escreveu — decisão do founder, ainda aberta.
2. **Paridade é o piso errado para atribuição.** A Sorteamos **declara 13 campos de rastreio** e os
   entrega **vazios em 100% dos pedidos reais** (99,6% pela API REST), inclusive em pedidos com
   clique de anúncio confirmado. "Sem perda de campo" é satisfeito trivialmente entregando vazio
   igual. O entregável é o campo **preenchido** — e é por isso que `apps/utm-capture-imperio`
   existe.
3. **Paridade estrita embute decisões de produto sérias, não detalhes copiados.** A Sorteamos **não
   exclui sorteio** (procurado em seis lugares; é o que explica 10.774 sorteios na conta do
   Império), seus padrões de criação são público/na home/vendendo com 1.000.000 de cotas, e ela tem
   uma barra de progresso **editável e fixável** — prova social fabricada, que colide com
   `.claude/rules/claims-ledger.md`.

**Why:** o mandato de 2026-11-18 é *"absolutamente tudo deve ser replicado"*. Sob esse mandato, cada
comportamento observado é candidato a ser construído — inclusive os que o negócio talvez não queira.

**How to apply:** ao propor escopo nesta migração, nunca tratar "a Sorteamos faz X" como
justificativa suficiente nem "temos a coluna X" como paridade cumprida. Separar sempre *o que foi
observado* de *o que se supõe*, e levar ao founder o que é decisão de negócio em vez de resolver por
dedução. Ver [[feedback-epic-maintenance]].
