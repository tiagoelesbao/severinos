# Status das campanhas + próximos passos — 2026-10-15

Consulta ao vivo via Graph API (campanhas, ad sets, públicos) + BI do Império
(`data-executiva.json`/`data-operacional.json`/`data-qualidade.json`,
atualizados hoje 16:06) + 2 correções de código já aplicadas nesta sessão.

## 1. O que já foi corrigido (sem necessidade de aprovação — reversível/correção de bug)

- **Catálogo (`/catalogo`) parou de servir sorteio esgotado.** Causa raiz: o
  filtro só checava `status == "active"`, mas `status` do cliente não reflete
  "tem número à venda" — achei ao vivo um sorteio com `drawDate` já vencido
  ainda em `active`. Corrigido em `snapshot_sorteios.py` pra exigir também
  `numbersConfig.qtyFree > 0` (números livres) e `privacy == "public"` (achei
  de brinde um sorteio privado/interno que também aparecia). Snapshot já
  regravado no Supabase — catálogo no ar com a lista certa agora.
- **Audiência de exclusão "Clientes Ativos Recentes" gerada** (bloqueio B4 do
  `setup-guide-campanhas-r2k-2026-10-09.md`): `audiencia_clientes_ativos_recentes_30dias.csv`,
  **1.045 contatos**, pedidos pagos nos últimos 30 dias (mesma base da
  `audiencia_recompra`, sem o filtro de ≥2 compras). Copiadcontinuo para
  `audiences/` no squad. **Falta**: subir no Ads Manager como Custom Audience
  e aplicar como exclusão nos conjuntos das Campanhas 2 e 3 (ação manual na
  conta, ou eu subo se você confirmar acesso de API de Custom Audiences).

## 2. Quadro ao vivo das campanhas (Graph API, agora)


| Campanha | Status | Orçamento/dia | Criada em |
|---|---|---|---|
| Campanha 1 v3 (Prospecção) | ATIVA | R$ 1.200 | 09/10 |
| Campanha 1 v2 (Prospecção) | **pausada** | R$ 700 | 08/10 |
| Campanha 1 (Prospecção, original) | **pausada** | R$ 700 | 06/10 |
| Campanha 2 — CBO Teste de Criativos | ATIVA | R$ 400 | 11/10 |
| **Campanha 2.1 — CBO Teste de Criativos** | ATIVA | R$ 400 | **15/10 (hoje)** |
| Campanha 3 — Retargeting (Site) | ATIVA | R$ 400 | 13/10 |
| Engajamento (recomendações automáticas) | pausada | R$ 45 | 06/10 |

**Orçamento ativo comprometido hoje: ≈ R$ 2.400/dia** (v1 e v2 da Campanha 1
foram pausadas e o orçamento convergiu pra v3 — por isso "um pouco maior":
não foi uma decisão explícita de subir, foi a soma de testes paralelos ainda
rodando ao mesmo tempo).

**Campanha 2.1 não é duplicata.** Conferi os anúncios dentro de cada uma:
Campanha 2 roda a leva antiga (`[VD][20261011] Dia das Crianças` + `Copys
Carro`); Campanha 2.1 roda 4 Reels **criados hoje** (`Moça das Flores`,
`Vendedora de Café`, `Vendedora de Panos`, `Motoca Ifood` — ângulo "ato de
bondade com vendedor de rua"). É o novo lote de criativo testando em paralelo
ao lote antigo, não um acidente — mas significa que "Teste de Criativos"
sozinho já come R$ 800/dia (2 campanhas de R$ 400), e os dois não vão correr
lado a lado pra sempre: quando o lote novo tiver volume suficiente pra
comparar (regra 50/7 já adotada), consolidar o orçamento no vencedor.

## 3. O achado mais importante — a economia real não bate com o ROAS da conta

Isolei no BI (`kpis_financeiros`, janela 06→15/10, a vida toda da campanha):

| Métrica | Valor | Leitura |
|---|---|---|
| Gasto total no período | R$ 11.392,13 | — |
| Receita atribuída ao Meta Ads (de verdade) | R$ 10.049,00 | **ROAS atribuído = 0,88x** — abaixo de 1 |
| Margem de contribuição da campanha | **-R$ 9.618,48** | negativa no período |
| Pedidos de cliente **recorrente** (já existia) | 258 pedidos / R$ 9.587 | **95,9%** de tudo que o Meta credita |
| Pedidos de cliente **genuinamente novo** | 11 pedidos / R$ 462 | **4,1%** |
| CAC por cliente novo | **R$ 1.035,65** | vs ticket médio de cliente novo R$ 42,00 — **24,7x** o ticket |

Isso é o mesmo padrão já visto em 07/10 (ROAS agregado mascarando prospecção
real ruim), agora com número fechado: **de cada R$ 1 que o Meta credita como
"venda da campanha", R$ 0,96 é pedido de gente que já comprava antes** — a
campanha está, na prática, pagando pra reivindicar crédito por recompra
orgânica que ia acontecer de qualquer jeito. O ROAS de 6x–156x que aparece no
Ads Manager é real do ponto de vista do pixel, mas não mede o que a campanha
está de fato *gerando* de novo.

Isso é a razão de ser da audiência de exclusão do item 1 — sem excluir
recorrente das Campanhas 2 e 3, continuamos pagando pra "converter" cliente
que converteria sozinho, com CAC real de R$ 1.035 escondido atrás de ROAS
inflado.

## 4. Diagnóstico "All Viewers" vazia (Campanha 3)

Consultei a audiência direto na API (`120260904098590537`):

- Regra: `ALL_VISITORS`, pixel correto (`2276849516022676`), retenção 30
  dias, status `"Esse público está pronto para uso."` — **a regra não está
  errada.**
- `time_created`: **13/10, há só 2 dias.** `time_updated`: hoje às 16:25 —
  ainda crescendo, não travada.
- Comparando com o volume real do pixel (`pixel_funil_site_todo`): o site
  gera **milhares** de PageView/ViewContent por hora — mas isso é
  predominantemente evento **server-side (CAPI)**, que Website Custom
  Audience não usa (ela só conta fbp/cookie de navegador real). O navegador
  só dispara o pixel nas páginas que carregam GTM: nossa LP/catálogo e
  `/campanha/{slug}` — exatamente o gargalo que motivou o catálogo. É um
  problema de **maturação + superfície de navegador pequena**, não de regra
  errada.

**Por isso não recomendo sua sugestão original (duplicar a campanha e trocar
pra PageView+ViewContent)** — qualquer público baseado em evento desse mesmo
pixel vai sofrer do mesmo gargalo (cobertura de navegador pequena), então
trocar a regra não ataca a causa. **Minha recomendação**: pausar ou reduzir
o orçamento da Campanha 3 (hoje R$ 400/dia, pior ROAS do grupo, 3,6x) até
"All Viewers" passar de ~1.000 contatos — tamanho mínimo pra remarketing
funcionar de verdade — e realocar esse orçamento pra Campanha 1v3 ou 2.1
enquanto isso. Re-avaliar semanalmente. **Preciso da sua confirmação antes de
tocar em orçamento/status de campanha ativa — não fiz essa mudança ainda.**

## 5. UTM WhatsApp / fbc — sem ação (conforme sua mensagem)

- UTM de WhatsApp: confirmado que o cliente só começou a usar a convenção
  13-14/10 — números baixos no BI de 90 dias são esperados, vão crescer.
- fbc no Purchase principal: aguardando acumular volume em
  `PurchaseClickSorteios`/`PurchaseClickGroup` antes de religar, como você
  já aceitou.

## 6. O que passar pro cliente (resumo direto)

1. **Catálogo:** bug de sorteio esgotado corrigido e no ar.
2. **Orçamento:** R$ 2.400/dia ativo hoje (não R$ 1.200 de uma campanha só) —
   é teste de criativo em paralelo (Campanha 2 + 2.1), não erro.
3. **Antes de subir pra R$ 3.000/dia**: a campanha ainda está com margem de
   contribuição negativa no acumulado (-R$ 9.618) porque 96% do que o Meta
   credita é cliente que já existia. Prioridade real agora não é escala, é
   **excluir cliente existente da prospecção** (audiência já gerada, falta
   subir) — só depois disso o ROAS que aparecer vai ser confiável pra decidir
   escalar.
4. **Campanha 3 (retargeting)**: pausar/reduzir até o público amadurecer —
   aguardando sua confirmação.

## 7. Pendências que dependem de você

- [ ] Confirmar ação na Campanha 3 (pausar/reduzir vs. manter)
- [ ] Autorizar subida da `audiencia_clientes_ativos_recentes_30dias.csv`
      como Custom Audience + aplicar exclusão nas Campanhas 2 e 3
- [ ] Renomear eventos GTM `PurchaseLandingPage`/`PurchaseGroup` →
      `PurchaseClickSorteios`/`PurchaseClickGroup` (combinei fazer, ainda não
      fiz nesta sessão — confirmo se sigo agora)
- [ ] Separar o marcador `lp=1` por CTA (grupo vs. site) nas 3 LPs, pra
      `ic_origem` distinguir as duas rotas (mesma situação — combinado, não
      feito ainda)

## 8. Addendum (mesmo dia, rodada 2) — investigação de atribuição

Pedido do founder: "nossas fontes de faturamento são só grupo ou Meta Ads" —
investigar se o que hoje aparece como ambíguo pertence a um dos dois.

### "Meta — sinal fraco (sem clique)" — já reportado no item 3 (achado original)
Mantido: por contagem, maioria é fbp antigo (provável recorrente); por valor,
77% do faturamento do balde está nos pedidos com fbp fresco (<24h) — sinal
real, não prova. Agora exposto na própria tabela de Canal de Atribuição do BI
(detalhe expansível), não só em texto.

### "Direto/Orgânico/Desconhecido" — investigado agora, NÃO é grupo nem Meta disfarçados
Hoje: 16 pedidos / R$496 (já pequeno). 100% iOS, **0%** de Fbp/Fbc/UTM/Gclid/
Ttclid preenchido — nenhum sinal de rastreio sobrou. Comparei o perfil de
device contra os dois canais confirmados:

| Canal | iOS | Android |
|---|---|---|
| Direto/Desconhecido | **100%** | 0% |
| UTM: whatsapp (confirmado) | 29,8% | 66,4% |
| Meta Ads (clique confirmado) | 12,9% | 87,1% |

O perfil 100% iOS não bate com nenhum dos dois canais confirmados (ambos
majoritariamente Android, como o mercado BR em geral) — pesa CONTRA a
hipótese de ser grupo ou Meta disfarçado. Leitura mais defensável: ITP do
Safari/iOS (ou navegador in-app) apagando fbp/fbc antes do pixel registrar —
limitação de navegador, não uma 3ª origem de tráfego escondida. Não
reclassifiquei esses pedidos — ficam como estão, com nota explicativa no BI.

### UTM de anúncio "nova" — achado positivo
Com a correção do catálogo (ads agora passam por `/catalogo` em vez de ir
direto pro site do cliente), apareceram pela primeira vez pedidos com
`UTM_Campaign` = ID real de campanha Meta (ex: `120247283717880545`) — 10
pedidos / R$1.708,50 hoje. Essa é a granularidade nova que o founder pediu
pra reportar — seção de UTM do BI (em construção, subagente em andamento)
vai quebrar "Meta Ads" por campanha, não só por canal agregado.

### Sub-classificação dentro de "grupo"
Hoje só existe 1 valor de UTM_Campaign dentro de `UTM: whatsapp`
("grupo-principal") — ainda não há múltiplos grupos/campanhas de WhatsApp
pra sub-classificar. A tabela do BI já fica pronta pra quando houver mais de
um.

## 9. Addendum (mesmo dia, rodada 3) — GTM, catálogo pra anúncio, LPs e Gerenciador de Eventos

### Feito nesta rodada
- **GTM publicado (versão 9, GTM-58RGNFCK)**: `PurchaseLandingPage`→`PurchaseClickSorteios`,
  `PurchaseGroup`→`PurchaseClickGroup`. Corrigido de quebra a tag "Cookies -
  Origem de Chegada" (só reconhecia `lp === '1'`, passou a aceitar qualquer
  valor de `lp` exceto `'grupo'`) pra não quebrar com o novo marcador por CTA.
- **Catálogo ativado pro funil de anúncio**: `cta-site` do v1 apontava direto
  pro site do cliente (pulava o catálogo) — corrigido pra `/catalogo`, igual
  v2/v3 já estavam. Confirmado via API que a maioria dos anúncios ativos
  aponta pra raiz do nosso domínio — a Campanha 3 aponta direto pro link do
  grupo (`sndflw.com`), confirmado **intencional** (promoção de iPhone grátis
  pros grupos, pedido do cliente).
- **3 eventos novos no ar**: `PresselPageView`, `CatalogoPageView`,
  `ClickSorteiosCatalogo` (v1/v2/v3 + catálogo).
- **Purchase > InitiateCheckout corrigido de verdade** (não só aviso): o
  funil "site" do BI agora usa pedidos pagos reais (nosso pipeline) no lugar
  do Purchase do pixel nativo, que inflava. Confirmado ao vivo: Purchase caiu
  pra abaixo de InitiateCheckout, taxa de conversão real agora é calculável.
- **Funil da pressel expandido** no BI: PageView Pressel → ViewContent →
  Lead → ClickSorteios → ClickGroup → CatalogoPageView → ClickSorteiosCatalogo
  → Purchases Pressel/Grupo, com nota explícita que "Purchases Grupo" mede o
  canal como um todo, não especificamente quem clicou o botão de grupo aqui
  na pressel (ver validação abaixo).
- **LPs v1/v2/v3 redesenhadas**: dobra única, grade 2x2 de destaques (sem
  quebra de linha, testado em 360px), celular 3D (v2) e mostrador (v3)
  removidos por completo, tema claro refinado com critério de design,
  marcador `lp` separado por tipo de CTA (`lp=grupo` vs `lp=catalogo`), v2
  focada só em grupo (1 CTA), v3 focada só em catálogo (1 CTA). Footer de v2
  ficou sem CSS num deploy intermediário (achado real, corrigido e
  confirmado ao vivo na hora).

### Validação: "purchases de quem entrou no grupo pela pressel" — NÃO é
possível medir. O CTA de grupo da pressel vai direto pro `sndflw.com`
(externo) e dali pro WhatsApp — a jornada sai de qualquer domínio rastreável
nesse clique, sem cookie pra voltar. O que dispara `PurchaseClickGroup` é o
cookie `ic_origem=grupo`, setado por UTM de WhatsApp (link compartilhado
DENTRO do grupo) — canal diferente, não o clique na pressel. `ClickGroup` é
o melhor proxy de interesse que temos pra esse caminho.

**SendFlow**: API deles resolveria clique-por-LP (se criarmos links
distintos por LP), não compra-por-LP — mesma parede estrutural acima.
Precisa de credencial da API do SendFlow pra automatizar (founder tem o
painel, nós não) — gate já registrado antes em `gates-status.yaml`, segue
pendente.

### Investigação ao vivo no Gerenciador de Eventos (pixel `2276849516022676`, janela 17/09–14/10)

Pergunta do founder: "o funil mostra PageView altíssimo, não deveria estar
contabilizando no All Viewers?" — investigado direto na fonte, não mais só
inferência de API agregada.

- **PageView: 581,5 mil no período. 568.083 (97,7%) são navegador, só 13.446
  (2,3%) são API de Conversões.** Ou seja, a hipótese anterior ("é
  principalmente servidor, por isso não conta pra Custom Audience") estava
  **errada** — confirmado e retratado. É genuinamente navegador, quase todo.
- **Padrão diário**: gráfico mostra um dente-de-serra muito regular, 1 pico
  por dia, mesma amplitude e forma **desde 17/09 até hoje** — sem mudança
  visível de patamar em 06/10. **A discrepância não começou quando
  começamos a mexer** — o volume já era assim antes da campanha existir.
  Bate com o achado independente de hoje mais cedo: só 3.894 fbp distintos
  pra 165.870 pedidos em 90 dias (≈43 pedidos por pessoa) — é um negócio de
  poucas pessoas únicas com MUITO reengajamento (gente conferindo resultado
  várias vezes ao dia), não volume real de visitantes novos.
- **Ainda não fechei a conta exata do porquê 20 é tão baixo mesmo contra
  esse ajuste** — a base de navegador real (670 fbp distintos só entre
  compradores, em 3 dias) já deveria colocar "All Viewers" bem acima de 20.
  Fica como pendência de investigação, não resolvido hoje.
- **Achado paralelo (Qualidade da correspondência, evento Compra): 7,2/10.**
  Decente. Mas o próprio Gerenciador de Eventos aponta: **"o parâmetro fbc
  está sendo recebido pelo Pixel da Meta, mas seu servidor está enviando um
  parâmetro fbc vazio pela API de Conversões"** — nosso `capi_client.py` tem
  lógica deliberada de nunca mandar fbc velho (correto, por desenho — ver
  `bug-report-fbc-plataforma.md`), então isso pode estar vindo do lado
  servidor do próprio cliente, não do nosso envio. Não totalmente isolado
  ainda.

### Decisão sobre religar fbc no Purchase principal: AINDA NÃO
`PurchaseGroup` (nome antigo) já acumulou 3.100+ eventos — volume real. Mas
sob o nome NOVO (`PurchaseClickGroup`, GTM só publicado hoje à noite) são só
17 eventos até agora — é esse volume, sob o nome novo, que precisa crescer
antes de usar como evento de otimização/decisão de religar fbc, não o
histórico do nome antigo. Recomendo esperar mais alguns dias de volume real
sob `PurchaseClickSorteios`/`PurchaseClickGroup` antes de mexer no fbc do
Purchase principal — mantém a mesma lógica já combinada, agora com dado real
de EMQ (7,2/10) como referência de ponto de partida.

## 10. Pendências atualizadas (substitui a seção 7)

- [ ] Confirmar ação na Campanha 3 (pausar/reduzir vs. manter) — você disse
      que vai decidir
- [ ] Subir `audiencia_clientes_ativos_recentes_30dias.csv` como Custom
      Audience + aplicar exclusão nas Campanhas 2 e 3 — você disse que vai
      fazer
- [x] Renomear eventos GTM — feito, publicado (versão 9)
- [x] Separar marcador `lp` por CTA — feito nas 3 LPs
- [ ] Investigar por que "All Viewers" ainda está em ~20 mesmo com 97,7% do
      PageView sendo navegador real — não fechado, próxima sessão
- [ ] Isolar se o fbc vazio na API de Conversões é do nosso envio ou do
      servidor nativo do cliente
- [ ] Religar fbc no Purchase principal — aguardando volume real sob
      `PurchaseClickSorteios`/`PurchaseClickGroup` (nomes novos, só hoje)
- [ ] SendFlow: links separados por LP + credencial de API, se quiser
      clique-por-LP (não resolve compra-por-LP)

## 11. Addendum 2026-10-16 — refinamento de track, achados reais no Events Manager

### Investigado e resolvido
- **7 vs 11 parâmetros do evento Compra**: causa raiz encontrada. Nosso
  `capi_client.py` SEMPRE mandou só 3 campos em `custom_data` (currency,
  value, order_id) — nunca 11, sem evidência em código de regressão nossa.
  Os campos extras (content_ids/content_type/contents) na amostra de 28 dias
  provavelmente vêm de outro remetente contado no mesmo balde "API de
  Conversões" do Meta (não distingue por origem). Ação tomada: enriquecemos
  `capi_client.py` de verdade com `content_ids`/`content_type`/`contents`
  (usando ProductId/Quantidade/Preco_Unitario que já temos no pedido) — passa
  a mandar 6 campos próprios, ganho real de EMQ, não é só "voltar" a algo.
- **Atribuição de dia no Executivo**: confirmado correto — usa `PaymentAt`
  (data de pagamento) por pedido, nunca abertura/encerramento do sorteio.
  Sem correção necessária.
- **AddToCart/Compra/IniciarCheckout inflados no Events Manager**: são do
  pixel NATIVO da plataforma do cliente — não temos acesso a esse código,
  não dá pra "parar de mandar" nem corrigir direto. Alavanca real disponível:
  criar uma Conversão Personalizada no Ads Manager restrita só aos eventos
  de Compra que NÓS enviamos via CAPI (limpos, 1 por pedido real) e apontar
  as campanhas pra otimizar nessa conversão personalizada em vez do evento
  "Compra" padrão (poluído pelo pixel nativo). Ainda não implementado —
  decisão de otimização de campanha, precisa de confirmação antes de mexer.

### Feito
- **GTM**: revertido `PurchaseClickGroup` → `PurchaseGroup` (publicado,
  versão 10) — confirmado que não dá pra provar compra de quem clicou
  "Entrar no grupo" especificamente na pressel (clique sai pro
  sndflw.com/WhatsApp, fora de domínio rastreável). `PurchaseClickSorteios`
  mantido (jornada pressel→catálogo→campanha É rastreável de ponta a ponta).
- **BI**: subagente disparado pra separar "Compras Grupo" num bloco próprio,
  fora do "Funil da pressel" (evitar a confusão de parecer atribuível à
  pressel) + corrigir `EVENTOS_FUNIL_HOST` pra puxar `PurchaseGroup` de novo.

### Decisões em aberto (preciso da sua confirmação antes de construir)

**1. Segmentação por versão de LP (v1/v2/v3)**: você pediu pra estudar a
melhor forma de medir e comparar o funil de cada versão separadamente.
Avaliação: os parâmetros `variant: 'v1'/'v2'/'v3'` já são enviados em alguns
eventos (ClickSorteios/ClickGroup) mas a API de stats do pixel que usamos
(`aggregation=event`/`aggregation=host`) NÃO permite quebrar por parâmetro
customizado — só por nome de evento ou host. Duas rotas possíveis: (a) criar
nomes de evento distintos por LP (ex. `PresselPageView_v1/_v2/_v3`) — funciona
com a API atual, mas multiplica eventos e dilui volume de otimização de
campanha; (b) construir um beacon próprio (nosso domínio → Supabase) que
registra variant+evento direto, sem depender da API limitada do pixel —
mais flexível, mas é infraestrutura nova. Recomendo (b) a médio prazo, mas
quero sua confirmação antes de começar a construir qualquer uma.

**2. fbc no Purchase principal**: ainda recomendo esperar — `PurchaseGroup`
(nome atual, pós-reversão) tem histórico real desde antes de hoje, mas
`PurchaseClickSorteios` (o evento que realmente importa pra essa decisão,
por ser o caminho atribuível) ainda está crescendo. EMQ do Purchase está em
7.1-7.2/10 (decente) nesse meio tempo — não é urgente, mas também não é
motivo pra acelerar a religação do fbc ainda.

**3. Conversão Personalizada pra otimização de campanha** (ver acima) —
aguardando sua decisão.
