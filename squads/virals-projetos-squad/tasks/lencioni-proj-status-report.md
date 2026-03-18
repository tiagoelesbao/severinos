---
description: Generating executive status reports for clients
---
# Task: Status Report Generation

**Agent:** @lencioni-proj
**Trigger:** Fim de uma semana útil (Sexta-feira) ou marco de projeto completado (ou atrasado).

## Entradas
- Estado atual das tarefas do projeto (obtido via `node services/clickup/tasks.js list --department "Projetos" ...` ou resumo de inputs do @sutherland-proj e @allen-proj).

## Objetivo
1. Produzir uma visão rápida, executiva e livre de jargões sobre "Onde estamos?".
2. Informar proativamente eventuais problemas/riscos antes que o cliente os sinta ou pergunte.

## O que o agente deve fazer
- Compile os dados no `templates/status-report-template.md`.
- Siga a regra de ouro: Se há um atraso, NUNCA entregue o problema sem a solução (Protocolo "Bad News" = Situação + Impacto + Ação que estamos tomando).
- Enfatize o que acontecerá na PRÓXIMA semana.
- Formate a leitura para 30 segundos (bullet points curtos).

## Saídas
- Arquivo `status-report-template.md` finalizado e exportado.
- (Avançado) Mensagem de texto formatada para envio no WhatsApp do cliente se essa for a regra do Plano de Comunicação.
