---
task_name: assembly
status: ready
responsible_executor: editor
execution_type: worker
tipo: estagio
stage_id: assembly
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-014
pipelines: [P1, P2, P3, P4, P5]
ausente_em: 'P6 — image-lab não tem timeline'
input: |
  - {job}/12-takes/entregues/ e {job}/12-takes/_direction/ae-compositions.md
  - {job}/13-audio/entregues/, sound-spec.yaml e captions.srt
  - {job}/06-decupagem/edit-spec.json — ordem, duração e ritmo
  - {job}/07-look/look.yaml — referência de grade (quando o pipeline tem dop)
output: |
  - {job}/14-assembly/autolegenda/         saída do app próprio
  - {job}/14-assembly/ae-comp-spec.md      composições de After Effects a construir
  - {job}/14-assembly/premiere-cut-spec.md corte, mix e export por canal
  - {job}/14-assembly/export-presets.yaml
  - {job}/14-assembly/master/              o corte final, devolvido pelo operador
gate: checklists/gate-assembly.md
failure_modes: |
  - Tentar renderizar em vez de especificar
  - Chamar export_to_davinci.py — legado, fora do fluxo
  - Spec que não diz o que o app próprio já resolveu — retrabalho manual
  - Corte sem timecode e sem o porquê de cada corte
  - Preset de export ausente por canal
  - Assumir que o ingest do studio lê a estrutura do job
acceptance_criteria: |
  - A spec é executável por outra pessoa sem perguntar nada
  - Ordem de cortes com timecode e justificativa
  - Preset de export declarado por canal, com safe area
  - O que o app próprio já resolveu está explicitamente marcado como "não refazer"
  - Master conferido contra o edit-spec e o sound-spec
---

# assembly — Montagem: app próprio, After Effects e Premiere

> **Cadeia de finalização (§3.3 · `_CONVENTIONS.md` §5).**
> `apps/video-studio` (timeline auto-montada, autolegenda, FX on-brand) →
> **After Effects** (motion, composição, VFX, lower-third) →
> **Premiere Pro** (corte final, mix, master, export por canal).
>
> **DaVinci saiu do fluxo.** `export_to_davinci.py` é legado e **nenhum agente, task ou
> workflow deste squad o chama.**

O `editor` (método Walter Murch) **não renderiza — dirige quem monta**. O entregável é
**especificação de montagem executável**, não projeto pronto.

## Comando

```text
@editor
*assemble {job-id}      # roda o app próprio
*spec {job-id}          # escreve a spec de AE e Premiere
*review {job-id}        # revisa o corte devolvido
```

## As quatro fases

| Fase | Executor | O quê |
|---|---|---|
| `assembly.auto` | **worker** | app próprio: timeline, autolegenda, rough-cut |
| `assembly.spec` | agent | a spec executável de AE e Premiere |
| `assembly.human` | **human** | AE (motion/composição) → Premiere (corte, mix, master) |
| `assembly.review` | agent | revisão do corte, teto de 3 |

## O worker: comandos reais do app próprio

```bash
node apps/video-studio/scripts/ingest.ts {client} {creative_slug}
node apps/video-studio/scripts/check-assembly.ts --autocut --maxgap=0.4
cd apps/video-studio && npm run studio
cd apps/video-studio && npm run render {brand_slug}
```

- `ingest.ts` monta `timeline.json` a partir do video-brief e dos materiais
- `check-assembly.ts` audita a montagem e fecha gaps — importante onde há muitos clipes
  curtos, porque o gap entre eles é visível
- `npm run studio` abre o Remotion Studio para preview
- `npm run render` faz o render headless on-brand

### Gap conhecido, declarado

`ingest.ts` e `check-assembly.ts` esperam a convenção
`outputs/{client}/video-plans/{creative}/`. Um job do creative-studio vive em
`jobs/{job-id}/`. **Falta a ponte.** Além disso, `render.mjs` hoje resolve brand tokens
só para `virals` e `tiago-elesbao` — `oraclum` precisa de entrada equivalente.

Sem a ponte, a rota é: o editor entrega a timeline no template e o operador importa
direto no Premiere, com o desvio registrado em `job.json → degraded[]`.

## A spec precisa dizer o que NÃO refazer

O item que mais evita desperdício: **o que o app próprio já resolveu**. Se a spec não
disser que a autolegenda já está pronta, o operador vai refazer legenda à mão no Premiere.

Conteúdo obrigatório da spec (§3.3):

- ordem de cortes **com timecode**, e o **porquê** de cada corte
- lista de composições de AE a construir, com parâmetros de animação
- specs de lower-third, legenda e motion graphics no padrão da marca
- pastas, nomenclatura de importação, organização de bins
- preset de export por canal: formato, codec, bitrate, resolução, safe area
- **o que o app próprio já resolveu e não deve ser refeito na mão**

## Action Items

1. **Rodar o app próprio** (`assembly.auto`) e conferir o rough-cut e a autolegenda.
   Ponte indisponível → aplicar o fallback e registrar em `degraded[]`.
2. **Ler `ae-compositions.md`** do `motion-lead` — as composições já vêm listadas de lá.
3. **Escrever `ae-comp-spec.md`** consolidando o que construir em AE, com parâmetros.
4. **Escrever `premiere-cut-spec.md`** — ordem de cortes com timecode e justificativa,
   bins, nomenclatura.
5. **Escrever `export-presets.yaml`** — um preset por canal do brief.
6. **Marcar explicitamente o que já está pronto** e não deve ser refeito.
7. **Emitir o card** (`tasks/emit-human-card.md`) e **PARAR**. `waiting_human`.
8. **Revisar o master** devolvido contra o `edit-spec.json` e o `sound-spec.yaml`.
9. **Rodar `checklists/gate-assembly.md`.**

## Variações por pipeline

| Pipeline | O que muda na montagem |
|---|---|
| **P1 brand-film** | Master 16:9 + cutdowns + derivado 9:16, cada um com preset próprio. A revisão cobra ritmo por corte, grade conforme `look.yaml` e safe area em cada derivado. |
| **P2 ugc-ads** | Montagem de **lote**: um corpo único cortado com N hooks. **P2 normalmente não usa After Effects** — UGC com motion graphics deixa de parecer UGC; lower-third e cartela só se o brief pedir. Uma variação que falha no export não bloqueia as outras. |
| **P3 nicho-series** | **O corte É a piada.** A ordem de cortes com o porquê importa mais aqui do que em qualquer outro pipeline. AE faz cartelas e tag final. Timing que não fecha → devolve para `decupagem` com o timecode exato, não conserta no escuro. |
| **P4 oraclum-institucional** | AE faz lower-third Oraclum, big number e sublinhado. Preset de motion do `video-templates.yaml` em conflito com o `brand-config` → vence o brand-config, e a divergência é registrada (o registry está defasado). |
| **P5 dark-room** | **Autolegenda por palavra** é parte do código do gênero, não conveniência — vem do `transcribe.py`. A revisão cobra a antecipação do b-roll sobre a locução (0,5–1s) e a ausência de plano repetido visível. Corte que não fecha na duração-alvo → devolve para `script` com o timecode do excesso; não corta claim no escuro. |
| **P6 image-lab** | **Estágio ausente.** Sem timeline. O equivalente de finalização é a fase `stills.finish`, com `apps/creative-design`. |

## Gate

`checklists/gate-assembly.md`, mais:

- [ ] A spec é executável por outra pessoa sem perguntar nada
- [ ] Ordem de cortes com timecode e justificativa
- [ ] Preset por canal, com safe area
- [ ] "Não refazer" explicitamente marcado
- [ ] Master conferido contra edit-spec e sound-spec
- [ ] Nenhuma referência a DaVinci ou `export_to_davinci.py`

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Editor tenta renderizar | O papel é dirigir a montagem. Render headless é do app; corte e master são do Premiere, com humano. |
| DaVinci citado | Legado, fora do fluxo desde §3.3. Remover. |
| Spec não diz o que já está pronto | O operador refaz a legenda à mão. É o desperdício mais comum do estágio. |
| Corte sem timecode | A revisão não consegue localizar o problema e vira discussão de gosto. |
| Preset de canal ausente | O arquivo sai fora de spec e o `delivery` descobre tarde. |
| Assumir que o ingest lê o job | Falha no meio, com o job já caro. O gap está declarado — aplicar o fallback. |
| Timing errado consertado na montagem | Em P3 e P5, devolver ao estágio de origem com o timecode. Remendo na montagem esconde o problema. |

## Handoff

`{job}/14-assembly/master/` + as specs → **factcheck**.
