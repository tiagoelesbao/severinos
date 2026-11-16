# 01 — A superfície da API da Sorteamos

> Procedência marcada linha a linha. Legenda em [`00-INDICE.md`](00-INDICE.md).
> **Nenhuma chamada foi feita nesta sessão** — a plataforma tem sessão única e autenticar
> derrubaria a sessão do founder, que estava com o painel aberto. Tudo aqui vem de código
> nosso que roda em produção contra esta API, de amostras gravadas, ou do briefing.

---

## 1. Host, autenticação e as três armadilhas de infraestrutura

| Item | Valor | Procedência |
|---|---|---|
| Base da API | `https://api.rapidinhas24hr.com/api` | `[PROD]` — testado ao vivo 2026-10-22 na troca de domínio |
| Base anterior (**morta**) | `https://api.imperiopremioss.com/api` | `[PROD]` — DNS NXDOMAIN confirmado 2026-10-22 |
| Painel do operador | `painel.rapidinhas24hr.com` (antes `painel.imperiopremioss.com`) | `[BRIEFING]` + `[PROD]` (a URL antiga aparece em `order-paid.js`) |
| Loja pública | `https://rapidinhas24hr.com` | `[PROD]` |
| Banco | **MongoDB** | `[BRIEFING]` — corroborado por `[AMOSTRA]`: todos os ids são ObjectId de 24 hex |
| Gateway principal | **paysure** | `[BRIEFING]` — corroborado por `[PROD]`: `approvedBy` assume o valor paysure |
| Gateway secundário | **pay2m** | `[PROD]` — citado como valor possível de `approvedBy` |

### Armadilha 1 — `/products` é 0-indexed

```
page=0  -> traz os sorteios criados nas últimas horas
page=1  -> já pula ~10h de sorteios novos
```

`[PROD]`, achado 2026-10-07. Começar em `page=1` fazia o pipeline pular **sempre** os ~25
sorteios mais recentes, todo ciclo, desde sempre. Custo medido: faturamento real do site
R$ 95.236 contra R$ 23.586 capturados — **~75% perdido**, por meses. `/product/{id}/orders`
também é 0-indexed.

### Armadilha 2 — Cloudflare barra IP de datacenter

`[PROD]`, achado 2026-10-11. Chamar a API a partir da Vercel devolve **403 com corpo de página
de desafio do Cloudflare** (`server: cloudflare`). Não é header: a função já mandava
User-Agent/Origin/Referer completos de navegador e continuou 403. Do **IP residencial** local,
o mesmo login devolve 200. É a razão de `snapshot_sorteios.py` rodar local e a Vercel só ler
de um snapshot no Supabase.

### Armadilha 3 — 429 existe

`[PROD]`. `/product/{id}/orders` devolve 429. O cliente trata com espera de 10s e repete a
mesma página. Além disso impõe um teto **nosso** de 20 requisições por minuto (espera de 5s ao
atingir) e 0,5s entre páginas. Esses números são escolha nossa, **não** limite publicado pela
API — o limite real da plataforma é `[NÃO OBSERVADO]`.

---

## 2. `POST /api/auth/login`

| | |
|---|---|
| Corpo | `{"email": "...", "password": "..."}` |
| Resposta 200 | JSON contendo **`accessToken`** ou **`token`** |
| Header seguinte | `Authorization: Bearer {token}` |
| Expiração | Devolve **401** quando o token vence; o cliente reautentica e repete a chamada uma vez |

`[PROD]`. O campo exato do token é `[DEFENSIVO]` no detalhe: o código aceita `accessToken` **ou**
`token` e nunca registrou qual dos dois a API devolve. Confirmar antes de implementar.

**Não observado:** tempo de vida do token, se existe refresh token, claims do JWT, se há
`POST /api/auth/logout`, 2FA no login. O comentário em `apps/lotemania/src/lib/api-client.ts`
afirma que o painel original guardava o access token **só em localStorage e sem fluxo de refresh
observado** — isso é `[INFERIDO]` por quem escreveu o clone, não confirmado por mim.

---

## 3. `GET /api/products`

Lista de sorteios do operador. É o endpoint que alimenta a tela **Sorteios**.

### Parâmetros `[PROD]`

| Parâmetro | Tipo | Valor usado em produção | Nota |
|---|---|---|---|
| `page` | int | começa em **0** | ver Armadilha 1 |
| `rowsPerPage` | int | 25 | o painel usa 25 por página; teto máximo é `[NÃO OBSERVADO]` |
| `filters` | **string JSON** | `{"title":null,"status":"all","privacy":"all","drawDate":null}` | é um JSON serializado dentro de um query param, não 4 params soltos |

Os quatro campos de `filters` são `[PROD]`. Os **valores aceitos** de cada um só são conhecidos
em parte:

| Campo do filtro | Valores confirmados | Valores prováveis |
|---|---|---|
| `title` | `null` | busca por substring — `[INFERIDO]` de a tela de Sorteios ter campo de busca por título |
| `status` | `"all"` | `"active"`, `"done"` — `[INFERIDO]`: são os valores que o campo `status` do produto assume |
| `privacy` | `"all"` | `"public"`, `"private"` — mesma inferência |
| `drawDate` | `null` | data ISO ou `YYYY-MM-DD` — `[NÃO OBSERVADO]` |

### Resposta

A lista vem dentro de um envelope. **Qual é a chave exata não está registrado:** o nosso código
tenta, em ordem, `products`, `data`, `items`, `result`, `list`, `docs` e usa a primeira que for
uma lista. `[DEFENSIVO]` — ao contrário do endpoint de pedidos, onde a chave real foi anotada.

Não existe campo de total/contagem registrado. A paginação termina quando a página volta com
menos itens que `rowsPerPage` (`[PROD]` — é assim que o nosso laço para). Se a API devolve um
`total`, `count` ou `pages`, isso é `[NÃO OBSERVADO]`.

### O objeto `product`, campo por campo

| Campo | Tipo | O que é | Procedência |
|---|---|---|---|
| `_id` | string, ObjectId 24 hex | id do sorteio | `[AMOSTRA]` |
| `title` | string | título, como aparece na loja. Carrega o valor do prêmio em texto livre e **números grafados com a letra O no lugar do zero** | `[AMOSTRA]` |
| `friendlyURL` | string | slug da página pública. **Padrão irregular de verdade** — ver nota abaixo | `[AMOSTRA]` |
| `status` | string | `"active"`, `"done"` | `[PROD]` |
| `privacy` | string | `"public"`, `"private"` | `[PROD]` |
| `statusText` | string | chamada curta exibida na vitrine (ex.: "Adquira Já!", "ESPECIAL FEDERAL AS 11:35!!!") | `[AMOSTRA]` |
| `drawDate` | string ISO 8601 UTC | data/hora do sorteio | `[AMOSTRA]` |
| `createdAt` | string ISO 8601 | criação do sorteio | `[PROD]` |
| `updatedAt` | string ISO 8601 | — | `[DEFENSIVO]` — só aparece numa lista de fallback de parsing de data |
| `imageUrls` | array de string | imagens. Hospedadas em `sp1-s3.saveincloud.io/{bucket}/{uuid}.png` ou `.jpeg` | `[AMOSTRA]` |
| `award` | boolean | presente e `true` em 6/6 da amostra. **Semântica desconhecida** — provavelmente "tem prêmio declarado" | `[AMOSTRA]` + semântica `[NÃO OBSERVADO]` |
| `awards` | array de string | descrições dos prêmios, texto livre com `R$`. Usado para somar prêmio total e achar o maior | `[PROD]` |
| `winners` | array de objeto | ganhadores declarados. Cada item tem `number` e `award` | `[PROD]` |
| `numbersConfig` | objeto | configuração de títulos — detalhado abaixo | `[PROD]` |
| `showHome` | boolean | aparece na home da loja | `[AMOSTRA]` |
| `highlight` | boolean | destaque na vitrine | `[AMOSTRA]` |
| `description` | string | descrição longa. Nos 363 sorteios de uma janela analisada, **lista os horários de extração do PT-Rio** (PPT 09:35 / PTM 11:35 / PT 14:35 / PTV 16:35 / PTN 18:35 / COR 21:45) | `[PROD]` |

#### `numbersConfig`

| Campo | Tipo | O que é | Procedência |
|---|---|---|---|
| `price` | number | **preço unitário por título** na rodada | `[PROD]` |
| `qty` | int | total de títulos da rodada (tipicamente **100**) | `[PROD]` |
| `qtyPaid` | int | títulos pagos | `[PROD]` |
| `qtyReserved` | int | títulos reservados e não pagos | `[PROD]` |
| `qtyFree` | int | títulos livres | `[PROD]` |
| `expirationSeconds` | int | validade da reserva, em segundos | `[PROD]` |
| `min` | int | mínimo de títulos por pedido | `[PROD]` |
| `max` | int | máximo de títulos por pedido (observado: **25**) | `[PROD]` |

#### Três notas que valem código

**`friendlyURL` nunca pode ser derivado do título.** `[PROD]`, achado 2026-10-15. O padrão é
irregular: "R$ 27.000,00" virou `r-2700000` num sorteio e "R$1.000" virou `1-1000` noutro; há
slug que **preserva acento** (`...-na-tampa-2-edição`). Slug errado leva a "Erro 404 — Campanha
não encontrada", ou seja, clique pago queimado.

**`status == "active"` NÃO significa "tem título à venda".** `[PROD]`, achado 2026-10-15.
Confirmado ao vivo: sorteio com `drawDate` já vencido ainda reportava `status: "active"`. O sinal
real de disponibilidade é **`numbersConfig.qtyFree > 0`**. O backend da plataforma demora a virar
o status para `done`.

**O título mente sobre o prêmio, e `awards` também.** `[PROD]`. O cliente grafa zero como a
letra O (VALEND0, R$ 1.OOO), então qualquer parsing precisa normalizar O para 0. A regra de
desempate em produção: se o valor do título for **>= 10x** a soma de `awards`, usa o do título;
senão usa `awards`.

---

## 4. `GET /api/product/{id}/orders`

Pedidos de um sorteio. É o endpoint que alimenta a **Lista de Compras** e os relatórios.

### Parâmetros `[PROD]` — todos os 12 enviados em produção

| Parâmetro | Valor usado | Nota |
|---|---|---|
| `page` | começa em **0** | |
| `rowsPerPage` | 100 | teto máximo `[NÃO OBSERVADO]` |
| `filterStatus` | `"paid"` ou `"all"` | ver tabela de status abaixo |
| `filterName` | `""` | nome do comprador |
| `filterNumber` | `""` | **número/título** comprado |
| `filterAffiliate` | `""` | código do afiliado |
| `filterPaymentId` | `""` | id do pagamento no gateway |
| `filterPhone` | `""` | telefone do comprador |
| `filterOrderId` | `""` | id do pedido |
| `filterPaymentEndToEndId` | `""` | end-to-end id do PIX |
| `filterStartDate` | a string `"null"` | **literalmente a string null**, não o JSON `null` nem vazio |
| `filterEndDate` | a string `"null"` | idem |

Esses filtros são o mapa direto dos campos de busca da tela de Lista de Compras.
`[INFERIDO]` dessa correspondência; a tela em si é `[NÃO OBSERVADO]`.

### Resposta

Envelope com a chave **`orders`** — `[PROD]`, "chave real confirmada por inspeção ao vivo".
Mesma ausência de contagem total: a paginação termina por página curta.

### O objeto `order`, campo por campo

Esta é a parte mais valiosa do documento — é o que o lotemania precisa replicar.

#### Identidade do pedido

| Campo | Tipo | O que é | Procedência |
|---|---|---|---|
| `_id` | ObjectId 24 hex | id do pedido. É a chave de dedup do nosso CAPI | `[PROD]` |
| `eventId` | string | id de evento do Pixel, gerado pela plataforma. **O navegador usa o mesmo valor** — é o que faz a deduplicação do Meta funcionar | `[PROD]` |
| `productId` | ObjectId | sorteio a que o pedido pertence | `[PROD]` |
| `createdAt` | ISO 8601 | **criação** do pedido (não o pagamento) | `[PROD]` |
| `paymentAt` | ISO 8601 ou vazio | momento do pagamento | `[PROD]` |

#### Comprador — objeto aninhado `userId`

**Atenção ao nome:** no REST o comprador vem em `order.userId` como **objeto**, não como id.

| Campo | Tipo | O que é | Procedência |
|---|---|---|---|
| `userId._id` | ObjectId | id do usuário. Vira `external_id` no CAPI | `[PROD]` |
| `userId.name` | string | nome real. 12/12 pedidos pagos recentes vinham preenchidos (2026-10-07); auditoria de 2026-10-10 mediu **100% de preenchimento** | `[PROD]` |
| `userId.phone` | string | telefone | `[PROD]` |
| `userId.phoneDetails.e164` | string | telefone **já normalizado em E.164**, pronto para uso | `[PROD]` — "já vem pronto" |
| `userId.phoneDetails.country` | string | país, minúsculo (`br`). **100% preenchido** | `[PROD]` |
| `userId.email` | string | e-mail. **Presente em ~36,5%** dos pedidos (39,45% numa medição posterior) | `[PROD]` |
| `userId.cpf` | string | CPF. **Presente em ~18,8%** dos pedidos | `[PROD]` |
| `userId.login` | string | **o login nesta plataforma é o próprio telefone** | `[PROD]` |
| `userId.fullName` | string | — | `[DEFENSIVO]` — só fallback no nosso código, nunca confirmado |

> **Armadilha herdada.** `userId.login` **não** pode entrar num fallback de nome: ele é um
> telefone disfarçado, e usá-lo como nome hashearia telefone no campo de nome do CAPI. Registrado
> em `client_api.py` como decisão explícita.

Campos de comprador em nível de pedido — `customerName`, `customerPhone`, `name`, `userName`,
`phone` — são todos `[DEFENSIVO]`. Aparecem como fallback e nunca foram confirmados.

#### Títulos e valores

| Campo | Tipo | O que é | Procedência |
|---|---|---|---|
| `quantity` | int | quantidade de títulos do pedido | `[PROD]` |
| `numbers` | array de string | **os títulos escolhidos**, strings de 2 dígitos (ex.: `["19","49"]`). Uma entrada por título, **sempre com tamanho igual a `quantity`** | `[PROD]` — confirmado ao vivo 2026-10-08 |
| `total` | number | valor total do pedido. É a fonte primária de valor | `[PROD]` |
| `price` | number | **preço unitário por título pago neste pedido** — replica `numbersConfig.price`, mas congelado no momento da compra (o preço do sorteio pode ser editado no meio da vida) | `[PROD]` |
| `discount` | number | desconto aplicado | `[PROD]` |
| `subtotal` | number | — | `[DEFENSIVO]` no REST; **confirmado no webhook** (ver §5) |
| `amount` | number | — | `[DEFENSIVO]` |

`numbers` é a única fonte de "escolha consciente de título" que o produto tem. Alimenta o teste
de uniformidade e o mapa de números frios do BI. **Nunca foi capturado antes de 2026-10-08** —
se o lotemania não persistir isso, perde a análise inteira.

#### Status e aprovação

| Campo | Valores | O que é | Procedência |
|---|---|---|---|
| `status` | `"paid"`, `"waiting-payment"`, `"expired"` | estado do pedido | `[PROD]` — os três confirmados ao vivo 2026-10-07 com `filterStatus="all"` |
| `approvedBy` | `"paysure"`, `"pay2m"`, `"admin"` | **quem deu baixa no pedido.** O valor `admin` é a baixa manual | `[PROD]` — achado 2026-10-17 |
| `expiredBy` | string | quem/o quê expirou o pedido | `[PROD]` — capturado, mas os **valores possíveis são `[NÃO OBSERVADO]`** |
| `paymentId` | string | id do pagamento no gateway | `[PROD]` |
| `paymentEndToEndId` | string | end-to-end id do PIX | `[PROD]` |

Não há status de **reembolso** nem **cancelamento** observado no REST. O lotemania definiu
`refunded` e `canceled` no seu enum — isso é desenho do clone, `[NÃO OBSERVADO]` na Sorteamos.

#### Rastreio e atribuição — soltos na raiz do pedido

| Campo | Tipo | Preenchimento medido | Procedência |
|---|---|---|---|
| `fbc` | string `fb.1.{ts_ms}.{fbclid}` | 91/426 pedidos (21%) — e **95% do que vem está vencido** | `[PROD]` |
| `fbp` | string | ~93-95% | `[PROD]` |
| `gclid` | string | capturado; preenchimento `[NÃO OBSERVADO]` | `[PROD]` |
| `ttclid` | string | idem | `[PROD]` |
| `utmSource` | string | **0 de 426** | `[PROD]` |
| `utmMedium` | string | **0 de 426** | `[PROD]` |
| `utmCampaign` | string | **0 de 426** | `[PROD]` |
| `utmContent` | string | **0 de 426** | `[PROD]` |
| `utmTerm` | string | **0 de 426** | `[PROD]` |
| `affiliate` | string | código do afiliado | `[PROD]` |
| `primeAffiliate` | string | segundo nível de afiliado? **semântica `[NÃO OBSERVADO]`** | `[DEFENSIVO]` |
| `ip` | string | IP do comprador | `[PROD]` |
| `userAgent` | string | **100% dos pedidos amostrados** | `[PROD]` |

### Três defeitos conhecidos da plataforma nestes campos

Documentados, datados, **não corrigidos pelo cliente até a última medição**. O lotemania não
deve replicá-los — mas precisa saber que existem, porque mudam o que o dado significa.

| # | Defeito | Evidência | Status |
|---|---|---|---|
| 1 | **`fbc` congelado.** A plataforma lê o `fbc` de um campo salvo no perfil do usuário no primeiro clique e **reenvia o mesmo valor em todo pedido futuro** dele. Pedidos de outubro/2026 enviando `fbc` de abril/2026 — até **349 dias** de idade | 53 de 426 pedidos com `fbc` acima de 90 dias, em 3 dias de janela. Events Manager alerta desde 28/jul/2026 | Aberto; contornado do nosso lado descartando `fbc` acima de 7 dias |
| 2 | **UTM nunca persistida.** 0/426 pedidos com qualquer UTM, mesmo com clique de anúncio confirmado de minutos antes. Confirmado nos **dois** caminhos: REST e webhook. O `url_tags` dos anúncios está correto e a UTM chega na LP — a plataforma simplesmente não grava | 0/426, e 25 pedidos de `fbc` fresco testados com as 5 chaves vazias | Aberto; contornado por captura própria por `fbp` |
| 3 | **Pixel de Purchase duplicando ~1,6x.** 945 eventos de navegador contra 584 de servidor no mesmo dia. Hipótese: a página de confirmação redispara o Purchase a cada recarga da SPA | Graph API com `aggregation=event_source`. **O mecanismo exato não foi provado** | Aberto |

Um quarto, de menor prioridade: a **CAPI nativa da plataforma envia em lote horário**, não em
tempo real (`[PROD]`, via Events Manager).

---

## 5. O webhook de saída `order.paid`

A plataforma **empurra** um evento quando confirma um pagamento. É o caminho mais confiável que
temos: pega ~100% dos pedidos em tempo real, enquanto o polling pegava 11%.

| Item | Valor | Procedência |
|---|---|---|
| Cadastro | tela do painel: `dashboard/webhooks` > "Exemplos de payload" > `Order.Paid` | `[PROD]` — o founder tirou o payload de lá em 2026-10-07 |
| Método | `POST` com corpo JSON | `[PROD]` |
| Autenticação | header **`X-AUTH-WEBHOOK`**, cujo valor é o que foi digitado no campo "Authorization" do cadastro do webhook | `[PROD]` |
| Evento | campo `event` com valor `order.paid` | `[PROD]` |

### O payload — **não é o mesmo formato do REST**

```json
{
  "event": "order.paid",
  "timestamp": "<ISO 8601 — momento da confirmacao>",
  "data": {
    "id": "<id do pedido, 24 hex>",
    "total": 0,
    "subtotal": 0,
    "createdAt": "<ISO 8601>",
    "user": {
      "id": "<id do usuario>",
      "name": "<NOME MASCARADO>",
      "email": "<EMAIL MASCARADO>",
      "phone": "+55DD9XXXXXXXX"
    },
    "params": {
      "fbc": "fb.1.<ts_ms>.<fbclid>",
      "fbp": "fb.1.<ts_ms>.<rand>",
      "ip": "<IP MASCARADO>",
      "userAgent": "<ua>",
      "utmSource": "", "utmMedium": "", "utmCampaign": "",
      "utmContent": "", "utmTerm": "",
      "gclid": "", "ttclid": ""
    }
  }
}
```

*Valores de exemplo mascarados de propósito — nenhum dado pessoal real neste documento.*

**As quatro diferenças contra o REST, todas `[PROD]`:**

1. o usuário vem em **`data.user`** (não `data.userId`), e a chave do id é **`id`** (não `_id`);
2. o telefone já vem em **E.164 pronto** em `data.user.phone`;
3. `fbc`/`fbp`/`ip`/`userAgent`/UTM ficam **dentro de `data.params`**, não soltos em `data`;
4. **`data.id`** é o id do pedido — equivalente ao `_id` do REST.

**Ressalvas honestas:**

- `data.user.name` é `[DEFENSIVO]` **neste** payload. O nosso código o lê com guarda, e o
  comentário diz explicitamente "não confirmado no payload real do webhook, diferente do REST".
- As 5 chaves de UTM aparecem no **exemplo oficial** do painel, mas em 25 pedidos reais de `fbc`
  fresco chegaram **100% vazias**.
- Se existe `data.params.eventId` no payload é `[NÃO OBSERVADO]` — o nosso pipeline usa `data.id`
  como chave de dedup, não um eventId do webhook.

### Outros eventos de webhook

O nosso handler ignora qualquer evento diferente de `order.paid`, o que implica que **existem
outros**. Quais são: `[NÃO OBSERVADO]`. A tela de webhooks tem uma lista de eventos assináveis —
está em `05-pendente-de-observacao.md`.

---

## 6. O contrato de export — 25 colunas

`[BRIEFING]`, conferido pelo requisitante em CSV real de 2026-11-16. Separador `;`.
**Não re-verificado por mim**: não há CSV com estes cabeçalhos no repositório (os CSVs que
existem em `services/Meta/imperio-premios/` são do **nosso** pipeline, com cabeçalhos
diferentes — `OrderId;UserId;PaymentId;...`).

| # | Coluna | Campo correspondente na API | Procedência do mapeamento |
|---|---|---|---|
| 1 | `Id do Sorteio` | `product._id` | `[INFERIDO]` |
| 2 | `Título do Sorteio` | `product.title` | `[INFERIDO]` |
| 3 | `Id da Compra` | `order._id` | `[INFERIDO]` |
| 4 | `Quantidade` | `order.quantity` | `[INFERIDO]` |
| 5 | `Status` | `order.status` | `[INFERIDO]` |
| 6 | `Valor` | `order.total` | `[INFERIDO]` |
| 7 | `Nome` | `order.userId.name` | `[INFERIDO]` |
| 8 | `Telefone` | `order.userId.phone` | `[INFERIDO]` |
| 9 | `País` | `order.userId.phoneDetails.country` | `[INFERIDO]` |
| 10 | `E-mail` | `order.userId.email` | `[INFERIDO]` |
| 11 | `CPF` | `order.userId.cpf` | `[INFERIDO]` |
| 12 | `Nome Social` | **sem campo conhecido no REST** | `[NÃO OBSERVADO]` |
| 13 | `Data de Nascimento` | **sem campo conhecido no REST** | `[NÃO OBSERVADO]` |
| 14 | `Data da Compra` | `order.createdAt` **ou** `order.paymentAt` — ambíguo | `[NÃO OBSERVADO]` |
| 15 | `Id do Pagamento` | `order.paymentId` | `[INFERIDO]` |
| 16 | `Host do Pagamento` | **sem campo conhecido** — provável nome do gateway | `[NÃO OBSERVADO]` |
| 17 | `Aprovado por` | `order.approvedBy` | `[INFERIDO]` — forte: é o campo da baixa manual |
| 18 | `Código do Afiliado` | `order.affiliate` | `[INFERIDO]` |
| 19 | `Origem do Tráfego` | `order.utmSource` | `[INFERIDO]` |
| 20 | `Conteúdo do Tráfego` | `order.utmContent` | `[INFERIDO]` |
| 21 | `Campaign` | `order.utmCampaign` | `[INFERIDO]` |
| 22 | `Term` | `order.utmTerm` | `[INFERIDO]` |
| 23 | `fbc` | `order.fbc` | `[INFERIDO]` |
| 24 | `fbp` | `order.fbp` | `[INFERIDO]` |
| 25 | `Números` | `order.numbers` | `[INFERIDO]` |

**Três observações que mudam o desenho:**

1. **`utmMedium` não aparece no export**, mas existe na API. O export traz Origem, Conteúdo,
   Campaign e Term — quatro dos cinco. Se o Medium aparece sob outro rótulo, não identifiquei.
2. **"Nome Social" e "Data de Nascimento" existem no export mas não em nenhum campo que o nosso
   pipeline leia.** São campos de cadastro completo, que o nosso ETL nunca precisou. O lotemania
   já os tem no schema (`users.socialName`, `users.birthDate`) — ver `04-lacunas.md`.
3. **"Host do Pagamento" é uma coluna sem origem conhecida.** Pode ser o host do gateway, pode
   ser o domínio da loja. Confirmar antes de implementar.

---

## 7. O que não sabemos desta API

Lista curta aqui; a versão com plano de ação está em [`05-pendente-de-observacao.md`](05-pendente-de-observacao.md).

- **Todo o resto da API.** Consumimos **3 endpoints**. O painel tem 13 itens de barra lateral e
  12 ações por sorteio — então existem endpoints de afiliados, bancos, links de desconto,
  relatórios, contatos, usuários, integrações, capitalizadoras, comunicados, FAQ e analytics que
  **nunca tocamos**. Nada sabido sobre eles.
- **Toda a superfície de escrita.** Criar/editar/duplicar/excluir sorteio, dar baixa manual,
  ativar títulos premiados, aprovar pagamento — nenhuma rota conhecida.
- **A API pública da loja.** A página `/campanha/{slug}` carrega produto sem autenticação; a rota
  que ela chama é `[NÃO OBSERVADO]`.
- **O fluxo de checkout e reserva.** Como um título sai de livre para reservado, qual rota, com
  que corpo, e como a expiração é executada (job agendado? avaliação na leitura?).
- **Códigos de erro.** Só 200, 401, 403 (Cloudflare) e 429 observados. Formato do corpo de erro:
  desconhecido.
