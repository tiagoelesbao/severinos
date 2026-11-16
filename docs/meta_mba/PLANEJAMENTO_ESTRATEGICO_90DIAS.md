# PLANEJAMENTO ESTRATÉGICO — CLIENTE SORTEIOS (BASE DE 90 DIAS)
**Base de dados:** 2.729 sorteios, 164.561 pedidos pagos, 2.100 participantes únicos — extraídos e validados da API real da plataforma do cliente (05/07/2026 a 03/10/2026).
**Metodologia:** Módulo 01 (Unit Economics) do MBA Meta Performance Engineering, adaptado à realidade de sorteios/rifas.
**Este documento substitui o rascunho de 7 dias** (`ESTRATEGIA_CLIENTE_SORTEIOS.md`) como referência principal — a amostra de 90 dias é a base para decisão de campanha.

---

## 1. Resumo Executivo

| Métrica (90 dias) | Valor |
|---|---|
| Faturamento Total | R\$ 9.569.598,00 |
| Custo Total de Prêmios | R\$ 7.498.110,00 |
| Taxa da Plataforma (4%) | R\$ 382.783,92 |
| **Margem de Contribuição** | **R\$ 1.688.704,08 (17,65%)** |
| ROAS Break-Even | **5,67x** |
| Participantes únicos | 2.100 |
| Compras totais | 164.561 (~78 compras/usuário em média) |
| Ticket médio por usuário (90 dias) | R\$ 4.556,95 |

A operação é consistentemente lucrativa (17,65% de MC, alinhado com os 17,01% vistos na amostra de 7 dias — não foi acaso, é o patamar real do negócio). O achado mais importante desta base maior, porém, não é financeiro — é de **comportamento de compra** (seção 3).

---

## 2. Como Ler Margem de Contribuição, ROAS Break-Even e CAC Máximo

Pensa nisso como uma cascata de dinheiro saindo do faturamento, camada por camada:

```
Faturamento total (R$ 9.569.598)
   │
   ├─ Custo do prêmio (R$ 7.498.110)        ← sai primeiro: custo de "entregar a venda"
   ├─ Taxa da plataforma 4% (R$ 382.784)    ← sai também: custo de "processar a venda"
   │
   └─ SOBRA = Margem de Contribuição (R$ 1.688.704 = 17,65% do faturamento)
          │
          ├─ Fatia reservada pro lucro líquido desejado (ex: 10% do faturamento)
          │
          └─ SOBRA = o que pode virar orçamento de mídia (CAC máximo)
```

**MC é o "bolo bruto"** que sobra depois de pagar só os custos que existem porque aquela venda aconteceu. Não é lucro ainda — é o que vai ser repartido entre mídia (pra gerar mais vendas) e lucro líquido.

### 2.1 ROAS Break-Even — de onde o número realmente vem

**ROAS Break-Even (5,67x)** responde: *"pra cada R\$1 gasto em anúncio, quanto de faturamento aquela venda precisa trazer só pra empatar?"* Abaixo de 5,67x, a campanha está gerando vendas que dão prejuízo variável. Acima, cada R\$1 extra de faturamento sobra ~17,65% de MC. **Esse é o número pra olhar em tempo real no Gerenciador de Anúncios.**

Pra entender por que o número é exatamente esse, vale montar a conta do zero. "Empatar" significa: a margem que a venda gerou cobre exatamente o que foi gasto em anúncio pra gerar ela — nem sobra, nem falta.

Se `G` é o quanto se gasta em anúncio e `F` é o faturamento incremental que isso gera, o ponto de empate é:

$$MC\% \times F = G$$

Isolando a razão entre faturamento gerado e gasto — que é exatamente a definição de ROAS:

$$\frac{F}{G} = \frac{1}{MC\%} = ROAS_{BE}$$

**O ROAS break-even não é um conceito separado da Margem de Contribuição — é o inverso dela.** $ROAS_{BE} = Faturamento / MC$ e $ROAS_{BE} = 1/MC\%$ são a mesma fórmula escrita de dois jeitos, porque $MC\% = MC/Faturamento$. No nosso caso: $1 / 0,1765 = 5,67x$.

**Por que isso é contraintuitivo:** como é uma relação de inverso, margem baixa exige ROAS alto, e margem alta tolera ROAS baixo. Essa é a mesma tabela da seção 3.2 do Módulo 01:

| Margem de Contribuição | ROAS Break-Even |
|---|---|
| 70% (infoproduto) | 1,43x |
| 50% (e-commerce padrão) | 2,00x |
| 30% | 3,33x |
| **17,65% (nosso cliente)** | **5,67x** |
| 15% | 6,67x |

Negócio de margem fina precisa que o anúncio "se multiplique" mais vezes só pra cobrir o próprio custo — não é o anúncio que está ruim, é a estrutura de custo do produto que exige mais retorno.

**Dos dois lados da linha:**
- **ROAS real > 5,67x** → a margem gerada (MC% × F) é maior que o gasto de anúncio → sobra dinheiro, é lucro real daquela venda.
- **ROAS real < 5,67x** → a margem gerada é menor que o gasto → prejuízo, mesmo que o faturamento da campanha pareça positivo no relatório. É a armadilha de olhar só faturamento e achar que está indo bem.

**Atenção a um limite importante:** esse 5,67x cobre só os custos variáveis da venda (prêmio + taxa de 4%) — não inclui custo fixo da operação (equipe, ferramentas, estrutura). Rodar exatamente em 5,67x significa que aquela venda específica não deu prejuízo variável, não que a empresa inteira bateu o próprio ponto de equilíbrio (isso exigiria somar custo fixo total à conta, um cálculo diferente).

**E o break-even muda por tipo de sorteio**, porque a margem muda (ver seção 6):

| Tipo de sorteio | Margem | ROAS Break-Even |
|---|---|---|
| Pequeno (recorrente) | 33,1% | **3,02x** |
| Médio | 19,0% | **5,26x** |
| Jackpot | 17,0% | **5,88x** |

O 5,67x do resumo executivo é a média ponderada do site inteiro. Uma campanha promovendo especificamente um sorteio pequeno pode ser lucrativa com ROAS de 3x; a mesma verba numa campanha de jackpot só vira lucro acima de 5,88x. Vale calcular o break-even por campanha de acordo com qual produto ela está empurrando, não usar só o número médio.

**CAC Máximo** é o teto de **orçamento total de mídia** (não custo por cliente) que cabe sem furar a meta de lucro líquido:

$$CAC_{max} = MC - (Faturamento \times \%ML_{desejada})$$

Pra virar custo-por-cliente (referência de CPA/lance no Gerenciador), divide pelo número de clientes novos que a verba precisa trazer.

---

## 3. CAC Máximo por Meta de Margem Líquida (90 dias)

| Meta de Margem Líquida | CAC Máximo (orçamento total/90 dias) | Viável? |
|---|---|---|
| 20% | R\$ -225.215,52 | ❌ Não — MC (17,65%) é menor que a meta |
| 15% | R\$ 253.264,38 | ✅ Sim, margem de manobra apertada |
| 10% | R\$ 731.744,28 | ✅ Sim, confortável |
| 5% | R\$ 1.210.224,18 | ✅ Sim, generoso |

Numa base de 90 dias, isso dá ≈ R\$2.814–13.447/dia de orçamento de mídia dependendo da meta escolhida (10% a 15%). **Decisão de negócio pendente com o cliente: qual meta perseguir.**

---

## 4. O Achado Mais Importante: Concentração Extrema em Poucos Clientes

Na base de 90 dias (muito mais robusta que a amostra de 7 dias pra esse tipo de leitura):

> **Os 10% maiores compradores (210 pessoas) respondem por 85,3% de todo o faturamento (R\$ 8.163.309,00 de R\$ 9.569.598,00).**

O maior comprador sozinho gastou **R\$ 499.499,00 em 90 dias, em 1.292 compras** (~14 compras/dia). Os 10 maiores compradores somados:

| Nome | Gasto (90d) | Compras | Canal Principal |
|---|---|---|---|
| Michel Roberto De Brito | R\$ 499.499,00 | 1.292 | Meta (pixel, sem clique) |
| Marcelo Viscome | R\$ 355.503,50 | 1.749 | Meta (pixel, sem clique) |
| Alexandro Chichmanian | R\$ 280.244,50 | 2.148 | Direto/Orgânico |
| Veridiana Tonon Vieira | R\$ 251.883,00 | 1.163 | Meta (pixel, sem clique) |
| Regia Silva | R\$ 249.429,00 | 892 | **Meta Ads (clique confirmado)** |
| Guilherme Alves Rodrigues | R\$ 238.449,50 | 2.347 | Meta (pixel, sem clique) |

**O que isso muda na estratégia de mídia:**

1. **CAC uniforme é a métrica errada pra otimizar.** Um cliente "mediano" pode valer R\$200 em 90 dias; um whale vale R\$499 mil. Pagar R\$150 de CAC faz sentido pra um e é irrisório pra outro — a decisão certa é **otimizar por valor**, não por volume de conversão.
2. **Recomendação de configuração de campanha:** usar objetivo de **Vendas com otimização por valor** (Advantage+ Shopping / `optimization_goal: VALUE`, não `OFFSITE_CONVERSIONS` puro) para que o algoritmo do leilão já priorize perfis parecidos com compradores de alto valor, não só qualquer comprador.
3. **A lista `audiencia_alto_valor_90dias.csv` (420 contatos, top 20% por valor) é o ativo mais valioso que temos agora** — ela deve virar público-semente de Lookalike 1-3% com otimização por valor. É provavelmente a alavanca de maior impacto no ROAS real de campanha.
4. Pelo menos 2 dos 6 maiores compradores já vieram de clique confirmado de anúncio Meta (Regia Silva) ou tem Meta como canal dominante — ou seja, **a Meta já está entregando esse perfil organicamente/via pixel**, reforça a tese de que Advantage+ com otimização por valor tende a funcionar bem aqui.

---

## 5. Diagnóstico de Atribuição de Tráfego (90 dias)

| Canal | Faturamento | % | Pedidos |
|---|---|---|---|
| Meta (pixel, sem clique confirmado) | R\$ 6.509.343,00 | 68,0% | 112.845 |
| **Meta Ads (clique confirmado)** | R\$ 2.343.793,00 | 24,5% | 42.092 |
| Direto/Orgânico/Desconhecido | R\$ 712.508,00 | 7,5% | 9.574 |
| UTM: fb | R\$ 2.979,00 | 0,03% | 13 |
| UTM: ig | R\$ 156,00 | 0,002% | 2 |
| Afiliado | R\$ 819,00 | 0,01% | 35 |

- **R\$ 2.343.793,00 em 90 dias é faturamento com clique de anúncio Meta confirmado** — o número "duro" pra cruzar com o Gerenciador de Anúncios.
- Existem pedidos pontuais com UTM `fb`/`ig` preenchida — ou seja, **em algum momento alguém já tentou taggear alguns links**, mas de forma inconsistente (só 15 pedidos em 90 dias de 164 mil). Reforça a recomendação: padronizar UTM automático em 100% dos links de campanha antes de escalar.
- O bucket "Meta pixel sem clique" (68%) é majoritariamente a base recorrente de altíssima frequência descrita na seção 4, comprando direto via app/bookmark — não é tráfego pago "perdido", é comportamento normal de base fiel.

---

## 6. Portfólio de Sorteios: Onde Alocar o Budget

| Porte do Prêmio | Qtd. Sorteios | Faturamento Total | Margem Média |
|---|---|---|---|
| Pequeno (até R\$1k) | 1.081 | R\$ 882.252,00 | **33,1%** |
| Médio (R\$1k–5k) | 1.294 | R\$ 4.206.601,00 | 19,0% |
| Jackpot (acima de R\$5k) | 354 | R\$ 4.480.745,00 | 17,0% |

Confirma o padrão visto na amostra de 7 dias, agora com base sólida: **sorteios pequenos têm quase o dobro da margem percentual dos jackpots**, mas jackpots concentram mais volume absoluto de faturamento. Isso não muda a recomendação: usar jackpots para alcance/captação de lista, concentrar budget de conversão nos sorteios recorrentes de menor porte.

Apenas 9 de 2.729 sorteios (0,3%) fecharam com lucro negativo — irrelevante no agregado, não é um padrão a corrigir.


---

## 7. Guia de Setup das Primeiras Campanhas

Assumindo compliance resolvido (seção 7) e meta de margem líquida definida com o cliente (seção 3):

1. **Estrutura ODAX**: objetivo `OUTCOMES_SALES`, otimização por **valor de compra** (não por volume), evento de conversão `Purchase` com parâmetro `value`.
2. **Conjunto 1 — Advantage+ Audience / Prospecção ampla**: deixar o leilão encontrar perfis, com teto de orçamento diário calculado a partir do CAC máximo da meta escolhida (seção 3) dividido por 90 (ou pelo horizonte da campanha).
3. **Conjunto 2 — Lookalike de Alto Valor**: público-semente = `audiencia_alto_valor_90dias.csv` (420 contatos, top 20% por gasto), Lookalike 1-3%, otimização por valor. Prioridade alta — é o público com maior chance de replicar os padrões de whale da seção 4.
4. **Exclusão de recompra**: usar `audiencia_recompra_90dias.csv` (1.538 contatos) como público de exclusão nas campanhas de aquisição (já são clientes recorrentes, não vale pagar CAC de novo por eles) — ou isolar num conjunto separado de reativação/retenção com orçamento próprio, menor.
5. **Criativos**: priorizar oferta dos sorteios recorrentes de menor porte (seção 6) nos anúncios de conversão direta; usar os jackpots como gancho de alcance/awareness, não como CTA principal de compra.
6. **UTM obrigatório em todos os links** desde o dia 1 da campanha (seção 5) — sem isso, não dá pra saber qual conjunto/anúncio específico puxou qual parte dos R\$2,34M de faturamento confirmado.

### KPIs para acompanhar desde a semana 1

| KPI | Meta / Linha de corte | Onde olhar |
|---|---|---|
| ROAS de campanha | > 5,67x (break-even) | Gerenciador de Anúncios, diário |
| Orçamento acumulado de mídia | Não ultrapassar o CAC máximo da meta escolhida | Acompanhamento manual/planilha |
| % de pedidos com `fbc` preenchido | Crescendo em relação aos 24,5% atuais | Re-rodar `relatorio_canais` periodicamente |
| CPA (custo por novo comprador) | Vs. CAC máximo por cliente (orçamento ÷ meta de novos clientes) | Gerenciador + cruzamento com `lista_unificada` |
| Ticket médio dos novos clientes adquiridos por ads | Comparar com R\$ 4.556,95 (média geral) — sinaliza se está trazendo "whales" ou só volume barato | `lista_unificada_90dias.csv` filtrado por `Comprou_Via_Anuncio` |

---

## 8. Decisões Pendentes com o Cliente

1. Qual meta de margem líquida perseguir (10%, 15%)? Define o CAC máximo real disponível (seção 3).
2. A taxa de 4% é fixa independente do método de pagamento (PIX vs cartão)?
3. Existe imposto não contabilizado separadamente?
4. Aprovar a priorização de budget em sorteios recorrentes (seção 6) vs. a estratégia atual do cliente (se houver uma).

---

## 10. Arquivos de Referência Gerados

- `dados_brutos_completos_90dias.csv` — 164.561 pedidos, linha a linha, com atribuição.
- `detalhes_sorteios_90dias.csv` — 2.729 sorteios com prêmio/faturamento/lucro.
- `lista_unificada_90dias.csv/.xlsx` — 2.100 participantes unificados, canal, E.164.
- `relatorio_canais_90dias.csv` — faturamento por canal de atribuição.
- `relatorio_financeiro_90dias.csv` — métricas financeiras + cenários de CAC máximo.
- `audiencia_alto_valor_90dias.csv` (420 contatos) / `audiencia_recompra_90dias.csv` (1.538 contatos) — prontos para upload em Públicos Personalizados do Meta Ads Manager.
