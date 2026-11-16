# Changelog — Oraclum Tech · AI Creative Studio

Todas as mudanças relevantes deste squad. Formato baseado em
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento semântico.

---

## [1.1.0] — 2026-08-29

Reconciliação do squad com a realidade operacional: o estúdio foi desenhado quando toda
geração era serviço em nuvem, e desde 2026-08-28 existe um **stack local em ComfyUI** na
máquina do founder. Nenhuma rota de nuvem foi removida — elas continuam válidas e, em
exploração criativa, continuam sendo a primeira escolha.

**A regra de ouro (`_BLUEPRINT.md` §3.1) não foi tocada.** `stills`, `takes` e a geração de
voz dentro de `audio` continuam `executor: human`. O ComfyUI **não** entra no
`worker_registry`: ele é uma ferramenta que o operador opera, só que na mesa dele.

### Adicionado

- **`docs/COMO-TRABALHAMOS-HOJE.md`** — documento de situação real: a cadeia de produção
  ponta a ponta por tipo de asset, o critério local × nuvem, o hardware e o que ele impõe,
  as cinco decisões travadas, e a tabela de estado honesto (instalado × validado).
- **`data/genre-catalog.yaml` → `novela-recap`** (backlog, `identificador_reservado: P7`).
  Fecha a divergência registrada em `APRENDIZADOS-CURSOS.md`: o "P7 novela-recap" era
  referenciado pelo `local-generation-stack.yaml` e pelo `NARRACAO-LOCAL.md` e não existia
  no catálogo. Roda como `P5 + delta` até ganhar profile próprio.
- **`data/model-routing.yaml` → `criterio_local_vs_nuvem`** e um bloco `local:` em cada uma
  das 9 rotas de asset.
- **`rota_local_comfyui`** nos agentes `image-lead`, `motion-lead`, `sound-designer` e
  `editor`; **`executor_matrix.comfyui_nao_e_worker`** no `exec-producer`.
- **`_state/fila-render.yaml`** como artefato de estado novo do `exec-producer` — a noite
  é recurso compartilhado *entre jobs*, então a fila não cabe no orçamento de nenhum deles.

### Alterado

- **`exec-producer.budget_model` reescrito.** Contava crédito de API; o recurso escasso
  deste estúdio é **disco e noite de máquina**. Passa a orçar em três moedas paralelas
  (GB · noites · crédito de nuvem), sem taxa de câmbio entre elas: o job estoura se
  qualquer uma estourar. `*budget` e os `cost_drivers` atualizados; novo
  `alert_thresholds_de_disco`, que é do **estúdio** e não do job.
- **`docs/PIPELINES.md`** ganhou notas de atualização nas paradas 2, 3 e 4 apontando as
  rotas locais. A afirmação "não existe gerador de voz validado no repositório" foi marcada
  como superada.
- **`sound-designer.tooling.a_validar`** — o item que declarava a inexistência de motor de
  TTS foi marcado como superado, com o texto original preservado.

### Corrigido

- **`agents/motion-lead.md`: bloco YAML não parseava.** Quatro escalares com `\'` em vez de
  `''` (`marca d'água`) e dois casos de item de lista misturado com chave de mapa no mesmo
  nível de indentação (`nota:` depois de sequência). Corrigido; o bloco agora carrega.

### Pendente (relatado, não corrigido)

- Blocos YAML que ainda não parseiam em `agents/dop.md`, `agents/showrunner.md` e
  `agents/studio-chief.md`.
- `gate-stills.md` e `gate-takes.md` testam contra `job.json.orcamento_creditos`, que é
  moeda única de crédito.
- `gate-audio.md` **AU-A-07** (bloqueante non-waivable) exige origem de voz como
  "biblioteca licenciada ou titular com autorização" — a voz canônica do canal não é
  nenhuma das duas.
- Divergências internas do `data/local-generation-stack.yaml` (disco 31 × 36 GB; lacuna 1
  não marcada como fechada; `workflows.lista` com 3 dos 6 grafos).

---

## [1.0.1] — 2026-08-22

Normalização de nomenclatura contra `_CONVENTIONS.md` (normativo) e correção de duas
incoerências encontradas em auditoria cruzada entre `pipeline-profiles.yaml`,
`handoff-matrix.yaml` e `genre-catalog.yaml`.

### Alterado — nomenclatura

- **Pastas de estágio renumeradas** para o esquema canônico: `stills` 10→**11**,
  `takes` 11→**12**, `audio` 12→**13**, `assembly` 13→**14**. O `factcheck` deixou de ter
  pasta própria e passou a gravar em **`15-gate/`** (factcheck e veredito são a dupla de
  qualidade). O slot **10 fica reservado** — a numeração é estável entre pipelines para o
  operador humano não se perder ao trocar de gênero.
- **Cards de tarefa humana** movidos de `{job}/{NN}-{stage}/cards/` para **`{job}/_cards/`**.
- **Pacote de Direção** passou de arquivo único por estágio para **um arquivo por asset**
  em `{job}/11-stills/_direction/{asset-id}.yaml` e `{job}/12-takes/_direction/{asset-id}.yaml`.
- **Checklists de pipeline** renomeados de `qa-<pipeline-id>.md` para
  **`gate-<pipeline-id>.md`** (prefixo `gate-` único para as duas famílias).
- Chave `job_root:` renomeada para `raiz:` nos arquivos de dados, eliminando qualquer
  colisão com o placeholder canônico `{job}`.
- Documentada em `pipeline-profiles.yaml` a convenção das duas famílias de checklist,
  incluindo a exceção de nome do estágio `gate` (usa `gate-qa.md`, não `gate-gate.md`) e
  os três checklists que rodam nesse estágio.

Confirmado sem alteração necessária: `job.json`, placeholder `{job}`,
`{job}/15-gate/gate-verdict.md` e as menções a `export_to_davinci.py` (todas em contexto
de legado, no bloco `legacy` do `squad.yaml`).

### Corrigido — achado 1: violação de elenco no P3

O estágio `concept` do `nicho-series` estava atribuído ao `creative-director`, que **não
faz parte do elenco do P3** declarado no blueprint §5 — um estágio cujo dono não estava
convocado para o próprio pipeline. Corrigido reatribuindo o `concept` do P3 ao
**`showrunner`**, sem tocar no elenco do blueprint. Registrado em **ADR-010** e no campo
`excecao_de_owner` do próprio estágio, para não virar precedente silencioso.

### Corrigido — achado 2: artefatos órfãos

17 artefatos citados em `pipeline-profiles.yaml` não tinham contrapartida na
`handoff-matrix.yaml`. Adicionada a seção **`artefatos_secundarios`** (17 entradas), com
dono, formato, campos obrigatórios, critério de aceite e validador para cada um —
incluindo `fontes.json` (P5), que é o insumo direto do `claim-ledger.json` e sem o qual o
`factcheck` do dark-room não tem contra o que checar. Também corrigido o artefato
`'{job}/job.json (status: delivered)'`, que misturava path e estado.

### Verificação de coerência (resultado final)

| Checagem | Resultado |
|---|---|
| stage-ids dentro da lista canônica de 17 e em ordem | OK |
| matriz de cobertura × estágios reais | OK |
| owners de estágio × elenco de cada gênero | OK |
| artefatos citados × contratos na handoff-matrix | OK |
| owners × elenco do `squad.yaml` | OK |
| `genre-catalog` × `pipeline-profiles` (pipeline_ref) | OK |
| checklists referenciados × existentes em disco | 2 pendentes |

### Pendências de outras frentes (não são deste escopo)

- `checklists/`: faltam `gate-delivery.md` e `gate-oraclum-institucional.md` — ambos
  referenciados por `pipeline-profiles.yaml` e pelos workflows. Falta também
  `gate-qa.md`, previsto no `_CONVENTIONS.md` §2.1 e ainda não referenciado por ninguém.
- `agents/`: faltam `showrunner.md`, `character-lead.md` e `sound-designer.md` — os três
  são owners de estágio em pipelines já especificados.
- `_CONVENTIONS.md` §1 não lista a pasta `00-intake/`, embora `intake` seja estágio
  canônico presente nos 6 pipelines. Mantida `00-intake/` (não colide com nenhum slot
  numerado); vale ratificar no documento normativo.

---

## [1.0.0] — 2026-08-21

Criação da fundação do squad. Esta entrega cobre **metadados, catálogo, contratos e
documentação**. Agentes, tasks, workflows, checklists e templates são produzidos em
frentes seguintes.

### Adicionado

**Metadados e configuração**
- `squad.yaml` — elenco de 17 agentes em 5 tiers, `workspace_integration` (leitura da
  identidade de marca e do motor técnico dos squads de marketing e farming; escrita
  isolada em `workspaces/businesses/oraclum/creative-studio/`), `task_standards` com
  `enforce_anatomy: true`, pattern library `OCS`, matriz de executores, layout de job,
  os 17 estágios canônicos, contrato de reuso e restrições não-negociáveis.

**Catálogo e contratos**
- `data/genre-catalog.yaml` — 6 gêneros MVP (`status: active`) e 11 de backlog
  (`status: backlog`), cada um do backlog declarado como **diff** (`delta_from` +
  `o_que_muda`) de um pipeline existente, para que a implementação futura seja uma
  edição e não um projeto novo.
- `data/pipeline-profiles.yaml` — os 6 pipelines com estágios ordenados a partir dos ids
  canônicos, e por estágio: `owner_agent`, `executor`, `handon`, `handoff` (com gate) e
  `fallback`. Inclui matriz de cobertura estágio × pipeline.
- `data/handoff-matrix.yaml` — contrato de cada artefato: campos obrigatórios, formato,
  critério de aceite e quem valida. Define o **Pacote de Direção** (`asset_direction`)
  como artefato canônico dos handoffs de `stills`, `takes` e da parte de voz de `audio`.
- `data/model-routing.yaml` — matriz de **recomendação para operador humano** por tipo de
  asset (still, publicitária de produto, character sheet, thumbnail, take I2V, take T2V,
  voz, música, upscale), com ferramenta preferida, alternativa e critério de troca,
  técnica, armadilhas do modelo e custo relativo. Toda linha tem evidência no repositório
  ou marca `status: a_validar`.
- `data/craft-references.yaml` — o **código de ofício** por gênero: o que faz a peça
  funcionar, não uma lista de nomes. Cobre cosmético, lifestyle pop, esporte, tech/SaaS,
  gramática de sketch e microdrama, canal sem rosto, institucional dor→solução e imagem
  publicitária, mais códigos transversais e checklists de gate.

**Documentação**
- `README.md` — o estúdio, os 6 pipelines, elenco por tier, ativação, exemplos de
  invocação, cadeia de finalização e anatomia de um job.
- `ARCHITECTURE.md` — tiers, fluxo ponta a ponta, modelo híbrido humano×worker×agente,
  9 ADRs, mapa de reuso e riscos conhecidos.
- `docs/PIPELINES.md` — operação de cada pipeline em prosa, com os **pontos de parada
  humana como protagonistas**: onde o founder recebe card, o que faz e onde devolve.
- `CHANGELOG.md` — este arquivo.

### Decisões arquiteturais registradas

| ADR | Decisão |
|---|---|
| **001** | **A geração de asset é humana.** `stills` e `takes` são `executor: human` em todos os pipelines; a geração de voz também. O squad dirige a geração e entrega o Pacote de Direção — nunca o arquivo. |
| **002** | **Cadeia de finalização:** `apps/video-studio` (Remotion, autolegenda e FX on-brand) → **After Effects** (motion, composição, VFX) → **Premiere Pro** (corte, mix, master). Para imagem, `apps/creative-design`. O `assembly` entrega especificação executável, não render. |
| **003** | Fidelidade antecipada: `claim-ledger.json` no `script`; `factcheck` terminal e bloqueante, sem waiver. |
| **004** | `brand-lock.yaml` é snapshot da identidade, não ponteiro — o job precisa ser reproduzível. |
| **005** | P4 sem `exec-producer` e sem `research-scout`; `studio-chief` absorve intake e delivery. |
| **006** | P5 sem `brief`: pré-requisito persistente `channel-brief.yaml`, por canal. |
| **007** | P6 transversal, com modo embutido nos demais pipelines. |
| **008** | Reuso por leitura; escrita isolada no workspace da Oraclum (zero coupling). |
| **009** | Model routing é recomendação, não cascata — consequência direta do ADR-001. |

### Removido do fluxo

- **DaVinci Resolve.** `squads/virals-marketing-squad/scripts/export_to_davinci.py` fica
  marcado como legado no bloco `legacy` do `squad.yaml`. Nenhum agente, task ou workflow
  deste squad o chama.

### Inconsistências registradas (não resolvidas aqui)

- `clients/oraclum/video-templates.yaml` declara a paleta antiga (Obsidian `#0F0C20` +
  Cyan `#00F0FF`), divergindo do `brand-config.yaml` v2.0, que registra que o site real
  **não usa cyan** — a paleta correta é `#08080C` + purple `#A855F7`. Encaminhamento: o
  `assembly` do P4 dá precedência ao `brand-config`; a correção do registry pertence ao
  dono do `virals-marketing-squad`.
- Lacunas de elenco no blueprint §5 (P4 sem `exec-producer`; P5 sem `brief-strategist`;
  P6 sem dono de delivery) — resolvidas pelos ADRs 005, 006 e 007.
- Nenhum gerador de voz existe no monorepo (varredura por `edge-tts`, `elevenlabs`,
  `piper`, `gTTS`, `text-to-speech`: zero ocorrências). VO permanece gravação humana até
  prova em contrário.

### Pendente para as próximas frentes

- `agents/` — 17 agentes (hybrid loader, Level 0–6, ≥800 linhas)
- `tasks/` — 1+ task por par estágio × pipeline (ver matriz de cobertura)
- `workflows/` — `wf-P1` a `wf-P6`
- `checklists/` — gates transversais (`gate-*.md`) + 1 por gênero (`qa-*.md`)
- `templates/` — brief, bíblia de personagem, storyboard, shotlist, **card de tarefa
  humana**, **Pacote de Direção**, dossiê de referência
- Validar os itens `a_validar` de `model-routing.yaml`: T2V, síntese de voz, geração de
  música, upscaler de acabamento e ferramentas de consistência de personagem
