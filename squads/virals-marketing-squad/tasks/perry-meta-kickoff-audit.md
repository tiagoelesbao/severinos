# Auditoria de Kickoff Meta Ads @perry

**Task ID:** `perry-meta-kickoff-audit`
**Pattern:** HO-TP-001 (Task Anatomy Standard)
**Version:** 1.0.0
**Last Updated:** 2026-10-04
**Governance Protocol:** `squads/squad-creator/protocols/ai-first-governance.md`

## AI-First Governance Gate

- [ ] Applied `squads/squad-creator/protocols/ai-first-governance.md`
- [ ] Mapped `Existing -> Gap -> Decision`
- [ ] Validated canonical sources (docs/meta_mba/ — MBA Meta Performance Engineering)
- [ ] Documented contradictions and unresolved items

## Task Anatomy

| Field | Value |
|-------|-------|
| **task_name** | Auditar Gates de Kickoff de um Cliente de Tráfego Pago |
| **status** | `pending` |
| **responsible_executor** | @perry-marshall |
| **execution_type** | `Agent` |
| **input** | ["slug do cliente (registry, tipo cliente_trafego_pago)"] |
| **output** | ["Status consolidado dos Gates 0-4", "Lista de bloqueios", "Lista de alertas", "Recomendação de próximo passo"] |
| **action_items** | 4 steps |
| **acceptance_criteria** | 3 criteria |

## Executor Specification

| Attribute | Value |
|-----------|-------|
| **Type** | Agent |
| **Pattern** | HO-EP-002 |
| **Executor** | @perry-marshall |
| **Rationale** | Dono do comando `*meta-kickoff` — auditoria de pré-requisitos técnicos/financeiros antes de qualquer campanha subir. |

## Overview

Lê o `brief.yaml` e `gates-status.yaml` de um cliente de tráfego pago (via
`squads/virals-marketing-squad/scripts/_meta_ads_client_resolver.py`) e
devolve um relatório consolidado dos 5 Gates do Kickoff Kit
(`docs/meta_mba/Apostila/MODULO_01_FUNDAMENTOS_OFICIAIS_ECOSSISTEMA_E_ESTRUTURA.md`
seção 6), sem inventar status — só reporta o que está documentado nos
arquivos do cliente.

## Input

- **slug** (string)
  - Description: Slug do cliente no registry (`squads/virals-marketing-squad/data/clients/_registry.yaml`), tipo `cliente_trafego_pago`.

## Output

- **Relatório de Gates** (markdown/texto)
  - Description: Status de cada Gate (ok/pendente/bloqueado/não aplicável), bloqueios que impedem o lançamento, alertas que não bloqueiam mas precisam de atenção.

## Action Items

### Step 1: Resolver o cliente

Chamar `resolve_meta_ads_client(slug)` de `_meta_ads_client_resolver.py`. Se
o slug não existir ou não for `cliente_trafego_pago`, reportar erro com a
lista de clientes disponíveis (`list_meta_ads_clients()`) e parar.

### Step 2: Carregar brief e gates-status

Ler `brief.yaml` (economia, compliance, tracking, orçamento, criativo) e
`gates-status.yaml` (status item a item dos 5 Gates) via `load_brief()` e
`load_gates_status()`.

### Step 3: Consolidar o relatório

Para cada Gate (0 a 4), listar os itens com status `bloqueado` ou `pendente`
primeiro (ordenados por severidade), depois os `ok`. Nunca reportar um Gate
como "liberado" se algum item dentro dele estiver `bloqueado`.

### Step 4: Recomendar o próximo passo

Com base no primeiro bloqueio não resolvido (na ordem Gate 0 → 1a → 1b → 2 →
3 → 4), recomendar a ação específica — não um "resolva os bloqueios"
genérico. Se não houver bloqueios, recomendar o próximo item pendente ou,
se tudo estiver `ok`, recomendar `*sync-meta-kickoff` para refletir o status
no ClickUp.

## Acceptance Criteria

- [ ] **AC-1:** O relatório reflete exatamente o conteúdo de `gates-status.yaml` — nenhum status é inferido ou suposto além do que está escrito no arquivo.
- [ ] **AC-2:** Bloqueios aparecem destacados e em primeiro lugar, nunca escondidos entre itens `ok`.
- [ ] **AC-3:** A recomendação de próximo passo é específica e acionável (nome do arquivo a editar, ação manual a tomar, ou comando a rodar) — não genérica.

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
_Last Updated: 2026-10-04_
_Compliant: Yes_
