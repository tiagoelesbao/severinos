# Conceito — Transição de Motion Graphics · Take de Chegada Triunfante (Império Prêmios)

**Fonte:** `C:\Users\Pichau\Downloads\IMG_7206.MOV` (vertical 2160×3840, 60fps, HEVC, 8,2s total).
**Corte de cena real** (detecção por ffmpeg, threshold 0,08-0,15, feita antes deste documento): **~4,667s**.
**Decisão do founder:** usar só o **Take 1** (0s → 4,67s — homem sem camisa corre até uma
cisterna de cimento num pátio de terra batida, sobe, flexiona o braço em punho erguido,
comemorando, sorrindo). O **Take 2** (ele sentado com microfone falando pra uma multidão) **não
entra** — o founder quer que a peça "surpreenda" saindo do momento de chegada direto pra um
motion graphics de impacto, sem cortar pro Take 2.

## A ideia: a poeira da rua vira poeira de ouro

**"Ignição do Punho"** — o próprio gesto triunfante do homem (o punho erguido no pico da
comemoração, ~4,67s) é o gatilho físico da transição, não um corte arbitrário por cima. No
instante exato em que o punho fecha no alto, a tela estoura num clarão branco a partir
daquele ponto — e da poeira real, cor de terra, que já está em cena (o pátio é literalmente
terra batida ocre/avermelhada, visível no fundo o tempo todo), nasce uma nuvem de partículas
que muda de cor ao se espalhar: do ocre da terra pro dourado da marca (#e3a73e → #f4c869). As
partículas convergem de novo no centro e se montam na coroa do Império — o ícone de marca já
usado na landing page (`apps/imperio-premios-lp/logo.png`) — seguida da revelação cinética do
nome e da oferta.

**Por que essa ideia e não uma transição genérica de stock:** a maioria das referências de
2026 pesquisadas (glitch, light leak, whip-pan, "transition dab") usa um elemento do VÍDEO
como gatilho físico do corte — não aplica o efeito por cima, de fora. Aqui a poeira do pátio
já é um elemento real da cena, então a transição nasce do próprio material, não de uma
textura importada sem relação com a imagem. Isso também resolve a mensagem de marca sem
precisar de um texto explicando: a terra (a rua, o lugar real, a entrega feita na mão) vira
ouro (o Império) na frente do espectador — o mesmo território simbólico que já está na copy
da landing page ("Você já viu a gente na sua rua. Agora vem conhecer por dentro.").

## As 4 batidas da sequência

1. **Ignição** (~0,47s) — flare/clarão no punho erguido, estoura a tela em branco. Gatilho
   físico, não corte arbitrário.
2. **Poeira vira ouro** (~0,73s) — partículas ocres (cor da terra real do pátio) se espalham
   a partir do branco e mudam de matiz pro dourado da marca ao longo da transição; o fundo
   assenta em preto de marca (#0a0a0f).
3. **Brasão** (~1,33s) — as partículas douradas convergem e montam a coroa; abaixo dela, o
   nome "IMPÉRIO" revela letra por letra (tipografia cinética).
4. **CTA** (~2,5s, extensível) — a coroa + nome recuam pro topo (crest fixo), a oferta e o
   CTA entram com tipografia cinética e um pulso de atenção contínuo no botão.

Duração total da sequência de motion graphics: **~5s** (151 frames a 30fps). Somada ao Take 1
(4,67s), a peça fecha em **~9,7s** — compatível com o formato curto de anúncio vertical.

## Referência de marca usada

Paleta extraída de `apps/imperio-premios-lp/index.html` (`:root` do CSS):
`--bg:#0a0a0f` · `--bg-card:#15151d` · `--gold:#e3a73e` · `--gold-light:#f4c869` ·
`--green:#3ddc6f` (cor do CTA primário do site) · `--text:#f5f5f7` · `--text-muted:#a4a4b0`.
Fonte: Montserrat (pesos 400/600/700/800/900, já carregada via Google Fonts no site). Ícone
de marca: coroa dourada de `apps/imperio-premios-lp/logo.png` (288×243px, fundo transparente,
5 pontas com esferas, 5 estrelas na faixa, base dupla). "RAPIDINHA" é o nome de produto de
sorteio rápido usado no meio de funil do cliente (`brief.yaml` linha 70) — fica como
candidato de headline, mas a copy final é decisão do `@ladeira`, não deste documento.

## O que este documento NÃO decide

- **Copy final** (headline, oferta, CTA) — pendente do `@ladeira`.
- **Se a coroa de 288×243px é usada como está (upscale leve) ou recriada em vetor** para a
  revelação em tela cheia — ver decisão no `ae-spec.md`, é ponto de aprovação do founder.
- **Áudio da sequência de motion** (whoosh na ignição, impacto no brasão, música) — fica para
  o estágio de som na finalização (Premiere), não é deste documento.

## Referências de pesquisa (fundamentação, não cópia)

A pesquisa confirmou que em 2026 as transições de maior impacto em vertical (TikTok/Reels)
usam gatilho físico do próprio vídeo (gesto, movimento, batida) em vez de efeito aplicado por
fora, e que tipografia cinética segue como estilo central (não só decoração) em abertura e
revelação de marca:

- [Video and Motion Creative Trends 2026 — GDJ](https://graphicdesignjunction.com/2026/01/video-and-motion-creative-trends-2026/) — aberturas com torn paper/glitch/light leak que piscam entre cenas; tipografia cinética como estilo central.
- [7 Trending Motion Graphic Styles in 2026 — Demotion](https://trydemotion.com/blog/trending-motion-graphic-styles) — estilos de motion em alta.
- [Vertical Glitch Transitions — Envato Elements](https://elements.envato.com/vertical-glitch-transitions-YVTJPTQ) — pixelização, RGB shift e frame corrompido desenhados especificamente pra mobile-first/vertical.
- [Current TikTok Trends to Try in 2026 — Later](https://later.com/blog/tiktok-trends/) — padrão "transition dab": transformação instantânea de antes/depois sincronizada a um movimento/batida do próprio clipe, não a um efeito externo.
- [TikTok Next 2026 Trend Report](https://ads.tiktok.com/business/library/TikTok_Next_2026_Trend_Report.pdf) — relatório oficial de tendência de criativo da plataforma.
