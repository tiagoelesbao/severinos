---
task_name: farm-studio-assembly
status: ready
responsible_executor: farming-producer
execution_type: worker
phase: f6-assembly
squad: virals-farming-squad
pattern: VF-TP-001
input: |
  - takes/take-N.mp4
  - audio.mp3 e audio-description.md do pack
  - plano-criativo.md
  - benchmark.json (descrição e hashtags do autor)
output: |
  - timeline.json — montagem para o video-studio
  - export/criativo.mp4 — 9:16, legenda queimada
  - export/publishing-kit.md — descrição + hashtags
pre_conditions: |
  - takes/ completo conforme _slots.json
  - audio.mp3 presente
post_conditions: |
  - O .mp4 existe e passa creative-export-checklist.md
  - Todo export tem kit de publicação ao lado
acceptance_criteria: |
  - 9:16 com legenda queimada no estilo do nicho
  - Áudio cobre a duração total, sem corte
  - Sem watermark, UI herdada ou texto gerado por IA
  - Guardrails do nicho respeitados — gate BLOQUEANTE
---

# F6 — Montagem, Edição e Export

Consome tudo — plano, takes, áudio, transcrição — e entrega o arquivo publicável.

## Comando

```text
@farming-producer
*assemble {rank|all}
*export
*captions {rank}
*publishing-kit {rank}
*verify
```

## Reuso, não render próprio

O `apps/video-studio` já resolve timeline, transições, legendas queimadas, zoom e export
em 9:16, e já é consumido pelo `virals-marketing-squad`. O farming entrega assets e um
`edit_spec`. Contrato completo em `tools/video-studio-bridge.md`.

| Reusado | Papel |
|:---|:---|
| `src/lib/editSpec.ts` | `applyEditSpec`, `parseMoment`, `transitionTypeFor` |
| `scripts/ingest.ts` | monta `timeline.json` |
| `scripts/render-export.ts` | render final |

## O áudio manda na duração

O `audio.mp3` do benchmark define a duração total.

```text
soma(takes) <  áudio  →  ESTENDE o último take
soma(takes) >  áudio  →  encurta o último take
```

O áudio **nunca é cortado**: o fechamento sonoro é parte do que fez o original performar.

## Edição automatizada aplicada

| Efeito | Quando |
|:---|:---|
| Zoom in/out contínuo e sutil | em todo take, para manter movimento |
| Transição suave (8 frames) | entre takes do mesmo mundo visual |
| Corte seco | quando o beat narrativo muda |
| `fade-in` | primeiro take, entrada do hook |
| `fade-out` | último take, coordenado com o fim do áudio |

## Legendas

| Nicho | Estilo |
|:---|:---|
| religioso | `montserrat-bold-outline` |
| pet | `clean-white-shadow` |
| noticias | `bold-news-lower-third` |
| cartomante | `elegant-serif-gold` |

Queimada, sempre — vertical é consumido sem som na maior parte do tempo. Safe area
`bottom: 220px`, `sides: 60px` para não cair sob a UI do TikTok.

## Action Items

1. **Verificar** que `takes/` está completo. Faltando, parar e reportar.
2. **Traduzir** `plano-criativo.md` em `edit_spec`: ordem, duração, transições, zoom,
   momentos de legenda.
3. **Gerar legendas** a partir de `audio-description.md`.
4. **Montar** `timeline.json` via a ponte do video-studio.
5. **Validar a montagem** — durações cobrem o áudio, sem gap não intencional.
6. **Rodar `checklists/creative-export-checklist.md`** — **antes** do render.
   Renderizar algo que viola guardrail é gastar máquina para produzir o impublicável.
7. **Renderizar** em lote.
8. **Gerar `publishing-kit.md`** com a descrição e as hashtags do autor original.
9. **Reportar** o lote: exportados, bloqueados no gate, degradados.

## O kit de publicação não é opcional

A descrição e as hashtags vêm de `author_description` e `hashtags` do `benchmark.json` —
o que o autor do criativo original usou. São parte do que fez o vídeo ser distribuído;
descartá-las e reescrever do zero joga fora um sinal que já provou funcionar.

**Export sem kit de publicação é trabalho pela metade.** O criativo só existe quando está
publicável.

## Gate bloqueante

Um criativo que viola `blocked_terms`, que faz afirmação factual sem âncora (notícias) ou
que promete resultado (cartomante) **não é exportado**. Não há modo automatizado que
contorne. Falhas voltam para a fase de origem:

| Falha | Volta para |
|:---|:---|
| Artefato de UI, watermark, texto de IA na imagem | F3 (descarte de camadas) → F4 |
| Anatomia distorcida, movimento errado | F5 |
| Áudio dessincronizado, legenda cortada | F6 |
| Violação de guardrail | F3 (replanejar) |
