---
description: Criação de marcos avançados com departamentos, KPIs e delegação
---
# Task: Criar Marcos Avançados (Milestones v3.0)

**Agent:** @sutherland-proj
**Trigger:** Ciclo do projeto interno "Starter & Growth" (Virals ou Oraclum) precisa de marcos criados/atualizados no ClickUp.

## Entradas
- Dados de marcos versionados em `squads/virals-projetos-squad/data/project-milestones.js` (não depende mais de Google Doc externo — ver nota de migração abaixo).
- Empresa alvo: `virals` ou `oraclum`.

---

## Pipeline de Execução (2 Fases)

### Fase 1: Rodar o script
```bash
node squads/virals-projetos-squad/scripts/create_milestones.js virals    # ou: oraclum
node squads/virals-projetos-squad/scripts/create_milestones.js oraclum --dry-run   # simulação
```
O script é **idempotente**: se o Epic ou Story já existe (mesmo nome, mesmo parent), pula em vez de duplicar. Seguro rodar múltiplas vezes.

Para cada marco em `project-milestones.js`, o script cria:
- **Epic:** `[DEPT] Marco: [Nome do Marco]` — com Responsável, Outcome (KPI) e origem no Planejamento Estratégico (Doc nativo do ClickUp) na descrição.
- **3 Stories padrão** (ou customizadas via `stories` no dado): `[Setup]`, `[Execução]`, `[QA & Entrega]`.
- **Checklist de Acceptance Criteria** em cada story que tiver `checklist` definido.

### Fase 2: Validação e Relatório
1. Conferir o resumo impresso pelo script (`X criados, Y já existentes`).
2. Vincular o resumo como comentário na task principal do projeto (`86ag692nm` para Virals, `86ak1bp6a` para Oraclum, em Projetos Internos).
3. Notificar os squads responsáveis sobre os marcos delegados a eles.

---

## Departamentos (enum real do ClickUp)
O campo "Departamento" da lista OKR e o padrão de nomenclatura `[DEPT] Marco:` usam:
**Gestão / Comercial / Projetos / Marketing / Produto / Gente & Cultura**

(Divergência histórica corrigida em 2026-08-16 — a v2.1 desta task listava "Marketing / Produto / Operações / Vendas / Tecnologia", que não batia com o enum real do custom field "Departamento" usado no restante do workspace.)

---

## Nota de Migração (v2.1 → v3.0, 2026-08-16)
A versão anterior desta task lia um "Termo de Abertura do Projeto" no Google Docs (hardcoded pra Virals, sem equivalente pra Oraclum) e fazia parsing de tabela rica. Isso foi substituído por dados estruturados versionados no repositório, para que o mesmo pipeline funcione para as duas empresas do ecossistema sem depender de um documento externo por marca.

## Saídas
- Marcos criados/atualizados no ClickUp com departamento, KPI e responsável.
- Delegação automática para squads responsáveis (via nome do Epic/Story).
- Relatório de estrutura com breakdown de criados vs. já existentes.
- Timeline visível no Gantt do ClickUp.
