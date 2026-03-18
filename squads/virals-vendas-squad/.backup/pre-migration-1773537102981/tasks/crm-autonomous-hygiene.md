# Higiene Autônoma do CRM @sales-chief

**Task ID:** `crm-autonomous-hygiene`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (CRM Automation Rules)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Executar Higiene Autônoma de CRM |
| **status** | `pending` |
| **responsible_executor** | @sales-chief |
| **execution_type** | `Worker` |
| **input** | ["API do ClickUp/CRM", "Regras de SLA de Vendas", "Configurações de Alerta"] |
| **output** | ["Lista de alertas diários", "Status atualizado de leads", "Dashboard de higiene"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Worker |
| **Pattern** | HO-EP-004 |
| **Executor** | @sales-chief (Automation Logic) |
| **Rationale** | Requer monitoramento contínuo de timestamps e mudança de status para disparar alertas determinísticos de SLA. |

## Overview

Manutenção autônoma e sistemática da integridade dos dados no CRM, garantindo que nenhum lead fique sem resposta e que o pipeline esteja sempre atualizado.

## Input

- **API de Dados** (connect)
  - Description: Acesso em tempo real aos eventos do CRM.
- **Regras de SLA** (yaml)
  - Description: Tempos máximos para cada mudança de estágio.

## Output

- **Alertas de SLA** (text/task)
  - Description: Notificações enviadas aos closers sobre atrasos.

## Action Items

### Step 1: Verificar Leads Inbound sem Contato

Identificar novos leads que não tiveram interação por mais de 30 minutos em horário comercial.

### Step 2: Identificar Estagnação de Estágio

Localizar deals em "Negociação" ou "Proposta" sem atividade registrada por mais de 3 dias.

### Step 3: Enviar Lista de Follow-ups do Dia

Consolidar todos os contatos agendados para a data atual e enviar um resumo matinal para cada responsável.

### Step 4: Marcar Leads "Zumbis"

Identificar e etiquetar leads com mais de 15 dias de silêncio para que @blount-sales execute a sequência de reativação.

### Step 5: Gerar Dashboard de Higiene Semanal

Consolidar métricas de velocidade do pipeline e integridade de dados para a reunião de sexta-feira.

## Acceptance Criteria

- [ ] **AC-1:** Alertas de SLA são disparados em menos de 5 minutos após a quebra da regra.
- [ ] **AC-2:** Não existem deals no pipeline "Ativo" sem um responsável (Assignee) definido.
- [ ] **AC-3:** O resumo matinal de follow-ups é entregue até as 8h30 diariamente.

## Validation Checklist (HO-TP-001)

### Mandatory Fields Check

- [ ] `task_name` follows "Verb + Object" format
- [ ] `status` is one of: pending | in_progress | completed
- [ ] `responsible_executor` is clearly specified
- [ ] `execution_type` is one of: Human | Agent | Hybrid | Worker
- [ ] `input` array has at least 1 item
- [ ] `output` array has at least 1 item
- [ ] `action_items` has clear, actionable_steps
- [ ] `acceptance_criteria` has measurable criteria

---

_Task Version: 1.0.0_
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-12_
_Compliant: Yes_
