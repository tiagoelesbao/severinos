# Task: Follow-Up

**ID:** VH-TASK-304
**Phase:** 3 — Abordagem
**Agent:** @hunter-closer (Brittany)
**Execution Type:** Agent (gera) + Human (executa)
**Status:** template

---

## Objetivo

Gerar mensagens de follow-up para creators que não responderam à primeira DM.

## Input

- Creators contatadas sem resposta
- Config: outreach-sequences.yaml > follow_up

## Output

- Follow-ups personalizados (D+1, D+3, D+7)

## Action Items

1. Identificar creators sem resposta (check ClickUp status)
2. Gerar follow-up D+1 (lembrete suave)
3. Gerar follow-up D+3 (escassez/urgência)
4. Gerar follow-up D+7 (último contato)
5. Regras:
   - Se respondeu em D+1: NÃO enviar D+3 e D+7
   - Se respondeu NÃO: parar e marcar "rejected"
   - Após D+7 sem resposta: marcar "no_response"

## Acceptance Criteria

- [ ] Follow-ups gerados para cada deadline
- [ ] Regras de parada respeitadas
- [ ] ClickUp atualizado com cada interação
