# Criativos — Campanha 1 (retomada "white") — Ação Social

**Contexto:** a leva anterior (`creatives/campanha-1-advantage-vendas/`) foi
**reprovada em todos os 5 anúncios** — cliente confirmou que esses materiais
(telas diretas do app de apostas) são sinalizados/conhecidos por causar
rejeição na categoria gambling. Ver `gates-status.yaml` (2026-10-06).

**Nova estratégia:** usar b-roll de ação social real da empresa (distribuição
de presentes numa comunidade, registrado em vídeos enviados pelo cliente) +
texto sobreposto, sem mostrar a interface de apostas. Fonte: 3 vídeos em
`Downloads/video.mp4`, `video (1).mp4`, `video (2).mp4` — análise completa de
trechos limpos (sem legenda pré-existente) feita em 2026-10-06.

## Criativos produzidos

### v1 — `comunidade_nao-sorteia-so-premio_video_20261006.mp4` (1080×1920, 13s)

- **Fonte:** `video.mp4`, corte 59s–72s (trecho limpo, sem texto cravado).
  Arco: pessoas sorrindo caminhando → homem com camisa "Império" visível →
  entrega de presente pela janela do carro → criança com presente →
  multidão reunida. Melhor sequência contínua dos 3 vídeos analisados —
  mostra marca, ação e escala numa única tomada, sem corte.
- **Texto:** aparece a partir de 3s (depois do gancho visual inicial),
  Arial Bold 66px, branco com contorno preto, terço inferior, SEM caixa de
  fundo (texto solto sobre o vídeo).
- **Copy:** *"A gente não sorteia só prêmio."*

### v2 — `comunidade_100numeros-sorte_video_20261006.mp4` (1080×1920, 13s)

- **Mesma fonte/corte** de v1 (`video.mp4`, 59s–72s).
- **Feedback do founder (2026-10-06) que gerou esta versão:**
  1. Overlay de opacidade escura atrás do texto, pra destacar sobre o vídeo.
  2. Texto não pode ser cortado em nenhum posicionamento/enquadramento do
     Meta nem sobreposto por elementos de interface (like/comment/share).
  3. Copy nova: *"100 números e o da sorte pode ser o seu 🍀"*.
- **Zona segura calculada:** fonte é 1080×1920 (9:16). O corte mais apertado
  entre os posicionamentos do Meta é o quadrado 1:1 (mantém só y=420–1500 do
  original); Stories/Reels cortam ~250px de UI no topo e no rodapé. A
  interseção das duas restrições dá uma janela segura de y≈420–1500 — o
  texto foi centralizado em `y=h*0.58` (≈1113px), dentro dessa faixa com
  margem dos dois lados.
- **Implementação:** `ffmpeg drawtext` com `box=1:boxcolor=black@0.55:boxborderw=26`
  — resolve o pedido 1 (caixa escura semi-transparente atrás do texto,
  largura auto-ajustada ao texto) no mesmo filtro que já desenha o texto.
- **Limitação técnica encontrada:** `ffmpeg drawtext` não renderiza emoji
  colorido (só glifos monocromáticos da fonte) — o 🍀 foi omitido do
  overlay renderizado. Copy final em texto: *"100 números e o da sorte pode
  ser o seu"*. Se o emoji for importante na peça, precisa do pipeline
  `apps/video-studio` (Remotion/Canvas, renderiza emoji nativo) em vez do
  ffmpeg direto.
- **Verificado visualmente** (frame extraído em t=6s): caixa escura
  renderiza atrás das 2 linhas, texto acentuado ("números") correto, sem
  corte, dentro da zona seguro calculada.

**v1 permanece no repositório** como registro da primeira iteração (sem
caixa/zona-segura) — decisão de qual versão vai pro Ads Manager é do
founder; v2 incorpora todo o feedback mais recente e é a recomendação atual.

## Copy — decisão do `@ladeira`

Nível de consciência do lead: **unaware** (quem vê o vídeo rolando o feed
não busca nada relacionado a sorteio). Regra de copy nesse nível: história,
big idea, curiosidade — nunca oferta.

**Escolhida:** *"A gente não sorteia só prêmio."*

Por quê esta e não as variações anteriores: é a única opção que planta a
palavra **"sorteia"** no espectador sem nunca formar a frase completa
"sorteio de dinheiro" — funciona como gatilho de reconhecimento pra quem já
viu a marca, e como curiosidade pura pra quem não viu. CTA não é botão no
vídeo (formato orgânico/feed) — a landing page (ver
`../../landing-page-reference.md` ou pasta do app quando publicada) é quem
fecha a mensagem.

**Variações descartadas** (registradas pra não repetir o mesmo raciocínio
depois): "Isso também é Império" (fraca — não ancora em nada), "Toda semana
tem um motivo pra voltar aqui" (vaga demais, não direciona).

**v2 — copy sugerida pelo founder** (não veio do `@ladeira`, mas segue o
mesmo princípio de nível de consciência): *"100 números e o da sorte pode
ser o seu"*. Avaliação: funciona porque menciona "números" e "sorte" sem
nunca formar a frase completa "sorteio de dinheiro/prêmio em dinheiro" —
direciona o nicho (quem já associa a marca a números/sorte reconhece na
hora) sem ser explícito o bastante pra soar como anúncio de aposta. Mesmo
princípio da v1, ângulo mais direto.

## Próximos passos

- [ ] Produzir 2-3 variações adicionais a partir dos outros trechos limpos mapeados (`video (1).mp4` 46-107s, `video (2).mp4` inteiro) pra ter opção de teste
- [ ] Configurar `brand-config.yaml` do Império Prêmios em `squads/virals-marketing-squad/data/clients/imperio-premios/` pra habilitar o pipeline real do `apps/video-studio` (Remotion) nas próximas levas — resolve a limitação de emoji e dá mais controle de estilo do que o ffmpeg direto
- [ ] Decidir entre v1/v2 (ou subir as duas como teste A/B) e subir no Ads Manager com destino = landing page nova (`apps/imperio-premios-lp/`), não mais o site de checkout direto
