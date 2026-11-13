# Plano — composição automática da peça dark em 16:9 no `apps/video-studio`

> Próximo marco depois de imagem, narração e trilha validadas.
> **Este é um plano para você aprovar, não código já escrito.**

**Data:** 2026-08-29
**Peça-piloto:** vídeo estoico horizontal para YouTube

---

## O que já existe e não precisa ser construído

O `video-studio` já tem quase tudo. Vale dizer isso antes de propor qualquer coisa,
porque a tentação seria escrever um pipeline novo em cima de um que já funciona.

| Peça | Onde | Estado |
|---|---|---|
| Schema de timeline | `src/lib/timeline.ts` | Já tem `kenBurns`, `transitionIn` (dissolve/slide/zoom), `fadeIn`/`fadeOut`, `frameMode`, keyframes de escala/opacidade/volume |
| Composição Remotion | `src/remotion/TimelineFxComposition.tsx` | Monta a timeline com efeitos |
| Movimento | `src/remotion/fx/Motion.tsx` | O Ken Burns que simula animação em imagem parada |
| Legenda | `src/remotion/fx/Captions.tsx` | Estilos de legenda já trabalhados, incluindo o karaokê por letra |
| Enquadramento | `src/remotion/fx/SmartFrame.tsx` | Resolve encaixe de material fora do aspect |
| Render | `scripts/render.mjs`, `render-timeline.ts`, `render-fx.ts` | Cadeia de export |
| Editor manual | `src/app/studio` | Inspector contextual e timeline elástica |

**A conclusão prática:** o trabalho não é construir um compositor. É **escrever o
timeline.json certo** e destravar duas coisas que hoje estão fixas.

---

## As três lacunas reais

### Lacuna 1 — o ingest é vertical e é do farming

`src/lib/ingest.ts` tem `TARGET_W = 1080` e `TARGET_H = 1920` como constantes, e
classifica clipes por papel do pipeline de farming (`hook`, `skill`, `reference`,
`generation`, `result`, `cta`). Nada disso serve para uma peça dark horizontal.

**O que fazer:** um segundo ingest — `ingestDarkRoom` — que não toca no primeiro.
Formato entra como parâmetro, não como constante.

### Lacuna 2 — o modelo de montagem é outro

O farming é **narração-driven com insert de captura de tela**. O dark é
**narração-driven com imagem parada**, e isso muda três coisas:

- Não há vídeo de origem, então não há `playbackRate` — a imagem ocupa a janela que
  a narração pedir, e o que dá vida a ela é o Ken Burns, não a velocidade.
- Não há talking-head, então **nenhum clipe toca áudio próprio**. A faixa de áudio é
  narração + leito, sempre.
- A ordem não vem de papel no arco, vem do **mapa de b-roll** do episódio: qual
  imagem cobre qual trecho da fala.

### Lacuna 3 — a legenda: aqui temos uma vantagem que o farming não tem

No farming a legenda vem de **transcrever** o áudio depois. No dark, **o SRT é escrito
antes** — ele é a partitura de prosódia que dirige a narração (`data/oratoria-e-prosodia.yaml`).

Ou seja: **a legenda já existe, é a mesma que gerou o áudio, e está sincronizada por
construção.** Não precisamos escolher modelo de transcrição para esta peça.

Vale um passo de conferência — transcrever o áudio gerado e comparar com o SRT de
entrada — mas isso é **verificação**, não é a fonte da legenda. E já temos a medida:
é o mesmo WER que usamos para validar as vozes.

---

## O que eu proponho construir

### 1 · `ingestDarkRoom` — o montador

Lê a estrutura do job e emite `timeline.json`:

```
entradas
  13-audio/narracao.wav          + o SRT que a gerou
  13-audio/leito-LOOP.wav        de data/trilhas-and-sfx
  11-stills/final/*.png          o pack aprovado, 4032x2304
  06-decupagem/broll-map.json    qual imagem cobre qual cue do SRT

saída
  timeline.json  formato 16:9, faixa de vídeo de imagens, faixa de áudio dupla
```

**A espinha é o SRT.** Cada imagem recebe a janela dos cues que ela cobre — nenhuma
duração é arbitrada, todas saem da fala.

### 2 · Movimento e transição por intenção, não por sorteio

O `camera-moves.yaml` já tem 39 movimentos catalogados. Proponho uma regra simples e
legível, em vez de aleatoriedade:

| Papel da imagem no texto | Movimento | Transição de entrada |
|---|---|---|
| abertura | push-in lento (`kenBurns` ~0.05) | fade de preto, longo |
| sustentação de argumento | drift lateral quase imperceptível (~0.03) | dissolve |
| virada / revelação | push-in mais firme (~0.08) | corte seco |
| fechamento | pull-out lento | dissolve para preto |

O 4K serve exatamente para isso: com 4032×2304 numa timeline 1080p, o Ken Burns pode
empurrar quase 2× **sem amolecer a imagem**. Foi por isso que escolhemos o upscale 3×.

### 3 · Overlays de textura

Você citou modelar os overlays dos vídeos de referência que baixamos. Isso é um
estágio à parte e eu prefiro deixá-lo explícito em vez de embutir: grão de filme,
vinheta e leve aberração cromática são o que aquele acabamento normalmente é. Precisa
de uma passada de análise nos vídeos de referência antes de virar preset — e é um
trabalho de olho, não de medida.

**Proponho fazer isso depois da primeira peça montada**, para você comparar a peça
sem overlay contra a com, em vez de nunca ver o efeito isolado.

### 4 · Um `render-preset` para YouTube

Master em 1920×1080 (ou 3840×2160 se você quiser 4K nativo), com zona segura para
título e legenda, e o preset declarado no job — não no script.

---

## Ordem que eu sugiro

1. **`ingestDarkRoom` + timeline.json da peça estoica** — é o que destrava tudo
2. **Render de conferência sem overlay** — você vê o corte, o ritmo e a legenda
3. **Ajuste de ritmo** no editor manual, que já existe
4. **Overlays de textura**, comparando com e sem
5. **Preset de export** e master

O passo 1 e 2 juntos já te dão uma peça assistível de ponta a ponta.

---

## O que eu preciso de você antes de começar

**O roteiro e o SRT do episódio.** Hoje temos as imagens, as vozes e as trilhas, mas
o texto que existe é a frase de teste do Marco Aurélio — 4 cues. Uma peça de YouTube
precisa do roteiro real, e ele decide quantas imagens o pack precisa ter.

**A duração-alvo.** Muda tudo: com 4 imagens você sustenta ~1 minuto com Ken Burns
generoso. Dez minutos pedem 30 a 40 imagens, e aí a conversa volta para geração.

**O canal.** O `wf-dark-room.yaml` bloqueia episódio sem `channel-brief.yaml`, e ele
não existe ainda. Ou criamos o brief do canal antes, ou tratamos esta peça
explicitamente como **piloto fora do fluxo de canal** — as duas são legítimas, mas a
escolha é sua.

---

## Uma divergência que preciso apontar

O `wf-dark-room.yaml` declara `formato_master: '9:16'` com `derivados: ['16:9']`. Para
o canal de estoicismo no YouTube isso está invertido — o master é 16:9.

Não é erro do workflow: ele foi escrito para dark de formato curto vertical. Mas
significa que **o formato master precisa vir do `channel-brief`, não do workflow.**
É uma correção pequena e vale fazer antes de a primeira peça sair, para não nascer
com o derivado sendo tratado como principal.
