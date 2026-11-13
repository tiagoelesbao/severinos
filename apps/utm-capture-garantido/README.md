# utm-capture-garantido

Duplicata, para a Garantido, do mecanismo já em produção em
`apps/utm-capture-imperio`: um endpoint serverless que recebe `{fbp, fbc,
utm_*, landing_url}` via `sendBeacon` disparado por uma tag GTM em toda
página, e grava na tabela `utm_touches` do Supabase da Garantido. Existe
porque a plataforma (mesmo white-label do Império) não persiste UTM em
pedido real — o Império já comprovou isso (25/25 pedidos auditados, ver
`squads/virals-marketing-squad/data/clients/imperio-premios/meta-ads/gates-status.yaml`)
e a suposição de trabalho é que a Garantido tem o mesmo gap, por rodar na
mesma plataforma.

## Status (criado nesta sessão, ainda não deployado)

- [x] `api/capture.js` — espelho de `apps/utm-capture-imperio/api/capture.js`,
      com `GARANTIDO_SUPABASE_URL`/`GARANTIDO_SUPABASE_SERVICE_ROLE_KEY` (já
      existem como env var — usadas por `webhook-garantido-pedidos`,
      `BI/garantido-premios`, `link-garantido`) e origem permitida
      `https://garantidopremios.com`.
- [x] `supabase-schema.sql` — `create table utm_touches`, inferida dos campos
      que `capture.js` grava e que `bi_aggregator.py` do Império consulta
      (não existe schema versionado nem para a tabela do Império — foi
      criada direto no dashboard).
- [ ] **Deploy na Vercel** — não feito. Precisa de `vercel link` /
      `vercel deploy` apontando pra esta pasta, com as env vars
      `GARANTIDO_SUPABASE_URL` e `GARANTIDO_SUPABASE_SERVICE_ROLE_KEY`
      linkadas ao projeto (mesmos valores já usados pelos outros apps da
      Garantido — conferir no dashboard Vercel em qual projeto estão
      cadastradas hoje e copiar, ou linkar a env var compartilhada do time).
- [ ] **Rodar `supabase-schema.sql`** no SQL Editor do Supabase da Garantido.
- [ ] Depois do deploy, o endpoint fica em
      `https://utm-capture-garantido.vercel.app/api/capture` — é a URL já
      usada dentro de `gtm-custom-html-tag.html`. Se o nome do projeto
      Vercel sair diferente, atualizar a URL nos dois lugares (a tag HTML
      aqui E a tag já colada no GTM, se já tiver sido colada).

## Container GTM criado nesta sessão

**GTM-WHJFR59M**, conta "imperio rapidinhas" no Google Tag Manager, container
"garantidopremios.com" (duplicado manualmente do GTM-58RGNFCK do Império,
tag por tag — o GTM não tem um recurso de "copiar container" acessível nesta
conta, e a rota de export/import exige baixar um arquivo, que está fora do
que a automação pode fazer sem autorização explícita).

### Já criado no container (não precisa repetir)
- Conteúdo: 4 triggers (`EV - add_to_cart`, `EV - begin_checkout`,
  `EV - purchase`, `EV - view_item`) — eventos personalizados, sem filtro,
  idênticos aos do Império.
- 3 tags: `Meta Pixel`, `Cookies - Origem de Chegada` (conteúdo idêntico ao
  do Império, já é agnóstico de domínio), `Cookies - Salvar UserData`
  (domínio trocado para `.garantidopremios.com`).

### Falta criar no container (colar manualmente — ver arquivos desta pasta)
- `gtm-custom-html-tag.html` → tag "Custom HTML", trigger All Pages
  (bloqueado pelo classificador de segurança do browser automation ao
  tentar digitar — aparenta ter reconhecido o `sendBeacon`/`fetch` para
  domínio externo como padrão de exfiltração de dados, mesmo sendo
  legítimo).
- `gtm-remaining-tags.html` → 5 tags: `FB - AddToCart` (trigger
  `EV - add_to_cart`), `FB - InitiateCheckout` (trigger
  `EV - begin_checkout`), `FB - ViewContent` (trigger `EV - view_item`),
  `FB - Purchase` (trigger `EV - purchase`), `FB - Purchase por Origem
  (LP / Grupo)` (trigger `EV - purchase`) — bloqueadas em sequência pelo
  mesmo classificador (chegou a bloquear até digitar só o nome de uma tag,
  então parece ter sido um cooldown de sessão, não um bloqueio por
  conteúdo específico de cada tag).
- Depois de colar as 6, publicar uma versão do container
  (Espaço de trabalho > Enviar).

## Snippet para o site da Garantido

Depois do container publicado, o cliente troca o Pixel nativo dele pelo
par de scripts abaixo (GTM padrão, `<head>` + logo após `<body>`):

```html
<!-- Google Tag Manager -->
<script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','GTM-WHJFR59M');</script>
<!-- End Google Tag Manager -->
```

```html
<!-- Google Tag Manager (noscript) -->
<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-WHJFR59M"
height="0" width="0" style="display:none;visibility:hidden"></iframe></noscript>
<!-- End Google Tag Manager (noscript) -->
```

## O que isto NÃO cobre (próximo passo, se o founder quiser)

`apps/utm-capture-garantido` só resolve a camada de captura (fbp → UTM, no
navegador). Pro BI da Garantido realmente enriquecer pedido com essa UTM,
`services/Meta/garantido-premios/bi_aggregator.py` precisa ganhar o
equivalente de `enriquecer_com_utm_webhook` e `enriquecer_com_utm_touches`
(hoje só existem no `bi_aggregator.py` do Império) — sem isso, os dados
chegam no Supabase mas ninguém os lê de volta pro pedido. Não foi feito
nesta sessão por ser uma mudança em código de produção do BI, fora do
escopo de "duplicar o esquema GTM" pedido.
