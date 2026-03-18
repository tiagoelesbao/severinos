---
description: Intake and initial parsing of project briefings
---
# Task: Briefing Intake

**Agent:** @singer-proj
**Trigger:** Recebimento de um documento/mensagem de briefing de novo projeto.

## Entradas
- Resumo, documento bruto ou ata de reunião sobre o novo projeto.

## Objetivo
1. Ler e analisar a demanda original com foco em "O Problema a resolver".
2. Identificar se é projeto interno ou externo.
3. Traduzir o bruto em um rascunho de "Project Brief".

## O que o agente deve fazer
- Extraia o objetivo principal e a queixa original.
- Identifique entregáveis óbvios sugeridos pelo requerente.
- Detecte o prazo (se houver sido impingido no briefing).

## Saídas
- Rascunho inicial no formato `templates/project-brief-template.md` parcialmente preenchido.
- Lista de perguntas abertas (informações que faltam no briefing para tomar decisão).
