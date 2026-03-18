# Mapear Objeções @belfort-sales

**Task ID:** `belfort-objection-map`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Objection Handling Framework)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Mapear e Resolver Objeções |
| **status** | `pending` |
| **responsible_executor** | @belfort-sales |
| **execution_type** | `Agent` |
| **input** | ["Top 10 objeções comuns", "Contexto do produto", "Dores do ICP"] |
| **output** | ["Mapa de Objeções", "Scripts de Contorno", "Third-party stories"] |
| **action_items** | 5 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @belfort-sales |
| **Rationale** | Requer habilidade em identificar a objeção real (medo do risco) por trás da declarada (falta de tempo/dinheiro). |

## Overview

Mapeia as top 10 objeções para um produto específico e cria respostas padronizadas usando o framework decontorno de 5 passos, focando em elevar a certeza do lead.

## Input

- **Top 10 objeções** (array)
  - Description: Lista do que os leads costumam dizer para não comprar.
- **ICP** (string)
  - Description: Perfil do comprador para ajustar o tom do contorno.

## Output

- **Mapa de Objeções** (markdown/table)
  - Description: Tabela com objeção, classificação e script de resposta.

## Action Items

### Step 1: Coletar e Classificar

Listar as objeções e separar entre "Objeção Declarada" (fumaça) vs "Objeção Real" (certeza baixa).

### Step 2: Aplicar o Framework de Contorno

Para cada objeção, escrever o script seguindo: Reconhecer → Qualificar → Isolar → Resolver → Retestar.

### Step 3: Criar Third-party Stories

Desenvolver histórias curtas de outros clientes que tinham a mesma dúvida e como eles tiveram sucesso após a compra.

### Step 4: Adaptar para WhatsApp

Ajustar os textos para que fiquem naturais no formato de chat, com auxílio de @thiago-reis.

### Step 5: Consolidar no Playbook

Inserir o mapa de objeções no documento oficial de treinamento da equipe.

## Acceptance Criteria

- [ ] **AC-1:** Cada objeção possui um script de contorno que termina com uma pergunta de reteste.
- [ ] **AC-2:** Pelo menos 5 third-party stories foram criadas para as objeções mais críticas.
- [ ] **AC-3:** O mapa de objeções identifica claramente se o problema é Certeza no Produto, no Closer ou na Empresa.

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
