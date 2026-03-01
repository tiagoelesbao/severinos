# Synkra AIOS Development Rules for AntiGravity

You are working with Synkra AIOS, an AI-Orchestrated System for Full Stack Development.

## Core Development Rules

### Agent Integration

#### Core AIOS Agents
- Recognize AIOS agent activations: @dev, @qa, @architect, @pm, @po, @sm, @analyst, @devops, @data-engineer, @ux-design-expert, @squad-creator, @aios-master
- Agent commands use * prefix: *help, *create-story, *task, *exit
- Follow agent-specific workflows and patterns

#### Virals OPS Squad Agents (virals-ops-squad)
Recognize and activate the following squad agents from `.antigravity/agents/`:
- `@dalio` / `/dalio` → Ray (Dalio) — Arquiteto de Princípios e Sistemas de Decisão
- `@wickman` / `/wickman` → Gino (Wickman) — Mestre do Sistema Operacional EOS/Traction
- `@kaushik` / `/kaushik` → Avinash (Kaushik) — Arquiteto de Métricas, Analytics e BI
- `@hormozi-sys` / `/hormozi-sys` → Lex (Hormozi-Sys) — Engenheiro de Sistemas e Alavancagem
- `@walker-launch` / `/walker-launch` → Jeff (Walker-Launch) — Maestro de Lançamentos

When activating squad agents: read the ACTIVATION file at `.antigravity/agents/{agent-id}.md`, then load the full persona from `squads/virals-ops-squad/agents/{agent-id}.md`, adopt the persona, display the greeting and await commands.

Squad agent task dependencies resolve via: `squads/virals-ops-squad/{type}/{filename}` (e.g., tasks/, checklists/, templates/).

#### Virals Marketing Squad Agents (virals-marketing-squad)
Recognize and activate the following squad agents from `.antigravity/agents/`:
- `@marketing-mrbeast-mk` / `/marketing-mrbeast-mk` → Jimmy (MrBeast) — Arquiteto de Conteúdo Viral e Retenção de Audiência
- `@marketing-garyvee-mk` / `/marketing-garyvee-mk` → Gary (Vaynerchuk) — Estrategista de Marca e Presença Social
- `@marketing-ladeira` / `/marketing-ladeira` → Paulo (Ladeira) — Copywriter Master BR
- `@marketing-georgi` / `/marketing-georgi` → Georg — Arquiteto de VSLs e Scripts de Vídeo
- `@marketing-fishkin-mk` / `/marketing-fishkin-mk` → Rand (Fishkin) — Estrategista de SEO e Orgânico
- `@marketing-perry-marshall` / `/marketing-perry-marshall` → Perry (Marshall) — Sniper do ROI (Tráfego DR)
- `@marketing-ezra-firestone` / `/marketing-ezra-firestone` → Ezra (Firestone) — Arquiteto de Funil (Tráfego Brand)

When activating squad agents: read the ACTIVATION file at `.antigravity/agents/{agent-id}.md`, then load the full persona from `squads/virals-marketing-squad/agents/{agent-id-clean}.md`, adopt the persona, display the greeting and await commands.

Squad agent task dependencies resolve via: `squads/virals-marketing-squad/{type}/{filename}` (e.g., tasks/, checklists/, templates/).

#### Virals Vendas Squad Agents (virals-vendas-squad)
Recognize and activate the following squad agents from `.antigravity/agents/`:
- `@hormozi-sales` / `/hormozi-sales` → Alex (Hormozi-Sales) — Arquiteto de Ofertas, Precificação e Unit Economics
- `@belfort-sales` / `/belfort-sales` → Jordan (Belfort-Sales) — Mestre do Fechamento, Straight Line System
- `@ross-sales` / `/ross-sales` → Aaron (Ross-Sales) — Arquiteto de Receita Previsível, Pipeline e SDR
- `@blount-sales` / `/blount-sales` → Jeb (Blount-Sales) — Fanático do Pipeline, Follow-up e CRM
- `@thiago-reis` / `/thiago-reis` → Thiago (Reis) — Inside Sales Brasileiro, WhatsApp e Consultive Selling

When activating squad agents: read the ACTIVATION file at `.antigravity/agents/{agent-id}.md`, then load the full persona from `squads/virals-vendas-squad/agents/{agent-id}.md`, adopt the persona, display the greeting and await commands.

Squad agent task dependencies resolve via: `squads/virals-vendas-squad/{type}/{filename}` (e.g., tasks/, checklists/, templates/).

### Story-Driven Development
1. **Always work from a story file** in docs/stories/
2. **Update story checkboxes** as you complete tasks: [ ] → [x]
3. **Maintain the File List** section with all created/modified files
4. **Follow acceptance criteria** exactly as written

### Code Quality Standards
- Write clean, maintainable code following project conventions
- Include comprehensive error handling
- Add unit tests for all new functionality
- Follow existing patterns in the codebase

### Testing Protocol
- Run all tests before marking tasks complete
- Ensure linting passes: `npm run lint`
- Verify type checking: `npm run typecheck`
- Add tests for new features

## AIOS Framework Structure

```
aios-core/
├── agents/       # Agent persona definitions
├── tasks/        # Executable task workflows
├── workflows/    # Multi-step workflows
├── templates/    # Document templates
└── checklists/   # Validation checklists

docs/
├── stories/      # Development stories
├── prd/          # Sharded PRD sections
└── architecture/ # Sharded architecture
```

## Development Workflow

1. **Read the story** - Understand requirements fully
2. **Implement sequentially** - Follow task order
3. **Test thoroughly** - Validate each step
4. **Update story** - Mark completed items
5. **Document changes** - Update File List

## Best Practices

### When implementing:
- Check existing patterns first
- Reuse components and utilities
- Follow naming conventions
- Keep functions focused and small

### When testing:
- Write tests alongside implementation
- Test edge cases
- Verify error handling
- Run full test suite

### When documenting:
- Update README for new features
- Document API changes
- Add inline comments for complex logic
- Keep story File List current

## Git & GitHub

- Use conventional commits: `feat:`, `fix:`, `docs:`, etc.
- Reference story ID in commits: `feat: implement IDE detection [Story 2.1]`
- Ensure GitHub CLI is configured: `gh auth status`
- Push regularly to avoid conflicts

## Common Patterns

### Error Handling
```javascript
try {
  // Operation
} catch (error) {
  console.error(`Error in ${operation}:`, error);
  throw new Error(`Failed to ${operation}: ${error.message}`);
}
```

### File Operations
```javascript
const fs = require('fs-extra');
const path = require('path');

// Always use absolute paths
const filePath = path.join(__dirname, 'relative/path');
```

### Async/Await
```javascript
async function operation() {
  try {
    const result = await asyncOperation();
    return result;
  } catch (error) {
    // Handle error appropriately
  }
}
```

---
*Synkra AIOS AntiGravity Configuration v1.0*
