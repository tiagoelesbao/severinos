# LTM-03: O webhook fecha o pedido — com idempotência

**Status:** Draft
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
- validação HMAC-SHA256 sobre o **corpo cru** da requisição, comparada com `timingSafeEqual` **e com checagem de comprimento antes** — `timingSafeEqual` lança quando os buffers têm tamanhos diferentes, e o código já trata isso. Isso não é acidente, é correto;
- o evento é gravado em `payment_webhook_events` **antes** da decisão de assinatura, com o campo `signatureValid` — ou seja, há trilha de auditoria até do que foi rejeitado. O comentário no schema registra que a plataforma anterior não dava essa visibilidade.

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
3. **Casamento do pedido por referência externa explícita**, não por heurística de valor. O pedido precisa levar a referência que o provedor devolve. Qual campo do payload carrega isso varia por provedor — por isso: um **mapeador por provedor** (função que recebe o payload e devolve `{ externalEventId, orderRef, amount, paidAt, status }`), com um mapeador implementado de verdade e os outros 17 declarados como não suportados **em voz alta**, nunca silenciosamente aceitos.
4. **Fail-loud no não-casado** — precedente da casa (VEX-14): evento que não casa com pedido nenhum fica gravado com `orderId` nulo e um estado de casamento explícito, e aparece numa lista para o operador. Nunca `{ ok: true }` e esquecer. O código de resposta HTTP continua 200 para o provedor parar de reentregar aquilo que já foi registrado, mas o registro fica marcado como pendente de resolução.
5. **Número já vendido por outro pedido nunca é sobrescrito.** O fechamento falha alto e marca o pedido para revisão manual. Sobrescrever `orderId` de um número vendido é apagar o dono anterior de um título — é dinheiro de outra pessoa.
6. **Pagamento chegando após a reserva expirar precisa de uma saída determinística.** A política (devolver número se ainda disponível, ou registrar para estorno) é decisão do dono do negócio; o que esta story garante é que **existe uma única saída definida, coberta por teste, e nenhum caminho em que o pagamento é registrado e o comprador fica sem número e sem estorno registrado**.

## Tarefas (Checklist)

- [ ] `src/db/schema/payments.ts`: `externalEventId` + estado de casamento em `payment_webhook_events`; `uniqueIndex` `(tenant_id, provider, external_event_id)`.
- [ ] `src/lib/payments/settle-order.ts` (novo): fechamento transacional — pedido pago, números vendidos, crédito bancário, contador anti-spam zerado.
- [ ] `src/lib/payments/providers/` (novo): mapeador por provedor; um implementado, os demais recusados explicitamente.
- [ ] Rota do webhook: casar → fechar → responder; preservar intacto o trecho de HMAC.
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
- [ ] **AC7 (provedor não suportado falha alto):** payload de provedor sem mapeador implementado → resposta de erro nomeando o provedor, evento gravado, pedido intocado. Nunca `{ ok: true }` para pagamento que não soube processar.
- [ ] **AC8 (pagamento atrasado tem uma única saída):** pagamento que chega depois de a reserva expirar e os números serem liberados segue **uma** política documentada, coberta por teste. O invariante verificado é: não existe estado final em que o pagamento está registrado em `banking_transactions` e o comprador não tem nem o número nem um registro de estorro pendente.
- [ ] **AC9 (uma só implementação do fechamento):** `simulatePayment` e o webhook chamam a mesma função. Verificável por busca: a sequência de marcar pedido pago + números vendidos + crédito bancário aparece em **um** arquivo apenas.

## Escopo

**IN:** fechamento transacional do pedido; chave de idempotência com unicidade no banco; mapeador por provedor com um provedor real; fail-loud no não-casado e no não-suportado; lista de eventos não casados; reuso em `simulatePayment`; preservação do HMAC.
**OUT:** credenciais reais de gateway em produção (é o portão G5 do epic, não engenharia); os 17 mapeadores restantes (cada um vira item quando o provedor for de fato contratado — implementar mapeador sem payload real é inventar formato); conciliação financeira retroativa; estorno automático (AC8 exige a saída definida e o registro, não a execução do estorno).

## Dependências

- **Depende de LTM-02 (bloqueante).** Sem transação, o fechamento vira três escritas soltas com dinheiro já capturado — a mesma classe de bug, com consequência pior.
- **Depende de LTM-01** — o fechamento consulta `product_numbers` por `order_id`.
- **Depende de LTM-05** — os ACs 2, 3, 4 e 6 são todos automatizados.
- **Onda 3, pode ir em paralelo com LTM-04.** Toca `src/app/api/webhooks/...`, `src/db/schema/payments.ts`, `src/lib/payments/` (novo) e `src/lib/actions/checkout.ts`; a LTM-04 toca schema de atribuição, `reserve.ts` e rotas novas. Conjuntos disjuntos.
- ⚠️ **Recurso mutável compartilhado com a LTM-04:** ambas geram migração. Serializar `pnpm db:generate`.

## Riscos

- **[Alto] Formato de payload assumido errado** para o provedor real. Mitigação: o mapeador é por provedor e isolado; AC7 garante que provedor sem mapeador recusa em voz alta em vez de processar errado. O payload real precisa ser capturado do provedor antes de implementar o mapeador — a trilha em `payment_webhook_events` serve exatamente para isso.
- **[Médio] Reentrega fora de ordem** (aviso de cancelamento chegando antes do de pagamento). Mitigação: o estado do pedido é a autoridade; transição inválida é recusada e registrada, não aplicada.
- **[Médio] Chave de idempotência ausente no payload de algum provedor.** Mitigação: o mapeador declara qual campo usa; provedor sem identificador estável de evento é tratado como não suportado (AC7) até existir uma chave derivável e estável.
- **[Baixo] Responder 200 em evento não casado atrasa a descoberta do problema.** Mitigação: AC5 exige a lista para o operador — a visibilidade substitui o retry.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Payload real do provedor (capturado antes de implementar o mapeador)
_(colar aqui, sem dado pessoal)_

### Política escolhida para o AC8
_(registrar a decisão e quem decidiu)_

### Notas
_(preencher na implementação)_
