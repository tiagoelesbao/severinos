# LTM-03b: O adaptador da Paysure — cobrança criada e aviso entendido

**Status:** Ready
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha a **segunda metade** do problema **F3**
**Prioridade:** **P0** — é o último elo entre o comprador e o título; sem ela o lotemania representa a paysure e não fala com ela
**Complexidade:** L (Standard) — um adaptador de entrada + um cliente de saída, sobre o arcabouço da `LTM-03a`
**Criada por:** @pm (Morgan) · 2026-11-16
**Substitui:** `LTM-03` (dividida após NO-GO do @po em 2026-11-16) · par: `LTM-03a`

> **O código desta story pode ser escrito agora.** O contrato inteiro da Paysure está documentado em `docs/research/2026-11-16-paysure-contrato.md`, lido da documentação oficial em 2026-11-16: autenticação, payload de entrada nos três fluxos, payload de saída, status, reentrega, idempotência, limites e erros. O que **não** está disponível é o `ci`/`cs` do Império — e isso bloqueia **o primeiro pagamento real**, não a implementação. Ver *Dependências*.

> ### Atualização 2026-11-18 — dois dos três `[CONFIRMAR]` foram respondidos pela própria documentação
>
> A documentação foi relida em profundidade (`llms.txt` oficial, páginas `cashin/create-qrcode`, `cashin/consult`, `concepts/errors`, `concepts/webhooks`) e está registrada em `docs/research/2026-11-16-paysure-contrato.md` §4.1, §7.1, §7.2 e §9.
>
> | `[CONFIRMAR]` | Resposta |
> |---|---|
> | `generator_name` / `generator_document` são obrigatórios? | **Não — os dois são opcionais.** O formulário da loja **não** muda e o lotemania **não** pede CPF para cobrar. O bloqueio parcial desta story deixou de existir. |
> | Existe consulta de cobrança por `external_id`? | **Sim** — `POST /v1/pix/cashin/consult`, que aceita `external_reference`. **Mas ela não devolve o `content`**, então **não** substitui `pix_charges`: o AC9 fica como está. Ver item 4. |
> | Limite de taxa de `POST /v1/pix/qrcode` | **Reformulado:** a documentação diz *"definido por chave/conta"* — não existe número de API, existe número **da conta do Império**. Pergunta vai junto com o `ci`/`cs`, não antes. |
>
> Três fatos novos entram no escopo, e estão refletidos nos ACs abaixo: os status divergem entre duas páginas da mesma documentação (§9.2), o aviso de refund é o cash-in **com um `event` em cima** (§9.4), e existem **404, 500 e 501** além das seis classes de erro já previstas (§7.1).

## Story

**Como** operador do Império migrando da Sorteamos
**Eu quero** que o lotemania crie a cobrança PIX na paysure e entenda o aviso que ela devolve
**Para que** o pedido feche sozinho, com o mesmo gateway que já recebe o dinheiro hoje, sem ninguém apertar "simular pagamento".

## Contexto

### O que a `LTM-03a` entrega e esta story usa

| Peça | Para quê |
|---|---|
| `paysure` nas duas listas e nos três consumidores | a rota resolve, a credencial salva, a tela mostra |
| Credencial multi-campo cifrada | `ci` e `cs` cabem no mesmo registro |
| Token opaco por `(tenant, provider)` na URL | é a autenticidade do aviso — a paysure não assina nada |
| `settle-order.ts` transacional | o fechamento, que esta story apenas aciona |
| `money.ts` | `value_cents` ↔ `numeric(12,2)` |
| Arcabouço `GatewayAdapter` com `verify` + `parse` | onde o adaptador da paysure se registra |
| `externalEventId` com unicidade | a chave que o `parse` desta story compõe |
| `paymentId` / `endToEndId` em `banking_transactions` | onde `reference_code` e `end_to_end` moram |

Enquanto esta story não existir, a `paysure` é recusada **em voz alta** pelo AC-F2 da `LTM-03a` — visível na lista do operador, nunca aceita em silêncio.

### O contrato, em quatro fatos que mudam o desenho

Fonte: `docs/research/2026-11-16-paysure-contrato.md`.

1. **Autenticação são dois cabeçalhos:** `ci` (Client ID, público) e `cs` (Client Secret, privado). Base `https://api.paysurebr.com/v1`. A própria Paysure recomenda variável de ambiente e chaves separadas para produção e teste. Erros: **401** `Missing client_id or client_secret`, **401** `Invalid credentials or inactive`, **403** `Account inactive`.
2. **O aviso ramifica pela chave de topo, não por um campo `type`:** `{ "cashin": {...} }`, `{ "cashout": {...} }`, `{ "refund": {...} }`. O `parse` **tem** que ramificar por isso.
3. **A criação de cobrança já é idempotente do lado dela:** `external_id` repetido devolve **409** — *"Já existe uma transação com esse ID Externo"*. Um retry nosso não cria duas cobranças. É proteção de graça; o desenho **usa** em vez de reimplementar.
4. **O relógio da cobrança e o da reserva não batem:** o QR dura **24 h** por padrão; a reserva do lotemania dura **15 min** (`RESERVATION_MINUTES = 15`, `src/lib/actions/reserve.ts:17`). Sem ajuste, "pagou depois da reserva expirar" deixa de ser exceção e vira **o caminho normal** — o comprador tem um dia para pagar um número que deixou de ser dele em quinze minutos.

### O relógio da reserva está declarado em três lugares, e nenhum conhece o outro

| Onde | Forma |
|---|---|
| `src/lib/actions/reserve.ts:17` | `const RESERVATION_MINUTES = 15;` — não exportado |
| `src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx:63` | o texto *"Números reservados por 15 minutos"*, escrito à mão |
| a criação da cobrança (não existe ainda) | `expiration_seconds` iria para a Paysure |

Esta story amarra os três ao primeiro. É a razão pela qual ela toca `reserve.ts` — e é a razão pela qual **não pode compartilhar onda com a `LTM-04`** (ver nota de ondas).

### Quem escolhe o gateway já existe, e não é validado

`orders.payment_gateway_provider` é `varchar(64)` (`src/db/schema/raffles.ts:108-110`) e **nenhum código escreve nele** — busca por `paymentGatewayProvider` encontra apenas o uso em `product-settings`. A escolha por sorteio existe em `src/lib/validations/product-settings.ts:62` como `z.string().nullable()` — texto livre, **não validado** contra a lista de provedores. É uma **quarta** cópia da ideia "qual provedor", agora sem lista nenhuma. Esta story resolve a cobrança do pedido e preenche `orders.payment_gateway_provider`; **validar o campo de produto contra a lista fica registrado como item solto** (ver OUT).

## Decisão de arquitetura (proposta)

### 1. `verify` da paysure não verifica assinatura — porque não existe assinatura

O adaptador declara explicitamente `signature: "none"` e a autenticidade é o token da URL, já verificado pela rota da `LTM-03a`. **Isto precisa estar escrito no código**, não implícito: a próxima pessoa que abrir o arquivo tem que ler *por que* não há verificação, senão a trata como esquecimento e "conserta" inventando um HMAC — exatamente o erro que o `x-webhook-signature` genérico já cometeu nesta base.

### 2. `parse` ramifica pela chave de topo e compõe a chave de idempotência

| Campo do aviso (cash-in) | Vira |
|---|---|
| `external_reference` | `orderRef` — é o nosso `orders.id` |
| `value_cents` | `amountCents` (conferido contra `orders.amount`, AC-E3 da `LTM-03a`) |
| `status` | `paid` \| `refunded` \| `expired` |
| `reference_code` | `paymentId` **e** parte da chave de idempotência |
| `end_to_end` | `endToEndId` |
| `payment_date` | `paidAt` |
| `payer_name`, `payer_document` | **não entram no fechamento.** CPF mascarado na escrita (AC-G2 da `LTM-03a`) |

Chave de idempotência: `cashin:{reference_code}:{status}` — estável entre reentregas, distinta entre `paid` e `refunded` do mesmo `reference_code`. `cashout` e `refund` são **reconhecidos e registrados**, não processados (ver OUT).

#### 2.1 Os status divergem entre duas páginas da mesma documentação — e o `parse` tem que assumir isso

| Fonte | Status enumerados |
|---|---|
| `concepts/webhooks.md` (o aviso) | `paid` · `refunded` · `expired` — **três** |
| `api-reference/cashin/consult.md` (a consulta) | `pending` · `paid` · `expired` · `refunded` · **`failed`** — **cinco** |

`pending` e `failed` existem no modelo e **não** aparecem na lista de avisos. Não há como saber se a Paysure não avisa esses dois ou se a página de webhooks está incompleta — e a diferença importa: um aviso com `failed` contra um `parse` que conhece três status ou estoura ou, pior, cai num ramo genérico e é tratado como coisa nenhuma.

**Regra:** o `parse` enumera os status que conhece e, para qualquer outro, **falha alto registrando o valor literal recebido**. Nunca ignora, nunca assume. Vale para status e vale para `event`.

#### 2.2 O aviso de refund é o cash-in **com um evento em cima**

O `refund`/MED não tem corpo próprio: é a estrutura do cash-in **mais** `event` (ex.: `"med_block"`), `reason` e `occurred_at`. Ramificar pela chave de topo **não basta** no refund — dentro dele, `event` é o que diz o que aconteceu, e é desconhecido quantos valores de `event` existem. O cash-out, sim, tem corpo magro próprio: `reference_code`, `external_reference`, `status`, `end_to_end`, `occurred_at`.

#### 2.3 Dois campos do aviso que não estavam mapeados

- **`content`** — o BR Code vem **também** no aviso. Não muda o fluxo (a cobrança já foi exibida antes), mas é uma segunda fonte do mesmo valor: se divergir do gravado em `pix_charges`, estamos olhando outra cobrança. O evento já é gravado cru, então o valor fica rastreável sem campo novo.
- **`registration_date`** — quando a cobrança nasceu, distinto de `payment_date`.

### 3. Criar a cobrança: `POST /v1/pix/qrcode`

```
external_id         = orders.id               (idempotência de saída, garantida pela Paysure)
value_cents         = money.toCents(orders.amount)
postbackUrl         = a URL tokenizada do tenant/provider (LTM-03a)
expiration_seconds  = RESERVATION_MINUTES * 60   (= 900)
description         = "Pedido #" + orders.id curto
generator_name      / generator_document      ver item 5
```

Resposta **201** devolve `qrcode.reference_code` e `qrcode.content` — o BR Code copia-e-cola, que também é o que vira o QR visual.

**`expiration_seconds = RESERVATION_MINUTES × 60` é a decisão que a documentação entrega pronta.** Com ela, o AC-C6 da `LTM-03a` (pagamento atrasado) volta a ser exceção de corrida de segundos, em vez de ser a regra.

### 4. A cobrança tem que ser persistida — senão o 409 é irrecuperável

O 409 da Paysure diz "essa transação já existe" e **não devolve o `content`**. Se não guardarmos o BR Code da primeira tentativa, um retry deixa o comprador sem código para pagar e sem caminho de recuperação.

**Proposta:** tabela `pix_charges` em `src/db/schema/payments.ts` — uma linha por cobrança: `order_id`, `provider`, `reference_code`, `br_code`, `expires_at`, `created_at`, com unicidade em `(tenant_id, provider, reference_code)` e em `(order_id)`. Criar a cobrança é: ler a nossa linha se existir, senão chamar o provedor e gravar. O 409 passa a ser um caminho **com saída**: ler o que já temos. Se não tivermos — estado que só ocorre se a gravação falhar após a chamada — **falha alto** para o operador.

> **RESPONDIDO em 2026-11-18 — a consulta existe, e não resolve o 409.** `POST /v1/pix/cashin/consult` aceita `{ "external_reference": "<orders.id>" }` e devolve `status`, `reference_code`, `value_cents`, `end_to_end`, `payment_date`. **Não devolve `content`** — ou seja, não devolve o BR Code. Um 409 com a nossa linha perdida continua deixando o comprador sem código para pagar, então **`pix_charges` segue obrigatória e o AC9 fica como está**.
>
> O que a consulta acrescenta é **reconciliação**: descobrir o estado real de uma cobrança quando o aviso não chegou (a Paysure reentrega três vezes e depois para). Isso tem valor próprio e **fica OUT desta story** — é uma rotina de conciliação, não o caminho do pagamento. Registrado para o @po.

### 5. `generator_name` e `generator_document` — **não mandamos**

**RESPONDIDO em 2026-11-18:** os dois são **opcionais** (`docs/research/2026-11-16-paysure-contrato.md` §4.1, texto literal da documentação: *"Nome do pagador (cliente final). Opcional."* / *"CPF ou CNPJ do pagador. Opcional."*).

O lotemania coleta telefone na reserva (`reserve.ts`); nome e CPF podem não existir no momento da cobrança. Como são opcionais, a decisão é **omiti-los** — e isso é a decisão boa por dois motivos, não só por conveniência:

1. **O formulário da loja não muda.** O risco [Alto] que esta story carregava desapareceu.
2. **Não enviamos dado pessoal que não precisamos enviar.** Mandar CPF para um terceiro sem necessidade é expandir a superfície de dado pessoal de graça — e o §5.4 do contrato já registra que o *aviso* traz `payer_document` de volta, o que é problema suficiente.

Os três campos obrigatórios são `external_id`, `value_cents` (mínimo **100** centavos) e `postbackUrl`. **Não inventar valor de preenchimento para nenhum campo opcional.**

### 6. Erros e limites são tratados por classe, não por tentativa cega

| HTTP | Significado | Comportamento |
|---|---|---|
| 201 | criada | grava `pix_charges`, devolve o BR Code |
| 409 | `external_id` duplicado | lê a nossa linha; sem ela, falha alto |
| 422 | validação | falha alto com o motivo, sem retry — retry não corrige payload inválido |
| 429 | limite de taxa | respeita o `Retry-After`; nunca retry imediato |
| 401 / 403 | credencial ausente, inválida ou conta inativa | falha alto **nomeando a causa**, e o item vai para a lista do operador — não é erro de comprador |
| 503 | provedor indisponível | retry com recuo, teto declarado |
| **404** | recurso não encontrado | falha alto. Na criação não deveria ocorrer; se ocorrer, é rota ou base errada — problema nosso, nomeado |
| **500** | erro interno da Paysure | retry com recuo, igual ao 503 |
| **501** | *"operação não disponível para este recurso"* | **falha alto, sem retry.** Não é transitório: é a conta que não faz isso. Retry nunca resolve — trata-se como 422 |

Acrescentados em 2026-11-18 a partir de `concepts/errors.md` (§7.1 do contrato): **404**, **500** e **501** não estavam previstos. O **501** é o traiçoeiro, porque um tratamento genérico de 5xx o colocaria em laço de retry eterno sobre uma condição permanente.

> **[CONFIRMAR] o limite de taxa de `POST /v1/pix/qrcode` — com a conta, não com a documentação.** Relido em 2026-11-18: a documentação **não omite** o número, ela diz *"definido por chave/conta"*. Não existe número de API; existe número **da conta do Império**. O pico medido do Império é ~5,5 números/minuto numa rodada, com **5 rodadas simultâneas** (BI, janela de 7 dias de 2026-11-16), e cada pedido é uma cobrança. É pouco para qualquer limite plausível, e ainda assim **não é dado que se possa supor** antes do primeiro sorteio. A pergunta vai junto com o pedido do `ci`/`cs`, ao mesmo destinatário.

### 7. Credencial: lida da configuração, nunca do repositório

O `ci`/`cs` vive em `payment_gateways.credentials_encrypted` (modelo multi-campo da `LTM-03a`), cifrado. A própria Paysure recomenda variável de ambiente; aqui o equivalente multi-tenant é a credencial por tenant cifrada no banco. **Nenhuma credencial neste repositório, em nenhuma hipótese** — nem em fixture, nem em teste, nem em comentário.

## Tarefas (Checklist)

- [ ] `src/lib/actions/reserve.ts`: **exportar** `RESERVATION_MINUTES` (única mudança neste arquivo — é o que amarra os três relógios).
- [ ] `src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx`: o texto "15 minutos" passa a derivar da constante, deixando de ser número escrito à mão.
- [ ] `src/db/schema/payments.ts`: tabela `pix_charges` + migração.
- [ ] `src/lib/payments/providers/paysure.ts` (novo): `verify` (token, `signature: "none"` documentado — **e documentado também que a Paysure anuncia HMAC "em breve"**, para quem ler depois saber que isto vai mudar) + `parse` (ramificação por chave de topo, `event` dentro do refund, mapeamento da tabela acima, chave de idempotência composta, **recusa nomeada para status ou `event` desconhecido**).
- [ ] `src/lib/payments/providers/index.ts`: registrar o adaptador — a `paysure` deixa de cair no `unsupported_provider`.
- [ ] `src/lib/payments/paysure-client.ts` (novo): `POST /v1/pix/qrcode` com `ci`/`cs`, **somente os três campos obrigatórios + `expiration_seconds` + `description`** (nada de `generator_*` nem `splits`), `expiration_seconds` derivado de `RESERVATION_MINUTES`, guarda do mínimo de 100 centavos antes da chamada, e tratamento das **nove** classes de resposta do item 6.
- [ ] `src/lib/actions/pix-charge.ts` (novo): ação de servidor que cria ou recupera a cobrança do pedido e preenche `orders.payment_gateway_provider`.
- [ ] `src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx` + `payment-status.tsx`: exibir o BR Code copia-e-cola e o QR; o botão "Simular pagamento" passa a aparecer **somente** quando não há gateway ativo para o tenant.
- [ ] Testes: todos os ACs abaixo, com servidor da Paysure **dublado** — nenhum teste chama a API real.

## Critérios de Aceite

### Entrada — o aviso

- [ ] **AC1 (os três fluxos são distinguidos pela chave de topo):** `{cashin}`, `{cashout}` e `{refund}` são identificados corretamente; corpo sem nenhuma das três chaves é recusado com motivo nomeado, não interpretado como cash-in. Fixtures sintéticas dos três.
- [ ] **AC2 (o mapeamento de cash-in está completo):** para um aviso de `cashin` com `status: "paid"`, o `parse` devolve `orderRef` = `external_reference`, `amountCents` = `value_cents`, `paymentId` = `reference_code`, `endToEndId` = `end_to_end`, `paidAt` = `payment_date`. Campo a campo, por asserção.
- [ ] **AC3 (o aviso fecha o pedido ponta a ponta):** POST na URL tokenizada com um aviso de `cashin`/`paid` que casa com um pedido pendente → o pedido fica `paid`, os números `sold`, há **uma** linha de crédito com `paymentId` e `endToEndId` preenchidos. É o AC-C1 da `LTM-03a` exercitado pelo provedor real, com dublê.
- [ ] **AC4 (não há assinatura e isso está declarado):** o adaptador da paysure declara `signature: "none"`; um aviso **sem** `x-webhook-signature` e com token válido **é aceito**; o mesmo aviso com token inválido é recusado. Teste de regressão do erro que a `LTM-03` ia cometer — sob o esquema antigo, 100% dos avisos da paysure seriam rejeitados com 401.
- [ ] **AC5 (ciclo de vida não é duplicata):** `paid` e depois `refunded` com o **mesmo** `reference_code` produzem dois eventos distintos; o `refunded` é registrado e **não** reverte nada nesta story (AC-F3 da `LTM-03a`). O mesmo `paid` repetido continua sendo duplicata.
- [ ] **AC6 (`expired` é registrado):** aviso de `status: "expired"` é registrado com estado próprio, não fecha nem cancela nada, e aparece na lista do operador.
- [ ] **AC6b (status desconhecido é recusa nomeada, não ramo genérico):** aviso de `cashin` com `status: "failed"` e com `status: "banana"` → **cada um** é recusado com o valor literal registrado, o pedido intocado e item na lista do operador. Nenhum dos dois cai em ramo genérico nem é tratado como `paid`. Existe porque a própria documentação se contradiz (item 2.1): `failed` e `pending` estão no modelo e não na lista de avisos.
- [ ] **AC6c (o refund ramifica pelo `event`, não só pela chave de topo):** aviso de `refund` com `event: "med_block"` é registrado com `event` e `reason` preservados; aviso de `refund` com `event` **desconhecido** é recusado com o valor literal registrado, pelo mesmo motivo do AC6b (item 2.2).

### Saída — a cobrança

- [ ] **AC7 (a cobrança nasce com os dois relógios amarrados):** a chamada de criação envia `expiration_seconds` **igual** a `RESERVATION_MINUTES × 60`. Teste que lê o corpo enviado ao dublê e compara com a constante importada — não com o literal `900`. Mudar a constante tem que mudar a cobrança.
- [ ] **AC8 (a cobrança é persistida antes de ser mostrada):** criação bem-sucedida grava `pix_charges` com `reference_code`, BR Code e expiração; a tela exibe o BR Code que está gravado, não um valor em memória.
- [ ] **AC9 (409 tem saída):** segunda chamada para o mesmo pedido com o dublê devolvendo **409** não cria cobrança nova e devolve **o mesmo BR Code** da primeira. Se não houver linha gravada, falha alto com motivo nomeado — **nunca** devolve tela sem código de pagamento.
- [ ] **AC10 (as classes de erro são distinguidas):** o dublê devolvendo **401, 403, 404, 422, 429 (com `Retry-After`), 500, 501 e 503** produz, para cada caso: mensagem nomeando a causa, decisão de retry conforme o item 6 e registro para o operador. **Oito** casos, oito asserções. Em particular: **nenhum retry em 422, 404 nem 501** — o 501 é permanente e um tratamento genérico de 5xx o colocaria em laço eterno; `Retry-After` respeitado em 429; recuo com teto em 500 e 503.
- [ ] **AC10b (o mínimo de valor é respeitado):** `value_cents` abaixo de **100** (R$ 1,00) é recusado **antes** da chamada, com motivo nomeado — não gasta chamada para colher 422. O mínimo é declarado na documentação (§4.1 do contrato) e um título de R$ 0,50 é configuração plausível num sorteio.
- [ ] **AC10c (nenhum campo opcional é inventado):** o corpo enviado ao dublê contém **exatamente** `external_id`, `value_cents`, `postbackUrl`, `expiration_seconds` e `description`. **Não** contém `generator_name`, `generator_document` nem `splits`. Asserção sobre as chaves do corpo, não só sobre os valores — é a regra "não inventar valor de preenchimento" virando teste.
- [ ] **AC11 (nenhuma credencial no repositório):** o cliente lê `ci`/`cs` da credencial cifrada do tenant; os testes usam valores sintéticos; uma varredura nos artefatos da story não encontra credencial real. Nenhum teste faz chamada de rede à Paysure.
- [ ] **AC12 (o provedor do pedido fica registrado):** o pedido com cobrança criada tem `orders.payment_gateway_provider` preenchido — hoje a coluna existe e **nenhum** código escreve nela.
- [ ] **AC13 (a simulação sai do caminho quando há gateway):** com um gateway ativo para o tenant, o botão "Simular pagamento (ambiente de teste)" **não** é renderizado; sem gateway ativo, continua aparecendo. `simulatePayment` não é removida — ela é o caminho de teste e segue chamando `settle-order`.
- [ ] **AC14 (o relógio tem uma só fonte):** uma busca por `15` como número de minutos de reserva encontra **uma** declaração; o texto da tela de pedido deriva dela. Regressão dos três lugares desalinhados.
- [ ] **AC15 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck` e `pnpm build` passam ao fim da story.

### O que **não** é AC desta story

**Pagamento real em produção.** É o portão **G5** do epic. Esta story é dada por `Done` com o servidor da Paysure dublado e os 15 ACs acima verdes. O primeiro pagamento real é um **marco do epic**, não um critério de aceite daqui — foi exatamente a inversão disso que travou a `LTM-03` em ciclo fechado (AC11 original dependia de G5, que dependia de G1, que dependia da story).

## Escopo

**IN:** adaptador `paysure` de entrada (`verify` sem assinatura + `parse` dos três fluxos); cliente de saída `POST /v1/pix/qrcode` com `ci`/`cs`; `expiration_seconds` derivado de `RESERVATION_MINUTES`; tabela `pix_charges` e recuperação de 409; tratamento das seis classes de erro; exibição do BR Code e do QR na tela do pedido; `orders.payment_gateway_provider` preenchido; exportação da constante de reserva e remoção do "15 minutos" escrito à mão; testes com dublê.

**OUT:**

- **Pagamento real em produção** — portão **G5**. Precisa do `ci`/`cs` do Império, que o cliente ainda não repassou.
- **Processar `cashout` e `refund`** — reconhecidos e registrados (AC5, AC6), não aplicados. Estorno e saque são fluxos próprios, com dinheiro saindo; não entram de carona.
- **Splits de comissão** — percentual sobre o bruto, destinatário identificado pelo **nome de usuário Paysure** (não por id nosso), soma máxima 100%, até 10 destinatários, e **valor retido** se o destinatário não existir. Muda o desenho de afiliados; é decisão de produto, não de adaptador.
- **Whitelist de IP por chave** no painel da Paysure — exige conhecer o IP de saída do Vercel; decisão de operação (founder + @devops).
- **Rotina de reconciliação por `POST /v1/pix/cashin/consult`** — descobrir o estado real de uma cobrança quando o aviso não chegou (a Paysure reentrega três vezes e depois para). O endpoint existe e foi confirmado em 2026-11-18, mas isto é uma rotina de conciliação com relógio próprio, não o caminho do pagamento. **Fica registrado como item solto para o @po priorizar.**
- **Validar `product_settings.paymentGatewayProvider` contra a lista de provedores** — hoje é `z.string().nullable()`, texto livre. É a quarta cópia da ideia "qual provedor" e merece conserto, mas é tela de produto, não caminho de pagamento. **Fica registrado como item solto para o @po priorizar.**
- **Os 16 adaptadores restantes** — fora da paridade por decisão do founder (2026-11-16).

## Dependências

- **Depende de `LTM-03a` (bloqueante e total).** Todo o arcabouço vem de lá; sem ela não há onde registrar o adaptador, não há token, não há `settle-order`, não há `money.ts`.
- **Depende de `LTM-00` (satisfeita)**, `LTM-01`, `LTM-02` e `LTM-05` por transitividade da `LTM-03a`.
- **Bloqueio externo — dono: founder — bloqueia o portão G5, NÃO esta story.**

  | O que falta | Quem | Para quê | Bloqueia |
  |---|---|---|---|
  | `ci` / `cs` reais do Império | cliente, via founder | primeiro pagamento real | **G5** — não a implementação, não os ACs |
  | Limite de taxa da **conta** no `POST /v1/pix/qrcode` | perguntar à Paysure **junto com o `ci`/`cs`** | dimensionar o pico de 5 rodadas simultâneas | **G4** (carga) — a documentação diz *"definido por chave/conta"*, então não há número a procurar |
  | ~~Obrigatoriedade de `generator_name` / `generator_document`~~ | — | — | **RESOLVIDO 2026-11-18: são opcionais.** Não bloqueia nada; o formulário da loja não muda |
  | ~~Consulta de cobrança por `external_id`~~ | — | — | **RESOLVIDO 2026-11-18: existe**, e não devolve o BR Code. O AC9 fica como está |

  **A distinção é a razão de esta story existir separada:** nada acima impede escrever e testar o código. Impede ligar o dinheiro. Depois de 2026-11-18, **nada acima bloqueia nem parcialmente esta story** — o único item aberto é de dimensionamento (G4) e chega junto com a credencial (G5).

- **Corpo literal de um aviso real** — **não é mais pré-requisito.** Os três formatos estão documentados (`docs/research/2026-11-16-paysure-contrato.md` §2). A trilha em `payment_webhook_events` grava o corpo **antes** de qualquer decisão, então o primeiro aviso de teste confirma o formato depois, sem bloquear a implementação antes. Era a exigência circular do AC11 da `LTM-03`; está resolvida pela documentação.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

**Onda 4, sozinha.** Conjunto de arquivos **completo**:

```
Files:
  apps/lotemania/src/lib/payments/providers/paysure.ts                          (novo)
  apps/lotemania/src/lib/payments/providers/index.ts                            (editado — criado pela LTM-03a)
  apps/lotemania/src/lib/payments/providers/types.ts                            (POSSIVELMENTE editado — ver nota)
  apps/lotemania/src/lib/payments/paysure-client.ts                             (novo)
  apps/lotemania/src/lib/actions/pix-charge.ts                                  (novo)
  apps/lotemania/src/lib/actions/reserve.ts                                     (uma linha: exportar a constante)
  apps/lotemania/src/db/schema/payments.ts                                      (tabela pix_charges)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/payment-status.tsx
  apps/lotemania/drizzle/**                                                     (migração gerada)
  apps/lotemania/tests/payments/paysure/**                                      (novo)

Resources:
  banco de teste            — COMPARTILHADO com LTM-04 e LTM-05. Base/esquema próprio por tarefa,
                              ou serialização. Nome de branch não isola banco.
  dublê HTTP da Paysure     — porta local própria da suíte; se duas tarefas de teste subirem dublê
                              na mesma porta, colidem. Porta por tarefa, declarada.
  pnpm db:generate          — escreve drizzle/meta/_journal.json. Serializar.
  NENHUMA chamada à API real da Paysure em nenhum teste.

Depends-on: LTM-03a (total)
```

> **Nota sobre `types.ts` (acrescentada em 2026-11-18).** O `ParsedEvent` da `LTM-03a` tem `status`, e `ParseResult` já suporta `{ ok: false, reason }` — então a recusa de status desconhecido (AC6b) **não** exige mudança de tipo. O que pode exigir é o **`event` do refund** (AC6c): `ParsedEvent` não tem onde guardá-lo. Dois caminhos aceitáveis, e o @dev escolhe: compor `externalEventId = refund:{reference_code}:{event}` e deixar o `event` literal apenas no payload cru já gravado, **ou** acrescentar um campo opcional em `ParsedEvent`. O arquivo está declarado aqui para o caso do segundo — a onda 4 está sozinha, então não há colisão possível, mas o conjunto precisa estar completo de qualquer modo.

- ⛔ **Não pode compartilhar onda com a `LTM-04`:** as duas tocam `src/lib/actions/reserve.ts`. Conjuntos não disjuntos — a regra manda separar. Como esta depende da `LTM-03a` (onda 3), a onda 4 resolve naturalmente.
- ⛔ **Não pode compartilhar onda com a `LTM-03a`:** as duas tocam `src/db/schema/payments.ts` e `src/lib/payments/providers/index.ts`, e esta depende daquela.
- 💡 **Alternativa para @po/@architect:** se exportar `RESERVATION_MINUTES` for dobrado na `LTM-02` (que já é dona de `reserve.ts`, sozinha na onda 2), esta story deixa de tocar `reserve.ts` e **poderia** ir para a onda 3. Não foi feito aqui porque a `LTM-02` já está `Ready` e validada — mexer no escopo dela sem o @po é pior do que esperar uma onda.

## Riscos

- **[Alto] Implementar sobre documentação e o produtivo divergir.** É o risco estrutural: o contrato veio da documentação oficial, não de um aviso observado. Mitigação em três camadas: (i) `payment_webhook_events` grava o corpo cru **antes** de qualquer decisão, então o primeiro aviso de teste expõe a divergência com rastro; (ii) `parse` que não reconhece o formato **falha alto e registra**, nunca adivinha; (iii) o AC1 recusa corpo sem chave de topo conhecida em vez de tratá-lo como cash-in. O risco não é eliminado — é tornado **visível no primeiro evento**, em vez de descoberto num pedido perdido.
- ~~**[Alto] `generator_document` obrigatório** virar requisito de formulário descoberto no primeiro pagamento real.~~ **ELIMINADO em 2026-11-18:** a documentação declara os dois campos **opcionais** (§4.1 do contrato). A decisão é omiti-los, e o AC10c trava isso por asserção sobre as chaves do corpo.
- **[Médio] Status ou `event` que a documentação não lista chegar em produção.** É consequência direta da contradição do item 2.1: `failed` e `pending` estão no modelo da consulta e fora da lista de avisos. Mitigação: AC6b e AC6c — recusa nomeada com o valor literal registrado, nunca ramo genérico. O risco não é eliminado, é tornado **visível no primeiro evento** em vez de descoberto num pedido fechado errado.
- **[Médio] Tratamento genérico de 5xx colocar o 501 em laço de retry eterno** sobre uma condição permanente (*"operação não disponível para este recurso"*). Mitigação: AC10 exige os oito códigos distinguidos, com 501 explicitamente sem retry.
- **[Médio] Expiração de 900 s divergir da reserva** se alguém mudar `RESERVATION_MINUTES` e a cobrança não acompanhar. Mitigação: AC7 compara com a constante importada, não com o literal.
- **[Médio] 409 sem linha gravada** deixar o comprador sem código. Mitigação: AC9 exige falha alta e motivo; a gravação precede a exibição (AC8).
- **[Médio] Credencial inválida ou conta inativa** aparecer como erro de comprador. Mitigação: AC10 exige 401/403 nomeados e encaminhados ao operador, não ao cliente.
- **[Baixo] Limite de taxa desconhecido** estourar num esgotamento de 18 min com 5 rodadas. Mitigação: o pico medido (~5,5 números/minuto por rodada) é baixo para qualquer limite plausível; `[CONFIRMAR]` antes de G4; 429 com `Retry-After` já tratado (AC10).

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Respostas da Paysure aos `[CONFIRMAR]`
| Pergunta | Resposta | Quem perguntou / quando |
|---|---|---|
| Limite de taxa de `POST /v1/pix/qrcode` | **Não existe número de API: a documentação diz "definido por chave/conta".** A pergunta certa é o limite da conta do Império, e vai junto com o pedido do `ci`/`cs`. | @aiox-master, na documentação oficial · 2026-11-18 |
| `generator_name` / `generator_document` obrigatórios? | **Não — os dois são opcionais.** Texto literal: *"Nome do pagador (cliente final). Opcional."* / *"CPF ou CNPJ do pagador. Opcional."* Decisão: **omitir** (item 5). | @aiox-master, em `api-reference/cashin/create-qrcode` · 2026-11-18 |
| Existe consulta de cobrança por `external_id`? | **Sim:** `POST /v1/pix/cashin/consult` com `{ "external_reference": ... }`. **Não devolve `content`**, então não substitui `pix_charges`; serve para reconciliação, que ficou OUT. | @aiox-master, em `api-reference/cashin/consult` · 2026-11-18 |

### Primeiro aviso real recebido (conferência pós-implementação, não pré-requisito)
_(colar o corpo **mascarado** — sem nome, sem CPF — e registrar se o formato conferiu com a documentação. Divergência aqui é achado, não falha da story.)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | **Draft → Ready.** Releitura profunda da documentação oficial responde dois dos três `[CONFIRMAR]` e reformula o terceiro: `generator_*` são **opcionais** (risco [Alto] eliminado, decisão é omiti-los), a consulta por `external_id` **existe** mas não devolve o BR Code (AC9 inalterado; reconciliação vai para OUT), e o limite de taxa é **por conta**, não por API. Três fatos novos entram: os status divergem entre duas páginas da mesma documentação (AC6b), o refund é o cash-in com um `event` em cima (AC6c), e existem 404/500/501 além das seis classes previstas (AC10 vira oito casos). Acrescentados AC10b (mínimo de 100 centavos) e AC10c (nenhum campo opcional inventado). | @aiox-master |
| 2026-11-16 | 1.0 | Nasce da divisão da `LTM-03` após NO-GO do @po (6,5/10). O AC11 circular da `LTM-03` deixa de existir: o contrato da Paysure está documentado (`docs/research/2026-11-16-paysure-contrato.md`), então o adaptador é escrevível agora e só o **pagamento real** espera o `ci`/`cs` — que é o portão G5 e não critério de aceite. Acrescenta o cliente de saída, `expiration_seconds` amarrado ao relógio da reserva, `pix_charges` para recuperar o 409, as seis classes de erro e três `[CONFIRMAR]` nomeados. | @pm (Morgan) |
