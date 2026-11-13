# Issue tracker deste repositório

Este arquivo responde, para as skills de engenharia importadas (`wayfinder`,
`code-review-2axis`, `pr`), onde o trabalho deste repositório é rastreado. Ele **não** substitui
o Story Development Cycle do AIOX — ele diz a essas skills onde ler e escrever.

## As três superfícies de rastreamento

| Superfície | Onde | Quem manda | O que vive aqui |
|---|---|---|---|
| **Stories de engenharia** | `docs/stories/{01-Governance,02-Platform,03-Product}/` | `@sm` cria, `@po` valida, `@dev` implementa, `@qa` fecha | A unidade canônica de trabalho técnico |
| **Epics** | `docs/epics/{área}/{current,done}/` | `@pm` | Agrupamento de stories com contexto estratégico |
| **Trabalho de negócio** | ClickUp (spaces Comercial, Produto, Gestão, Projetos) | `@ops-chief`, `@marketing-chief` | Lotes de conteúdo, publicação, operação de cliente |

GitHub Issues **não** é usado como tracker primário. O `gh` está autenticado e serve para PRs e
CI, não para issues.

## Quando uma skill diz "publique no issue tracker"

Não crie um formato paralelo. Use o caminho correspondente:

- **Spec ou story nova** → não escreva direto. Chame `@sm *draft` (ou `/validate-story-draft`
  depois). Uma story escrita fora do template do AIOX falha o gate do `@po`.
- **Decisão arquitetural** → ADR em `docs/architecture/adr/NNNN-<slug>.md`. Ver
  `docs/agents/domain.md`.
- **Mapa de esforço grande** (só `wayfinder`) → `docs/wayfinding/<esforço>/`, conforme abaixo.

## Quando uma skill diz "busque o ticket relevante"

Leia o arquivo da story em `docs/stories/.../STORY-*.md`. O usuário normalmente passa o ID
(`STORY-ALIGN-07`, `MVC-03`, `VEX-14`) — localize por `grep` no nome do arquivo.

## Operações de wayfinding

Usadas por `/wayfinder`, que planeja esforço maior do que uma sessão aguenta. O **mapa** é um
arquivo com um **filho** por ticket de decisão. Isto é um espaço de *decisões*, não de
entregáveis — quando a névoa abre, as decisões viram epic e stories pelo caminho normal.

- **Mapa**: `docs/wayfinding/<esforço>/map.md` (corpo com Notes / Decisions-so-far / Fog).
- **Ticket filho**: `docs/wayfinding/<esforço>/issues/NN-<slug>.md`, numerado de `01`, com a
  pergunta no corpo. Linha `Type:` registra o tipo (`research`/`prototype`/`grilling`/`task`);
  linha `Status:` registra `claimed`/`resolved`.
- **Bloqueio**: linha `Blocked by: NN, NN` no topo. Um ticket está desbloqueado quando todos os
  arquivos que ele lista estão `resolved`.
- **Frontier**: varra `docs/wayfinding/<esforço>/issues/` por arquivos abertos, desbloqueados e
  não reclamados; o menor número vence.
- **Reclamar**: `Status: claimed`, salvo antes de qualquer trabalho.
- **Resolver**: resposta sob um heading `## Answer`, `Status: resolved`, e um ponteiro de
  contexto (resumo + link) no Decisions-so-far do `map.md`.

## Labels de triagem

Não configuradas: a skill `triage` não foi importada (o AIOX tem `@po` para backlog e o negócio
roda no ClickUp). Nenhuma skill instalada depende de labels.
