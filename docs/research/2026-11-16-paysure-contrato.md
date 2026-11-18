# Paysure — o contrato real

Fonte: documentação oficial em `https://paysure.mintlify.app` (API Reference + Documentação),
lida em 2026-11-16. Base da API: `https://api.paysurebr.com/v1`.

Este documento existe porque a `LTM-03` estava bloqueada esperando "o aviso real do provedor".
A documentação responde tudo **menos** o corpo literal de um aviso em produção — e o que ela diz
**desmente** três premissas que estavam escritas no código do lotemania.

> **Nenhuma credencial aqui.** `ci` e `cs` do Império não entram neste repositório em nenhuma
> hipótese — vão para variável de ambiente, como manda o próprio fornecedor.

---

## 1. Autenticação — dois cabeçalhos, não uma chave

```
ci: <Client ID>      # público, identifica a chave
cs: <Client Secret>  # privado, autentica a chave
```

```bash
curl -X POST https://api.paysurebr.com/v1/pix/qrcode \
  -H "ci: <client-id>" \
  -H "cs: <client-secret>" \
  -H "Content-Type: application/json" \
  -d '{ ... }'
```

A própria Paysure recomenda `PAYSURE_CI` / `PAYSURE_CS` em variável de ambiente, chaves separadas
para produção e teste, e **whitelist de IP por chave** no painel dela.

| HTTP | Mensagem | Causa |
|---|---|---|
| 401 | Missing client_id or client_secret | cabeçalhos ausentes |
| 401 | Invalid credentials or inactive | par errado ou chave desativada |
| 403 | Account inactive | conta inativa |

### ⚠️ Isto quebra a tela de integrações do lotemania

`ConfigureGatewayDialog` pede **um** campo (`apiKey`) e `savePaymentGateway` guarda
`encryptSecret(data.apiKey)` — uma **string** em `credentials_encrypted`. Não existe onde pôr o
segundo valor. Acrescentar `paysure` às listas **não resolve**: a tela salvaria metade da
credencial e toda chamada voltaria 401.

---

## 2. Webhook — **não há assinatura nenhuma**

Este é o achado que mais importa, e é mais radical do que a `LTM-03` supunha.

- A URL de callback é a **`postbackUrl` enviada em cada cobrança** — não é configurada uma vez
  no painel do provedor.
- A entrega é `POST` com JSON.
- **Não existe HMAC, não existe cabeçalho de assinatura, não existe segredo compartilhado.** A
  orientação da Paysure é *"valide que o IP de origem é da Cloudflare"*.

Consequência direta: a verificação HMAC-SHA256 em `x-webhook-signature` que está hoje na rota
`/api/webhooks/payment/[tenant]/[provider]` rejeitaria **100%** dos avisos da Paysure com 401.
E não é "a Paysure usa outro esquema" — é que **não há o que verificar**.

E o campo `webhookSecret` que a tela pede o operador digitar **não tem destinatário**: não existe
lugar na Paysure para informar esse segredo.

### O que substitui a assinatura

Como a `postbackUrl` vai por cobrança, a autenticidade tem de morar **na própria URL**: um token
opaco e imprevisível por tenant, emitido por nós, dentro do caminho ou na query. É o padrão para
webhook sem assinatura. A rota já tem a forma certa (`[tenant]/[provider]`) — falta o segredo.

Validar faixa de IP da Cloudflare é defesa adicional, **não substituta**: a faixa é pública e
compartilhada por milhões de domínios.

### Corpo do aviso — três formatos, por chave de topo

**Cash-in (recebimento) — é o que nos interessa:**

```json
{
  "cashin": {
    "reference_code": "PSR-9c8f7a1e-...",
    "external_reference": "pedido-001",
    "value_cents": 5000,
    "status": "paid",
    "payer_name": "João da Silva",
    "payer_document": "12345678900",
    "payment_date": "2026-05-13T10:13:01-03:00",
    "registration_date": "2026-05-13T10:12:15-03:00",
    "end_to_end": "E18236120202605131013...",
    "content": "00020126580014br.gov.bcb.pix..."
  }
}
```

**Cash-out (pagamento):**

```json
{ "cashout": { "reference_code": "...", "external_reference": "...", "status": "paid",
               "end_to_end": "...", "occurred_at": "..." } }
```

**Refund (estorno):**

```json
{ "refund": { "reference_code": "...", "external_reference": "...", "status": "refunded",
              "amount_cents": 10000, "end_to_end": "...", "devolucao_e2e": "..." } }
```

O `parse` do adaptador **ramifica pela chave de topo**, não por um campo `type`.

### Status possíveis

| Fluxo | Status | Significado |
|---|---|---|
| cash-in | `paid` | pagamento confirmado, saldo creditado |
| cash-in | `refunded` | chargeback ou disputa MED; saldo revertido |
| cash-in | `expired` | QR Code expirou sem pagamento (24 h) |
| cash-out | `paid` | banco confirmou |
| cash-out | `refunded` | não concluiu; saldo restaurado |

### Reentrega

| Tentativa | Quando |
|---|---|
| 1ª | imediata |
| 2ª | ~5 min |
| 3ª | ~30 min |
| depois | marcado `client_error`, reenvio manual pelo painel |

Orientações da própria Paysure: **responder sempre 200**, mesmo para evento não reconhecido;
usar **`reference_code` como chave de deduplicação**; manter o handler rápido (**timeout de ~10 s**),
processando o pesado de forma assíncrona.

---

## 3. Idempotência — duas chaves, uma em cada direção

A `LTM-03` procurava "um identificador estável de evento". São **dois**, e os dois já existem:

| Direção | Chave | Quem garante |
|---|---|---|
| **Saída** (criar cobrança) | `external_id`, único por transação | **a Paysure**: `external_id` repetido devolve **409** — *"Já existe uma transação com esse ID Externo"* |
| **Entrada** (receber aviso) | `reference_code` | nós, com restrição de unicidade no banco |

O `external_id` é o nosso `orders.id`. Isso significa que **a criação de cobrança já é idempotente
do lado do provedor** — um retry nosso não cria duas cobranças, devolve 409. É uma proteção de
graça que o desenho precisa usar em vez de reimplementar.

O `reference_code` é exatamente o `externalEventId` que a `LTM-03` ia criar. Confirmado.

---

## 4. Criar a cobrança — `POST /v1/pix/qrcode`

```json
{
  "external_id": "order-12345",
  "value_cents": 10000,
  "postbackUrl": "https://seu-site.com/webhooks/paysure",
  "generator_name": "João da Silva",
  "generator_document": "12345678900",
  "description": "Pedido #12345",
  "expiration_seconds": 3600,
  "splits": [{ "clientId": "parceiro1", "value": 5 }]
}
```

Resposta **201**:

```json
{ "qrcode": { "reference_code": "PSR-...", "external_reference": "order-12345",
              "content": "00020126580014br.gov.bcb.pix..." } }
```

`qrcode.content` é o BR Code copia-e-cola, e também o que vira o QR visual.

### 4.1 Obrigatoriedade campo a campo (lido em 2026-11-18)

O exemplo acima traz **todos** os campos, o que não diz qual é obrigatório. A página do endpoint
diz:

| Campo | Obrigatório | Tipo | Restrição declarada |
|---|---|---|---|
| `external_id` | **sim** | string | único por transação; é a idempotência de saída |
| `value_cents` | **sim** | inteiro | **mínimo 100** (R$ 1,00) |
| `postbackUrl` | **sim** | URI | HTTPS |
| `generator_name` | **não** | string | *"Nome do pagador (cliente final). Opcional."* |
| `generator_document` | **não** | string | *"CPF ou CNPJ do pagador. Opcional."* |
| `description` | não | string | máx. 255 caracteres |
| `expiration_seconds` | não | inteiro | **60 a 86 400**, padrão **3600** |
| `splits` | não | array | máx. 10 itens |

**Duas consequências que mudam decisão:**

1. **`generator_name` e `generator_document` são opcionais.** O formulário da loja **não** muda, e
   o lotemania **não** precisa coletar CPF para criar a cobrança. Era o `[CONFIRMAR]` que bloqueava
   parcialmente a `LTM-03b`; está resolvido, e a resposta é a que evita pedir dado pessoal sem
   necessidade.
2. **`expiration_seconds` aceita 900.** O piso é 60 e o teto 86 400, então amarrar a cobrança ao
   relógio da reserva (`RESERVATION_MINUTES × 60`) cabe no contrato. O padrão de 3600 — e não as
   24 h que a página de webhooks menciona para QR expirado — é o que vale se não mandarmos nada.

---

## 5. Quatro divergências concretas com o lotemania

### 5.1 Dinheiro: centavos contra reais

| | Tipo |
|---|---|
| Paysure | `value_cents` — **inteiro em centavos** |
| `orders.amount` | `numeric(12,2)` — **reais com duas casas** |
| `banking_transactions.amount` | `numeric(14,2)` — idem |

A conversão é uma fronteira, e fronteira de dinheiro mal feita é onde nasce erro de arredondamento.
Tem que ser explícita, em um lugar só, e coberta por teste nos dois sentidos.

### 5.2 Expiração: 24 h contra 15 minutos

O QR Code da Paysure expira em **24 h** por padrão. A reserva de número do lotemania expira em
**15 minutos** (`RESERVATION_MINUTES = 15` em `reserve.ts`).

Sem ajuste, o caso "pagou depois da reserva expirar" deixa de ser exceção e vira **o caminho normal**:
o comprador tem um dia para pagar um número que deixou de ser dele em quinze minutos.

**Decisão que a documentação entrega pronta:** mandar `expiration_seconds = RESERVATION_MINUTES × 60`
(= 900) na criação da cobrança, amarrando os dois relógios. O `AC8` da `LTM-03` continua necessário
para a corrida de segundos, mas deixa de ser a regra.

### 5.3 `end_to_end` não tem onde morar

O aviso traz `end_to_end`. O ETL já lê `paymentEndToEndId` da Sorteamos
(`client_api.py:508-509`). O lotemania só tem `externalReference`. É a mesma aresta que o @po
apontou entre `LTM-03` e `LTM-04` — agora com o nome do campo de origem confirmado.

### 5.4 O aviso traz dado pessoal

`payer_name` e `payer_document` (**CPF**) chegam no corpo, e o corpo inteiro é gravado em
`payment_webhook_events.payload`. Isso é dado pessoal entrando no banco por um caminho que ninguém
declarou — relevante para o portão **G7** do epic e para a política de 2026-11-12. Precisa de
decisão de retenção **antes** de o primeiro aviso real chegar, não depois.

---

## 6. Splits — fora de escopo agora, mas vale saber

Percentual sobre o valor bruto (`value: 5` = 5%, não R$ 0,05), destinatário identificado pelo
**nome de usuário Paysure** (não por id da nossa aplicação), soma máxima 100%, até 10 destinatários
em cash-in. Se o `clientId` não existir como usuário Paysure, **o valor fica retido** aguardando
alocação manual.

É o mecanismo com que a comissão de afiliado poderia ser paga na origem. Não entra agora; fica
registrado porque muda o desenho de afiliados se for adotado.

---

## 7. Limites e erros que o desenho precisa respeitar

| Endpoint | Limite |
|---|---|
| `POST /v1/pix/qrcode` | por chave/conta (**valor não publicado — confirmar com a Paysure**) |
| `POST /v1/pix/payment` | 60/min por usuário |
| `POST /v1/pix/payment/qrcode/preview` | 120/min por usuário |

O limite de criação de cobrança é o que importa: o pico medido do Império é ~5,5 números/minuto
numa rodada e **5 rodadas simultâneas**. Cada pedido é uma cobrança. **Confirmar o número com a
Paysure antes do primeiro sorteio** — não é dado que se possa supor.

Erros relevantes: **409** `external_id` duplicado · **422** validação (inclui splits > 100%) ·
**429** com `Retry-After` · **503** provedor indisponível.

### 7.1 A tabela completa de códigos (lida em 2026-11-18)

| Código | Significado declarado |
|---|---|
| 200 | sucesso (consulta, preview) |
| 201 | recurso criado (cobrança, pagamento) |
| 401 | não autenticado / credenciais inválidas |
| 403 | conta inativa ou acesso negado |
| 404 | recurso não encontrado |
| 409 | conflito (ex.: `external_id` duplicado) |
| 422 | falha de validação |
| 429 | limite de taxa — **`Retry-After` em segundos vem no cabeçalho, confirmado na documentação** |
| 500 | erro interno |
| 501 | **operação não disponível para este recurso** |
| 503 | provedor temporariamente indisponível |

Três códigos que o desenho da `LTM-03b` não tinha previsto: **404**, **500** e **501**. O 501 é o
mais traiçoeiro — não é falha transitória, é *"esta conta/recurso não faz isso"*, e retry nunca
resolve. Trata-se como 422: falha alto, sem retry, nomeando a causa.

### 7.2 O limite do `POST /v1/pix/qrcode` é *por conta*, e isso muda a pergunta

A documentação não omite o limite por descuido: ela diz **"definido por chave/conta"**. Não existe
número publicado porque **não existe número único** — ele é atributo da conta do Império. A pergunta
deixa de ser *"qual é o limite da API?"* (sem resposta possível na documentação) e passa a ser
**"qual é o limite da nossa conta?"**, que só o painel ou o suporte da Paysure responde, junto com
o `ci`/`cs`. Continua `[CONFIRMAR]`, agora com o destinatário certo.

---

## 8. O que ainda falta — e é pouco

| Item | Como se resolve |
|---|---|
| Corpo literal de um aviso **real** em produção | a trilha em `payment_webhook_events` grava antes de decidir — o primeiro aviso de teste já serve |
| ~~Limite de taxa de `POST /v1/pix/qrcode`~~ | **reformulado em 2026-11-18:** é *por conta*, não por API (§7.2). Pergunta vai junto com o `ci`/`cs` |
| ~~Obrigatoriedade de `generator_name` / `generator_document`~~ | **RESOLVIDO em 2026-11-18: são opcionais** (§4.1). O formulário da loja não muda |
| ~~Consulta de cobrança por `external_id`~~ | **RESOLVIDO em 2026-11-18: existe** (§9). `POST /v1/pix/cashin/consult` aceita `external_reference` |
| Se a whitelist de IP por chave será usada | decisão de operação; se sim, o IP de saída do Vercel precisa ser conhecido |
| `ci`/`cs` reais do Império | o cliente ainda não repassou — é o portão **G5**, não engenharia |

**O adaptador da Paysure pode ser escrito agora.** O que falta não bloqueia a implementação:
bloqueia o primeiro pagamento de verdade.

---

## 9. Addendum 2026-11-18 — a consulta existe, e os status não batem entre si

Lido direto do índice oficial (`https://paysure.mintlify.site/llms.txt`) e das páginas
`api-reference/cashin/create-qrcode.md`, `api-reference/cashin/consult.md`, `concepts/errors.md` e
`concepts/webhooks.md`.

### 9.1 `POST /v1/pix/cashin/consult` — a cobrança pode ser consultada

```
POST https://api.paysurebr.com/v1/pix/cashin/consult
corpo: { "reference_code": "PSR-..." }   OU   { "external_reference": "<o nosso orders.id>" }
```

Um dos dois basta. A resposta é um objeto `cashin`:

| Campo | Observação |
|---|---|
| `reference_code` | o id da Paysure |
| `external_reference` | o nosso |
| `value_cents` | inteiro |
| `status` | `pending` · `paid` · `expired` · `refunded` · **`failed`** |
| `payment_date` | anulável |
| `end_to_end` | anulável |
| `payer_name`, `payer_document` | anuláveis — **dado pessoal**, mesma política do §5.4 |

**404** quando não existe.

> ⚠️ **A consulta NÃO devolve `content`.** Ela dá status e `reference_code`, não o BR Code. Então ela
> **não substitui** a gravação da nossa cobrança: um 409 com nossa linha perdida continua deixando o
> comprador sem código para pagar. A tabela `pix_charges` proposta na `LTM-03b` segue necessária, e
> o AC9 segue como está. O que a consulta acrescenta é **reconciliação** — descobrir o estado real de
> uma cobrança quando o aviso não chegou — e isso é valor próprio, não conserto do 409.

### 9.2 Os status divergem entre duas páginas da mesma documentação

| Fonte | Status enumerados |
|---|---|
| `concepts/webhooks.md` (o aviso) | `paid` · `refunded` · `expired` — **três** |
| `api-reference/cashin/consult.md` (a consulta) | `pending` · `paid` · `expired` · `refunded` · **`failed`** — **cinco** |

`pending` e `failed` existem no modelo e **não** aparecem na lista de avisos. Duas leituras possíveis:
a Paysure não avisa esses dois, ou a página de webhooks está incompleta. **Não dá para saber qual, e
a diferença importa:** se um aviso chegar com `failed`, um `parse` que só conhece três status ou
estoura ou — pior — cai num ramo genérico e trata como coisa nenhuma.

**Consequência de desenho:** o `parse` enumera os status que conhece e, para qualquer outro,
**falha alto e registra o valor literal**. Nunca ignora, nunca assume. É o AC1 estendido: não basta
recusar corpo sem chave de topo conhecida; status desconhecido também é recusa nomeada.

### 9.3 O corpo do aviso tem dois campos que não estavam mapeados

A página de webhooks lista, no cash-in: `reference_code`, `external_reference`, `value_cents`,
`status`, `payer_name`, `payer_document`, `payment_date`, **`registration_date`** e **`content`**.

- **`content`** — o BR Code vem **também** no aviso. Não muda o fluxo (a cobrança já foi exibida
  antes), mas é uma segunda fonte do mesmo valor; se divergir do gravado, é sinal de que estamos
  olhando outra cobrança. Vale guardar no evento, que já é gravado cru.
- **`registration_date`** — quando a cobrança nasceu, distinto de `payment_date`.

### 9.4 O aviso de refund é o cash-in **com um evento em cima**

O `refund`/MED não tem corpo próprio: ele é a estrutura do cash-in **mais** `event` (ex.:
`"med_block"`), `reason` e `occurred_at`. Ou seja, **ramificar pela chave de topo não é suficiente
para o refund** — dentro dele, `event` é o que diz o que aconteceu. O cash-out, sim, tem corpo
magro próprio: `reference_code`, `external_reference`, `status`, `end_to_end`, `occurred_at`.

### 9.5 A assinatura HMAC está anunciada como "em breve"

A página de webhooks não documenta cabeçalho de assinatura nenhum e registra validação HMAC como
**"em breve"**. Isso confirma, de uma terceira fonte, que `signature: "none"` é o estado do contrato
— e avisa que ele **vai mudar**. Quando mudar, o adaptador ganha verificação de assinatura **além**
do token da URL, não em lugar dele.

---

*Lido da documentação pública da Paysure em 2026-11-16. Conteúdo de terceiro, transcrito como
referência técnica; nenhuma credencial, nenhum dado pessoal.*
