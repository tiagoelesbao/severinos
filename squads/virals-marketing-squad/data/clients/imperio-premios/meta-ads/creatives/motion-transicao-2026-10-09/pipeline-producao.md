# Pipeline de Produção — Do Bruto ao Anúncio Pronto (After Effects no Fluxo)

Este documento descreve o processo ponta a ponta pras duas peças desta leva — a transição de
motion graphics do Império Prêmios e os 3 takes do Garantido Prêmios — porque o processo é o
mesmo nos dois casos, só muda o quanto de trabalho tem em cada etapa. Specs de referência:
`conceito.md` + `ae-spec.md` (Império, mesma pasta) e
`../../../garantido-premios/meta-ads/creatives/campanha-1-whitelist-social/ae-spec.md`
(Garantido).

**Regra geral de todo este squad:** nenhum agente ou documento aqui gera `.aep`, `.prproj`
nem executa render. Cada etapa abaixo produz uma **especificação** ou um **arquivo de mídia
exportado por um humano operando a ferramenta**. "Automatizável" nas tabelas abaixo significa
"pode ser feito por script/IA sem um humano abrir o programa" — não significa que já existe
automação pronta no repositório pra isso.

## As 7 etapas

### 1. Seleção de corte — ✅ FEITO

| | |
|---|---|
| **Quem faz** | Humano (founder/análise ffmpeg) + agente (este documento, análise de scene detection) |
| **Entrega** | Império: corte confirmado em ~4,667s do `IMG_7206.MOV`, Take 1 aprovado pelo founder. Garantido: 3 takes já extraídos e validados frame-a-frame (`README.md` da campanha). |
| **Pronto pra avançar quando** | O ponto de corte está decidido e documentado com o porquê — já é o caso nos dois clientes. |

### 2. Conceito + spec de motion graphics — ✅ ESTE ENTREGÁVEL

| | |
|---|---|
| **Quem faz** | Agente (pesquisa de referência + redação da spec executável) |
| **Entrega** | Império: `conceito.md` + `ae-spec.md` (4 comps). Garantido: `ae-spec.md` (2 comps, mais simples por decisão deliberada — ver seção "Decisão" nesse arquivo). |
| **Pronto pra avançar quando** | As pendências listadas no fim de cada `ae-spec.md` estiverem resolvidas (ver seção "Aprovações necessárias" abaixo) — sem isso, o operador consegue começar as comps que não dependem de copy/decisão de asset, mas não consegue fechar a peça. |

### 3. Montagem no After Effects — ⏳ PRÓXIMA ETAPA (humana)

| | |
|---|---|
| **Quem faz** | **100% humano** — o founder ou operador que ele designar, no After Effects local. Nenhuma automação deste repositório gera comps de AE. |
| **Entrada** | O `ae-spec.md` correspondente, mais os arquivos-fonte conformados (ver seção "Preparação do material-fonte" de cada spec). |
| **O que o operador faz** | Monta cada comp na ordem do spec, seguindo duração em frames, valores de/para e easing declarados. Usa a seção "Estrutura de bins" como organização de projeto. |
| **Entrega** | Os pré-renders de cada comp (ver coluna "saída" de cada comp — com ou sem alfa), seguindo a nomenclatura `comp_id` igual ao spec. |
| **Pronto pra avançar quando** | Todas as comps do spec estiverem renderizadas e conferidas visualmente contra os valores do spec (duração certa, cores batendo com os hex declarados, sem flash/pop indesejado nas emendas). |

### 4. Montagem/corte final + grade de cor + áudio — ⏳ depois da etapa 3

| | |
|---|---|
| **Quem faz** | Humano, no Premiere Pro (cadeia canônica do estúdio: video-studio → After Effects → Premiere — ver `editor.md`, `cadeia_de_finalizacao`). Pra estas duas peças específicas não há etapa de `apps/video-studio`, porque nenhum dos dois clientes tem `video-templates.yaml`/`brand-config.yaml` configurado ainda — o Take real + os pré-renders de AE vão direto pro Premiere. |
| **Entrada** | Take(s) conformado(s) + pré-renders do AE (etapa 3) + plano de áudio (a decidir — nenhum dos dois `ae-spec.md` fecha o áudio, é escopo do estágio de som). |
| **O que acontece aqui** | Sequência final 1080×1920 @30fps; corte com os pré-renders de AE encaixados no ponto certo (overlay onde tem alfa, hard-cut onde não tem); grade de cor **por origem de asset** (o Take real da filmagem tem uma correção, as comps de motion graphics geradas no AE têm outra — não aplicar uma curva única); mixagem de áudio (ambiente do take + qualquer SFX/música que entrar na transição, pro Império — o whoosh da "ignição" e o impacto do brasão ainda não têm som definido, fica pra esse estágio decidir). |
| **Pronto pra avançar quando** | Existe 1 master editado, com cor e áudio fechados, 1080×1920 @30fps. |

### 5. Conferência contra a spec original — ⏳ depois da etapa 4

| | |
|---|---|
| **Quem faz** | Humano (founder ou quem ele designar) — checagem visual simples, não precisa de um agente separado pra isso numa peça deste tamanho. |
| **O que confere** | O master bate com o que o `conceito.md` prometeu (a transição realmente "surpreende" saindo do Take 1, sem cortar pro Take 2)? As cores do brasão/CTA batem com os hex da marca? O telefone do Garantido está legível e dentro da zona segura? |
| **Pronto pra avançar quando** | Resposta "sim" nos pontos acima, ou os ajustes identificados voltam pra etapa 3/4 antes de seguir. |

### 6. Export por canal — ⏳ depois da etapa 5

| | |
|---|---|
| **Quem faz** | Humano, no Premiere (preset de export — formato, codec, bitrate por canal/posicionamento do Meta: Stories, Reels, Feed). |
| **Entrega** | Arquivo(s) final(is) prontos pra subir. |
| **Pronto pra avançar quando** | O arquivo abre e reproduz corretamente no formato de cada posicionamento alvo. |

### 7. Subida no Meta Ads — ⏳ depois da etapa 6

| | |
|---|---|
| **Quem faz** | Humano (founder ou time de tráfego), seguindo o fluxo já documentado em
  `marketing-chief` pra integração com o pipeline de campanha (brief.yaml, audiências,
  UTM). Fora do escopo técnico deste documento. |

## Resumo visual do fluxo

```
Take bruto (filmagem real)
        │
        ▼
Seleção de corte ───────────────── ✅ feito (Império + Garantido)
        │
        ▼
Conceito + AE spec ─────────────── ✅ este entregável
        │
        ▼
Montagem no After Effects ──────── ⏳ humano, próxima etapa
   (comps pré-renderizadas,
    com/sem alfa conforme spec)
        │
        ▼
Corte final + cor + áudio ──────── ⏳ humano, Premiere
   (Take real + pré-renders AE
    = 1 master editado)
        │
        ▼
Conferência contra a spec ──────── ⏳ humano, checagem rápida
        │
        ▼
Export por canal ───────────────── ⏳ humano, Premiere
        │
        ▼
Subida no Meta Ads ─────────────── ⏳ humano/time de tráfego
```

## Aprovações necessárias do founder antes de alguém abrir o After Effects

Estas são as decisões que **bloqueiam o início real da montagem** (não bloqueiam 100% do
trabalho — algumas comps podem começar sem elas, ver cada `ae-spec.md`):

1. **Império — Rota A vs. Rota B da coroa** (`ae-spec.md`, seção 1): recriar o brasão em
   vetor (recomendado, permite tela cheia) ou usar o PNG nativo de 288×243px limitado a um
   crest menor. Sem essa decisão, a Comp 03 não pode ser fechada.
2. **Império — copy da headline/CTA**, pendente do `@ladeira`. Sem ela, a Comp 04 só pode
   ser montada com placeholder, e o operador vai ter que refazer o timing da tipografia
   cinética quando o texto real chegar.
3. **Império — confirmação do frame exato de corte** (~4,667s é o segundo da detecção
   automática, não necessariamente o frame exato onde o punho está no pico — o operador
   precisa travar isso no scrub antes de montar a Comp 01).
4. **Garantido — peça única sequencial (recomendação desta spec) vs. 3 variantes A/B**
   separadas. Muda se a Comp 02 (lower-third) é montada 1 vez ou 3.
5. **Garantido — identidade de marca ainda não existe** (`brand-config.yaml`). O tratamento
   tipográfico atual é um placeholder neutro; não é bloqueante pra montar agora, mas deve
   ser revisado assim que a Garantido tiver uma identidade definida — pode significar refazer
   a Comp 02 depois.
6. **Plano de áudio dos dois criativos** — nenhuma das specs de AE fecha isso (é
   deliberadamente fora de escopo, pertence ao estágio de som da finalização). Fica como
   decisão em aberto pra quando a peça chegar na etapa 4 deste pipeline.

Nenhuma dessas pendências impede o trabalho de **começar** — mas a peça do Império não fecha
sem 1, 2 e 3; a do Garantido não fecha sem 4.
