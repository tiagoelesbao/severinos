# LTM-03a: O caminho do dinheiro fecha o pedido — sem credencial, sem invenção

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha a **primeira metade** do problema **F3**
**Prioridade:** **P0** — enquanto este `TODO` existir, **ninguém consegue comprar nada** no lotemania
**Complexidade:** XL (Standard) — fechamento transacional + idempotência + modelo de credencial multi-campo + autenticidade de webhook
**Criada por:** @pm (Morgan) · 2026-11-16
**Substitui:** `LTM-03` (dividida após NO-GO do @po em 2026-11-16) · par: `LTM-03b`

> **Esta story é testável hoje, sem nenhuma credencial.** Nada aqui depende de `ci`/`cs` do Império, de aviso real em produção ou de login no painel da Sorteamos. O que depende disso é a `LTM-03b`.

## Story

**Como** comprador que acabou de pagar um PIX de R$ 61
**Eu quero** que meu título fique meu no instante em que o provedor confirma o pagamento
**Para que** eu não perca o número por expiração de reserva depois de já ter pagado — e para que a reentrega do mesmo aviso pelo provedor não venda meu número a mais ninguém.

## Contexto (evidência lida no código e na documentação do provedor, 2026-11-16)

### Onde o caminho do dinheiro para hoje

`apps/lotemania/src/app/api/webhooks/payment/[tenant]/[provider]/route.ts:77-81`:

```
// TODO: match payload to an order (by externalReference / orderId) and
// mark it paid via bankingTransactions + orders.status once a real
// provider's payload shape is wired up.
return NextResponse.json({ ok: true });
```

Assinatura válida, evento gravado, **pedido intocado**. Os zero pedidos pagos do app têm exatamente esta causa.

### O que está bem feito e precisa ser preservado

- receptor genérico único por `(tenant, provider)`, em vez dos 18 endpoints dedicados da plataforma anterior;
- a **implementação** do HMAC-SHA256 sobre o corpo cru está correta: comparação com `timingSafeEqual` **e checagem de comprimento antes** (`route.ts:54-56`) — `timingSafeEqual` lança quando os buffers diferem em tamanho, e o código já trata isso;
- o evento é gravado em `payment_webhook_events` **antes** da decisão de assinatura (`route.ts:66-71`), com `signatureValid` — há trilha de auditoria até do que foi rejeitado.

### O que a documentação da Paysure desmente

Fonte: `docs/research/2026-11-16-paysure-contrato.md` (documentação oficial lida em 2026-11-16).

| Premissa no código | O que a documentação diz |
|---|---|
| Uma credencial por gateway (`apiKey`, string) | **Dois** cabeçalhos: `ci` (Client ID) + `cs` (Client Secret). Uma string não cabe os dois — a tela salvaria metade da credencial e toda chamada voltaria **401** |
| Assinatura HMAC-SHA256 em `x-webhook-signature`, igual para todo provedor | **A Paysure não assina nada.** Sem HMAC, sem cabeçalho de assinatura, sem segredo compartilhado. A orientação dela é validar o IP de origem da Cloudflare. O `x-webhook-signature` rejeitaria **100%** dos avisos com 401 |
| `webhookSecret` digitado pelo operador verifica o evento | **Não tem destinatário.** Não existe lugar na Paysure para informar esse segredo (`configure-gateway-dialog.tsx:79-89` pede o campo; `payment-gateways.ts:24` o grava; nada do outro lado o conhece) |
| Falta "um identificador estável de evento" | **Existem dois, e já existem:** `external_id` na saída (a Paysure devolve **409** em repetido — a criação de cobrança já é idempotente do lado dela) e `reference_code` na entrada |

### O que **de fato** produz o 404 do webhook (@po, 2026-11-16)

Não é o `pgEnum`. É `PAYMENT_GATEWAY_PROVIDERS` em `src/lib/validations/payment-gateway.ts:3-22` — uma **segunda cópia** dos 18 provedores, com **três** consumidores:

| Consumidor | Consequência de não atualizar |
|---|---|
| `src/app/api/webhooks/payment/[tenant]/[provider]/route.ts:21` | o webhook da paysure responde **404** antes de chegar na assinatura |
| `src/lib/validations/payment-gateway.ts:25` (`z.enum`) | salvar a credencial da paysure é **rejeitado na validação** |
| `src/app/dashboard/integrations/payments/page.tsx:54` | a paysure **não aparece** na tela — o operador não consegue nem configurá-la |

O `pgEnum` (`src/db/schema/payments.ts:84-103`, 18 provedores, inclui `pay2m`, **não** inclui `paysure`) também precisa da entrada — mas sozinho não resolve nenhum dos três.

### Dois defeitos adicionais, medidos nesta passada

1. **A URL que a tela manda copiar está errada.** `configure-gateway-dialog.tsx:92` exibe `/api/webhooks/payment/{provider}` — **sem o tenant**. A rota real é `[tenant]/[provider]`. O operador que copiar o que a tela mostra configura um endereço que responde 404. (A `page.tsx:38` exibe a forma certa, com o slug — as duas telas discordam entre si.)
2. **`savePaymentGateway` força `isActive: true`** (`payment-gateways.ts:25` e `:32`), contra o que o comentário do próprio schema documenta: *"every gateway must set one [webhookSecret] before `isActive` can be turned on"* (`payments.ts:77-82`) — e contra o `default(false)` da coluna. O gateway nasce ligado sem ninguém ter ligado, e o `Switch` que existe em `gateway-row.tsx:32-38` para isso passa a ser decorativo na criação.

### O que já existe e deve ser reusado, não reinventado

| Peça | Onde | Serve para |
|---|---|---|
| `payment_webhook_events` com `orderId` nulável | `src/db/schema/payments.ts:133-145` | casar o evento ao pedido e manter o não-casado visível |
| `banking_transactions` com `orderId` e `externalReference` | `src/db/schema/payments.ts:44-57` | o lançamento de crédito do pagamento |
| `simulatePayment` | `src/lib/actions/checkout.ts:10-39` | **a sequência completa de fechamento já está ali**: pedido para pago, números para vendido, crédito em `banking_transactions`, contador anti-spam zerado. Falta ser transacional (LTM-02) e ser chamada por um pagamento de verdade |
| `encryptSecret` / `decryptSecret` | `src/lib/crypto.ts` | AES-256-GCM por blob — serve para objeto serializado sem nenhuma mudança |
| Revogação condicional com `returning()` | `src/lib/auth/session.ts` (`rotateSession`, commit `65217b0a`) | **precedente da casa** para "só segue quem venceu a corrida" — é o mesmo padrão que a reivindicação de evento concorrente precisa |

**Por que idempotência não é opcional:** a Paysure reentrega em três tentativas (imediata, ~5 min, ~30 min) e depois marca `client_error` para reenvio manual pelo painel. Em 10.550 pedidos pagos por semana, "raro" não é defesa: a segunda entrega marcaria números como vendidos outra vez e inseriria um segundo crédito em `banking_transactions`, inflando o faturamento do operador.

## Decisão de arquitetura (proposta)

### 1. O fechamento vira uma função única e transacional

`src/lib/payments/settle-order.ts` (novo): pedido para `paid` com `paidAt`, todos os `product_numbers` do pedido para `sold`, **um** crédito em `banking_transactions`, contador anti-spam zerado. Tudo numa transação (a transação é da `LTM-02`, bloqueante). Reusada pelo webhook e pelo `simulatePayment` — duas implementações do fechamento é como se cria divergência entre o caminho de teste e o caminho real.

**Fora deste reuso:** `simulateBonusGamePaymentAndReveal` (`src/lib/actions/bonus-play.ts:83`) fecha **outra** entidade (`bonus_game_plays`, sem `product_numbers`, sem `orders`). Parece a mesma sequência e não é. **Não unificar** — ver Escopo OUT.

### 2. A autenticidade do webhook muda de lugar: de assinatura para token na URL

A `postbackUrl` da Paysure vai **em cada cobrança**, não é configurada uma vez no painel dela. Como não há assinatura, a autenticidade tem de morar **na própria URL**: um token opaco e imprevisível, emitido por nós, por `(tenant, provider)`.

**Proposta:** a rota ganha um segmento — `/api/webhooks/payment/[tenant]/[provider]/[token]/route.ts`. O token passa a ser **obrigatório por construção**: sem ele não existe rota, e não existir rota é falhar fechado sem escrever uma linha de validação. A rota atual sem token responde **410 Gone** com registro de auditoria, para provedor mal configurado ficar visível em vez de silencioso.

A faixa de IP da Cloudflare é defesa adicional, **não substituta** — a faixa é pública e compartilhada por milhões de domínios. Não entra nesta story (ver OUT).

O `webhook_secret` existente **não é apagado**: continua sendo o segredo do adaptador HMAC genérico, para o provedor que de fato assine. Deixa de ser pedido a quem não assina.

> **Decisão para @architect:** segmento de caminho (proposta) contra parâmetro de consulta. O caminho foi escolhido porque falha fechado por roteamento; a alternativa é legítima e precisa ser rejeitada ou aceita por escrito, não por omissão (AC-G3).

### 3. A credencial passa a ser um objeto cifrado, e o formulário é do provedor

`credentials_encrypted` continua `text` e continua cifrada com `encryptSecret` — o que muda é **o que** se cifra: `JSON.stringify({ ci, cs })` em vez de uma string solta. Nenhuma mudança de coluna, nenhuma mudança em `src/lib/crypto.ts`.

Cada provedor declara seus campos (nome, rótulo, tipo, obrigatoriedade) numa descrição única em `src/lib/validations/payment-gateway.ts`, e **três** consumidores passam a ler dessa descrição em vez de assumir `apiKey`: o `z.enum`/schema de validação, o formulário e o adaptador.

**Leitura compatível com o legado:** blob que não decifre para JSON de objeto é lido como `{ apiKey: <valor> }`. Nenhuma linha existente se perde e nenhuma migração de dado é necessária.

### 4. A chave de idempotência é o `reference_code` — mas sozinho ele **não** basta

A Paysure orienta usar `reference_code` como chave de deduplicação. Isso resolve a reentrega e **quebra o ciclo de vida**: o aviso de `paid` e o de `refunded` (chargeback, disputa MED) da **mesma** transação chegam com o **mesmo** `reference_code`. Unicidade só por `reference_code` recusaria o estorno como duplicata — e estorno recusado em silêncio é faturamento falso no painel do operador.

**A chave é composta pelo adaptador** e inclui o fluxo e o status: `{cashin|cashout|refund}:{reference_code}:{status}`. Estável entre reentregas (o corpo é o mesmo), distinta entre transições. `uniqueIndex` em `(tenant_id, provider, external_event_id)`.

O mecanismo de reivindicação concorrente (insert com unicidade dentro da transação, ou reivindicação por `UPDATE` condicional com `returning()` no padrão do `rotateSession`) é **escolha de @dev/@architect**: o que esta story exige é o resultado — AC-D1, AC-D2 e AC-D3 — e que a entrega duplicada continue **visível**, não descartada.

### 5. O casamento é por referência externa explícita, nunca por heurística de valor

`external_reference` do aviso é o nosso `orders.id` (é o `external_id` que mandamos na criação da cobrança). O valor é **conferido**, não usado para casar: aviso cujo `value_cents` difere do `orders.amount` **não fecha o pedido** (AC-E3). Pagamento parcial existe e fechar pedido com valor menor é entregar título por menos.

### 6. Adaptador por provedor, com duas responsabilidades

```ts
interface GatewayAdapter {
  readonly credentialFields: readonly CredentialField[];
  verify(req: { rawBody: string; headers: Headers; token: string }, gateway: PaymentGateway): VerifyResult;
  parse(payload: unknown): ParsedEvent; // { externalEventId, orderRef, amountCents, status, paidAt, paymentId, endToEndId }
}
```

A verificação entra no adaptador **porque o esquema é do provedor, não da plataforma** — a Paysure prova isso: o esquema dela é "nenhum". O HMAC genérico de hoje **não é apagado**: vira a implementação de um adaptador de referência, usado nos testes desta story e disponível a quem assine.

**Esta story entrega o arcabouço e o adaptador HMAC de referência. O adaptador da `paysure` é a `LTM-03b`.** Provedor sem adaptador é recusado **em voz alta** (AC-F2), nunca aceito em silêncio.

### 7. `paysure` precisa existir nas **duas** listas, e nos três consumidores

Ver Contexto. Sem isso nenhum AC desta story é verificável contra o provedor real, e a `LTM-03b` não tem onde se registrar.

### 8. Fail-loud no não-casado — com 200 no HTTP

Precedente da casa (VEX-14): evento que não casa com pedido nenhum fica gravado com `orderId` nulo, estado de casamento explícito e motivo nomeado, e aparece numa lista para o operador.

**Mudança deliberada em relação à `LTM-03`:** o código HTTP de resposta é **200 também para o não processado**. A `LTM-03` pedia resposta de erro. A documentação da Paysure orienta *"responder sempre 200, mesmo para evento não reconhecido"*, e a razão é concreta: três reentregas não fazem um adaptador aparecer, e depois delas o evento é marcado `client_error` **no painel do provedor** — isto é, o problema sai da nossa vista. O fail-loud mora no **registro e na lista do operador**, não no código HTTP. As duas exceções em que o HTTP continua recusando estão no AC-B2 (token inválido) e no AC-G1 (rota sem token).

### 9. Fronteira de dinheiro em um lugar só

`value_cents` é **inteiro em centavos**; `orders.amount` é `numeric(12,2)` em reais (`raffles.ts:106`) e `banking_transactions.amount` é `numeric(14,2)` (`payments.ts:51`). A conversão vive em `src/lib/payments/money.ts`, nos dois sentidos, com teste de ida e volta — e **recusa** valor com mais de duas casas em vez de arredondar em silêncio.

### 10. `paymentId` e `endToEndId` nascem aqui

O aviso traz `reference_code` e `end_to_end`; o ETL já lê `paymentId` e `paymentEndToEndId` da Sorteamos (`services/Meta/imperio-premios/client_api.py:508-509`); o lotemania só tem `externalReference` em `banking_transactions`. **Esta story cria as duas colunas em `banking_transactions`** e as preenche no fechamento.

> **Aresta combinada com a `LTM-04` (onda 3):** a `LTM-04` diz "quem chegar primeiro cria o campo". **Fica decidido aqui: a LTM-03a cria.** A `LTM-04` lê e expõe no contrato do ETL, e **não toca** `src/db/schema/payments.ts`. Sem essa divisão as duas colidem no mesmo arquivo na mesma onda.

### 11. Dado pessoal: o CPF não entra onde não precisa (portão G7)

O aviso de cash-in traz `payer_name` e `payer_document` (**CPF**), e hoje o corpo inteiro é gravado em `payment_webhook_events.payload` (`route.ts:70`). É dado pessoal entrando no banco por um caminho que ninguém declarou.

**Decisão desta story, que não depende de ninguém:** o casamento é por `external_reference` — **nada no fechamento precisa do CPF**. Então o payload é gravado com `payer_document` **mascarado na escrita** (nunca o valor inteiro) e nenhuma fixture de teste carrega dado real. É a aplicação do Artigo IV e da política de 2026-11-12 ao caminho novo.

**O que continua sendo decisão do dono do negócio** (não bloqueia esta story, porque o default acima é seguro): se o operador precisa ver o CPF do pagador para disputa MED/chargeback. Se precisar, muda-se de "mascarar na escrita" para "guardar cifrado com acesso registrado" — e isso é uma linha de requisito nova, não um refazimento.

## Tarefas (Checklist)

**Bloco A — representar a `paysure`**

- [ ] `src/lib/validations/payment-gateway.ts`: `paysure` em `PAYMENT_GATEWAY_PROVIDERS`; descrição de campos de credencial por provedor; schema de validação derivado dessa descrição (deixa de assumir `apiKey` + `webhookSecret` para todos).
- [ ] `src/db/schema/payments.ts`: `paysure` no `paymentGatewayProviderEnum`.
- [ ] `src/app/dashboard/integrations/payments/page.tsx`: a listagem continua derivando da lista (nenhuma mudança esperada além da conferência) e a URL exibida passa a incluir o token.
- [ ] `src/app/dashboard/integrations/payments/configure-gateway-dialog.tsx`: renderizar os campos **do provedor escolhido**; corrigir a URL exibida (`:92`) para a forma completa com tenant, provider e token; deixar de pedir "Segredo do Webhook" a provedor cujo adaptador não assine.
- [ ] `src/lib/actions/payment-gateways.ts`: gravar objeto de credencial cifrado; **parar de forçar `isActive: true`** na criação e preservar o valor existente no `onConflictDoUpdate`.

**Bloco B — autenticidade e idempotência**

- [ ] `src/lib/payments/webhook-token.ts` (novo): geração e comparação em tempo constante do token por `(tenant, provider)`.
- [ ] `src/db/schema/payments.ts`: coluna do token no `payment_gateways`; `externalEventId` + estado de casamento + motivo + contador de entregas em `payment_webhook_events`; `uniqueIndex` `(tenant_id, provider, external_event_id)`; `paymentId` e `endToEndId` em `banking_transactions`.
- [ ] `src/app/api/webhooks/payment/[tenant]/[provider]/[token]/route.ts` (novo): resolver adaptador → verificar pelo adaptador → gravar evento → casar → fechar → responder.
- [ ] `src/app/api/webhooks/payment/[tenant]/[provider]/route.ts`: passa a responder **410** com registro de auditoria.

**Bloco C — o fechamento**

- [ ] `src/lib/payments/money.ts` (novo): conversão centavos ↔ reais nos dois sentidos, com recusa de valor com mais de duas casas.
- [ ] `src/lib/payments/settle-order.ts` (novo): fechamento transacional — pedido pago, números vendidos, crédito bancário com `paymentId`/`endToEndId`, contador anti-spam zerado.
- [ ] `src/lib/payments/providers/types.ts` + `index.ts` + `hmac-generic.ts` (novos): arcabouço de adaptador e o HMAC de hoje migrado para dentro de um.
- [ ] `src/lib/actions/checkout.ts`: `simulatePayment` passa a chamar `settle-order`, deixando de ter sua própria cópia da sequência.

**Bloco D — visibilidade**

- [ ] `src/app/dashboard/integrations/payments/events/page.tsx` (novo): lista de eventos não casados / não processados para o operador — data, provedor, valor, estado, motivo.

**Bloco E — migração e testes**

- [ ] Gerar a migração (`pnpm db:generate`) e revisar o SQL emitido à mão antes de aplicar. ⚠️ Serializar com a `LTM-04` (ver Dependências).
- [ ] Testes: todos os ACs abaixo. Fixtures de aviso **sintéticas e mascaradas** — nenhuma vem de pagamento real.

## Critérios de Aceite

Agrupados por bloco. A rastreabilidade com a numeração da `LTM-03` original está na tabela ao fim desta seção.

### A — a `paysure` é representável e configurável

- [ ] **AC-A1 (as duas listas e os três consumidores):** `paysure` existe no `paymentGatewayProviderEnum` **e** em `PAYMENT_GATEWAY_PROVIDERS`; um teste por consumidor prova os três efeitos: (i) a rota tokenizada da paysure **não** responde 404; (ii) `savePaymentGateway` com provider `paysure` passa a validação e grava; (iii) a listagem de `/dashboard/integrations/payments` inclui `paysure`. Teste de regressão do bug atual.
- [ ] **AC-A2 (credencial multi-campo):** salvar a credencial da paysure com `ci` e `cs` grava **um** blob cifrado que, decifrado, devolve os dois valores; nenhum dos dois aparece em claro em consulta direta à tabela. Blob legado em formato de string solta é lido como `{ apiKey: <valor> }` sem erro e sem perda.
- [ ] **AC-A3 (o formulário é do provedor):** o diálogo de configuração renderiza exatamente os campos declarados pelo provedor selecionado — `ci` e `cs` para `paysure` — e **não** renderiza "Segredo do Webhook" para provedor cujo adaptador declara não usar assinatura. Para um provedor que use HMAC, o campo continua aparecendo. Teste de render para os dois casos.
- [ ] **AC-A4 (`isActive` deixa de ser forçado):** criar um gateway pela ação deixa `is_active` **falso**; ligar é ato explícito do operador pelo `Switch`; atualizar um gateway já ligado **não** o desliga nem o religa por efeito colateral. Teste com as três transições.

### B — autenticidade

- [ ] **AC-B1 (a URL que o operador copia é a que funciona):** a URL exibida no diálogo **e** na página de gateways é a mesma, inclui tenant, provider e token, e um POST nela é aceito. Teste que extrai a URL do render e a usa na requisição — não comparação de string escrita à mão. Regressão do defeito de `configure-gateway-dialog.tsx:92`.
- [ ] **AC-B2 (token errado não entra):** token ausente, vazio ou incorreto → a requisição é recusada, o evento é registrado com estado de autenticação falho, e as contagens de `orders`, `product_numbers` e `banking_transactions` são **idênticas** antes e depois. A comparação do token é em tempo constante (verificável por leitura: nenhum `===` sobre o segredo).
- [ ] **AC-B3 (a proteção que já existia continua existindo):** com o adaptador HMAC de referência, assinatura inválida é recusada, o evento é gravado com `signatureValid` falso e **zero** alteração nas três tabelas. Teste adicional: assinatura de comprimento diferente do esperado **não derruba a rota** — o caso em que `timingSafeEqual` lança e a checagem de comprimento de `route.ts:56` já previne.

### C — o fechamento

- [ ] **AC-C1 (o caminho feliz existe):** aviso verificado que casa com um pedido pendente → o pedido fica `paid` com `paidAt`, **todos** os seus `product_numbers` ficam `sold`, existe **uma** linha de crédito em `banking_transactions` com o `orderId`, o valor do pedido, o `paymentId` e o `endToEndId`, e o contador de reservas não pagas do usuário vai a zero.
- [ ] **AC-C2 (é transação, não sequência):** um teste que força falha **depois** de marcar o pedido como pago verifica que o pedido **não** ficou pago e que nenhuma das outras três escritas sobreviveu.
- [ ] **AC-C3 (uma só implementação do fechamento):** a sequência "pedido pago + números vendidos + crédito bancário" aparece em **um** arquivo apenas. Verificável por busca. `simulatePayment` chama a mesma função.
- [ ] **AC-C4 (`simulatePayment` também é idempotente):** chamada duas vezes no mesmo pedido fecha **uma** vez — 1 pedido pago, 1 crédito. Hoje a guarda é o `status !== "pending"` de `checkout.ts:12`; o teste prova que ela sobrevive à extração.
- [ ] **AC-C5 (número já vendido nunca é sobrescrito):** aviso cujo fechamento marcaria como vendido um número já vendido por **outro** pedido falha, **não** altera o `order_id` daquele número, e deixa o pedido em estado de revisão manual com motivo nomeado. O teste monta exatamente esse estado.
- [ ] **AC-C6 (pagamento atrasado tem uma única saída):** pagamento que chega depois de a reserva expirar e os números serem liberados segue **uma** política documentada, coberta por teste. O invariante verificado: não existe estado final em que o pagamento está registrado em `banking_transactions` e o comprador não tem nem o número nem um registro de estorno pendente. Política default registrada abaixo em *Decisões que precisam do dono do negócio*.

### D — idempotência

- [ ] **AC-D1 (sequencial):** a **mesma** entrega repetida **5×** produz exatamente **1** pedido pago, **1** linha em `banking_transactions` e **1** evento processado; as 4 repetições respondem 200 com o corpo marcando duplicata. Contagens medidas no teste.
- [ ] **AC-D2 (concorrente):** **2** entregas do mesmo evento disparadas **em paralelo** produzem o mesmo resultado do AC-D1 — uma vence, a outra reconhece a colisão. Este AC é o que distingue idempotência real de "consultei antes de escrever".
- [ ] **AC-D3 (a chave cobre o ciclo de vida, não só a reentrega):** dois avisos com o **mesmo** `reference_code` e status **diferentes** (`paid`, depois `refunded`) **não** são tratados como duplicata: os dois são registrados como eventos distintos. O mesmo aviso repetido continua sendo duplicata. Sem este AC, a chave de idempotência engole o estorno.
- [ ] **AC-D4 (duplicata não desaparece):** a 2ª a 5ª entrega do AC-D1 ficam **visíveis** — contador de entregas ou registro próprio —, não descartadas. Reentrega invisível é incidente sem rastro.

### E — dinheiro

- [ ] **AC-E1 (ida e volta):** `toCents`/`fromCents` fecham o ciclo para um conjunto que inclui `"61.00"`, `"0.05"`, `"1234567.89"` e `"0.00"`. Nos dois sentidos.
- [ ] **AC-E2 (recusa em vez de arredondar):** valor com mais de duas casas decimais **falha alto** na fronteira, não é arredondado em silêncio.
- [ ] **AC-E3 (valor divergente não fecha):** aviso cujo `value_cents` não corresponde ao `orders.amount` **não** fecha o pedido, registra o evento com motivo nomeado e deixa o pedido pendente de revisão. Pagamento parcial existe.

### F — visibilidade

- [ ] **AC-F1 (nada é descartado em silêncio):** aviso verificado que não casa com pedido nenhum → evento gravado com `orderId` nulo, estado `unmatched` e motivo, consultável na lista do operador, resposta 200. **Nenhum caminho de código responde sucesso sem ter registrado o que fez ou deixou de fazer** — verificável por leitura: não existe `return NextResponse.json({ ok: true })` sem escrita precedente no mesmo caminho.
- [ ] **AC-F2 (provedor sem adaptador falha alto no registro):** aviso de provedor que está na lista mas não tem adaptador implementado → evento gravado com estado `unsupported_provider` **nomeando o provedor**, pedido intocado, item presente na lista do operador, resposta 200 com o corpo dizendo que não foi processado. Nunca `{ ok: true }` pelado. (Este é o estado da `paysure` **até a LTM-03b** — e o AC prova que esse estado é visível, não silencioso.)
- [ ] **AC-F3 (status não acionável é registrado, não ignorado):** aviso com status que esta story não trata (`refunded`, `expired`) é registrado com estado próprio e motivo, não fecha nem reverte nada, e aparece na lista. Resposta 200.
- [ ] **AC-F4 (a lista existe e mostra o que importa):** a lista do operador exibe data, provedor, valor, estado e motivo, e contém os itens produzidos por AC-F1, AC-F2 e AC-F3.

### G — higiene

- [ ] **AC-G1 (a rota antiga não aceita pagamento):** `POST /api/webhooks/payment/{tenant}/{provider}` **sem** token responde 410, registra a tentativa e não altera nada. A forma sem tenant (`/api/webhooks/payment/{provider}`) responde 404 — é a URL que a tela exibia errado.
- [ ] **AC-G2 (dado pessoal não entra em claro):** o payload persistido por um aviso de cash-in **não contém** o CPF completo do pagador; a fixture usada no teste é sintética e mascarada; uma busca por padrão de CPF nos artefatos da story não encontra nada. Política de 2026-11-12 (`docs/ESTADO-ATUAL.md` §1-A).
- [ ] **AC-G3 (as decisões abertas ficam escritas):** o Dev Agent Record traz, respondidas: (i) token em segmento de caminho ou em parâmetro de consulta; (ii) mecanismo de reivindicação concorrente escolhido; (iii) política do AC-C6 e quem decidiu. Nenhuma delas pode ser herdada por omissão.
- [ ] **AC-G4 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck` e `pnpm build` passam ao fim da story — pré-requisito do portão G1 estabelecido pela `LTM-00`.

### Rastreabilidade com a `LTM-03` original

| LTM-03 | Aqui | Observação |
|---|---|---|
| AC1 | AC-C1 + AC-C2 | partido em caminho feliz e prova de transação |
| AC2 | AC-D1 | — |
| AC3 | AC-D2 | — |
| AC4 | AC-C5 | — |
| AC5 | AC-F1 | — |
| AC6 | AC-B3 | — |
| AC7 | AC-F2 | o código HTTP mudou de erro para 200 — razão no item 8 da arquitetura |
| AC8 | AC-C6 | — |
| AC9 | AC-C3 | — |
| AC10 | AC-A1 | passa a cobrir os três consumidores, não só o enum (correção 2 do @po) |
| AC11 | **`LTM-03b`** | é a story inteira de lá (correção 1 do @po) |
| — | AC-A2, AC-A3, AC-A4, AC-B1, AC-B2, AC-C4, AC-D3, AC-D4, AC-E1..3, AC-F3, AC-F4, AC-G1..4 | novos, vindos do contrato da Paysure e da medição de 2026-11-16 |

## Escopo

**IN:** `paysure` nas duas listas e nos três consumidores; modelo de credencial multi-campo cifrado com formulário por provedor; token opaco por `(tenant, provider)` como autenticidade do webhook; rota tokenizada e 410 na antiga; `settle-order.ts` transacional; fronteira de conversão de dinheiro; `externalEventId` com unicidade e chave composta por fluxo+status; `paymentId`/`endToEndId` em `banking_transactions`; arcabouço de adaptador com o HMAC genérico migrado para dentro de um; fail-loud no não-casado, no não-suportado e no status não acionável; lista de eventos para o operador; reuso em `simulatePayment`; mascaramento de CPF na escrita; correção do `isActive` forçado; migração; testes de todos os ACs.

**OUT:**

- **O adaptador da `paysure`** — é a `LTM-03b`. Aqui a `paysure` é representável e **recusada em voz alta** (AC-F2).
- **Credenciais reais em produção** — `ci`/`cs` do Império são o portão **G5**, não engenharia. Nada nesta story depende delas.
- **Validação de faixa de IP da Cloudflare** — defesa adicional, não substituta do token; exige conhecer o IP de saída do Vercel (ver *Decisões que precisam do dono do negócio*).
- **Os 16 adaptadores restantes** — cada um vira item quando o provedor for de fato contratado. Implementar adaptador sem contrato é inventar formato.
- **Unificar `simulateBonusGamePaymentAndReveal`** (`bonus-play.ts:83`) com `settle-order`. É outra entidade (`bonus_game_plays`, sem `product_numbers`), com outro ciclo. Parece a mesma sequência e não é — e o crédito dela em `banking_transactions` **não tem `orderId`** justamente por isso. Fica registrado para não ser "consertado" por semelhança. Se merece idempotência própria, é story própria.
- **Estorno automático** — o AC-C6 exige a saída definida e o registro, não a execução do estorno. `refunded` é registrado (AC-F3), não aplicado.
- **Conciliação financeira retroativa.**
- **Derivar o `z.enum` do `pgEnum`** para a lista deixar de existir em duplicata. É a raiz do problema, é decisão de @architect, e não é requisito desta story — que atualiza as duas cópias de forma coordenada e deixa a duplicidade registrada.
- **Splits de comissão de afiliado na origem** (percentual sobre o bruto, até 10 destinatários) — a documentação da Paysure os descreve e eles mudam o desenho de afiliados. Não entra agora.

> **Nota de escopo (founder, 2026-11-16):** o único gateway que importa agora é a **paysure**. z-api, wizebot, onesignal, paposms, liguelead, dxmidia e nexopro estão **fora da paridade**. Decisão tomada, não pendente.

## Dependências

- **Depende de `LTM-00` (satisfeita).** O app compila desde `90c8ca59`; `lint`, `typecheck` e `build` estão verdes. Sem isso nenhum AC daqui seria verificável.
- **Depende de `LTM-02` (bloqueante).** Sem transação, o fechamento vira quatro escritas soltas com dinheiro já capturado — a mesma classe de bug, com consequência pior.
- **Depende de `LTM-01`** — o fechamento consulta `product_numbers` por `order_id`.
- **Depende de `LTM-05`** — os ACs dos blocos C, D, E e B são todos automatizados.
- **Habilita a `LTM-03b`**, que registra o adaptador da paysure no arcabouço criado aqui.
- **Nenhuma dependência externa.** Não precisa de `ci`/`cs`, não precisa de aviso real, não precisa de login no painel da Sorteamos. Essa foi a razão da divisão.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

**Onda 3**, em paralelo com a `LTM-04`. Conjunto de arquivos **completo** desta story:

```
Files:
  apps/lotemania/src/db/schema/payments.ts
  apps/lotemania/src/lib/validations/payment-gateway.ts
  apps/lotemania/src/lib/actions/payment-gateways.ts
  apps/lotemania/src/lib/actions/checkout.ts
  apps/lotemania/src/app/dashboard/integrations/payments/page.tsx
  apps/lotemania/src/app/dashboard/integrations/payments/configure-gateway-dialog.tsx
  apps/lotemania/src/app/dashboard/integrations/payments/gateway-row.tsx
  apps/lotemania/src/app/dashboard/integrations/payments/events/page.tsx        (novo)
  apps/lotemania/src/app/api/webhooks/payment/[tenant]/[provider]/route.ts
  apps/lotemania/src/app/api/webhooks/payment/[tenant]/[provider]/[token]/route.ts  (novo)
  apps/lotemania/src/lib/payments/settle-order.ts                               (novo)
  apps/lotemania/src/lib/payments/money.ts                                      (novo)
  apps/lotemania/src/lib/payments/webhook-token.ts                              (novo)
  apps/lotemania/src/lib/payments/providers/types.ts                            (novo)
  apps/lotemania/src/lib/payments/providers/index.ts                            (novo)
  apps/lotemania/src/lib/payments/providers/hmac-generic.ts                     (novo)
  apps/lotemania/src/lib/crypto.ts            (declarado por precaução — a proposta não exige mudança)
  apps/lotemania/drizzle/**                   (migração gerada)
  apps/lotemania/tests/payments/**            (novo)

Resources:
  banco de teste          — COMPARTILHADO com LTM-04 e LTM-05. Exige base/esquema próprio
                            por tarefa, ou serialização. Não é isolado por nome de branch.
  pnpm db:generate        — escreve drizzle/meta/_journal.json. Serializar com LTM-04.
  nenhuma porta, nenhum serviço externo (não há chamada de saída nesta story)

Depends-on: LTM-00 (Done), LTM-01, LTM-02, LTM-05
```

- ✅ **Disjunto da `LTM-04`**, que toca `src/db/schema/attribution.ts` (novo), `src/lib/actions/reserve.ts`, `src/app/loja/[tenant]/` e `src/app/api/v1/` (novo). **Condição acrescentada:** a `LTM-04` **não** toca `src/db/schema/payments.ts` — `paymentId` e `endToEndId` são criados aqui (item 10 da arquitetura). A `LTM-04` precisa ser atualizada para refletir isso **antes** do despacho da onda.
- ⚠️ **`drizzle/` não existe ainda.** A primeira story a gerar migração cria a pasta e o journal. Se a `LTM-01` (onda 1) correr primeiro, como planejado, o journal já existe aqui.
- ⚠️ **Banco de teste é recurso mutável compartilhado** com `LTM-04` e `LTM-05`. A nota de ondas do epic não declarava isso e devia. Nome de branch não isola banco.

## Riscos

- **[Alto] Formato de aviso ou de autenticação assumido errado.** **Já aconteceu duas vezes nesta base:** o `x-webhook-signature` genérico (projetado, nunca observado) e o `webhookSecret` da tela (pedido ao operador, sem destinatário do outro lado). Mitigação desta story: a autenticidade deixa de ser suposição sobre o provedor e passa a ser **nossa** (token que nós emitimos); o adaptador é por provedor; AC-F2 recusa em voz alta em vez de processar errado. O adaptador que ainda depende de contrato externo foi **removido desta story** — é a `LTM-03b`.
- **[Alto] Chave de idempotência engolindo o estorno.** O risco nasce da própria orientação do provedor ("dedupe por `reference_code`"). Mitigação: AC-D3 — a chave inclui fluxo e status, e o teste exige que `paid` e `refunded` do mesmo `reference_code` coexistam.
- **[Médio] Reentrega fora de ordem** (cancelamento chegando antes do pagamento). Mitigação: o estado do pedido é a autoridade; transição inválida é recusada e registrada (AC-F3), não aplicada.
- **[Médio] Mudar a rota do webhook quebra configuração existente.** Hoje não há gateway em produção apontando para cá (zero pedidos pagos), então o custo é zero **agora** — depois do primeiro sorteio de teste, não é. Mitigação: AC-G1 faz a rota antiga responder 410 com registro, em vez de 404 silencioso.
- **[Médio] Credencial legada em formato de string** virando erro de decifragem. Mitigação: AC-A2 exige leitura compatível.
- **[Baixo] 200 em evento não processado atrasar a descoberta.** Mitigação: AC-F4 — a lista do operador substitui o retry. Era o compromisso que a documentação da Paysure pede e a razão está escrita no item 8.

## Decisões que precisam do dono do negócio

Nenhuma delas bloqueia a implementação — cada uma tem um default seguro já embutido nos ACs. Todas precisam ser confirmadas ou corrigidas antes do **primeiro sorteio de teste**.

| # | Decisão | Default embutido | Quem decide |
|---|---|---|---|
| 1 | Política do pagamento que chega depois da reserva expirar (AC-C6) | se o número ainda estiver disponível, reservar e fechar; se não, pedido para revisão manual com **registro de estorno pendente** — nunca pagamento sem número e sem estorno | founder |
| 2 | O operador precisa ver o CPF do pagador para disputa MED/chargeback? | **não** — CPF mascarado na escrita (AC-G2) | founder |
| 3 | Usar a whitelist de IP por chave da Paysure? | não nesta story; exige conhecer o IP de saída do Vercel | founder + @devops |

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Decisão — token em caminho ou em consulta
_(registrar, AC-G3)_

### Decisão — mecanismo de reivindicação concorrente
_(registrar, AC-G3)_

### Política escolhida para o AC-C6
_(registrar a decisão e quem decidiu, AC-G3)_

### Decisão — FK e duplicidade da lista de provedores
_(se @architect decidir derivar o `z.enum` do `pgEnum`, registrar aqui que ficou fora e por quê)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-16 | 1.0 | Nasce da divisão da `LTM-03` após NO-GO do @po (6,5/10). Absorve o contrato real da Paysure (`docs/research/2026-11-16-paysure-contrato.md`): credencial de dois campos, ausência de assinatura, token por tenant, chave composta de idempotência, fronteira de centavos, `end_to_end`, CPF no aviso. Absorve a correção 2 do @po (o 404 vem de `lib/validations/payment-gateway.ts`). ACs reagrupados em blocos A-G com tabela de rastreabilidade — resolve a correção 4. Conjunto de arquivos declarado completo. | @pm (Morgan) |
