---
description: Project Kickoff facilitation
---
# Task: Project Kickoff Facilitation

**Agent:** @sutherland-proj (ou conjuntamente com quem faz o PM, ex: humano)
**Trigger:** Início oficial das atividades de um novo projeto, após o sprint plan inicial.

## Entradas
- `project-brief-template.md` aprovado.
- `sprint-template.md` do Sprint 1.

## Objetivo
1. Alinhar todos os executores e stakeholders sobre o objetivo do projeto.
2. Validar que não restam dúvidas sobre o "O que" e "Como".

## O que o agente deve fazer
- Preparar a pauta do Kickoff.
- Passar com a equipe pelo `project-kickoff-checklist.md`.
- Garantir que a definição de sucesso e prazo/appetite (ex: 2 ou 6 semanas) seja verbalizada.
- Coletar possíveis obstáculos prévios que a equipe aponte.

## Saídas
- Ata automática com as decisões.
- `project-kickoff-checklist.md` com tick OK em todos os itens de "Antes" e "Durante".
- Status do projeto atualizado para "Em Execução" rodando: `node services/clickup/tasks.js update --department "Projetos" --area "Painel de Projetos" --process "Projetos Internos" --name "[Nome do Projeto]" --status "Em Execução"`.
