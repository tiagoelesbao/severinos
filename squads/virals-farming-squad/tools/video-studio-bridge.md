# Tool — Ponte para o video-studio

```yaml
tool:
  id: video-studio-bridge
  version: 1.0.0
  target_app: apps/video-studio
  consumers: [farming-producer]
  phase: f6-assembly
```

Contrato de entrega dos assets do farming para o editor Remotion já existente no monorepo.

---

## Por que uma ponte e não um render próprio

O `apps/video-studio` já resolve timeline, transições, legendas queimadas, zoom e export
em 9:16 — e já é consumido pelo `virals-marketing-squad`. **REUSE > CREATE.** O farming
squad entrega assets e um `edit_spec`; o render é dele.

---

## Superfície reusada

| Arquivo | Papel |
|:---|:---|
| `src/lib/editSpec.ts` | `applyEditSpec`, `parseMoment`, `transitionTypeFor` |
| `scripts/ingest.ts` | monta `timeline.json` a partir dos assets |
| `src/app/api/timeline/route.ts` | endpoint de timeline |
| `scripts/render-export.ts` | render final |
| `src/remotion/fx/` | efeitos disponíveis |

---

## O que o farming entrega

```text
{pack_dir}/
├── takes/take-1.mp4 … take-N.mp4    ordem de montagem
├── audio.mp3                         leito — manda na duração total
├── audio-description.md              origem do texto das legendas
├── plano-criativo.md                 origem do edit_spec
└── benchmark.json                    descrição e hashtags para o kit
```

## O que a ponte produz

```json
{
  "creative": "01-handle-a1b2c3",
  "format": { "width": 1080, "height": 1920, "fps": 30 },
  "audioTrack": { "file": "audio.mp3", "role": "bed" },
  "videoTrack": [
    {
      "take": 1, "file": "takes/take-1.mp4",
      "role": "hook", "durationSeconds": 4.0,
      "effects": [{ "type": "zoom", "preset": "slow-push-in", "intensity": "subtle" }],
      "transitionOut": { "type": "soft", "durationFrames": 8 }
    }
  ],
  "captions": {
    "burnIn": true,
    "style": "montserrat-bold-outline",
    "source": "audio-description.md",
    "safeArea": { "bottom": 220, "sides": 60 }
  },
  "open": { "type": "fade-in", "durationFrames": 10 },
  "close": { "type": "fade-out", "durationFrames": 14 }
}
```

---

## Regras de montagem

### O áudio manda na duração

O `audio.mp3` do benchmark define a duração total. Se a soma dos takes não cobre o áudio,
**estende-se o último take** — o áudio nunca é cortado, porque o fechamento sonoro é parte
do que fez o original performar.

```text
soma(takes) <  duração(áudio)  →  estende o último take
soma(takes) >  duração(áudio)  →  encurta o último take
soma(takes) == duração(áudio)  →  montagem direta
```

### Efeitos por posição

| Posição | Efeito |
|:---|:---|
| Primeiro take | `fade-in` + `slow-push-in` |
| Takes intermediários | zoom contínuo sutil |
| Entre takes do mesmo mundo | transição suave (8 frames) |
| Quando o beat narrativo muda | corte seco |
| Último take | `slow-pull-out` + `fade-out` coordenado com o fim do áudio |

### Estilos de legenda

| Nicho | `captions.style` |
|:---|:---|
| religioso | `montserrat-bold-outline` |
| pet | `clean-white-shadow` |
| noticias | `bold-news-lower-third` |
| cartomante | `elegant-serif-gold` |

Sempre queimada. Vertical é consumido sem som na maior parte do tempo.

### Safe area

O TikTok cobre as bordas com UI própria. Nenhuma legenda pode cair sob elas:
`bottom: 220px`, `sides: 60px` na base de 1080×1920.

---

## Export

```text
export/
├── criativo.mp4          9:16, legenda queimada, pronto para publicar
└── publishing-kit.md     descrição + hashtags do original (benchmark.json)
```

Render em lote, com um relatório único ao final. **Export sem kit de publicação é trabalho
pela metade** — o criativo só existe quando está publicável.

---

## Gate antes do render

`checklists/creative-export-checklist.md` roda **antes** do render, não depois. Renderizar
um criativo que viola guardrail é gastar tempo de máquina para produzir algo que não pode
ser postado.
