# EPIC-LTM: Migração do Império Prêmios para o lotemania

## Visão Geral

Levar o **Império Prêmios** da **Sorteamos** (hoje em `painel.rapidinhas24hr.com`) para o **lotemania** (`apps/lotemania`, importado em 2026-11-16 pelo commit `2ac7d133`) sem perder um pedido, um real ou um dado de atribuição.

O lotemania é a sucessora da Sorteamos: mesma operação, plataforma própria, multi-tenant white-label. A troca só acontece quando o lotemania aguentar o que a Sorteamos já aguenta — e isso é medível, não opinável.

## Status: ✅ VALIDADO PARCIALMENTE (@po, 2026-11-16) — 4 de 5 stories em `Ready`, LTM-03 em `Draft` (NO-GO)

**Epic ID:** LTM
**Owner:** @pm (Morgan) · implementação @dev · schema @data-engineer
**Priority:** **Critical** — é o caminho do dinheiro de um cliente em produção
**Criado:** 2026-11-16
**App:** `apps/lotemania` · **Origem a substituir:** Sorteamos (`api.rapidinhas24hr.com`)

---

## Estado real, medido

Fonte: `apps/lotemania/README.md` (levantamento de 2026-11-16) e leitura direta do código.

### O que o lotemania é hoje

| | |
|---|---|
| Arquivos / linhas | 187 · 14.462 |
| Páginas de dashboard | 27 — **1 vazia de fato** (`social`); `analytics` tem 20 linhas; `reports` tem **149 linhas em 2 arquivos** |
| Gateway de produção | **`paysure` não existe no enum** — o lotemania não consegue nem representar quem recebe o dinheiro |
| Transações no banco | **zero** `db.transaction()` em 14.462 linhas |
| Índices em `product_numbers` | **nenhum** (o comentário no schema afirma que existe) |
| Pedidos pagos de verdade | **zero** — o webhook de pagamento é um `TODO` |
| Atribuição por pedido | **nenhuma** — sem `utm_*`, `fbc`, `fbp`, `gclid`, `ttclid` |
| API de leitura para o ETL | **não existe** (só `auth/*` e o webhook) |
| Testes | **zero** |

É um **andaime**. O esqueleto e o schema estão certos; a profundidade não existe.

> **Correção de medição (2026-11-16).** A primeira versão desta tabela dizia "3 páginas vazias" e "`reports` com 22 linhas". Estava errado: a medição contou só o `page.tsx` de cada pasta e generalizou. Recontado pela pasta inteira, **só `social` é vazia** e `reports` tem 149 linhas. O erro foi medir o arquivo de entrada e concluir sobre a feature — a tela mora na pasta. Registrado aqui porque três documentos propagaram o número errado antes da correção.

### O que a migração tem que aguentar

Medido no BI do Império, últimos 7 dias:

| | |
|---|---|
| Rodadas | **177** · 174 esgotadas · **100 números cada** |
| Esgotamento típico | **1,8 h** · o mais rápido em **18 min** (~5,5 números/minuto) |
| Pedidos pagos | **10.550** · R$ 639.325 · ticket médio R$ 61 |
| Rodadas ativas simultâneas | **5** |
| Fluxo diário | **≈ R$ 90 mil/dia** |

O gargalo **não é volume de dados** (~900 mil linhas/ano em `product_numbers` é trivial para Postgres *com índice*). O gargalo é **contenção**: cem números finitos esgotando em minutos, cinco rodadas ao mesmo tempo.

---

## O problema, em uma frase

Hoje o lotemania **não consegue vender**, e se conseguisse venderia errado: sem índice ele varre a tabela a cada reserva, sem transação ele deixa pedido órfão quando duas pessoas disputam o mesmo número, sem fechamento de pedido o PIX pago não vira título, e sem atribuição por pedido a migração cega o CAPI do Meta e o BI inteiro no dia do corte.

---

## Frentes

| Frente | Objetivo | Stories | Status |
|---|---|---|---|
| **A — Fundação** | O caminho do dinheiro: índice, atomicidade, fechamento de pedido, atribuição, testes | `LTM-01` a `LTM-05` | **Validada (@po 2026-11-16)** — 01/02/04/05 em `Ready`; `LTM-03` NO-GO, segue `Draft` |
| **B — Paridade** | Fechar a distância funcional contra a Sorteamos: `social`, os 3 exports por sorteio, os 3 tipos de `/reports`, mídia em S3 | *a definir* | **Escopo aberto** — baseline fechada o bastante para desenhar, mas **3 decisões de produto pendentes** (B1/B2/B3 abaixo) e as 14 abas do editor ainda não observadas |
| **C — Features novas** | O que o cliente pediu e a Sorteamos não faz — começando pela **cota dividida** | *a definir* | **Bloqueada** por modelagem (`/grill-with-docs`) **e** pela Frente A |

### Frente A — Fundação (escopo deste epic)

| Story | Problema que fecha | Prioridade |
|---|---|---|
| **LTM-01** | **F1** — `product_numbers` e `orders` sem índice nenhum; comentário do schema mente | P0 |
| **LTM-02** | **F2** — driver `neon-http` não faz transação; reserva desfaz "na mão" | P0 |
| **LTM-03** | **F3** — webhook valida HMAC e para num `TODO`; sem idempotência | P0 |
| **LTM-04** | **F4** — atribuição por pedido não existe; sem API de leitura para o ETL | P0 |
| **LTM-05** | **F5** — zero testes no caminho do dinheiro | P0 |

### Frente B — Paridade (fora deste epic)

O escopo da paridade **não é inventado aqui**. Ele vem da baseline da Sorteamos em `docs/research/2026-11-16-baseline-sorteamos/`, agora com observação ao vivo do painel (documento `06`). Três achados **mudam o enquadramento da frente inteira** e precisam de decisão do dono do negócio antes de virar story:

#### B1 — "Paridade visual idêntica" é uma decisão de template, não de implementação

A identidade visual da Sorteamos **é o Minimal UI**, um template React admin comercial, com uma paleta verde por cima. Provado pelos ícones `ic_*.svg`, pela fonte Public Sans e pela rota de demonstração `/user/reece-chung/edit` deixada no bundle.

Reconstruir isso à mão é refazer um template que se compra. **Decisão:** adotar o mesmo template no lotemania (paridade visual sai quase de graça), ou assumir identidade própria e tratar "idêntico" como "equivalente em função". Não é escolha de engenharia.

#### B2 — Analytics não é uma feature a replicar; é andaime morto

A tela `/dashboard/analytics` da Sorteamos exibe **dados fictícios do template, intocados**: "Bug Reports 234", séries "Team A / B / C", eixo de Jan '03 a Oct '03, pizza por continente. **Nenhum número ali vem do Império.**

Clonar isso seria clonar andaime. A tela `analytics` do lotemania, com suas 20 linhas, já é mais honesta que a original. Isto **elimina** a story de paridade de Analytics e a substitui por uma pergunta de produto: construir analytics de verdade (o BI do Império já existe e faz isso), ou remover o item da barra lateral.

#### B3 — O escopo de integrações encolheu por decisão do founder

A Sorteamos expõe 104 endpoints, incluindo 19 gateways e integrações de WhatsApp, SMS e push. **Decisão do founder em 2026-11-16: só a `paysure` importa agora.** z-api, wizebot, onesignal, paposms, liguelead, dxmidia e nexopro **saem da paridade**. O que sobra de gateway vira um item da `LTM-03`, não uma frente.

#### O que de fato sobra para a Frente B

| Item | Origem | Tamanho |
|---|---|---|
| `social` — única tela vazia de verdade | levantamento do app | pequeno |
| Os 3 relatórios do menu por sorteio (Vendas, Expirados, Participantes) | exports reais do cliente, já em `docs/research/.../05` | médio — é contrato de coluna, não tela |
| Os 3 tipos do `/reports` (`sales_by_day`, `top10_buyers`, `top10_regions`) | observação ao vivo | médio |
| `/settings/payment-errors` e `/settings/security-blocks` | só existem na Sorteamos | a dimensionar |
| As 14 abas do editor de sorteio | **ainda não observadas** | desconhecido — é o maior buraco restante |
| Armazenamento de mídia (S3) | hoje `products.imageUrl` é só string | médio |

**Bloqueio restante:** as 14 abas do editor e o modal de Faturamento continuam não observados. A passada de observação parou porque **a sessão do painel expirou** — precisa do founder logado para continuar.

### Frente C — Features novas: a cota dividida (escopo futuro, **não vire story agora**)

O Império quer **dividir a cota em dois**: cada número pode ser comprado inteiro ou em duas metades, por duas pessoas. Quem compra inteiro leva tudo; duas metades dividem o prêmio. Permite prêmios maiores (100k, 200k) sobre os mesmos 100 números — é a razão de negócio da feature.

**Por que ela não pode ser story hoje:**

1. **Quebra a premissa de um dono por linha.** Hoje `product_numbers` tem uma linha por número e a reserva é um `UPDATE ... WHERE status = 'available'` — atômico *porque* cabe exatamente um dono. Com metades, a linha passa a ter dois donos possíveis e três estados de ocupação (vazio / meio / cheio), e o `UPDATE` condicional atual deixa de ser suficiente.
2. **Dobra a contenção.** O mesmo número passa a ser disputável duas vezes. Com esgotamento medido em 18 min no pior caso, isso dobra a pressão exatamente no ponto que `LTM-01` e `LTM-02` estão consertando.
3. **Muda o rateio de prêmio**, que é dinheiro do ganhador — território onde mexer sem a suíte de `LTM-05` é irresponsável.

**Dependência explícita:** a modelagem passa por `/grill-with-docs` **depois** de `LTM-01`, `LTM-02` e `LTM-05` estarem Done. Só então vira story.

---

## Sequenciamento e dependências

```
LTM-05 (testes) ──┬─► LTM-02 (transação) ──┬─► LTM-03 (webhook fecha pedido)
LTM-01 (índices) ─┘                        └─► LTM-04 (atribuição + API de leitura)

Frente A completa ──► Frente C (cota dividida, após /grill-with-docs)
Baseline Sorteamos ──► Frente B (paridade)
```

**Ordem de execução recomendada:** `LTM-05` + `LTM-01` → `LTM-02` → `LTM-03` + `LTM-04`.

### Por que esta ordem

| Aresta | Razão |
|---|---|
| `LTM-05` antes de `LTM-02` | O teste de concorrência da reserva é **o critério de aceite** da LTM-02: ele tem que falhar antes e passar depois. Sem a suíte, "ficou atômico" é afirmação sem prova. |
| `LTM-02` antes de `LTM-03` | Fechar pedido sem transação recria o problema que a LTM-02 resolve — marcar `orders.paid` + `product_numbers.sold` + `banking_transactions` em três `UPDATE` soltos é a mesma classe de bug, agora com dinheiro já capturado. |
| `LTM-01` independente | Só toca schema e migração. Pode rodar em paralelo com a LTM-05. |
| `LTM-03` e `LTM-04` em paralelo | Arquivos-fonte disjuntos (ver nota de ondas abaixo). |

### Nota para formação de ondas (`.claude/rules/parallel-waves.md`)

- **Onda 1:** `LTM-05` (`tests/`, `package.json`, config de teste) + `LTM-01` (`src/db/schema/raffles.ts`, migração). Arquivos disjuntos.
- **Onda 2:** `LTM-02` sozinha (`src/db/index.ts`, `src/lib/actions/reserve.ts`, `src/lib/actions/checkout.ts`, `package.json`).
- **Onda 3:** `LTM-03` (`src/app/api/webhooks/...`, `src/db/schema/payments.ts`) + `LTM-04` (schema de atribuição, `src/lib/actions/reserve.ts`, rotas novas em `src/app/api/v1/`).
- ⚠️ **Recurso mutável compartilhado:** o journal do Drizzle (`drizzle/meta/_journal.json`) é tocado por qualquer story que gere migração. Duas `drizzle-kit generate` concorrentes colidem. **Serializar o passo de geração de migração** mesmo quando as stories rodam em paralelo.

---

## Validação do @po (2026-11-16)

| Story | Pontuação | Veredicto | Status |
|---|---|---|---|
| LTM-01 (índices) | 9/10 | **GO** | `Ready` |
| LTM-02 (transação) | 9/10 | **GO** | `Ready` |
| LTM-03 (webhook) | 6,5/10 | **NO-GO** | `Draft` — 4 correções obrigatórias na própria story |
| LTM-04 (atribuição) | 9/10 | **GO** | `Ready` |
| LTM-05 (testes) | 9/10 | **GO** | `Ready` |

**A onda 1 está liberada.** `LTM-05` e `LTM-01` passaram com rigor extra justamente porque travam a cadeia; a onda 2 (`LTM-02`) também está `Ready`. O NO-GO da `LTM-03` está na **onda 3** e não atrasa nada antes dela — mas precisa de decisão **antes** do despacho da onda 3, e uma das saídas é externa (ver abaixo).

### Contradição de portão que este epic precisa resolver

**G5 não pode vir depois de G1 para a `LTM-03`.** O AC11 da `LTM-03` exige que o adaptador da `paysure` nasça de um **aviso real capturado**. Capturar exige credencial ligada — que este epic coloca em **G5**. E G5 vem depois de **G1 (LTM-01 a LTM-05 em Done)**, que contém a `LTM-03`. Ciclo fechado: a story não pode ficar Done.

A saída que não passa por G5: a `paysure` **já está em produção na Sorteamos**, então o aviso real existe hoje, do outro lado — é captura por observação, não por engenharia. Mas `05-pendente-de-observacao.md` e `06-observacao-ao-vivo.md` registram que a observação parou porque **a sessão do painel expirou**. Portanto:

> **Bloqueio externo, dono: founder.** Capturar um aviso real da `paysure` (corpo, cabeçalhos e esquema de verificação) é **pré-requisito da `LTM-03`**, não produto do G5. Enquanto não houver data para isso, a recomendação do @po é **dividir a story** (`LTM-03a` sem a paysure, testável hoje; `LTM-03b` só o adaptador), para a onda 3 não ficar esperando um login.

### Achados que o epic não registrava

1. **`product_numbers.order_id` não tem FK para `orders`.** É por isso que "número órfão" é alcançável — e é o invariante que `LTM-02` (AC3) e `LTM-05` (AC5-d) verificam por asserção. Criar ou não a FK é decisão de @architect/@data-engineer; passou a ser AC8 da `LTM-01` **registrar a decisão**.
2. **A lista de provedores existe em duplicata.** `PAYMENT_GATEWAY_PROVIDERS` (`src/lib/validations/payment-gateway.ts`) é uma segunda cópia dos 18 provedores e é **ela** que produz o 404 do webhook, além de alimentar a validação da credencial e a tela de integrações. Acrescentar `paysure` só no `pgEnum` não resolve nada dos três.
3. **`paymentId`/`paymentEndToEndId` não têm onde morar.** O ETL os lê (`client_api.py:508-509`), e o lotemania só tem `externalReference` em `banking_transactions`. É uma aresta `LTM-03` ↔ `LTM-04` que não estava mapeada, e as duas estão na mesma onda gerando migração.
4. **B3 não é decisão pendente.** A tabela de Frentes diz que a Frente B tem "3 decisões de produto pendentes (B1/B2/B3)", mas o próprio texto do B3 registra a decisão **já tomada** pelo founder em 2026-11-16 (só `paysure`). Pendentes são B1 e B2.
5. **Os números do BI são uma janela móvel de 7 dias.** Conferidos hoje contra `apps/BI/imperio-premios/data-produto.json`: os estruturais batem exatamente — `numeros_total` = 100 em 100% das rodadas, mediana de esgotamento **1,748 h** (≈ 1,8 h) e mínimo **0,3 h** (18 min ⇒ ~5,5 números/minuto). Já as contagens agregadas andaram com o refresh de hoje (a janela de 7 dias agora dá 193 rodadas e ≈ R$ 701 mil, contra as 177 e R$ 639.325 registradas aqui). **Nada está errado** — é janela móvel. Recomendação: marcar a tabela com a data do snapshot, para a deriva não ser lida como erro de medição mais tarde.

## Critérios de "pronto para migrar o cliente"

A migração do Império só é autorizada quando **todos** os sete portões abaixo estiverem verdes. Nenhum deles é opinião.

| Portão | Critério | Como se comprova |
|---|---|---|
| **G1 — Fundação** | `LTM-01` a `LTM-05` em Done | Suíte verde; o verificador de invariantes da LTM-05 passa no cenário de concorrência |
| **G2 — Paridade** | Zero tela vazia no caminho do operador do Império; os exports da Sorteamos reproduzidos | Checklist derivado da baseline (`docs/research/2026-11-16-baseline-sorteamos/`), item a item |
| **G3 — Atribuição e BI** | O ETL (`services/Meta/imperio-premios/client_api.py`) e o CAPI leem o lotemania **sem perda de campo** | Janela de leitura dupla: mesmo período lido das duas plataformas produz o mesmo faturamento e a mesma contagem de pedidos pagos |
| **G4 — Carga** | Cenário medido executado em staging: 5 rodadas simultâneas de 100 números, esgotando no ritmo do pior caso real (~5,5 números/minuto) | Zero oversell, zero pedido órfão, zero número com dois donos — verificador de invariantes da LTM-05 ao final |
| **G5 — Dinheiro real** | Pelo menos **um** pedido pago ponta a ponta com gateway PIX real, em produção, num sorteio de teste | Pedido `paid`, números `sold`, `banking_transactions` com o crédito, evento de webhook casado |
| **G6 — Reversão** | Plano de volta à Sorteamos escrito **e exercitado uma vez** antes do corte | Registro do ensaio de reversão com tempo medido |
| **G7 — Dado pessoal** | A migração de histórico respeita a política de 2026-11-12 (`docs/ESTADO-ATUAL.md` §1-A) | Nenhum CPF, telefone, e-mail ou nome em artefato versionado; varredura antes de cada commit |

**G1 a G5 são bloqueantes para o corte. G6 e G7 são bloqueantes para o commit do corte.**

---

## KPIs de sucesso do epic

- [ ] Reserva em sorteio com 1 milhão de linhas em `product_numbers` sem `Seq Scan` (comprovado por `EXPLAIN`)
- [ ] 100% do caminho do dinheiro dentro de transação — zero compensação manual no código
- [ ] Evento de webhook reentregue 5× produz **1** pedido pago e **1** lançamento bancário
- [ ] Todo campo de atribuição que o `client_api.py` lê hoje existe e chega preenchido no lotemania
- [ ] Suíte roda contra Postgres de verdade e cobre o ramo de falha de cada arquivo do caminho do dinheiro

---

## Riscos do epic

| Risco | Severidade | Mitigação |
|---|---|---|
| Corte com paridade incompleta derruba o faturamento do cliente | **Alto** | G2 bloqueante; corte só com a baseline fechada e conferida item a item |
| Perda de atribuição no dia do corte cega o CAPI e o BI | **Alto** | G3 exige janela de leitura dupla antes do corte, não depois |
| Criação de índice em tabela grande no momento da importação do histórico | **Médio** | Criar os índices **antes** de importar histórico, com a tabela vazia (ver LTM-01) |
| Migração de dados pessoais do Império para artefato versionado | **Médio** | G7 — política já escrita no `.gitignore` desde 2026-11-12 |
| Cota dividida entrar antes da fundação fechar | **Médio** | Frente C explicitamente bloqueada por A; registrado acima |
| Driver WebSocket (`neon-serverless`) se comportar diferente no runtime do Next | **Médio** | LTM-02 exige smoke em `next build` + `next start`, não só em teste |

---

## Referências

- App: `apps/lotemania/` · levantamento honesto em `apps/lotemania/README.md`
- Estado do sistema e política de dado pessoal: `docs/ESTADO-ATUAL.md`
- ETL que hoje lê a Sorteamos: `services/Meta/imperio-premios/client_api.py`
- CAPI em tempo real (consome `data.params` do `order.paid`): `apps/webhook-imperio-capi/api/order-paid.js`
- Captura de UTM própria: `apps/utm-capture-imperio/api/capture.js`
- Stories: `docs/stories/03-Product/EPIC-LTM-Imperio-Migration/`

---
*A plataforma que não vende não migra. A que vende errado migra o erro junto.*
