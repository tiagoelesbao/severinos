# Virals Projetos Squad

## Overview

Squad transversal responsável pela criação, estruturação, monitoramento e encerramento de projetos internos e externos da Virals. Conecta todos os outros squads através da orquestração de entregáveis e prazos.

## Purpose

This squad resolves the translation from strategy/briefing to execution. It acts as the "glue" that binds all other Virals squads together, ensuring nothing falls through the cracks and every commitment has an owner, a deadline, and a precise scope.

Project without structure is hope. Structure without execution is bureaucracy. We manage by clarity, not just by software.

## When to Use This Squad

Use virals-projetos-squad when you want to:

- Criar um novo projeto (interno ou externo) a partir de briefing
- Estruturar as fases e marcos de um projeto
- Criar e alocar tasks para outros squads dentro de um projeto
- Monitorar status de projetos ativos
- Identificar projetos em risco (atrasados, sem dono, sem prazo)
- Conduzir reunião de kick-off de projeto
- Criar relatório de status para cliente externo
- Realizar encerramento formal de projeto
- Priorizar projetos quando há conflito de recursos

## What's Included

### Agents

- **@singer-proj** (Tier 0): Arquiteto de Projetos (Shape Up). Decide o que fazer, tamanho do escopo e remove "buracos" antes de começar.
- **@sutherland-proj** (Tier 1): Mestre de Execução (Scrum). Decompõe, prioriza backlog, remove impedimentos e conduz sprints.
- **@catmull-proj** (Tier 1): Guardião da Qualidade Criativa. Conduz gates de revisão para entregáveis criativos de campanhas e conteúdo.
- **@lencioni-proj** (Tier 2): Arquiteto de Relacionamento. Gere comunicações, relatórios e expectativas de clientes e stakeholders.
- **@allen-proj** (Tier 2): Arquiteto de Clareza (GTD). Faz a revisão semanal de portfólio e organiza inbox e tarefas do ClickUp.

### Tasks

16 custom tasks spanning Intake, Planning, Execution, Relationship Management, and Portfolio capture routines, including the critical `cross-squad-task-creation.md`.

### Workflows

- `external-project-lifecycle.yaml`: Full end-to-end client project process
- `internal-project-lifecycle.yaml`: Virals internal project management
- `creative-production-workflow.yaml`: Content generation checks and balances
- `campaign-project-workflow.yaml`: Cross-squad campaign coordination
- `weekly-portfolio-review.yaml`: Automation to review all active projects

### Templates

7 specialized templates including Project Briefs, Creative Briefs, Sprint Plans, Status Reports, and the Cross-Squad Brief.

### Checklists

6 quality assurance checklists ensuring deliverables meet standards before gates are passed (e.g. Kick-off, Launch, Closure).

## Installation

To install this squad, run:

```bash
npm run install:squad virals-projetos-squad
```

Or manually:

```bash
node tools/install-squad.js virals-projetos-squad
```

## Squad Structure

```
squads/virals-projetos-squad/
├── agents/             # The 5 domain expert agents
├── checklists/         # Validation checklists
├── squad.yaml         # Squad configuration
├── data/               # Knowledge bases
├── README.md           # This document
├── tasks/              # Workflow tasks
└── templates/          # Briefs and reports templates
├── workflows/          # Lifecycles
```

## Key Features

- **Cross-Squad Orchestration**: Bridges the gap between Vendas, Marketing, Produto, and Ops.
- **Appetite over Estimation**: Uses Shape Up methodology to define time investment before scope.
- **Candor & Quality Gates**: Ed Catmull-style creative review gates prevent bad content from shipping.
- **Proactive Stakeholder Comms**: Lencioni-based protocols to deliver bad news with solutions before the client notices.
- **Weekly Portfolio Review**: GTD protocol to ensure zero projects live without a defined next action.

## Integration with Core AIOX

virals-projetos-squad integrates seamlessly with:

- ClickUp (via MCP) for task tracking and status monitoring across Spaces
- `virals-ops-squad` for OKR alignment and POP generation
- `virals-marketing-squad` & `virals-vendas-squad` for workload distribution

## Workspace Integration Governance

- **Integration level:** `read_write`
- **Rationale:** Reads project briefings and writes tasks/milestones across all squad domains in ClickUp
- **Read paths:** `workspace/businesses/virals/projects/`
- **Write paths:** `workspace/businesses/virals/projects/`
- **Template namespace:** `projetos`

---

**Ready to transform intentions into shipped deliverables? Let's get started! 🚀**

_Version: 1.0.0_
_Compatible with: AIOX-FULLSTACK v4+_
