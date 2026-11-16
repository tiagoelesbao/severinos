# Bíblia do Severinos

> Índice canônico de tudo que este sistema sabe fazer. Quando não souber qual ativo usar, comece
> aqui — ou chame `/skill-router`, que é o atalho de decisão deste documento.
>
> Última revisão: **2026-11-08** · 43 skills · 44 agentes · 21 squads · 21 apps · 2 serviços

---

## §0 · O que o severinos é

Quatro camadas, e confundi-las é a origem da maioria dos erros de roteamento:

| Camada | O que é | Onde vive | Quem manda |
|---|---|---|---|
| **Framework** | AIOX: CLI, Constitution, ciclo de story, agentes de engenharia, gates | `.aiox-core/`, `bin/` | `@aiox-master` |
| **Negócio** | Virals: 5 squads de negócio + 16 squads especializados, agentes modelados em autoridades reais | `squads/`, `.claude/commands/VIRALS/` | os Chiefs |
| **Motores** | As aplicações que produzem coisa: vídeo, BI, LP, webhook, captura | `apps/`, `services/` | quem tiver a story |
| **Operação** | Os artefatos que a operação gera: monitoramento, criativos, ofertas, POPs | `workspaces/businesses/`, `docs/` | o dono do negócio |

O AIOX é infraestrutura. A Virals é o negócio que roda sobre ela. Um pedido de código desce para
a camada de framework; um pedido de conteúdo ou venda fica na camada de negócio.

### As três perguntas que resolvem a maioria dos roteamentos

1. **É código ou é negócio?** Código → trilha AIOX (§2) ou skills de engenharia (§3). Negócio →
   squad Virals (§5) ou skills comerciais (§4).
2. **A fala do vídeo é gravada por uma pessoa, ou é TTS?** Gravada → `/editonny`. TTS → nosso
   pipeline. A árvore completa está em §6.
3. **Você sabe o que quer, ou precisa descobrir?** Precisa descobrir → **sempre** comece por
   `/grill-with-docs`. É o erro mais caro do catálogo: pular o alinhamento e implementar a coisa
   errada com velocidade.

---

## §1 · Governança — o que não se negocia

### A Constitution

`.aiox-core/constitution.md`. Seis artigos, com gates automáticos que bloqueiam violação.

| Artigo | Princípio | Severidade |
|---|---|---|
| I | CLI First | NON-NEGOTIABLE |
| II | Agent Authority | NON-NEGOTIABLE |
| III | Story-Driven Development | MUST |
| IV | No Invention | MUST |
| V | Quality First | MUST |
| VI | Absolute Imports | SHOULD |

### Autoridade exclusiva

Uma coisa só, mas ela é absoluta: **enviar ao remoto, abrir/mergear PR, mexer em CI e gerenciar
MCP é exclusividade do `@devops`.** Existe um hook que bloqueia — `enforce-git-push-authority.cjs`.
Os outros agentes fazem `git add`, `commit`, `branch`, `checkout`, `merge` local; o resto delega.

Outras exclusividades: `@pm` para epic, `@po` para validação de story e backlog, `@sm` para criação
de story. A matriz completa está em `.claude/rules/agent-authority.md`.

### A fronteira L1–L4

| Camada | Mutabilidade | Paths |
|---|---|---|
| **L1** Framework Core | **nunca** | `.aiox-core/core/`, `constitution.md`, `bin/` |
| **L2** Framework Templates | **nunca** (extend-only) | `.aiox-core/development/{tasks,templates,checklists,workflows}/`, `infrastructure/` |
| **L3** Project Config | mutável com exceções | `.aiox-core/data/`, `agents/*/MEMORY.md`, `core-config.yaml` |
| **L4** Project Runtime | sempre | `docs/stories/`, `apps/`, `squads/`, `tests/`, `workspaces/` |

Reforçada deterministicamente por deny rules em `.claude/settings.json`.

### As regras contextuais

`.claude/rules/` — carregadas automaticamente pelo Claude Code quando relevantes.

| Regra | O que governa |
|---|---|
| `agent-authority.md` | Matriz de delegação e operações exclusivas |
| `agent-handoff.md` | Compactação de contexto na troca de agente |
| `agent-memory-imports.md` | Ciclo de vida da memória de agente |
| `claims-ledger.md` 🆕 | **O que pode ser afirmado em material público** |
| `coderabbit-integration.md` | Revisão automatizada |
| `handoff-consolidation.md` | Consolidação de handoffs em RUN-LOG (limiar: 5) |
| `ids-principles.md` | Incremental Development System |
| `mcp-usage.md` | Uso de MCP e prioridade de ferramenta nativa |
| `parallel-waves.md` 🆕 | **Propriedade de arquivo e recurso em ondas paralelas** |
| `story-lifecycle.md` | Transições de status e quality gates |
| `tool-examples.md` | Exemplos de entrada para seleção de ferramenta |
| `workflow-execution.md` | Os 4 workflows primários |

### Hooks ativos

| Hook | Evento | O que faz |
|---|---|---|
| `synapse-engine.cjs` | UserPromptSubmit | Injeção de contexto por domínio (SYNAPSE) |
| `precompact-session-digest.cjs` | UserPromptSubmit, PreCompact | Digest de sessão antes da compactação |
| `code-intel-pretool.cjs` | PreToolUse (Write, Edit) | Enriquecimento por code intelligence |
| `enforce-git-push-authority.cjs` | PreToolUse (Bash) | Bloqueia envio ao remoto fora do `@devops` |
| `vendor/agentville/secret-scan.mjs` 🆕 | PreToolUse (Edit, Write, MultiEdit) | **Bloqueia escrever algo que pareça segredo** |

Cinco hooks ficam vendorizados e **desligados** em `.claude/hooks/vendor/agentville/` —
`guard-build-artifacts`, `large-file-warning`, `validate-settings-schema`,
`subagent-model-guard`, mais a dependência `session-scratch`. O `CHANGES.md` de lá diz como ligar
cada um e o que cada um custa.

---

## §2 · O ciclo de desenvolvimento

Trabalho de código passa por aqui. **Não existe trilha paralela** — foi uma decisão explícita ao
importar os ativos novos (ver §10).

```
@sm *draft  →  /validate-story-draft  →  /develop-story  →  /review-story  →  /close-story
   Draft            Ready                 InProgress          InReview         Done
```

| Atalho | Quando usar |
|---|---|
| `/full-sdc` | O ciclo inteiro de uma story, ponta a ponta, com Sequence Lock e progresso durável em `.aiox/sdc/` |
| `/wave-execute` | Várias stories em paralelo, em ondas por propriedade de arquivo. **Leia `.claude/rules/parallel-waves.md` antes** |
| `/apply-qa-fixes` | Aplicar os achados do gate e devolver para re-review. Nunca auto-aprova |
| `/aiox-commit` | Commit local convencional. Nunca envia ao remoto |
| `/coderabbit-review` | CodeRabbit via WSL, com laço de auto-correção (máx. 2 iterações) |

### Os quatro workflows primários

| Workflow | Para quê |
|---|---|
| **Story Development Cycle** | Todo trabalho de desenvolvimento |
| **QA Loop** | Laço iterativo review→fix (máx. 5), com escalonamento |
| **Spec Pipeline** | Requisito informal → spec executável. 6 fases, classe por complexidade |
| **Brownfield Discovery** | Avaliação de dívida técnica em base existente. 10 fases |

Detalhe em `.claude/rules/workflow-execution.md`.

### Onde o trabalho é rastreado

| Superfície | Onde | Quem manda |
|---|---|---|
| Stories de engenharia | `docs/stories/{01-Governance,02-Platform,03-Product}/` | `@sm` → `@po` → `@dev` → `@qa` |
| Epics | `docs/epics/{área}/{current,done}/` | `@pm` |
| Trabalho de negócio | ClickUp (Comercial, Produto, Gestão, Projetos) | `@ops-chief`, `@marketing-chief` |
| Mapas de névoa | `docs/wayfinding/{esforço}/` 🆕 | `/wayfinder` |

GitHub Issues **não** é tracker primário. Contrato completo: `docs/agents/issue-tracker.md`.

---

## §3 · Skills de engenharia

### Alinhamento — antes de qualquer código

| Skill | O que faz |
|---|---|
| `/grill-with-docs` 🆕 | Entrevista implacável que **também** constrói o modelo de domínio: atualiza `GLOSSARY.md` e ADRs no caminho. **O ponto de partida padrão dentro de um repo** |
| `/grill-me` 🆕 | A mesma entrevista, sem deixar rastro. Para quando não há repo embaixo |
| `/grilling` 🆕 | O primitivo: árvore de decisão trabalhada em rodadas, a frontier inteira por rodada, cada pergunta com recomendação |
| `/to-questionnaire` 🆕 | Uma decisão que depende de outra pessoa vira questionário em markdown |
| `/wait-what` 🆕 | A mensagem não fez sentido. Repitch com o contexto que faltava, no vocabulário do `GLOSSARY.md` |

**Por que isso importa:** o modo de falha mais comum em desenvolvimento não é código ruim, é
desalinhamento. Você achou que o agente entendeu; ele construiu outra coisa. Grilling é a cura, e
custa cinco minutos.

### Modelo de domínio e desenho

| Skill | O que faz |
|---|---|
| `/domain-modeling` 🆕 | Constrói e afia o vocabulário do projeto: desafia termo, resolve palavra sobrecarregada, grava ADR |
| `/codebase-design` 🆕 | Vocabulário de **módulo profundo**: muito comportamento atrás de interface pequena, numa fronteira limpa |
| `/improve-codebase-architecture` 🆕 | Varre a base por oportunidades de aprofundamento, apresenta em relatório HTML, e grelha a escolhida |
| `/architect-first` | Arquitetura completa e documentada **antes** do código; zero acoplamento; validação por múltiplas perspectivas |
| `/prototype` 🆕 | Protótipo descartável para responder uma dúvida de design: um HTML compartilhável para lógica, ou variações radicais de UI numa rota |

**O glossário é o ativo mais subestimado aqui.** Este repo tem vocabulário próprio e denso —
*take*, *cartela*, *togi*, *Lote*, *pilar*, *insert*, *acervo*, *esteira*. Hoje esse vocabulário
vive na memória do projeto e na cabeça do founder. `GLOSSARY.md` na raiz é onde ele deveria estar:
o agente gasta menos token pensando, nomeia variável e arquivo de forma consistente, e navega a
base melhor. Layout e regras de consumo: `docs/agents/domain.md`.

### Implementação e verificação

| Skill | O que faz |
|---|---|
| `/tdd` 🆕 | Red-green-refactor, uma fatia vertical por vez, com guia sobre o que é teste bom e teste ruim |
| `/diagnosing-bugs` 🆕 | Laço disciplinado por fases para bug difícil e regressão de performance: construir um loop que fica **vermelho** nesse bug → minimizar → hipotetizar → instrumentar → corrigir → teste de regressão |
| `/code-review-2axis` 🆕 | Revisão do diff em **dois eixos**, em subagentes paralelos: *Standards* (segue os padrões do repo?) e *Spec* (implementa fielmente o que a issue pediu?) |
| `/pr` 🆕 | A forma que o corpo de um PR deve ter: o menor visual que deixa a mudança clara, evidência antes/depois, e a chamada de risco de merge (porta de mão única ou dupla, e raio de impacto) |
| `/retro` 🆕 | Retrospectiva da sessão: o que no ambiente do agente — navegação, checagem automática, padrão de código, arquivo de direção, ferramenta — deveria mudar. Mais severo primeiro |
| `/wayfinder` 🆕 | Esforço maior do que uma sessão aguenta. Mapa compartilhado de **tickets de decisão**; resolve um por vez até a névoa abrir. Produz decisões, não entregáveis |
| `/wizard` 🆕 | Gera um wizard bash interativo para o passo que **só um humano pode dar**: provisionar infra, configurar credencial, navegar painel de terceiro, rodar migração de uma vez |
| `/checklist-runner` | Executa qualquer checklist `.md`, em modo YOLO ou interativo |
| `/powershell-windows` 🆕 | Armadilhas de PowerShell no Windows: parênteses obrigatórios em operador lógico, zero Unicode em script, checagem de null |

**`/wizard` resolve uma dor real nossa.** Boa parte dos nossos setups tem passo que o agente não
pode dar: logar no Instagram num perfil dedicado do Chrome, criar chave de API num painel, aceitar
UAC. Hoje isso vive em instrução solta no meio de um doc. Um wizard bash deixa o passo
executável e repetível.

### Infraestrutura do framework

| Skill | O que faz |
|---|---|
| `/skill-creator` | Criar ou atualizar skill |
| `/writing-for-agents` 🆕 | **Como escrever documento que agente consome**: skill, CLAUDE.md, doc alcançado por ponteiro. Leia antes de criar skill ou editar CLAUDE.md |
| `/mcp-builder` | Criar servidor MCP de qualidade (Python FastMCP ou Node/TS SDK) |
| `/synapse` | O motor de contexto SYNAPSE: domínios, regras de injeção, pipeline de 8 camadas |
| `/skill-router` 🆕 | Diz qual ativo atende a situação. O atalho deste documento |
| `@squad-creator` | Criar squad novo |
| `@aiox-master` | Governança do framework, orquestração entre agentes |

---

## §4 · Skills comerciais e operacionais

Esta frente **não existia** antes desta importação. Era a maior lacuna do sistema: havia squad de
vendas com agentes e templates, mas nenhum caminho curto do "conversei com um cliente" até
"proposta enviada".

| Skill | Entrada | Saída |
|---|---|---|
| `/oferta-5p` 🆕 | O que você sabe fazer | Mapa da oferta (público, promessa, pacote, preço mínimo/alvo/esticado, primeiro passo) + 5+ variações numeradas + plano de teste com 10 clientes |
| `/proposta-comercial` 🆕 | Anotação, áudio transcrito ou relato solto da conversa | Proposta de uma página + mensagem de envio + 3 follow-ups (2, 5 e 10 dias) + respostas para 5 objeções |
| `/manual-de-processo` 🆕 | Você explicando como faz uma tarefa, bagunçado | Manual passo a passo + checklist + mensagem para delegar + o que a IA pode assumir + pontos a confirmar |

### A sequência que elas formam

```
/oferta-5p          →  /proposta-comercial  →  /manual-de-processo
o que vender,          para este cliente,       como entregar sem
para quem, por         com follow-up e          você ser o gargalo
quanto                 objeção prontos
```

Cada uma tem um marcador próprio para o que **não** se inventa: `[hipótese]` na oferta,
`[PREENCHER]` na proposta, `[CONFIRMAR]` no manual. Isso não é formalidade — número inventado
quebra na hora de cobrar, e passo inventado ensina errado sem ninguém perceber.

### O claims ledger

🆕 `.claude/rules/claims-ledger.md` é **obrigatória** para qualquer texto que saia daqui: anúncio,
criativo, legenda, DM, proposta, página, post.

```
workspaces/businesses/{negócio}/claims.yaml
  verified:    o que pode ir ao ar, com a evidência e a data
  unverified:  o que queremos poder dizer, e a prova que falta
```

Só `verified` sai. Paráfrase de `unverified` continua bloqueada. E, mesmo sem ledger: nunca
inventar **número**, **prazo**, **garantia**, **depoimento** ou **superlativo**.

Isso responde a uma dor documentada: o pipeline de copy entregava OCR cru, o LLM preenchia o
buraco com estatística inventada, e o quality gate reinjetava o texto fabricado.

### Onde isso mora

```
workspaces/businesses/{negócio}/
├── claims.yaml                       ← o ledger
├── vendas/ofertas/{data}-{slug}/     ← mapa, variações, teste
├── vendas/propostas/{data}-{cliente}/← proposta, envio, objeções
└── ops/pops/pop-{slug}.md            ← manual de processo do negócio

docs/03-Operations/POPs/pop-{slug}.md ← POP da operação Virals
```

---

## §5 · Agentes

### Engenharia (AIOX) — 10

| Agente | Persona | Escopo |
|---|---|---|
| `@dev` | Dex | Implementação |
| `@qa` | Quinn | Testes e qualidade |
| `@architect` | Aria | Arquitetura, seleção de tecnologia, avaliação de complexidade |
| `@pm` | Morgan | Product management, epics, spec |
| `@po` | Pax | Validação de story, backlog, contexto de epic |
| `@sm` | River | Criação de story |
| `@analyst` | Alex | Pesquisa de mercado, concorrência, ROI |
| `@data-engineer` | Dara | Schema, DDL, RLS, índice, migração |
| `@ux-design-expert` | Uma | Arquitetura de frontend, design system, acessibilidade |
| `@devops` | Gage | CI/CD, release, MCP, **e o envio ao remoto** |

Os mesmos existem como subagentes autônomos (`aiox-dev`, `aiox-qa`, `aiox-architect`, …) para
despacho em background.

### Negócio (Virals) — 5 squads, 34 agentes

| Squad | Chief | Especialistas |
|---|---|---|
| **Marketing** | `@marketing-chief` | `@mrbeast-mk` (conteúdo viral) · `@ladeira` (copy de conversão) · `@georgi` (VSL e script) · `@ezra-firestone` (tráfego brand/funil) · `@perry-marshall` (tráfego resposta direta) · `@fishkin-mk` (SEO) · `@garyvee-mk` (marca e social) · `@casey-neistat-img` (imagem e carrossel) · `@sam-kolder-vid` (vídeo e motion) |
| **Vendas** | `@sales-chief` | `@hormozi-sales` (oferta e revenue) · `@belfort-sales` (fechamento e objeção) · `@blount-sales` (prospecção e cadência) · `@ross-sales` (receita previsível e pipeline) · `@thiago-reis` (inside sales e WhatsApp) |
| **Produto** | `@product-chief` | `@cagan-produto` (gestão) · `@torres-produto` (discovery contínuo) · `@wes-bush-produto` (onboarding e PLG) · `@eyal-produto` (hábito e engajamento) · `@lincoln-produto` (sucesso do cliente) |
| **Operações** | `@ops-chief` | `@dalio` (princípios e sistema de decisão) · `@hormozi-sys` (escala operacional) · `@wickman` (tração e EOS) · `@kaushik` (BI e métrica acionável) · `@walker-launch` (lançamentos) |
| **Projetos** | *(sem chief)* | `@singer-proj` (shaping e betting) · `@sutherland-proj` (sprints) · `@catmull-proj` (guardião criativo, braintrust) · `@allen-proj` (clareza e revisão de portfólio) · `@lencioni-proj` (relacionamento e comunicação) |

Mais `@farming-chief` (Kane), que orquestra o pipeline de farming.

**A fonte canônica dos agentes Virals é `.claude/commands/VIRALS/agents/*.md`.** Editar sempre
ali. As cópias em `squads/*/agents/`, `.antigravity/agents/` e `.aiox-core/development/agents/`
são secundárias e podem divergir.

### Os 21 squads

De negócio: `virals-marketing-squad`, `virals-vendas-squad`, `virals-produto-squad`,
`virals-ops-squad`, `virals-projetos-squad`, `virals-farming-squad`,
`virals-creators-hunting-squad`, `oraclumtech-ai-creative-studio`.

Especializados: `advisory-board`, `brand-squad`, `c-level-squad`, `claude-code-mastery`,
`copy-squad`, `cybersecurity`, `data-squad`, `design-squad`, `hormozi-squad`, `movement`,
`squad-creator`, `storytelling`, `traffic-masters`.

Cada squad tem a mesma anatomia: `agents/`, `tasks/`, `templates/`, `checklists/`, `workflows/`,
`data/`, `config/` — e alguns têm `scripts/` e `tools/`.

---

## §6 · Vídeo — a frente mais densa

Aqui é onde mais se erra de ferramenta, porque há seis motores e a diferença entre eles não é
óbvia pelo nome.

### A árvore de decisão

```
A fala do vídeo foi gravada por uma pessoa?
│
├── SIM → /editonny 🆕
│         Reels · anúncio · aula · vídeo de vendas · UGC · depoimento ·
│         adaptar uma referência com a sua própria gravação
│
└── NÃO (é TTS) → qual gênero?
    │
    ├── curto dark modelado de criativo do TikTok → /farming-pipeline (F6 monta e exporta)
    ├── peça de gênero do AI Creative Studio      → /oraclum-studio
    ├── VOD longo de canal dark                   → apps/canal-futebol · apps/canal-estoico
    ├── overlay e locução de live                 → apps/live-futebol
    └── edição manual fina: FX, togi, timeline    → apps/video-studio
```

**Não misture `/editonny` e `video-studio` no mesmo vídeo.** Os formatos de projeto são diferentes
(`project.json` vs. `studio-edit.json`) e não existe conversor. Decida um e vá até o fim.

### Os motores, um por um

| Motor | O que faz | Fala |
|---|---|---|
| `/editonny` 🆕 | Editor de *talking head*: transcreve local, corta pausa/respiração/erro/repetição, legenda com fidelidade, reenquadra (9:16, 16:9, 1:1, 4:5), trata áudio, insere cena de motion do catálogo de 145 | **gravada** |
| `apps/video-studio` | Editor pro: inspector contextual por `focusKind`, timeline elástica, ecossistema de FX em 4 grupos por escopo, togi karaokê por palavra com máscara, 6 fontes self-hosted em base64, export com manifesto | TTS |
| Farming F6 | Motor de montagem dos curtos modelados: trim que não estende, concat+setpts contra drop de frame, 3 fontes de texto, sincronia por SRT real, zona segura do TikTok | TTS |
| `/oraclum-studio` | Pipeline por gênero do AI Creative Studio: dark room, filme de marca, UGC/ads, série de nicho, institucional, image-lab | TTS |
| `apps/canal-futebol` · `canal-estoico` | VOD longo: narração em bloco com cache por hash, auditoria de WER, cartela como camada, b-roll com take real, âncora por caractere dentro do bloco | TTS |
| `apps/live-futebol` | Overlay de live: camisa do stitcher no lugar do retrato (existe para 6,5% dos jogadores), cama de torcida com ducking, chat lido pelo endpoint do player | TTS |

### Ferramentas de apoio

| Ferramenta | O que faz |
|---|---|
| `/packaging` | Título e thumb por nicho, pela Regra de 3. **O entregável primário de um episódio dark, antes do roteiro.** Também diagnostica CTR baixo de vídeo publicado |
| `apps/regra-de-3` | O motor por trás: pontuador determinístico + geração trocável |
| `apps/video-tools` | `limpa_legenda.py` (3 detectores para 3 estilos), `limpa_marca.py` |
| `apps/influencer-ia` | `gera_influencer.py` |
| `apps/infra` | Adaptadores e utilitários do laboratório local: CCC, Movie Builder, upscale, grade, arquivamento entre volumes (`arquiva.py`) |

### Lições que custaram caro

Estas estão na memória do projeto e valem repetir aqui, porque reaprendê-las custa horas:

- **`project.json` ≠ `studio-edit.json`.** A ponte entre o export do farming/editonny e o
  video-studio **não existe** e continua pendente.
- **Baixar ≠ capturar. Existir ≠ prestar.** O motor de farming reportava sucesso com zero vídeo.
- **Cache precisa da voz na chave.** Cache com chave só do texto devolve material velho dizendo
  "mantido".
- **O ritmo de quem modelamos não prevê a duração da nossa peça.** WPM de referência e WPM do
  motor são números diferentes.
- **SFX não entra no gênero estoico.** E, no editonny, áudio adicional é opt-in: pedir "deixa
  dinâmico" não autoriza música.
- **Número de cena de catálogo é ilustrativo.** Uma cena de "+300%" que ninguém trocou é alegação
  inventada indo ao ar — ver §4, claims ledger.

---

## §7 · Marketing, farming e conteúdo

### Os pipelines de inteligência

| Comando | O que faz | Saída |
|---|---|---|
| `@marketing-chief *daily-monitor` | Monitoramento diário multi-rede (Instagram, TikTok, YouTube, LinkedIn) | `workspaces/businesses/virals/marketing/daily-monitoring/{DATA}/*-ranking-*.md` |
| `@marketing-chief *creative-benchmark` | ETL profundo dos top criativos: transcrição + frames + análise | `daily-monitoring/{DATA}/benchmark/{plataforma}/{rank}-{handle}/` |

`*creative-benchmark` **exige** `*daily-monitor` rodado antes para a data-alvo.

O pipeline completo até o ClickUp: `daily-monitor` → sondagem → Lote → `creative-benchmark` →
`audit-benchmark` → `sync-clickup`.

### Farming

`/farming-pipeline` — garimpo no TikTok, com **duas portas de entrada**:

1. Monitorar postagens recentes
2. Auditar um lote de perfis informado (rota F1-P, curadoria sem corte automático, ranqueia por
   índice de outlier, mediana só de posts maduros a partir de 48h)

As duas convergem no mesmo ranking. Depois: corte por viral score → benchmark completo com legenda
e hashtags originais → modelagem → imagens com gate de qualidade → takes → export (F6).

Custo medido: **~63 s por criativo, teto de 20 por sessão.**

### Pauta e packaging

| Skill | O que faz |
|---|---|
| `/pauta-futebol` | Duas frentes: o que **aconteceu** em campo (API da ESPN) e o que se **falou** fora dele (RSS de 10 portais). Devolve pauta ranqueada com o fato estruturado |
| `/packaging` | Título e thumb, antes do roteiro |

### Captura e ETL

| Serviço | O que faz |
|---|---|
| `services/ETL/` | Extract (scrapers, auth, links), Load (database, handoff), Transform (video-intelligence) |
| `services/clickup/` | Scripts de integração com o ClickUp |
| `apps/captura_ia` | Oraclum Tech — cofre de recursos de IA |

**Rotas de captura que funcionam no TikTok:** só perfil (via yt-dlp) e CDN via Playwright.
Hashtag e download direto estão bloqueados.

**Cascata de captura do Instagram:** API anônima → API autenticada → Playwright. A sessão do
browser morre antes da sessão da API; há circuit breaker e relatório explícito de falhas.

---

## §8 · Produtos e infraestrutura web

| App | O que é |
|---|---|
| `apps/dashboard` | AIOS Dashboard — extensão de observabilidade (Next.js + Storybook) |
| `apps/creative-design` | Pipeline de design criativo (Next.js + Storybook) |
| `apps/BI/{garantido,imperio}-premios` | BI dos dois produtos de prêmios |
| `apps/{garantido,imperio}-premios-lp` | Landing pages (a do Império é pré-lander "white") |
| `apps/link-{garantido,imperio}` | Encurtadores |
| `apps/utm-capture-imperio` | Captura de UTM |
| `apps/webhook-garantido-pedidos` | Webhook de pedidos |
| `apps/webhook-imperio-capi` | Webhook da Conversions API da Meta |
| `apps/bx` | Projeto com AIOX e squads próprios embutidos |

### Qualidade de código nos apps

🆕 `tools/eslint-rules/` tem regras customizadas, com destaque para **`max-lines`**: teto de
linhas por arquivo, com mensagem que *ensina onde cortar* (lógica → serviço de domínio, UI
repetida → subcomponente, acesso a dados → repositório, helpers → módulo utilitário).

**Nada foi ligado.** Os apps `dashboard` e `creative-design` já têm `eslint.config.mjs` próprio, e
ligar um teto em código existente gera enxurrada de erro sem ninguém ter decidido isso. Para
adotar: suba em `warn`, meça, promova para `error`, e derrube os arquivos com
`docs/guides/vibe-coding-toolkit/prompts/09-file-size-refactor.md` — um arquivo por commit.

---

## §9 · Pesquisa, documentação e aprendizado

| Caminho | Para quê |
|---|---|
| `/tech-search` | Pesquisa técnica profunda: WebSearch + WebFetch + workers Haiku. Salva em `docs/research/{data}-{slug}/` |
| `@analyst` | Mercado, concorrência, ROI, brainstorming facilitado |
| `/teach` 🆕 | Ensina um assunto ao longo de **várias sessões**, usando o diretório atual como workspace com estado |
| `docs/guides/vibe-coding-toolkit/` 🆕 | **Playbook de 16 prompts + 23 fichas de ferramenta.** Não são skills: são receitas que você aponta para o agente |

### O mapa de `docs/`

```
docs/
├── guides/
│   ├── BIBLIA-SEVERINOS.md          ← este arquivo
│   ├── editonny-ponte.md         🆕
│   └── vibe-coding-toolkit/      🆕 ← 16 prompts, 23 ferramentas, templates
├── agents/                       🆕 ← issue-tracker.md, domain.md (config das skills importadas)
├── architecture/
│   ├── adr/                      🆕 ← ADRs (criados sob demanda por /domain-modeling)
│   ├── etl-service-architecture.md
│   └── outbound-autonomo-blueprint.md 🆕
├── reference/                    🆕 ← PROCEDENCIA.md, framework-5p/, pacotes originais
├── stories/ · epics/ · qa/gates/     ← o ciclo de desenvolvimento
├── wayfinding/                   🆕 ← mapas de névoa do /wayfinder
├── 01-Strategy/ · 03-Operations/ · 04-Products/ · 05-Squads/
├── research/ · meta_mba/
```

### Os prompts do playbook, por necessidade

| Preciso de… | Prompt |
|---|---|
| Limpar lixo acumulado no projeto | `01-project-sanitation.md` |
| Zerar warnings de lint regra a regra | `02-eslint-warning-burndown.md` |
| Revisão por múltiplos agentes em paralelo | `03-multi-agent-code-review.md` |
| Brainstorming → plano executável | `04-brainstorm-to-plan.md` |
| Despachar onda paralela de subagentes | `05-parallel-wave-dispatch.md` |
| Inicializar a memória do agente | `06-memory-bootstrap.md` |
| ESLint do zero / só os quality gates | `07-…` / `08-…` |
| Quebrar os arquivos gigantes | `09-file-size-refactor.md` |
| Preparar a máquina | `10-development-environment-setup.md` |
| Projeto Next.js novo / projeto existente | `11-…` / `12-…` |
| Revisão de segurança de diff / auditoria do repo | `13-…` / `16-…` |
| Avaliar / melhorar o harness do agente | `14-…` / `15-…` |

Como usar: *"Leia `docs/guides/vibe-coding-toolkit/prompts/09-file-size-refactor.md` e execute o
prompt daquele arquivo neste projeto."*

---

## §10 · O que entrou nesta importação, e o que ficou fora

### O que entrou

| Fonte | Licença | O que virou |
|---|---|---|
| **mattpocock/skills** | MIT | 18 skills de engenharia em `.claude/skills/` |
| **vibe-coding-toolkit** | MIT | Playbook em `docs/guides/vibe-coding-toolkit/`, regra `parallel-waves.md`, regras ESLint em `tools/eslint-rules/` |
| **editonny** | MIT | Skill instalada e verificada em `~/.local/share/editonny`; ponte em `docs/guides/editonny-ponte.md` |
| **agentville** | Apache-2.0 | 6 hooks em `.claude/hooks/vendor/agentville/`, skill `powershell-windows`, extensão compilada e instalada no VS Code e no Antigravity |
| **framework-5p** | sem licença | Skill `oferta-5p` (adaptação nossa, atribuída) + original em `docs/reference/framework-5p/` |
| **buscandomilhao** | sem licença | Regra `claims-ledger.md` + `docs/architecture/outbound-autonomo-blueprint.md` (texto nosso) |
| **Manual de Processo** | autor não declarado | Skill `manual-de-processo` |
| **Proposta Comercial** | autor não declarado | Skill `proposta-comercial` |

Índice de procedência: `docs/reference/PROCEDENCIA.md` · por skill:
`.claude/skills/ATTRIBUTION.md`.

⚠️ **Três assets vieram sem licença declarada.** Uso interno é o uso pretendido. Redistribuir,
revender ou embutir em entregável de cliente — não sem autorização do autor.

### Mapa de equivalências — o que ficou fora, e por quê

Cinco skills do Matt Pocock duplicariam o ciclo de story do AIOX. Importá-las criaria dois
processos concorrentes para a mesma coisa, e o custo disso é alguém escolher o errado no meio de
um trabalho.

| Não importada | Equivalente nosso |
|---|---|
| `to-spec` | `@pm` + Spec Pipeline |
| `to-tickets` | `@sm *draft` / `@pm *create-epic` |
| `implement` | `/develop-story` |
| `implement-spec` | `/wave-execute` |
| `triage` | `@po` backlog + ClickUp |
| `research` | `/tech-search` |
| `handoff` | `.claude/rules/agent-handoff.md` + `handoff-consolidation.md` |
| `ask-matt` | adaptado como `/skill-router` |
| `setup-matt-pocock-skills` | executado uma vez; resultado em `docs/agents/` |
| `git-guardrails-claude-code` | `enforce-git-push-authority.cjs` |
| `misc/*`, `in-progress/*` | congeladas, experimentais ou não aplicáveis |

### Do AgentVille

A extensão foi **compilada do fonte** — não há release nem publicação no Open VSX — e instalada
nos dois editores. Ela lê `~/.claude/projects/**/*.jsonl` e
`~/.gemini/antigravity-ide/brain/**/transcript.jsonl` e mostra, numa árvore na barra lateral, toda
sessão Claude Code e Antigravity rodando na máquina: projeto, branch, modelo, subagentes separados
em *Working* e *Completed*, com nome e modelo de cada um.

Para quem roda `/wave-execute` com vários subagentes, isso é a observabilidade que faltava. Para
abrir: ícone 🤖 **AgentVille** na barra de atividades (recarregue a janela se não aparecer).

O "escritório pixelado 2D" do README **não existe** — é roadmap. O que está entregue é a árvore.

---

## §11 · Pendências conhecidas

Honestidade sobre o que **não** está pronto vale mais que um índice que promete demais.

| Pendência | Detalhe | Onde |
|---|---|---|
| `GLOSSARY.md` não existe | O vocabulário do projeto (take, cartela, togi, Lote, pilar, insert) vive na memória, não em arquivo. `/domain-modeling` o cria sob demanda — mas alguém tem que começar | raiz do repo |
| Ponte farming/editonny → video-studio | Formatos de projeto incompatíveis, sem conversor. O export é o entregável | — |
| `por.traineddata` do Tesseract | Exige PowerShell como administrador. Hoje o OCR do editonny usa `eng` | `docs/guides/editonny-ponte.md` |
| Regras ESLint não ligadas | Decisão deliberada: ligar teto de linhas em código existente trava build | `tools/eslint-rules/README.md` |
| 5 hooks vendorizados desligados | Cada um tem um custo descrito | `.claude/hooks/vendor/agentville/CHANGES.md` |
| Sistema de outbound autônomo | Blueprint pronto; nada construído. A lacuna real é a camada de **conversa** (webhook de mensageria, trava de canal, motor de resposta, custo por lead) | `docs/architecture/outbound-autonomo-blueprint.md` |
| Varredura de markdown no ClickUp | Só o space Comercial foi checado e corrigido. Produto, Gestão e Projetos, não | — |
| Paleta ciano da Oraclum | `video-templates` pinta em ciano contra um brand-config sem ciano. Aguarda autorização | — |
| Upgrade de RAM | 4 slots DDR4, 2 em uso. O gargalo dos modelos grandes é RAM, não VRAM nem disco | — |

---

## Apêndice · As 43 skills, em ordem alfabética

🆕 = entrou nesta importação

`aiox-commit` · `apply-qa-fixes` · `architect-first` · `checklist-runner` · `close-story` ·
`codebase-design` 🆕 · `code-review-2axis` 🆕 · `coderabbit-review` · `develop-story` ·
`diagnosing-bugs` 🆕 · `domain-modeling` 🆕 · `editonny` 🆕 · `farming-pipeline` · `full-sdc` ·
`grill-me` 🆕 · `grill-with-docs` 🆕 · `grilling` 🆕 · `improve-codebase-architecture` 🆕 ·
`manual-de-processo` 🆕 · `mcp-builder` · `oferta-5p` 🆕 · `oraclum-studio` · `packaging` ·
`pauta-futebol` · `powershell-windows` 🆕 · `pr` 🆕 · `proposta-comercial` 🆕 · `prototype` 🆕 ·
`retro` 🆕 · `review-story` · `skill-creator` · `skill-router` 🆕 · `synapse` · `tdd` 🆕 ·
`teach` 🆕 · `tech-search` · `to-questionnaire` 🆕 · `validate-story-draft` · `wait-what` 🆕 ·
`wave-execute` · `wayfinder` 🆕 · `wizard` 🆕 · `writing-for-agents` 🆕

(`editonny` é instalada no escopo do usuário, em `~/.claude/skills/`; as outras 42 vivem em
`.claude/skills/` deste repo.)
