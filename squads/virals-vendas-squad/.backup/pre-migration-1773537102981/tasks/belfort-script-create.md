# Criar Script de Vendas @belfort-sales

**Task ID:** `belfort-script-create`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (Straight Line System)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Script de Vendas |
| **status** | `pending` |
| **responsible_executor** | @belfort-sales |
| **execution_type** | `Agent` |
| **input** | ["Offer Document", "Perfil do Lead", "Canal de Venda"] |
| **output** | ["Script Straight Line", "Guia de Tonalidade", "Versão Adaptada WhatsApp"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 4 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @belfort-sales |
| **Rationale** | Requer domínio de engenharia de conversas persuasivas e aplicação do sistema de linha reta para controle de narrativa. |

## Overview

Cria um script de vendas completo dividido em 5 fases, focado em levar o lead da abertura ao fechamento sem desvios, com tonalidade calibrada.

## Input

- **Offer Document** (markdown)
  - Description: Detalhes da oferta estruturada por @hormozi-sales.
- **Canal de Venda** (enum)
  - Description: Ligação, Videochamada ou WhatsApp.

## Output

- **Script Straight Line** (markdown)
  - Description: O roteiro mestre com as 5 fases da venda.
- **Versão Adaptada WhatsApp** (markdown)
  - Description: Adaptação cultural e de formato feita por @thiago-reis.

## Action Items

### Step 1: Analisar a Oferta

Ler o documento da oferta e o ICP para entender quais dores o script deve ecoar.

### Step 2: Estruturar o Rapport e Abertura

Criar os primeiros 4 segundos de conexão que projetam entusiasmo, inteligência e autoridade.

### Step 3: Definir Perguntas de Diagnóstico

Listar as 5+ perguntas que revelam a dor do lead e qualificam sua necessidade (BANT).

### Step 4: Criar a Ponte da Solução

Estruturar como a oferta resolve exatamente as dores mapeadas no diagnóstico.

### Step 5: Elaborar o Fechamento Assumptivo

Escrever o pedido de compra direto, seguido do silêncio necessário para a resposta do lead.

### Step 6: Integrar com @thiago-reis

Handoff do script para o especialista BR adaptar a linguagem e o ritmo para WhatsApp.

## Acceptance Criteria

- [ ] **AC-1:** O script segue a ordem Rapport → Diagnóstico → Apresentação → Fechamento → Objeções.
- [ ] **AC-2:** Existem indicações de tonalidade (ex: sussurro, certeza, curiosidade) para cada fase.
- [ ] **AC-3:** O script contém pelo menos 2 "loppings" para reconstruir certeza nos 3 Tens.
- [ ] **AC-4:** A versão WhatsApp está dividida em mensagens curtas e interativas.

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
