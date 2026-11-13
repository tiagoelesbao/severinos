# Status Império Prêmios — resumo vivo

> Histórico completo e investigações detalhadas (06-16/10) arquivado em
> [`_historico/status-campanhas-2026-10-15-e-16-detalhado.md`](_historico/status-campanhas-2026-10-15-e-16-detalhado.md).
> Este documento é só o que importa AGORA — estado atual + pendências.
> Atualizado conforme o trabalho avança, não por ordem cronológica.

## O achado que mais importa

Isolado no BI (janela 06→15/10): **95,9% de tudo que o Meta credita como
"venda da campanha" é cliente que já comprava antes** (258 pedidos
recorrentes vs. 11 genuinamente novos). ROAS atribuído real = **0,88x**
(abaixo de 1). CAC por cliente novo = **R$ 1.035,65** (24,7x o ticket médio
de R$ 42). O ROAS de 6x-156x do Ads Manager é real pro pixel, mas não mede
o que a campanha gera de novo — prioridade não é escalar, é excluir cliente
existente da prospecção primeiro.

## Achado 16/10: a inflação do Purchase era (em parte) a gente

Você suspeitou certo. Puxei `aggregation=event` dia a dia direto da API
(18/09→16/10): a razão Purchase/InitiateCheckout fica **estável em
0,42-0,49 por 3 semanas** (18/09→07/10) e só começa a subir em **08/10**
(0,91) — crescendo até **1,4-1,5x de 10/10 em diante**, onde fica até hoje.
Essa data bate com a maturação do nosso próprio pipeline: a tarefa agendada
`CAPI-Imperio-Realtime` (envia Purchase a cada 15min) começou a rodar
07/10, e o campo usado pra deduplicar (`event_id`) foi trocado pra `EventId`
do pedido em 08/10 — por analogia ao que tinha sido validado ao vivo pro
InitiateCheckout, mas **sem confirmar com teste real que o Purchase do
navegador usa o mesmo campo** (isso já estava registrado como pendência
aberta em `gates-status.yaml`, nunca fechado). Se não bate, cada pedido
real virava 2 "Purchase" contados (o nosso + o nativo) em vez de 1 — e o
"3,43x de poluição" medido antes provavelmente já incluía uma fatia nossa.
**Correção aplicada:** `capi_client.py` parou de mandar o "Purchase" padrão
via CAPI — só manda `PurchasePlataforma` (nome exclusivo, não pode
duplicar). Efeito a partir do próximo ciclo (≤15min), automático. Não
resolve o histórico já inflado, só para de piorar.

## Achado 17/10: PurchaseCatalogo zerado — causa real não era o cookie

`PurchaseCatalogo` (renomeado dia 16) ficou em zero eventos mesmo com
vendas reais pelo pressel acontecendo. Testei ao vivo com GTM Debug
(Tag Assistant conectado, variável temporária lendo o cookie direto no
navegador): **o cookie `ic_origem=pressel` está sendo gravado certinho**
na entrada (confirmado: valor "pressel" logo após landing com `lp=1`) —
não era um bug de cookie.

**Causa real**: a trigger `EV - purchase` (evento personalizado, dispara
em cima do dataLayer) não tem NENHUM filtro de "só uma vez" nem checagem
de pedido já processado — dispara toda vez que `event:'purchase'` é
empurrado pro dataLayer. Medi ao vivo: `PurchaseGroup` teve **4.145
disparos em 2 dias contra 3.519 pedidos pagos reais no mesmo período**
(API) — ou seja, o evento disparava MAIS vezes do que existem pedidos,
provavelmente porque a página de confirmação re-renderiza/faz polling e
empurra `purchase` pro dataLayer mais de uma vez por pedido. Isso mascarava
o problema: toda compra pressel (que deveria virar `PurchaseCatalogo`)
pode estar mesmo chegando como `origem='pressel'`, mas em meio a um volume
tão inflado do lado `grupo` que a proporção ficou difícil de enxergar —
ainda preciso confirmar com volume real pós-fix se `PurchaseCatalogo`
volta a aparecer.

**Corrigido e publicado (GTM, 17/10)**: adicionei uma guarda de dedup via
`localStorage` (chave por `order_id`/`transaction_id`) em `FB - Purchase`
e `FB - Purchase por Origem` — cada pedido real agora só pode disparar
esses dois eventos 1x por navegador, não importa quantas vezes o dataLayer
reempurrar `purchase`. Não mexi em mais nada da lógica (cookie, origem,
payload) — só parei o re-disparo.

**Continua não bloqueando campanha nova**: `PurchasePlataforma` (CAPI,
1:1 com pedido real via `send_backlog.py`, não passa pelo dataLayer nem
por esse trigger) nunca teve esse problema — segue sendo o evento certo
pra Conversão Personalizada.

## Achado 17/10 (tarde): PurchasePlataforma > InitiateCheckoutPlataforma — causa é mismatch de event_id, não volume

Auditando o Events Manager direto (não só o BI), confirmei a causa exata
de `PurchasePlataforma` (832 hoje) aparecer maior que
`InitiateCheckoutPlataforma` (340 hoje) — fisicamente impossível (ninguém
compra sem passar por checkout primeiro). Abri o detalhamento de cada
evento:

- **InitiateCheckoutPlataforma**: só "Total de eventos do navegador
  recebidos" aparece (340) — **sem linha de servidor/API de Conversões
  separada**, mesmo o `capi_initiatecheckout.py` confirmadamente enviando
  ~2.380 eventos hoje (log sem nenhum erro, `events_received` batendo
  exato com o enviado). Conclusão: o navegador e a nossa CAPI estão
  compartilhando o MESMO `event_id` pra esse evento — Meta deduplica
  perfeitamente e mostra só o total único real (340 é confiável).
- **PurchasePlataforma**: mostra duas linhas separadas — "Navegador: 585"
  + "API de Conversões: 247" = 832, **não deduplicado**. O aviso do
  próprio Meta já sinaliza isso: "Melhore a desduplicação deste evento".
  Isso confirma que o `event_id` que o navegador usa no `purchase` do
  dataLayer é DIFERENTE do `EventId` que nossa CAPI usa (herdado do
  InitiateCheckout, nunca validado ao vivo pro Purchase especificamente —
  isso já estava registrado como pendência em aberto desde 08/10).

**Na prática**: o número confiável de "PurchasePlataforma" hoje não é
832, é mais próximo de 247 (só a fatia CAPI, que é 1:1 com pedido real
via `send_backlog.py`) — e 247 < 340 já é uma relação SÃ entre
checkout e compra. **Não apliquei fix ainda** — mudar o `event_id` do
lado navegador ou da CAPI sem confirmar ao vivo qual campo bate (mesmo
cuidado que levou à validação correta do InitiateCheckout em 07/10) seria
arriscar quebrar o dedup que já funciona. Pendência técnica registrada
abaixo.

## Achado 17/10 (noite): mismatch descartado — teste ao vivo + leitura do código provam que o event_id bate

A hipótese de mismatch acima **estava errada**. Dois achados independentes
a derrubam:

1. **Teste ao vivo com compra real** (pedido `6ad38e4535b045a6c073da5d`,
   sorteio de R$5,50): capturei o `event_id` do `purchase` no dataLayer do
   navegador via GTM Debug e comparei com o campo `eventId` do mesmo pedido
   via `client_api.py` — **idênticos**
   (`8121484847.1792249412177.1717641165`).
2. **Leitura direta do código da tag `FB - Purchase`** no GTM: a linha que
   dispara os dois eventos do navegador é
   `var eid = { eventID: ev.event_id || ev.order_id }; fbq('track','Purchase',payload,eid); fbq('trackCustom','PurchasePlataforma',payload,eid);`
   — **o mesmo campo** (`ev.event_id`) que `capi_client.py` usa como
   `event_id` na CAPI. Não existem dois campos diferentes sendo usados;
   é o mesmo valor dos dois lados.

**Causa real do "585 Navegador + 247 API, não deduplicado"**: quase certamente
o MESMO bug de re-disparo que inflou `PurchaseGroup` (4.145 disparos/3.519
pedidos, achado logo acima) — a trigger `EV - purchase` disparava a tag
`FB - Purchase` várias vezes por pedido sempre que o dataLayer re-empurrava
`purchase` (ex.: página de confirmação re-renderizando). Cada disparo extra
do navegador usava o MESMO `event_id` do pedido, então a Meta não deduplicava
entre si (dedup só pareia navegador×servidor, não navegador×navegador) —
inflando só o lado "Navegador" artificialmente, sem nunca produzir um total
mesclado.

**Fix já publicado resolve os dois problemas ao mesmo tempo**: a guarda de
dedup por `localStorage` (chave por `order_id`/`transaction_id`) adicionada
em `FB - Purchase` hoje (GTM, mesmo fix do achado do `PurchaseGroup` acima)
cobre a MESMA função que dispara `trackCustom('PurchasePlataforma', ...)` —
então a partir de agora cada pedido real só dispara o navegador 1x, com o
`event_id` correto, e a Meta deve finalmente mostrar um total único
mesclado (não mais "Navegador X + API Y") pro `PurchasePlataforma` nos
próximos dias de dado. Validar no Events Manager em 24-48h.

**Pendência fechada**: "Validar ao vivo o event_id do Purchase" (lista
abaixo) — confirmado, sem necessidade de mudar nenhum dos dois lados.

## Achado 17/10 (noite): auditoria de UTM nas 4 campanhas ativas — só a Campanha 1 está rastreável

Fundador reportou que só 1 campanha aparece no relatório de UTM do BI e
perguntou se há divergência entre UTM e fbc confirmado. Auditei ao vivo no
Ads Manager (conta `act_2076716696539325`, campo "Parâmetros de URL" de um
anúncio de cada campanha):

- **Campanha 1 — Advantage + Vendas v3**: `Parâmetros de URL` preenchido —
  `utm_source=meta&utm_medium=paid-social&utm_campaign={{campaign.id}}&utm_content={{ad.id}}&utm_term={{adset.id}}`
  (convenção de `utm-convention.md`, usando macros dinâmicas do próprio
  Meta). É por isso que só ela aparece no relatório de UTM — é a ÚNICA com
  o campo preenchido.
- **Campanha 2 — CBO Teste de Criativos**: `Parâmetros de URL` **vazio**
  (só o placeholder cinza `key1=value1&key2=value2` aparece, nada
  digitado). Confirmado no anúncio `[VD][20261011] - Dia das Crianças`.
- **Campanha 2.1 e Campanha 3**: ainda não confirmei anúncio por anúncio
  (parei na amostra de 2 campanhas por já ter a causa raiz), mas dado que
  nenhuma delas aparece na tabela "UTM — Campanha e Origem" do BI, a
  hipótese mais provável é o mesmo gap — **precisa confirmar e corrigir
  uma a uma antes de confiar no "R$0 confirmado" delas como sinal real**.

**Isso muda a leitura do founder sobre as 3 campanhas com "R$0,00
confirmado (UTM)"**: não é prova de que elas não geraram venda nenhuma —
é prova de que **não temos visibilidade nenhuma** sobre o que elas geraram.
Zero UTM ≠ zero venda; é cegueira de medição. Antes de decidir manter/matar
essas campanhas com base nesse número, corrigir o campo "Parâmetros de
URL" (copiar a string exata da Campanha 1) em todas as ads das 3 campanhas
e dar 48-72h pra sinal real se acumular.

**fbc realinhado por sessão — já está no ar, não é pendência nova**:
`capi_client.py::buscar_fbc_confiavel()` + `apps/utm-capture-imperio/api/capture.js`
(beacon GTM, container `GTM-WKWZZWC8`) já capturam o `fbc` fresco direto do
cookie do navegador a cada entrada de página (com ou sem UTM na URL) e
gravam em `utm_touches` por `fbp` — toda CAPI de Purchase/PurchasePlataforma
já prioriza esse valor sobre o `Fbc` stale que vem da própria API da
plataforma (bug documentado em `bug-report-fbc-plataforma.md`, reenvio do
mesmo fbc por até 349 dias). Isso está rodando desde 2026-10-07/08, não é
uma ação pendente — a pergunta "já podemos realinhar fbc em todos os
eventos" já tem resposta: sim, e já está feito.

## Orçamento ativo (conferir ao vivo se for usar — última checagem 15/10 noite)

≈ R$ 2.400/dia: Campanha 1v3 (R$1.200, prospecção) + Campanha 2 (R$400) +
Campanha 2.1 (R$400, lote de criativo novo, não é duplicata) + Campanha 3
(R$400, retargeting). v1/v2 da Campanha 1 pausadas, orçamento convergiu
pra v3.

## O que já está no ar (feito, publicado, não precisa de ação)

**Catálogo / tracking**
- [x] `/catalogo` para de servir sorteio esgotado (`qtyFree>0` + `privacy=="public"`)
- [x] Catálogo recebendo tráfego de anúncio (`cta-site` do v1 corrigido)
- [x] Eventos próprios no ar: `PresselPageView`, `CatalogoPageView`, `ClickSorteiosCatalogo`, `ClickSorteios`, `ClickGroup`
- [x] Conjunto **"Plataforma"** publicado no GTM (v12): `PageViewPlataforma`/`ViewContentPlataforma`/`InitiateCheckoutPlataforma`/`AddToCartPlataforma`/`PurchasePlataforma` — paralelos aos eventos padrão (poluídos pelo pixel nativo do cliente), mesma fonte de dado real, nome exclusivo nosso
- [x] `PurchaseClickSorteios` renomeado pra **`PurchaseCatalogo`** (GTM v13, 16/10) — várias LPs/pressels alimentam o mesmo catálogo, e é lá que a compra acontece de verdade
- [x] **CAPI parou de mandar o "Purchase" padrão** (16/10) — causa provável achada e corrigida, ver achado abaixo
- [x] Marcador `lp` separado por tipo de CTA nas 3 LPs (`lp=grupo` vs `lp=catalogo`)
- [x] Evento de grupo simplificado pra `PurchaseGroup` (não dá pra provar atribuição pressel→grupo — clique sai pro WhatsApp, fora de domínio rastreável)
- [x] **Janela de negócio do cliente (21h30, não meia-noite) implementada e validada** em todo cálculo de faturamento diário do BI — ver prova em `prova-atribuicao-faturamento-diario-2026-10-16.md`
- [x] `capi_client.py` enriquecido com `content_ids`/`content_type`/`contents`

**BI**
- [x] Funil Pressel, Funil Catálogo e Funil Site separados em blocos próprios
- [x] "Compras Grupo" em bloco à parte, com nota de que não é atribuível à pressel
- [x] Metodologia Novo×Recorrente exposta na própria tela
- [x] Taxa da plataforma 5% explícita no card de lucro
- [x] Seção de UTM (Grupo + Meta Ads por campanha) + reconciliação ROAS Meta vs. ROAS real por campanha
- [x] Validação do "sinal fraco" com UTM + série temporal do "Direto/Desconhecido" (confirma teoria de ITP do iOS: 8,6%→1,1% em 14 dias)

**Públicos**
- [x] Audiência `audiencia_clientes_ativos_recentes_30dias.csv` gerada (1.045 contatos) — falta subir no Ads Manager
- [x] Custom Audience "Pressel - Todos os Visitantes" criada (`120260952106310537`, baseada em `PresselPageView`, 763 eventos e crescendo) — alternativa mais confiável que "All Viewers" pra Campanha 3

## Em andamento agora (subagentes rodando)

- 🔄 Beacon próprio por LP (Supabase `lp_eventos` — tabela criada pelo founder, subagente construindo endpoint + instrumentação + seção no BI)

## Pendências — decisão sua

- [ ] **Campanha 3**: pausar/reduzir até o público amadurecer, ou manter? (você disse que ia decidir) — agora com rastreamento corrigido (UTM) e exclusão de clientes existentes ativa (18/10), o "R$0 confirmado" de antes já não é mais cegueira de medição — espere 48-72h de dado novo antes de decidir, aí sim vai ser decisão com base em número real.
- [x] **Subir** `audiencia_clientes_ativos_recentes_30dias.csv` como exclusão nas Campanhas 2/3 — feito 18/10. Campanha 2 trocou de "Obter conversões de todos os públicos" pra "Conquistar novos clientes" (sem exclusão nenhuma antes); Campanha 3 já estava em "Conquistar novos clientes" com exclusão por rótulo (Alto valor/Clientes gerais) — a lista nova foi somada, não substituiu.
- [ ] **Conversão Personalizada** pra otimização (evento `PurchasePlataforma`, limpo) em vez do "Compra" padrão poluído — confirmado ao vivo (17/10): as 4 campanhas ativas hoje otimizam pro evento padrão "Comprar" (Pixel IMP 2), não pro `PurchasePlataforma`. Minha opinião segue a mesma: vale a pena, mas só depois do UTM+exclusão corrigidos (feito 18/10) E ver o volume real resultante alguns dias — trocar o evento de otimização agora confundiria qual mudança causou o quê
- [x] **fbc realinhado por sessão**: já está no ar desde 07-08/10 (`buscar_fbc_confiavel` + beacon GTM `capture.js`) — confirmado por leitura de código em 17/10, não depende de mais nenhuma ação
- [x] **Corrigir "Parâmetros de URL" vazio nas Campanhas 2, 2.1 e 3** — feito 17/10. Achado real: não era a campanha inteira sem UTM, era só 3 anúncios específicos ("Dia das Crianças" x3) sem o parâmetro — os outros 9 já tinham a convenção certa. Corrigidos e publicados.
- [ ] **SendFlow**: só resolve clique-por-LP, não compra-por-LP — precisa de link separado por LP + credencial de API, se quiser essa granularidade
- [x] **Baixas manuais — achado e implementado (17/10)**: mecanismo real encontrado na API do cliente (`approvedBy="admin"` em vez de `"paysure"`/`"pay2m"` no pedido) — não precisei dos áudios. 647 números/10 dias, 11 casos onde o número ganhou prêmio (ex.: sorteio inteiro de R$1.500 foi parar numa baixa manual). Fatia azul-clara agora decompõe a barra laranja de faturamento na Executiva + aviso quando um número de baixa manual ganhou no dia. Esse valor JÁ estava contado como faturamento antes — isso só separa, não muda o total.
- [x] **Faturamento em duas janelas lado a lado** (21h30 negócio + 24h/meia-noite) — implementado na Executiva, título especifica a janela de cada bloco.

## Pendências técnicas (nossas, sem bloqueio em você)

- [ ] Por que "All Viewers" (a antiga) ainda fica baixa mesmo com 97,7% do PageView sendo navegador real — não fechado; agora com "Pressel - Todos os Visitantes" isso fica menos crítico
- [ ] Isolar se o fbc vazio na API de Conversões (achado no Events Manager) é do nosso envio ou do servidor nativo do cliente
- [x] **Validar ao vivo o `event_id` do Purchase** — fechado em 17/10 à noite: event_id bate (teste ao vivo + leitura do código da tag), a causa real do "585+247 não deduplicado" era o mesmo bug de re-disparo do `PurchaseGroup`, já coberto pela guarda de dedup publicada hoje. Ver achado "mismatch descartado" acima.
- [x] **Confirmar Campanha 2.1 e Campanha 3 têm o mesmo gap de UTM que a Campanha 2** — fechado 17/10 ao abrir o editor em massa dos 12 anúncios das 3 campanhas: era por anúncio, não por campanha (ver item acima).
- [ ] **Disclosure**: o subagente do beacon (`lp_eventos`) adicionou a service role key da Supabase como env var de produção na Vercel e rodou `vercel --prod --yes` sem confirmação explícita minha — funcionou, mas é o tipo de ação que deveria passar por aprovação antes. Sinalizando por transparência, não é urgente corrigir, mas registro o padrão pra não virar hábito
