---
description: Continuous mid-project health tracking
---
# Task: Project Health Monitoring

**Agents:** @allen-proj (dados) + @lencioni-proj (comunicação)
**Trigger:** Avaliação contínua automática (ou check rápido do PM para não perder o pulso).

## Entradas
- Alterações diárias na data/status no ClickUp;
- Alertas de dependências que passaram o SLA e não foram concluídas.

## Objetivo
1. Manter a pontuação 🟢 / 🟡 / 🔴 de projetos atuais.
2. Identificar antecipadamente que um projeto *vai atrasar* (antes de já ter atrasado).

## O que o agente deve fazer
- Monitore o progresso da fase crítica em Gestão de Projetos (vs. linha do tempo prometida).
- Se houver descumprimento de marcos, mude o Health Score do projeto inteiro para 🟡(Atenção).
- Se a falta de avanço se prolongar por +3 dias: mude para 🔴 e notifique @sutherland-proj com urgência para intervenção ativa.
- Prepare os embasamentos se @lencioni precisar enviar a 'Bad News'.

## Saídas
- Tags/Status Atualizados visíveis no Painel de Projetos.
- Escalonamento preventivo da gerência.
