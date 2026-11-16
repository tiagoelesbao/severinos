# Auditoria de Tracking & Inteligência de Dados — Império Prêmios

**Data:** 2026-10-08
**Motivo:** o founder notou várias inconsistências navegando pelo BI e pelo Events Manager no mesmo dia (Advanced Matching ativado ontem, Compra > Add to Cart, "novo cliente" zerado há tempos, funil "não conciso", métrica de criativo não bate com a de conta) e pediu uma auditoria de ponta a ponta do pipeline, com explicação verificável de cada número.
**Método:** cada afirmação abaixo foi conferida contra código-fonte real (`bi_aggregator.py`, `operacional.html`) e/ou dado ao vivo (API do cliente, `data-executiva.json`/`data-operacional.json` do dia). Nada aqui é suposição.

---

## TL;DR

| Pergunta | Resposta curta |
|---|---|
| Advanced Matching duplica evento? | **Não.** Só enriquece eventos que já existem com mais dados de identidade. |
| Advanced Matching infla atribuição de venda? | **Sim, indiretamente** — e isso explica boa parte do que você está vendo. |
| "Novo cliente = 0" é bug? | **Não é bug.** Confirmado com dado real: hoje, 100% dos pedidos atribuídos a Meta vêm de só 4 clientes com 16 a 199 pedidos cada nos últimos 14 dias. |
| Funil com Iniciar Finalização > Add to Cart | **Dois problemas, não um.** (1) Bug real de UI corrigido agora — a ordem das barras no código estava errada. (2) Causa de fundo (parcialmente real, parcialmente efeito temporário) explicada no item 4. |
| Métrica de criativo bate com a de conta? | **Não, e nunca vai bater** — são dois sistemas de atribuição diferentes. Quantificado abaixo: R$62.906 (Meta) vs R$3.280,50 (nossa reconstrução) no mesmo período de 3 dias. |
| Compra/Iniciar Finalização seguem duplicando? | Mecanismo corrigido nos dois eventos agora (`capi_client.py` recebeu o mesmo fix do `eventId` compartilhado hoje, testado e validado) — mas **não dá pra "garantir" com 100% de certeza ainda**, precisa de mais alguns dias de volume rodando pra a métrica de desduplicação do Events Manager refletir isso. Já é o próximo item de verificação não-bloqueante no registro do projeto. |

---

## 1. Correspondência Avançada Automática — o que ela realmente faz

Você ativou isso ontem em Configurações do Dataset. Pergunta: ela pode estar causando a "atribuição a mais" que você desconfia?

**O que a função faz tecnicamente:** é um recurso do lado do NAVEGADOR (pixel). Quando ativada, o script do pixel varre os formulários da própria página (campo de email, telefone, nome) e anexa automaticamente esses dados, já em hash, aos eventos que **já disparam** (PageView, ViewContent, etc.). Ela não cria evento novo nenhum — é só enriquecimento de identidade em cima do que já existe.

**Por que ela pode estar inflando a atribuição mesmo assim:** melhor dado de identidade = a Meta fica melhor em reconhecer "essa pessoa que comprou é a MESMA que viu meu anúncio uma vez". Isso é bom pra matching geral, mas tem um efeito colateral direto: quanto mais forte o matching, mais fácil a Meta conectar uma compra orgânica de um cliente antigo a uma impressão de anúncio que ele viu de passagem — mesmo que o anúncio não tenha sido o motivo real da compra. Isso não é um bug da função: é o comportamento esperado de QUALQUER sistema de identity matching mais forte, e é exatamente o tipo de coisa que fica mais visível quando a base de clientes é majoritariamente recorrente (ver item 3).

**Desativar resolve?** Só parcialmente, e com custo: reduz esse efeito específico, mas também piora a Qualidade de Correspondência geral (EMQ) que corrigimos nos últimos dias — menos dados de identidade em TODOS os eventos, não só nos de clientes recorrentes. A causa real do problema (pagar pra "reconquistar" quem já compra sozinho) não se resolve desativando uma configuração de matching — se resolve mudando quem a campanha tenta alcançar (ver recomendação no fim do documento).

**Cabe desativar?** Tecnicamente sim, é um toggle simples na mesma tela que você já tem aberta (Configurações do Dataset → Correspondência Avançada Automática). Mas eu recomendo NÃO desativar — o ganho é pequeno e o custo (EMQ pior em tudo) é real. O ajuste certo é na audiência da campanha, não na medição.

---

## 2. "Novo Cliente × Recorrente" — como o cálculo é feito, passo a passo

Função: `classificar_novo_vs_recorrente()` em `services/Meta/imperio-premios/bi_aggregator.py` (linha 216).

**Passo a passo:**
1. Cada pedido recebe uma "chave de identidade" = telefone em formato E.164 (ex.: `+5535*****9069`), com fallback pro CPF se não tiver telefone (`extrair_telefone_chave`, linha 147).
2. Todos os pedidos da janela puxada (`--dias`, hoje rodando com **14 dias**, campo `janela_dias_pedidos` no JSON) são ordenados por data real da compra (`PaymentAt`, fallback `Data`).
3. Pra cada chave de identidade, a PRIMEIRA vez que ela aparece (varrendo do pedido mais antigo pro mais novo, dentro desses 14 dias) é marcada `Primeira_Compra_Na_Janela = True`. Toda ocorrência seguinte da mesma chave vira `False`.
4. No `montar_snapshot()` (linha 629), isso é cruzado com atribuição Meta Ads (`Canal_Atribuicao` começando com "UTM: meta" ou "Meta Ads (clique confirmado") e com o período real da campanha (desde 2026-10-06) — só essa interseção (Meta + dentro do período + True/False) vira "novo cliente" / "recorrente" nos cards.

**Limitação HONESTA, já documentada no próprio código (linha 220):** se a primeira compra de verdade de um cliente foi ANTES da janela de 14 dias puxada, o pedido dele aparece como "primeira compra" na nossa classificação mesmo não sendo a primeira de verdade. Isso é uma limitação de JANELA, não um bug — e ela tende a inflar "novo", nunca "recorrente" (um cliente nunca vira "recorrente" por engano; na pior hipótese, um recorrente de verdade aparece erroneamente como "novo" se a janela for curta demais pra enxergar o pedido anterior dele).

### Prova com dado real (rodado agora, ao vivo, não é o snapshot congelado)

Rodei a mesma função contra a API do cliente ao vivo. Hoje (2026-10-08), havia 14 pedidos atribuídos a Meta Ads. Todos os 14 vieram de só **4 clientes**:

| Telefone | Pedidos hoje | Total de pedidos nos últimos 14 dias |
|---|---|---|
| +5535*****9069 | 8 | **199** |
| +5535*****1239 | 3 | 16 |
| +5537*****6001 | 1 | 137 |
| +5514*****5946 | 1 | 36 |

Todos os 14 pedidos foram corretamente marcados `Primeira_Compra_Na_Janela = False`. Não é plausível classificar alguém com 199 pedidos em 14 dias como "cliente novo" — a classificação está certa. **"Novo cliente = 0" é real**: a campanha, neste momento, está essencialmente servindo apostadores de altíssima frequência que já eram clientes, não captando gente nova.

### "R$336,00 vem do Meta recorrente" — de onde vem esse número exatamente

É o campo `diario[].meta_ads_recorrente_valor` do dia 2026-10-08 em `data-executiva.json`: `meta_pedidos: 8, meta_valor: 336.0, novo_pedidos: 0, rec_pedidos: 8, rec_valor: 336.0`. Ou seja: dos 8 pedidos que a classificação de atribuição (item 5 abaixo) considera "Meta Ads com sinal forte" hoje, R$336,00 é a soma do `Valor` desses pedidos, e 100% deles batem no critério de "recorrente" explicado acima. A afirmação é verídica — vem de pedido real, com telefone real, histórico real. O número NÃO está inflado pela correspondência avançada (isso aconteceria na etapa de "a Meta decide que a venda é dela", que é uma camada completamente separada — ver item 5), e sim é o resultado de aplicarmos nosso próprio critério de atribuição, mais conservador que o da Meta, contra os pedidos reais da API do cliente.

---

## 3. Funil de passagem — por que não estava "conciso"

Dois problemas diferentes, achados e tratados separadamente.

### 3a. Bug real de exibição — CORRIGIDO agora

`apps/BI/imperio-premios/operacional.html`, linha 168 (antes da correção):

```js
const ordemFunil = ['PageView', 'ViewContent', 'Lead', 'ClickSorteios', 'InitiateCheckout', 'AddToCart', 'Purchase'];
```

As barras do funil são renderizadas NA ORDEM EXATA desse array (confirmado lendo o `.map()` logo abaixo, sem nenhuma ordenação por valor). `InitiateCheckout` estava ANTES de `AddToCart` nessa lista — ou seja, o próprio gráfico mostrava a barra de Iniciar Finalização acima da de Adicionar ao Carrinho, fazendo uma inversão parecer "pior" do que já é, só pela ordem de exibição. Corrigido para a sequência real de e-commerce (`PageView → ViewContent → AddToCart → InitiateCheckout → Purchase`), com `Lead`/`ClickSorteios` (eventos de clique da landing page, não etapas do checkout) movidos pro final, fora da sequência principal.

### 3b. A inversão nos NÚMEROS em si (não só na exibição) — causa real, não bug

Com os dados corretos (`pixel_funil_diario`, 14 dias, hoje):

| Evento | Total |
|---|---|
| PageView | 290.381 |
| ViewContent | 260.161 |
| **InitiateCheckout** | **41.898** |
| **AddToCart** | **30.029** |
| Purchase | 19.584 |

IC ainda é maior que AddToCart mesmo com a ordem certa. Motivo (já investigado e documentado em detalhe no registro do projeto hoje mais cedo): Compra e Iniciar Finalização recebem reforço de DUAS fontes (pixel do navegador + nosso CAPI, que só começou a rodar de verdade ontem à noite), enquanto Add to Cart só tem o pixel — não existe, e nunca vai existir, dado de "carrinho" na API do cliente (o registro do pedido só é criado quando o checkout já começa, com PIX já gerado; confirmado lendo um pedido cru real — não existe um estágio anterior persistido em lugar nenhum). Ou seja: AddToCart não está capturando pouco por erro — ele é estruturalmente o único dos três que NUNCA tem reforço de servidor. Conforme o dedup do IC amadurecer nos próximos dias, a tendência é o número de IC se aproximar mais do valor real (caindo, não subindo), o que deve reduzir essa distância — mas não até zerar, porque o desequilíbrio de cobertura (2 fontes vs 1) é permanente.

---

## 4. Desduplicação de Compra/Iniciar Finalização — garantia realista

**O que está corrigido e validado tecnicamente (2026-10-07/08):**
- `capi_initiatecheckout.py` usa `eventId`, um campo que a própria API do cliente expõe por pedido — testado ao vivo como sendo a MESMA id que o navegador usa.
- Confirmado com 982 pedidos reais: `eventId` presente em **100%** deles, formato correto.
- **`capi_client.py` (Compra) — FIX APLICADO em 2026-10-08:** passou de `event_id = pedido.get("OrderId")` pra `event_id = pedido.get("EventId") or pedido.get("OrderId")`, mesma lógica do InitiateCheckout. Também corrigido `send_backlog.py` (`str_cols` não incluía `EventId` — sem isso, célula vazia no CSV virava `NaN` float em vez de string vazia, e `nan or OrderId` em Python é sempre truthy, então o fallback nunca disparava certo). Validado com 2 testes diretos contra `dados_brutos_completos_3dias.csv`: um pedido com `EventId` real preenchido (gera o event_id certo) e um pedido antigo sem `EventId` (cai no fallback do `OrderId` corretamente). Também confirmado que a ausência de `EventId` em 4.873 de 4.934 linhas do CSV é 100% por causa de serem pedidos de ANTES de 2026-10-07 22:13 (quando o campo passou a ser capturado) — divisão limpa por tempo, não falha intermitente.

**O que eu NÃO posso garantir ainda:** a taxa de cobertura de desduplicação que aparece no Events Manager é calculada sobre uma AMOSTRA que ainda carrega principalmente eventos de antes dos dois fixes. Pra essa métrica realmente confirmar "está deduplicando" nos dois eventos, precisa de alguns dias de volume novo se acumulando. Isso já está registrado como próximo passo de verificação (não-bloqueante) no `gates-status.yaml` do projeto.

---

## 5. Métricas de criativo não batem com o atribuído à conta — quantificado

São **dois sistemas de atribuição completamente diferentes**, e nunca vão bater — isso é esperado por design, não defeito.

**Fonte A — `campanha.ads` (visão por criativo):** vem direto do Meta Ads Insights API (`actions`/`action_values` de cada anúncio). É o algoritmo de atribuição PRÓPRIO da Meta — não sabemos os critérios exatos internos, só que inclui clique E visualização dentro da janela de atribuição configurada no conjunto de anúncios, com um modelo de "qualquer sinal que a Meta julgar suficiente".

**Fonte B — `pedidos`/`canal_diario` (nossa reconstrução):** vem dos pedidos REAIS da API do cliente, cruzados com `fbc` (clique confirmado, com janela de 7 dias de validade) ou `UTM=meta` explícito. É deliberadamente mais rigoroso — só conta o que dá pra provar com dado concreto.

**Comparação real, mesmo período (2026-10-06 a 2026-10-08, os únicos 3 dias que a campanha existe):**

| Fonte | Compras | Valor |
|---|---|---|
| Meta Ads Insights (nativo, por criativo, `campanha.ads` somado) | 1.054 | **R$ 62.906,00** |
| Nossa reconstrução (fbc confirmado + UTM, `valor_atribuido_meta_ads_periodo`) | — | **R$ 3.280,50** |

**~19x de diferença**, no mesmo período exato. Isso bate exatamente com a preocupação que você levantou no início desta conversa ("campanha vale mais que o site") e com o padrão do item 1-3 acima: boa parte dessa diferença provavelmente é a Meta atribuindo à campanha vendas de clientes que já comprariam de qualquer forma (o balde "Meta (pixel, sem clique confirmado)" sozinho soma **R$ 977.728,50** na janela de 14 dias — é receita com ALGUM sinal de Meta mas sem confirmação forte o bastante pro nosso critério; se a Meta credita uma fatia desse balde à campanha internamente, isso sozinho already explicaria a maior parte do gap).

**Conclusão prática:** use a Fonte B (nossa reconstrução) como referência de verdade pra decisão de budget — é conservadora e verificável pedido a pedido. A Fonte A (relatório nativo do Ads Manager) é útil pra comparar criativo A vs criativo B ENTRE SI (ranking relativo), mas não pra acreditar no valor absoluto de ROAS que ela mostra.

---

## Recomendações / decisões que são suas, não técnicas

1. **Excluir "Clientes existentes" do público de prospecção** (ou criar uma campanha separada só pra esse público, orçamento à parte) — é a correção estrutural real pro problema dos itens 1-3. Ninguém deveria estar sendo pago pra "reconquistar" o cliente com 199 pedidos em 14 dias.
2. **Manter a Correspondência Avançada Automática ligada** — o ganho de EMQ supera o efeito de atribuição, e o problema real se resolve no público-alvo, não na medição.
3. ~~Verificar se `capi_client.py` (Compra) precisa do mesmo fix de `eventId`~~ — **feito em 2026-10-08**, ver item 4 acima.
4. **Reconferir a taxa de desduplicação do Events Manager em alguns dias**, quando o volume pós-fix for maior que o volume pré-fix na amostra (agora vale pros dois eventos, Compra e Iniciar Finalização).
5. Ao decidir orçamento/ROAS, **usar `valor_atribuido_meta_ads_periodo` (nossa reconstrução) como referência, não o total somado de `campanha.ads`** — a diferença de 19x do item 5 é grande demais pra ignorar.

---

## 6. Estudo: como tratar a atribuição do segmento "Clientes existentes"

Pesquisa sobre mecanismos reais de mercado (Meta Ads, 2026) pra separar "venda que o anúncio causou" de "venda que ia acontecer de qualquer jeito" — é a pergunta por trás de quase todos os itens acima.

### Prioridade 1 (agora, custo zero) — Audience Controls

Meta lançou **exclusion-only custom audiences** em agosto/2026. Mecanismo: subir a lista de clientes (email, atualizada semanalmente) e colocá-la em **Audience Controls** (regra dura) — **não** em **Suggestions** (sugestão soft que a IA do Advantage+ pode ignorar). Esse é o erro mais comum que anula o esforço: colocar em Suggestions e a campanha continuar mostrando pros mesmos clientes de sempre. Sem risco de política de gambling (é configuração de audiência, não de criativo/copy — não toca em nada que já foi reprovado antes).

### Prioridade 2 (agora, custo zero) — encurtar a janela de atribuição

Confirmado no `gates-status.yaml`: o ad set está em **7 dias de clique**. Encurtar pra **1 dia de clique** reduz diretamente o crédito indevido a quem só "viu" o anúncio dias atrás e comprou organicamente. Aviso: isso faz o **número de conversões reportadas cair** — não porque a realidade piorou, só porque menos coisa vai ser (incorretamente) contada como mérito da campanha. Avisar antes de mexer, pra não causar susto na leitura seguinte.

### Prioridade 3 (verificar disponibilidade) — Customer Lifecycle Strategy

Feature nova de 2026 (substituta do antigo "New Customer Acquisition"), com opção "Acquire new customers only" que a própria Meta aplica automaticamente. Status visto em pesquisa: beta fechado/limitado — **precisa confirmar direto no Ads Manager se a opção aparece pra essa conta.** Se aparecer, é mais robusto que a exclusão manual da prioridade 1.

### Não fazer ainda — Conversion Lift Study / GeoLift

Conversion Lift precisa de orçamento mínimo ~R$1.900/dia pra ter poder estatístico — muito acima do gasto atual (R$412/dia). GeoLift é mais acessível (mede por região, não por usuário), mas ainda prematuro nessa escala. Confirma o que já estava registrado no projeto — não é falta de prioridade, é inviabilidade real no volume atual.

### Pesquisa adicional antes de implementar — sinal `customer_segmentation` no CAPI

Existe um parâmetro da Conversions API pra sinalizar "novo vs. recorrente" direto pro algoritmo de otimização da Meta, de forma consistente com o que `bi_aggregator.py` já calcula sozinho (item 2 acima). Vale a pena, mas a sintaxe exata precisa ser confirmada na documentação oficial da Meta antes de codar — não é urgente comparado às prioridades 1-2.
