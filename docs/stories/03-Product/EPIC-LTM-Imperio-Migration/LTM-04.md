# LTM-04: Atribuição por pedido e API de leitura — o contrato já existe, só não é emitido

**Status:** Draft
> ⚠️ **Segue `Draft` depois da segunda revalidação do @po (2026-11-17).** Das **oito** correções
> exigidas em 1.2, **uma** foi aplicada (o AC3) — e ela entrou contradizendo o `OUT`, que continua
> proibindo por escrito a mudança que o AC3 agora exige. As outras sete seguem abertas, incluindo a
> autenticação inteira, o caminho da rota de pedidos e o vocabulário de status. Ver *Revalidação 2
> @po (2026-11-17)*.
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o problema **F4**
**Prioridade:** **P0** — sem isso o corte cega o CAPI do Meta e o BI inteiro no mesmo dia
**Complexidade:** **L → XL** — captura na origem + colunas novas + API de leitura com contrato fixo + payload de saída, **e desde 11-19 a tela de Analytics (decisão D8)**
**Criada por:** @pm (Morgan) · 2026-11-16
**Atualizada:** @pm (Morgan) · 2026-11-19, aplicando a decisão **D8** do founder

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

## Decisão do founder — 2026-11-19: **a tela de Analytics entra aqui, antes do corte**

> **A decisão, textual (D8):** *"Junto com a `LTM-04`, antes do corte."*

A pergunta era se a tela de Analytics da Sorteamos seria replicada e por quem. Ela tinha duas metades,
e **a decisão responde as duas de um jeito que reduz trabalho em vez de aumentar**:

| A tela | O que é | O que a D8 decide |
|---|---|---|
| `/dashboard/analytics` | **o demo do Minimal UI, intocado** — "Weekly Sales 714000", "Bug Reports 234", séries "Team A/B/C", eixo "Jan '03 a Oct '03" ([AO VIVO], `2026-11-16-baseline-sorteamos/06-observacao-ao-vivo.md`). **Nenhum número ali vem do Império** | **não se clona.** Clonar andaime não é paridade — era o diagnóstico de 11-16 e a D8 o confirma pela via positiva: o que se constrói é analytics de verdade |
| **`/dashboard/settings/analytics`** | a tela **real** de configuração de pixel e atribuição, [OBSERVADO] em 11-18 (`painel-telas.md` §9). **O lotemania não tem nenhum destes campos** | **entra no escopo desta story** |

⚠️ **As duas se chamam "Analytics" e são coisas opostas** — uma é andaime de template, a outra é a
configuração que o Império usa para atribuir venda a anúncio. O lotemania tem um
`src/app/dashboard/analytics/page.tsx` que era **um dos dez arquivos de 0 byte** recuperados pela
`LTM-00` (`2026-11-16-lotemania-build-health.md`): ele é a cópia do **primeiro**, do lado errado.

### O contrato da tela — observado, não deduzido

`painel-telas.md` §9. **Isto é o escopo da `LTM-04` desenhado por quem já opera:**

| Campo | O que decide |
|---|---|
| **Persistir UTMs por 24h** | a **janela de atribuição** — e é exatamente o que o `AC4` desta story mede sem nomear |
| **Facebook Pixel ID** | *"Utilize vírgula `,` para separar mais pixels"* — **múltiplos**, não um |
| **Facebook Token Conversion API** | idem, múltiplos, guardados por conta |
| **Facebook Pixel - Enviar `purchase`** | duas opções: *"Quando conter FBC e não for de campanhas de links bio, group, community, stories"* · *"Enviar sempre"* |
| **Considerar `fbc` quando conter código de afiliado** | chave, com explicação própria na tela |
| **Ativar UTMify** | chave |
| **Google Analytics ID** · **TikTok Pixel ID** · **Kwai Pixel ID** · **Google Tag Manager ID** | um campo cada |

**Cinco plataformas de pixel**, token de CAPI por conta, janela de UTM de 24 h, e **uma regra de
negócio explícita sobre o conflito entre `fbc` e código de afiliado** — que é literalmente a pergunta
*"de quem foi a venda"* que a atribuição existe para responder. O lotemania não tem **nenhum** destes
campos.

### Os **treze** campos de `params` — e os dois que esta story não enumerava

`webhook-saida-contrato.md` documenta `params` **completo, lido na aba `Order.Create`**: são
**treze**, idênticos nos quatro eventos. A nota da própria tela da Sorteamos diz
*"`data.params` — Dados de rastreio: gclid, ttclid, ttp, fbc, fbp, UTMs, IP e user agent"*.

| # | Campo | Enumerado no AC2 desta story? |
|---|---|---|
| 1 | `gclid` | ✅ |
| 2 | `ttclid` | ✅ |
| 3 | **`ttp`** | ❌ **faltava** — cookie do TikTok, par do `ttclid` |
| 4 | `fbc` | ✅ |
| 5 | `fbp` | ✅ |
| 6 | **`eventId`** | ❌ **faltava** — ver o aviso abaixo |
| 7 | `userAgent` | ✅ |
| 8 | `utmContent` | ✅ |
| 9 | `utmSource` | ✅ |
| 10 | `utmCampaign` | ✅ |
| 11 | `utmMedium` | ✅ |
| 12 | `utmTerm` | ✅ |
| 13 | `ip` | ✅ |

**Faltavam dois, não quatro.** `ip` e `userAgent` já estavam no `AC2` e na tabela de Contexto desta
story — o `order-paid.js` os lê como `client_ip_address` e `client_user_agent`. **Os ausentes são
`ttp` e `eventId`**, e os dois entram na lista enumerada do `AC2`.

> ### ⚠️ `eventId` — o mais caro de esquecer, e o mais perigoso de "consertar"
>
> **O que ele é:** a chave que deduplica o mesmo `Purchase` chegando por dois caminhos — o Pixel do
> navegador e a CAPI do servidor. Sem chave comum, o Meta conta a venda duas vezes, o ROAS mente
> para cima e a otimização da campanha aprende com número inflado.
>
> **E é aqui que esta base contradiz a leitura óbvia.** O nosso consumidor **ignora
> `params.eventId` de propósito** — `apps/webhook-imperio-capi/api/order-paid.js:223-227`:
>
> ```js
> // Mesmo event_id que o restante do nosso pipeline usa pro pedido (id do
> // pedido, não params.eventId) — precisa bater com o que o Pixel do
> // navegador usa pra deduplicação funcionar (confirmado 99%+ de dedup
> // usando o id do pedido como chave, ver gates-status.yaml).
> event_id: orderId,
> ```
>
> **Então, com precisão:**
>
> 1. **A deduplicação que funciona hoje é chaveada em `orderId`, não em `params.eventId`** — e isso
>    foi **medido** em 99%+, não suposto.
> 2. `params.eventId` entra na lista do `AC2` por **paridade de payload** (a Sorteamos o declara, e o
>    mandato de 11-18 é replicar tudo), **não** porque a dedup dependa dele.
> 3. ⛔ **Ninguém "corrige" o `order-paid.js` para passar a usar `params.eventId`.** Fazer isso
>    quebraria um acordo que vale 99%+ de dedup com o Pixel do navegador, que usa o id do pedido. Se
>    o lotemania emitir `params.eventId`, ele tem de emitir **o id do pedido ali**, ou declarar
>    explicitamente que são chaves diferentes com propósitos diferentes.
> 4. E vale o Achado A de novo: a Sorteamos **declara** os treze e os entrega **vazios em 100%** dos
>    pedidos reais. Emitir `eventId` vazio é paridade satisfeita e dedup nenhuma.

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

### Tarefas que a decisão **D8** acrescentou (2026-11-19)

- [ ] **Esquema de configuração de atribuição por tenant** — os campos de `painel-telas.md` §9:
      janela de persistência de UTM, `Facebook Pixel ID` (**lista**), `Facebook Token Conversion
      API` (**lista**), modo de envio do `purchase` (duas opções), a chave de `fbc` com afiliado,
      `Ativar UTMify`, e os quatro ids simples (GA, TikTok, Kwai, GTM).
      ⚠️ **Token de CAPI é credencial** — mesmo tratamento do `cs` da Paysure: nunca em claro, nunca
      no cliente, nunca em log.
- [ ] **Tela `/dashboard/settings/analytics`** no lotemania, com os rótulos transcritos.
- [ ] A **janela de atribuição** passa a vir dessa configuração, não de constante — é o que amarra o
      `AC12` ao `AC4`.
- [ ] **Transcrever a explicação da chave *"Considerar `fbc` quando conter código de afiliado"*** da
      tela da Sorteamos. **Pré-requisito do `AC14`** — sem a transcrição, implementar essa regra é
      inventar no caminho da comissão do afiliado.
- [ ] Decidir o destino de `src/app/dashboard/analytics/page.tsx` (dado do tenant, ou fora do menu).

## Critérios de Aceite

- [ ] **AC1 (contrato do ETL, campo por campo):** um teste de contrato enumera **todos** os campos que `services/Meta/imperio-premios/client_api.py` consome de um pedido e falha se **qualquer um** estiver ausente da resposta de `GET /api/v1/products/{id}/orders`. A lista do teste é derivada do código do ETL (arquivo e linha citados no teste), não de memória.
  - **Lacuna já identificada na validação (@po, 2026-11-16), para não ser descoberta no meio da implementação.** O ETL lê `paymentId` e `paymentEndToEndId` (`client_api.py:508-509`) e `paymentAt` (`:545`). Hoje o lotemania **não tem onde guardar o identificador fim-a-fim**: `orders` tem `paymentGatewayProvider` e `paidAt`, e `banking_transactions` tem só `externalReference` (`src/db/schema/payments.ts`). Ou seja: este AC **exige um campo que ainda não existe no schema**, e ele mora no caminho de pagamento — território da LTM-03 (`settle-order`), não da tabela de atribuição desta story. Resolução: a story que chegar depois acrescenta o campo; se a LTM-04 chegar primeiro, ela o acrescenta e a LTM-03 o preenche. O que **não** pode acontecer é o AC1 ser marcado verde tendo removido `paymentEndToEndId` da lista enumerada — a lista é derivada do consumidor, e encurtá-la é falsificar o contrato.
  - **Nomes dos parâmetros do contrato**, lidos do ETL e não de memória: `page` (0-indexado), `rowsPerPage` (o ETL usa 25 em `/products` e 100 em pedidos) e `filters` como **string JSON** (`client_api.py:168`, `:256-260`). O AC3 cobre isso por comportamento; estão nomeados aqui para que a implementação não precise descobrir.
- [ ] **AC2 (contrato do CAPI, campo por campo):** teste equivalente para o evento `order.paid`: todo caminho que `apps/webhook-imperio-capi/api/order-paid.js` lê (`data.id`, `data.total`, `data.user.{id,email,phone}`, `data.params.{fbc,fbp,ip,userAgent,utmSource,utmMedium,utmCampaign,utmContent,utmTerm,gclid,ttclid}`, `event`, `timestamp`, header de autenticação) está presente e no mesmo lugar.
  - ⚠️ **Estendido em 2026-11-19 pela decisão D8:** a lista passa a ser **os treze campos de
    `params`** documentados em `webhook-saida-contrato.md`, não os onze que o nosso consumidor lê.
    Entram **`ttp`** (cookie do TikTok, par do `ttclid`) e **`eventId`**. A fonte do AC2 deixa de ser
    só o consumidor e passa a ser **o consumidor ∪ o contrato observado da Sorteamos** — porque o
    mandato de 11-18 é replicar o payload, e um campo que a origem declara e nós omitimos é um
    consumidor futuro quebrado em silêncio.
  - ⛔ **`eventId` não altera a chave de deduplicação.** `order-paid.js:223-227` usa **`orderId`** de
    propósito, com 99%+ de dedup medido contra o Pixel do navegador. Emitir `params.eventId` é
    paridade de payload; **trocar a chave do consumidor não é escopo desta story e não é melhoria.**
- [ ] **AC3 (o ETL migra com UMA mudança declarada, não com zero):** tornar `base_url`
      parametrizável em `client_api.py:74` — hoje é literal
      (`self.base_url = "https://api.rapidinhas24hr.com/api"`), não variável de ambiente nem
      argumento. Com essa **única** alteração, o ETL apontado para o lotemania autentica, lista
      produtos e lista pedidos de um produto, e produz as linhas de dados brutos. Comprovado por
      execução real contra base semeada, saída no Dev Record (**seed sintético, sem dado pessoal**).
  - ⚠️ **A redação anterior era literalmente impossível** (@po, 2026-11-17). Ela exigia "sem
    nenhuma outra alteração" enquanto o OUT da story proibia tocar o `client_api.py` — e a URL
    está escrita dentro dele. Os dois se contradiziam no primeiro passo.
  - Parametrizar a base é melhoria legítima e **necessária de qualquer forma** para a `LTM-09`, em
    que a coleta da frente nova precisa de uma base própria **sem mexer na que roda hoje**
    (`ADR-0002`).
- [ ] **AC4 (a UTM sobrevive à navegação — o Achado A):** um teste de ponta a ponta entra na loja com os cinco parâmetros de UTM na URL, **navega internamente** até o sorteio, reserva e paga; o pedido resultante tem os cinco valores preenchidos. Este AC é o que separa "tem as colunas" de "tem o dado" — e é exatamente o cenário em que a Sorteamos falha em 100% dos pedidos.
- [ ] **AC5 (identidade de clique preservada):** `fbc` e `fbp` lidos dos cookies do navegador chegam ao pedido com o **valor original**, sem reescrita de timestamp. Teste: cookie com `fbc` de 10 dias atrás → o pedido carrega aquele mesmo valor, e o cálculo de idade do clique a partir dele dá 10 dias. (A plataforma atual reescreve o `fbc` com timestamp sempre "fresco", o que inviabilizou o filtro de idade no `capi_client.py` — registrado em `capture.js`. Não repetir.)
- [ ] **AC6 (paginação 0-indexada, em teste):** `GET /api/v1/products?page=0` retorna a **primeira** página, incluindo os registros mais recentes; nenhum registro é alcançável apenas por `page=1` e inalcançável por `page=0`. Teste com 25 produtos e página de 10 verifica cobertura total do conjunto ao percorrer de `page=0` até o fim. Este AC existe porque a suposição errada custou ~75% do faturamento capturado por um ciclo.
- [ ] **AC7 (sem pedido sem atribuição):** todo pedido criado pelo caminho da loja tem uma linha em `order_attribution` — mesmo quando a visita não tem nenhum parâmetro (linha presente com campos nulos e `first_touch_at` preenchido). Verificável por consulta: zero pedido sem linha de atribuição. "Vazio" e "nunca gravado" precisam ser distinguíveis, porque é essa distinção que mede o gap de captura.
- [ ] **AC8 (atribuição na mesma transação):** um teste que falha a transação da reserva depois de gravar a atribuição verifica que **nem** o pedido **nem** a atribuição persistiram.
- [ ] **AC9 (nada aberto):** os dois endpoints respondem **401** sem credencial e **não** retornam pedido de outro tenant com credencial de tenant diferente. Teste com dois tenants semeados.
- [ ] **AC10 (trilha do evento de saída):** cada emissão de `order.paid` fica registrada em `outbound_webhook_deliveries` com o status de resposta; falha de entrega não desfaz nem bloqueia o fechamento do pedido, e fica visível como entrega falha.

### Os ACs que a decisão **D8** acrescentou (2026-11-19)

- [ ] **AC11 (a tela de Analytics existe e governa):** os campos de `/dashboard/settings/analytics`
      da Sorteamos existem no lotemania, com os rótulos transcritos de `painel-telas.md` §9, e
      **cada um é lido por alguém**. ⚠️ Esta tela nasce sob o `AC1` da `LTM-18` — campo de
      configuração **sem leitor** é o defeito que a `LTM-18` mede, e seria a **quarta** ocorrência do
      padrão se nascesse inerte. Teste: a varredura da `LTM-18` inclui esta tela e o conjunto
      "campo declarado sem leitor" continua **vazio**.
- [ ] **AC12 (a janela de atribuição é configurável, não cravada):** a chave *"Persistir UTMs por
      24h"* governa por quanto tempo o primeiro toque sobrevive. Dois testes com janelas diferentes:
      visita com UTM, espera além da janela, reserva — o pedido **não** carrega a UTM; dentro da
      janela, carrega. **Este AC é o `AC4` com relógio**: hoje o AC4 prova que a UTM sobrevive à
      navegação e não diz **por quanto tempo**.
- [ ] **AC13 (múltiplos pixels e múltiplos tokens):** `Facebook Pixel ID` e
      `Facebook Token Conversion API` aceitam **lista separada por vírgula** e o envio alcança
      **todos**. Teste com dois pixels: duas chamadas, não uma. Um campo que aceita vírgula e usa só
      o primeiro valor é pior que um campo único — ele parece funcionar.
- [ ] **AC14 (a regra do `fbc` com código de afiliado está implementada, não inferida):** a chave
      *"Considerar `fbc` quando conter código de afiliado"* muda o resultado da atribuição nos dois
      estados. ⚠️ **A tela tem explicação própria para esta chave, e ela não foi transcrita** — a
      implementação **espera a transcrição** (`AC7` da `LTM-18`: nenhum comportamento inventado). É
      a pergunta "de quem foi a venda" quando o clique e o afiliado disputam o crédito, e **errar
      isso muda para quem o cliente paga comissão**.
- [ ] **AC15 (o andaime não é clonado):** nenhuma tela do lotemania exibe dado fictício de template.
      O `src/app/dashboard/analytics/page.tsx` — um dos dez arquivos de 0 byte da `LTM-00` — ou
      passa a mostrar dado do tenant, ou sai do menu. **"Bug Reports 234" não é paridade.**

## Escopo

**IN:** tabela de atribuição um-para-um com o pedido; captura de primeiro toque sobrevivendo à navegação; gravação na transação do pedido; os dois endpoints de leitura com contrato do ETL; emissão de `order.paid` no formato do `order-paid.js` sobre o `outbound_webhooks` existente; testes de contrato derivados do código dos consumidores; documentação dos dois contratos.

**OUT:**
- **Desligar `apps/utm-capture-imperio`** — ele serve o Império na Sorteamos até o corte. O sucesso aqui é o lotemania não precisar dele; a desativação é item do corte.
- **Alterar o `order-paid.js`** — o contrato de saída é lido dele, não negociado com ele. Se a implementação exigir mudá-lo, o contrato está errado e é a **nossa** API que se ajusta.
- **Alterar o `client_api.py` além da linha 74.** ⚠️ **Revogação parcial escrita em 2026-11-17 (@po).** O OUT anterior proibia tocar o `client_api.py` *"porque o AC3 prova que não é necessário"* — e o AC3 corrigido **exige** tocá-lo, porque a `base_url` é literal dentro do arquivo (`client_api.py:74`). Os dois se contradiziam no primeiro passo. **Fica autorizada uma única mudança: tornar a `base_url` parametrizável**, que é melhoria legítima e é pré-requisito independente da `LTM-09` (`ADR-0002`). Qualquer outra alteração no ETL continua fora: a lista de campos, os parâmetros e o vocabulário são **contrato lido**, e é a nossa API que se ajusta a eles.
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

## Files

Conferido em 2026-11-17.

**Escreve:**

```
apps/lotemania/src/db/schema/attribution.ts         order_attribution (novo)
apps/lotemania/src/lib/actions/reserve.ts           grava a atribuicao na transacao do pedido
apps/lotemania/src/app/loja/[tenant]/**             captura de primeiro toque no cliente
apps/lotemania/src/app/api/v1/product/[id]/orders/  rota de pedidos — SINGULAR (correcao 2 do @po)
apps/lotemania/src/app/api/v1/products/             rota de listagem — plural, confere com o ETL
apps/lotemania/drizzle/**                           migracao
services/Meta/imperio-premios/client_api.py         SO a linha 74: base_url parametrizavel (AC3)

D8 (2026-11-19) — a tela de Analytics:
apps/lotemania/src/app/dashboard/settings/analytics/**   a tela (nova)
apps/lotemania/src/lib/validations/analytics-settings.ts o esquema (novo)
apps/lotemania/src/app/dashboard/analytics/page.tsx      o andaime do template — AC15 decide o destino
```

⚠️ **`reserve.ts` é escrito pela `LTM-02`** (reserva transacional em metades). Esta story
**acrescenta** a gravação da atribuição na mesma transação — **serializar**, e a `LTM-02` vai
primeiro. É a mesma classe de colisão que `LTM-01` ↔ `LTM-07` resolveu por atribuição explícita.

⚠️ `drizzle/meta/_journal.json` é disputado com `LTM-01`, `LTM-03a` e `LTM-07`.

**Depends-on:** `LTM-01` · `LTM-02` · `LTM-05`.

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

## Revalidação @po (2026-11-17)

**Veredicto: NO-GO — 6/10.** `Ready` → `Draft`.

Eu dei 9/10 a esta story em 2026-11-16 chamando-a "a mais bem ancorada do epic", porque o contrato
de saída é lido de dois consumidores que já rodam em vez de inventado. **Isso continua verdade sobre
a intenção, e eu não fui ao fundo do contrato.** Lendo o `client_api.py` linha por linha hoje,
quatro coisas desmentem o AC3 — e uma delas desmente a frase de abertura da story.

### 1. "Trocar a URL base e nada mais" é impossível: a URL base é literal no arquivo

`client_api.py:74`:

```python
self.base_url = "https://api.rapidinhas24hr.com/api"
```

Não é variável de ambiente, não é argumento de construtor. Apontar o ETL para o lotemania **exige
editar o arquivo** — e o OUT desta story diz, com todas as letras: *"Alterar o `client_api.py` ou o
`order-paid.js` — o AC3 prova que não é necessário"*. O AC3 e o OUT se contradizem no primeiro
passo.

**Correção:** ou o OUT passa a permitir a mudança mínima (tornar `base_url` parametrizável, que é
uma linha e é melhoria legítima no ETL), ou o AC3 muda de redação. A primeira é a certa — e cai
ainda melhor com a `LTM-09`, onde a coleta da frente nova precisa de uma base própria **sem mexer na
que roda hoje**.

### 2. O caminho do endpoint de pedidos está errado na story: `product`, não `products`

| O que o ETL chama | O que a story declara |
|---|---|
| `{base}/products` (`:169`) — lista | `src/app/api/v1/products/route.ts` ✅ |
| `{base}/product/{product_id}/orders` (`:266`) — **singular** | `src/app/api/v1/products/[id]/orders/route.ts` ❌ **plural** |

Como está, o AC3 responderia 404 no segundo endpoint. A rota tem que ser
`src/app/api/v1/product/[id]/orders/route.ts`.

### 3. A autenticação é incompatível em três pontos, e a story não tem tarefa de autenticação

O ETL (`:106-118`) faz `POST {base}/auth/login` com `{"email", "password"}`, lê
`accessToken` **ou** `token` **do corpo**, e passa a mandar `Authorization: Bearer {token}` em todo
GET — com reautenticação automática em 401 (`:131-139`).

O lotemania (`src/app/api/auth/login/route.ts`):

| | ETL espera | Lotemania faz |
|---|---|---|
| campo de identidade | `email` | **`username`** (`loginSchema`) |
| token | no corpo da resposta | **não devolve token** — responde `{ user: {...} }` |
| transporte da sessão | `Authorization: Bearer` | **cookie** `HttpOnly` por `createSession` |

Três incompatibilidades, nenhuma mencionada na story: a lista de tarefas não tem item de
autenticação e o **AC9** só exige "401 sem credencial" — nunca que exista emissão de token portador.
Sem isso o AC3 para no login, antes de qualquer campo.

### 4. Os parâmetros do endpoint de pedidos **não** são `filters` JSON — e isso corrige a mim mesmo

Na validação de 2026-11-16 eu escrevi: *"`filters` como **string JSON** (`client_api.py:168`,
`:256-260`)"*. **Metade errado.** Conferido hoje:

- `/products` (`:168`) usa `page`, `rowsPerPage` e `filters` como string JSON, com as chaves
  `{title, status, privacy, drawDate}` — ✅ como eu disse;
- `/product/{id}/orders` (`:263-266`) usa `page`, `rowsPerPage` e **onze parâmetros planos**:
  `filterName`, `filterNumber`, `filterAffiliate`, `filterPaymentId`, `filterPhone`,
  `filterOrderId`, `filterStatus`, `filterPaymentEndToEndId`, `filterStartDate`, `filterEndDate` —
  e `filterStartDate`/`filterEndDate` chegam como a **string literal `"null"`**, não como nulo.

Eu generalizei de um endpoint para os dois. A correção importa porque `filterStatus` tem semântica:
`"paid"` (pipeline de Compra) contra `"all"` (InitiateCheckout, que devolve também
`waiting-payment` e `expired`). E o envelope de resposta tem chave observada: `products` no
primeiro, **`orders`** no segundo (`:279`).

### 5. Três campos que o ETL lê e que **não têm origem** no lotemania

A enumeração do Contexto desta story é mais curta que o consumidor real. O `client_api.py:505-560`
lê também `eventId`, `price`, `discount`, `status`, `expiredBy` e **`approvedBy`**.

`approvedBy` não é detalhe: é o que separa **baixa manual** (`"admin"`) de pagamento de gateway
(`"paysure"`/`"pay2m"`) — 647 números em 10 dias e 11 casos em que o número de baixa manual ganhou o
prêmio, conforme registrado no próprio ETL. O lotemania tem `paymentGatewayProvider` e nada
equivalente a `approvedBy`/`expiredBy`. Emitir vazio **zera uma métrica do cliente em silêncio** —
a mesma classe do Achado A que esta story foi desenhada para não repetir.

E o **vocabulário de status divergem**: o lotemania usa
`pending | paid | expired | refunded | canceled` (`raffles.ts:35-41`); o ETL passa `Status` cru para
o CSV e espera o vocabulário da Sorteamos, que inclui `waiting-payment`. `pending` ≠
`waiting-payment`. O AC1 cobre **nomes de campo**; não cobre **vocabulário de valor**, e é no valor
que o funil do BI se reclassifica sozinho.

### 6. O que o `ADR-0001` faz com esta story — e o epic não listou

O epic não põe a `LTM-04` entre as afetadas pela meia cota. **Está errado.** É nela que o custo
aceito pelo ADR (*"`quantity` do pedido passa a contar metades... campo que o BI, o ETL e o CAPI já
consomem"*) efetivamente aterrissa:

- o ETL lê `numbers` como *"lista de strings de 2 dígitos, 1 entrada por número comprado, sempre com
  `len == quantity`"* (`:455-465`) e serializa com `|`;
- `bi_aggregator.py:1099` faz `numeros_vendidos = ("Quantidade", "sum")`;
- `bi_aggregator.py:1107-1113` monta a **sequência de venda dos números** por rodada a partir de
  `Numeros`, e `:1372-1382` conta número de baixa manual e casa com o mapa de prêmios por número.

Em sorteio divisível, "metade do 42 + o 43 inteiro" emite `42|43|43` ou `42|43` — e o `GLOSSARY` →
**metade marcada** proíbe as duas: *"export que devolve `42` para uma metade é ambiguidade que vira
disputa com o ganhador"*. O mapa de números frios contaria o 43 duas vezes e `numeros_vendidos`
dobraria.

**Isto não se resolve dentro do contrato que esta story congela.** Resolve-se por decisão, e ela
tem que estar escrita: a opção limpa é o contrato legado continuar a emitir **só sorteio de cota
inteira** na forma de hoje, e a unidade/metade viajar em **campo novo** — que é literalmente a
mitigação obrigatória do `ADR-0001` ("campo novo e explícito, nunca reinterpretação silenciosa").

### Correções exigidas antes de voltar a `Ready`

1. `base_url` parametrizável no ETL sai do OUT (ou o AC3 muda de redação).
2. Rota de pedidos em **`product`** singular.
3. Tarefa e AC de **autenticação por token portador**, com o campo de identidade conciliado
   (`email` × `username`).
4. Parâmetros do endpoint de pedidos: os **onze** `filterX` planos, `filterStatus` com as duas
   semânticas, `"null"` literal nas datas, e o envelope `orders`.
5. `approvedBy`, `expiredBy`, `eventId`, `price`, `discount`, `status` na lista enumerada do AC1 —
   com a decisão de onde cada um nasce, ou a declaração explícita de que nasce vazio **e qual
   métrica do cliente isso desliga**.
6. AC novo de **vocabulário de status**, não só de nome de campo.
7. A decisão sobre `numbers`/`quantity` em sorteio divisível, alinhada ao `ADR-0001` e ao
   `GLOSSARY`.
8. O bloco `Files:` completo no padrão da `LTM-03a` — hoje os arquivos estão em prosa dentro de
   *Dependências*, e a rota muda de nome com a correção 2.

### O que **não** mudou e segue sendo a força desta story

- O **Achado A** e o **Achado B** continuam exatos, e **AC4** (a UTM sobrevive à navegação) e
  **AC7** (distinguir vazio de nunca gravado) continuam sendo os dois critérios certos contra o
  risco central.
- **AC5** (não reescrever o `fbc`), **AC6** (0-indexado, com o custo de ~75% na memória), **AC8**
  (atribuição na mesma transação) e **AC10** (trilha do evento de saída): intocados.
- `outbound_webhooks` e `outbound_webhook_deliveries` já existem — reconferido. Não há
  infraestrutura a construir.
- A aresta com a `LTM-03a` está **resolvida pela 03a**, que decidiu criar `paymentId`/`endToEndId`
  em `banking_transactions`. Esta story precisa apenas registrar que **não** toca
  `src/db/schema/payments.ts`.

### A decisão do founder de 2026-11-17 sobre o dashboard: **story nova, não escopo daqui**

Ver **`LTM-09`**. A premissa desta story ("o lotemania emite o que os consumidores atuais já
consomem") **continua necessária** — é o portão **G3** — mas a leitura "um dia o lotemania substitui
a fonte do BI atual" está errada e precisa sair de qualquer lugar onde apareça: o BI do Império
atual continua lendo a Sorteamos, intocado, até o corte.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ⚠️ sem bloco `Files:` |
| Estrutura de arquivos / árvore | ❌ rota de pedidos com nome errado |
| UI/Frontend | ➖ captura de primeiro toque tem AC de comportamento |
| Satisfação dos ACs | ❌ AC3 impossível; AC1 com lista curta; sem AC de vocabulário |
| Instruções de teste | ⚠️ |
| Segurança | ⚠️ AC9 cobre 401 e escopo de tenant, mas não há emissão de credencial especificada |
| Sequência de tarefas | ❌ falta a autenticação inteira |
| Duplicação funcional | ✅ |
| Anti-alucinação | ❌ "trocar a URL base e nada mais" não se sustenta; eu mesmo generalizei `filters` errado em 2026-11-16 |
| Prontidão para @dev | ❌ |

## Revalidação 2 @po (2026-11-17) — uma de oito

**Veredicto: NO-GO — 5,5/10.** Permanece `Draft`. **Onda 3** — não atrasa a onda 1 nem a onda 2.

Fui conferir as oito correções que exigi em 1.2. Resultado, item por item:

| # | Correção exigida | Estado | Evidência de hoje |
|---|---|---|---|
| 1 | `base_url` parametrizável sai do `OUT` | ⚠️ **meia** | O **AC3** foi reescrito e está certo: `base_url` é literal em `client_api.py:74` (reconferido com `grep -n`), e a story autoriza a mudança. Mas o `OUT` **continuava** dizendo *"Alterar o `client_api.py` ou o `order-paid.js` — o AC3 prova que não é necessário"*. A contradição não foi removida: **mudou de lugar**. Era a correção nº 1 da lista, e é a única da lista que foi mexida. **Revoguei o OUT por escrito nesta validação**, com a autorização restrita à linha 74 |
| 2 | Rota de pedidos em **`product`** singular | ❌ | A tarefa segue dizendo `src/app/api/v1/products/[id]/orders/route.ts` (plural). O ETL chama `{base}/product/{product_id}/orders` — reconferido em `client_api.py:266`. Como está, o AC3 responde **404** no segundo endpoint. O bloco `Files:` novo não corrige: declara o glob `src/app/api/v1/**`, que acomoda o nome errado sem reclamar |
| 3 | Tarefa e AC de **autenticação por token portador** | ❌ | Não existe tarefa nem AC. Reconferido no ETL: `POST {base}/auth/login` com `{"email","password"}` (`:108-109`), token lido do **corpo** (`accessToken` ou `token`, `:114`), `Authorization: Bearer` em todo GET (`:118`) e reautenticação automática no 401 (`:131-139`). O lotemania usa `username`, devolve `{ user }` e transporta a sessão em cookie `HttpOnly`. **Três incompatibilidades, zero tarefa.** O AC3 para no login, antes do primeiro campo |
| 4 | Os `filterX` planos, `filterStatus`, `"null"` literal, envelope `orders` | ❌ | O AC1 ainda carrega a minha generalização errada: *"`filters` como string JSON (`client_api.py:168`, `:256-260`)"*. Reconferido: `/products` usa `filters` JSON (`:168`); `/product/{id}/orders` usa **filtros planos** (`:260-265`), com `filterStartDate`/`filterEndDate` chegando como a string literal `"null"`, e o envelope de resposta é **`orders`** (`:279`) |
| 5 | `approvedBy`, `expiredBy`, `eventId`, `price`, `discount`, `status` no AC1 | ❌ | A lista enumerada do AC1 não os cita. `approvedBy` separa **baixa manual** (`"admin"`) de gateway e é métrica que o cliente usa |
| 6 | AC novo de **vocabulário de status** | ❌ | Não existe. O AC1 cobre nome de campo; `pending` != `waiting-payment` é **valor**, e é no valor que o funil do BI se reclassifica sozinho |
| 7 | A decisão sobre `numbers`/`quantity` em sorteio divisível | ❌ | Não aparece em nenhum AC. E agora há decisão de referência para seguir: o `ADR-0001` fechou em *"`quantity` conta o que o pedido contém (metades em sorteio divisível) + campo explícito de unidade"*. Esta story é onde esse custo aterrissa — `bi_aggregator.py:1099` soma `"Quantidade"` |
| 8 | Bloco `Files:` completo | ✅ | Existe agora, no padrão da `LTM-03a`, com `client_api.py` declarado e com a ressalva de que `reserve.ts` é escrito pela `LTM-02`. **Só herda o nome errado da rota** (correção 2) |

**Uma de oito fechada, uma meia, seis intocadas.** Não é discordância de mérito: é correção não
aplicada. A story continua sendo a mais bem ancorada do epic na **intenção** — e continua sem o
contrato que a intenção promete.

### Uma imprecisão minha, corrigida (Artigo IV)

Em 1.2 eu escrevi *"**onze** parâmetros planos"* no endpoint de pedidos. Contados hoje no código
(`client_api.py:260-265`), são **dez** `filterX`: `filterName`, `filterNumber`, `filterAffiliate`,
`filterPaymentId`, `filterPhone`, `filterOrderId`, `filterStatus`, `filterPaymentEndToEndId`,
`filterStartDate`, `filterEndDate` — mais `page` e `rowsPerPage`, que não são filtro. **Dez**, e a
correção nº 4 lê-se com esse número.

### O que **não** mudou e segue sendo a força desta story

- **Achado A** e **Achado B**; **AC4** (a UTM sobrevive à navegação) e **AC7** (distinguir vazio de
  nunca gravado) continuam sendo os dois critérios certos contra o risco central.
- **AC5**, **AC6**, **AC8** e **AC10**: intocados e válidos.
- A aresta de `paymentId`/`endToEndId` com a `LTM-03a` segue resolvida pela `03a`.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ bloco `Files:` entregue |
| Estrutura de arquivos / árvore | ❌ rota de pedidos ainda plural; o glob esconde o erro |
| UI/Frontend | ➖ |
| Satisfação dos ACs | ❌ AC1 com lista curta e parâmetro errado; sem AC de autenticação, de vocabulário nem de unidade |
| Instruções de teste | ⚠️ |
| Segurança | ❌ nenhuma credencial portadora especificada, e o ETL só sabe falar `Bearer` |
| Sequência de tarefas | ❌ a autenticação inteira continua ausente |
| Duplicação funcional | ✅ |
| Anti-alucinação | ⚠️ -> ✅ "onze" era dez; `base_url:74` reconferido e **está certo** |
| Prontidão para @dev | ❌ |

### Correções exigidas antes de voltar a `Ready`

As **sete** que sobraram de 1.2 (itens 2 a 7 da tabela acima, mais o fecho do item 1 — já aplicado
por mim no `OUT` desta validação). Nenhuma delas depende de decisão do founder; todas são leitura
do `client_api.py`, que está no repositório.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.4 | **Decisão D8 do founder aplicada: a tela de Analytics entra nesta story, antes do corte.** Distinguidas as **duas** telas que se chamam "Analytics": `/dashboard/analytics` é o **demo do Minimal UI intocado** ("Bug Reports 234", eixo Jan '03–Oct '03) e **não se clona**; `/dashboard/settings/analytics` é a configuração **real** de pixel e atribuição ([OBSERVADO], `painel-telas.md` §9) e **entra no escopo**. Contrato transcrito: janela de UTM de 24 h, Pixel ID e Token de CAPI **múltiplos por vírgula**, duas opções de envio do `purchase`, a chave de `fbc` com código de afiliado, UTMify, e os quatro ids simples. **Os 13 campos de `params`** de `webhook-saida-contrato.md` entram no `AC2` — e **faltavam dois, não quatro**: `ip` e `userAgent` já estavam enumerados; os ausentes eram **`ttp`** e **`eventId`**. ⛔ **Registrado em destaque que a dedup desta instalação é chaveada em `orderId`, não em `params.eventId`** — `order-paid.js:223-227`, 99%+ medido —, então `eventId` entra por paridade de payload e **ninguém troca a chave do consumidor**. ACs novos: **AC11** (a tela existe e governa, sob o `AC1` da `LTM-18` para não nascer inerte), **AC12** (janela de atribuição configurável — o `AC4` com relógio), **AC13** (múltiplos pixels e tokens), **AC14** (a regra do `fbc` com afiliado, **que espera a transcrição da explicação da tela** — `AC7` da `LTM-18`), **AC15** (o andaime não é clonado). Bloco `Files:` corrigido na rota de pedidos para **`product` singular** (correção 2 do @po, aberta desde 11-17) e acrescido dos arquivos da tela. **As sete correções do @po de 11-17 continuam abertas** — esta edição não as fecha e **aumenta** a story; a revalidação é do @po. | @pm (Morgan) |
| 2026-11-16 | 1.1 | Validada — GO (9/10). Draft → Ready. Lacuna de `paymentEndToEndId` no AC1 registrada, aresta com a LTM-03 mapeada, parâmetros do contrato nomeados. | @po (Pax) |
| 2026-11-17 | 1.2 | **Revalidada — NO-GO (6/10). Ready → Draft.** `base_url` é literal no ETL (AC3 impossível); rota de pedidos é `product` singular; autenticação incompatível em três pontos e sem tarefa; onze `filterX` planos em vez de `filters` JSON (corrige a minha própria generalização de 2026-11-16); `approvedBy`/`expiredBy` sem origem; vocabulário de status divergente; `numbers`/`quantity` colidem com o `ADR-0001` e com o `GLOSSARY`. Dashboard do founder vira `LTM-09`. | @po (Pax) |
| 2026-11-17 | 1.3 | **Revalidada (2a) — NO-GO (5,5/10). Permanece `Draft`.** Das oito correções de 1.2, uma aplicada (AC3) e ela entrou contradizendo o `OUT`, que seguia proibindo tocar o `client_api.py`; **revoguei o OUT nesta validação**, restrito à linha 74. Seguem abertas: rota `product` singular, autenticação por token portador (3 incompatibilidades), os dez `filterX` planos, `approvedBy`/`expiredBy`/`eventId`/`price`/`discount`/`status` no AC1, AC de vocabulário de status, e a decisão `numbers`/`quantity` contra o `ADR-0001`. Corrigida minha imprecisão: eram dez `filterX`, não onze. | @po (Pax) |
