# CONVENÇÕES CANÔNICAS — oraclumtech-ai-creative-studio

> Anexo normativo do `_BLUEPRINT.md`. Resolve divergências de nomenclatura detectadas
> na auditoria de 2026-08-22. **Em caso de conflito, este documento vence.**
> Autor: @aiox-master (Orion) · Status: normativo

Motivo: cinco convenções concorrentes surgiram entre os agentes que escreveram
`data/`, `workflows/`, `agents/` e `checklists/` em paralelo. Abaixo, a forma
canônica de cada uma e o que fazer com as variantes.

---

## 1. Diretório e estado do job

**Raiz:** `workspaces/businesses/oraclum/creative-studio/jobs/{job-id}/`

**Placeholder canônico em YAML e docs:** `{job}`
- ❌ Não use `{job_root}`, `{jobdir}`, `{job_path}`. Normalize para `{job}`.

**Arquivo de estado:** `{job}/job.json`
- ❌ Não use `job-state.yaml`. O `job.json` já está especificado em
  `data/handoff-matrix.yaml` (schema, path, campos) e documentado no `ARCHITECTURE.md`.
- Ele é o ponteiro de estado: estágio atual, versão vigente de cada artefato,
  cards humanos abertos, vereditos de gate, histórico de waiver.

**Pastas de estágio — numeradas, na ordem canônica:**

```
{job}/
├── job.json
├── 01-brief/          06-decupagem/      11-stills/       16-delivery/
├── 02-research/       07-look/           12-takes/
├── 03-concept/        08-design/         13-audio/
├── 04-story/          09-character/      14-assembly/
├── 05-script/         10-(reservado)     15-gate/
└── _cards/            # cards de tarefa humana abertos e fechados
```

O `factcheck` grava em `15-gate/` junto com o veredito (são a dupla de qualidade).
Pipelines que não usam um estágio simplesmente não criam a pasta — a numeração
é estável entre pipelines para o operador humano não se perder.

---

## 2. Checklists — duas famílias, prefixo único `gate-`

### 2.1 Gate de ESTÁGIO — `checklists/gate-<stage-id>.md`
Um por estágio canônico. Roda ao fim do estágio, libera o próximo.
São **17**, usando exatamente os stage IDs canônicos:

`gate-intake.md` · `gate-brief.md` · `gate-research.md` · `gate-concept.md` ·
`gate-story.md` · `gate-script.md` · `gate-decupagem.md` · `gate-look.md` ·
`gate-design.md` · `gate-character.md` · `gate-stills.md` · `gate-takes.md` ·
`gate-audio.md` · `gate-assembly.md` · `gate-factcheck.md` · `gate-qa.md` ·
`gate-delivery.md`

### 2.2 Gate de PIPELINE — `checklists/gate-<pipeline-id>.md`
Um por gênero MVP. Roda no estágio `gate`, avalia a PEÇA INTEIRA contra o padrão
daquele gênero. São **7** (6 pipelines + 1 transversal):

`gate-brand-film.md` · `gate-ugc-ads.md` · `gate-nicho-series.md` ·
`gate-oraclum-institucional.md` · `gate-dark-room.md` · `gate-image-lab.md` ·
`gate-transversal-entrega.md`

### 2.3 Variantes a normalizar (substituir onde aparecerem)
| ❌ Variante encontrada | ✅ Forma canônica |
|---|---|
| `qa-brand-film.md`, `qa-ugc-ads.md`, `qa-nicho-series.md`, `qa-dark-room.md`, `qa-image-lab.md`, `qa-oraclum-institucional.md` | `gate-<pipeline-id>.md` |
| `gate-pipeline-brand-film.md`, `gate-pipeline-ugc-ads.md` | `gate-<pipeline-id>.md` |
| `gate-stills-aprovadas.md` | `gate-stills.md` |
| `gate-look-fechado.md` | `gate-look.md` |
| `gate-design-fechado.md` | `gate-design.md` |
| `gate-decupagem-fechada.md`, `gate-editspec-parseavel.md` | `gate-decupagem.md` |

Não há colisão entre as duas famílias: nenhum `pipeline-id` coincide com um `stage-id`.

---

## 2.4 Tasks — nome canônico e o que um agente pode declarar como dependência

**Não existe namespace de task por agente.** As tasks são nomeadas pelo ESTÁGIO que
executam, não pelo agente que as invoca. Um estágio tem uma task, mesmo que vários
comandos de vários agentes cheguem nela.

- ❌ `tasks/fd-decupagem.md`, `tasks/il-keyart.md`, `tasks/ml-i2v.md`, `tasks/sd-mix.md`,
  `tasks/ad-props.md`, `tasks/dop-lens.md`, `tasks/ed-cut.md`, `tasks/cl-sheet.md`
- ✅ `tasks/<stage-id>.md` — a lista fechada é a dos 17 stage IDs canônicos, mais as
  6 de orquestração (`open-job`, `classify-genre`, `assign-executors`, `emit-human-card`,
  `resume-job`, `job-status`).

Quando um agente tem vários comandos que caem no mesmo estágio (ex.: o `image-lead` com
`*keyart`, `*thumb`, `*packshot`, `*cover`), todos apontam para a MESMA task de estágio.
A variação entre eles é parâmetro, e vive na seção `## Variações por pipeline` da task —
não em arquivos separados.

**Regra dura para blocos `dependencies:`:** um agente só pode declarar dependência de
arquivo que EXISTE em disco. Dependência apontando para arquivo inexistente quebra o
agente em runtime, porque o loader tenta carregar e falha. Antes de declarar, verifique.

Mapa canônico agente → task de estágio:

| Agente | Task | Checklist |
|---|---|---|
| `film-director` | `tasks/decupagem.md` | `gate-decupagem.md` |
| `dop` | `tasks/look.md` | `gate-look.md` |
| `art-director` | `tasks/design.md` | `gate-design.md` |
| `character-lead` | `tasks/character.md` | `gate-character.md` |
| `image-lead` | `tasks/stills.md` | `gate-stills.md`, `gate-image-lab.md` |
| `motion-lead` | `tasks/takes.md` | `gate-takes.md` |
| `sound-designer` | `tasks/audio.md` | `gate-audio.md` |
| `editor` | `tasks/assembly.md` | `gate-assembly.md` |

---

## 3. Artefato de veredito do gate

**Canônico:** `{job}/15-gate/gate-verdict.md`
- ❌ Não use `gate-report.md`. Já está especificado em `data/handoff-matrix.yaml`
  e referenciado em `data/pipeline-profiles.yaml`.
- Conteúdo: veredito (PASS / CONCERNS / FAIL / WAIVED), item a item do checklist
  do gênero + do transversal, e — em FAIL — o estágio exato para onde volta e o
  que precisa mudar. Waiver exige justificativa e autor registrados.

---

## 4. Pacote de Direção

**Canônico:** `asset_direction` (schema em `_BLUEPRINT.md` §3.2).
Paths: `{job}/11-stills/_direction/{asset-id}.yaml` e
`{job}/12-takes/_direction/{asset-id}.yaml`.
O card humano correspondente vive em `{job}/_cards/`.

---

## 5. Finalização — cadeia canônica

`apps/video-studio` (Remotion: timeline auto-montada, autolegenda, FX on-brand,
`npm run studio` / `npm run render [slug]`) → **After Effects** (motion, composição,
VFX, lower-third) → **Premiere Pro** (corte final, mix, master, export por canal).

Para imagem/carrossel, o app equivalente é `apps/creative-design`.

`squads/virals-marketing-squad/scripts/export_to_davinci.py` é **legado**. Nenhum
agente, task ou workflow deste squad o chama.

---

## 6. Regra de ouro (relembrada, porque é a que mais se perde)

Os estágios `stills`, `takes` e a geração de voz dentro de `audio` são
`executor: human`, **sempre**, em todos os pipelines. Não existe variante
`agent` ou `worker` para eles. O agente dirige (Pacote de Direção), o humano gera,
o agente avalia e dirige o retake. Ver `_BLUEPRINT.md` §3.1.
