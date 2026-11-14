# Estado atual do sistema

> Levantamento de 2026-11-12, feito antes da consolidação no `master`. Mede o que **está**, não o
> que deveria estar. Números vieram de execução real, não de estimativa.
>
> Índice de capacidades: `docs/guides/BIBLIA-SEVERINOS.md`. Este arquivo é o complemento: o que
> está pendente, quebrado ou inconsistente.

---

## 1. Git — o ciclo que ficou aberto

| | |
|---|---|
| Branch atual | `feat/benchmark-derived-templates` |
| Commits à frente do `master` | **40** |
| Commits não enviados ao remoto | 2 |
| Modificados sem commit | 387 |
| Apagados sem commit | 320 |
| Não rastreados (antes da política) | **10.836** |
| Não rastreados (depois) | **3.975** |
| Tamanho do `.git` | 804 MB |

**As 320 deleções não são perda:** são a migração **AIOS → AIOX** concluída no disco e nunca
commitada (`.claude/commands/AIOS/*`, `aios-master.md` em cinco IDEs, backups de `CLAUDE.md`),
mais o squad abandonado `squads/squad-creator-alternative` (264 arquivos). A árvore de trabalho é
o estado novo; o git é que estava velho.

### Política de versionamento aplicada

Decidida com o founder em 2026-11-12 e escrita no `.gitignore`. **O conhecimento entra no git; os
bytes regeneráveis, não.**

| Área | Antes | Decisão |
|---|---|---|
| `workspaces/businesses` | 6,9 GB · 2.746 arquivos | Relatórios, `claims.yaml`, JSON e SRT entram. jpg/mp4/png/mp3 ficam fora |
| `squads/oraclumtech-ai-creative-studio` | 196 MB · 2.519 jpg | Agentes, tasks, workflows e `.md` entram. Frames de análise ficam fora |
| `apps/bx` | 1.755 arquivos · 1.191 duplicam `.aiox-core` | Só `app/` e `Squads/`. A réplica do framework fica fora |
| `services/ETL/yt-dlp_win` | 136 binários (.exe/.dll/.pyd) | Fora — é distribuição de terceiro, baixável |
| `apps/live-futebol/_pack,_falas,_vozes` | 203 mp3 | Fora — saída de TTS. `assets/` (torcida, provas de voz) continua |

Verificado: **nenhum arquivo já rastreado virou ignorado** — não houve remoção silenciosa. Nenhum
`.env`, chave ou cookie entra.

---

## 1-A. Dado pessoal — o achado mais grave da limpeza

A varredura feita **antes** de cada commit encontrou identificação de clientes reais em texto
puro, prestes a entrar no git pela primeira vez:

| Onde | Volume | Conteúdo |
|---|---|---|
| `squads/**/meta-ads/audiences/*.csv` | 5 arquivos · 44 MB · um com **500 mil registros** | e-mail e telefone |
| `services/Meta/imperio-premios/*.csv` e derivados | 17 arquivos · **~275 MB** | **Nome, Telefone, Email, Cpf** e IDs de pagamento |

**Nenhum deles jamais esteve no histórico** — verificado em todas as refs antes de seguir. Se
tivessem entrado, sair seria reescrita de histórico, não `git rm`.

Três lições que viraram regra no `.gitignore`:

1. **Extensão não basta como filtro.** Três arquivos escaparam da primeira regra por terem sufixo
   depois da extensão: `.csv.bak-corrompido`, `.csv.pre-dedup`.
2. **Varrer por conteúdo, não por nome.** Os `dados_brutos_completos*.csv` não têm "audiência" nem
   "lead" no nome; foram achados procurando o padrão de e-mail dentro dos arquivos.
3. **Estado de runtime sujava o repo a cada execução.** `capi_*_sent_ids_*.json` e
   `checkpoint_*.json` crescem a cada run do agregador. Saíram do índice.

O que **continua** versionado: os README, scripts e a documentação que descrevem esses dados. O
dado em si vive só na máquina.

---

## 2. Saúde dos apps — medida, não estimada

| App | Typecheck | Testes | Lint |
|---|---|---|---|
| `apps/dashboard` | ✅ 0 erros | ✅ 73 passam (8 arquivos) | ⚠️ 7 problemas |
| `apps/video-studio` | ✅ 0 erros | ✅ **177 passam** | ✅ 0 |
| `apps/creative-design` | ✅ 0 erros | ✅ 45 passam (13 arquivos) | ⚠️ 32 problemas (17 erros, 15 avisos) |

### O que foi corrigido nesta rodada

| Defeito | Onde | Correção |
|---|---|---|
| **222 testes invisíveis** — existiam e passavam, mas nenhum script os chamava | `video-studio` (177), `creative-design` (45) | Script `test` ligado nos dois `package.json` |
| **Pasta literal `undefined/` versionada no git** | `apps/dashboard/server/db.ts` | `process.env.HOME` não existe no Windows (é `USERPROFILE`) e o template virava a string `"undefined"`. Trocado por `os.homedir()`; o artefato saiu do índice e do disco |
| 8 erros falsos de typecheck | `apps/dashboard` | `server/` é um pacote **Bun** separado (`package.json` + `bun.lock` próprios) sendo checado com os types do Next. Excluído do `tsconfig` do app |
| Dependência importada e não instalada | `dashboard` · `TerminalOutput.tsx` | `ansi-to-html` instalado |
| Peer quebrado derrubando 13 testes | `dashboard` | `@testing-library/dom` (peer do `@testing-library/react` v16) instalado |
| 5 divergências entre stories e componentes | `creative-design` | `size:'giant'`→`'xl'`; `variant:"icon"`→`"v-star"` (mesmo render); prop `type:'hook'/'valor'/'cta'` → `variant:'HOOK'/'CONTENT'/'CTA'`, renomeada num refactor anterior |
| Variável usada antes de declarada | `creative-design` · `studio/page.tsx` | `hydratePexels` era chamado por `loadBrief` e declarado 60 linhas depois, com `[]` de dependência. Movido para antes e a dependência corrigida |
| Sem gate antes do commit | `/aiox-commit` | Typecheck → lint → teste, por pacote tocado. "Script ausente não é aprovação" |

---

## 3. Débito aberto, com número

### Lint

**`creative-design` — 17 erros, 15 avisos.** Os que são bug de verdade:

- `setState` síncrono dentro de `useEffect` em `editor/page.tsx` e `render/page.tsx` — **a mesma
  classe de defeito já registrada no `video-studio`** (laço de re-render e piscada preta). Vale
  tratar com a mesma correção: store externo em vez de estado no commit.
- Import direto de `@storybook/react` em vez do pacote de framework (×3).
- `<img>` no lugar de `next/image` (vários).

**`dashboard` — 7 problemas.** Não auditados um a um.

### Dependências

**`apps/dashboard` tem conflito de peer pré-existente:** `vite@8.0.12` instalado contra
`@vitejs/plugin-react@5.1.3`, que só suporta até vite 7. Qualquer `npm install` ali falha sem
`--legacy-peer-deps`. A saída limpa é subir o plugin para `@vitejs/plugin-react@6`, que declara
`vite ^8` — mas v6 traz três peers novos (`oxc-transform-react`, `@rolldown/plugin-babel`,
`babel-plugin-react-compiler`) e mexe no build do Storybook. **Não foi feito:** é upgrade que pede
verificação própria, não correção de limpeza.

### Stories e epics — a localização divergiu do status

| | |
|---|---|
| Stories no total | 153 |
| Marcadas `done` no arquivo | 47 |
| Arquivadas em pasta `done/` | **17** |
| Epics em `current/` | 10 |

**30 stories marcadas como concluídas continuam fora de `done/`.** O status dentro do arquivo e a
pasta onde ele vive contam histórias diferentes, e hoje não existe nada que force as duas a
concordarem. Enquanto isso, qualquer leitura do backlog é não confiável.

Distribuição dos status declarados: 47 `done` · 14 `ready for review` · 5 `inreview` · 4 `draft` ·
4 `backlog` · 4 `aprovado pelo dono` · 3 `todo` · 3 `doing` · 2 `ready` · 2 `inprogress` ·
2 `executado`. **São pelo menos quatro vocabulários misturados** (inglês do AIOX, português,
`executado`, `aprovado pelo dono`) — `story-lifecycle.md` define um só.

---

## 4. Pendências que vêm de antes

Estas já estavam registradas na memória do projeto e continuam abertas:

| Pendência | Estado |
|---|---|
| Ponte farming/editonny → `video-studio` | Formatos incompatíveis (`project.json` vs `studio-edit.json`), sem conversor |
| `GLOSSARY.md` na raiz | Não existe. O vocabulário (take, cartela, togi, Lote, pilar, insert) vive só na memória |
| Varredura de markdown corrompido no ClickUp | Só o space Comercial foi checado; Produto, Gestão e Projetos, não |
| Paleta ciano da Oraclum | `video-templates` pinta em ciano contra um brand-config sem ciano |
| Upgrade de RAM | 4 slots DDR4, 2 em uso; o gargalo dos modelos grandes é RAM |
| `por.traineddata` do Tesseract | Exige PowerShell como administrador; o OCR do editonny usa `eng` |
| Sistema de outbound autônomo | Blueprint pronto, nada construído |
| Regras ESLint com teto de linhas | Vendorizadas em `tools/eslint-rules/`, não ligadas em nenhum app |
| 5 hooks vendorizados | Em `.claude/hooks/vendor/agentville/`, desligados; só `secret-scan` roda |

---

## 5. O que fazer a seguir, em ordem

1. **Consolidar no `master`.** Os 40 commits + esta limpeza, em fatias temáticas. Push e merge são
   do `@devops` (Artigo II).
2. **Reconciliar stories.** Um vocabulário só, e a pasta seguindo o status. Candidato a script, não
   a mutirão manual.
3. **Zerar o lint do `creative-design`**, começando pelo `setState` em efeito — é bug, não estilo.
4. **Decidir o upgrade do `@vitejs/plugin-react`** no dashboard, com verificação de Storybook.
5. **Criar o `GLOSSARY.md`** com `/domain-modeling`. É o ativo de maior retorno parado hoje.
