# Architecture — Oraclum Tech · AI Creative Studio

> Documento de arquitetura do squad. Deriva de `_BLUEPRINT.md` (fonte única de verdade,
> aprovada pelo founder em 2026-08-21) e registra as decisões que sustentam o desenho,
> com o porquê de cada uma.
> **Versão:** 1.0.0 · **Autor:** @architect (Aria)

---

## 1. Princípio central

> **O gênero define o pipeline. O pipeline define o elenco.**

Não existe "um pipeline de vídeo" neste estúdio. Existe um **catálogo de gêneros**
(`data/genre-catalog.yaml`) e cada gênero ativa um **pipeline profile**
(`data/pipeline-profiles.yaml`) que declara estágios ordenados, elenco convocado,
artefatos, quality gates e — o que mais importa — **quem executa cada estágio**.

A alternativa descartada era um pipeline único com estágios opcionais. Ela falha por
um motivo prático: um comercial de cosmético e um anúncio de UGC não são o mesmo
processo com etapas desligadas. São processos com **códigos opostos** — um busca
acabamento, o outro busca parecer não-produzido. Um pipeline único empurraria os dois
para o meio-termo, que é o pior lugar para os dois.

O custo dessa escolha é manter 6 perfis em vez de 1. O ganho é que cada gênero pode ter
elenco enxuto: o P2 (UGC) não convoca diretor de criação nem diretor de fotografia
**de propósito**, e o P5 (dark room) roda com 10 estágios em vez de 16.

---

## 2. Tiers do elenco (17 agentes)

| Tier | Agentes | Papel estrutural |
|---|---|---|
| **0 · Comando** | `studio-chief`, `exec-producer` | Porta de entrada, roteamento, estado do job, emissão de cards humanos, veto |
| **1 · Planejamento** | `brief-strategist`, `research-scout`, `creative-director`, `head-of-copy`, `showrunner` | Transformam pedido em brief, referência, território, roteiro e — no P3 — bíblia |
| **2 · Direção** | `film-director`, `dop`, `art-director` | Traduzem conceito em plano-a-plano, luz e design |
| **3 · Execução** | `image-lead`, `motion-lead`, `character-lead`, `editor`, `sound-designer` | **Dirigem** a geração e a montagem (ver ADR-001) |
| **4 · Qualidade** | `fact-checker` (bloqueante), `qa-critic` (veredito) | Barram a peça antes da entrega |

A separação entre tier 2 (Direção) e tier 3 (Execução) não é hierárquica, é de **natureza
do artefato**: o tier 2 produz *intenção* (storyboard, look-book, art-spec) e o tier 3
produz *instrução executável* (Pacote de Direção, spec de montagem). Misturar os dois
foi o erro que o desenho evita — intenção sem instrução não sai do papel, instrução sem
intenção produz asset bonito e fora do conceito.

**Estágios presentes nos 6 pipelines:** `stills`, `factcheck`, `gate`, `delivery`.
São o núcleo comum. Todo o resto é variável por gênero.

---

## 3. Fluxo de um job, ponta a ponta

```
PEDIDO
  │
  ▼
[intake]      studio-chief · agent ────────── classifica o gênero
  │                                            job.json criado
  ▼
[brief]       brief-strategist · agent ─────── brief.yaml + brand-lock.yaml (snapshot)
  │
  ▼
[research]    research-scout · worker ──────── ETL de referência → dossiê + não-copiar
  │
  ▼
[concept]     creative-director · agent ────── ⏸ PARADA HUMANA: 3 rotas, 1 escolhida
  │
  ▼
[story]       showrunner · agent ───────────── só P3 · bíblia de personagem
  │
  ▼
[script]      head-of-copy · agent ─────────── roteiro + claim-ledger.json
  │
  ▼
[decupagem]   film-director · agent ────────── storyboard + shotlist + edit-spec
[look]        dop · agent ──────────────────── look-book (prompt E instrução de set)
[design]      art-director · agent ─────────── art-spec + tipografia
[character]   character-lead · agent ───────── bíblia + reference sheets
  │
  ▼
[stills]      image-lead · HUMAN ───────────── ⏸ PARADA HUMANA
  │             ├─ agente escreve asset_direction (Pacote de Direção)
  │             ├─ exec-producer emite card
  │             ├─ OPERADOR gera e devolve em entregues/
  │             └─ agente faz drift-check → aceita ou dirige retake (teto 3)
  ▼
[takes]       motion-lead · HUMAN ─────────── ⏸ mesmo laço, a partir do still aprovado
  │
  ▼
[audio]       sound-designer · HUMAN ──────── ⏸ VO gravado; trilha licenciada
  │
  ▼
[assembly]    editor · worker + HUMAN
  │             ├─ app próprio: autolegenda e tratamentos (worker)
  │             ├─ ae-comp-spec.md    → After Effects (humano)
  │             └─ premiere-cut-spec.md → Premiere Pro (humano) → master/
  ▼
[factcheck]   fact-checker · agent ─────────── 🚫 BLOQUEANTE · waiver proibido
  │
  ▼
[gate]        qa-critic · agent ────────────── PASS / CONCERNS / FAIL / WAIVED
  │
  ▼
[delivery]    exec-producer · agent ────────── entrega + publishing-kit
```

Cada seta é um **arquivo em disco**, nunca contexto de conversa. Um estágio que
"entendeu" o anterior mas não recebeu arquivo não recebeu nada — o contrato de cada
handoff está em `data/handoff-matrix.yaml`.

---

## 4. Modelo híbrido: humano × worker × agente

Cada estágio declara `executor`. A distribuição não é arbitrária — segue de onde está o
valor de cada tipo de executor.

| Executor | O que faz bem | Onde entra neste squad |
|---|---|---|
| **agent** | Síntese, estrutura, coerência, crítica com critério | Brief, conceito, roteiro, direção, Pacote de Direção, drift-check, gates |
| **human** | Feeling, iteração, descarte, julgamento estético | **Toda geração de asset**, aprovação de rota, montagem em AE/Premiere |
| **worker** | Determinismo e repetição | Benchmark ETL, transcrição/autolegenda, composição on-brand, empacotamento |

**Regra dura:** `executor: human` significa que o pipeline **para** e emite um card de
tarefa humana. Nunca se simula a execução humana, nunca se registra como concluído um
estágio cujo arquivo não chegou. É a mesma disciplina que evitou, no pipeline de
benchmark do farming, o relatório de "10 ok / 0 failed" com zero vídeo em disco.

---

## 5. Decisões arquiteturais (ADR)

### ADR-001 — A geração de asset é HUMANA. O squad dirige, não gera.

**Status:** aceita · decisão do founder, 2026-08-21 (`_BLUEPRINT.md` §3.1)
**Escopo:** estágios `stills` e `takes` em **todos** os 6 pipelines; geração de voz em `audio`.

**Contexto.** O desenho inicial deste squad previa `stills` e `takes` como `worker`,
chamando a cascata free-first já existente no `virals-farming-squad`. Tecnicamente
funciona — o farming gera imagem e take por API todos os dias.

**Decisão.** Os estágios de geração são `executor: human`, sem variante `agent` ou
`worker`. O entregável dos agentes de execução **não é o asset — é o Pacote de Direção**
(`asset_direction`, §3.2 do blueprint): ferramenta recomendada e alternativa, prompt
pronto para colar, prompt negativo, parâmetros exatos, técnica para extrair o máximo
daquele modelo, armadilhas conhecidas dele, critério de aceite verificável, número de
variações, pós-processamento e plano B.

**Porquê.** Geração de asset com IA ainda exige feeling: ler o resultado, descartar,
refinar, perceber que a mão saiu errada ou que a luz não é a do look-book. Uma chamada
de API não faz isso — ela aceita o primeiro retorno. Automatizar a geração otimizaria a
etapa errada: o gargalo do estúdio não é o custo do crédito, é o **retrabalho**. O valor
que o agente agrega está em escolher a ferramenta certa, escrever o prompt com a técnica
correta, antecipar o que aquele modelo erra e dar o critério de avaliação — ou seja, em
fazer o operador acertar na primeira ou segunda tentativa em vez da décima.

**Consequências.**
- `data/model-routing.yaml` deixa de ser cascata automática e vira **matriz de
  recomendação para operador humano**. Ferramenta web com interface passa a ser cidadã
  de primeira classe, não fallback — é onde o humano itera.
- Os scripts de geração do farming (`farm-images.js`, `farm-takes.js`, `adapters/`)
  entram no `squad.yaml` como `generation_reference_only`: fonte de conhecimento sobre
  parâmetro real e armadilha medida, **não** ativos chamados pelo pipeline.
- Metade `agent` do laço permanece e é essencial: o `drift-check` avalia o retorno
  contra o `criterio_de_aceite` e dirige o retake (teto de 3 ciclos).
- O `exec-producer` orça o job em **número de cards humanos**, não em créditos.
- Custo aceito: throughput menor que o de um pipeline automatizado. Ganho: acabamento
  compatível com peça-vitrine e com cliente externo pagante.

**Alternativas descartadas.**
- *Worker com aprovação humana no fim*: o humano vira revisor de lote ruim, sem poder de
  correção no meio — o pior dos dois mundos.
- *Híbrido por gênero* (auto no P5, humano no P1): cria duas culturas de qualidade dentro
  do mesmo squad e um caminho fácil para o gênero "barato" degradar sem ninguém notar.

---

### ADR-002 — Cadeia de finalização: app próprio → After Effects → Premiere. DaVinci sai.

**Status:** aceita · decisão do founder, 2026-08-21 (`_BLUEPRINT.md` §3.3)

**Contexto.** O `virals-marketing-squad` tem um exportador para DaVinci Resolve
(`export_to_davinci.py`, gerando FCPXML). Era o candidato natural a rota de finalização.

**Decisão.** A cadeia é:

| Etapa | Ferramenta | Executor | Entrega |
|---|---|---|---|
| 1 | `apps/video-studio` (Remotion) | worker | Timeline auto-montada a partir do video-brief, autolegenda com timestamp por palavra, FX on-brand · `npm run studio`, `npm run render [slug]` |
| 2 | **After Effects** | human | Motion graphics, composição, VFX, lower-third, animação de texto |
| 3 | **Premiere Pro** | human | Corte final, montagem, mixagem, master e export por canal |

Para imagem e carrossel, o app equivalente da etapa 1 é `apps/creative-design`.

O `export_to_davinci.py` fica marcado como **legado** no `squad.yaml` (bloco `legacy`) e
nenhum agente, task ou workflow deste squad o chama.

**Porquê.** A finalização passa a ser feita por quem tem domínio da ferramenta, na
ferramenta que a operação já usa. Manter o DaVinci significaria sustentar um exportador
FCPXML para um software fora do fluxo real — dívida técnica sem usuário.

**Consequência de arquitetura — a mais importante deste ADR.** O `editor` e o
`motion-lead` deixam de entregar projeto renderizado e passam a entregar
**especificação executável**:

- `ae-comp-spec.md` — composições a construir, camadas, parâmetros de animação com
  valor numérico (`300ms ease-out`, não "suave"), specs de lower-third no padrão da marca
- `premiere-cut-spec.md` — ordem de cortes com timecode **e o porquê de cada corte**,
  bins e nomenclatura de importação, faixas e pontos de mixagem, preset de export por canal
- Ambos com o campo obrigatório `ja_resolvido_pelo_app`: o que a etapa 1 já entregou e
  **não** deve ser refeito na mão

Esse campo existe porque o desperdício clássico dessa cadeia é o operador refazer no AE
a legenda que o app já sincronizou por palavra. O app resolve legenda e tratamento; a
spec diz explicitamente para não tocar neles.

---

### ADR-003 — Fidelidade antecipada no `script`, bloqueio terminal no `factcheck`

**Status:** aceita

**Contexto.** O `factcheck` é bloqueante e fica depois do `assembly` — descobrir um
claim inventado ali significa refazer still, take, VO e montagem.

**Decisão.** O estágio `script` produz `claim-ledger.json`: cada afirmação factual do
roteiro apontando para uma fonte, com `fonte_tipo: primaria | secundaria | inexistente`.
O `gate-script` barra qualquer claim com fonte inexistente. O `factcheck` continua
terminal e bloqueante, mas audita **contra o ledger** em vez de opinar do zero.

**Porquê.** Espelha o que o `quality_gate_video.py` do marketing squad já faz: gate
terminal sobre o **plano**, com `detect_fabricated_numbers` e `detect_fabricated_claims`,
antes da produção. O custo de barrar no roteiro é uma linha reescrita; depois do
assembly, é o job inteiro. Sem o ledger, o factcheck vira julgamento sem referência.

**Consequência.** `factcheck` é o único gate onde **waiver é proibido**. Para a Oraclum,
a regra "sem case fabricado" é o que sustenta a credibilidade da marca — ela não é
negociável por prazo.

---

### ADR-004 — `brand-lock.yaml` é snapshot, não ponteiro

**Status:** aceita

**Decisão.** No estágio `brief`, a identidade de marca aplicável é **copiada** para
`{job}/01-brief/brand-lock.yaml` (paleta, tipografia, `lexico_nunca_usar`, restrições,
arquétipo, versão da fonte), em vez de referenciada por caminho.

**Porquê.** As fontes mudam durante a operação: o `brand-identity.yaml` da Oraclum foi de
v2 para v2.1, e a paleta do `brand-config.yaml` foi realinhada em 2026-08-14 (o site real
não tem cyan em lugar nenhum). Um job que aponta para o arquivo vivo troca de regra no
meio da produção e fica irreproduzível. O snapshot congela a regra vigente na abertura.

**Consequência.** O `factcheck` valida contra o snapshot do job, não contra o arquivo
atual. Divergência entre os dois é informação, não erro.

---

### ADR-005 — P4 sem `exec-producer` e sem `research-scout`

**Status:** aceita · deriva do elenco declarado no blueprint §5

**Contexto.** O elenco do P4 (institucional Oraclum) declarado no blueprint não inclui
`exec-producer` nem `research-scout`, mas o mapa canônico de estágios atribui `delivery`
ao `exec-producer`.

**Decisão.** No P4, o `studio-chief` absorve `intake` e `delivery`. O estágio `research`
não existe: o `brief` ancora a referência no monitoramento diário já produzido pelo
`virals-marketing-squad` (`dossie-herdado.md`).

**Porquê.** Job interno de peça única não tem cronograma nem orçamento a produzir —
line producer ali é cerimônia. E rodar benchmark novo a cada institucional seria pagar
duas vezes pelo mesmo dado, já que a pesquisa da Oraclum é permanente.

**Consequência.** Se um pedido de institucional crescer para campanha multi-peça, ele
**muda de gênero** para `lancamento-produto` (backlog) e passa a convocar `exec-producer`.
O gatilho está registrado no fallback do estágio `delivery` do P4.

---

### ADR-006 — P5 sem `brief`: o brief do dark-room é por CANAL

**Status:** aceita · deriva do elenco declarado no blueprint §5

**Contexto.** O elenco do P5 não inclui `brief-strategist`, mas nenhum episódio se produz
sem direção.

**Decisão.** O P5 não tem estágio `brief`. Em vez disso tem um **pré-requisito
persistente**: `channel-brief.yaml`, escrito uma vez por canal (nicho, tese editorial,
voz, assinatura visual, motif sonoro, tabus, fontes aceitas) e revisado por temporada.
Sem esse arquivo, o job não inicia — é convertido em job de fundação de canal.

**Porquê.** Em canal sem rosto o ativo é o **canal**, não o episódio. Escrever brief a
cada episódio faria a voz e a paleta variarem, e o público nunca reconheceria o canal no
feed — que é a única forma de acumular audiência sem rosto. É também o único pipeline em
que a ausência de VO **bloqueia**: a voz é a assinatura.

---

### ADR-007 — P6 é transversal e roda em modo embutido

**Status:** aceita

**Decisão.** O `image-lab` vende isolado **e** é invocável como sub-rotina de P1–P5. Em
modo embutido, pula `intake`, `brief` e `research`, herda `brief.yaml` e `art-spec.yaml`
do job pai, grava em `{job-pai}/11-stills/subrotina-{asset}/` e devolve o caminho do
arquivo — sem abrir job próprio nem gerar entrega separada.

**Porquê.** A alternativa (abrir job filho completo) faria o cliente ser cobrado duas
vezes pela mesma peça e duplicaria brief e gates para um asset que já tem direção. O caso
concreto: o P5 precisa da thumbnail do episódio, o P3 precisa da capa — são assets do job
principal, não projetos.

---

### ADR-008 — Reuso por leitura; escrita isolada no workspace da Oraclum

**Status:** aceita

**Decisão.** O squad **lê** identidade de marca e motor técnico dos squads de marketing e
farming, e **escreve** exclusivamente em
`workspaces/businesses/oraclum/creative-studio/` e `.aiox/handoffs/`. Nunca edita arquivo
de outro squad — se precisar de mudança no motor alheio, abre handoff.

**Porquê.** É o princípio de zero coupling: o estúdio pode evoluir sem quebrar o farming,
e o farming pode evoluir sem quebrar o estúdio. Reuso por leitura preserva a
independência; reuso por edição a destrói.

---

### ADR-009 — Model routing é recomendação, não cascata

**Status:** aceita · consequência direta do ADR-001

**Decisão.** `data/model-routing.yaml` documenta, por tipo de asset, qual ferramenta
usar, **por quê**, quando preferir a alternativa, que técnica extrai o máximo dela, que
armadilhas o modelo tem e o custo relativo. Toda linha precisa de **evidência no
repositório** ou da marca `status: a_validar`.

**Porquê.** Sob a regra de ouro não há roteador tentando provider após provider — há um
operador decidindo. E há um segundo motivo, aprendido no repositório: **dado externo
copiado para dentro do código apodrece**. Três dos quatro modelos fixos do `recast_engine`
sumiram do catálogo e devolveram 404; o `model_router.py` foi escrito para perguntar à
fonte em runtime. Aqui a mesma disciplina aparece como obrigação de evidência: ferramenta
citada sem evidência nem marca `a_validar` é invenção de capacidade.

**Itens hoje marcados `a_validar`:** text-to-video (não existe adapter no repositório),
síntese de voz (**nenhum** gerador de voz existe no monorepo — verificado por varredura),
geração de música, upscaler de acabamento, e ferramentas dedicadas de consistência de
personagem.

---

### ADR-010 — No P3, o `concept` pertence ao `showrunner`

**Status:** aceita · correção de coerência detectada em auditoria cruzada (2026-08-22)

**Contexto.** O mapa canônico de estágios atribui `concept` ao `creative-director`, e o
desenho inicial do P3 seguiu esse padrão. Uma verificação cruzada entre
`pipeline-profiles.yaml` e `genre-catalog.yaml` mostrou que o `creative-director`
**não faz parte do elenco do `nicho-series`** declarado no blueprint §5 — ou seja, o P3
tinha um estágio cujo dono não estava convocado para o pipeline.

**Decisão.** No P3, e somente nele, o `concept` passa a ser do `showrunner`. O elenco
declarado no blueprint permanece intocado.

**Porquê.** Duas alternativas foram descartadas:
- *Adicionar `creative-director` ao elenco do P3* — o blueprint §5 é fonte de verdade e a
  instrução é obedecê-lo integralmente. Ampliar elenco por conveniência de implementação
  inverte a autoridade do documento.
- *Remover o estágio `concept` do P3* — o piloto precisa de território antes da bíblia;
  sem ele o `story` nasce sem direção.

A solução escolhida também é a correta pelo ofício: em série, a autoridade criativa **é**
o showrunner. Ele responde pelo território e pela bíblia, e separar os dois criaria dois
donos para a mesma voz — que é exatamente o problema que a bíblia existe para evitar. O
`studio-chief` mantém o poder de veto sobre a rota escolhida.

**Consequência.** É a única exceção de `owner_agent` fora do mapa canônico, registrada no
próprio estágio (campo `excecao_de_owner`) para não virar precedente silencioso. Qualquer
outra divergência entre `owner_agent` e elenco do gênero é erro, não decisão.

---

## 6. Mapa de reuso de ativos existentes

| Ativo | Path | Uso no estúdio | Natureza |
|---|---|---|---|
| Plano de criativo de vídeo | `virals-marketing-squad/scripts/plan_video_creative.py` | Base de storyboard, edit_spec, shotlist e sound_design | Chamado |
| Visão sobre frames | `.../vision_video_benchmark.py`, `farming/scripts/_vision.js` | `research` — análise visual do benchmark | Chamado |
| Gate de vídeo | `.../quality_gate_video.py` | Base do gate de plano (V1–V7) | Chamado |
| Fidelidade factual | `.../test_fact_fidelity.py`, `copy_guardrails.py` | Base do `fact-checker` | Chamado |
| Registry de templates | `.../video_templates.py` + `clients/oraclum/video-templates.yaml` | Packs de hook, legenda, transição, motion | Chamado (com ressalva, §7) |
| Composição on-brand | `.../design_creative.py`, `apps/creative-design` | Tipografia e marca sobre a cena gerada | Chamado |
| Transcrição/legenda | `farming/scripts/_speech.js`, `apps/video-studio` | Autolegenda com timestamp por palavra | Chamado |
| App de edição | `apps/video-studio` (Remotion) | Etapa 1 da finalização | Chamado |
| Descoberta de modelo de texto | `.../model_router.py` | Modelos gratuitos em runtime | Chamado |
| Pipeline de farming (6 fases) | `farming/scripts/farm-*.js` | **Referência de arquitetura #1** — scout→benchmark→model→images→takes→assemble funcionando ponta a ponta | Referência |
| Cascata de providers | `farming/config/ai-providers.yaml` | Status real de cada modelo: o que funciona, o que está desativado e por quê | **Referência apenas** |
| Scripts de geração | `farm-images.js`, `farm-takes.js`, `adapters/` | Parâmetros reais e armadilhas medidas para o Pacote de Direção | **Referência apenas** (ADR-001) |
| Export DaVinci | `.../export_to_davinci.py` | — | **Legado, não usar** (ADR-002) |

**Agentes a clonar e adaptar:** `sam-kolder-vid` → `motion-lead` · `casey-neistat-img` →
`image-lead` · `farming-modeler` → `film-director` · `farming-producer` → `editor`.

**Agentes a referenciar cross-squad (handoff, sem duplicar):** `@ladeira`, `@georgi`
(copy/VSL) · `@mrbeast-mk` (retenção) · `@garyvee-mk` (social) · `@perry-marshall`,
`@ezra-firestone` (ads) · squads `storytelling`, `copy-squad`, `brand-squad`,
`traffic-masters`.

---

## 7. Inconsistências e riscos conhecidos

| # | Achado | Impacto | Encaminhamento |
|---|---|---|---|
| 1 | `clients/oraclum/video-templates.yaml` declara a paleta antiga (Obsidian `#0F0C20` + Cyan `#00F0FF`), enquanto o `brand-config.yaml` v2.0 registra que o site **não tem cyan em lugar nenhum** — a paleta correta é `#08080C` + purple `#A855F7` | Peça de vídeo da Oraclum sai fora da identidade do site | Registrado no fallback do `assembly` do P4: **vence o brand-config**. O registry precisa ser atualizado pelo dono do marketing squad — fora do escopo deste squad |
| 2 | Blueprint §5: elenco do P4 não inclui `exec-producer`, mas `delivery` é atribuído a ele | Estágio sem dono | Resolvido por ADR-005 (studio-chief absorve) |
| 3 | Blueprint §5: elenco do P5 não inclui `brief-strategist`, e o gênero precisa de direção | Pipeline sem brief | Resolvido por ADR-006 (`channel-brief.yaml` persistente) |
| 4 | Blueprint §5: elenco do P6 não inclui `exec-producer`, `editor`, `motion-lead` nem `sound-designer` | Sem dono de delivery | Resolvido: `studio-chief` entrega; não há timeline em imagem pura |
| 5 | Blueprint §5: elenco do P5 não inclui `film-director` nem `dop`, mas b-roll precisa de gramática visual | Risco de peça visualmente pobre | Mitigado pelo `mapa-broll.md` (estágio `script`) + `craft-references.yaml` § dark-room. Se virar gargalo recorrente, criar variante de gênero com `dop` |
| 6 | Nenhum gerador de voz existe no monorepo (varredura por `edge-tts`, `elevenlabs`, `piper`, `gTTS`, `text-to-speech`: zero ocorrências) | VO depende de agenda humana | Registrado como `a_validar` em `model-routing.yaml`; VO é gravação até prova em contrário |
| 7 | O único provider de API que aceitava imagem de referência (`gemini-image`) está desativado por falta de cota | Consistência de personagem por API é indisponível | Rota real é web com upload (Gemini/ChatGPT) — reforça o ADR-001 |
| 8 | Pool mensal gratuito do HuggingFace é compartilhado entre geração de imagem e o único I2V em free tier | Gastar HF em still barato deixa o estúdio sem take | Regra de economia registrada em `model-routing.yaml`: HF reservado ao I2V |

---

## 8. Padrões obrigatórios

- **Agentes:** hybrid loader, Level 0–6, ≥800 linhas, comandos com
  `visibility: [full, quick, key]`, `*help` e `*guide` em todos, greeting nativo com badge
  de permissão e signature. Todo agente precisa saber **dizer não** e ter critério de veto explícito.
- **Tasks:** Task Anatomy completa (`task_name`, `status`, `responsible_executor`,
  `execution_type`, `input`, `output`, `action_items`, `acceptance_criteria`).
- **Workflows:** YAML com estágios, `executor`, `handon`, `handoff`, `gate`, `fallback`.
- **Idioma:** português do Brasil com acentuação correta; termos de mercado em inglês
  quando for o uso corrente (hook, b-roll, key art, lower-third).
- **Toda peça** passa por `fact-checker` (bloqueante) e `qa-critic` (veredito) antes da entrega.

---

## 9. Como estender

| Quero… | Faça |
|---|---|
| Adicionar um gênero | Escolha o `delta_from` em `genre-catalog.yaml` (backlog) e implemente o `o_que_muda` como diff do pipeline mais próximo — nunca um pipeline novo do zero |
| Adicionar um estágio | **Não adicione.** Os 17 ids canônicos são fechados. Se um gênero precisa de algo novo, provavelmente é um artefato novo dentro de um estágio existente |
| Trocar uma ferramenta de geração | Edite `model-routing.yaml` com evidência ou `a_validar`. Não altere o executor: continua `human` |
| Validar um item `a_validar` | Teste, registre o resultado em `_retorno.json`, e atualize `status` + `evidencia` |
| Mudar a cadeia de finalização | Novo ADR. `assembly` entrega especificação, não render — mudar isso muda o contrato do `editor` e do `motion-lead` |
