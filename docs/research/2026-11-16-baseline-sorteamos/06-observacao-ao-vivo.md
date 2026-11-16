# Observação ao vivo — 2026-11-16

Coletado no Chrome do founder, **usando a sessão dele já autenticada**. Nenhum login novo,
nenhuma escrita na plataforma, nenhum download disparado. A flag de pausa estava ativa (jobs
agendados parados), que é a condição segura para navegar.

Marcador: `[AO VIVO]` = visto na tela ou na aba Network · `[BUNDLE]` = extraído do JavaScript
público do painel (`/static/js/main.f3cc4599.js`, 4,7 MB) · `[INFERIDO]` = dedução, marcada como tal.

---

## 1. Arquitetura — dois domínios, um template

`[AO VIVO]` O painel é um **SPA React criado com Create React App**, servido de
`painel.rapidinhas24hr.com`, consumindo `api.rapidinhas24hr.com`. Domínios separados.

`[AO VIVO]` Ele é construído sobre o **Minimal UI** — template React admin comercial. As provas:
fonte Public Sans, ícones `assets/icons/navbar/ic_dashboard.svg`, `ic_ecommerce.svg`,
`ic_banking.svg`, `ic_analytics.svg`, `ic_mail.svg`, a ilustração
`illustration_empty_content.svg`, e no bundle a rota de demonstração `/user/reece-chung/edit`.

**Isto é a resposta para "paridade visual idêntica":** a identidade visual da Sorteamos *é* o
Minimal UI com uma paleta verde por cima. Reconstruir à mão é refazer um template que se compra.
Decisão de arquitetura, não de implementação.

`[AO VIVO]` Logo servido de `/logo/sorteamos_logo_2.png` — o Império é white-label sobre a
Sorteamos, como esperado.

`[AO VIVO]` Mídia dos sorteios em **`sp1-s3.saveincloud.io/imperiopremioss-x80ub8/`** —
armazenamento S3-compatível na SaveInCloud. O lotemania precisa de equivalente; hoje
`products.imageUrl` é só uma string de URL.

---

## 2. Analytics não é uma feature — é o demo do template

`[AO VIVO]` A tela `/dashboard/analytics` mostra **dados fictícios do Minimal UI, intocados**:

| Cartão | Valor exibido |
|---|---|
| Weekly Sales | 714000 |
| New Users | 1352831 |
| Item Orders | 1723315 |
| **Bug Reports** | **234** |

Mais o gráfico "Website Visits" com séries **"Team A / Team B / Team C"** e eixo em **Jan '03 a
Oct '03**, e uma pizza "Current Visits" dividida em América, Ásia, Europa e África. O cabeçalho
diz "Hi, Welcome back".

**Nenhum número ali vem do Império.** É andaime do template que nunca foi removido.

**Consequência para o epic:** paridade de Analytics significaria clonar andaime morto. A tela
`analytics` do lotemania, com suas 20 linhas, já é mais honesta que a original. Isto **elimina**
a story de paridade de Analytics e a substitui por uma decisão de produto: construir analytics de
verdade, ou remover o item da barra lateral.

---

## 3. Relatórios (item da barra lateral) — três tipos, não cinco

`[AO VIVO]` Formulário de quatro campos: **Tipo de Relatório**, **Sorteio** (padrão "Todos
Sorteios"), **Data de Início**, **Data de Fim**, e o botão **Gerar Relatório**.

`[AO VIVO]` Os valores do seletor, lidos da árvore de acessibilidade:

| Rótulo | `value` |
|---|---|
| Vendas por Dia | `sales_by_day` |
| Top 10 Compradores | `top10_buyers` |
| Top 10 Regiões | `top10_regions` |

Somados aos três exports do menu por sorteio (Vendas, Expirados, Participantes), são **seis
saídas distintas** no total — resolve parte da confusão de contagem do documento 05.

---

## 4. A superfície completa da API — 104 endpoints

`[BUNDLE]` Extraídos do JavaScript do painel. O nosso ETL usa **três**. A plataforma expõe 104.

### Pagamento — 19 gateways

`apipay` · `authbank` · `avexpay` · `basspago` · `codetech` · `e2pay` · `efipay` · `fyhub` ·
`hyperwallet` · `infopago` · `metapay` · `mutualpay` · `nexo` · `onlyup` · `paggue` · `pagstar` ·
`pay2m` · **`paysure`** · `resetpay` · `starkbank`

Cada um com `/api/{gateway}/webhook` ou `/webhook/register`.

`[BUNDLE]` **A configuração da `paysure` — o gateway real em produção — é `clientId` +
`clientSecret`.** O enum do lotemania tem 18 provedores e **não inclui `paysure`**, o que
significa que hoje ele não consegue sequer representar o gateway que o cliente usa.

### Meta Ads nativo — não sabíamos disto

```
/api/meta-ads
/api/meta-ads/config
/api/meta-ads/active
/api/meta-ads/fetch-account-ids
/api/meta-ads/associate-account-ids
```

`[INFERIDO]` A plataforma tem integração nativa com Meta Ads, com associação de contas de
anúncio. **Isto muda o enquadramento da story LTM-04**: parte da atribuição pode já existir do
lado da plataforma e não estar sendo usada — ou ser exatamente o caminho pelo qual os campos de
UTM deveriam ser preenchidos e não são. Precisa de observação dirigida antes de desenhar.

### Comunicação e integrações

`z-api` e `wizebot` (ambos WhatsApp, com `/template`, `/template/` e `/test/send`) ·
`onesignal` (+ `/push`) · `paposms` · `liguelead` · `dxmidia` · `nexopro` · `captcha`

### Webhooks de saída

`/api/webhooks` · `/api/webhooks/create` · **`/api/webhooks/payload-examples`**

O último é ouro: a plataforma documenta os próprios payloads de saída. É o contrato que o
`order.paid` do nosso `webhook-imperio-capi` consome.

### Jogos bônus — confirmam o modelo do lotemania

`/api/product/awardedBox/` · `/api/product/rewardSpin/` · `/api/product/scratchCard/`, cada um
com `/combos/`, mais `/api/awardedBoxCombo/`, `/api/rewardSpinCombo/`, `/api/scratchCardCombo/`.

O lotemania já modelou os três com suas tabelas de combo. **Paridade estrutural confirmada aqui.**

### Títulos premiados

`/api/products/update-awarded-numbers-order` e `/api/product/b-numbers/` `[INFERIDO: b-numbers =
blocked numbers]`.

### Outros

`/api/settings/all` · `/api/settings/theme/` · `/api/settings/social-medias` ·
`/api/settings/required-fields/password` · `/api/user/`, `/api/user/by/`, `/api/users`,
`/api/users/affiliates` · `/api/banking/transactions`, `/api/banking/transactions/external` ·
`/api/banks`, `/api/bank/create` · `/api/capitalizers` · `/api/discount-links` ·
`/api/contacts` · `/api/faqs` · `/api/payment-requests` · `/api/blockedNumber/` ·
`/api/client/home` · `/api/auth/login/client` (login do comprador, distinto do operador) ·
`/api/account/register` · `/api/upload/pdf`

### Restos do template, ainda no bundle

`/api/kanban/*` · `/api/mail/*` · `/api/chat/*` · `/api/calendar/events*`

Nenhum pertence ao domínio de sorteios. São módulos de demonstração do Minimal UI que ficaram.
**Não entram na paridade.**

---

## 5. Correção ao nosso próprio ETL

`[AO VIVO]` A chamada real do painel:

```
GET /api/products?page=0&rowsPerPage=5
    &filters={"title":null,"status":"all","privacy":"all","drawDate":null,"category":"all"}
```

O `client_api.py` envia quatro chaves em `filters`; **o painel envia cinco — inclui `category`**.
Não sabemos se a ausência altera o resultado. Vale verificar: a lição do `page=0` mostra que uma
diferença silenciosa de parâmetro nesta rota já custou 75% da captura.

---

## 6. Inventário de telas do SPA

`[BUNDLE]` As rotas do frontend — o conjunto que a paridade precisa cobrir:

```
/dashboard · /dashboard/invoice/list · /dashboard/user/profile
/products · /products/ · /products/new
/orders
/affiliates · /affiliates/
/banks · /banks/ · /banks/new · /bank-account · /banking · /banking/transactions/external
/reports
/user · /user/ · /user/list · /user/new · /user/account · /user/cards · /user/profile
/settings/about · /settings/analytics · /settings/params · /settings/themes
/settings/terms · /settings/privacy · /settings/faqs · /settings/faqs/new
/settings/social-medias · /settings/philanthropy · /settings/certificate
/settings/capitalizer/banner · /settings/cashout · /settings/payment-errors
/settings/release-notes · /settings/security-blocks
```

Duas que o lotemania **não tem** e que não estavam no mapa anterior:
**`/settings/payment-errors`** e **`/settings/security-blocks`**.

---

## 7. O que continua não observado

Não cliquei em nada que gerasse arquivo ou alterasse estado. Continuam pendentes, e agora com
alvo mais preciso:

| Item | Por que ainda falta |
|---|---|
| Rota de export dos 3 relatórios por sorteio | Não aparece como endpoint no bundle principal; pode estar em chunk lazy ou ser montada no cliente |
| Modal de Faturamento e "Revisar pagamentos" | Exigem abrir o menu de um sorteio específico |
| `friendlyURL` editável ou gerado | Exige abrir o formulário de criação |
| Horário Premiado e Ativar títulos premiados | Exigem abrir as ações de um sorteio ativo |
| As 14 abas do editor de sorteio | Exigem abrir um sorteio em edição |
| `/api/meta-ads/config` — o que configura | **Novo item, alta prioridade**: pode mudar a LTM-04 |

Todos são de leitura e podem ser feitos numa passada com o founder junto ou com autorização
explícita para clicar.
