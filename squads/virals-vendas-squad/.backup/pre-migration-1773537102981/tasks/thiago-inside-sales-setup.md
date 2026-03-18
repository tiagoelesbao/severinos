# Estruturar Inside Sales @thiago-reis

**Task ID:** `thiago-inside-sales-setup`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Inside Sales Methodology BR)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Estruturar Operação de Inside Sales |
| **status** | `pending` |
| **responsible_executor** | @thiago-reis |
| **execution_type** | `Agent` |
| **input** | ["Modelo de Negócio", "Canal de Aquisição", "Ticket Médio"] |
| **output** | ["Processo de Venda BR", "Estratégia de Parcelamento", "Critérios de Rapport"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @thiago-reis |
| **Rationale** | Requer conhecimento das particularidades do mercado de infoprodutos e serviços no Brasil, com foco em fechamento via WhatsApp e videochamada. |

## Overview

Estrutura o fluxo de trabalho dos vendedores internos (closers e SDRs), definindo como o lead será abordado, qualificado e fechado dentro da realidade brasileira.

## Input

- **Modelo de Negócio** (enum)
  - Description: Lançamento, Evergreen ou Mentoria High Ticket.
- **Ticket Médio** (number)
  - Description: Valor base do produto para definir a agressividade do parcelamento.

## Output

- **Processo de Venda BR** (markdown)
  - Description: Mapeamento de passos adaptado para WhatsApp.

## Action Items

### Step 1: Definir o Fluxo de Entrada

Estabelecer como o lead chega (via formulário, direct ou botão de Whats) e o SLA de resposta (meta < 5 min).

### Step 2: Adaptar o Pipeline para a Cultura BR

Ajustar os nomes das fases e critérios de @ross-sales para algo mais próximo da linguagem local.

### Step 3: Desenvolver Estratégia de Ancoragem de Preço

Definir como apresentar o preço (sempre parcelado primeiro) e quais gatilhos de urgência real usar.

### Step 4: Criar Framework de Rapport Local

Estabelecer como os vendedores devem quebrar o gelo e gerar autoridade rapidamente no WhatsApp.

### Step 5: Definir Plataformas de Pagamento e Checkout

Configurar as ferramentas (Hotmart, Kiwify, etc.) e como os links de pagamento serão enviados.

### Step 6: Estruturar a Coleta de Provas Sociais

Criar o processo para que cada venda gerada alimente o banco de depoimentos local do squad.

## Acceptance Criteria

- [ ] **AC-1:** O processo define o WhatsApp como canal primário de fechamento.
- [ ] **AC-2:** A estratégia de parcelamento está alinhada com o ticket médio para maximizar o poder de compra.
- [ ] **AC-3:** O fluxo inclui um passo obrigatório de geração de autoridade antes da oferta.

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
