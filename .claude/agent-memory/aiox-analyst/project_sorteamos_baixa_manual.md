---
name: sorteamos-baixa-manual
description: "Baixa manual" no Império é o operador marcando compra como paga à mão (approvedBy=admin) para fechar a rodada — já conta como faturamento
metadata:
  type: project
---

Numa rodada de 100 títulos, o sorteio só acontece com os 100 vendidos. O que não vende
organicamente, **um admin marca como pago à mão** — e `order.approvedBy` fica `"admin"` em vez do
nome de um gateway real (`paysure`, `pay2m`). O cliente chama isso de **baixa manual**.

Medido ao vivo (2026-10-17): **647 títulos em 10 dias / 295 sorteios**, e **11 casos em que o
título de baixa manual ganhou o prêmio do dia**.

**Why:** o valor da baixa manual **já está dentro do faturamento** — conta como compra paga. O
campo `approvedBy` só permite separar na visualização, depois. Qualquer tela ou relatório que não
separe os dois reporta como receita de cliente aquilo que foi o próprio operador fechando o lote.
Foi pedido explícito do cliente que o modal de Faturamento separe os dois.

**How to apply:** em qualquer análise de faturamento do Império, separar baixa automática de
manual antes de concluir qualquer coisa sobre receita, ticket ou crescimento. E em paridade: o
`apps/lotemania` **não tem o campo** — logo não pode construir essa tela nem aproximadamente.
Contexto completo em [[baseline-sorteamos]].
