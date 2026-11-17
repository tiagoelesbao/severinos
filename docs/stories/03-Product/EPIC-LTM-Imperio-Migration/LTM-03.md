# LTM-03: O webhook fecha o pedido — com idempotência

> # ⛔ SUPERSEDED — não implemente esta story
>
> **Dividida em `LTM-03a` e `LTM-03b` em 2026-11-16**, acatando a recomendação (b) do NO-GO do @po.
>
> | Story | O que ficou lá |
> |---|---|
> | **[`LTM-03a`](LTM-03a.md)** | `paysure` nas duas listas, credencial multi-campo, token de webhook, `settle-order` transacional, idempotência, fronteira de dinheiro, fail-loud, lista do operador, reuso em `simulatePayment`. **Testável sem nenhuma credencial.** |
> | **[`LTM-03b`](LTM-03b.md)** | o adaptador da Paysure (entrada e saída). **Escrevível agora** — só o primeiro pagamento real espera `ci`/`cs`, que é o portão G5. |
>
> **O AC11 circular deixou de existir:** o contrato da Paysure foi lido da documentação oficial e está em `docs/research/2026-11-16-paysure-contrato.md` — payload dos três fluxos, autenticação, status, reentrega, idempotência, limites. O aviso real em produção passou de **pré-requisito** a **conferência pós-implementação**.
>
> Este arquivo é mantido **apenas** como trilha: o diagnóstico original e a validação completa do @po vivem aqui. Nada abaixo deve ser executado.

**Status:** Superseded (era `Draft`) — ver `LTM-03a` e `LTM-03b`
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o problema **F3**
**Prioridade:** **P0** — enquanto este `TODO` existir, **ninguém consegue comprar nada** no lotemania
**Complexidade:** L (Standard) — fechamento transacional do pedido + chave de idempotência + fail-loud no não-casado
**Criada por:** @pm (Morgan) · 2026-11-16

## Story

**Como** comprador que acabou de pagar um PIX de R$ 61
**Eu quero** que meu título fique meu no instante em que o provedor confirma o pagamento
**Para que** eu não perca o número por expiração de reserva depois de já ter pagado — e para que a reentrega do mesmo aviso pelo provedor não venda meu número a mais ninguém.

## Contexto (evidência lida no código, 2026-11-16)

`apps/lotemania/src/app/api/webhooks/payment/[tenant]/[provider]/route.ts`:

**O que está bem feito e precisa ser preservado:**

- receptor genérico único por `(tenant, provider)`, substituindo os 18 endpoints dedicados da plataforma anterior;
- a **implementação** do HMAC-SHA256 sobre o corpo cru está correta: comparação com `timingSafeEqual` **e checagem de comprimento antes** — `timingSafeEqual` lança quando os buffers têm tamanhos diferentes, e o código já trata isso. Isso não é acidente;
- o evento é gravado em `payment_webhook_events` **antes** da decisão de assinatura, com o campo `signatureValid` — ou seja, há trilha de auditoria até do que foi rejeitado. O comentário no schema registra que a plataforma anterior não dava essa visibilidade.

**Onde a premissa está errada (achado da observação ao vivo, 2026-11-16):**

O esquema de assinatura é **único e fixo para todos os provedores**: HMAC-SHA256 hex no cabeçalho `x-webhook-signature`. Isso não foi observado de nenhum provedor — foi **projetado**. Cada gateway PIX tem o seu: cabeçalho diferente, algoritmo diferente, corpo canônico diferente, alguns nem assinam e autenticam por token no path ou por IP de origem.

Consequência concreta: quando a credencial real da **paysure** for ligada, **todo aviso de pagamento vai ser rejeitado com 401** — porque a paysure não manda `x-webhook-signature`. O código não está errado; a generalização está. A verificação de assinatura é **por provedor**, exatamente como o mapeamento de payload.

**Onde para:**

```
// TODO: match payload to an order (by externalReference / orderId) and
// mark it paid via bankingTransactions + orders.status once a real
// provider's payload shape is wired up.
return NextResponse.json({ ok: true });
```

Resultado: assinatura válida, evento gravado, **pedido intocado**. O dinheiro entra e o título não sai. Os zero pedidos pagos do app têm exatamente esta causa.

**O que já existe e deve ser reusado, não reinventado:**

| Peça | Onde | Serve para |
|---|---|---|
| `payment_webhook_events` com `orderId` nullable | `src/db/schema/payments.ts` | casar o evento ao pedido e manter o não-casado visível |
| `banking_transactions` com `orderId` e `externalReference` | `src/db/schema/payments.ts` | o lançamento de crédito do pagamento |
| `simulatePayment` | `src/lib/actions/checkout.ts` | **a sequência completa de fechamento já está escrita ali**: pedido para pago, números para vendido, crédito em `banking_transactions`, contador anti-spam zerado. Falta ser transacional (LTM-02) e ser chamada por um pagamento de verdade. |

**Por que idempotência não é opcional:** provedor de pagamento reentrega evento — por timeout, por retry, por reconciliação. Hoje, se o fechamento fosse escrito de forma ingênua, a segunda entrega marcaria números como vendidos outra vez e inseriria um segundo crédito em `banking_transactions`, inflando o faturamento do operador. Em 10.550 pedidos pagos por semana, "raro" não é uma defesa.

## Decisão de arquitetura (proposta)

1. **Extrair o fechamento de pedido para uma função única** (ex.: `src/lib/payments/settle-order.ts`), transacional, reusada pelo webhook e pelo `simulatePayment`. Duas implementações do fechamento é como se cria divergência entre o caminho de teste e o caminho real.
2. **Chave de idempotência persistida, com restrição de unicidade** — não checagem em memória, não "consulta antes de escrever". `uniqueIndex` em `payment_webhook_events` por `(tenant_id, provider, external_event_id)`: a segunda entrega colide no banco e o código trata a colisão como "já processado". Isso é o que sobrevive a duas entregas **concorrentes**, que é o caso real que o retry do provedor produz.
3. **Casamento do pedido por referência externa explícita**, não por heurística de valor. O pedido precisa levar a referência que o provedor devolve. Qual campo do payload carrega isso varia por provedor — por isso: um **adaptador por provedor**, com **duas** responsabilidades e não uma:

   ```ts
   interface GatewayAdapter {
     verifySignature(rawBody: string, headers: Headers, gateway: PaymentGateway): boolean;
     parse(payload: unknown): { externalEventId, orderRef, amount, paidAt, status };
   }
   ```

   A verificação de assinatura entra no adaptador **porque o esquema é do provedor, não da plataforma** (ver achado acima). O HMAC genérico de hoje vira a implementação do adaptador que o usar — não some, deixa de ser imposto a todos.

   **O provedor implementado de verdade é a `paysure`** — é o único que o Império usa em produção (confirmado pelo founder em 2026-11-16, e visto no bundle do painel da Sorteamos com configuração `clientId` + `clientSecret`). Os demais ficam declarados como não suportados **em voz alta**, nunca silenciosamente aceitos.

4. **`paysure` precisa existir no enum antes de qualquer outra coisa.** `paymentGatewayProviderEnum` em `src/db/schema/payments.ts` tem 18 provedores e **não inclui `paysure`** — inclui `pay2m`, que o cliente não usa. Hoje o lotemania não consegue nem *representar* o gateway que recebe o dinheiro do Império: a rota do webhook recusa com 404 antes de chegar na assinatura. É uma linha no enum mais uma migração, e sem ela nenhum AC desta story é testável contra o provedor real.
5. **Fail-loud no não-casado** — precedente da casa (VEX-14): evento que não casa com pedido nenhum fica gravado com `orderId` nulo e um estado de casamento explícito, e aparece numa lista para o operador. Nunca `{ ok: true }` e esquecer. O código de resposta HTTP continua 200 para o provedor parar de reentregar aquilo que já foi registrado, mas o registro fica marcado como pendente de resolução.
6. **Número já vendido por outro pedido nunca é sobrescrito.** O fechamento falha alto e marca o pedido para revisão manual. Sobrescrever `orderId` de um número vendido é apagar o dono anterior de um título — é dinheiro de outra pessoa.
7. **Pagamento chegando após a reserva expirar precisa de uma saída determinística.** A política (devolver número se ainda disponível, ou registrar para estorno) é decisão do dono do negócio; o que esta story garante é que **existe uma única saída definida, coberta por teste, e nenhum caminho em que o pagamento é registrado e o comprador fica sem número e sem estorno registrado**.

## Tarefas (Checklist)

- [ ] `src/db/schema/payments.ts`: **acrescentar `paysure`** ao `paymentGatewayProviderEnum` (+ migração). É o primeiro item: sem ele o provedor real nem chega na rota.
- [ ] `src/db/schema/payments.ts`: `externalEventId` + estado de casamento em `payment_webhook_events`; `uniqueIndex` `(tenant_id, provider, external_event_id)`.
- [ ] `src/lib/payments/settle-order.ts` (novo): fechamento transacional — pedido pago, números vendidos, crédito bancário, contador anti-spam zerado.
- [ ] `src/lib/payments/providers/` (novo): adaptador por provedor com `verifySignature` + `parse`; **`paysure` implementado**, os demais recusados explicitamente.
- [ ] Rota do webhook: resolver adaptador → verificar assinatura **pelo adaptador** → gravar evento → casar → fechar → responder. O HMAC genérico de hoje migra para dentro de um adaptador, não é apagado.
- [ ] `src/lib/actions/checkout.ts`: `simulatePayment` passa a chamar `settle-order`, deixando de ter sua própria cópia da sequência.
- [ ] Tela/consulta de eventos não casados para o operador (lista mínima: data, provedor, valor, motivo).
- [ ] Testes: todos os ACs abaixo.

## Critérios de Aceite

- [ ] **AC1 (o caminho feliz existe):** assinatura válida + payload que casa com um pedido pendente → o pedido fica `paid` com `paidAt` preenchido, **todos** os seus `product_numbers` ficam `sold`, existe **uma** linha de crédito em `banking_transactions` com o `orderId` e o valor do pedido, e o contador de reservas não pagas do usuário vai a zero. Tudo numa transação: um teste que força falha após marcar o pedido como pago verifica que o pedido **não** ficou pago.
- [ ] **AC2 (idempotência sequencial):** a **mesma** entrega repetida **5×** produz exatamente **1** pedido pago, **1** linha em `banking_transactions` e **1** evento processado; as 4 repetições respondem 200 com o corpo marcando duplicata. Contagens medidas no teste.
- [ ] **AC3 (idempotência concorrente):** **2** entregas do mesmo evento disparadas **em paralelo** produzem o mesmo resultado do AC2 — uma vence, a outra reconhece a colisão de unicidade. Este AC é o que distingue idempotência real de "consultei antes de escrever".
- [ ] **AC4 (número não se vende duas vezes):** evento cujo fechamento marcaria como vendido um número já vendido por **outro** pedido falha, **não** altera o `order_id` daquele número, e deixa o pedido em estado de revisão manual com motivo nomeado. Teste monta exatamente esse estado.
- [ ] **AC5 (nada é descartado em silêncio):** payload com assinatura válida que não casa com pedido nenhum → evento gravado com `orderId` nulo e estado de casamento `unmatched` com motivo, consultável na lista do operador, e resposta 200. Nenhum caminho de código responde sucesso sem ter registrado o que fez ou deixou de fazer.
- [ ] **AC6 (a proteção que já existia continua existindo):** teste de regressão — assinatura inválida → **401**, evento gravado com `signatureValid` falso, e **zero** alteração em `orders`, `product_numbers` e `banking_transactions` (contagens antes/depois). Teste adicional: assinatura de comprimento diferente do esperado não derruba a rota (o caso que `timingSafeEqual` lança e a checagem de comprimento já previne).
- [ ] **AC7 (provedor não suportado falha alto):** payload de provedor sem adaptador implementado → resposta de erro nomeando o provedor, evento gravado, pedido intocado. Nunca `{ ok: true }` para pagamento que não soube processar.
- [ ] **AC10 (`paysure` é representável e roteável):** existe `paysure` no `paymentGatewayProviderEnum`; `POST /api/webhooks/payment/imperio/paysure` com credencial configurada **não responde 404** e resolve para o adaptador da paysure. Teste de regressão do bug atual, onde o provedor real do cliente é recusado antes de chegar na assinatura.
- [ ] **AC11 (a assinatura é do provedor, não da plataforma):** o adaptador da `paysure` verifica assinatura pelo esquema **que a paysure de fato usa**, capturado de um aviso real antes de implementar — não pelo `x-webhook-signature` genérico. Teste com o aviso real capturado (sem dado pessoal) passa; o mesmo aviso com um byte alterado é rejeitado. Nenhum adaptador herda o esquema de outro por omissão.
- [ ] **AC8 (pagamento atrasado tem uma única saída):** pagamento que chega depois de a reserva expirar e os números serem liberados segue **uma** política documentada, coberta por teste. O invariante verificado é: não existe estado final em que o pagamento está registrado em `banking_transactions` e o comprador não tem nem o número nem um registro de estorro pendente.
- [ ] **AC9 (uma só implementação do fechamento):** `simulatePayment` e o webhook chamam a mesma função. Verificável por busca: a sequência de marcar pedido pago + números vendidos + crédito bancário aparece em **um** arquivo apenas.

## Escopo

**IN:** `paysure` no enum; adaptador por provedor com `verifySignature` + `parse`, **`paysure` implementado**; fechamento transacional do pedido; chave de idempotência com unicidade no banco; fail-loud no não-casado e no não-suportado; lista de eventos não casados; reuso em `simulatePayment`; preservação do HMAC genérico como um adaptador entre outros.
**OUT:** credenciais reais de gateway em produção (é o portão G5 do epic, não engenharia); os 18 adaptadores restantes (cada um vira item quando o provedor for de fato contratado — implementar adaptador sem aviso real é inventar formato); conciliação financeira retroativa; estorno automático (AC8 exige a saída definida e o registro, não a execução do estorno).

> **Nota de escopo (founder, 2026-11-16):** o único gateway que importa agora é a **paysure**. As demais integrações da Sorteamos — z-api, wizebot, onesignal, paposms, liguelead, dxmidia, nexopro — estão **fora da paridade por enquanto**, por decisão do dono do negócio. Não viram story nem item desta.

## Dependências

- **Depende de LTM-02 (bloqueante).** Sem transação, o fechamento vira três escritas soltas com dinheiro já capturado — a mesma classe de bug, com consequência pior.
- **Depende de LTM-01** — o fechamento consulta `product_numbers` por `order_id`.
- **Depende de LTM-05** — os ACs 2, 3, 4 e 6 são todos automatizados.
- **Onda 3, pode ir em paralelo com LTM-04.** Toca `src/app/api/webhooks/...`, `src/db/schema/payments.ts`, `src/lib/payments/` (novo) e `src/lib/actions/checkout.ts`; a LTM-04 toca schema de atribuição, `reserve.ts` e rotas novas. Conjuntos disjuntos.
- ⚠️ **Recurso mutável compartilhado com a LTM-04:** ambas geram migração. Serializar `pnpm db:generate`.

## Riscos

- **[Alto] Formato de payload ou de assinatura assumido errado** para a paysure. **Já aconteceu uma vez nesta base** — o `x-webhook-signature` genérico é exatamente esse erro, cometido no projeto e descoberto só ao comparar com a plataforma real. Mitigação: o adaptador é por provedor e isolado; AC7 recusa em voz alta em vez de processar errado; AC11 exige que a implementação nasça de um **aviso real capturado**, não de documentação parafraseada. A trilha em `payment_webhook_events` grava o evento antes de decidir a assinatura — é por ela que o primeiro aviso real da paysure vai ser capturado, mesmo sendo rejeitado.
- **[Médio] Reentrega fora de ordem** (aviso de cancelamento chegando antes do de pagamento). Mitigação: o estado do pedido é a autoridade; transição inválida é recusada e registrada, não aplicada.
- **[Médio] Chave de idempotência ausente no payload de algum provedor.** Mitigação: o mapeador declara qual campo usa; provedor sem identificador estável de evento é tratado como não suportado (AC7) até existir uma chave derivável e estável.
- **[Baixo] Responder 200 em evento não casado atrasa a descoberta do problema.** Mitigação: AC5 exige a lista para o operador — a visibilidade substitui o retry.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Aviso real da `paysure` (capturado antes de implementar o adaptador)

Precisa de **três** coisas, não uma. Sem as três, a implementação é invenção:

| | |
|---|---|
| Corpo do aviso | _(colar aqui, **sem dado pessoal** — mascarar nome, CPF, telefone, e-mail)_ |
| Cabeçalhos | _(incluindo qual carrega a assinatura, se houver)_ |
| Esquema de verificação | _(algoritmo, o que é assinado, onde fica o segredo na config `clientId`/`clientSecret`)_ |

### Política escolhida para o AC8
_(registrar a decisão e quem decidiu)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-16)

**Veredicto: NO-GO — 6,5/10.** Status permanece `Draft`.

Para registro: o diagnóstico desta story é o melhor do epic. Tudo que ela afirma do código confere — o `TODO` está em `route.ts:76-78`; o HMAC checa comprimento **antes** do `timingSafeEqual` (`:54-56`); o evento é gravado antes da decisão de assinatura (`:65-71`); `payment_webhook_events` tem `orderId` nulável; `banking_transactions` tem `orderId` e `externalReference`; `simulatePayment` tem a sequência de fechamento completa; o enum tem 18 provedores, inclui `pay2m` e **não** inclui `paysure`; e `06-observacao-ao-vivo.md:89-90` sustenta a `paysure` com `clientId` + `clientSecret`.

O NO-GO não é por qualidade de redação. É porque, **como está escrita, esta story não pode ser concluída** — e o motivo é estrutural, não cosmético.

### Correção obrigatória 1 — AC11 é circular: a story não pode ficar Done

O AC11 exige que o adaptador da `paysure` nasça de **um aviso real capturado**. Para capturar um aviso real é preciso a credencial da paysure ligada recebendo pagamento. Mas o **Escopo OUT desta própria story** diz: "credenciais reais de gateway em produção (é o portão **G5** do epic, não engenharia)". E o epic coloca **G1 (LTM-01 a LTM-05 em Done) antes de G5**.

Logo: AC11 depende de G5 → G5 depende de G1 → G1 depende desta story. **Ciclo fechado.** Um @dev que chegue no AC11 tem duas saídas e as duas são ruins: inventar o esquema da paysure a partir de documentação parafraseada — que é **exatamente** o erro que o `x-webhook-signature` genérico já cometeu nesta base, como a própria seção de Riscos reconhece — ou parar a story.

Exigido: **quebrar o ciclo explicitamente**, de uma das duas formas.

- **(a) Nomear o caminho de captura que não passa por G5.** A `paysure` já está em produção **na Sorteamos** — o aviso real existe hoje, do outro lado. Então a captura é ação de observação do painel/credencial do cliente, não de engenharia. Se for essa a escolha, ela entra em **Dependências** com dono e data, não como campo em branco no Dev Agent Record. Atenção: `05-pendente-de-observacao.md` e `06-observacao-ao-vivo.md` registram que a observação parou porque **a sessão do painel expirou** — ou seja, esta captura está hoje bloqueada numa ação do founder, e isso precisa estar escrito como bloqueio datado.
- **(b) Dividir a story.** `LTM-03a` — `paysure` no enum, chave de idempotência com unicidade, `settle-order` transacional, arcabouço de adaptador, fail-loud no não-casado e no não-suportado, lista do operador. **Tudo isso é testável hoje**, sem aviso real nenhum, usando o HMAC que já existe como adaptador de referência. `LTM-03b` — o adaptador da `paysure`, bloqueado pelo aviso capturado. Isto **destrava o caminho do dinheiro** sem autorizar ninguém a inventar o formato da paysure.

**Recomendação do @po: (b), com (a) rodando em paralelo.** A divisão transforma um bloqueio externo numa dependência de uma story pequena, em vez de deixar a onda 3 inteira esperando o founder logar no painel.

### Correção obrigatória 2 — o AC10 falha mesmo depois de a tarefa 1 ser cumprida

A tarefa diz: acrescentar `paysure` ao `paymentGatewayProviderEnum` em `src/db/schema/payments.ts`. Só que **não é o enum do schema que produz o 404**. A lista que a rota consulta é outra:

```
src/app/api/webhooks/payment/[tenant]/[provider]/route.ts:21
  if (!PAYMENT_GATEWAY_PROVIDERS.includes(provider as never)) → 404
```

`PAYMENT_GATEWAY_PROVIDERS` é uma **segunda cópia** da lista dos 18 provedores, em `src/lib/validations/payment-gateway.ts:3-21`, e tem **três** consumidores:

| Consumidor | Consequência de não atualizar |
|---|---|
| `route.ts:21` | o webhook da paysure continua respondendo **404** — o AC10 falha |
| `src/lib/validations/payment-gateway.ts:25` (`z.enum`) | salvar a credencial da paysure é **rejeitado na validação** |
| `src/app/dashboard/integrations/payments/page.tsx:54` | a paysure **não aparece** na tela de integrações — o operador não consegue nem configurá-la |

Exigido: a tarefa de acrescentar `paysure` passa a nomear `src/lib/validations/payment-gateway.ts` **junto com** o schema, e o AC10 passa a cobrir também o salvamento da credencial e a presença na tela. Opcional, para @architect decidir: derivar o `z.enum` do `pgEnum` para a lista deixar de existir em duplicata — não é requisito desta story, é a raiz do problema.

**Consequência para a formação de ondas:** `src/lib/validations/payment-gateway.ts` e `src/app/dashboard/integrations/payments/page.tsx` **não estão no conjunto de arquivos declarado** da story. `.claude/rules/parallel-waves.md` exige conjunto completo para formar onda. Não há colisão real com a LTM-04 (ela não toca esses arquivos), mas a declaração tem que ser corrigida antes do despacho.

### Correção obrigatória 3 — dependência externa não declarada

"Aviso real da `paysure` capturado" é hoje o **maior bloqueio** da story e aparece só como tabela em branco no Dev Agent Record. Tem que subir para **Dependências**, com dono (founder), o que exatamente se precisa (corpo, cabeçalhos, esquema de verificação) e onde se obtém.

### Correção obrigatória 4 — ordem dos ACs

A numeração corre **AC1-7, AC10, AC11, AC8, AC9**. AC8 e AC9 ficaram depois dos inseridos hoje. Reordenar preservando os identificadores (mover AC8 e AC9 para antes de AC10), para que marcar "AC8 feito" não seja ambíguo.

### O que **não** é problema (verificado, para não ser reaberto)

- **Os itens 1 a 7 da decisão de arquitetura estão coerentes** entre si e com os ACs. O item 4 (`paysure` no enum) é de fato o pré-requisito que ele diz ser, e o item 3 (assinatura dentro do adaptador) é consistente com o item 5 e com o achado de `06`.
- **A dependência de LTM-02 e LTM-05 está certa** e não é circular: a LTM-05 testa o código que já existe, então ela fecha sem depender de nada desta.
- **Os AC2 e AC3 (idempotência sequencial e concorrente) são testáveis hoje** — não precisam da paysure. São o núcleo do `LTM-03a` proposto.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-16 | 1.1 | Validação NO-GO (6,5/10) — AC11 circular (depende de G5, que depende desta story); AC10 não alcançável pela tarefa declarada (o 404 vem de `lib/validations/payment-gateway.ts`, não do enum); dependência do aviso real não declarada; ACs fora de ordem. Permanece Draft. | @po (Pax) |
