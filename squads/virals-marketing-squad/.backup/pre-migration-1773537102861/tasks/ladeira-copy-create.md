# Criar Copy de Alta Conversão @ladeira

**Task ID:** `ladeira-copy-create`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Ladeira/Schwartz methodology)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Copy de Alta Conversão |
| **status** | `pending` |
| **responsible_executor** | @ladeira |
| **execution_type** | `Agent` |
| **input** | ["Avatar", "Oferta", "Nível de Consciência", "Plataforma/Formato"] |
| **output** | ["Headlines persuasivas", "Corpo da copy", "Sequência de Storytelling", "CTA específico"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 4 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @ladeira |
| **Rationale** | Requer conhecimento de níveis de consciência, psicologia de persuasão e adaptação linguística para o mercado brasileiro. |

## Overview

Cria copy persuasiva para múltiplos formatos (emails, landing pages, anúncios) com base nos níveis de consciência de Eugene Schwartz e psicologia de vendas brasileira.

## Input

- **Avatar** (string)
  - Description: Perfil detalhado do público-alvo (dores, desejos, objeções).
  - Required: Yes
- **Nível de Consciência** (enum)
  - Description: Unaware, Problem Aware, Solution Aware, Product Aware, Most Aware.
  - Required: Yes

## Output

- **Headlines persuasivas** (array)
  - Description: Dez ou mais opções de headlines baseadas no nível de consciência.
- **Corpo da copy** (markdown)
  - Description: Texto completo formatado para o canal escolhido.

## Action Items

### Step 1: Identificar o Nível de Consciência

Determinar o quão ciente o lead está do problema e da sua solução antes de escrever uma única linha.

### Step 2: Gerar 10+ Headlines

Criar variações de headlines que parem o scroll e ressoem com o nível de consciência detectado.

### Step 3: Estruturar o Storytelling

Construir a narrativa (arco emocional) que conecte a dor do lead à solução da oferta.

### Step 4: Definir CTA Forte

Criar uma chamada para ação clara, única e irresistível para o final da copy.

### Step 5: Revisar com Checklist

Submeter a copy ao `copy-review-checklist.md` para garantir clareza e persuasão.

## Acceptance Criteria

- [ ] **AC-1:** A copy começa exatamente no ponto de consciência em que o lead se encontra.
- [ ] **AC-2:** A headline gera uma lacuna de curiosidade clara.
- [ ] **AC-3:** O tom de voz está alinhado com o avatar definido.
- [ ] **AC-4:** O CTA é direto e aponta para o próximo passo lógico no funil.

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
