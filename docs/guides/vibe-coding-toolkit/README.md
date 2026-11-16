# Vibe Coding Toolkit — playbook importado

Importado de <https://github.com/soumatheusgomes/vibe-coding-toolkit> · MIT © 2026 Matheus Gomes
(licença em `LICENSE-vibe-coding-toolkit`).

## O que isto é, e o que não é

Isto **não** são skills. É um livro de receitas: cada prompt é um texto que você cola (ou aponta)
para um agente com acesso ao terminal, e ele executa a receita neste repositório. Foi importado
inteiro porque o valor dele é justamente ser consultável sob demanda, sem ocupar contexto.

O conteúdo original está em inglês e foi preservado como está — reescrever quebraria a receita.

## Como usar um prompt

Aponte o agente para o arquivo local:

```text
Leia docs/guides/vibe-coding-toolkit/prompts/09-file-size-refactor.md e execute o prompt daquele
arquivo neste projeto. Use MAX_LINES=350, BATCH_SIZE=3 e RULE_ID=quality/max-lines.
```

## Os prompts, por necessidade

| Preciso de… | Prompt |
|---|---|
| Limpar lixo acumulado no projeto (arquivos órfãos, deps mortas, configs duplicadas) | `prompts/01-project-sanitation.md` |
| Zerar warnings de lint regra a regra | `prompts/02-eslint-warning-burndown.md` |
| Revisão de código por múltiplos agentes em paralelo | `prompts/03-multi-agent-code-review.md` |
| Transformar brainstorming em plano executável | `prompts/04-brainstorm-to-plan.md` |
| Despachar uma onda de subagentes em paralelo | `prompts/05-parallel-wave-dispatch.md` ⚠️ ver `.claude/rules/parallel-waves.md` |
| Inicializar a memória do agente num projeto | `prompts/06-memory-bootstrap.md` |
| Instalar ESLint completo do zero | `prompts/07-eslint-complete-setup.md` |
| Instalar só os quality gates (teto de linhas, complexidade) | `prompts/08-eslint-quality-gates-install.md` |
| Quebrar os arquivos gigantes que o teto revelou | `prompts/09-file-size-refactor.md` |
| Preparar a máquina (runtime, agentes, integrações globais) | `prompts/10-development-environment-setup.md` |
| Iniciar um projeto Next.js novo | `prompts/11-next-project-bootstrap.md` |
| Configurar/atualizar a base de um projeto que já existe | `prompts/12-existing-project-setup.md` |
| Revisão de segurança de um diff | `prompts/13-security-review.md` |
| Avaliar o harness do agente | `prompts/14-harness-evaluation.md` |
| Melhorar o harness do agente | `prompts/15-harness-improvement.md` |
| Auditoria de segurança do repositório inteiro | `prompts/16-security-audit.md` |

## O catálogo de ferramentas

`tools/` descreve 23 ferramentas do ecossistema (Superpowers, RTK, Graphify, Context7,
agent-browser, Chrome DevTools MCP, shadcn, Sentry MCP, skills da Vercel, PostgreSQL…), cada uma
com quando entra e o que ela prova. Use como cardápio na hora de decidir o que instalar — e
confira antes em `docs/guides/BIBLIA-SEVERINOS.md` se nós já temos o equivalente.

## Templates

`templates/project-docs/` tem os cinco documentos de projeto (architecture, design, onboarding,
quality, setup) + README; `templates/task-handoff.md.template`, `security-review.md.template` e
`product.md.template` ficam na raiz de `templates/`.

⚠️ **Handoff:** nós já temos protocolo próprio em `.claude/rules/agent-handoff.md` e
`.claude/rules/handoff-consolidation.md`. O template daqui serve de checklist de completude, não
de formato canônico.

## O que não foi importado

O `install.py`/scripts de validação do toolkit, os READMEs multi-idioma e os assets SVG — nada
disso agrega aqui, porque o toolkit configura projetos do zero e o severinos já está configurado.
