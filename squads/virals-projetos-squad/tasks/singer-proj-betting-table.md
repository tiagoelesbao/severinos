---
description: Betting Table to decide which projects get greenlit
---
# Task: Betting Table

**Agent:** @singer-proj
**Trigger:** Avaliação periódica de "pitches" de projeto (briefings com shape feito) para decidir em qual apostar.

## Entradas
- Lista de `project-brief-template.md` (pitches) aguardando aprovação.
- Contexto de capacidade atual da equipe (disponível via *Ops Squad*).

## Objetivo
1. Decidir quais projetos vão receber recursos e quais não vão.
2. Não colocar em backlog infinito os projetos reprovados (Drop instead of delay).

## O que o agente deve fazer
- Avalie o 'Appetite' versus o Retorno Esperado.
- Se o projeto for aprovado: Mude o status para 'Aprovado' e acione @sutherland-proj para planejamento de execução (Sprints).
- Se reprovado: O projeto "morre" (não vai para backlog). Descarte e informe o requerente.
- Garanta que a equipe não receba mais trabalho do que consegue executar na duração do Appetite definido.

## Saídas
- Lista de projetos aprovados encaminhados para @sutherland-proj.
- Notificação de projetos reprovados descartados.
