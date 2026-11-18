# As telas do painel, fora do editor de sorteio

**Data:** 2026-11-18, 19h–20h · Tudo **[OBSERVADO]** salvo onde marcado.
**Complementa:** `README.md`, `editor-14-abas.md`, `menu-lista-de-compras.md`

> ⚠️ **Nada de conteúdo pessoal neste documento.** As telas de Contatos e Usuários exibem nome,
> telefone, e-mail e CPF de compradores reais; a de Webhooks exibe um token de autorização em uso.
> Aqui ficam **estrutura, rótulos e volumes** — nunca valores. É o `AC8` da `LTM-19`, e este
> repositório é público.

## Mapa de rotas

| Sidebar | Rota | O que é |
|---|---|---|
| **GERAL** | | |
| Início | `/dashboard/app` | boas-vindas + avisos de segurança + carrossel de marketing |
| Sorteios | `/dashboard/products` | a lista (ver `README.md` §2) |
| Afiliados | `/dashboard/affiliates` | lista de afiliados |
| Bancos › Pagamentos | `/dashboard/transactions` | consulta de pagamento por Tx ID |
| Links De Desconto | `/dashboard/discount-links` | cupons/links com desconto |
| Relatórios | `/dashboard/reports` | os três relatórios de barra lateral |
| Contatos | `/dashboard/contacts` | mensagens recebidas de clientes |
| Usuários | `/dashboard/user/list` | base de compradores |
| **CONFIGURAÇÕES** | | |
| Integrações | `/dashboard/integrations` | 8 integrações |
| Capitalizadoras › Lista / Banner | — | **[NÃO OBSERVADO]** |
| Comunicados | `/dashboard/communications` | avisos para a loja |
| Perguntas Frequentes | `/dashboard/settings/faqs` | FAQ da loja |
| Analytics | `/dashboard/settings/analytics` | pixels e atribuição |
| Links UTM | `/dashboard/links` | links de campanha |
| Webhooks | `/dashboard/webhooks` | webhooks de saída |
| Redes Sociais | `/dashboard/settings/social-medias` | 3 campos |
| Certificado | `/dashboard/settings/certificate` | selo de certificação |
| Filantropia | `/dashboard/settings/philanthropy` | uma chave |
| Termos De Uso | `/dashboard/settings/terms` | editor de texto rico |
| Privacidade | `/dashboard/settings/privacy` | **[SUPOSTO]** mesmo padrão |
| Sobre | `/dashboard/settings/about` | **[SUPOSTO]** mesmo padrão |

---

## 1. Início — **o lotemania já é mais rico aqui**

O painel da Sorteamos **não tem métrica nenhuma na home**. O conteúdo é:

- Dois avisos de segurança, ambos **desligados nesta conta**:
  - *"Para aumentar a segurança da sua conta, ative a **autenticação de dois fatores (2FA)**"* → botão `Ativar 2FA`
  - *"A **proteção contra robôs (captcha)** está desativada. Ative para proteger o login, o cadastro e a consulta de números."* → botão `Ativar Captcha`
- *"Bem vindo de volta! Tiago ADS"*
- Carrossel `EM DESTAQUE` com cartões de marketing da própria Sorteamos: *10 milhões de números*,
  *Programa de Afiliados*, *Suporte Online*, *Títulos Premiados*

> **Achado de paridade invertida:** o `/dashboard/app` do lotemania mostra Visitas Hoje/Ontem/Total
> e números de operação. O da Sorteamos **não mostra nada disso**. Copiar a home da Sorteamos seria
> **piorar** o lotemania. É o primeiro caso em que a paridade estrita retrocede.
>
> **2FA e Captcha não existem no lotemania** — e são segurança de conta de operador e de loja.

## 2. Afiliados

Colunas: **Nome · Telefone · CPF · Código · Títulos · Compras · Faturamento · Status**
Filtros: `Nome` · `CPF` · `Telefone` · `Afiliado` · `Todos Sorteios` → `Pesquisar`
**Zero registros** — o Império não usa afiliados hoje.

## 3. Bancos › Pagamentos — `Transações Bancárias`

Busca por **`Tx ID *`** (obrigatório). Resultado: **TXId · E2EId · Nome · Telefone · Produto ·
Status · Data · Valor**.

> É uma ferramenta de **suporte**: o comprador diz "paguei", o operador busca pelo id da transação.
> O **`E2EId`** (end-to-end do PIX) é coluna de primeira classe — confirma a necessidade do campo
> que a `LTM-03a` criou em `banking_transactions`.

## 4. Links de Desconto

Colunas: **Título · Produto · Status · Qtd. Reservada · Qtd. Uso · Lim. Uso · Lim. por Usuário ·
Checkout · Desconto · Qtd de Títulos · Qtd Mínima** + `Novo Link De Desconto`.

Mapeia na tabela `discount_links` que o lotemania já tem. Zero registros.

## 5. Relatórios — e a confusão que o lotemania fez

**Três tipos, só:** `Vendas por Dia` · `Top 10 Compradores` · `Top 10 Regiões`
**Recorte:** sorteio (ou `Todos Sorteios`) + `Data de Início` + `Data de Fim` → `Gerar Relatório`

> ⚠️ **Existem DUAS famílias de relatório na Sorteamos, e o lotemania fundiu as duas numa só.**
>
> | Família | Onde | Quais |
> |---|---|---|
> | Barra lateral | `/dashboard/reports` | Vendas por Dia · Top 10 Compradores · Top 10 Regiões |
> | Menu do sorteio | lista de compras | Relatório de Vendas · de Expirados · de Participantes |
>
> O `reports.ts` do lotemania tem **cinco** tipos misturando as duas: `vendas_por_dia`,
> `relatorio_vendas`, `relatorio_expirados`, `relatorio_participantes`, `faturamento`. Falta
> `top10_buyers` e `top10_regions`; sobra a mistura. A `LTM-13` já tinha posto as da barra lateral
> em OUT — e agora se sabe exatamente quais são.

## 6. Contatos

551 mensagens. Cada uma: data/hora, texto, **selo de categoria** e o nome do remetente com seta
para o detalhe.

**Categorias observadas:** `OUTRO` · `VENDAS` · `SUPORTE` · `RECLAMAÇÃO`

Banner: *"Aqui estão todas as mensagens dos clientes que entraram em contato com você. Você pode
visualizar os detalhes de cada contato e **marcar como lido** quando tiver respondido."*

Mapeia na tabela `contacts` do lotemania. O **estado de lido** e a **categoria** são o que o
lotemania precisa conferir.

## 7. Usuários

**183.381 registros.** Colunas: **Nome · Telefone · Email · CPF · Afiliado · Função · Status · UF ·
Cidade · …** (a tabela rola na horizontal; há mais colunas à direita, **[NÃO OBSERVADO]**).
Filtros: `Função` · `Nome` · `CPF` · `Email` · `Telefone` (com seletor de país) · `Afiliado`.
Ações de cabeçalho: ícone de **exportar** e `+ Novo Usuário`.

Valores vistos: Função `Assinante`, Status `Ativo`. Código de afiliado aparece como selo.

> **183 mil compradores** é a escala real da base que uma migração teria de receber. É dado de
> dimensionamento, não de tela.

## 8. Integrações — oito

| Integração | Para quê |
|---|---|
| **ONESIGNAL** | notificações push |
| **Z-API WHATSAPP** | mensagens e automações por WhatsApp |
| **WIZEBOT WHATSAPP** | idem |
| **META ADS** | *"importar dados de campanhas e anúncios"* |
| **DX HUB** | pós-venda e relacionamento, WhatsApp Business API |
| **LIGUELEAD** | autenticação da consulta de números por **SMS** |
| **PAPOSMS** | idem |
| **CAPTCHA** | *"Proteja o login, a consulta de números e os cadastros contra robôs"* — **Cloudflare Turnstile** |

> O founder já declarou **z-api e wizebot fora de escopo** (2026-11-16). As outras seis **não foram
> decididas** — e **META ADS** chama atenção: importa dados de campanha, território que neste
> repositório é dos serviços em `services/Meta/`.

## 9. Analytics — a tela que a `LTM-04` precisa ler

| Campo | Observação |
|---|---|
| **Persistir UTMs por 24h** | chave — define a **janela de atribuição** |
| **Facebook Pixel ID** | *"Utilize vírgula `,` para separar mais pixels"* — **múltiplos** |
| **Facebook Token Conversion API** | idem, múltiplos |
| **Facebook Pixel - Enviar `purchase`** | duas opções: *"Quando conter FBC e não for de campanhas de links bio, group, community, stories"* · *"Enviar sempre"* |
| **Considerar `fbc` quando conter código de afiliado** | chave, com explicação própria na tela |
| **Ativar UTMify** | chave |
| **Google Analytics ID** · **TikTok Pixel ID** · **Kwai Pixel ID** · **Google Tag Manager ID** | um campo cada |

> **Isto é o escopo da `LTM-04` desenhado por quem já opera.** Cinco plataformas de pixel, token de
> CAPI guardado por conta, janela de UTM de 24 h, e uma regra de negócio explícita sobre o conflito
> entre `fbc` e código de afiliado — que é exatamente a pergunta "de quem foi a venda" que a
> atribuição existe para responder.
>
> O lotemania não tem **nenhum** destes campos.

## 10. Links UTM

Colunas: **Título · Content · Source · Cadastro** + menu ⋮ por linha. **11 registros** em uso.

Padrões reais observados (são configuração, não dado pessoal):

| Título | Content | Source |
|---|---|---|
| paid-social | `{{ad.id}}` | meta |
| Broadcast | Broadcast | Broadcasting |
| Hora do pix | horadopix | facebookads |
| Horário Premiado | community | awarded_hour |
| Anúncio | ads | campaign |

> **`{{ad.id}}` é macro da Meta**, resolvida no clique. Ou seja, o `utm_content` carrega o **id do
> anúncio** — é assim que a venda volta ao criativo. Dado direto para a `LTM-04` e para o BI.

## 11. Webhooks — webhook de **saída**

Colunas: **URL · Authorization · Assinaturas** + `Exemplos Payload` + `Novo Webhook`.

**Um configurado**, assinando o evento **`order.paid`**, apontando para um app em
`webhook-imperio-capi.vercel.app/api/order-paid`.

> 🔒 **O token de autorização está visível na tela e NÃO foi copiado para cá.**
>
> **O que a configuração revela:** quando um pedido é pago, a Sorteamos chama um serviço do próprio
> Império que repassa o evento para a **CAPI da Meta**. É a ponte de conversão — e o nome do app
> diz isso. Para o lotemania, significa que `outbound_webhooks` + `order.paid` **não são enfeite**:
> são o caminho pelo qual o Império otimiza campanha.
>
> `Exemplos Payload` promete o contrato do evento. **[NÃO OBSERVADO]** — vale abrir na próxima
> sessão, é o formato que o lotemania teria de emitir.

## 12. As telas de conteúdo

| Tela | Estrutura |
|---|---|
| **Comunicados** | lista `Título · Descrição` + `Novo Comunicado`. Zero registros |
| **Perguntas Frequentes** | lista `Título · Descrição` + `Nova Pergunta Frequente`. Zero registros |
| **Redes Sociais** | três campos: `Instagram` · `Facebook` · `Twitter` |
| **Certificado** | chave `É certificado?` + texto rico. *"Caso seja certificado de realizar sorteios, marque a opção e coloque o texto fornecido pelo provedor do certificado"* |
| **Filantropia** | uma chave: `Exibir link de página de Filantropia` |
| **Termos de Uso** | editor de texto rico + `Salvar` |

> **Certificado e Filantropia são declarações institucionais**, no mesmo gênero do código SUSEP da
> aba Capitalizadora: afirmam ao comprador algo sobre a legitimidade da operação. Replicar o campo
> é trivial; o que ele afirma não é.

---

## O que ficou de fora desta sessão

| Item | Por quê |
|---|---|
| `Capitalizadoras › Lista` e `› Banner` | não abertos |
| `Privacidade`, `Sobre` | **[SUPOSTO]** mesmo padrão de Termos; não conferido |
| `Exemplos Payload` dos webhooks | **o contrato do `order.paid`** — maior pendência desta tela |
| Colunas à direita em Usuários | a tabela rola na horizontal |
| Detalhe de um contato | abre em outra tela |
| Formulário `Novo Usuário`, `Novo Link UTM`, `Novo Webhook`, `Novo Link De Desconto` | nenhum aberto |
