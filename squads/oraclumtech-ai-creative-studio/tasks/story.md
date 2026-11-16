---
task_name: story
status: ready
responsible_executor: showrunner
execution_type: agent
tipo: estagio
stage_id: story
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-005
pipelines: [P3]
ausente_em: 'P1, P2, P4, P5, P6 — só existe onde há continuidade entre peças'
input: |
  - {job}/03-concept/territorio-criativo.md (piloto) ou series/{serie-id}/series.yaml (episódio)
  - series/{serie-id}/biblia.yaml e continuity-log.md (episódio)
  - {job}/02-research/lexico-da-bolha.md
output: |
  - {job}/04-story/biblia.yaml            elenco, tiques, regras do mundo, tabus
  - {job}/04-story/arco-temporada.md
  - {job}/04-story/arco-episodio.md
  - {job}/04-story/gancho-proximo-ep.md
  - {job}/04-story/canon-novo.md          o que ESTE episódio estabelece como permanente
gate: checklists/gate-story.md
failure_modes: |
  - Esticar a temporada em vez de reduzir o arco
  - Episódio que reescreve a bíblia sem declarar canon novo
  - canon-novo.md ausente — o write-back não tem o que promover
  - Gancho genérico que não puxa o próximo episódio
  - Personagem sem tique reconhecível
acceptance_criteria: |
  - Em piloto, a bíblia cobre elenco, tiques, regras do mundo e tabus
  - Em episódio, a bíblia é herdada e só canon-novo.md registra mudança
  - O arco fecha no número de episódios declarado
  - canon-novo.md existe, mesmo que vazio e declarado como vazio
---

# story — Bíblia, arco e continuidade

O `showrunner` (método Dan Harmon, Story Circle) existe apenas em **P3**, porque é o único
pipeline onde a peça é **capítulo**, não unidade. Ele é o guardião do que faz o episódio 7
se parecer com o episódio 1.

## Comando

```text
@showrunner
*bible {job-id}       # piloto: escreve a bíblia
*arc {job-id}         # arco da temporada e do episódio
*hook {job-id}        # gancho do próximo
*canon {job-id}       # o que este episódio estabelece
```

## Piloto escreve; episódio herda

| Tipo de job | O que o `story` faz |
|---|---|
| **piloto** | ESCREVE a bíblia do zero: elenco, tiques, regras do mundo, tabus, arco da temporada |
| **episódio** | HERDA `series/{serie-id}/biblia.yaml` e escreve **apenas** o arco do episódio e o gancho |

Em episódio, a bíblia só muda por **canon novo declarado**. Reescrever a bíblia em
silêncio é como a série perde coerência: cada episódio fica levemente diferente do
anterior, tudo dentro da tolerância, e no sexto o personagem é outro.

## `canon-novo.md` é o contrato com o registro

É o **único insumo do write-back** para `biblia.yaml` e `continuity-log.md`. Lista o que
este episódio estabelece como verdade permanente da série.

> Sem esse arquivo, o registro não é atualizado — **o silêncio não vira canon**.

Se o episódio não estabelece nada novo, o arquivo existe e diz isso. Vazio declarado é
informação; ausente é ambiguidade.

E a trava: **canon só entra no registro com gate PASS**. Promover canon de um episódio
reprovado contamina todos os seguintes.

## Reduzir a temporada, não esticar o conflito

Arco que não fecha em 6 episódios → **reduzir a temporada**. Temporada esticada perde
retenção no episódio 3, e uma série que perde retenção no 3 não chega ao 6. Esticar é a
tentação; reduzir é a decisão certa.

## Action Items

1. **Resolver o tipo de job** — `piloto` ou `episodio`, já registrado em `job.json`.
2. **Carregar a herança** quando for episódio: bíblia, `continuity-log.md`, sheets
   canônicos do registry de personagem.
3. **Piloto:** escrever a bíblia — elenco fixo, **tique reconhecível por personagem**,
   regras do mundo, tabus, e o arco da temporada com número de episódios declarado.
4. **Episódio:** escrever só o `arco-episodio.md`, dentro do arco da temporada.
5. **Escrever o `gancho-proximo-ep.md`** — específico, não "e agora?".
6. **Escrever o `canon-novo.md`**, mesmo que para declarar que não há canon novo.
7. **Conferir contra o `continuity-log.md`** que nada contradiz o já estabelecido.
8. **PARAR no checkpoint `cp-biblia`** (piloto).
9. **Rodar `checklists/gate-story.md`.**

## Variações por pipeline

| Pipeline | Situação |
|---|---|
| **P3 nicho-series** | **Único pipeline com este estágio.** Em piloto, é o estágio mais pesado do job e o checkpoint `cp-biblia` é bloqueante — depois dele a bíblia vira lei para a temporada inteira, e corrigir no episódio 4 custa a coerência dos três anteriores. Em episódio, é leve: herda tudo e escreve só o arco e o gancho. |
| **P1 brand-film** | Ausente. A peça é unidade; não há continuidade a preservar. |
| **P2 ugc-ads** | Ausente. O que persiste entre lotes é o **creator** (`character`), não a história. |
| **P4 oraclum-institucional** | Ausente. Peça única. |
| **P5 dark-room** | Ausente. O que persiste é o **canal** (`channel-brief.yaml`), não personagem nem arco. |
| **P6 image-lab** | Ausente. |

## Gate

`checklists/gate-story.md`, mais:

- [ ] Piloto: bíblia com elenco, tiques, regras do mundo e tabus
- [ ] Episódio: bíblia herdada, mudança só via `canon-novo.md`
- [ ] Arco fecha no número de episódios declarado
- [ ] `canon-novo.md` existe (vazio declarado conta)
- [ ] Nada contradiz o `continuity-log.md`
- [ ] Checkpoint `cp-biblia` cumprido em piloto

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Temporada esticada | Retenção cai no episódio 3. Reduzir o arco. |
| Bíblia reescrita em silêncio | A série perde coerência aos poucos. Toda mudança passa por `canon-novo.md`. |
| `canon-novo.md` ausente | O `delivery` não sabe o que promover e o registro fica desatualizado. Vazio declarado resolve. |
| Gancho genérico | "E agora?" não puxa ninguém. O gancho precisa de objeto: uma pergunta concreta. |
| Personagem sem tique | Não é reconhecível entre episódios, e o `character-lead` não tem o que travar. |
| Canon promovido de episódio reprovado | Contamina toda a temporada. Só com PASS. |

## Handoff

`{job}/04-story/biblia.yaml` + `arco-episodio.md` → **script**.
`canon-novo.md` → **gate** e **delivery** (write-back para `series/{serie-id}/`).
