# O contrato do webhook de saída da Sorteamos

**Data:** 2026-11-18 · Lido do modal **"Exemplos de payload — Estrutura real do que a plataforma envia"**
em `/dashboard/webhooks`. **[OBSERVADO]**

> Todos os valores abaixo são os **exemplos da própria documentação** (João Silva, `AFF123`,
> `192.168.0.1`). Nenhum dado de comprador real foi copiado. O **token de autorização** do webhook
> configurado do Império está visível naquela tela e **não** foi registrado aqui.

---

## Por que este documento vale mais que o resto do inventário

Toda tela mostra o que o operador **vê**. Este modal mostra o que a plataforma **sabe** — o conjunto
de campos que a Sorteamos carrega por pedido, declarado por ela mesma, sem interpretação nossa.

E ele é a resposta a uma pergunta que estava aberta: **o Império já tem um webhook de saída ativo**,
assinando `order.paid` e apontando para um serviço próprio que alimenta a **CAPI da Meta**. Ou seja,
este contrato não é teoria: é o cano por onde a conversão do Império chega ao anúncio hoje.

> ## ⚠️ O contrato existe. O dado, não.
>
> **Correção aplicada a este documento em 2026-11-18**, a partir de medição anterior do @pm
> (2026-10-08) que eu não tinha em mãos ao escrevê-lo.
>
> A Sorteamos **declara** `utmSource/Medium/Campaign/Content/Term` no `order.paid` e na API REST — e
> **entrega vazio em 100% dos pedidos reais**, inclusive em 25 pedidos com clique de anúncio
> confirmado e recente. Pela API REST, `UTM_Source` vem vazio em **99,6%**.
>
> **É o mesmo padrão dos 36 campos inertes do editor** (`LTM-18`), agora no contrato de saída: a
> plataforma descreve um campo que ela não preenche. Declarar não é entregar.
>
> Duas consequências que mudam a leitura de tudo abaixo:
>
> 1. **Paridade com a Sorteamos é o piso errado para atribuição.** "Tem as colunas" não é
>    entregável; "o dado chega preenchido depois de navegação interna" é. É o risco central da
>    `LTM-04`.
> 2. **`apps/utm-capture-imperio` existe por causa disto** — um beacon por GTM que grava
>    `{fbp, fbc, utm_*, landing_url}` no Supabase **por `fbp`**, não por pedido, porque no momento
>    da captura o pedido ainda não existe. É remendo de produção contra um buraco a montante, não
>    arquitetura escolhida.
>
> E um detalhe que já custou caro: a Sorteamos **reescreve o `fbc` com timestamp sempre fresco**, o
> que inviabilizou o filtro de idade do clique no `capi_client.py`. No lotemania, o valor original
> do cookie tem de chegar **intacto** ao pedido.
>
> **Então o valor deste documento não é "o que o Império recebe hoje".** É o **vocabulário** — os
> nomes, os tipos e a forma que o lotemania deve preencher **de verdade**.

---

## As quatro assinaturas

```
User.Create · Order.Create · Order.Paid · Order.Expired
```

## O transporte

| | |
|---|---|
| Método | **POST**, `Content-Type: application/json` |
| Autenticação | header **`X-AUTH-WEBHOOK`** — *"recebe exatamente o valor do campo Authorization do cadastro"* |
| Sucesso | **qualquer 2xx**. A partir de 300 o envio é considerado falha |
| Timeout | **15 s** |
| Retentativa | **até 3 tentativas** — 1 minuto após a 1ª falha, 5 minutos após a 2ª |
| Campos ausentes | *"Campos sem valor **não são enviados**. … a chave simplesmente não aparece no JSON. **Trate campo ausente como vazio**."* |

> **Três decisões de desenho nesse quadro, e as três são boas:**
>
> 1. **Header próprio em vez de `Authorization`.** Evita colisão com autenticação de proxy e deixa
>    explícito que é segredo compartilhado, não credencial de usuário.
> 2. **Ausência em vez de `null`.** Reduz payload e obriga o consumidor a tratar ausência — mas
>    **exige que isso esteja documentado**, e está, em negrito.
> 3. **Três tentativas com recuo de 1 min / 5 min.** É o mesmo padrão da Paysure como *emissora*
>    (imediata / ~5 min / ~30 min). Quem recebe webhook da Sorteamos tem **6 minutos** de janela
>    total; quem recebe da Paysure tem ~35.

---

## `Order.Paid` — o payload completo

```jsonc
{
  "event": "order.paid",
  "timestamp": "2025-03-11T15:10:00.000Z",
  "data": {
    "id": "65f2b19c29f4b8d87654321",

    "product": {
      "id": "65f2b19c29f4b8d23456789",
      "title": "Sorteio Fiat Toro 2025"
    },

    "user": {
      "id": "65f2b19c29f4b8d12345678",
      "name": "João Silva",
      "phone": "+5511998765432",
      "email": "joao.silva@example.com",
      "cpf": "123.456.789-00",
      "affiliateCode": "AFF123",
      "createdAt": "2025-03-10T12:00:00.000Z",
      "birthDate": "25/12/1990"
    },

    "awards": [
      { "category": "titulos", "type": "titulo", "number": 1234, "award": "R$ 500,00" },
      { "category": "roletas",                                    "award": "R$ 50,00"  }
    ],

    "pixCode": "00020101021226890014BR.GOV.BCB.PIX…",

    "quantity": 10,
    "status": "paid",
    "discountCode": "PROMO10",
    "price": 10,
    "subtotal": 100,
    "discount": 0,
    "total": 100,
    "expirationAt": "2025-03-12T15:00:00.000Z",
    "affiliate": "AFF123",

    "createdAt": "2025-03-11T14:55:00.000Z",
    "createdAtUNIX": 1741704900,

    "params": { /* os 13 campos de rastreio — ver abaixo */ },

    "numbers": [1234, 1235, 1236]
  }
}
```

### `params` — o objeto de rastreio, **treze** campos

Idêntico nos quatro eventos. Lido completo na aba `Order.Create`:

```jsonc
"params": {
  "gclid":       "Cj0KCQiA_1234567890",                      // Google
  "ttclid":      "E.C.P.tt-1234567890",                      // TikTok (click id)
  "ttp":         "2AHtBz-1234-5678-90ab-cdef12345678",       // TikTok (cookie)
  "fbc":         "fb.1.1700000000000.1234567890",            // Meta (clique)
  "fbp":         "fb.1.1700000000000.0987654321",            // Meta (navegador)
  "eventId":     "evt-1234567890",                           // deduplicação Pixel ↔ CAPI
  "userAgent":   "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
  "utmContent":  "banner-azul",
  "utmSource":   "google",
  "utmCampaign": "promocao-marco",
  "utmMedium":   "cpc",
  "utmTerm":     "curso",
  "ip":          "192.168.0.1"
}
```

Nota da própria tela: *"`data.params` — Dados de rastreio: gclid, ttclid, ttp, fbc, fbp, UTMs, IP e
user agent"*.

---

## Os quatro eventos, lado a lado

Os quatro compartilham a **mesma forma**. O que muda:

| | `User.Create` | `Order.Create` | `Order.Paid` | `Order.Expired` |
|---|---|---|---|---|
| `data.status` | — | **`waiting-payment`** | **`paid`** | **`expired`** |
| `data.numbers` | — | **não enviado** | **enviado** | **não enviado** |
| `data.awards` | — | `[]` | preenchido quando houve | — |
| `data.params` | — | ✅ 13 campos | ✅ | ✅ |
| `data.pixCode` | — | ✅ *"PIX copia e cola gerado para o pedido"* | ✅ | ✅ |
| `createdAtUNIX` | — | ✅ *"createdAt em timestamp UNIX (segundos)"* | ✅ | ✅ |

> **O vocabulário de status do pedido fica estabelecido:** `waiting-payment` · `paid` · `expired`.
> O lotemania usa `pending` · `paid` · `expired` · `canceled`. **`waiting-payment` contra
> `pending`** é divergência de nome, e `canceled` não tem evento correspondente lá.
>
> **`numbers` só em `order.paid`** é decisão de desenho, não omissão: o número só é do comprador
> depois do pagamento. Faz sentido e vale copiar.

### As três notas de rodapé da própria tela

| Campo | Nota |
|---|---|
| `data.numbers` | *"Números/títulos do pedido — **enviado SOMENTE neste evento**"* |
| `data.awards` | *"Prêmios instantâneos ganhos: título, roleta, caixa ou raspadinha. **Vazio quando não houve**"* |
| `data.status` | *"Sempre `paid` neste evento"* |

---

## O que isto decide para o lotemania

### 1. A `LTM-04` ganha a lista exata de campos de atribuição

O `params` tem **treze** campos, e eles respondem a pergunta "de onde veio esta venda":

| Campo | O que é |
|---|---|
| `fbc` / `fbp` | cookies de clique e de navegador da Meta — **o par que a CAPI exige** |
| `gclid` | click id do Google |
| `ttclid` / `ttp` | click id e cookie do TikTok |
| `eventId` | **deduplicação** entre Pixel do navegador e CAPI do servidor. Sem ele, a Meta conta a conversão duas vezes |
| `userAgent` + `ip` | exigidos pela CAPI para casar o evento |
| `utmSource/Medium/Campaign/Content/Term` | os cinco UTMs canônicos |

O lotemania tem **nenhum** deles em `orders`. E `eventId` é o mais fácil de esquecer e o mais caro:
é o que impede conversão contada em dobro.

> **Três plataformas de clique, não uma.** `gclid` (Google), `ttclid`+`ttp` (TikTok) e `fbc`+`fbp`
> (Meta) — coerente com a tela de Analytics, que aceita pixel de Meta, GA, TikTok, Kwai e GTM. A
> `LTM-04` foi escrita falando de `utm_*`, `fbc`, `fbp`, `gclid`, `ttclid`; **os cinco estão aqui, e
> faltam `ttp`, `eventId`, `userAgent` e `ip` na lista dela.**
>
> ⚠️ **Mas copiar a lista não basta — ver o aviso no topo.** A Sorteamos tem estes treze campos
> declarados e os entrega vazios. O entregável da `LTM-04` é o campo **preenchido**, o que exige
> capturar na origem e carregar o valor através da navegação interna até o pedido. O `AC4` dela já
> diz isso; este contrato dá os **nomes**, não a prova de que funciona.

### 2. `awards` confirma a estrutura dos títulos premiados

Cada prêmio ganho tem **`category`** (`titulos`, `roletas`, …), **`type`**, **`number`** e
**`award`**. Isso casa com o que a aba *Títulos Premiados* mostrou (`editor-14-abas.md` §3): um
registro com discriminador de tipo, não quatro features.

**Nota:** `number` aparece no prêmio de categoria `titulos` e **não** no de `roletas` — coerente com
a regra "campo sem valor não é enviado".

### 3. O dinheiro vem decomposto

`price` · `subtotal` · `discount` · `total` · `discountCode`. O lotemania tem só `amount` em
`orders`. Para replicar o export de vendas (`LTM-13`) e o faturamento, a decomposição precisa
existir — **ou ser recalculável**, e hoje não é.

### 4. `expirationAt` no pedido

Confirma que o relógio da reserva é **propriedade do pedido**, não só da linha de número. O
lotemania guarda `reservedUntil` em `product_numbers`; não há campo equivalente em `orders`.

### 5. O payload carrega dado pessoal completo

`name`, `phone`, `email`, `cpf`, `birthDate`, `ip`, `userAgent` — sem mascaramento. Quem assina o
webhook recebe a base inteira, pedido a pedido.

> ⚠️ **Isto é transferência de dado pessoal para um terceiro, por configuração de tela.** No
> lotemania, implementar `outbound_webhooks` significa criar o mesmo caminho — e a política de
> 2026-11-12 e o portão **G7** do epic valem integralmente. **Não é decisão de engenharia.**

---

## O que falta

| Item | Estado |
|---|---|
| Nome da chave do objeto de rastreio | **[NÃO OBSERVADO]** — o scroll horizontal cortou; uma linha a conferir |
| `Order.Create` e `Order.Expired` | **[NÃO OBSERVADO]** — as abas existem, não foram abertas |
| `User.Create` | **[OBSERVADO]** — `id`, `name`, `phone`, `email`, `cpf`, `affiliateCode`, `createdAt`, `birthdate`. Notas: `birthdate` em `DD/MM/AAAA` e `null` se não informada; `cpf`/`email` *"podem não vir, dependendo do que o cliente exige no cadastro"* — ou seja, dependem do `requiredFields` do sorteio |
| Formulário `Novo Webhook` | **[NÃO OBSERVADO]** — quais eventos se pode assinar, e se há filtro por sorteio |
