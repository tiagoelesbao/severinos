# LTM-04: Atribuição por pedido e API de leitura — o contrato já existe, só não é emitido

**Status:** Ready
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o problema **F4**
**Prioridade:** **P0** — sem isso o corte cega o CAPI do Meta e o BI inteiro no mesmo dia
**Complexidade:** L (Standard) — captura na origem + colunas novas + API de leitura com contrato fixo + payload de saída
**Criada por:** @pm (Morgan) · 2026-11-16

## Story

**Como** dono que decide investimento de mídia com base no BI e alimenta o CAPI do Meta
**Eu quero** que cada pedido do lotemania carregue de onde veio
**Para que** no dia do corte o ETL e o CAPI continuem lendo os mesmos campos que leem hoje, sem perder um único atributo.

## Contexto (evidência lida no código, 2026-11-16)

### O lotemania não tem atribuição nenhuma

Nenhum campo de atribuição em `orders` nem em tabela relacionada. Os dois candidatos que parecem resolver, não resolvem:

| O que existe | O que é de verdade |
|---|---|
| `refresh_tokens.userAgent` | rastreio de sessão de **login**, não do pedido. Pedido da loja pública pode nem ter login associado àquele token. |
| `utm_links` (`src/db/schema/settings.ts`) | **construtor de link** com `source`, `medium`, `campaign` e um contador `clicks`. É agregado por link — não diz nada sobre qual pedido veio de onde. |

### O contrato de saída **já está definido** — pelos dois consumidores que existem hoje

Esta é a economia desta story: não há formato a inventar. O lotemania tem que emitir exatamente o que estes dois já consomem.

**1. `apps/webhook-imperio-capi/api/order-paid.js`** — recebe o evento `order.paid` e dispara o CAPI em tempo real. Lê:

| Caminho no payload | Uso |
|---|---|
| `event` (= `order.paid`), `timestamp` | roteamento e `event_time` do CAPI |
| `data.id` | id do pedido, chave de deduplicação |
| `data.total` (ou `data.subtotal`) | valor |
| `data.user.id`, `data.user.email`, `data.user.phone` (já em E.164) | `external_id`, `em`, `ph` (hasheados antes de ir ao Meta) |
| `data.params.fbc`, `data.params.fbp` | identidade de clique e de navegador |
| `data.params.ip`, `data.params.userAgent` | `client_ip_address`, `client_user_agent` |
| `data.params.utmSource` / `utmMedium` / `utmCampaign` / `utmContent` / `utmTerm` | gravados no BI |
| `data.params.gclid`, `data.params.ttclid` | canais Google e TikTok |
| header `X-AUTH-WEBHOOK` | autenticação por segredo compartilhado |

**2. `services/Meta/imperio-premios/client_api.py`** — o ETL de polling. Autentica e lê dois endpoints, e de cada pedido consome: identificação do comprador (`userId` com `name`, `phone`, `phoneDetails.e164`, `phoneDetails.country`, `email`, `cpf`), `quantity`, `total`, `numbers` (lista com uma entrada por número, sempre do mesmo tamanho que `quantity`), identificadores de pagamento (`paymentId`, `paymentEndToEndId`, `paymentAt`), `userAgent`, afiliado, e os mesmos `fbc`, `fbp`, `gclid`, `ttclid`, `utmSource/Medium/Campaign/Content/Term`.

### Dois achados do histórico que mudam o critério de aceite desta story

**Achado A — ter o campo não é ter o dado.** Registrado em `apps/webhook-imperio-capi/api/order-paid.js` (2026-10-08): a Sorteamos **declara** os cinco campos de UTM no payload e eles chegam **vazios em 100%** dos pedidos reais — inclusive em 25 pedidos com clique de anúncio confirmado e recente. Pela API REST, `UTM_Source` vem vazio em **99,6%**. A plataforma não anexa UTM a pedido nenhum. Ou seja: declarar as colunas e não preenchê-las reproduz o gap que estamos migrando para fora. **A captura é o entregável; a coluna é só onde ela mora.**

**Achado B — existe uma gambiarra em produção que esta story aposenta.** `apps/utm-capture-imperio/api/capture.js` é um beacon injetado por GTM que grava `{fbp, fbc, utm_*, landing_url}` no Supabase **por `fbp`** — não por pedido, "porque nesse momento o pedido ainda nem existe". Ele existe só porque a plataforma atual não persiste atribuição. Quando o lotemania capturar na origem, essa correlação por `fbp` deixa de ser necessária. **Desligar o beacon não é escopo desta story** (ele serve o Império na Sorteamos até o corte), mas o critério de sucesso é: o lotemania não precisa dele.

Terceiro achado relevante ao contrato: `/products` da Sorteamos é **indexado a partir de `page=0`** — assumir `page=1` custou ~75% do faturamento capturado por um ciclo inteiro (achado de 2026-10-07, documentado no `client_api.py`). O contrato da nossa API precisa ser 0-indexado e isso precisa estar em teste, não em comentário.

## Decisão de arquitetura (proposta)

1. **Capturar na criação do pedido**, dentro da mesma transação que cria o pedido (LTM-02). Atribuição gravada depois é atribuição que se perde quando algo falha no meio.
2. **Primeiro toque persistido no navegador, não só na URL do checkout.** É isso que resolve o Achado A: a UTM chega na primeira página e tem que sobreviver à navegação interna até a reserva. Captura só no momento do checkout reproduz exatamente a falha da Sorteamos.
3. **Tabela própria de atribuição, um-para-um com o pedido** (`order_attribution`), em arquivo de schema novo — não colunas espalhadas em `orders`. Três razões: mantém `orders` enxuto no caminho quente da reserva; isola a área de arquivo da LTM-03 (ondas paralelas); e deixa explícito que atribuição é dado de marketing, com regra de retenção própria.
4. **API de leitura com contrato idêntico ao que o ETL já consome**, para que a migração do `client_api.py` seja **trocar a URL base e nada mais**. Dois endpoints, 0-indexados, com os mesmos filtros.
5. **O evento de saída `order.paid` reusa `outbound_webhooks`**, que já existe no schema (`src/db/schema/integrations.ts`, com `outbound_webhook_deliveries` para a trilha). Não há infraestrutura nova a construir — há um payload a emitir no formato que o `order-paid.js` já lê.
6. **Autenticação obrigatória e nada a mais do que o necessário.** Os endpoints devolvem dado pessoal do comprador; respondem só autenticados, escopados ao tenant. O que a resposta inclui é o que o ETL comprovadamente lê — nada "por conveniência futura".
7. **A integração nativa de Meta Ads da Sorteamos fica de fora desta story — e isso é deliberado.** A observação ao vivo revelou cinco rotas que não conhecíamos (`/api/meta-ads`, `/config`, `/active`, `/fetch-account-ids`, `/associate-account-ids`): a plataforma associa contas de anúncio nativamente.

   Isso **não muda** o que a LTM-04 faz, porque o contrato de saída desta story vem dos dois consumidores que já rodam (`order-paid.js` e `client_api.py`), não da plataforma. Mas levanta uma pergunta que vale responder **antes** de construir: se a Sorteamos já associa conta de anúncio, **por que `utmSource` chega vazio hoje?** Ou a integração não está configurada, ou ela preenche outro campo que não estamos lendo.

   **Ação:** observar `/api/meta-ads/config` no painel antes de implementar. Se a resposta for "a integração existe e preenche", o Achado A muda de causa e a captura própria pode ser menor do que esta story supõe. Se for "nunca foi configurada", esta story segue exatamente como está. **Não bloqueia** — a captura de primeiro toque é necessária nos dois cenários.

## Tarefas (Checklist)

- [ ] `src/db/schema/attribution.ts` (novo): `order_attribution` um-para-um com `orders` — `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term`, `fbc`, `fbp`, `gclid`, `ttclid`, `ip`, `user_agent`, `landing_url`, `first_touch_at`. Índice por `order_id`.
- [ ] Captura de primeiro toque no cliente da loja (`src/app/loja/[tenant]/`): persistir os parâmetros de atribuição na entrada e carregá-los até a reserva.
- [ ] `src/lib/actions/reserve.ts`: receber e gravar a atribuição na mesma transação do pedido.
- [ ] `src/app/api/v1/products/route.ts` (novo) e `src/app/api/v1/products/[id]/orders/route.ts` (novo): paginação 0-indexada, filtros equivalentes, autenticação, escopo por tenant.
- [ ] Emissão do evento `order.paid` via `outbound_webhooks` no fechamento do pedido, com `data.params` no formato lido pelo `order-paid.js`, autenticado pelo header de segredo compartilhado.
- [ ] Teste de contrato que percorre a lista de campos que o `client_api.py` lê e o `order-paid.js` lê, campo por campo.
- [ ] Documentar os dois endpoints e o payload do evento no README do app.

## Critérios de Aceite

- [ ] **AC1 (contrato do ETL, campo por campo):** um teste de contrato enumera **todos** os campos que `services/Meta/imperio-premios/client_api.py` consome de um pedido e falha se **qualquer um** estiver ausente da resposta de `GET /api/v1/products/{id}/orders`. A lista do teste é derivada do código do ETL (arquivo e linha citados no teste), não de memória.
  - **Lacuna já identificada na validação (@po, 2026-11-16), para não ser descoberta no meio da implementação.** O ETL lê `paymentId` e `paymentEndToEndId` (`client_api.py:508-509`) e `paymentAt` (`:545`). Hoje o lotemania **não tem onde guardar o identificador fim-a-fim**: `orders` tem `paymentGatewayProvider` e `paidAt`, e `banking_transactions` tem só `externalReference` (`src/db/schema/payments.ts`). Ou seja: este AC **exige um campo que ainda não existe no schema**, e ele mora no caminho de pagamento — território da LTM-03 (`settle-order`), não da tabela de atribuição desta story. Resolução: a story que chegar depois acrescenta o campo; se a LTM-04 chegar primeiro, ela o acrescenta e a LTM-03 o preenche. O que **não** pode acontecer é o AC1 ser marcado verde tendo removido `paymentEndToEndId` da lista enumerada — a lista é derivada do consumidor, e encurtá-la é falsificar o contrato.
  - **Nomes dos parâmetros do contrato**, lidos do ETL e não de memória: `page` (0-indexado), `rowsPerPage` (o ETL usa 25 em `/products` e 100 em pedidos) e `filters` como **string JSON** (`client_api.py:168`, `:256-260`). O AC3 cobre isso por comportamento; estão nomeados aqui para que a implementação não precise descobrir.
- [ ] **AC2 (contrato do CAPI, campo por campo):** teste equivalente para o evento `order.paid`: todo caminho que `apps/webhook-imperio-capi/api/order-paid.js` lê (`data.id`, `data.total`, `data.user.{id,email,phone}`, `data.params.{fbc,fbp,ip,userAgent,utmSource,utmMedium,utmCampaign,utmContent,utmTerm,gclid,ttclid}`, `event`, `timestamp`, header de autenticação) está presente e no mesmo lugar.
- [ ] **AC3 (o ETL migra trocando só a URL base):** o `client_api.py` apontado para o lotemania, **sem nenhuma outra alteração**, autentica, lista produtos e lista pedidos de um produto, e produz as linhas de dados brutos. Comprovado por execução real contra uma base semeada, com a saída registrada no Dev Record (**sem dado pessoal — usar dados sintéticos no seed**).
- [ ] **AC4 (a UTM sobrevive à navegação — o Achado A):** um teste de ponta a ponta entra na loja com os cinco parâmetros de UTM na URL, **navega internamente** até o sorteio, reserva e paga; o pedido resultante tem os cinco valores preenchidos. Este AC é o que separa "tem as colunas" de "tem o dado" — e é exatamente o cenário em que a Sorteamos falha em 100% dos pedidos.
- [ ] **AC5 (identidade de clique preservada):** `fbc` e `fbp` lidos dos cookies do navegador chegam ao pedido com o **valor original**, sem reescrita de timestamp. Teste: cookie com `fbc` de 10 dias atrás → o pedido carrega aquele mesmo valor, e o cálculo de idade do clique a partir dele dá 10 dias. (A plataforma atual reescreve o `fbc` com timestamp sempre "fresco", o que inviabilizou o filtro de idade no `capi_client.py` — registrado em `capture.js`. Não repetir.)
- [ ] **AC6 (paginação 0-indexada, em teste):** `GET /api/v1/products?page=0` retorna a **primeira** página, incluindo os registros mais recentes; nenhum registro é alcançável apenas por `page=1` e inalcançável por `page=0`. Teste com 25 produtos e página de 10 verifica cobertura total do conjunto ao percorrer de `page=0` até o fim. Este AC existe porque a suposição errada custou ~75% do faturamento capturado por um ciclo.
- [ ] **AC7 (sem pedido sem atribuição):** todo pedido criado pelo caminho da loja tem uma linha em `order_attribution` — mesmo quando a visita não tem nenhum parâmetro (linha presente com campos nulos e `first_touch_at` preenchido). Verificável por consulta: zero pedido sem linha de atribuição. "Vazio" e "nunca gravado" precisam ser distinguíveis, porque é essa distinção que mede o gap de captura.
- [ ] **AC8 (atribuição na mesma transação):** um teste que falha a transação da reserva depois de gravar a atribuição verifica que **nem** o pedido **nem** a atribuição persistiram.
- [ ] **AC9 (nada aberto):** os dois endpoints respondem **401** sem credencial e **não** retornam pedido de outro tenant com credencial de tenant diferente. Teste com dois tenants semeados.
- [ ] **AC10 (trilha do evento de saída):** cada emissão de `order.paid` fica registrada em `outbound_webhook_deliveries` com o status de resposta; falha de entrega não desfaz nem bloqueia o fechamento do pedido, e fica visível como entrega falha.

## Escopo

**IN:** tabela de atribuição um-para-um com o pedido; captura de primeiro toque sobrevivendo à navegação; gravação na transação do pedido; os dois endpoints de leitura com contrato do ETL; emissão de `order.paid` no formato do `order-paid.js` sobre o `outbound_webhooks` existente; testes de contrato derivados do código dos consumidores; documentação dos dois contratos.

**OUT:**
- **Desligar `apps/utm-capture-imperio`** — ele serve o Império na Sorteamos até o corte. O sucesso aqui é o lotemania não precisar dele; a desativação é item do corte.
- **Alterar o `client_api.py` ou o `order-paid.js`** — o AC3 prova que não é necessário. Se a implementação exigir mudar algum dos dois, o contrato está errado e é a nossa API que se ajusta.
- Modelo de atribuição multi-toque, janela de atribuição configurável, relatórios de canal no painel — nada disso está no diagnóstico nem no contrato atual. O ETL e o BI fazem essa conta hoje e continuam fazendo.
- Migração do histórico de atribuição da Sorteamos (é da fase de corte, e envolve dado pessoal — portão G7 do epic).

## Dependências

- **Depende de LTM-02 (bloqueante)** — AC8 exige a gravação na mesma transação do pedido.
- **Depende de LTM-03** — por **duas** razões, não uma:
  1. a emissão de `order.paid` pendura no fechamento do pedido. Se a LTM-03 ainda não estiver pronta quando esta chegar ao fim, a emissão fica pendurada no `simulatePayment` e a troca é trivial;
  2. **os identificadores de pagamento que o AC1 exige** (`paymentId`, `paymentEndToEndId`) não existem no schema e pertencem ao caminho de pagamento da LTM-03 (@po, 2026-11-16). Esta aresta não estava mapeada; quem chegar primeiro cria o campo, quem chegar depois o preenche — mas a aresta existe e precisa ser combinada entre as duas stories da onda 3 antes de começarem.
- **Depende de LTM-01** — a listagem de pedidos por produto (AC1/AC3) é uma das consultas que justificam os índices de `orders`.
- **Depende de LTM-05** — todos os ACs são automatizados.
- **Onda 3, pode ir em paralelo com LTM-03.** Toca `src/db/schema/attribution.ts` (novo), `src/lib/actions/reserve.ts`, `src/app/loja/[tenant]/` e `src/app/api/v1/` (novo). Disjunto da LTM-03.
- ⚠️ **Recurso mutável compartilhado com a LTM-03:** ambas geram migração. Serializar `pnpm db:generate`.

## Riscos

- **[Alto] Repetir o gap da Sorteamos** — declarar os campos e entregá-los vazios. Mitigação: AC4 (navegação interna) e AC7 (distinguir vazio de nunca gravado) são os dois critérios desenhados contra isso. É o risco central da story.
- **[Médio] Dado pessoal em artefato versionado.** O endpoint de pedidos devolve nome, telefone, e-mail e CPF. Mitigação: AC3 usa seed sintético; nenhuma saída real entra no Dev Record; política de 2026-11-12 (`docs/ESTADO-ATUAL.md` §1-A) vale integralmente.
- **[Médio] Bloqueador de cookie ou navegação sem JavaScript** derrubando a captura de primeiro toque. Mitigação: AC7 garante linha presente com campos nulos — captura degradada fica **medível** em vez de invisível.
- **[Baixo] Divergência futura entre o contrato e os consumidores** quando o `client_api.py` mudar. Mitigação: os testes de contrato citam arquivo e linha da origem; mudança no consumidor quebra o teste em vez de quebrar o BI em silêncio.
- **[Baixo] Entrega do evento de saída falhando** e o CAPI perdendo o tempo real. Mitigação: AC10 registra a falha; o ETL de polling continua sendo a rede de segurança, como já é hoje.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Lista de campos do contrato (derivada do código dos consumidores)
_(colar a lista usada nos testes do AC1 e AC2, com arquivo e linha de origem)_

### Execução do AC3 (ETL apontado para o lotemania)
_(colar a saída — seed sintético, sem dado pessoal)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-16)

**Veredicto: GO — 9/10.** A story é a mais bem ancorada do epic: o contrato de saída não é inventado, é lido de dois consumidores que já rodam. Conferido um a um:

- `orders` (`raffles.ts:93-117`) não tem campo de atribuição nenhum ✓
- `utm_links` (`settings.ts`) é construtor de link com `source`/`medium`/`campaign`/`clicks` — agregado por link, nada por pedido ✓
- `outbound_webhooks` e `outbound_webhook_deliveries` já existem (`integrations.ts:53` e `:67`) — não há infraestrutura a construir ✓
- `order-paid.js` lê `data.params.*` e autentica por `X-AUTH-WEBHOOK` ✓ (comentários nas linhas 10-14 e 29)
- `client_api.py` é 0-indexado com a nota do custo de ~75% ✓ (`:152-160`)
- `users` tem `name`, `email`, `phone`, `cpf` — o ETL encontra o comprador ✓
- As cinco rotas `/api/meta-ads` estão em `06-observacao-ao-vivo.md:96-100`, com a prioridade registrada na linha 202 ✓

Correções aplicadas nesta validação:

1. **Lacuna de schema no AC1 antecipada** — o ETL lê `paymentId` e `paymentEndToEndId`, e **não existe campo fim-a-fim** no lotemania. O AC era testável, mas não satisfazível com a lista de tarefas declarada: a tabela de atribuição não é onde esse campo mora. Ficou registrado, com a proibição explícita de "fechar" o AC encurtando a lista de campos.
2. **Aresta LTM-03 ↔ LTM-04 mapeada** — a dependência era declarada só pela emissão do `order.paid`; agora inclui o campo de identificador de pagamento. As duas stories da onda 3 precisam combinar quem cria o campo **antes** de começarem, senão colidem na migração (que o epic já manda serializar).
3. **Nomes dos parâmetros do contrato nomeados** — `page`, `rowsPerPage`, `filters` (string JSON), com arquivo e linha.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-16 | 1.1 | Validada — GO (9/10). Draft → Ready. Lacuna de `paymentEndToEndId` no AC1 registrada, aresta com a LTM-03 mapeada, parâmetros do contrato nomeados. | @po (Pax) |
