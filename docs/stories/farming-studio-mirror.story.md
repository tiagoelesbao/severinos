# Story: Espelhamento exato do criativo no video-studio

**Status:** Done — 6/6 verificados
**Epic:** Virals Farming — F6b (ponte de edição)
**Agente executor:** @dev · validação por @qa

---

## Contexto

O pipeline entrega `export/criativo.mp4` aprovado pelo dono. A ponte para o
`apps/video-studio` já publica o criativo (`farm-studio-publish.js`), mas a tentativa
anterior de abrir as PEÇAS editáveis produziu uma montagem **diferente** do export — o
editor aplicava o próprio pipeline por cima. A pendência ficou registrada em memória.

O que mudou desde então: o motor de montagem (F6) foi corrigido em oito pontos e o
resultado foi validado pelo dono. Agora o alvo é estável e o espelhamento pode ser
perseguido com um critério objetivo.

## Critério de aceite (não negociável)

O criativo aberto no frontend deve ser **indistinguível** do `export/criativo.mp4`:

| # | Requisito | Como verificar |
|:--|:---|:---|
| AC1 | Mesma duração (±0,05s) | ffprobe nos dois |
| AC2 | Mesma sequência de clipes, na ordem e com as durações do `timeline.json` | comparar `videoTrack` do save com o timeline da F6 |
| AC3 | Áudio do benchmark, faixa única, sem trilha/SFX do editor | `extraLayers` sem itens gerados pelo app |
| AC4 | Texto igual: mesmo conteúdo, posição, quebras e tempos | comparar com `export/captions.ass` |
| AC5 | Fonte e corpo equivalentes ao estilo aplicado no export | `caption_style` do nicho → estilo do editor |
| AC6 | Marca d'água removida (mesmo reenquadramento) | crop declarado por clipe |
| AC7 | Timeline organizada por elemento, editável | camadas separadas: vídeo, áudio, texto |
| AC8 | Mudanças em `apps/video-studio` restritas ao escopo autorizado | `git status` do app × lista de arquivos autorizados |
| AC9 | Tipografia idêntica: família, corpo, peso e contorno do `.ass` | comparar o elemento de texto com o estilo `Default` do `.ass` |
| AC10 | Desenho igual em pixels na banda do texto | `farm-studio-visual-diff.js` (diferença < 6) |

## Fora de escopo

- Render final pelo studio (`render-export.ts` usa Timeline interno próprio).
- Paridade de efeitos que o export não usa.

## Riscos conhecidos (da tentativa anterior)

1. `api/timeline/route.ts` PRÉ-MONTA SFX e trilha lo-fi quando não há save persistido.
2. `audioEnabled` vem de `TALKING_HEAD.has(role)` — conjunto `{hook, cta}`; outro papel entra mudo.
3. `page.tsx` lê `fxPlan.brand.accent` sem guarda: fxPlan incompleto quebra a página.
4. Áudio em `audioTrack` é tratado como narração (fica rotulado "hook") e sofre ducking.

## Limites do editor (mapeados em código, T1)

| Recurso do export | Editor | Contorno adotado |
|:---|:---|:---|
| Crop 7% (marca d'água) | **não existe** | aplicar o crop NO ARQUIVO publicado (pré-processado por ffmpeg) |
| Quebra de linha `\n` no texto | não existia | **resolvido no app**: `white-space: pre` (e `noWrap` por clipe) |
| Fonte por clipe | não existia | **resolvido no app**: `fontFamily`/`fontWeight` por clipe (brand vira fallback) |
| Contorno do texto | não existia (só `text-shadow`) | **resolvido no app**: contorno real, com a convenção do ASS (cresce para fora) |
| Fade global | **não existe** | `fadeIn` no 1º clipe, `fadeOut` no último |
| Fade-out de áudio | 12 frames hardcoded | divergência aceita e declarada |

**Armadilhas que o renderer aplica mesmo com save persistido:**
- dissolve de 6 frames em todo clipe idx>0 → gravar `transitionIn:{type:"none",durationInFrames:0}`
- `HookFx` no clipe 0 → `hookRenderer:"hard-cut"`
- painel com moldura/blur em papéis não-hook → `frameMode:"cover"` em todos
- `ProgressBar` se estiver em `motionRenderers` → array vazio
- `CaptionsOverlay` sempre montado → `fxPlan.captions: []`

## Tarefas

- [x] T1 — Mapear o que o modelo do editor suporta (crop por clipe, cues de texto, fonte)
- [x] T2 — Adapter (`_studio-mirror.js` + `--mode=mirror`)
- [x] T3 — Bateria de verificação automática dos AC1–AC8 (`farm-studio-verify.js`)
- [x] T4 — 6/6 criativos passam AC0–AC8
- [x] T5 — Tipografia fiel: contorno, peso, família e quebras por clipe (`TimelineFxComposition`, `timeline.ts`)
- [x] T6 — Calibrar a conversão libass → CSS (corpo e entrelinha) medindo pixels
- [x] T7 — AC9 (tipografia) e AC10 (diff visual) na bateria de verificação
- [x] T8 — Checagem no navegador (`farm-studio-browser-check.js`): console e piscada preta
- [x] T9 — Reenquadramento herdado do contrato da F6 (fim da flag repetida à mão)


---

## Resultado (verificado por `farm-studio-verify.js`)

```
6/6 criativo(s) espelhado(s) com fidelidade
AC0 persisted=true · AC1 duração ok · AC2 clipes/ordem/durações ok
AC3 só "Trilha (benchmark)", 0 inventadas · AC4 conteúdo e tempos ok
AC7 camadas separadas · AC8 mudanças no app dentro do escopo autorizado
AC9 Montserrat 700, 76px do .ass → 55,33px no editor, contorno 4px
```

### AC10 — diferença de pixels na faixa do texto (`farm-studio-visual-diff.js`)

| Criativo | Antes da tipografia | Depois | Nota |
|:---|---:|---:|:---|
| 01 ilustrandoseuamor | 27,21 | **9,48** | 10 linhas em 3 parágrafos + 2 emoji coloridos |
| 02 lermenn | 17,35 | **2,76** | |
| 03 reflexoesdaalma | 9,76 | **3,83** | |
| 04 little.christian0 | — | **3,20** | |
| 05 reflexoesdaalma | 12,56 | **5,80** | emoji colorido |
| 06 tyfany.editts | — | **4,43** | 19 cues de legenda de fala |

Referência: acima de ~12 a diferença é visível a olho nu; abaixo de 6 é ruído de
recompressão. O 01 fica mais alto por ter muito mais texto na tela (mais bordas por
quadro) e dois emoji coloridos — mascarar os emoji tira só 0,3, o resto é antialiasing de
contorno. O alinhamento vertical foi conferido à parte: deslocar o quadro do editor em
±2px PIORA a diferença (9,4 → 14,1 / 17,2), ou seja, está no ponto.

## Tipografia: por que o contrato passava e a tela não (2ª rodada)

A bateria deu 6/6 com o texto na tela em **outra fonte, outro peso e sem contorno** —
conteúdo e tempo batiam, o desenho não. Quatro causas, todas no renderer do editor:

| Ponto | Export (libass) | Editor (antes) |
|:---|:---|:---|
| Peso | bold real da família — o ffmpeg registra `(Montserrat, 700, 0) -> Montserrat-Bold` | `fontWeight: 800` fixo no código |
| Contorno | `Outline 4` preto, crescendo **para fora** da letra | só `text-shadow` difuso |
| Quebras | `\N` e linha em branco entre parágrafos | ignoradas; re-quebrava na própria largura |
| Corpo | `Fontsize` = altura da **célula** da fonte (compat VSFilter) | lido como corpo em px → 37% maior |

A quarta só apareceu medindo pixels: a mesma linha saiu com **689px no export e 946px no
editor**, ambos declarando 76px. A conversão é **corpo CSS = 0,728 × Fontsize**, e o
**passo entre linhas é o próprio Fontsize em px** (76,03px medidos para Fontsize 76) —
coerente com a primeira regra: se o número é a altura da célula, empilhar células é
avançar esse tanto. Em CSS isso é `line-height: 1/0,728 = 1,3736`.

Medir entrelinha pelo topo da tinta de duas linhas **não funciona**: acento e ascendente
deslocam o topo em ~10px e o erro fica maior que o efeito. Uma primeira calibragem chegou
a 1,219 por esse caminho — plausível, porque bate com as métricas da fonte, e errada. O
valor certo veio da **autocorrelação do perfil de linhas**, que usa o bloco inteiro.

Mais duas regras do libass, ambas medidas em pixels:

- **Linha em branco entre parágrafos vale MEIA entrelinha.** Dentro do parágrafo as linhas
  andam 76px; na virada, 114px — 1,5 passo. Em CSS uma linha vazia ocupa um passo inteiro,
  e o bloco de 3 parágrafos crescia 76px, subindo 42px acima do lugar. Cada parágrafo
  virou um bloco, com `margin-top` de meia entrelinha.
- **Meia entrelinha de sobra no topo e na base.** O passo (76px) é maior que a altura
  tipográfica da fonte (1,219 em = 67,5px); o CSS distribui a sobra acima da primeira
  linha e abaixo da última, o libass não. Sem compensar, o bloco fica 4px acima —
  suficiente para dobrar a diferença de pixels na faixa do texto (22,7 contra 11,2).

Contorno: `-webkit-text-stroke` é centrado na letra, o `Outline` do ASS é externo. O texto
é desenhado em duas camadas — uma cópia atrás com o **dobro** da espessura e o
preenchimento por cima. Duas camadas também dispensam `paint-order`, que nem todo Chrome
aplica a texto HTML.

### Defeitos encontrados e corrigidos durante a execução

1. **Colisão de slug** — `rank + handle` gerava a mesma pasta para packs diferentes
   (os ranks se repetem: cada execução da F2 renumera de 1). Dois criativos do mesmo
   perfil se sobrescreviam no editor. Passou a usar o nome da pasta do pack.
2. **Ramo de cópia errado** — o modo `mirror` caía no `else` de `edit/source` e tentava
   copiar takes do plano que não existiam, poluindo os erros antes do adapter rodar.
3. **AC4 comparava em nível errado** — como o editor não quebra linha, cada linha vira um
   elemento; a verificação contava 2 onde o `.ass` tem 1. Passou a agrupar por intervalo.

4. **Contrato verde com a tela errada** — a bateria comparava campos, não pixels. Passou a
   existir o `farm-studio-visual-diff.js` (diferença medida na banda do texto) e o AC9,
   que confere família, corpo, peso e contorno contra o estilo `Default` do `.ass`.

## Duas falhas do export do editor que só apareceram no espelhamento

**1. Todo export acima de ~3 minutos morria.** A mensagem era sempre
`delayRender("load-font-Montserrat") não foi liberado após 178000ms`, e a leitura óbvia
— "a fonte não carrega" — está errada: nos exports curtos a mesma fonte carrega sem
drama. O log do navegador (adicionado via `onBrowserLog`) mostrou o mecanismo: a Remotion
**recarrega a aba dezenas de vezes** num export longo, e cada recarga registrava as SEIS
famílias, com um `delayRender` por face. Um export de 7,5s já fazia 30 pares
pedido/liberação; um de 61s faria centenas. Bastava **uma** promessa não fechar para o job
inteiro cair no timeout — e exports curtos só não notavam porque terminavam antes dele.

Correções: a aba do render passa a registrar **apenas as famílias que a composição usa**
(`ensureFonts`), o guarda-chuva de 10s é armado antes de qualquer coisa que possa lançar,
e há três saídas independentes para o mesmo handle (`load()`, `fonts.ready`, timer). O
criativo de 61s, que falhava sempre aos 3min, renderizou inteiro em 5min36.

**2. O arquivo saía em faixa de cor cheia.** `yuvj420p` / `color_range=pc`, contra
`yuv420p` limitado do resto do pipeline. Medido no mesmo quadro: luma média 141 no export
da F6 e 147 no do editor. Num player que ignora a flag — a maioria dos apps —, isso é
contraste lavado no upload.

`colorSpace: "bt709"` resolve a metade fácil (metadados corretos), mas sozinho **piorou**
a imagem: a Remotion monta `zscale=matrix=709:matrixin=709:range=limited`, e essa
descrição da ENTRADA está errada nos dois campos. Os quadros chegam ao ffmpeg como
**JPEG** (`element-%03d.jpeg`), e JPEG é **BT.601 de faixa cheia** — não 709 limitado. O
zscale então estica a faixa de novo e converte pela matriz errada. O erro some no cinza e
aparece na cor saturada: num quadro de rosas, Y médio 131,3 no export da F6 contra 136,0
no do editor; numa cena noturna, quase nada.

Com `zscale=matrixin=470bg:rangein=full:matrix=709:range=limited` injetado por
`ffmpegOverride`, o mesmo quadro fecha em **130,99 contra 131,26** — 0,3 de diferença.

### Divergências conhecidas e aceitas

1. O editor aplica fade-out de áudio de **12 frames** (hardcoded em `audioEnvelopes.ts`).
2. **Emoji colorido** no editor onde o export sai monocromático — preferência do dono,
   registrada como decisão, não como defeito. É o que sobra de diferença no diff de pixels
   dos criativos que usam emoji.

### Escopo autorizado no app (AC8)

O "não tocar no app" caiu por impossibilidade técnica: peso, contorno e quebras são
decisões do renderer, não do save. Os arquivos autorizados estão listados em
`farm-studio-verify.js`; qualquer outro arquivo tocado reprova o AC8.

| Arquivo | Motivo |
|:---|:---|
| `scripts/render-export.ts` | GOP/keyframes na conformação + concorrência (falha de seek sob carga) |
| `src/remotion/fonts.ts` | timeout do `delayRender` (promessa de fonte pendente travava o job) |
| `src/remotion/TimelineFxComposition.tsx` | tipografia do elemento de texto |
| `src/lib/timeline.ts` | campos de tipografia por clipe |
| `src/app/studio/page.tsx` | playhead fora da cadeia de commit do Player |
| `src/app/api/thumbs/route.ts` | miniatura além do fim da mídia (clipe > take) |
| `src/remotion/fx/SmartFrame.tsx` | `pauseWhenBuffering` no preview |

## Defeitos que só aparecem com o vídeo TOCANDO

Contrato verde (AC0–AC9) e diff de pixels baixo, e mesmo assim o editor estava ruim de
usar. Nenhuma das duas baterias vê a reprodução: uma compara campos, a outra compara o
arquivo exportado. Foi preciso abrir o editor num navegador de verdade, gravar a tela e
medir — daí saiu o `farm-studio-browser-check.js`.

### 1. `Maximum update depth exceeded`

Pilha terminando em `usePlayback.useEffect5.callback` (@remotion/player) — mas o defeito
não é da Remotion. O evento `frameupdate` é disparado de DENTRO do commit do Player, e o
handler chamava `setCurrentFrame` ali mesmo: isso encadeia um update **aninhado** por
quadro. O React conta esses aninhamentos e, ao passar de 50 (menos de dois segundos de
reprodução), derruba a página. O erro aparecia no `usePlayback` porque é de lá que sai o
update, não porque o problema estivesse lá.

Correção: o handler escreve só no ref (síncrono, é o que atalhos e arraste leem) e agenda
a cópia para o estado num `requestAnimationFrame` — fora da cadeia de commit e no máximo
uma vez por quadro de tela. Antes reproduzia ~1 vez a cada 3 execuções do roteiro; depois,
0 em 8.

Ajuda também, mas não bastava: `style` e `errorFallback` do `<Player>` viraram constantes
de módulo e o **elemento** do Player foi para um `useMemo([snap, inputProps])` — ele não é
memoizado no pacote e re-renderizava junto com a página 30×/s. (O `useMemo` precisa ficar
antes do early return `if (!snap)`, senão vira hook condicional.)

### 2. Piscada preta entre takes

Medido na gravação do navegador, criativo de 14 clipes: **80 a 120ms de preto em TODAS as
viradas**, nos tempos exatos das trocas. O `<video>` do próximo clipe só nascia no frame
em que entrava.

Correção **só no Player** (`premountFor={30}` + `styleWhilePremounted`): a sequência é
montada 1s antes, invisível. Detalhe que custou uma rodada: a Remotion pré-monta com
`opacity: 0` e o Chrome **não pinta o que é totalmente transparente** — mesmo com a mídia
em `readyState=4`, três das cinco viradas ainda piscavam. Um milésimo de opacidade resolve
e é invisível. Mais `pauseWhenBuffering` no `<Video>`: se ainda faltar quadro, o Player
espera em vez de mostrar preto.

No render headless nada disso entra (`mediaBaseUrl` só existe no Player): pré-montar
mudaria o arquivo final e custaria tempo. Verificado — os seis exports mantiveram a mesma
diferença de pixels, dígito a dígito.

Dois detalhes que só a medição repetida revelou:

- **O clipe pode ser mais longo que a mídia** (a montagem clona o último quadro para casar
  com o áudio). O espelho passou a gravar `nativeDurationInFrames` com a duração REAL do
  arquivo, e o preview congela no último quadro que existe — antes o `<video>` passava do
  fim e o Chrome pintava preto.
- **O fim da reprodução piscava 120ms.** Não era virada de take: ao terminar, o Player
  volta sozinho ao frame 0 (`moveToBeginningWhenEnded`, ligado por default) e a volta
  pinta preto. Desligado — num editor, parar onde acabou é o comportamento útil de
  qualquer forma.

### 3. Cascata de 500 na faixa de miniaturas

A montagem estende o último take clonando o quadro final (`tpad`), então o clipe é mais
longo que a mídia — e a timeline pedia miniatura DEPOIS do fim do arquivo. Cada pedido
virava 500 e enchia o console de erro numa tela que estava certa. `/api/thumbs` passou a
cair para `-sseof -0.2` (o último quadro), que é exatamente o que o vídeo mostra ali.

## Como o próximo pipeline não repete os mesmos erros

| Risco | O que dependia de disciplina | O que garante agora |
|:---|:---|:---|
| Espelho com enquadramento diferente do export | repetir `--dewatermark` em dois comandos | a F6 grava `timeline.dewatermark`; o publicador lê o contrato (e, em packs antigos, o `crop` do `_ffmpeg-cmd.txt`) |
| Tipografia divergente | valores fixos no renderer | lidos do `captions.ass` a cada publicação, com o AC9 conferindo |
| Export longo morrendo por fonte | — | `ensureFonts` registra só as famílias que a composição usa |
| Cor fora do padrão do pipeline | default da Remotion | `colorSpace` + `ffmpegOverride` fixos no worker de export |
| Regressão silenciosa | bateria só via contrato | `farm-studio-verify.js` (AC0–AC9) + `farm-studio-visual-diff.js`, ambos na F6b do guia |
