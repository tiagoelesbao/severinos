# Takes-base — Campanha 1 (whitelist social) — Ação Social

**Contexto:** repetição do processo já validado para o cliente-irmão Império
Prêmios (ver `../../../imperio-premios/meta-ads/creatives/campanha-1-whitelist-social/README.md`).
Uma tentativa anterior desta mesma tarefa tentou baixar 2 Reels públicos do
Instagram do Garantido Prêmios e falhou (posts indisponíveis/removidos,
confirmado por 4 métodos independentes). O founder resolveu enviando os
vídeos-fonte como arquivo direto, igual foi feito originalmente pro Império.

**Fonte:** 3 vídeos enviados via WhatsApp pelo Mateus (dono da Garantido
Prêmios), registrados em `Downloads/`:

| Arquivo | Duração | Formato |
|---|---|---|
| `WhatsApp Video 2026-10-08 at 10.01.33.mp4` (aqui "video1") | 93,7s | 576×1024 (9:16), h264 30fps |
| `WhatsApp Video 2026-10-08 at 10.01.37.mp4` (aqui "video2") | 55,1s | 576×1024 (9:16), h264 30fps |
| `WhatsApp Video 2026-10-08 at 10.01.45.mp4` (aqui "video3") | 181,2s | 576×1024 (9:16), h264 30fps |

Análise feita em 2026-10-08: extração de frames por ffmpeg (varredura
coarse a cada 6s, depois refinada a cada 1s, 0,25s e por fim por frame nativo
de 1/30s nos pontos de corte) pra mapear com precisão onde o texto cravado
começa e termina em cada vídeo.

## Achado importante: video2 e video3 não renderam nenhum take

Diferente do material do Império (que tinha blocos longos sem legenda),
**video2 e video3 têm legenda estilo karaokê (palavra a palavra) cobrindo
praticamente 100% da duração**, com gaps reais entre palavras de no máximo
~0,3-0,5s — nunca o suficiente pra um corte de b-roll utilizável (mínimo
prático ~2s contínuos).

- **video2** (55,1s, formato: família + Volkswagen Parati verde vintage
  sendo entregue, com uma criança): varredura fina em 0-8s, 11-15s, 19-23s,
  26-30s, 36-48s não encontrou nenhuma janela limpa acima de ~0,25s. O vídeo
  termina com card preto + logo Garantido Prêmios (7s, não utilizável).
- **video3** (181,2s, formato: entrevista/depoimento sentado no sofá, Mateus
  + convidado + cachorro, sobre ganhar R$100.000,00): é um depoimento falado
  contínuo do início ao fim, varredura fina em 0-20s, 60-100s, 100-140s,
  140-165s e 165-181s (fim) não encontrou nenhuma janela limpa além de
  frames pretos de transição (não utilizáveis como b-roll). Esse formato
  (entrevista estática em sofá) é estruturalmente diferente da "ação social
  na rua" que gera bons takes — mesmo sem a legenda, o enquadramento estático
  e repetitivo (plano fixo dos dois sentados) teria baixo valor como b-roll.

**Decisão:** nenhum take foi extraído de video2 ou video3. Os 3 takes
produzidos vêm todos de **video1**, que é estruturalmente diferente dos
outros dois — tem a legenda concentrada nos trechos em que o apresentador
fala direto pra câmera, com pausas reais (sem narração) nos momentos de
abraço, chegada do carro e despedida, que é exatamente onde os takes abaixo
foram extraídos.

## Takes produzidos

Todos os cortes foram validados no nível de frame nativo (1/30s) nos pontos
de entrada e saída — não apenas por amostragem a cada 1s/6s, que mostrou ser
enganosa (ver nota técnica no fim). Re-encodados com `libx264 -crf 17` (não
`-c copy`) porque os keyframes do arquivo fonte caem a cada 1s exato, o que
não bate com os pontos de corte precisos encontrados.

### take1_video1-fonte_sem-texto_20261008.mp4

- **Fonte:** video1, corte **10,8s – 18,4s** (7,6s).
- **Arco:** dois homens conversando animadamente ao lado do caminhão-guincho
  que carrega o carro (um Volkswagen Parati) → transição natural para um
  abraço caloroso e prolongado, genuíno, dura o resto do corte. Caminhão
  branco "24h" e adesivo com telefone "(11) 98156-1271" visíveis no fundo
  (identidade de negócio, mesmo sem logo Garantido explícito).
- **Por que esse trecho:** é o bloco contínuo mais longo sem legenda
  cravada em todo o material (7,6s) — cobre uma pausa real na narração que
  coincide com o pico emocional da cena (o abraço). Checado a 1/30s: o
  trecho imediatamente anterior (9,0-10,7s) tinha o texto "MARAVILHOSA," /
  "NÉ?" ainda cravado; o corte começa só depois do texto sumir
  completamente. O final (18,4s) é o último frame bem iluminado antes do
  fade para a cena seguinte (que começa a escurecer a partir de ~18,6s).

### take2_video1-fonte_sem-texto_20261008.mp4

- **Fonte:** video1, corte **42,2s – 49,3s** (7,1s).
- **Arco:** homem sob uma palmeira na calçada, gesticulando/batendo palmas
  animadamente olhando para a rua → corte duro para o carro (Parati prata)
  sendo guinchado, chegando na rua com o braço de alguém pra fora da janela
  → o guincho estaciona, pessoas se reunindo ao fundo. Adesivo "(11)
  98156-1271" bem legível na traseira do guincho no frame final.
- **Por que esse trecho:** segunda janela limpa mais longa do material —
  mostra a "chegada" do prêmio, complementa o take1 (que é o momento do
  abraço/entrega) com o momento anterior de expectativa. Checado a 1/30s: a
  amostragem inicial a cada 1s/0,25s indicava erroneamente que o trecho
  limpo começava em 42,0s; a checagem nativa revelou que o texto "ACREDITA E
  PARTICIPA." ainda estava cravado até ~42,13s (um corte de cena no meio do
  segundo escondeu o problema na amostragem grosseira). Corte ajustado para
  começar em 42,2s com margem de segurança. Fim em 49,3s, pouco antes do
  texto "AÍ" aparecer (~49,43s).

### take3_video1-fonte_sem-texto_20261008.mp4

- **Fonte:** video1, corte **55,0s – 58,5s** (3,5s).
- **Arco:** os dois homens de braço dado/abraçados pelo ombro, sorrindo,
  parados em frente a uma construção → se separam, terminando com um gesto
  de "combinado"/soco no ar de ambos os lados. Trecho mais curto dos três,
  mas visualmente coeso e com expressão genuína.
- **Por que esse trecho:** é a terceira (e última) janela limpa de duração
  utilizável (>2s) em todo o video1 — as demais pausas sem legenda
  encontradas (ex.: 66,0-67,5s, plano aberto do carro parado na rua) tinham
  menos de 2s e foram descartadas por serem curtas demais pra uma peça de
  anúncio. Checado a 1/30s: o início real é logo após uma transição com
  efeito de brilho/swirl colorido (que carrega o texto "MEU IRMÃO.") — o
  corte começa só depois do efeito visual terminar completamente (~55,0s),
  não apenas depois do texto sumir (~54,7s), pra evitar entregar um frame
  com artefato de transição. O fim (58,5s) é o último frame antes do texto
  "SÓ" aparecer.

## Nota técnica: amostragem grosseira pode enganar

Durante a varredura, amostragem por filtro `fps=N` (resample sintético)
ocasionalmente selecionou o frame errado perto de cortes de cena, fazendo
um ponto parecer "limpo" quando na verdade ainda tinha texto cravado a
poucos frames de distância (ex.: o falso "42,0s limpo" do take2). Todo
ponto de corte final foi revalidado extraindo frames nativos (passo de
1/30s, sem resample) nos arredores de cada fronteira antes de cortar o
arquivo definitivo.

## Frames temporários

Todos os frames extraídos para análise (contact sheets, verificações
frame-a-frame) foram gerados em diretório de scratch temporário e
descartados — não fazem parte deste repositório.

## Próximos passos

- [ ] `@ladeira` definir copy de anúncio para os 3 takes (fora do escopo
  deste documento)
- [ ] Decidir zona segura de texto (Stories/Reels/Feed) seguindo o mesmo
  método usado no Império (`campanha-1-whitelist-social/README.md` v2, zona
  y≈420–1500)
- [ ] Configurar `brand-config.yaml` da Garantido Prêmios em
  `squads/virals-marketing-squad/data/clients/garantido-premios/` se o
  pipeline `apps/video-studio` for usado pras próximas levas
