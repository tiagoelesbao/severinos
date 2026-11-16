---
task_name: decupagem
status: ready
responsible_executor: film-director
execution_type: agent
tipo: estagio
stage_id: decupagem
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-007
pipelines: [P1, P3, P4]
ausente_em: 'P2 (fala-a-câmera) · P5 (o mapa-broll do script faz o papel) · P6 (sem timeline)'
input: |
  - {job}/05-script/roteiro.md
  - {job}/04-story/biblia.yaml (P3)
  - {job}/02-research/benchmark/**/video-brief.yaml — cadência real do benchmark
output: |
  - {job}/06-decupagem/storyboard.yaml   (templates/storyboard-tmpl.yaml)
  - {job}/06-decupagem/shotlist.md       (templates/shotlist-tmpl.yaml)
  - {job}/06-decupagem/edit-spec.json    ordem, duração e ritmo — parseável
gate: checklists/gate-decupagem.md
failure_modes: |
  - Aceitar a saída do plan_video_creative.py como veredito em vez de ponto de partida
  - edit-spec.json não parseável — quebra takes e assembly
  - Plano impossível de gerar mantido no storyboard
  - Storyboard sem asset_id — o stills não sabe o que gerar
  - Duração por plano ausente
acceptance_criteria: |
  - edit-spec.json parseável, com duração por plano
  - Todo plano que precisa de still tem asset_id
  - A shotlist diz o que gravar E a fala-chave de cada plano
  - Ritmo dentro da cadência do gênero
---

# decupagem — Do roteiro ao plano-a-plano

O `film-director` (método Ridley Scott, o rei do comercial) traduz conceito e roteiro em
**plano-a-plano**: enquadramento, blocking, ritmo e o `edit_spec` que governa `takes` e
`assembly`.

## Comando

```text
@film-director
*decoupage {job-id}
*shotlist {job-id}
*editspec {job-id}
```

## O worker é ponto de partida, não veredito

```bash
python squads/virals-marketing-squad/scripts/plan_video_creative.py {job}/05-script/video-brief.yaml --client={client}
```

Devolve, dentro do próprio `video-brief.yaml`: hook com 3 variantes, storyboard por
batida, shotlist com o que gravar e a fala-chave, `sound_design` e `fidelity_check`.

É excelente para estrutura e péssimo para intenção. **O motor não sabe onde está a piada,
nem qual plano carrega a emoção.** O `film-director` revisa e reescreve o que veio
genérico. Aceitar a saída como pronta é o modo de falha mais comum deste estágio.

## O `edit-spec.json` é contrato, não rascunho

Três estágios dependem dele:

- `takes` tira a **duração-alvo** de cada take
- `assembly` tira a **ordem e o ritmo** de corte
- `gate` valida **V2 (cadência)** contra ele

Precisa ser **parseável**. Um `edit-spec` quebrado derruba os três de uma vez, e a falha
aparece longe da origem.

## Todo plano que precisa de still tem `asset_id`

É o que amarra `decupagem` a `stills`: o item `STL-A-01` do gate cruza os planos com
`asset_id` contra os arquivos em `11-stills/_direction/`, e os conjuntos precisam
coincidir. Plano sem `asset_id` vira asset que ninguém gera.

## Action Items

1. **Ler o roteiro** e, quando houver, a bíblia e o território.
2. **Rodar o worker** e ler a saída como rascunho.
3. **Reescrever o que veio genérico** — enquadramento, blocking, e o plano que carrega a
   intenção de cada batida.
4. **Escrever o `storyboard.yaml`** com `asset_id` em todo plano que precisa de still.
5. **Escrever a `shotlist.md`**: o que gravar **e** a fala-chave de cada plano (é o V6 do
   gate).
6. **Escrever o `edit-spec.json`** com ordem, duração por plano e ritmo de corte.
   Validar o parse antes de fechar.
7. **Conferir a cadência** contra o `cut_timestamps` do benchmark, quando houver.
8. **Rodar `checklists/gate-decupagem.md`.**

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P1 brand-film** | A decupagem mais densa: cada plano carrega intenção emocional além de enquadramento. Alimenta o `look` logo em seguida — o `dop` trabalha sobre esta shotlist. Python indisponível → escrever a shotlist à mão pelo `templates/shotlist-tmpl.yaml`. |
| **P3 nicho-series** | **O timing da piada mora aqui.** Piada que depende de um plano impossível de gerar → mover a piada para o **corte** ou para a **fala**: timing é recuperável, plano nem sempre. Não há `look` depois (P3 não convoca dop), então a decupagem entrega direto ao `design`. |
| **P4 oraclum-institucional** | Prova em tela difícil de filmar → vira **screen recording dirigido** declarado na shotlist: zoom no cursor, corte no clique, latência removida. É o recurso que resolve a maior parte dos planos de produto. |
| **P2 ugc-ads** | **Estágio ausente.** O formato é fala-a-câmera; decupagem formal trabalharia contra o código de UGC. |
| **P5 dark-room** | **Estágio ausente.** O `mapa-broll.md`, escrito no `script`, faz o papel — substituto econômico para um formato que é locução sobre imagem. |
| **P6 image-lab** | **Estágio ausente.** Sem timeline. |

## Gate

`checklists/gate-decupagem.md`, mais:

- [ ] `edit-spec.json` parseável, com duração por plano
- [ ] Todo plano que precisa de still tem `asset_id`
- [ ] Shotlist com o que gravar e a fala-chave (V6)
- [ ] Cadência dentro do padrão do gênero
- [ ] O que veio genérico do worker foi reescrito

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Saída do worker aceita como pronta | Storyboard genérico produz stills genéricos. Reescrever a intenção. |
| `edit-spec.json` quebrado | Derruba `takes`, `assembly` e V2 de uma vez, longe da origem. Validar o parse. |
| Plano impossível mantido | Queima 3 retakes para descobrir. Resolver na decupagem: mover para o corte ou para a fala. |
| Plano sem `asset_id` | O `stills` não sabe que ele existe e o gate reprova por conjuntos que não coincidem. |
| Duração ausente | O `takes` gera na duração do modelo e o `assembly` não fecha. |
| Shotlist sem fala-chave | V6 reprova no `gate`. |

## Handoff

`{job}/06-decupagem/` → **look** (P1, P4) ou **design** (P3).
`edit-spec.json` → **takes** e **assembly**.
