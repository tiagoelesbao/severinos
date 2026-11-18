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

    "<objeto de rastreio>": {          // nome da chave NÃO OBSERVADO — o scroll cortou a linha
      "ttp":        "2AHtBz-1234-5678-90ab-cdef12345678",
      "fbc":        "fb.1.1700000000000.1234567890",
      "fbp":        "fb.1.1700000000000.0987654321",
      "eventId":    "evt-1234567890",
      "userAgent":  "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      "utmContent":  "banner-azul",
      "utmSource":   "google",
      "utmCampaign": "promocao-marco",
      "utmMedium":   "cpc",
      "utmTerm":     "curso",
      "ip":          "192.168.0.1"
    },

    "numbers": [1234, 1235, 1236]
  }
}
```

### As três notas de rodapé da própria tela

| Campo | Nota |
|---|---|
| `data.numbers` | *"Números/títulos do pedido — **enviado SOMENTE neste evento**"* |
| `data.awards` | *"Prêmios instantâneos ganhos: título, roleta, caixa ou raspadinha. **Vazio quando não houve**"* |
| `data.status` | *"Sempre `paid` neste evento"* |

---

## O que isto decide para o lotemania

### 1. A `LTM-04` ganha a lista exata de campos de atribuição

O bloco de rastreio tem **onze** campos, e eles respondem a pergunta "de onde veio esta venda":

| Campo | O que é |
|---|---|
| `fbc` / `fbp` | cookies de clique e de navegador da Meta — **o par que a CAPI exige** |
| `ttp` | o equivalente do TikTok |
| `eventId` | **deduplicação** entre Pixel do navegador e CAPI do servidor. Sem ele, a Meta conta a conversão duas vezes |
| `userAgent` + `ip` | exigidos pela CAPI para casar o evento |
| `utmSource/Medium/Campaign/Content/Term` | os cinco UTMs canônicos |

O lotemania tem **nenhum** deles em `orders`. E `eventId` é o mais fácil de esquecer e o mais caro:
é o que impede conversão contada em dobro.

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
