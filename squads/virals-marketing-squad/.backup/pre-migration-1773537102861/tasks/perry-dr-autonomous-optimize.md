# Otimização Autônoma de Campanha DR @perry

**Task ID:** `perry-dr-autonomous-optimize`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Automated Rule Set)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Otimizar Campanha DR Autonomamente |
| **status** | `pending` |
| **responsible_executor** | @perry-marshall |
| **execution_type** | `Worker` |
| **input** | ["API das Plataformas (Meta/Google)", "Parâmetros de CPA/ROAS aprovados"] |
| **output** | ["Log de ações (ClickUp)", "Relatório semanal de performance"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Worker |
| **Pattern** | HO-EP-004 |
| **Executor** | @perry-marshall (Automation Logic) |
| **Rationale** | Requer execução de regras determinísticas baseadas em limites numéricos claros (if CPA > X then pause). |

## Overview

Otimização autônoma diária e semanal das campanhas de direct response ativas, dentro dos parâmetros aprovados, com logs automáticos.

## Input

- **API das Plataformas** (connect)
  - Description: Acesso aos dados em tempo real.
- **Parâmetros aprovados** (yaml)
  - Description: Limites de CPA, ROAS e budget por produto.

## Output

- **Log de ações** (text)
  - Description: Registro de quais adsets foram pausados ou escalados.

## Action Items

### Step 1: Coletar Dados das Últimas 24h

Extrair métricas de todas as campanhas, adsets e anúncios ativos.

### Step 2: Comparar Performance vs Meta

Aplicar os filtros de CPA máximo e ROAS mínimo definidos no planejamento.

### Step 3: Aplicar Regras Automáticas

Executar ações: Pausar (se CPA > meta x2), Escalar (se CPA < meta x0.8), Ajustar Bid.

### Step 4: Registrar Ações

Publicar o log detalhado no ClickUp para visibilidade do CMO.

### Step 5: Gerar Relatório Semanal

Consolidar os ganhos de eficiência obtidos pelas otimizações autônomas.

## Acceptance Criteria

- [ ] **AC-1:** Nenhuma campanha permanece ativa com CPA acima do dobro da meta por mais de 48h.
- [ ] **AC-2:** Todas as ações tomadas estão devidamente logadas com o motivo (trigger).
- [ ] **AC-3:** O relatório semanal bate com os dados das plataformas de anúncio.

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
