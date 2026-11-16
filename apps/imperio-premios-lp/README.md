# Landing Page — Império Prêmios (pré-lander "white")

Página de consciência/marca pro cliente Império Prêmios, pensada pra receber
tráfego dos criativos "ação social" (ver
`squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/creatives/campanha-1-whitelist-social/`)
em vez de mandar direto pro checkout — funil mais "white", menos sujeito a
reprovação em categoria gambling.

Copy por `@ladeira` (nível de consciência unaware→problem_aware, história +
curiosidade no vídeo, revelação na página). Estatísticas financeiras
(R$7,4 mi, 164 mil participações) foram **removidas da LP** na revisão de
2026-10-06 por serem agressivas demais — seguem disponíveis em
`squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/brief.yaml`
(`dados_90_dias`) pra uso em outros materiais, mas não aparecem mais nesta
página.

## Stack

HTML/CSS puro, zero build step, zero dependência externa além da fonte
(Google Fonts — Montserrat, mesma família já usada nos outros brand-configs
do projeto). Decisão deliberada: é 1 página só, framework seria overhead
desnecessário e carregamento mais lento (importa pra Quality Score do
anúncio e pra não perder lead por demora).

## Status dos itens pendentes (atualizado 2026-10-06)

Os 3 placeholders originais foram resolvidos:

1. **Link do grupo** — resolvido. CTA primário aponta pro link real:
   `https://sndflw.com/i/qPe9SdzUFYZGCwzfo32p`.
2. **Razão social / CNPJ no rodapé** — **removido por decisão explícita do
   founder** (não é placeholder pendente, é omissão deliberada: "para
   rodapé não iremos informar razão social nem cnpj"). Não reintroduzir sem
   nova instrução.
3. **Links de Termos e Política de Privacidade** — resolvido. Páginas
   próprias criadas (`termos.html`, `privacidade.html`), linkadas no
   rodapé. Conteúdo não copia o site oficial — é uma política própria desta
   landing page (LGPD, escopo do Pixel, sem formulário de dados pessoais).

Logo do cliente também já substituiu o crown em SVG recriado
(`logo.png`, fundo removido, ver header).

Pixel (CAPI client-side) já está configurado com o Pixel ID real
(`2276849516022676`, mesmo de `services/Meta/imperio-premios/`) — dispara
`PageView` automático e evento `Lead` no clique do CTA do grupo. Isso fecha o
pré-requisito da Campanha 3 (Retargeting) do `campaign-plan-wave1.md`.

## Pendência conhecida

A logo do header é composta (imagem da coroa real + "IMPÉRIO PRÊMIOS" como
texto HTML estilizado) porque o arquivo de logo enviado pelo cliente
(`239b4086-7002-4d46-afc2-947fa9de515a.jpg`) contém **só a coroa** —
conferido pixel a pixel, não há texto embutido nele. Se o cliente tiver um
lockup horizontal completo (coroa + escrita numa imagem só), trocar
`apps/imperio-premios-lp/logo.png` e remover o `<span class="logo-text">`
do header nas 3 páginas.

## Verificação feita

Testado em viewport largo (560px, renderiza perfeito — cores, hierarquia,
CTAs, logo real). **Mobile confirmado pelo founder via DevTools real**
(2026-10-06): texto quebra corretamente, layout íntegro. A suspeita inicial
de bug de quebra de texto em mobile era limitação do
`chrome --headless --screenshot` (CLI), não da página — confirmado como
falso-positivo depois que os prints reais chegaram.

## Deploy (Vercel) — ao vivo

**URL de produção: https://imperio.vercel.app** (link oficial, sem "premios")

Projeto renomeado de `imperio-premios-lp` pra `imperio` em 2026-10-06, a
pedido do founder. `imperio-premios-lp.vercel.app` continua existindo e
respondendo (mesmo deploy), mas não é mais o link a divulgar.

**Nota de infra (2026-10-06):** o alias `imperio.vercel.app`, por não ser o
domínio original do projeto, nasceu atrás da proteção "Vercel
Authentication" (SSO) do próprio Vercel — ficava redirecionando pra
`vercel.com/sso-api` e bloqueava qualquer visitante real, inclusive tráfego
de anúncio. **O founder desativou manualmente em Project Settings →
Deployment Protection → Vercel Authentication** (ação de segurança, feita
por ele — não automatizável por mim). Confirmado público (200 OK) depois
da desativação.

Projeto linkado ao org `team_9PskGSSpzKF9gw5gpQDqesyL` (mesmo usado em
`apps/captura_ia`), deploy feito em 2026-10-06 após confirmação explícita
do founder (placeholders resolvidos, copy revisada e aprovada).

Pra atualizar depois de qualquer edição no HTML:

```bash
cd apps/imperio-premios-lp
vercel --prod --yes
```

**Importante:** `imperio.vercel.app` NÃO acompanha deploys automaticamente
(é um alias manual, diferente do domínio original do projeto). Depois de
TODO `vercel --prod`, repassar o alias pro deploy novo:

```bash
vercel alias set <url-do-deploy-que-apareceu-no-output> imperio.vercel.app
```

## Histórico de revisão de copy (2026-10-06)

- **v1:** headline "Agora vem ver os números" + cards grandes de estatística
  (R$7,4 mi / 164 mil) em destaque. Validado com o cliente e considerado
  **agressivo demais** — "muito flash com números altos".
- **v2:** headline mais institucional ("Agora vem conhecer por dentro"),
  cards de estatística removidos, seção "Como funciona" com mecânica em
  termos gerais (100 números, resultado em horários fixos, mais de um
  ganhador por rodada) — **sem** citar "jogo do bicho" por nome e **sem**
  valores de prêmio em R$ (achado/decisão registrados em `gates-status.yaml`).
- **v3 (atual):** dois ajustes do founder/cliente:
  1. **Remoção da marca "Prêmios"** — toda a página (título, header, copy,
     footer) e as páginas de termos/privacidade passaram a usar só
     "Império", sem a palavra "Prêmios". Também trocado "Jogue com
     responsabilidade" → "Participe com responsabilidade" e "garantia de
     ganhos/prêmio" → "garantia de retorno" nos 3 arquivos — removendo
     linguagem que soa mais a cassino/aposta do que a comunidade/promoção.
  2. **Compactação pra 1 dobra só** — pedido explícito do cliente por áudio
     (`WhatsApp Ptt 2026-10-06 at 12.42.21.ogg`, transcrito via Whisper
     local): a página não pode ter barra de rolagem, o botão de ação tem
     que estar visível assim que a página carrega. Implementado via
     `body { height:100dvh; overflow:hidden; display:flex;
     flex-direction:column }` com `main` centralizado verticalmente
     (`flex:1; justify-content:center`); seção "Como funciona" virou uma
     fileira de pills compactos em vez de 3 cards empilhados; seção
     "bridge" (redundante com os CTAs) foi cortada; tamanhos de fonte usam
     `clamp()` com unidade `vh` pra encolher em telas baixas. Testado via
     screenshot headless em várias alturas (560×900 até 560×480, pior caso
     de browser in-app) — cabe sem corte em todas. **Verificação de largura
     estreita (<480px) tem a mesma limitação conhecida da ferramenta
     headless já documentada nesta sessão** (clipa texto horizontalmente
     de forma incorreta em janelas estreitas) — testado em 560px onde a
     ferramenta é confiável e funciona perfeito; abrir num celular real
     antes de validar 100% com o cliente.
- **v4:** o `justify-content: center` do v3 deixava o bloco de conteúdo
  "flutuando" no meio da tela, com dois vazios simétricos grandes (acima e
  abaixo) em viewports altos — reportado pelo founder via print real de
  DevTools como "estética estranha, amontoada/quebrada". Trocado para
  `justify-content: flex-start` + padding-top responsivo (`clamp(vh)`) no
  `main`, e `.wrap` virou flex column com `gap` explícito entre
  hero/pills/CTA (antes dependia de margem implícita, difícil de prever).
  Resultado: conteúdo ancora logo abaixo do header, e qualquer sobra de
  espaço em telas altas vira um único vazio natural acima do footer, em
  vez de dois vazios simétricos. Confirmado via print real do founder que
  o problema era genuíno (não artefato da ferramenta headless, diferente
  das vezes anteriores) — corrigido e revalidado em 560×480 até 560×930.
- **v5:** dois ajustes a partir de novo print real do founder. (1) O glow
  laranja (`radial-gradient`) estava escopado em `.hero`, que não fica mais
  colada no header — efeito parecia "quebrado"/desconectado. Movido pro
  `body` com tamanho de elipse explícito (`120% 42% at top`), assim o glow
  sempre emana de trás do header independente de onde o `.hero` cai no
  fluxo. (2) Pedido de preencher o vazio grande abaixo dos CTAs com mais
  contexto pro lead frio: adicionado `proof.jpg` (frame real de
  `takes-base/`, ação de distribuição na comunidade) + legenda curta,
  entre os pills e os botões — reordena a leitura pra hero → mecânica →
  prova social → CTA. Todo o dimensionamento (imagem, paddings, gaps, botão)
  usa `clamp()` com `vh` pra continuar cabendo numa dobra só em alturas
  curtas — reajustado e revalidado em 560×480 depois que a foto inicialmente
  cortou os botões nessa altura.
- **v6 (atual):** founder rejeitou a foto ("não quero o take") e pediu
  explicitamente que o botão fique colado no rodapé, com a copy e os pills
  de destaque distribuídos no espaço disponível — não um bloco fixo no
  topo. Removida `proof.jpg`/`.proof`. `main > .wrap` trocou `gap` fixo +
  `flex-start` por `justify-content: space-between` com `flex:1` — os 3
  blocos (hero, pills, CTA) se distribuem proporcionalmente ao espaço
  disponível automaticamente: expandem em telas altas, comprimem em telas
  curtas, sem precisar recalibrar `clamp()` a cada ajuste de conteúdo.
  Revalidado em 560×480 até 560×930 sem corte, CTA sempre encostado no
  rodapé.
- **v7 (atual):** founder pediu 3 ajustes a partir de 2 prints (um do estado
  atual, outro — mais antigo, de celular real — mostrando o formato
  "Como funciona" + parágrafo-ponte que queria de volta). (1) Links do
  rodapé (Site/Termos/Privacidade) centralizados — rodapé virou
  `flex-direction:column` com uma linha própria pros links
  (`justify-content:center`), antes dividiam linha com o texto legal e
  ficavam alinhados à esquerda. (2) Espaço maior entre rodapé e o botão
  "Ver o que está disponível agora" — `main`'s padding-bottom subiu de
  quase 0 pra `clamp(12px,2.5vh,28px)`. (3) Trouxe de volta o conteúdo
  completo "Como funciona" (título + 3 cards com frase inteira, não só
  pills) + o parágrafo-ponte ("Tudo começa com uma ideia simples...") no
  espaço entre a hero e o CTA — `main > .wrap` passou a distribuir 4 blocos
  (hero/como-funciona/ponte/cta) em vez de 3. Como esse conteúdo é bem mais
  denso que os pills, o `clamp()` de fonte/padding dos cards e do parágrafo
  precisou ficar bem mais agressivo (chega a ~9-9.5px nas alturas mais
  curtas) pra ainda caber sem corte em 560×480 — testado e confirmado.

## Termos e Privacidade — reescritos genéricos (2026-10-06)

Pedido explícito do founder: deixar `termos.html` e `privacidade.html`
**bem discretas e "white"**, totalmente generalistas, sem mencionar que se
trata de sorteios — só o básico de uma página de conteúdo/comunidade
qualquer, direcionando pro site oficial e pro grupo. Objetivo: reduzir ao
máximo risco de flag do Meta (a própria página de termos é parte do que o
review de anúncio pode inspecionar, então "regulamento de sorteio",
"resultado aleatório", "jogo responsável" etc. nela são tão arriscados
quanto na LP principal).

- `termos.html`: removida inteiramente a seção "Regulamento dos sorteios",
  trocada "Participação responsável" (que falava de "quanto gasta"/
  "frequência que participa") por um "Limitação de responsabilidade"
  genérico, "Resultados" removida, título passou de "Termos de Uso e
  Regulamento" pra só "Termos de Uso". Zero menções a sorteio/resultado/
  ganhador/dezena/jogo/aposta — confirmado por grep antes do deploy.
- `privacidade.html`: já era majoritariamente genérica (disclosure de
  Pixel + direitos LGPD); só a seção 2 citava o texto antigo do botão "Ver
  sorteios disponíveis" (já desatualizado desde a revisão de copy) —
  generalizada pra "os botões desta página levam você pro site oficial ou
  pro grupo", sem nomear a natureza do destino.
