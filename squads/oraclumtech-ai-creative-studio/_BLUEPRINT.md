# BLUEPRINT — oraclumtech-ai-creative-studio

> Documento de fundação. Fonte única de verdade para a criação do squad.
> Autor: @aiox-master (Orion) · Data: 2026-08-21 · Status: aprovado pelo founder
> **Todo agente/task/workflow deste squad DEVE obedecer a este blueprint.**
>
> ⚠️ **Anexo normativo obrigatório:** `_CONVENTIONS.md` fixa a nomenclatura canônica
> (paths de job, `job.json`, placeholder `{job}`, nomes de checklist, `gate-verdict.md`).
> Em conflito de nomenclatura, o `_CONVENTIONS.md` vence.

---

## 1. Contexto de negócio

`oraclumtech.ai` é a **vertical de criação audiovisual e de imagem com IA** dentro da
Oraclum Tech — agência IA-first de aquisição e conversão (ver
`squads/virals-marketing-squad/data/clients/oraclum/brand-identity.yaml` v2.1, fonte
canônica de avatar, tom de voz, léxico e restrições).

Mapeamento ao catálogo de produtos existente da Oraclum:
- **Oraclum AI Gen** — social mídia & conteúdo com IA (casa natural deste squad)
- **Oraclum X** — tráfego & anúncios (consome os criativos de ads produzidos aqui)

O squad atende **três tipos de cliente**:
1. **Interno Oraclum** — institucional, prova de método, build-in-public
2. **Perfis próprios de farming** — páginas de nicho para crescimento e captação
3. **Clientes externos** — marcas que compram campanha, UGC, ads e imagem

### Restrições herdadas do brand-identity (NÃO-NEGOCIÁVEIS)
- **Sem case fabricado.** A Oraclum não tem cases de cliente. Nenhuma peça pode
  inventar depoimento, número ou resultado de cliente. A prova é o sistema rodando.
- **Léxico proibido:** "fórmula mágica", "fique rico fácil", "segredo infalível",
  "revolução milagrosa", "case de cliente" (até existir um real).
- **Léxico próprio:** automação, agente, IA aplicada, workflow, escala, aquisição,
  conversão, dado, produtividade.
- **Arquétipo:** O Sábio (conhecimento, clareza, dado) + acessório O Criador.
- **Nunca:** robô apertando mão humana, IA como mágica, omitir limitação de ferramenta.
- Isso vale para peças da própria Oraclum. Para **cliente externo**, a marca-guia é
  o brand-identity DO CLIENTE — o `brief-strategist` carrega o arquivo do cliente.

---

## 2. Princípio arquitetural central

> **O gênero define o pipeline. O pipeline define o elenco.**

Não existe "um pipeline de vídeo". Existe um **catálogo de gêneros**, e cada gênero
ativa um **pipeline profile** que declara: estágios, agentes convocados, artefatos,
quality gates e — crucialmente — **quem executa cada estágio** (humano / worker / agente).

Um brief entra pelo `studio-chief`, é classificado em um gênero pelo
`brief-strategist`, e o `exec-producer` instancia o pipeline profile correspondente.

---

## 3. Modelo de execução híbrida (humano × worker × agente)

Cada estágio de cada pipeline declara obrigatoriamente:

```yaml
stage:
  id: <slug>
  owner_agent: <agent-id>          # quem PENSA o estágio
  executor: human | worker | agent # quem EXECUTA o trabalho
  handon:                          # o que o estágio RECEBE
    from: <stage-id | brief>
    artifacts: [<path/glob>]
    contract: <schema ou checklist>
  handoff:                         # o que o estágio ENTREGA
    to: <stage-id>
    artifacts: [<path/glob>]
    gate: <checklist-id>           # precisa passar para liberar o próximo
  fallback: <o que fazer se o executor falhar/estiver indisponível>
```

Regras:
- `executor: human` → o estágio PARA e emite um **card de tarefa humana** com
  instruções de execução e critério de aceite. Nunca simular a execução humana.
- `executor: worker` → script/serviço determinístico (ex.: render, upscale, ETL).
  Sempre há `fallback` para agente ou humano.
- `executor: agent` → agente do squad executa com LLM.
- Todo handoff é **arquivo em disco**, nunca só contexto de conversa.
- Nenhum estágio começa sem o `gate` do anterior ter passado (ou waiver explícito
  registrado com justificativa e autor).

Diretório de estado por job: `workspaces/businesses/oraclum/creative-studio/jobs/{job-id}/`

### 3.1 — REGRA DE OURO: a geração final é HUMANA (decisão do founder, 2026-08-21)

> **O squad NÃO gera a imagem nem o vídeo. O squad DIRIGE a geração.**

Geração de asset com IA ainda exige feeling humano — leitura de resultado, tentativa,
descarte, refino. Portanto:

- Os estágios `stills` (imagem) e `takes` (vídeo) são **`executor: human`, sempre**.
  Não existe variante `agent` ou `worker` para eles.
- O que o `image-lead` e o `motion-lead` entregam **não é o asset — é o Pacote de
  Direção** (seção 3.2), que faz um operador humano gerar o asset certo na primeira
  ou segunda tentativa em vez da décima.
- O valor do agente está em: escolher a ferramenta certa, escrever o prompt com a
  técnica correta, antecipar o que vai falhar naquele modelo, dar o parâmetro exato,
  e dizer como avaliar o resultado.
- Os agentes de execução **avaliam** o asset que o humano devolve (`*drift-check`,
  `*consistency`, retake dirigido) — essa parte é `executor: agent`.
- Vale também para voz/VO: o `sound-designer` dirige, o humano gera.

### 3.2 — O Pacote de Direção (artefato canônico de `stills`, `takes` e `audio`)

Entregável obrigatório, por asset, antes de qualquer estágio de geração humana:

```yaml
asset_direction:
  asset_id: <slug>
  destino: <plano do storyboard | thumb | key art | packshot | capa-ep>
  ferramenta_recomendada: <nome>          # + alternativa e por que
  prompt: |                                # prompt pronto para colar
    <texto completo>
  prompt_negativo: |                       # quando a ferramenta suportar
  parametros:                              # seed, aspect, steps, cfg, motion, duração...
  tecnica:                                 # o COMO extrair o máximo da ferramenta
    - <técnica 1: ex. character sheet como referência antes do take>
    - <técnica 2: ex. gerar still-chave e usar I2V em vez de T2V direto>
  armadilhas_conhecidas:                   # o que esse modelo erra e como evitar
    - <ex. mão em primeiro plano; texto na imagem; deriva de wardrobe>
  criterio_de_aceite:                      # como o humano sabe que acertou
    - <verificável, não "ficou bom">
  quantas_variacoes: <n>                   # quantas gerar para escolher
  pos_processamento:                       # upscale, corte, grade, correção
  se_falhar: <plano B concreto>
```

### 3.3 — Finalização (decisão do founder, 2026-08-21)

**DaVinci Resolve saiu do fluxo.** A cadeia de finalização agora é:

1. **App próprio** — `apps/video-studio` (Remotion + UI Next): timeline auto-montada a
   partir do `video-brief`, autolegenda, FX on-brand, preview e render headless
   (`npm run studio`, `npm run render [slug]`). Para imagem/carrossel o equivalente é
   `apps/creative-design`.
2. **After Effects** — motion graphics, composição, VFX, lower-thirds, animação de texto
3. **Premiere Pro** — corte final, montagem, mixagem, master e export

Consequência para o `editor` e o `motion-lead`: eles entregam **especificação de
montagem executável em AE/Premiere**, não um projeto renderizado. Isso inclui:
- ordem de cortes com timecode, e o porquê de cada corte
- lista de composições de AE a construir, com parâmetros de animação
- specs de lower-third, legendas e motion graphics no padrão da marca
- pastas/nomenclatura de importação, organização de bins
- preset de export por canal (formato, codec, bitrate, resolução, safe area)
- o que o app próprio já resolve e **não** deve ser refeito na mão

O `export_to_davinci.py` fica marcado como legado e não é chamado por este squad.

---

## 4. Elenco — 17 agentes em 5 tiers

Cargos reais de cinema/publicidade/jornalismo, cada um com uma **mind reference**
(autoridade real cujo método o agente encarna). Padrão de arquivo: hybrid loader,
Level 0–6, mínimo 800 linhas, igual aos agentes Virals nativos.

### TIER 0 — Comando (2)

| id | Cargo | Mind reference | Escopo |
|---|---|---|---|
| `studio-chief` | Chief Creative Officer · Orquestrador | David Droga | Porta de entrada. Faz intake do pedido, roteia por gênero, convoca elenco, arbitra conflito criativo, tem poder de veto. Nunca executa peça. |
| `exec-producer` | Produtor Executivo & Line Producer | Kathleen Kennedy | Dono do job: cronograma, orçamento de créditos de IA, alocação humano×worker×agente, estado do pipeline, emissão de cards humanos, fan-in dos handoffs. |

### TIER 1 — Planejamento (5)

| id | Cargo | Mind reference | Escopo |
|---|---|---|---|
| `brief-strategist` | Planejamento Estratégico (Account Planning) | Jon Steel | Converte pedido bruto em brief formal: objetivo de negócio, avatar, insight humano, KPI, canal, restrição de marca. **Classifica o gênero** e carrega o brand-identity do cliente. |
| `research-scout` | Pesquisa, Benchmark & Referência | — (funcional) | Garimpa referência: comerciais de marca, criativos virais, concorrente, bolha do nicho. Roda o benchmark ETL existente. Entrega moodboard + dossiê de referência + o que NÃO copiar. |
| `creative-director` | Diretor de Criação | Washington Olivetto | Dono da big idea e do território criativo. Aprova ou mata rota antes de qualquer produção. Garante que o conceito é uma ideia, não um formato. |
| `head-of-copy` | Redator-chefe & Roteirista | — (funcional; referencia `@ladeira`, `@georgi`) | Script, VSL, roteiro de sketch, copy de ad, legenda, CTA. Dono da voz. |
| `showrunner` | Showrunner & Story Architect | Dan Harmon (Story Circle) | **Só para série/short film/sketch.** Bíblia de personagem, arco episódico, continuidade entre eps, sacadas e referências de bolha, gancho de próximo episódio. Referencia o `storytelling` squad. |

### TIER 2 — Direção (3)

| id | Cargo | Mind reference | Escopo |
|---|---|---|---|
| `film-director` | Diretor | Ridley Scott (rei do comercial: Apple 1984, Chanel) | Decupagem, storyboard, blocking, performance, ritmo, `edit_spec`. Traduz conceito em plano-a-plano. |
| `dop` | Diretor de Fotografia | Roger Deakins | Lente, luz, movimento de câmera, paleta, LUT, referência de grade. Traduz para **prompt de geração** E para **instrução de gravação real** (modo híbrido). |
| `art-director` | Diretor de Arte & Production Design | Nathan Crowley | Cenário, props, wardrobe, tipografia, identidade visual da peça. Guardião da coerência com o `brand-config` do cliente. |

### TIER 3 — Execução (5)

| id | Cargo | Mind reference | Escopo |
|---|---|---|---|
| `image-lead` | Diretor de Imagem Generativa | — (funcional; referencia `@casey-neistat-img`) | **Frente de primeira classe.** Key art, thumbnail, imagem publicitária de produto, capa de episódio, still, carrossel. **Não gera a imagem** (ver 3.1): entrega o Pacote de Direção — ferramenta, prompt, técnica, parâmetros, armadilhas do modelo, critério de aceite. Depois avalia o que o humano devolveu e dirige o retake. Atende os outros pipelines E vende isolado. |
| `motion-lead` | Diretor de Motion & Image-to-Video | — (funcional; referencia `@sam-kolder-vid`) | Take, I2V, câmera virtual, motion graphics, VFX leve. **Não gera o vídeo** (ver 3.1): entrega o Pacote de Direção por take e as composições de After Effects a construir. Avalia e dirige retake. |
| `editor` | Editor & Finalização | Walter Murch | Decisão de corte, ritmo, legenda, versões por canal. Entrega **especificação de montagem executável** para o app próprio (autolegenda) → **After Effects** (motion/composição) → **Premiere** (corte final, mix, master). Não renderiza; dirige quem monta. |
| `sound-designer` | Sound Design, Trilha & Voz | Ben Burtt | SFX, trilha, ducking, VO, casting de voz, lip-sync. Dirige a geração de voz (humano gera), especifica a mixagem para o Premiere. |
| `character-lead` | Character Design & Casting | — (funcional) | Reference sheets, consistência de personagem entre takes e entre episódios, wardrobe contínuo, identidade do creator sintético (UGC). Crítico para série e UGC. |

### TIER 4 — Qualidade (2)

| id | Cargo | Mind reference | Escopo |
|---|---|---|---|
| `fact-checker` | Checagem, Compliance & Direitos | Modelo de ombudsman jornalístico | **Poder de bloqueio.** Fidelidade factual de todo claim, compliance de marca, direitos de imagem/voz/marca de terceiro, léxico proibido, e a regra "sem case fabricado". |
| `qa-critic` | Crítico de Peça & Quality Gate | — (funcional) | Roda o checklist do gênero, dá veredito PASS / CONCERNS / FAIL / WAIVED antes da entrega. Escreve o que falta, não opinião vaga. |

---

## 5. Catálogo de gêneros e pipelines

### Implementados no MVP (6)

| # | Pipeline ID | Gênero | Objetivo | Elenco convocado |
|---|---|---|---|---|
| P1 | `brand-film` | Campanha / comercial de produto (padrão Natura, O Boticário, Havaianas, Nike, Apple) | Branding e desejo. Peça-vitrine. | chief, exec-producer, brief-strategist, research-scout, creative-director, head-of-copy, film-director, dop, art-director, image-lead, motion-lead, editor, sound-designer, fact-checker, qa-critic |
| P2 | `ugc-ads` | UGC / creator AI para conversão (Meta/TikTok Ads) | Conversão. Alto volume, ciclo curto. | chief, exec-producer, brief-strategist, research-scout, head-of-copy, character-lead, image-lead, motion-lead, editor, sound-designer, fact-checker, qa-critic |
| P3 | `nicho-series` | Short film / minissérie / sketch / sátira com personagens de bolha | Retenção e crescimento de página; funil para Oraclum. | chief, exec-producer, brief-strategist, research-scout, showrunner, head-of-copy, film-director, art-director, character-lead, image-lead, motion-lead, editor, sound-designer, fact-checker, qa-critic |
| P4 | `oraclum-institucional` | Institucional cinemático dor→solução | Autoridade e venda de serviço da própria Oraclum. | chief, brief-strategist, creative-director, head-of-copy, film-director, dop, image-lead, motion-lead, editor, sound-designer, fact-checker, qa-critic |
| P5 | `dark-room` | Canal dark (YouTube long/short, TikTok, IG) sem rosto | Escala e monetização de canal sem exposição pessoal. VO + b-roll IA + motion. | chief, exec-producer, research-scout, head-of-copy, image-lead, motion-lead, editor, sound-designer, fact-checker, qa-critic |
| P6 | `image-lab` | Imagem pura — thumb, publicitária de produto, key art, capa de episódio, carrossel | Serviço comercializável isolado + suporte transversal aos P1–P5. | chief, brief-strategist, research-scout, art-director, image-lead, character-lead, fact-checker, qa-critic |

**P6 é transversal:** qualquer pipeline pode chamar `image-lab` como sub-rotina
(ex.: P3 precisa da capa do episódio; P5 precisa da thumb do vídeo dark).

### Catalogados, não implementados (backlog de gênero)

Registrar em `data/genre-catalog.yaml` com `status: backlog` e o delta em relação ao
pipeline mais próximo — para que a implementação futura seja um diff, não um projeto novo:
`vsl-longa`, `lancamento-produto`, `tiktok-shop`, `delivery-food`, `expert-lancador`,
`branding-institucional-cliente`, `podcast-to-reel`, `motion-explainer`, `documentario-marca`,
`trailer-produto`, `case-study-video` (só quando houver case real).

---

## 6. Estrutura de arquivos a produzir

```
squads/oraclumtech-ai-creative-studio/
├── squad.yaml                       # metadados, elenco, workspace_integration
├── README.md                        # o que é, como ativar, os 6 pipelines
├── ARCHITECTURE.md                  # tiers, fluxo, modelo híbrido, decisões
├── CHANGELOG.md
├── _BLUEPRINT.md                    # este arquivo
├── agents/                          # 17 agentes (hybrid loader, Level 0-6, 800+ linhas)
├── tasks/                           # 1+ task por estágio nomeado dos pipelines
├── workflows/                       # 6 workflows (wf-<pipeline-id>.yaml)
├── checklists/                      # 1 quality gate por pipeline + gates transversais
├── templates/                       # brief, bíblia de personagem, storyboard, shotlist,
│                                    # card de tarefa humana, dossiê de referência
├── data/
│   ├── genre-catalog.yaml           # todos os gêneros, MVP + backlog
│   ├── pipeline-profiles.yaml       # estágios/elenco/gates/executor por pipeline
│   ├── handoff-matrix.yaml          # contrato de cada handon/handoff
│   ├── model-routing.yaml           # rota de modelo por tipo de asset (imagem/vídeo/voz)
│   └── craft-references.yaml        # referências de ofício por gênero
└── docs/
    └── PIPELINES.md                 # o passo-a-passo operacional de cada pipeline
```

---

## 7. Ativos existentes a REUSAR (não reescrever)

Estratégia aprovada: **híbrido — clonar vídeo/imagem, referenciar o resto.**

### Motor técnico já pronto (chamar, não recriar)
| Ativo | Path | Uso |
|---|---|---|
| Plano de criativo de vídeo | `squads/virals-marketing-squad/scripts/plan_video_creative.py` | Gera storyboard/roteiro/edit_spec/shotlist/sound_design |
| Visão sobre frames | `.../vision_video_benchmark.py` | Análise visual do benchmark |
| Quality gate de vídeo | `.../quality_gate_video.py` | V1–V7 (hook, retenção, fidelidade, voz, shotlist, CTA) |
| Registry de templates | `.../video_templates.py` + `data/clients/oraclum/video-templates.yaml` | Packs de hook, legenda, transição, motion |
| Fidelidade factual | `.../test_fact_fidelity.py`, `copy_guardrails.py` | Base do `fact-checker` |
| ~~Export DaVinci~~ | ~~`.../export_to_davinci.py`~~ | **LEGADO — não usar.** Ver seção 3.3: a finalização é app próprio → After Effects → Premiere |
| Pipeline de farming (6 fases) | `squads/virals-farming-squad/scripts/farm-*.js` | **Referência de arquitetura #1** — scout→benchmark→model→images→takes→assemble já funciona ponta a ponta |
| video-studio (Remotion) | app de edição | Montagem e export |

### Agentes a CLONAR e adaptar (viram cargo de cinema com voz própria)
`sam-kolder-vid` → base de `motion-lead` · `casey-neistat-img` → base de `image-lead`
`farming-modeler` → base de `film-director` (decupagem) · `farming-producer` → base de `editor`

### Agentes a REFERENCIAR cross-squad (handoff, sem duplicar)
`@ladeira` e `@georgi` (copy/VSL) · `@mrbeast-mk` (retenção/hook) · `@garyvee-mk` (social)
· `@perry-marshall` / `@ezra-firestone` (ads) · squad `storytelling` (Harmon, Snyder,
Campbell, Coyne) · squad `copy-squad` · squad `brand-squad` · squad `traffic-masters`

---

## 8. Padrão de qualidade obrigatório

- Agentes: hybrid loader, Level 0–6, ≥800 linhas, comandos com `visibility: [full, quick, key]`,
  `*help` e `*guide` em todos, greeting nativo com badge de permissão e signature.
- Tasks: Task Anatomy completa (task_name, status, responsible_executor, input, output,
  action_items, gate).
- Workflows: YAML com estágios, `executor`, `handon`, `handoff`, `gate`, `fallback`.
- Toda peça passa por `fact-checker` (bloqueante) e `qa-critic` (veredito) antes de entrega.
- Idioma: **português do Brasil**, com acentuação correta. Termos técnicos em inglês
  quando for o uso corrente do mercado (hook, b-roll, key art, lower-third).
- Escrita: proibido texto genérico de IA. Cada agente precisa saber DIZER NÃO e ter
  critério de veto explícito.
