# Construir Funil Completo de Nutrição @ezra

**Task ID:** `ezra-funnel-build`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Ezra Firestone Funnels)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Construir Funil de Nutrição |
| **status** | `pending` |
| **responsible_executor** | @ezra-firestone |
| **execution_type** | `Agent` |
| **input** | ["Estratégia de Marca", "Pillar Content", "Público-alvo", "Budget de Brand"] |
| **output** | ["Arquitetura do Funil", "Sequências de Retargeting", "Briefing de Criativos nativos"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ezra-firestone |
| **Rationale** | Requer planejamento sistêmico de jornada do cliente e segmentação avançada por cohort e temperatura. |

## Overview

Estrutura o funil completo de nutrição da Virals (topo, meio, fundo), construindo audiência qualificada e relacionamento antes da conversão.

## Input

- **Pillar Content** (file/link)
  - Description: Conteúdo de base para as campanhas de awareness.
- **Público-alvo** (string)
  - Description: Definição de quem queremos atrair no topo do funil.

## Output

- **Arquitetura do Funil** (markdown)
  - Description: Visualização das camadas e gatilhos de passagem.

## Action Items

### Step 1: Configurar Topo de Funil (Prospecting)

Criar campanhas de alcance e vídeo views focadas em públicos similares (Lookalike) e interesses.

### Step 2: Configurar Retargeting por Cohort

Mapear audiências de quem viu 75% dos vídeos ou visitou o site nos últimos 30 dias.

### Step 3: Definir Mensagens por Temperatura

Garantir que o lead morno receba conteúdo educativo/provas sociais e não oferta direta.

### Step 4: Mapear Jornada do Lead

Garantir que existam pontos de contato (touchpoints) suficientes antes do "ask".

### Step 5: Configurar Captação de Leads

Estabelecer a ponte para a lista de espera ou nutrição via e-mail.

## Acceptance Criteria

- [ ] **AC-1:** O funil possui pelo menos 3 camadas distintas (Cold/Warm/Hot).
- [ ] **AC-2:** Existem exclusões configuradas para que compradores não vejam anúncios de topo.
- [ ] **AC-3:** O ThruPlay% médio esperado é superior a 15% para as campanhas de topo.

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
