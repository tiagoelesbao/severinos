---
task_name: farm-video-takes
status: ready
responsible_executor: farming-animator
execution_type: hybrid
phase: f5-takes
squad: virals-farming-squad
pattern: VF-TP-001
input: |
  - images/take-N.png + images/_slots.json
  - prompts-animacao.md
  - config/ai-providers.yaml + ledger de quota
  - mode: auto | hybrid
output: |
  - takes/take-N.mp4 — 9:16, 3 a 6s por take
  - takes/_slots.json
  - takes/_prompts-para-colar.md — só no modo híbrido
pre_conditions: |
  - Todas as imagens de images/_slots.json existem e estão em 9:16
post_conditions: |
  - Todo take existe — o degrau procedural garante que nenhum fica sem
  - Ledger atualizado com o provider usado por take
acceptance_criteria: |
  - Todo take em 9:16, duração conforme o plano
  - Movimento coerente com a função narrativa do take
  - Auto e híbrido produzem a MESMA árvore de arquivos
---

# F5 — Geração de Takes de Vídeo

Anima cada imagem no movimento que o beat pede.

## Comando

```text
@farming-animator
*animate {rank|all} [--mode=auto|hybrid] [--tier=A|B|C]
*procedural {rank}    # força parallax local, sem consumir cota
*handoff {rank}
*verify
```

## Cascata free-first

| Tier | Provider | Quando |
|:---|:---|:---|
| **A** | Veo (via Gemini), Hailuo/MiniMax | o sujeito precisa se mover **de verdade** |
| **B** | Kling | tier A esgotado, movimento moderado |
| **C** | **Parallax procedural (ffmpeg)** | sempre disponível, ilimitado, custo zero |

### O tier C não é um consolo

Em conteúdo de aquecimento, **"imagem animada + áudio" é o formato**. Nos nichos religioso
e cartomante o parallax lento não é degradação da IA de vídeo — é a estética que performa.
Esses nichos rodam tier C **por escolha** (`video_preferred_tier: C`), não por falta de cota.

| Preset | Movimento |
|:---|:---|
| `slow-push-in` | zoom in lento — bom para hook |
| `slow-pull-out` | zoom out revelando a cena — bom para fechamento |
| `pan-lr` | pan horizontal |
| `pan-ud` | pan vertical, revelação de céu ou chão |
| `parallax-2p5d` | separação figura/fundo — o mais convincente |
| `breathing` | micro-zoom pulsante |

## Onde gastar cota de verdade

Só no **pet**. É o único nicho onde o movimento é o conteúdo: um cachorro precisa se mexer
como cachorro, e nenhum parallax faz isso. Nos demais, tier A queima o recurso mais escasso
do pipeline para ganhar quase nada.

## Movimento serve ao beat

| Função do take | Movimento |
|:---|:---|
| Hook (0–3s) | `slow-push-in` — puxa para dentro da cena |
| Desenvolvimento | `pan-lr` ou `breathing` — vivo sem distrair |
| Fechamento | `slow-pull-out` — abre e conclui |

A duração de cada take **espelha o ritmo de corte do benchmark** (`cuts` do
`benchmark.json`), não um default.

## Action Items

1. **Verificar** que `images/` está completo conforme `_slots.json`. Faltando, parar.
2. **Carregar** `prompts-animacao.md` e a config de providers.
3. **Resolver o tier** — `--tier` > `niche_overrides.video_preferred_tier` > A.
4. **Modo auto:** por take, enviar imagem + prompt de movimento ao provider. Em `429`,
   rebaixar. O tier C sempre resolve.
5. **Modo híbrido:** escrever `takes/_prompts-para-colar.md` (imagem + prompt por take) e
   `takes/_slots.json`. Parar e aguardar os arquivos.
6. **Validar** proporção, duração e integridade de cada `.mp4`.
7. **Atualizar** o ledger e reportar provider por take.

## O que a IA de vídeo ainda erra

Mãos, patas e rostos em movimento. Quando o plano exige um desses em close, prefira
enquadramento que não os exponha ou caia para procedural — **erro de anatomia em movimento
é mais visível que ausência de movimento**.

## Handoff

`takes/` → **@farming-producer** (F6).
