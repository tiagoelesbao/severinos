# AE Spec — Transição "Ignição do Punho" (Império Prêmios)

**Conceito completo:** `conceito.md`, mesma pasta. Este documento é a especificação
executável pra montar no After Effects — **não existe exportador de `.aep` neste
repositório** (confirmado em `squads/oraclumtech-ai-creative-studio/agents/editor.md`,
seção `a_validar`); é um documento pra um operador humano montar na mão.

**Entrega desta spec:** o operador abre o AE, cria as 4 comps abaixo na ordem, exporta cada
uma conforme a coluna "saída", e entrega os arquivos pro Premiere (ver
`pipeline-producao.md` pra ligação com a etapa seguinte).

---

## 0. Preparação do material-fonte (ANTES de abrir qualquer comp)

| Item | Valor |
|---|---|
| Arquivo | `C:\Users\Pichau\Downloads\IMG_7206.MOV` |
| Formato nativo | 2160×3840, 60fps, HEVC (yuv420p), 8,2s |
| Trecho a usar | 0s → ~4,667s (Take 1 — confirmado por detecção de cena; o operador deve
  conferir o frame exato no scrub do AE/Premiere antes de travar o corte, porque a detecção
  automática dá o segundo, não necessariamente o frame) |
| Comp final (Premiere) | 1080×1920 @ 30fps — mesmo padrão já usado em `apps/video-studio` e
  nas specs de Premiere deste squad (`editor.md`, `cadeia_de_finalizacao`) |

**Conform obrigatório antes de usar o Take 1 em qualquer comp:**
1. **Resolução:** 2160×3840 → 1080×1920 (downscale exato de 50%, sem crop — a proporção já é
   9:16 nativa).
2. **Frame rate:** 60fps → 30fps. Use **drop-frame** (descartar 1 a cada 2 frames), **não**
   frame-blend — o gesto do punho erguido é o ponto de maior nitidez que a peça precisa, e
   blend amoleceria exatamente o frame que vira gatilho da transição.
3. **Codec:** HEVC costuma dar frame drop/travamento em import direto no AE/Premiere no
   Windows dependendo do codec pack instalado. Transcodar antes pra ProRes 422 (ou DNxHR SQ)
   via Media Encoder ou `ffmpeg -i IMG_7206.MOV -c:v prores_ks -profile:v 2 -vf
   "scale=1080:1920" -r 30 take1_conformado.mov` (ajustar `-t 4.667` pra já cortar no
   transcode, ou cortar depois na timeline — tanto faz, mas transcodar o arquivo inteiro uma
   vez evita retrabalho).
4. **Áudio do Take 1:** o arquivo tem áudio ambiente do pátio (conversa, vento, etc.). Essa
   spec não decide o que fazer com ele — fica para o estágio de som na finalização (ver
   `pipeline-producao.md`). Não apague o áudio ao conformar.
5. **Still de congelamento:** além do clipe conformado, exporte 1 frame still em PNG do
   último frame do Take 1 (o pico do punho erguido) em 1080×1920 — é a entrada da Comp 01.

---

## 1. Decisão de founder pendente ANTES de montar a Comp 03

O `logo.png` de `apps/imperio-premios-lp/logo.png` é um PNG raster de **288×243px**, fundo
transparente. Pra um crest pequeno (até ~400px de largura em tela 1080px) ele aguenta
upscale leve sem problema visível. Pra uma revelação em tela cheia (o que esta spec propõe
na Comp 03, coroa ocupando boa parte da largura do quadro) ele vai pixelizar.

**Duas rotas, uma decisão do founder antes do operador montar a Comp 03:**

- **Rota A (recomendada, mais rápida):** recriar a coroa como **Shape Layers** vetoriais no
  próprio AE, usando o `logo.png` como referência visual (5 pontas com esfera no topo, 5
  estrelas brancas na faixa, base com swoosh duplo, gradiente dourado #e3a73e → #f4c869). É
  um ícone geométrico simples — menos de 1h de operador pra redesenhar em vetor, e depois
  essa versão vetorial fica reutilizável pra qualquer peça futura do Império que precise do
  brasão em tela cheia.
- **Rota B:** usar o PNG nativo mesmo, limitando o tamanho final da coroa em tela a no
  máximo ~500-600px de largura (upscale de ~2x do nativo, ainda aceitável) e aceitando que
  não vai ocupar o quadro inteiro como um "hero reveal" — vira um crest mais discreto.

Esta spec assume **Rota A** nas animações abaixo (coroa em tela cheia). Se o founder preferir
Rota B, a Comp 03 precisa ser reescrita com a coroa menor e sem o preenchimento de quadro —
sinalizar isso de volta antes de gastar o tempo de operador na Comp 03.

---

## 2. As 4 composições

### Comp 01 — `AE_01_ignicao-punho`

| Campo | Valor |
|---|---|
| **comp_id** | `AE_01_ignicao-punho` |
| **duracao_frames / fps** | 14 frames @ 30fps (~0,47s) |
| **entrada** | O still congelado do pico do punho erguido (preparado no passo 0.5) como
  camada de fundo, estendida pelos 14 frames (freeze, não vídeo rodando — a ignição acontece
  sobre o instante congelado do gesto, não durante o movimento). Mais: 1 camada de flare/glint
  (pode ser um Shape Layer com glow nativo do AE, ou um asset de lens flare se o operador
  tiver um pack) e 1 camada solid branca pro flash. |
| **animação** | **Flare:** posicionar sobre o punho fechado (aprox. terço superior do
  quadro, lado esquerdo-centro — conferir posição exata no still). Scale 0% → 140%, frames
  1-8, ease-in quadrático (começa devagar, acelera). Opacity 0% → 100%, mesmos frames 1-8,
  mesmo easing. **Flash branco (solid):** Opacity 0% → 100%, frames 8-11, ease-in
  exponencial (estoura rápido no fim). Hold 100%, frames 11-12. Frame 14 = corte duro pra
  Comp 02 (que já entra em branco — ver abaixo), sem fade de saída. |
| **saída** | **Com alfa** (overlay). Pré-render ProRes 4444 ou sequência PNG com canal
  alfa — é pra ser composta diretamente sobre o fim do Take 1 no Premiere, não substitui o
  frame. Só os frames 1-10 realmente precisam do alfa (o flare semi-transparente sobre o
  rosto/punho); os frames 11-14 já são branco 100% opaco, mas exportar a comp inteira com
  alfa simplifica a montagem no Premiere (uma faixa só, sem split). |
| **on_brand** | Flare com núcleo branco e borda dourada clara (`--gold-light #f4c869`) —
  não usar branco puro na borda do flare, porque aí não carrega marca nenhuma antes do
  flash. |

### Comp 02 — `AE_02_poeira-vira-po-de-ouro`

| Campo | Valor |
|---|---|
| **comp_id** | `AE_02_poeira-vira-po-de-ouro` |
| **duracao_frames / fps** | 22 frames @ 30fps (~0,73s) |
| **entrada** | Fundo solid branco (continuação do flash da Comp 01). Sistema de
  partículas — se o operador tiver Trapcode Particular ou similar instalado, usar partícula
  nativa; **se não tiver**, a alternativa prática é uma textura de stock de poeira/fumaça
  (buscar "dust particles overlay" ou "sand particles 4K" em banco gratuito — Pexels/Mixkit
  têm overlays desse tipo) em modo de blend Screen/Add, duplicada e colorizada via Tint/Hue. |
| **animação** | Frame 1: tela 100% branca (herdada da Comp 01). **Partículas ocres**
  (`#c7823c` aprox. — tom da terra do pátio, conferir contra o still do passo 0.5 pra casar a
  cor real) nascem do centro-esquerda do quadro (mesma posição do flare da Comp 01) e se
  espalham radialmente, scale/spread 0% → 100%, frames 1-14, ease-out cúbico. **Mudança de
  matiz:** as partículas migram de ocre pra dourado de marca via efeito Tint/Hue animado,
  ocre `#c7823c` → `--gold #e3a73e` nos frames 6-14 → `--gold-light #f4c869` nos frames
  14-20, ease-in-out em ambos os trechos. **Fundo:** opacity do solid branco 100% → 0% e
  solid preto (`--bg #0a0a0f`) 0% → 100%, crossfade frames 14-22, ease-in-out — por baixo das
  partículas, não por cima. |
| **saída** | **Sem alfa.** Comp opaca, própria (substitui o quadro, não é overlay). Corte
  duro vindo da Comp 01. Pré-render como clipe normal (ProRes 422 HQ ou H.264 alta
  qualidade pra revisão). |
| **on_brand** | Trajeto de cor obrigatório: ocre da terra real → `#e3a73e` → `#f4c869`.
  Fundo final `#0a0a0f`. Não pular direto pro dourado sem passar pelo ocre — é o que faz a
  transição parecer que nasce da cena, e não que foi colada por cima. |

### Comp 03 — `AE_03_brasao-reveal`

| Campo | Valor |
|---|---|
| **comp_id** | `AE_03_brasao-reveal` |
| **duracao_frames / fps** | 40 frames @ 30fps (~1,33s) |
| **entrada** | Fundo `#0a0a0f` com glow radial dourado suave no terço superior — reproduzir
  o `radial-gradient(ellipse 120% 42% at top, rgba(227,167,62,0.16), transparent 70%)` que já
  existe no `body` de `apps/imperio-premios-lp/index.html`, pra manter a mesma assinatura
  visual do site. Camada da coroa (vetorizada — ver decisão da seção 1, Rota A). Camada de
  texto "IMPÉRIO", fonte **Montserrat ExtraBold/Black (800/900)**, cor `--text #f5f5f7` ou
  `--gold-light #f4c869` (decisão de contraste — testar as duas, mas o site usa `#f4c869`
  pro wordmark no header). Partículas remanescentes da Comp 02 entrando em quadro nos
  primeiros frames. |
| **animação** | **Convergência de partículas:** as partículas douradas que sobraram da
  Comp 02 convergem pro centro-topo do quadro, frames 1-12, ease-in cúbico. **Coroa:** scale
  0% → 108% → 100% (overshoot e assentamento), frames 10-22, ease-out-back; opacity 0% →
  100%, frames 10-16. **Wordmark "IMPÉRIO":** revelação cinética letra por letra, abaixo da
  coroa. Começa no frame 20, cada letra desliza de +40px (de baixo pra cima) → 0px e opacity
  0% → 100% ao longo de 8 frames, com stagger de 2 frames entre letras (7 letras: I-M-P-É-R-
  I-O → última letra começa no frame 32, termina no frame 40). Easing por letra: ease-out
  quadrático. |
| **saída** | **Sem alfa.** Comp opaca, própria. Corte duro vindo da Comp 02. Pré-render
  ProRes 422 HQ. |
| **on_brand** | Coroa: gradiente `#e3a73e` → `#f4c869` (mesmo gradiente do `logo.png`
  original). Fundo `#0a0a0f` + glow `rgba(227,167,62,0.16)`. Wordmark Montserrat 800/900,
  `#f4c869`. |

### Comp 04 — `AE_04_cta-kinetic`

| Campo | Valor |
|---|---|
| **comp_id** | `AE_04_cta-kinetic` |
| **duracao_frames / fps** | 75 frames @ 30fps (~2,5s) — **hold extensível**: se a peça
  precisar de mais tempo de CTA em tela pra retenção do anúncio, o operador pode estender o
  hold final direto no Premiere (congelando o último frame) sem precisar re-renderizar esta
  comp. |
| **entrada** | Continuação do fundo da Comp 03 (`#0a0a0f` + glow). Coroa + wordmark da Comp
  03 (agora recuando pro posicionamento final). Camada de headline: **"ESSA PODE SER A SUA
  VITÓRIA."** (copy final do `@ladeira`, ângulo Prêmio §1a — `copy-angles-2026-10-09.md`).
  Camada de CTA em formato de botão/pill: **"VER O QUE ESTÁ DISPONÍVEL AGORA"** (texto
  idêntico ao botão secundário real da LP, por desenho — ver nota de método do Ladeira: zero
  dissonância entre o que o vídeo promete e o botão que a página entrega). |
| **animação** | **Reposicionamento do brasão:** coroa + wordmark migram do centro pro
  terço superior do quadro (posição de crest fixo, respeitando zona segura — mesmo raciocínio
  de y≈420-1500 usado no README do Garantido/Império pra não cair sob a UI do Meta), scale
  100% → 55%, posição Y centro → topo, frames 1-10, ease-in-out. **Headline** ("ESSA PODE SER
  A SUA VITÓRIA." — 5 palavras): entra palavra por palavra, cada palavra scale 85% → 100% +
  opacity 0% → 100%, frames 8-20 (stagger de ~2,4 frames/palavra pras 5 palavras caberem
  nesse intervalo). **CTA (botão pill, "VER O QUE ESTÁ DISPONÍVEL AGORA"):** scale 0% → 108%
  → 100% (leve bounce), frames 30-40, ease-out-back. **Pulso de atenção no CTA:** loop
  contínuo scale 100% → 104% → 100%, a cada 20 frames, começando no frame 45 até o fim do
  hold — pra manter o botão "vivo" sem competir com o resto da composição. |
| **saída** | **Sem alfa.** Comp opaca — é o card final da peça. Pré-render ProRes 422 HQ
  (ou H.264 alta qualidade se for só pra revisão interna antes do master). |
| **on_brand** | Headline: Montserrat 800, `--text #f5f5f7`, com a palavra de destaque
  "VITÓRIA" em `--gold-light #f4c869` (fecha o arco visual: a peça inteira levou até aqui pra
  pagar essa palavra em ouro). CTA pill: fundo gradiente `--green #3ddc6f → #2bb85a` (mesmo
  gradiente do `.btn-primary` do site), texto `#06230f` (mesmo escuro usado no site pra
  contraste sobre o verde) — **não** usar o dourado no botão, o site já reserva o verde pro
  CTA primário e o dourado pra marca/destaque. |

**Overlays sobre o Take 1 (fora do escopo das Comps 01-04, mas completam a peça):** os 2
primeiros beats da sequência do Ladeira acompanham a filmagem real, antes da transição —
"A CHANCE JÁ TÁ ABERTA." durante a corrida/abertura, "100 NÚMEROS. VÁRIAS RODADAS POR DIA."
na aproximação da estrutura. São camadas de texto simples sobre o take real (mesma lógica de
zona segura), não fazem parte das comps de motion graphics acima — mas precisam ser montadas
na mesma timeline do Premiere/AE pra a peça ter a sequência completa de 4 beats.

---

## 3. Estrutura de bins e nomenclatura (After Effects)

```
01_SOURCE/
  take1_conformado.mov        (1080×1920, 30fps, ProRes — ver passo 0)
  take1_still_punho.png       (still do passo 0.5)
  logo_coroa_vetor.ai/.shape  (se Rota A — recriado no AE)
02_COMPS/
  AE_01_ignicao-punho
  AE_02_poeira-vira-po-de-ouro
  AE_03_brasao-reveal
  AE_04_cta-kinetic
03_PRECOMPS/
  (partículas, flares, qualquer sub-elemento reaproveitado entre comps)
04_RENDERS/
  (saída de cada comp pré-renderizada, nomeada igual ao comp_id)
```

## 4. Estimativa de complexidade (pra `@exec-producer`)

| Comp | Complexidade | Estimativa |
|---|---|---|
| `AE_01_ignicao-punho` | Baixa-média (overlay simples, glow + flash) | 0,5-1h |
| `AE_02_poeira-vira-po-de-ouro` | Média-alta se precisar instalar/configurar plugin de
  partícula; média se usar stock overlay + Tint | 1-3h |
| `AE_03_brasao-reveal` | Média (recriar vetor da coroa + montagem + tipografia cinética) | 1,5-2h |
| `AE_04_cta-kinetic` | Média (copy final já fechada — ver seção 2, Comp 04) | 1-1,5h |
| **Total (1ª vez)** | — | **~5-7,5h de operador** — reutilizável como template pra
  próximas peças do Império, então o custo cai bastante da 2ª vez em diante. |

## 5. Pendências que bloqueiam início da montagem

1. **Aprovação do founder na Rota A vs. Rota B** (seção 1) — sem isso o operador não sabe
   qual Comp 03 montar.
2. ~~Copy da headline/CTA do `@ladeira`~~ — **RESOLVIDO 2026-10-09.** Comp 04 já usa a copy
   final ("ESSA PODE SER A SUA VITÓRIA." + "VER O QUE ESTÁ DISPONÍVEL AGORA"), timing de
   stagger recalculado pro texto real (5 palavras, frames 8-20).
3. **Confirmação do frame exato de corte** do Take 1 (o founder/operador precisa travar o
   frame certo no scrub, não só confiar no segundo "~4,667s" da detecção automática).

Só a pendência 1 (Rota A vs. B) e a 3 (frame exato) seguem bloqueando — a Comp 04 já pode ser
montada com a copy real, não precisa mais de placeholder.
