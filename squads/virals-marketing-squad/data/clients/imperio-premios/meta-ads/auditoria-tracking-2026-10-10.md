# Auditoria de Tracking — Império Prêmios — 2026-10-10

**Gatilho:** o founder olhou Events Manager, Ads Manager e BI na manhã de 10/10 e disse "não me parece estar tudo batendo ainda". Está certo. Esta auditoria confirma cada anomalia com dado ao vivo (Graph API, API do backend do cliente, logs do webhook, CSV do collector) e isola a causa raiz de cada uma.

**Método:** nenhuma conclusão aqui vem de print. Todo número foi reconfirmado na fonte. Onde não consegui provar, está dito explicitamente na seção "O que NÃO consegui provar".

---

## Sumário executivo

| # | Achado | Classificação | Novo? |
|---|---|---|---|
| 1 | `collector.py` trava sorteio no checkpoint para sempre → CSV tem só ~11% dos pedidos | **Bug nosso** | **SIM — inédito** |
| 2 | Funil invertido: ATC sem CAPI + Purchase do navegador disparando 1,6x | Limitação estrutural + **bug da plataforma** | Parcial |
| 3 | Atribuição cega: UTM 0% e 95% dos `fbc` vencidos | **Problema da plataforma** | Já documentado, **piorou** |
| 4 | ROAS 168x/529x por anúncio | Consequência do #3 | Já documentado |
| 5 | BI vs Ads Manager divergem ~150x | Consequência do #3, **não** do #1 | Esclarecido |
| 6 | Pressel com 19,5% de CTR — **saudável** (a leitura de "CTR baixo" vinha de denominador errado) | Funcionando corretamente | Correção de leitura |
| 7 | EMQ 7,4 e fbc 9,09% | Característica real do tráfego | Já documentado |
| 8 | Dataset agrega **5 domínios** — toda métrica precisa de recorte por host | Armadilha de medição | **SIM — inédito** |

**O mais importante:** o achado #1 é um bug nosso, inédito, que não está em `gates-status.yaml`, e que degrada silenciosamente as **Custom Audiences** que alimentam a segmentação das campanhas. O achado #3 é a razão pela qual nenhuma métrica de atribuição é confiável hoje — e não tem solução do nosso lado.

---

## Achado 1 — `collector.py` marca sorteio como processado para sempre (BUG NOSSO, INÉDITO)

### A evidência

Cruzei os `orderId` que o webhook recebeu ao vivo (fonte independente, dispara a cada `order.paid`) contra o CSV do collector:

```
orderIds do webhook (reais, pagos): 50
  presentes no CSV do collector  : 1 (2,0%)
  AUSENTES do CSV                : 49 (98,0%)
```

Volume por dia no CSV vs. realidade:

| Dia | Pedidos no CSV | Faturamento no CSV | Ticket |
|---|---|---|---|
| 07/10 | 1.866 | R$ 106.739,00 | R$ 57,20 |
| 08/10 | 171 | R$ 3.949,00 | R$ 23,09 |
| 09/10 | 191 | R$ 4.666,00 | R$ 24,43 |
| 10/10 | 64 | R$ 2.140,50 | R$ 33,45 |

Hoje o BI (que **não** usa o CSV — ver #5) reporta faturamento real de **R$ 10.476,00**. O CSV tem R$ 2.140,50 — **20% do real**. Eventos `Purchase` SERVER hoje: 584. CSV: 64 — **11%**.

### A causa raiz

`services/Meta/imperio-premios/collector.py`, linhas 103 e 137:

```python
pendentes = [s for s in sorteios if (s.get("_id") or s.get("id")) not in processados]
...
processados.add(pid)   # permanente, sem condição
```

Um sorteio é marcado como `processado` após **uma** passagem e **nunca mais é revisitado**. Mas sorteio é recurso **mutável e de vida longa** — participantes entram ao longo de horas. O collector fotografa o sorteio recém-criado (quase vazio) e trava.

Prova no próprio checkpoint (`detalhes_sorteios_3dias.csv`, 159 sorteios):

```
primeiros 20 (recoleta completa de 10-07): [56, 74, 33, 61, 58, 70, 70, 65, 43, 66, ...]
últimos 25  (ciclos incrementais novos) : [6, 17, 20, 29, 2, 0, 0, 0, 0, 3, 0, 0, 0, 30, 1, ...]

sorteios com 0 participantes: 41/159
sorteios ainda ACTIVE (vendendo) travados no checkpoint: 85
```

### Agravante não óbvio: a correção de 07/10 piorou este bug

O `gates-status.yaml` registra a correção de paginação `page=1` → `page=0` em 07/10 (que era real e necessária). Efeito colateral: antes, o collector só enxergava o sorteio depois que ele "envelhecia" para a página 2+ — quando já tinha acumulado a maior parte dos participantes. Depois da correção, ele captura o sorteio **minutos após a criação**, quando está vazio, e trava ali.

A queda no CSV começa exatamente em 08/10, o primeiro dia inteiro após a correção. Uma correção correta expôs um bug latente.

### Impacto real (mapa de dependências verificado no código)

| Consumidor | Fonte | Afetado? |
|---|---|---|
| `send_backlog.py` (CAPI Purchase, rede de segurança) | CSV | **SIM** |
| `reports.py` (gera as Custom Audiences) | CSV | **SIM** |
| `bi_aggregator.py` (BI) | API fresca | Não |
| `capi_initiatecheckout.py` | API fresca | Não |
| `apps/webhook-imperio-capi` (tempo real) | push da plataforma | Não |

**O envio de CAPI para o Meta NÃO está quebrado** — o webhook pega ~100% dos pedidos em tempo real. Hoje: 584 eventos SERVER, dos quais o `send_backlog` mandou apenas 64; os outros ~520 vieram do webhook.

Os dois danos concretos são:

1. **A rede de segurança não existe.** O `send_backlog` deveria reenviar o que o webhook perdesse. Como ele só enxerga 11% dos pedidos, não consegue recuperar nada. Em 07/10 o webhook ficou 2h fora do ar (documentado no `gates-status.yaml`) — se repetir hoje, os pedidos somem de vez.
2. **As Custom Audiences estão sendo construídas sobre 11% dos clientes.** `reports.py` gera `audiencia_alto_valor_90dias.csv` e `audiencia_recompra_90dias.csv` a partir do CSV. São exatamente as listas usadas no Ads Manager para Lookalike e para a exclusão de "Clientes Existentes" que acabou de ser ativada. Lista incompleta = Lookalike pior e exclusão furada.

### Correção recomendada (NÃO apliquei — explico por quê)

```python
# collector.py — só travar o sorteio quando ele não puder mais receber pedidos
if sorteio.get("status") == "done":
    processados.add(pid)
```

Mais a deduplicação por `OrderId` no append (senão cada revisita duplica linhas no CSV).

**Por que não apliquei:** a correção é de 2 linhas, mas o efeito na primeira execução não é. Os 85 sorteios `active` travados seriam reabertos de uma vez — ~5.000 pedidos entrariam no CSV, e o `send_backlog` (que roda a cada 15 min pelo Task Scheduler) tentaria enviar todos. A dedup do Meta por `event_id` absorveria, mas é um pico de milhares de chamadas de API sem aviso, num pipeline de produção. Isso precisa ser uma decisão consciente, não efeito colateral de uma auditoria. Esforço: ~30 min de código + 1 execução supervisionada.

---

## Achado 2 — O funil não é um funil (duas causas distintas)

Dados de hoje (10/10, **corte às 11h BRT** — os totais do Achado 6 são de um corte mais tarde no mesmo dia e por isso são maiores; a proporção entre eventos é o que importa aqui), via Graph API `aggregation=event_source`:

| Evento | BROWSER | SERVER | TOTAL |
|---|---|---|---|
| AddToCart | 696 | **0** | 696 |
| InitiateCheckout | 635 | 665 | 1.300 |
| Purchase | 945 | 584 | 1.529 |

### Antes de tudo: os três eventos vêm do mesmo domínio (sem contaminação)

O dataset agrega 5 domínios, então a primeira pergunta é se o funil invertido é artefato de mistura. **Não é.** Via `aggregation=host` (ver Achado 6), os três eventos são **100% de `imperiopremioss.com`** — zero vindo da pressel:

```
AddToCart        806 site | 0 pressel
InitiateCheckout 1.477 site | 0 pressel
Purchase         1.775 site | 0 pressel
```

O funil invertido é uma propriedade real do site de sorteios, não um erro de agregação. No recorte só do site, `Purchase / AddToCart = 2,20x`.

### Causa (a) — cobertura assimétrica por fonte: **limitação estrutural, não bug**

`AddToCart` tem **zero** eventos de servidor. Confirmado por dois caminhos independentes: a Graph API (acima) e o próprio Events Manager, que mostra ATC com integração **"Navegador"** enquanto Compra e Iniciar finalização aparecem como **"Várias"**.

Isso bate com a triagem de 07/10 já registrada no `gates-status.yaml`, que classificou ATC como "sem fonte de dado equivalente confirmada" — a API do cliente não expõe um momento de "carrinho" distinto do "checkout iniciado".

Consequência: comparar ATC (só navegador, perde para adblock/ITP/iOS) com IC e Purchase (navegador + CAPI, cobertura quase total) **não mede funil nenhum** — mede diferença de instrumentação. O gráfico "Funil do Pixel" do BI, do jeito que está, induz ao erro.

Agravante secundário: `capi_initiatecheckout.py` usa `status="all"`, enviando IC também de checkouts `waiting-payment` e `expired`. Isso é defensável (checkout iniciado é checkout iniciado), mas infla IC contra ATC.

### Causa (b) — Purchase do navegador dispara ~1,6x por pedido: **bug da plataforma**

Mesmo olhando **só o navegador** (única base comparável entre os três eventos):

```
ATC 696  →  IC 635  →  Purchase 945
Purchase / ATC = 1,36x   (deveria ser bem menor que 1)
```

E o mais revelador:

```
Purchase BROWSER (945) / Purchase SERVER (584) = 1,62x
```

O lado servidor dispara exatamente uma vez por `order.paid`. O navegador deveria disparar **no máximo** o mesmo tanto, e na prática menos (adblock). Está disparando 62% a mais.

Hipótese principal: a página de confirmação (`imperiopremioss.com/compra/{id}`) refaz o `fbq('track','Purchase')` a cada recarga/renavegação da SPA. É o padrão clássico. **Não consegui provar o mecanismo** sem instrumentar o site do cliente — ver seção final.

Classificação: bug na implementação do pixel da plataforma do cliente, mesma categoria do `fbc` vencido. Fora do nosso controle.

---

## Achado 3 — Atribuição cega: UTM 0% e 95% dos `fbc` vencidos (CAUSA RAIZ COMPARTILHADA)

Este achado explica sozinho os itens 3, 4 e 5 do briefing original.

### UTM continua em zero absoluto

```
UTM_Source   : 0/426 preenchidos
UTM_Campaign : 0/426 preenchidos
UTM_Content  : 0/426 preenchidos
UTM_Medium   : 0/426 preenchidos
```

(426 = pedidos de 08 a 10/10 no CSV.)

E não é falha de configuração nossa — confirmei via Graph API que o `url_tags` dos anúncios ativos está **correto**:

```
utm_source=meta&utm_medium=paid-social&utm_campaign=camp1-advantage-vendas-{{campaign.id}}&utm_content={{ad.id}}&utm_term={{adset.id}}
```

E a LP publicada (`https://www.imperiorapidinhas.com.br/`, HTTP 200, 0,12s) tem a propagação de query string funcionando, com pixel, ClickSorteios, ClickGroup e `searchParams.set` todos presentes no HTML servido.

Ou seja: **mandamos a UTM corretamente e ela chega na LP; a plataforma do cliente simplesmente não a persiste no pedido.** Exatamente o que foi concluído em 08/10, sem nenhuma mudança desde então.

### `fbc` — 95% do que a plataforma serve está vencido

Distribuição de idade do `fbc` nos 426 pedidos de 08-10/10:

| Faixa | Pedidos |
|---|---|
| ≤ 7 dias (**atribuível**) | **5** |
| 8-30 dias | 4 |
| 31-90 dias | 29 |
| > 90 dias | **53** |
| sem `fbc` | 335 |

Dos 91 pedidos que têm `fbc`, só **5 (5,5%)** têm clique recente o bastante para atribuir. **53 têm `fbc` de mais de 90 dias.**

O bug do `fbc` congelado documentado em 07/10 **não foi corrigido pela plataforma**. Nosso pipeline contorna (descarta `fbc` > 7d antes de enviar), mas a CAPI nativa da plataforma não faz esse filtro — e é ela que alimenta o Meta com clique de meses atrás.

### Por isso o canal de atribuição fica assim

```
323 | Meta (pixel, sem clique confirmado)
 53 | Meta Ads (fbc expirado, >90d — não atribuível)
 29 | Meta Ads (fbc expirado, 31-90d — não atribuível)
 12 | Direto/Orgânico/Desconhecido
  5 | Meta Ads (clique confirmado, sem UTM)
  4 | Meta Ads (fbc expirado, 8-30d — não atribuível)
```

Li `client_api.py::_classificar_canal` e `bi_aggregator.py::classificar_novo_vs_recorrente`: **a lógica dos dois está correta**. O problema não é a classificação, é não existir sinal para classificar.

"Meta (pixel, sem clique confirmado)" = a pessoa tem o cookie do pixel (já passou pelo site) mas não tem identificador de clique em anúncio. Com 323 de 426 pedidos nesse balde, o retrato honesto é: **o faturamento é majoritariamente orgânico/grupo, não de clique pago rastreável.**

### Resposta direta ao "por que o BI nunca mostra cliente novo?"

O BI só classifica novo×recorrente **entre pedidos atribuídos ao Meta Ads**. Hoje existe 1 pedido atribuído (R$ 5,50), e esse cliente é recorrente. Logo: cliente novo = R$ 0,00 / 0 pedidos.

A conta está aritmeticamente certa. O que falta não é lógica, é sinal de atribuição.

---

## Achado 4 — ROAS 168x / 529x por anúncio

O anúncio `[VD][20261006] - 100 Números`: R$ 4,55 de gasto, 3 cliques no link, **6 compras**, R$ 749,50 de valor, ROAS 164,73x. No detalhamento, "Novo público" sozinho: 2 finalizações de compra e ~5 compras — **mais compras do que checkouts**, de novo.

Confronto com o que consigo confirmar na base real: os 5 pedidos com clique genuinamente confirmado (fbc de 0,0 dia) somam **R$ 70,00** — valores de R$ 3,00 a R$ 30,00. O Meta reivindica R$ 749,50 num único anúncio, com ticket implícito de R$ 125 por compra, enquanto o ticket real medido hoje é R$ 33,45.

Mecanismo (dois fatores que consigo comprovar, combinados):

1. **Mandamos todo pedido pago ao Meta com identidade rica.** Telefone, email, nome, sobrenome, país, IP, user-agent e external_id em 100% de cobertura (EMQ 7,4). São ~584 compras/dia entrando com identidade completa, a enorme maioria sem nenhuma relação com anúncio.
2. **O Meta casa por identidade, não por clique.** Com Advantage+ e matching amplo, basta a pessoa ter tido contato com o anúncio para a compra orgânica dela ser creditada.

É o mesmo mecanismo do achado de 07/10 ("Enviar sempre" contaminando a leitura), agora visível no nível do anúncio.

**Importante — e isto corrige uma suposição do briefing:** este ROAS inflado **não é** causado pelo bug do collector (#1). São problemas independentes. Corrigir o collector não conserta o ROAS.

---

## Achado 5 — BI vs Ads Manager divergem ~150x (esclarecimento)

BI hoje: ROAS atribuído 0,03x (R$ 5,50 sobre R$ 214,05). Ads Manager, Campanha 1 v3: 10 compras, R$ 831,00.

**Correção importante a uma hipótese do briefing:** verifiquei em `bi_aggregator.py::pull_pedidos` que o BI **não lê o CSV do collector** — ele reconsulta a API a cada execução, sem checkpoint. Portanto o BI **não** é afetado pelo bug #1, e seu faturamento (R$ 10.476 hoje) é real e completo.

A divergência é de **filosofia de medição**, agravada pelos bugs da plataforma:

- O **nosso BI** exige prova dura: UTM preenchida ou `fbc` com menos de 7 dias. Como UTM é 0% e 95% do `fbc` está vencido, quase nada passa no critério → R$ 5,50.
- O **Meta** atribui por identidade probabilística, sem exigir clique comprovado → R$ 831,00.

Nenhum dos dois está "errado" pelas próprias regras. A verdade está no meio, e **hoje não temos como medir onde** — precisamente porque a UTM, que seria o árbitro, nunca chega.

---

## Achado 6 — ClickSorteios e ClickGroup: a pressel está SAUDÁVEL (19,5% de CTR)

### Primeiro, uma armadilha de medição que quase produziu conclusão falsa

O dataset `2276849516022676` agrega **5 domínios** (o Events Manager lista `imperiopremioss.com` + "Mais 4"). Comparar os 10 ClickSorteios contra os 2.288 PageView do dataset — que foi o instinto inicial — é maçã com laranja: o PageView agregado é quase todo do site de sorteios, enquanto ClickSorteios e ClickGroup só existem na pressel.

Consegui isolar com dado real: a Graph API aceita `aggregation=host` no endpoint `/stats`. Quebra de hoje:

| Evento | `imperiopremioss.com` (site) | `imperiorapidinhas.com.br` (pressel) |
|---|---|---|
| PageView | 6.968 | **200** |
| ViewContent | 7.082 | 0 |
| AddToCart | 806 | 0 |
| InitiateCheckout | 1.477 | 0 |
| Purchase | 1.775 | 0 |
| **ClickSorteios** | 0 | **24** |
| **ClickGroup** | 0 | **15** |

A pressel responde por **200 dos 7.168 PageView (2,8%)**. Qualquer taxa calculada sobre o número agregado estaria errada por um fator de ~35x.

### Com o denominador certo, o resultado se inverte

```
Pressel hoje: 200 PageView → 24 ClickSorteios + 15 ClickGroup = 39 cliques em CTA
CTR da pressel = 39/200 = 19,5%
```

**19,5% de clique em CTA é um número bom**, não um problema. A leitura de "taxa baixíssima na LP" que o número agregado sugeria é falsa.

Divisão da intenção: **24 vão para o site** (ClickSorteios, 12,0%) e **15 vão para o grupo** (ClickGroup, 7,5%) — ou seja, ~38% de quem clica num CTA escolhe o grupo de WhatsApp, e a partir daí a atribuição individual acaba (documentado em `funil-conversao.md`, "Ramo B").

### Implementação verificada

HTML **servido em produção** (`https://www.imperiorapidinhas.com.br/`, HTTP 200, 0,12s) contém pixel, os dois eventos custom com `eventID` único por clique (corrigindo o alerta de 08/10 sobre evento sem ID) e a propagação de query string. `cta-site` → `imperiopremioss.com`, `cta-grupo` → `sndflw.com`. **Está correto.**

### Como ler daqui pra frente

- KPI de qualidade da pressel: `(ClickSorteios + ClickGroup) / PageView do host imperiorapidinhas.com.br`. Hoje: **19,5%**.
- KPI de intenção de compra: `ClickSorteios / PageView da pressel`. Hoje: **12,0%**.
- **Nunca** usar o PageView do dataset como denominador — ele mistura 5 domínios.
- Para qualquer recorte por domínio, usar `aggregation=host` na Graph API (foi assim que esta tabela foi produzida).

---

## Achado 7 — EMQ 7,4/10 e fbc 9,09%

EMQ do Compra: 7,4/10 (era 7,5). Email 39,45%, fbp 95,29%, e telefone/IP/user-agent/external_id/nome/sobrenome/país todos em **100%**.

A queda de `fbc` (14,64% → 9,09%) **não é regressão**. É consequência direta e esperada de duas coisas: (a) nosso pipeline descarta corretamente `fbc` vencido antes de enviar, e 95% do que a plataforma serve está vencido; (b) o tráfego real é majoritariamente orgânico/grupo. O `gates-status.yaml` já registrou exatamente esta conclusão em 07/10.

Classificação: **característica real do tráfego.** Nada a corrigir. Nenhuma alavanca de EMQ relevante está desativada por nossa causa — as sugestões restantes do Meta (Estado, Cidade, CEP, data de nascimento, Facebook Login ID) dependem de campos que a API do cliente não expõe.

---

## O que NÃO consegui provar

Honestidade sobre os limites desta auditoria:

1. **O mecanismo exato do Purchase do navegador disparar 1,6x.** Tenho a razão (945 navegador vs 584 servidor) e a hipótese (recarga da página de confirmação), mas provar exige instrumentar o site do cliente ou reproduzir uma compra real observando o disparo. Não fiz.
2. **A fatia exata da CAPI nativa da plataforma no volume SERVER.** Hoje: 584 SERVER, dos quais 64 do `send_backlog`. Os ~520 restantes são do webhook e/ou da CAPI nativa — não consigo separar os dois pelos dados que tenho acesso.
3. **O caminho de atribuição que o Meta usou** para creditar 6 compras ao anúncio de 3 cliques. Tenho os dois fatores contribuintes comprovados, mas o Meta não expõe a cadeia de decisão.
4. **Se o volume real de pedidos caiu.** O CSV sugere queda de 90%, mas isso é o bug #1. Pelos eventos SERVER (584 hoje até 11h) e pelo webhook, o volume parece saudável — mas não validei contra o relatório nativo da plataforma, como foi feito em 07/10.

### Uma conclusão errada que foi corrigida no meio desta auditoria

A primeira versão deste documento ia reportar que a pressel tinha CTR baixíssimo, comparando 10 ClickSorteios contra 2.288 PageView. **Essa conclusão estava errada** — o PageView agrega 5 domínios e é quase todo do site de sorteios. Com `aggregation=host`, o denominador correto (200 PageView da pressel) mostra o oposto: **19,5% de CTR, saudável**.

Fica o método: neste dataset, nenhuma taxa pode ser calculada sem recorte por host.

---

## Ações recomendadas, por prioridade

### P0 — Corrigir o collector (bug nosso, degradando as audiências agora)
Aplicar a correção do Achado 1 com execução supervisionada (por causa do pico de reabertura dos 85 sorteios travados). Depois, **regerar as Custom Audiences** com `reports.py` e re-subir no Ads Manager — as listas atuais foram construídas sobre 11% da base e estão alimentando a Lookalike e a exclusão de Clientes Existentes. Esforço: ~30 min + 1 execução acompanhada.

### P1 — Corrigir o "Funil do Pixel" do BI em duas dimensões
Hoje o painel soma eventos de fontes diferentes **e** de domínios diferentes, então não mede funil nenhum.

1. **Fonte:** enquanto ATC não tiver servidor, exibir o funil **só com dados de navegador** — única base homogênea entre os três eventos. (Alternativa mais fraca: rotular cada evento com sua origem.)
2. **Domínio:** aplicar `aggregation=host` e separar `imperiopremioss.com` da pressel. O PageView do dataset agrega 5 domínios e não serve como topo de funil de nada.

Como subproduto, adicionar ao BI o KPI da pressel com denominador correto: `(ClickSorteios + ClickGroup) / PageView do host da pressel` — hoje 19,5%, que é informação acionável e hoje não aparece em lugar nenhum. Esforço: ~2h.

### P2 — Escalar os três bugs da plataforma para o dev do cliente
Pacote único, com a evidência desta auditoria:
- `fbc` vencido sendo reservido (53 pedidos com `fbc` > 90 dias em 3 dias) — é o que infla o ROAS;
- UTM nunca persistida (0/426), apesar de chegar corretamente na LP;
- Purchase do pixel disparando ~1,6x por pedido.

O `bug-report-fbc-plataforma.md` já existe e pode ser estendido. **Decisão do founder:** até hoje a escolha foi contornar em vez de escalar. Os três juntos têm peso suficiente para justificar a conversa.

### P3 — Decidir como medir enquanto a plataforma não corrige
Com UTM em 0% e `fbc` 95% vencido, não existe atribuição determinística possível. As opções realistas: (a) aceitar o número do Meta sabendo que está inflado, (b) usar o BI sabendo que é piso extremo (R$ 5,50), ou (c) medir por **incrementalidade** (ligar/desligar campanha e comparar faturamento total do site) — a única que não depende de sinal de clique. Para o volume atual, (c) é a mais confiável.

---

*Auditoria executada em 2026-10-10. Fontes: Graph API (`/stats` por `event_source`), API do backend do cliente (via CSV e consulta direta), logs do webhook em produção (Vercel), `capi_realtime.log`, `detalhes_sorteios_3dias.csv`, HTML servido em produção da LP, e leitura de `collector.py`, `client_api.py`, `bi_aggregator.py`, `send_backlog.py`, `capi_initiatecheckout.py`.*
