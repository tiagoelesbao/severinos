<!-- VIRALS-PROJECT-START -->


# Synkra AIOX Development Rules for Claude Code

You are working with Synkra AIOX, an AI-Orchestrated System for Full Stack Development.

<!-- AIOX-MANAGED-START: core-framework -->
## Core Framework Understanding

Synkra AIOX is a meta-framework that orchestrates AI agents to handle complex development workflows. Always recognize and work within this architecture.
<!-- AIOX-MANAGED-END: core-framework -->

<!-- AIOX-MANAGED-START: constitution -->
## Constitution

O AIOX possui uma **Constitution formal** com princípios inegociáveis e gates automáticos.

**Documento completo:** `.aiox-core/constitution.md`

**Princípios fundamentais:**

| Artigo | Princípio | Severidade |
|--------|-----------|------------|
| I | CLI First | NON-NEGOTIABLE |
| II | Agent Authority | NON-NEGOTIABLE |
| III | Story-Driven Development | MUST |
| IV | No Invention | MUST |
| V | Quality First | MUST |
| VI | Absolute Imports | SHOULD |

**Gates automáticos bloqueiam violações.** Consulte a Constitution para detalhes completos.
<!-- AIOX-MANAGED-END: constitution -->

<!-- AIOX-MANAGED-START: sistema-de-agentes -->
## Sistema de Agentes

### Ativação de Agentes
Use `@agent-name` ou `/AIOX:agents:agent-name`:

| Agente | Persona | Escopo Principal |
|--------|---------|------------------|
| `@dev` | Dex | Implementação de código |
| `@qa` | Quinn | Testes e qualidade |
| `@architect` | Aria | Arquitetura e design técnico |
| `@pm` | Morgan | Product Management |
| `@po` | Pax | Product Owner, stories/epics |
| `@sm` | River | Scrum Master |
| `@analyst` | Alex | Pesquisa e análise |
| `@data-engineer` | Dara | Database design |
| `@ux-design-expert` | Uma | UX/UI design |
| `@devops` | Gage | CI/CD, git push (EXCLUSIVO) |

### Comandos de Agentes
Use prefixo `*` para comandos:
- `*help` - Mostrar comandos disponíveis
- `*create-story` - Criar story de desenvolvimento
- `*task {name}` - Executar task específica
- `*exit` - Sair do modo agente
<!-- AIOX-MANAGED-END: sistema-de-agentes -->

<!-- AIOX-MANAGED-START: agent-system -->
## Agent System

### Agent Activation
- Agents are activated with @agent-name syntax: @dev, @qa, @architect, @pm, @po, @sm, @analyst
- The master agent is activated with @aiox-master
- Agent commands use the * prefix: *help, *create-story, *task, *exit

### Agent Context
When an agent is active:
- Follow that agent's specific persona and expertise
- Use the agent's designated workflow patterns
- Maintain the agent's perspective throughout the interaction
<!-- AIOX-MANAGED-END: agent-system -->

## Projeto Virals — Squads de Negócio

Este repositório (`severinos`) é o projeto **Virals**: uma operação de negócio construída **sobre** o framework AIOX. O AIOX é a camada de infraestrutura (CLI, agentes de engenharia, Constitution); a **Virals** é a camada de negócio, composta por 5 squads especializados que orquestram marketing, vendas, produto, operações e projetos.

### Squads de Negócio Virals

| Squad | Prefixo de Agente | Orquestrador (Chief) | Domínio |
|-------|-------------------|----------------------|---------|
| Virals Marketing | `@marketing-*` | `@marketing-chief` 👑 | Conteúdo viral, tráfego, copy, SEO, funis |
| Virals Vendas | `@virals-vendas-*` | `@sales-chief` 💰 | Ofertas, fechamento, prospecção, pipeline |
| Virals Produto | `@virals-produto-*` | `@product-chief` 📦 | Discovery, onboarding, retenção, CS |
| Virals Operações | `@virals-ops-*` | `@ops-chief` ⚙️ | Processos, OKRs, lançamentos, BI |
| Virals Projetos | `@virals-projetos-*` | *(sem chief — 5 especialistas)* | Shaping, sprints, briefings, stakeholders |

Cada squad tem agentes-especialistas modelados em autoridades reais (MrBeast, Hormozi, Cagan, Dalio, Singer, etc.). Os **Chiefs** orquestram e roteiam pedidos aos especialistas via `routing_rules`.

### Ativação de Agentes Virals

- Via menção: `@marketing-chief`, `@mrbeast-mk`, `@dalio`, etc.
- Via slash command: `/VIRALS:agents:marketing-chief`, `/VIRALS:agents:virals-ops-dalio`, etc.
- Comandos do agente usam prefixo `*` (ex.: `*help`, `*route`, `*guide`, `*exit`).
- Todo agente Virals tem `*help` (lista comandos) e `*guide` (guia de uso completo).

### Fontes de Definição (Sincronização)

**`.claude/commands/VIRALS/agents/*.md` é a fonte canônica** dos agentes Virals — editar SEMPRE aqui. Os arquivos em `squads/*/agents/`, `.antigravity/agents/` e `.aiox-core/development/agents/` são cópias secundárias e podem divergir; não são autoridade.

### Formato dos Agentes (Híbrido AIOX + VIRALS)

Todo agente Virals segue o formato híbrido profissional, equivalente aos agentes AIOX nativos:
- `ACTIVATION-NOTICE` + `CRITICAL` + bloco YAML completo
- `IDE-FILE-RESOLUTION` + `REQUEST-RESOLUTION`
- `activation-instructions` com greeting nativo (badge de permissão, papel, comandos `key`, dica de `*guide`, signature)
- `persona_profile` (archetype, communication, greeting_levels, signature_closing)
- `persona` (role, style, identity, focus, core_principles)
- Blocos VIRALS preservados: `voice_dna`, `objection_algorithms`, `output_examples`, `framework_*`, e nos Chiefs `agent_registry`, `routing_rules`, `handoff_protocol`, `veto_conditions`
- `commands` com `visibility: [full, quick, key]`
- Seções markdown pós-YAML: Comandos Rápidos, Colaboração de Agentes, Guia do Agente

### Pipelines de Inteligência (Marketing Chief)

O `@marketing-chief` executa dois pipelines de ETL:

| Comando | Descrição | Saída |
|---------|-----------|-------|
| `*daily-monitor` | Monitoramento diário multi-rede (Instagram/TikTok/YouTube/LinkedIn) | `workspaces/businesses/virals/marketing/daily-monitoring/{DATE}/*-ranking-*.md` |
| `*creative-benchmark` | ETL profundo dos top criativos (transcrição + frames + análise) | `daily-monitoring/{DATE}/benchmark/{plataforma}/{rank}-{handle}/` |

`*creative-benchmark` exige `*daily-monitor` previamente executado para a data-alvo.

### Workspace de Negócio

Artefatos operacionais da Virals (monitoramento, criativos, relatórios) vivem em `workspaces/businesses/virals/`. Scripts de squad vivem em `squads/{squad}/scripts/` e `services/ETL/`.

<!-- VIRALS-PROJECT-END -->

## Development Methodology

### Story-Driven Development
1. **Work from stories** - All development starts with a story in `docs/stories/`
2. **Update progress** - Mark checkboxes as tasks complete: [ ] → [x]
3. **Track changes** - Maintain the File List section in the story
4. **Follow criteria** - Implement exactly what the acceptance criteria specify

### Code Standards
- Write clean, self-documenting code
- Follow existing patterns in the codebase
- Include comprehensive error handling
- Add unit tests for all new functionality
- Use TypeScript/JavaScript best practices

### Testing Requirements
- Run all tests before marking tasks complete
- Ensure linting passes: `npm run lint`
- Verify type checking: `npm run typecheck`
- Add tests for new features
- Test edge cases and error scenarios

<!-- AIOX-MANAGED-START: framework-structure -->
## AIOX Framework Structure

```
aiox-core/
├── agents/         # Agent persona definitions (YAML/Markdown)
├── tasks/          # Executable task workflows
├── workflows/      # Multi-step workflow definitions
├── templates/      # Document and code templates
├── checklists/     # Validation and review checklists
└── rules/          # Framework rules and patterns

docs/
├── stories/        # Development stories (numbered)
├── prd/            # Product requirement documents
├── architecture/   # System architecture documentation
└── guides/         # User and developer guides
```
<!-- AIOX-MANAGED-END: framework-structure -->

<!-- AIOX-MANAGED-START: framework-boundary -->
## Framework vs Project Boundary

O AIOX usa um modelo de 4 camadas (L1-L4) para separar artefatos do framework e do projeto. Deny rules em `.claude/settings.json` reforçam isso deterministicamente.

| Camada | Mutabilidade | Paths | Notas |
|--------|-------------|-------|-------|
| **L1** Framework Core | NEVER modify | `.aiox-core/core/`, `.aiox-core/constitution.md`, `bin/aiox.js`, `bin/aiox-init.js` | Protegido por deny rules |
| **L2** Framework Templates | NEVER modify | `.aiox-core/development/tasks/`, `.aiox-core/development/templates/`, `.aiox-core/development/checklists/`, `.aiox-core/development/workflows/`, `.aiox-core/infrastructure/` | Extend-only |
| **L3** Project Config | Mutable (exceptions) | `.aiox-core/data/`, `agents/*/MEMORY.md`, `core-config.yaml` | Allow rules permitem |
| **L4** Project Runtime | ALWAYS modify | `docs/stories/`, `packages/`, `squads/`, `tests/` | Trabalho do projeto |

**Toggle:** `core-config.yaml` → `boundary.frameworkProtection: true/false` controla se deny rules são ativas (default: true para projetos, false para contribuidores do framework).

> **Referência formal:** `.claude/settings.json` (deny/allow rules), `.claude/rules/agent-authority.md`
<!-- AIOX-MANAGED-END: framework-boundary -->

<!-- AIOX-MANAGED-START: rules-system -->
## Rules System

O AIOX carrega regras contextuais de `.claude/rules/` automaticamente. Regras com frontmatter `paths:` só carregam quando arquivos correspondentes são editados.

| Rule File | Description |
|-----------|-------------|
| `agent-authority.md` | Agent delegation matrix and exclusive operations |
| `agent-handoff.md` | Agent switch compaction protocol for context optimization |
| `agent-memory-imports.md` | Agent memory lifecycle and CLAUDE.md ownership |
| `coderabbit-integration.md` | Automated code review integration rules |
| `ids-principles.md` | Incremental Development System principles |
| `mcp-usage.md` | MCP server usage rules and tool selection priority |
| `story-lifecycle.md` | Story status transitions and quality gates |
| `workflow-execution.md` | 4 primary workflows (SDC, QA Loop, Spec Pipeline, Brownfield) |

> **Diretório:** `.claude/rules/` — rules são carregadas automaticamente pelo Claude Code quando relevantes.
<!-- AIOX-MANAGED-END: rules-system -->

<!-- AIOX-MANAGED-START: code-intelligence -->
## Code Intelligence

O AIOX possui um sistema de code intelligence opcional que enriquece operações com dados de análise de código.

| Status | Descrição | Comportamento |
|--------|-----------|---------------|
| **Configured** | Provider ativo e funcional | Enrichment completo disponível |
| **Fallback** | Provider indisponível | Sistema opera normalmente sem enrichment — graceful degradation |
| **Disabled** | Nenhum provider configurado | Funcionalidade de code-intel ignorada silenciosamente |

**Graceful Fallback:** Code intelligence é sempre opcional. `isCodeIntelAvailable()` verifica disponibilidade antes de qualquer operação. Se indisponível, o sistema retorna o resultado base sem modificação — nunca falha.

**Diagnóstico:** `aiox doctor` inclui check de code-intel provider status.

> **Referência:** `.aiox-core/core/code-intel/` — provider interface, enricher, client
<!-- AIOX-MANAGED-END: code-intelligence -->

<!-- AIOX-MANAGED-START: graph-dashboard -->
## Graph Dashboard

O CLI `aiox graph` visualiza dependências, estatísticas de entidades e status de providers.

### Comandos

```bash
aiox graph --deps                        # Dependency tree (ASCII)
aiox graph --deps --format=json          # Output como JSON
aiox graph --deps --format=html          # Interactive HTML (abre browser)
aiox graph --deps --format=mermaid       # Mermaid diagram
aiox graph --deps --format=dot           # DOT format (Graphviz)
aiox graph --deps --watch                # Live mode com auto-refresh
aiox graph --deps --watch --interval=10  # Refresh a cada 10 segundos
aiox graph --stats                       # Entity stats e cache metrics
```

**Formatos de saída:** ascii (default), json, dot, mermaid, html

> **Referência:** `.aiox-core/core/graph-dashboard/` — CLI, renderers, data sources
<!-- AIOX-MANAGED-END: graph-dashboard -->

## Workflow Execution

### Task Execution Pattern
1. Read the complete task/workflow definition
2. Understand all elicitation points
3. Execute steps sequentially
4. Handle errors gracefully
5. Provide clear feedback

### Interactive Workflows
- Workflows with `elicit: true` require user input
- Present options clearly
- Validate user responses
- Provide helpful defaults

## Best Practices

### When implementing features:
- Check existing patterns first
- Reuse components and utilities
- Follow naming conventions
- Keep functions focused and testable
- Document complex logic

### When working with agents:
- Respect agent boundaries
- Use appropriate agent for each task
- Follow agent communication patterns
- Maintain agent context

### When handling errors:
```javascript
try {
  // Operation
} catch (error) {
  console.error(`Error in ${operation}:`, error);
  // Provide helpful error message
  throw new Error(`Failed to ${operation}: ${error.message}`);
}
```

## Git & GitHub Integration

### Commit Conventions
- Use conventional commits: `feat:`, `fix:`, `docs:`, `chore:`, etc.
- Reference story ID: `feat: implement IDE detection [Story 2.1]`
- Keep commits atomic and focused

### GitHub CLI Usage
- Ensure authenticated: `gh auth status`
- Use for PR creation: `gh pr create`
- Check org access: `gh api user/memberships`

<!-- AIOX-MANAGED-START: aiox-patterns -->
## AIOX-Specific Patterns

### Working with Templates
```javascript
const template = await loadTemplate('template-name');
const rendered = await renderTemplate(template, context);
```

### Agent Command Handling
```javascript
if (command.startsWith('*')) {
  const agentCommand = command.substring(1);
  await executeAgentCommand(agentCommand, args);
}
```

### Story Updates
```javascript
// Update story progress
const story = await loadStory(storyId);
story.updateTask(taskId, { status: 'completed' });
await story.save();
```
<!-- AIOX-MANAGED-END: aiox-patterns -->

## Environment Setup

### Required Tools
- Node.js 18+
- GitHub CLI
- Git
- Your preferred package manager (npm/yarn/pnpm)

### Configuration Files
- `.aiox/config.yaml` - Framework configuration
- `.env` - Environment variables
- `aiox.config.js` - Project-specific settings

<!-- AIOX-MANAGED-START: common-commands -->
## Common Commands

### AIOX Master Commands
- `*help` - Show available commands
- `*create-story` - Create new story
- `*task {name}` - Execute specific task
- `*workflow {name}` - Run workflow

### Development Commands
- `npm run dev` - Start development
- `npm test` - Run tests
- `npm run lint` - Check code style
- `npm run build` - Build project
<!-- AIOX-MANAGED-END: common-commands -->

## Debugging

### Enable Debug Mode
```bash
export AIOX_DEBUG=true
```

### View Agent Logs
```bash
tail -f .aiox/logs/agent.log
```

### Trace Workflow Execution
```bash
npm run trace -- workflow-name
```

## Claude Code Specific Configuration

### Performance Optimization
- Prefer batched tool calls when possible for better performance
- Use parallel execution for independent operations
- Cache frequently accessed data in memory during sessions

### Tool Usage Guidelines
- Always use the Grep tool for searching, never `grep` or `rg` in bash
- Use the Task tool for complex multi-step operations
- Batch file reads/writes when processing multiple files
- Prefer editing existing files over creating new ones

### Session Management
- Track story progress throughout the session
- Update checkboxes immediately after completing tasks
- Maintain context of the current story being worked on
- Save important state before long-running operations

### Error Recovery
- Always provide recovery suggestions for failures
- Include error context in messages to user
- Suggest rollback procedures when appropriate
- Document any manual fixes required

### Testing Strategy
- Run tests incrementally during development
- Always verify lint and typecheck before marking complete
- Test edge cases for each new feature
- Document test scenarios in story files

### Documentation
- Update relevant docs when changing functionality
- Include code examples in documentation
- Keep README synchronized with actual behavior
- Document breaking changes prominently

## Mapa de Capacidades — a Bíblia do Severinos

**`docs/guides/BIBLIA-SEVERINOS.md` é o índice canônico de tudo que este sistema sabe fazer.**
Comece por lá quando não souber qual ativo usar. Atalho de decisão rápido: `/skill-router`.

### Ativos importados em 2026-11-08

| Frente | Onde | O que é |
|---|---|---|
| 18 skills de engenharia (Matt Pocock, MIT) | `.claude/skills/` | `grilling`, `grill-me`, `grill-with-docs`, `domain-modeling`, `codebase-design`, `tdd`, `diagnosing-bugs`, `code-review-2axis`, `pr`, `prototype`, `retro`, `improve-codebase-architecture`, `wizard`, `wayfinder`, `teach`, `to-questionnaire`, `wait-what`, `writing-for-agents` |
| 3 skills comerciais/operacionais | `.claude/skills/` | `oferta-5p`, `proposta-comercial`, `manual-de-processo` |
| 2 skills de apoio | `.claude/skills/` | `powershell-windows`, `skill-router` |
| Editor de vídeo com fala real gravada | instalado em `~/.local/share/editonny` | skill `/editonny`. Ponte: `docs/guides/editonny-ponte.md` |
| Playbook de 16 prompts + 23 fichas de ferramenta | `docs/guides/vibe-coding-toolkit/` | receitas apontáveis, não skills |
| Regras ESLint com teto de linhas | `tools/eslint-rules/` | vendorizado, **não ligado** em nenhum app |
| 6 hooks de guarda | `.claude/hooks/vendor/agentville/` | só `secret-scan` está ligado. Ver `CHANGES.md` de lá |
| Blueprint de outbound autônomo | `docs/architecture/outbound-autonomo-blueprint.md` | blueprint; nada construído |

### Duas regras novas em `.claude/rules/`

| Rule File | Description |
|---|---|
| `claims-ledger.md` | O que pode ser afirmado em material público. Obrigatória para anúncio, DM, proposta, legenda e página |
| `parallel-waves.md` | Propriedade de arquivo e de recurso no despacho de ondas paralelas de subagentes |

### Config que as skills importadas leem

| Arquivo | Para quê |
|---|---|
| `docs/agents/issue-tracker.md` | Onde o trabalho é rastreado (stories AIOX, epics, ClickUp) |
| `docs/agents/domain.md` | `GLOSSARY.md` na raiz + ADRs em `docs/architecture/adr/` |

### Procedência e licenças

`docs/reference/PROCEDENCIA.md` (índice geral) e `.claude/skills/ATTRIBUTION.md` (por skill).
Três assets vieram **sem licença declarada** — uso interno é o uso pretendido, mas não
redistribua sem autorização do autor.

---
*Synkra AIOX Claude Code Configuration v2.0*
