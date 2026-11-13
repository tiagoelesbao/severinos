---
task_name: open-job
status: ready
responsible_executor: studio-chief
execution_type: agent
tipo: orquestracao
squad: oraclumtech-ai-creative-studio
pattern: OCS-TP-001
aplica_a: [P1, P2, P3, P4, P5, P6]
input: |
  - pedido bruto já classificado por tasks/classify-genre.md (gênero + pipeline_ref)
  - cliente resolvido (slug) e canal de destino
  - data/pipeline-profiles.yaml — a lista ORDENADA de estágios do pipeline escolhido
  - data/genre-catalog.yaml — o gênero precisa existir com status active
  - brand-identity.yaml e brand-config.yaml do cliente
  - modo: autonomo | embutido (embutido só em P6, com --parent e _request.yaml)
output: |
  - {job}/job.json                     manifesto de estado, fonte única de verdade
  - {job}/00-intake/ ... 16-delivery/  pastas dos estágios que o pipeline usa
  - {job}/_cards/                      cards de tarefa humana
  - {job}/_degraded.md                 registro narrativo de degradação (nasce vazio)
  - {job}/01-brief/brand-lock.yaml     snapshot da identidade (ADR-004)
gate: checklists/gate-intake.md
failure_modes: |
  - Gênero inexistente ou em backlog no genre-catalog
  - Cliente sem brand-identity — job aberto sem marca-guia
  - P5 sem channel-brief.yaml do canal
  - P3 pedido como episódio para série sem registro
  - job.json com stages[] incompleto (só os estágios já rodados)
  - Colisão de job-id
acceptance_criteria: |
  - job.json existe e valida contra o schema de data/handoff-matrix.yaml
  - TODO estágio do pipeline_ref aparece em stages[], inclusive os não iniciados
  - brand-lock.yaml é snapshot copiado, nunca ponteiro
  - Nenhuma pasta de estágio que o pipeline não usa foi criada
  - job.json → status == open e stage_atual == intake
---

# open-job — Abertura de job

Cria o esqueleto físico e o manifesto de estado de um job. É a única task autorizada a
escrever `job.json` pela primeira vez. Depois dela, quem atualiza o manifesto é o
`exec-producer` (ou o `studio-chief` em P4 e P6, que não convocam exec-producer).

## Comando

```text
@studio-chief
*open-job --genero={id} --cliente={slug} --canal={destino}
*open-job --genero=image-lab --mode=embutido --parent={job-pai} --request={path}
```

## O manifesto é a fonte de verdade, não a pasta

A pasta diz o que existe. O `job.json` diz o que **deveria** existir e em que estado
está. Os dois divergem o tempo todo — é justamente essa divergência que
`tasks/job-status.md` detecta. Por isso `stages[]` nasce **completo**, com todos os
estágios do pipeline em `pending`: um estágio que não aparece no manifesto é um estágio
que ninguém vai cobrar.

## Action Items

1. **Validar o gênero.** Ler `data/genre-catalog.yaml`. Gênero ausente ou com
   `status: backlog` → NÃO abre job. Devolve com o delta para o gênero MVP mais próximo.
2. **Resolver o pipeline.** `pipeline_ref` (P1..P6) vem do gênero. Ler
   `data/pipeline-profiles.yaml` e extrair a lista ORDENADA de estágios daquele perfil.
3. **Checar pré-requisitos do pipeline:**
   - **P5** — `canais/{canal}/channel-brief.yaml` precisa existir. Sem ele, o job é
     CONVERTIDO em job de fundação de canal (ADR-007).
   - **P3** — se o pedido é de episódio, `series/{serie-id}/series.yaml` precisa existir
     com temporada vigente. Se não existe, o job é RECLASSIFICADO como piloto.
   - **P6 embutido** — `--parent` e `_request.yaml` obrigatórios; não cria job próprio
     em `jobs/`, trabalha dentro de `{job-pai}/11-stills/subrotina-{asset}/`.
4. **Gerar o `job_id`** no formato `{YYYY-MM-DD}-{genero}-{cliente}-{hash6}`. Se já
   existir pasta com esse id, incrementar o hash — nunca reusar diretório.
5. **Criar as pastas** apenas dos estágios que o pipeline usa, na numeração canônica de
   `_CONVENTIONS.md` §1. Sempre criar `_cards/`. Nunca criar pasta de estágio ausente.
6. **Tirar o snapshot de marca (ADR-004).** Copiar o conteúdo de `brand-identity.yaml`
   e `brand-config.yaml` do cliente para `{job}/01-brief/brand-lock.yaml`. É **cópia**,
   não referência: o job precisa continuar reproduzível depois que a marca mudar.
7. **Escrever `job.json`** com `stages[]` completo (todos em `pending`), `waivers: []`,
   `degraded: []`, `human_cards: []`, `status: open`, `stage_atual: intake`.
8. **Criar `_degraded.md` vazio** com o cabeçalho. O arquivo existir desde o início
   evita que a primeira degradação seja registrada em lugar nenhum.
9. **Rodar `checklists/gate-intake.md`.**

## Numeração de pastas (canônica)

| Estágio | Pasta | Estágio | Pasta |
|---|---|---|---|
| intake | `00-intake/` | design | `08-design/` |
| brief | `01-brief/` | character | `09-character/` |
| research | `02-research/` | *(reservado)* | `10-` |
| concept | `03-concept/` | stills | `11-stills/` |
| story | `04-story/` | takes | `12-takes/` |
| script | `05-script/` | audio | `13-audio/` |
| decupagem | `06-decupagem/` | assembly | `14-assembly/` |
| look | `07-look/` | factcheck + gate | `15-gate/` |
| | | delivery | `16-delivery/` |

A numeração é **estável entre pipelines**. P2 não tem `concept`, mas `script` continua
sendo `05-` — para o operador humano não se perder ao trocar de gênero.

## Variações por pipeline

| Pipeline | O que muda na abertura |
|---|---|
| **P1 brand-film** | Abertura completa. 15 estágios em `stages[]`. `exec-producer` assume o job logo após o intake. |
| **P2 ugc-ads** | Sem `concept`, `decupagem`, `look`, `design`, `story`. `job.json` ganha `lote: {hooks: N}` — o manifesto precisa saber que a unidade é lote, não peça. |
| **P3 nicho-series** | Resolve `job_type` (piloto vs episódio) e adquire `series/{serie-id}/.lock`. `job.json` ganha `serie: {id, temporada, episodio, job_type}`. Piloto cria o registro da série; episódio só o lê. |
| **P4 oraclum-institucional** | Sem `research` e sem `exec-producer` (ADR-006). Cria `02-research/` mesmo assim, porque o brief grava o `dossie-herdado.md` ali. `job_owner: studio-chief`. |
| **P5 dark-room** | Sem `brief` (ADR-007). Cria `01-brief/` mesmo assim para o `brand-lock.yaml` — o snapshot é obrigatório em todo job. Valida `channel-brief.yaml`. `job.json` ganha `canal: {slug}`. |
| **P6 image-lab** | Dois modos. **Autônomo:** abertura normal, sem `12-takes/`, `13-audio/`, `14-assembly/`. **Embutido:** não cria job em `jobs/`; escreve `job.json` dentro de `subrotina-{asset}/`, com `mode: embutido`, `parent_job` e `asset_id`, e sem `16-delivery/`. |

## Gate

`checklists/gate-intake.md` — e mais estas travas próprias da abertura:

- [ ] O gênero existe em `genre-catalog.yaml` com `status: active`
- [ ] `pipeline_ref` bate com o gênero
- [ ] `stages[]` tem exatamente os estágios do perfil, na ordem, todos `pending`
- [ ] `brand-lock.yaml` é conteúdo copiado, não caminho
- [ ] Nenhuma pasta de estágio ausente do pipeline foi criada
- [ ] Pré-requisito do pipeline satisfeito (channel-brief em P5, registro de série em P3)
- [ ] `_degraded.md` existe

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Gênero em `backlog` | Não abre. Mostrar o gênero MVP mais próximo e o delta declarado no catálogo. O founder decide entre adaptar o pedido e promover o gênero. |
| Cliente sem `brand-identity.yaml` | BLOQUEIA. Sem marca-guia não existe peça de marca — e o `brand-lock` ficaria vazio, quebrando a reprodutibilidade do ADR-004. |
| P5 sem `channel-brief.yaml` | Converte em job de fundação de canal. Não é erro: é o job certo, com o escopo certo. |
| P3 episódio sem registro de série | Reclassifica como piloto e avisa. Episódio sem bíblia produz personagem diferente a cada semana. |
| `stages[]` incompleto | O job "termina" sem nunca ter rodado metade dos estágios, porque ninguém sabia que eles existiam. Sempre gravar a lista inteira. |
| Colisão de `job_id` | Incrementar o hash. Nunca reaproveitar diretório: o job antigo perde o rastro. |
| P6 embutido chamando P6 embutido | Recursão PROIBIDA. Abortar e reportar ao pai. |

## Handoff

`{job}/job.json` + `{job}/00-intake/pedido.md` → **brief** (ou **design**, em P6 embutido).
