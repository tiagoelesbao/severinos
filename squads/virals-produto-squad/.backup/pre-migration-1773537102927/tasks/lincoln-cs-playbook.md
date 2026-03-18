# Criar Playbook de CS @lincoln-produto

**Task ID:** `lincoln-cs-playbook`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Sixteen Ventures CS Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Playbook de Customer Success |
| **status** | `pending` |
| **responsible_executor** | @lincoln-produto |
| **execution_type** | `Agent` |
| **input** | ["Desired Outcome do Cliente", "Marcos de Sucesso (Milestones)", "Segmentos de Cliente"] |
| **output** | ["Fluxo de Touchpoints Proativos", "Scripts de Check-in", "Rituais de Sucesso"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @lincoln-produto |
| **Rationale** | Requer conhecimento em psicologia de retenção e estruturação de jornadas de valor pós-venda. |

## Overview

Desenvolve o guia de atuação para os gerentes de sucesso, saindo do modelo reativo (suporte) para um modelo proativo que garante que o cliente atinja o resultado que buscou ao comprar o produto.

## Input

- **Desired Outcome** (string)
  - Description: O que o cliente define como "sucesso".
- **Marcos de Sucesso** (array)
  - Description: Eventos que provam o avanço do cliente na jornada.

## Output

- **Playbook de CS** (markdown)
  - Description: Guia com o que fazer e quando falar com o cliente.

## Action Items

### Step 1: Mapear a Jornada de Valor

Identificar todos os pontos onde o cliente interage com a Virals desde o pagamento até o resultado final.

### Step 2: Definir Touchpoints Proativos

Estabelecer datas fixas ou gatilhos de comportamento para entrar em contato com o cliente (ex: D+1, D+7, D+30).

### Step 3: Criar Scripts de Check-in de Valor

Redigir modelos de mensagens que foquem em "como podemos te ajudar a chegar no próximo nível" em vez de "está tudo bem?".

### Step 4: Estabelecer Gatilhos de Alerta (Red Flags)

Definir quando o CS deve intervir urgentemente (ex: cliente sem login por 5 dias).

### Step 5: Documentar Rituais de Expansão

Mapear o momento ideal para oferecer um Upsell baseado no sucesso já atingido pelo cliente.

## Acceptance Criteria

- [ ] **AC-1:** O playbook possui pelo menos 3 touchpoints proativos nos primeiros 30 dias.
- [ ] **AC-2:** Cada marco de sucesso (Milestone) possui um critério de medição claro no CRM.
- [ ] **AC-3:** O documento diferencia a atuação entre clientes High-touch e Low-touch (Tech-touch).

## Validation Checklist (HO-TP-001)

### Mandatory Fields Check

- [ ] `task_name` follows "Verb + Object" format
- [ ] `status` is one of: pending | in_progress | completed
- [ ] `responsible_executor` is clearly specified
- [ ] `execution_type` is one of: Human | Agent | Hybrid | Worker
- [ ] `input` array has at least 1 item
- [ ] `output` array has at least 1 item
- [ ] `action_items` has clear, actionable steps
- [ ] `acceptance_criteria` has measurable criteria

---

_Task Version: 1.0.0_
_Pattern: HO-TP-001 (Task Anatomy Standard)_
_Last Updated: 2026-03-12_
_Compliant: Yes_
