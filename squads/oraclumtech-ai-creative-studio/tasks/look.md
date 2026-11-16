---
task_name: look
status: ready
responsible_executor: dop
execution_type: agent
tipo: estagio
stage_id: look
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-008
pipelines: [P1, P4]
ausente_em: 'P3 (câmera invisível é o código) · P2 (fotografia autoral mata o UGC) · P5 e P6'
input: |
  - {job}/06-decupagem/storyboard.yaml e shotlist.md
  - {job}/02-research/moodboard/
  - brand-config.yaml do cliente — paleta canônica
output: |
  - {job}/07-look/look-book.md   referência visual comentada, plano a plano
  - {job}/07-look/look.yaml      parâmetros parseáveis: lente, luz, paleta, movimento
  - {job}/07-look/grade-ref.md   referência de grade para a composição em AE
gate: checklists/gate-look.md
failure_modes: |
  - Look book bonito e não acionável — não vira prompt nem instrução de set
  - Paleta divergente do brand-config
  - Citar LUT de DaVinci (fora do fluxo desde §3.3)
  - Fotografia derivada de referência sem declarar quando não há referência
  - look.yaml não parseável — o stills não consegue consumir
acceptance_criteria: |
  - look.yaml parseável, com lente, luz, paleta e movimento por plano
  - Cada parâmetro tem as duas leituras: prompt de geração E instrução de gravação
  - Paleta idêntica à do brand-config, ou a divergência está justificada
  - grade-ref.md fala de AE, nunca de DaVinci
---

# look — Fotografia: lente, luz, paleta e grade

O `dop` (método Roger Deakins) traduz o storyboard em decisão de fotografia. O que
distingue este estágio: ele entrega **duas leituras do mesmo parâmetro** — uma que vira
prompt de geração, outra que vira instrução de gravação real.

## Comando

```text
@dop
*look {job-id}
*lookbook {job-id}
*grade {job-id}
```

## Saída dupla: gerar e gravar

| Leitura | Consumidor | Forma |
|---|---|---|
| **generative** | `stills` e `takes` | bloco de câmera, lente e luz que entra direto no Pacote de Direção |
| **live_action** | operador em set | lente, diafragma, esquema de luz, altura de câmera |
| **finishing** | `assembly` (AE) | referência de grade e look |

O modo híbrido é o ponto: um mesmo job pode ter planos gerados e planos filmados, e os
dois precisam bater. Um look book que só serve para prompt deixa o plano filmado órfão.

## DaVinci saiu do fluxo

> `_CONVENTIONS.md` §5 — a cadeia é app próprio → After Effects → Premiere.

`grade-ref.md` descreve a **referência de look** para a composição em AE. Nada de LUT
`.cube` de DaVinci, nada de `export_to_davinci.py`. O worker candidato que existia
(`tools/generate_lut.py`, hoje chamado só pelo script legado) fica **fora** deste estágio.

## O `look.yaml` precisa ser parseável

`stills` e `takes` consomem os parâmetros para montar o Pacote de Direção. O item
`STL-A-04` do gate reprova prompt que descreve só o assunto e deixa luz, lente e paleta
para o modelo decidir — e o `image-lead` só consegue cumprir isso se o `look.yaml` estiver
estruturado.

Look book em prosa é referência; `look.yaml` é contrato.

## Action Items

1. **Ler o storyboard e o moodboard.**
2. **Carregar a paleta canônica** do `brand-config.yaml`. Em conflito com qualquer
   referência, **o brand-config vence** — ele é extraído do produto real.
3. **Definir o look global** — temperatura, contraste, profundidade, textura.
4. **Descer ao plano**: lente, luz, movimento e paleta por plano do storyboard.
5. **Escrever as duas leituras** de cada parâmetro (generative e live_action).
6. **Escrever `look.yaml`** estruturado e validar o parse.
7. **Escrever `grade-ref.md`** apontando para AE.
8. **PARAR no checkpoint `cp-preprod`** — é a última parada antes de mandar alguém gerar.
9. **Rodar `checklists/gate-look.md`.**

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P1 brand-film** | O uso pleno. A peça-vitrine é julgada pelo acabamento, e o acabamento nasce aqui. O checkpoint `cp-preprod` apresenta storyboard + look book juntos: é a última parada barata. Sem referência utilizável → trabalhar a partir do `brand-config` e **declarar em `degraded[]`** que a fotografia é derivada da marca, não de referência. |
| **P4 oraclum-institucional** | Paleta travada em `#08080C` + `#A855F7`, extraída do site real. Conflito de paleta entre peça e site → **vence o brand-config**. O look precisa acomodar screen recording dirigido, que é boa parte dos planos de prova. |
| **P3 nicho-series** | **Estágio ausente.** Em sketch de bolha a fotografia autoral atrapalha — o código é câmera "invisível" e a piada mora no corte. A decupagem entrega direto ao `design`. |
| **P2 ugc-ads** | **Estágio ausente.** Fotografia dirigida faz a peça deixar de parecer UGC. |
| **P5 dark-room** | **Estágio ausente.** A assinatura visual é do canal, no `channel-brief.yaml`. |
| **P6 image-lab** | **Estágio ausente.** A direção visual é do `design`. |

## Gate

`checklists/gate-look.md`, mais:

- [ ] `look.yaml` parseável, com lente, luz, paleta e movimento por plano
- [ ] Cada parâmetro com as duas leituras (generative e live_action)
- [ ] Paleta idêntica ao `brand-config`, ou divergência justificada
- [ ] `grade-ref.md` aponta para AE, nunca para DaVinci
- [ ] Checkpoint `cp-preprod` cumprido

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Look book bonito e não acionável | Vira PDF que ninguém usa. O contrato é o `look.yaml`. |
| Paleta divergente | A peça não conversa com o produto. Brand-config vence. |
| LUT de DaVinci citado | Fora do fluxo. Referência de grade para AE. |
| `look.yaml` não parseável | O `stills` não consome e o prompt fica genérico — `STL-A-04` reprova. |
| Só a leitura generative | O plano filmado fica órfão. Modo híbrido exige as duas. |
| Fotografia derivada sem declarar | Ninguém sabe que não houve referência. Registrar em `degraded[]`. |

## Handoff

`{job}/07-look/look.yaml` → **design**, e daí para o Pacote de Direção de **stills** e
**takes**. `grade-ref.md` → **assembly**.
