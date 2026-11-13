# Procedência do material de terceiros

Índice único de tudo que entrou no severinos vindo de fora, com licença e o que fizemos com cada
coisa. Para skills, o detalhe por skill está em `.claude/skills/ATTRIBUTION.md`.

| Asset | Licença | Onde foi | O que fizemos |
|---|---|---|---|
| [mattpocock/skills](https://github.com/mattpocock/skills) | MIT © Matt Pocock | `.claude/skills/` (18 skills) | Importadas; `code-review` renomeada para `code-review-2axis`; 2 ponteiros de setup redirecionados |
| [soumatheusgomes/vibe-coding-toolkit](https://github.com/soumatheusgomes/vibe-coding-toolkit) | MIT © Matheus Gomes | `docs/guides/vibe-coding-toolkit/`, `.claude/rules/parallel-waves.md`, `tools/eslint-rules/` | Playbook de 16 prompts + 23 fichas de ferramenta + templates, importados íntegros; regra de ondas paralelas com nota de contexto nossa; regras ESLint vendorizadas **sem** ligar em nenhum app |
| [soumatheusgomes/agentville](https://github.com/soumatheusgomes/agentville) | Apache-2.0 © Matheus Gomes | `.claude/hooks/vendor/agentville/`, `.claude/skills/powershell-windows/`, extensão instalada | 6 hooks vendorizados (1 adaptado — ver `CHANGES.md`); `NOTICE` e `LICENSE` preservados conforme §4; extensão compilada do fonte e instalada no VS Code e no Antigravity |
| ag-kit (via agentville) | MIT © vudovn | `.claude/skills/powershell-windows/` | Cabeçalho de procedência original preservado |
| [soumatheusgomes/framework-5p](https://github.com/soumatheusgomes/framework-5p) | **sem licença declarada** | `docs/reference/framework-5p/`, `.claude/skills/oferta-5p/` | Original arquivado como referência; a skill é **adaptação nossa** com atribuição. Ver a ressalva no README de lá antes de redistribuir |
| [soumatheusgomes/buscandomilhao](https://github.com/soumatheusgomes/buscandomilhao) | **sem licença declarada** | `docs/architecture/outbound-autonomo-blueprint.md`, `.claude/rules/claims-ledger.md` | Não copiamos o prompt. Destilamos a arquitetura em blueprint próprio e a disciplina de alegações em regra própria, ambos com atribuição |
| Pacote "Manual de Processo" | **autor não declarado no pacote** | `.claude/skills/manual-de-processo/`, `docs/reference/pacotes-skills-originais/` | SKILL.md original preservado + seção "No severinos" nossa |
| Pacote "Proposta Comercial" | **autor não declarado no pacote** | `.claude/skills/proposta-comercial/`, `docs/reference/pacotes-skills-originais/` | SKILL.md original preservado + seção "No severinos" nossa |

## O que "sem licença declarada" significa na prática

Três dos assets foram publicados como material gratuito para uso, mas sem arquivo de licença. Sem
licença declarada, o padrão legal é "todos os direitos reservados". Consequência:

- **Uso interno nosso:** é o uso para o qual foram distribuídos. Sem problema.
- **Redistribuir, revender, embutir em entregável de cliente ou publicar como nosso:** não faça
  sem autorização do autor.

É por isso que, nos dois casos em que o material seria mais tentador de copiar (5P e
buscandomilhao), nós **reescrevemos** em vez de copiar: a disciplina e o método são aprendizado,
o texto é propriedade de quem escreveu.
