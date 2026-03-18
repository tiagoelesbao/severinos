# Criar Playbook WhatsApp de Vendas @thiago-reis

**Task ID:** `thiago-whatsapp-playbook`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-03-12
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (WhatsApp Sales Best Practices BR)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Criar Playbook de Vendas WhatsApp |
| **status** | `pending` |
| **responsible_executor** | @thiago-reis |
| **execution_type** | `Agent` |
| **input** | ["Script Straight Line", "Objeções mapeadas", "Avatar BR"] |
| **output** | ["Playbook WhatsApp", "Scripts de áudio", "Cadência de 3 dias"] |
| **action_items** | 6 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @thiago-reis |
| **Rationale** | Requer adaptação cultural e de formato para o canal WhatsApp, respeitando o ritmo de conversa brasileiro. |

## Overview

Adapta scripts de vendas complexos para o formato nativo do WhatsApp, garantindo que a comunicação seja fluida, pessoal e focada em gerar relacionamento antes da venda.

## Input

- **Script Principal** (markdown)
  - Description: O roteiro de vendas base criado por @belfort-sales.
- **Avatar BR** (string)
  - Description: Nuances do público brasileiro (nível de desconfiança, gírias, etc).

## Output

- **Playbook WhatsApp** (markdown)
  - Description: Guia com mensagens prontas para copiar e colar.

## Action Items

### Step 1: Fragmentar o Script Principal

Dividir os blocos de texto do script original em mensagens curtas (máximo 4 linhas por mensagem).

### Step 2: Adaptar para Tom Conversacional

Reescrever as frases para que pareçam uma conversa natural entre pessoas, e não um robô de vendas.

### Step 3: Definir Pontos de Áudio

Identificar momentos no script onde um áudio de 45-90 segundos gera mais autoridade e conexão do que texto.

### Step 4: Criar a Cadência de 3 Dias

Estabelecer o ritmo de follow-up pós-envio de proposta para evitar o silêncio do lead.

### Step 5: Incluir Diretrizes de Etiqueta

Definir o uso de emojis, figurinhas e horários de envio que respeitem a privacidade do cliente.

### Step 6: Validar Legibilidade

Garantir que nenhuma parte do playbook contenha blocos de texto densos que dificultem a leitura no mobile.

## Acceptance Criteria

- [ ] **AC-1:** Todas as mensagens do playbook possuem menos de 5 linhas de texto.
- [ ] **AC-2:** O playbook contém roteiros específicos para áudios estratégicos.
- [ ] **AC-3:** A cadência de follow-up inclui gatilhos de reativação que não são cobranças diretas.

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
