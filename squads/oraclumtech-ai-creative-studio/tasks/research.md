---
task_name: research
status: ready
responsible_executor: research-scout
execution_type: worker
tipo: estagio
stage_id: research
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-003
pipelines: [P1, P2, P3, P5, P6]
ausente_em: 'P4 — a pesquisa da Oraclum já é permanente no marketing squad (ADR-006)'
input: |
  - {job}/01-brief/brief.yaml — categoria, avatar, concorrentes
  - {job}/00-intake/pauta.md (P5)
  - registros acumulados: canais/{canal}/fontes-confiaveis.md, series/{serie-id}/lexico-da-bolha.md
  - data/craft-references.yaml — o código de ofício de cada gênero
output: |
  - {job}/02-research/dossie-referencia.md   (templates/reference-dossier-tmpl.md)
  - {job}/02-research/nao-copiar.md          o que NÃO reproduzir, e por quê
  - {job}/02-research/moodboard/             (P1, P6)
  - {job}/02-research/hooks-em-veiculacao.md (P2)
  - {job}/02-research/lexico-da-bolha.md     (P3)
  - {job}/02-research/fontes.json            (P5)
gate: checklists/gate-research.md
failure_modes: |
  - Confundir volume de ETL com curadoria
  - Entregar referência sem o "não copiar"
  - Marcar referência não-verificada como verificada
  - Em P5, aceitar fonte secundária como primária
  - Recoletar do zero o que já está acumulado no registro
acceptance_criteria: |
  - O dossiê separa o que se modela do que NÃO se copia
  - Referência não-verificada está marcada como tal
  - Em P5, toda entrada de fontes.json é rastreável e primária
  - O registro acumulado foi lido antes de coletar
---

# research — Benchmark, referência e o que não copiar

O `research-scout` roda o ETL existente e faz o que o ETL não faz: **curadoria**. O
entregável que justifica o estágio não é a pilha de referências — é o `nao-copiar.md`.

## Comando

```text
@research-scout
*research {job-id}
*moodboard {job-id}
*sources {job-id}     # P5: checagem de fonte primária
```

## O worker traz volume; o agente traz critério

```bash
node squads/virals-marketing-squad/scripts/run-creative-benchmark.js --date={date} --top={top} --platforms={platforms}
python squads/virals-marketing-squad/scripts/vision_video_benchmark.py {benchmark_dir}/video-brief.yaml --max-frames=8
```

`run-creative-benchmark.js` faz o ETL completo — download, transcrição com timestamps,
frames-chave. `vision_video_benchmark.py` escreve `visual_analysis` dentro do próprio
`video-brief.yaml`. Nenhum dos dois é reimplementado aqui.

O que **nenhum dos dois faz**: decidir o que serve, o que não serve, e o que serve como
contraexemplo. Isso é o estágio.

## O `nao-copiar.md` é o entregável de maior valor

Um dossiê que só diz "olha o que está funcionando" produz cópia. O que impede cópia é a
lista explícita do que **não** reproduzir:

- o que é assinatura de outra marca e não pode ser tomado
- o que funcionou por contexto irrepetível (evento, timing, pessoa)
- o que viola o `brand-lock` do cliente
- o que já foi usado por este canal ou série (canibaliza o próprio catálogo)

## Modelagem ≠ cópia

| Modelagem | Cópia |
|---|---|
| Mesma estrutura de beats | Mesma fala palavra por palavra |
| Mesmo enquadramento e luz | Mesma cena e mesmo sujeito |
| Mesmo ritmo de corte | Mesmo arquivo reencodado |
| Mesmo gatilho emocional | Mesma pessoa em cena |

## Action Items

1. **Ler o registro acumulado** antes de coletar — `fontes-confiaveis.md`,
   `lexico-da-bolha.md`. O que já foi validado não se revalida do zero.
2. **Definir os alvos** de garimpo a partir do brief.
3. **Rodar o ETL** e a análise visual.
4. **Curar**: separar o que se modela do que se descarta.
5. **Escrever o `dossie-referencia.md`** (`templates/reference-dossier-tmpl.md`), marcando
   cada referência como verificada ou **não-verificada**.
6. **Escrever o `nao-copiar.md`** com o motivo de cada exclusão.
7. **Produzir o artefato específico do pipeline** (moodboard, hooks, léxico, fontes).
8. **Rodar `checklists/gate-research.md`.**

## Variações por pipeline

| Pipeline | O que o research entrega |
|---|---|
| **P1 brand-film** | Moodboard e dossiê de comercial de marca. A referência é padrão de acabamento, não criativo de performance. Captura bloqueada → curadoria manual do material já em disco, com o que faltou em `degraded[]`. |
| **P2 ugc-ads** | `hooks-em-veiculacao.md` — hooks concorrentes **em veiculação**, não comerciais de marca. Sem acesso a biblioteca de anúncios → usar o código de `ugc-ads` em `data/craft-references.yaml`, marcado como **não-verificado**. |
| **P3 nicho-series** | `lexico-da-bolha.md`. O que importa não é o criativo: é o **jargão**. O léxico **acumula** entre episódios (vem de `series/{serie-id}/`), não recomeça. Captura bloqueada → montar o léxico de comentários já coletados e marcar a amostra como parcial. |
| **P4 oraclum-institucional** | **Estágio ausente (ADR-006).** A pesquisa da Oraclum já roda diariamente no marketing squad; o `brief` herda e grava `02-research/dossie-herdado.md`. |
| **P5 dark-room** | `fontes.json` é o insumo **direto** do claim-ledger: em dark room a pesquisa É a matéria-prima do roteiro. Fonte primária indisponível → **trocar o ângulo** por outro coberto por fonte disponível. O canal vive de credibilidade acumulada; um episódio errado derruba o canal inteiro. |
| **P6 image-lab** | Referência visual de categoria — o que a concorrência faz em capa e thumb. Sem referência → `craft-references.yaml § image-lab`, marcado como não-verificado. |

## Gate

`checklists/gate-research.md`, mais:

- [ ] `nao-copiar.md` existe, com motivo por exclusão
- [ ] Referência não-verificada marcada como tal
- [ ] Registro acumulado lido antes da coleta
- [ ] P5: toda entrada de `fontes.json` primária e rastreável
- [ ] Falha de captura registrada em `degraded[]`, não escondida

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Volume confundido com curadoria | 40 referências sem critério é ruído. Curar é o estágio. |
| Dossiê sem "não copiar" | Produz cópia, e o `factcheck` pega tarde — ou não pega. |
| Não-verificada apresentada como verificada | O `concept` constrói sobre areia. Marcar sempre. |
| Fonte secundária como primária (P5) | Um episódio errado derruba o canal. Trocar o ângulo é mais barato. |
| Recoletar o léxico do zero (P3) | Perde o acúmulo que faz a série ter voz. Ler o registro primeiro. |
| Captura falhou e o job seguiu calado | Registrar em `degraded[]`. Ranking vazio que parece "não tinha nada" é o modo de falha clássico. |

## Handoff

`{job}/02-research/` → **concept** (P1, P3), **script** (P2, P5) ou **design** (P6).
