# Arquitetura Profissional do BI — Império (documento de referência pra reconstrução)

Pesquisa feita em 2026-10-07 a pedido do founder ("montar BI é uma ciência,
existem teorias e padrões"). Este documento combina 3 corpos de
conhecimento reais (citados) com os dados que já temos em
`bi_aggregator.py`. É pra implementação, não é ensaio.

## 1. Por que o BI atual está errado (não é só estética)

O `index.html` atual é uma pilha de cards+tabelas sem hierarquia — tudo no
mesmo nível visual, misturando dado estratégico (ROAS) com dado tático
(anúncio individual) com dado bruto (lista de canais). Segundo [Stephen
Few, *Information Dashboard Design*](https://www.uxmatters.com/mt/archives/2007/04/book-review-information-dashboard-design.php),
esse é o erro mais comum: tratar "dashboard" como sinônimo de "relatório
com tudo junto". Few define 3 categorias de dashboard, cada uma com
público, cadência e nível de detalhe diferentes — **a causa raiz do "tá
porco" é que estamos tentando servir os 3 públicos na mesma página.**

| Tipo (Few) | Público real do Império | Cadência | Nível de detalhe |
|---|---|---|---|
| **Estratégico** | Founder + cliente (CEO do Império) | Semanal/mensal | KPIs agregados, tendência, sem ruído |
| **Operacional** | Quem opera a campanha no dia a dia | Diário/tempo real | Por campanha/anúncio/conjunto |
| **Analítico** | Quem investiga fundo (nós) | Sob demanda | Cohort, sorteio a sorteio, funil |

Fonte: [Few via SurveySparrow / YellowfinBI, categorização
estratégico/analítico/operacional](https://www.yellowfinbi.com/blog/operational-strategic-or-analytical-dashboard-which-type-best-for-bi).

## 2. Arquitetura de páginas proposta (4 páginas, não 1)

```
apps/BI/imperio-premios/
├── index.html          → redireciona/landing com nav pras 4
├── executiva.html       [ESTRATÉGICO]  — founder + cliente
├── operacional.html     [OPERACIONAL]  — campanhas/anúncios ativos
├── produto.html         [ANALÍTICO]    — sorteios, cohort, ticket
└── qualidade.html       [DIAGNÓSTICO — 4ª categoria, justificada abaixo]
```

A 4ª página (**Qualidade de Dados & Funil**) não é um dos 3 tipos
clássicos de Few — é uma adição justificada pelo contexto específico
deste cliente: o founder já pegou 3 achados reais de dado mentiroso nesta
semana (UTM quebrado, fbc congelado, ROAS inflado por clientes
existentes). Ele pediu explicitamente "quero ver as pendências sumindo e
provas de que o dado é real" — isso é, na prática, um dashboard
operacional *da nossa própria pipeline de tracking*, não do negócio. Fica
separado pra não poluir a visão estratégica com metadado técnico.

### 2.1 — `executiva.html` (Estratégico)

**Princípio de Few aplicado:** máximo 5-7 números na primeira dobra, sem
scroll pra ver o essencial. Tudo o resto é "ver mais".

**KPI Tree** (metodologia [North Star Metric / KPI
Tree](https://www.pmguru.org/insights/kpi-tree-framework/) — 1 métrica no
topo, 3-5 drivers, 2-3 sub-métricas por driver):

```
                    Lucro líquido do mês
                   /          |          \
         MER (eficiência) CAC Novo Cliente   Faturamento total
          Receita/Gasto    (guardrail de      (escala)
                            prejuízo oculto)
```

O **CAC Novo Cliente** como driver de 2º nível — não só decoração — é o
que o achado de 2026-10-07 provou que precisa estar sempre visível: ROAS
agregado de ~7x escondia CAC de novo cliente dando prejuízo. Modelo
[MER vs ROAS vs CAC lidos
juntos](https://eightx.co/blog/mer-roas-cac-marketing-efficiency): nunca
reportar um sem o outro dois.

**Seções (em ordem de hierarquia visual):**
1. 4 cards: Faturamento total · MER · CAC Novo Cliente (vs meta) · Margem de contribuição do período
2. Alerta automático se CAC Novo Cliente > CAC-alvo (calculado do
   ROAS_break_even em brief.yaml) — não é um card bonito, é um
   semáforo vermelho/verde, só aparece quando há problema
3. Tendência semanal (não diária — ruído demais pro nível estratégico) de
   Faturamento vs Gasto vs Lucro
4. Novo vs Recorrente lado a lado (gráfico de barras, não números soltos)
   — exatamente o corte que revelou o achado crítico, promovido a
   cidadão de 1ª classe

**O que NÃO entra aqui:** lista de anúncios, funil do Pixel, detalhe de
sorteio. Isso é operacional/analítico — um CEO não lê CTR.

### 2.2 — `operacional.html` (Operacional)

Essencialmente o conteúdo que já existe hoje no `index.html`, mas
reorganizado com hierarquia: campanha → conjunto → anúncio (estrutura que
já é a do próprio Ads Manager, não inventar outra). Cadência: pensado pra
ser olhado todo dia, atualiza a cada 15min (mesmo ciclo do
`capi_realtime.ps1`).

**Seções:**
1. Status da campanha ativa (gasto hoje, pacing vs orçamento diário)
2. Funil do Pixel (PageView→Purchase) — aqui sim, é operacional
3. Performance por anúncio/criativo (tabela que já existe)
4. Canal de atribuição — aqui, não na executiva (é diagnóstico tático)

### 2.3 — `produto.html` (Analítico)

Tudo que já é "sorteios" no `data.json` atual, mais:
- Ticket médio por canal (Meta Ads vs grupo vs direto)
- Horário/dia da semana com melhor conversão (sazonalidade —
  `bi_aggregator.py` já tem `PaymentAt`, só falta agrupar por hora/dia)
- Cohort simples: de clientes que compraram pela 1ª vez via Meta Ads num
  período, quantos recompraram nos 14/30 dias seguintes (dá pra calcular
  com `Primeira_Compra_Na_Janela` + join por telefone — é literalmente a
  definição de LTV proxy, ver seção 3)

### 2.4 — `qualidade.html` (Diagnóstico — página nova, específica deste cliente)

Isto é o "eu provo que o dado é real" que o founder pediu, permanente, não
um relatório avulso:
- % de pedidos com UTM preenchido (tendência — deve subir após a correção
  de 2026-10-07)
- % de fbc fresco vs expirado nos pedidos recentes (prova que
  `capi_client.py` está filtrando certo)
- Status da última rodada do `capi_realtime.ps1` e `BI-Imperio-Refresh`
  (sucesso/erro, quantos eventos enviados) — lido de `capi_sent_ids_*.json`
  e dos `.log` que os scripts já escrevem
- Checklist de pendências do Events Manager (a lista que o founder quer
  ver "sumindo uma a uma") — manual por ora (sem API pra isso), mas com
  campo de data de resolução

## 3. KPIs financeiros que faltam calcular (fórmulas exatas)

Todos usam campos que já existem no `data.json`/CSVs — nenhum precisa de
fonte nova.

| KPI | Fórmula | Campos de origem |
|---|---|---|
| **CAC Novo Cliente** | `gasto_campanha / meta_ads_novo_cliente.pedidos` | `campanha.daily_insights[].spend`, `pedidos.meta_ads_novo_cliente` |
| **MER (blended)** | `faturamento_total_site / gasto_total_midia_paga` | `pedidos.por_canal_valor` (soma tudo), `campanha.daily_insights` |
| **Margem de contribuição da campanha** | `(valor_atribuido_meta_ads × margem_pct) - gasto_campanha` | `brief.yaml: dados_90_dias.margem_contribuicao` (17,65%), `pedidos.meta_ads_novo_cliente+recorrente`, `campanha.daily_insights` |
| **LTV proxy (90d)** | `SUM(valor de recompras em 90d de uma coorte) / COUNT(clientes da coorte)` | precisa de janela de coleta maior (90d) + `Primeira_Compra_Na_Janela` + chave de cliente (já existe em `client_api.py::extrair_telefone_chave`) |
| **LTV:CAC** | `LTV_proxy / CAC_Novo_Cliente` | os dois acima |
| **Payback (em sorteios, não meses)** | `CAC_Novo_Cliente / ticket_médio_novo_cliente` | `pedidos.meta_ads_novo_cliente.valor / .pedidos` |
| **ROAS atribuído vs ROAS blended** | já calculável, só precisa aparecer **sempre em par**, nunca sozinho | `pedidos.meta_ads_*` vs `pedidos.por_canal_valor` total |

Fonte conceitual: [framework CAC/LTV/payback/contribution
margin](https://horizonmarketing.co/the-marketing-metrics-that-actually-drive-revenue-not-just-traffic/) —
"contribution margin como piso de lucro sob todos os outros [KPIs]".
Nota: o benchmark de mercado "LTV:CAC ideal ≥ 3:1" é prática comum de
SaaS/e-commerce recorrente — **não necessariamente aplicável** a um
negócio de sorteio de ticket baixo e recompra por impulso; usar como
referência, não meta rígida, até termos histórico suficiente pra definir
o número certo deste negócio.

## 4. Implementação técnica (site estático, sem framework — decisão já tomada, mantida)

- `bi_aggregator.py` passa a escrever **4 JSONs** em vez de 1, um por
  página (`data-executiva.json`, `data-operacional.json`,
  `data-produto.json`, `data-qualidade.json`) — mesma função Python, só
  separa o dict final em 4 antes de salvar. Evita que uma página precise
  baixar dado que não usa (ex.: executiva não precisa da lista de 20
  sorteios).
- Nav compartilhada: 1 arquivo `nav.html` (snippet) injetado via
  `fetch('nav.html').then(html => ...)` no load de cada página — evita
  duplicar a barra de navegação em 4 arquivos sem precisar de build step.
- CSS: manter o `:root` de variáveis (tema dourado/escuro já definido) num
  `theme.css` único, importado pelas 4 páginas — isso sim deve ser
  compartilhado, não duplicado.
- Cada página mantém o padrão já validado (fetch do JSON + render via JS
  puro, sem lib) — só muda a ORGANIZAÇÃO do que é renderizado onde.

## 5. O que isso resolve do pedido original

- "Multipáginas separadas por tema" → 4 páginas por tipo de público/uso,
  não por capricho.
- "Ciência de BI" → Few (hierarquia de dashboard) + Kimball (fato vs
  dimensão, aplicado na separação dos JSONs por tema) + KPI Tree (North
  Star → drivers).
- "Ciência de Meta Ads" → MER vs ROAS vs CAC lidos em conjunto, nunca
  ROAS isolado — é a lição direta do achado de 2026-10-07.
- "Ciência financeira de CEO" → margem de contribuição como piso,
  LTV:CAC, payback — vocabulário de CFO, não de growth hacker.

## Fontes

- Few, *Information Dashboard Design* — categorização estratégico/analítico/operacional: https://www.uxmatters.com/mt/archives/2007/04/book-review-information-dashboard-design.php , https://www.yellowfinbi.com/blog/operational-strategic-or-analytical-dashboard-which-type-best-for-bi
- Kimball Group, fact/dimension tables: https://www.kimballgroup.com/2003/01/fact-tables-and-dimension-tables/
- KPI Tree / North Star Metric: https://www.pmguru.org/insights/kpi-tree-framework/
- MER vs ROAS vs CAC: https://eightx.co/blog/mer-roas-cac-marketing-efficiency
- CAC/LTV/payback/contribution margin framework: https://horizonmarketing.co/the-marketing-metrics-that-actually-drive-revenue-not-just-traffic/
