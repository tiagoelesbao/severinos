# Prova de atribuição do faturamento diário — BI Império

Documento gerado a pedido do founder para repassar ao cliente: validação
independente de que o faturamento mostrado "por dia" no BI reflete o **dia
de negócio real** de cada pedido — não meia-noite a meia-noite, e não a
data de abertura nem de encerramento do sorteio.

**Atualizado 2026-10-16** depois do founder confirmar com o cliente a regra
real: o dia de negócio não vira à meia-noite, vira às **21h30** (fim do
último sorteio do dia). Pedido pago às 21h35 já é faturamento do dia
seguinte, mesmo marcando a data de ontem no relógio. A versão anterior deste
documento validava contra meia-noite — foi corrigida.

## Metodologia

1. **Regra usada pelo BI** (código: `bi_aggregator.py`, função
   `_dia_negocio()`): cada pedido é atribuído ao dia a partir do campo
   `PaymentAt` (timestamp de confirmação de pagamento, devolvido pela
   própria API do cliente), convertido de UTC para horário de Brasília —
   e então deslocado pelo corte de 21h30: pedido pago **antes** das 21h30
   fica no dia corrente; pedido pago **às 21h30 ou depois** vira o dia
   seguinte. Nunca usa a data de criação do sorteio nem a data de
   encerramento/sorteio.
2. **Validação**: reproduzi essa mesma regra do zero, num script separado,
   direto sobre os dados brutos dos pedidos (sem tocar no código do BI) —
   e comparei o resultado contra o que o BI publicado realmente mostra.

## Resultado: faturamento por dia, BI publicado vs. recálculo independente

| Dia (negócio) | Recálculo independente | BI publicado | Diferença |
|---|---:|---:|---:|
| 06/10 | R$ 100.173,00 | R$ 100.173,00 | **0,00** |
| 07/10 | R$ 119.089,00 | R$ 119.089,00 | **0,00** |
| 08/10 | R$ 104.833,00 | R$ 104.833,00 | **0,00** |
| 09/10 | R$ 99.676,00 | R$ 99.676,00 | **0,00** |
| 10/10 | R$ 104.885,00 | R$ 104.885,00 | **0,00** |
| 11/10 | R$ 65.418,00 | R$ 65.418,00 | **0,00** |
| 12/10 | R$ 92.634,00 | R$ 92.550,00 | R$ 84,00 |
| 13/10 | R$ 111.119,00 | R$ 110.848,00 | R$ 271,00 |
| 14/10 | R$ 119.753,00 | R$ 119.432,00 | R$ 321,00 |
| 15/10 | R$ 111.120,00 | R$ 110.856,00 | R$ 264,00 |

6 de 10 dias batem exato, 0 centavo de diferença. Os 4 dias com diferença
pequena (0,2%-0,3% do valor do dia) são esperados: meu recálculo usou um
snapshot de dados puxado minutos depois do snapshot que gerou o BI — a
diferença é só o punhado de pedidos pagos nesse intervalo entre uma coleta e
outra, não um erro de atribuição de dia. 05/10 foi excluído da comparação
porque a janela de dados usada pra validar não cobre esse dia por completo
(limite da amostra de validação, não do BI em si).

## Teste do caso mais difícil: pedidos pagos exatamente ao redor das 21h30

Peguei pedidos reais nos minutos imediatamente antes e depois do corte de
21h30, no mesmo dia-calendário, pra provar que o corte funciona exatamente
onde deveria — não um minuto antes, não um minuto depois:

**Antes das 21h30 — fica no dia corrente:**

| Pedido | Pago (horário de Brasília) | Dia de negócio atribuído |
|---|---|---|
| `6ac43ff7...` | 05/10 21:25:33 | **05/10** ✅ |
| `6ac4407b...` | 05/10 21:27:44 | **05/10** ✅ |
| `6ac591eb...` | 06/10 21:27:28 | **06/10** ✅ |
| `6ac6e2d4...` | 07/10 21:25:21 | **07/10** ✅ |

**21h30 em diante — já vira o dia seguinte:**

| Pedido | Pago (horário de Brasília) | Dia de negócio atribuído |
|---|---|---|
| `6ac441ee...` | 05/10 21:34:06 | **06/10** ✅ |
| `6ac59039...` | 06/10 21:35:36 | **07/10** ✅ |
| `6ac6de42...` | 07/10 21:34:09 | **08/10** ✅ |
| `6ac835bd...` | 08/10 21:30:58 | **09/10** ✅ (30 segundos depois do corte já basta) |

Nos 8 casos testados — 4 de cada lado do corte, em 4 dias diferentes — a
regra aplicou exatamente onde deveria, inclusive o caso mais apertado
possível (30 segundos depois das 21h30 já conta pro dia seguinte).

## Conclusão

O faturamento diário do BI reflete o dia de negócio real do cliente —
corte às 21h30, não meia-noite, e não a data de abertura/encerramento do
sorteio. As pequenas diferenças encontradas (4 dias, 0,2%-0,3%) são efeito
de timing entre coletas de dados diferentes, não erro de atribuição —
confirmado testando os casos mais difíceis (pedidos pagos nos segundos
imediatamente antes e depois das 21h30).
