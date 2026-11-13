# Como medir o retorno — Academia Simmus

O problema de anúncio para negócio local é sempre o mesmo: o Facebook sabe quantas **conversas**
começaram, mas não sabe quem **matriculou** — isso acontece dentro da academia, offline. Sem
ligar as duas pontas, "funcionou" vira opinião.

A ligação é feita por duas coisas, e nenhuma delas é complicada.

---

## As duas pontas

### Ponta 1 — a frase do anúncio (automática, zero esforço)

Todo clique no anúncio abre o WhatsApp **já com esta frase digitada**:

> "Oi! Vi o anúncio e quero conhecer o programa de emagrecimento."

Quem chega com essa frase veio do anúncio. Quem chega com "oi, bom dia" veio do orgânico, da
placa, da indicação. Pronto — a origem está resolvida sem app, sem integração, sem custo.

Reforço: **etiquete a conversa** no WhatsApp Business com a etiqueta `Anúncio Nov`. Leva 2
segundos e deixa a lista filtrável depois.

### Ponta 2 — a planilha (1 linha por conversa)

`leads-simmus.csv` — importar no Google Sheets e compartilhar com o dono.

Preencher **uma linha assim que a conversa chega** (não deixe para o fim do dia, some), e voltar
na linha quando a pessoa visita e quando matricula.

| Coluna | Quem preenche | Quando |
|---|---|---|
| Data, Hora, Nome, 4 últimos do telefone | quem atende | na hora que a conversa chega |
| Veio do anúncio? | quem atende | pela frase automática |
| Objetivo declarado | quem atende | resposta do Passo 2 do roteiro |
| Respondido em (min) | quem atende | **a métrica que mais prevê matrícula** |
| Agendou? / Data da visita | quem atende | ao fechar o horário |
| Compareceu? | recepção | no dia |
| Matriculou? / Plano / Valor pago | recepção | no fechamento |

> **Telefone:** só os 4 últimos dígitos. A planilha vai ser compartilhada — número completo de
> cliente não precisa circular em arquivo compartilhado.

---

## Os números do relatório

Com a planilha preenchida e o print do Gerenciador, os seis números do relatório saem sozinhos:

| Indicador | Conta | O que diz |
|---|---|---|
| **Custo por conversa** | verba gasta ÷ conversas iniciadas | Se a mídia está cara ou barata |
| **Taxa de agendamento** | agendou ÷ conversas | Se o roteiro de WhatsApp funciona |
| **Taxa de comparecimento** | compareceu ÷ agendou | Se a confirmação de véspera está sendo feita |
| **Taxa de matrícula** | matriculou ÷ compareceu | Se o fechamento na academia funciona |
| **Custo por matrícula (CPA)** | (verba + R$ 200) ÷ matrículas | **O número que decide tudo** |
| **Retorno do ciclo** | receita das matrículas ÷ R$ 452 | Quanto voltou pra cada real |

### O limiar

**Custo por matrícula abaixo de uma mensalidade = a campanha se paga no primeiro mês.**

Com mensalidade em [CONFIRMAR: valor — usando R$ 150], o teto é R$ 150 por matrícula.
Abaixo disso, continuar é decisão óbvia. Acima, precisa ajuste antes de colocar mais dinheiro.

### O número que o dono esquece

Matrícula não vale uma mensalidade — vale a mensalidade **vezes os meses que o aluno fica**.
Pergunte ao dono: *"em média, quantos meses um aluno novo fica aqui?"* [CONFIRMAR com o dono].

Se a resposta for 4 meses, cada matrícula de R$ 150 vale R$ 600, não R$ 150. É esse número que
justifica investir mais verba no ciclo 2 — e ele só existe se alguém perguntar.

---

## Fórmulas para colar no Google Sheets

Assumindo os dados a partir da linha 2 e as colunas do CSV:

```
Conversas do anúncio    =CONT.SE(E:E;"Sim")
Agendamentos            =CONT.SES(E:E;"Sim";H:H;"Sim")
Compareceram            =CONT.SES(E:E;"Sim";J:J;"Sim")
Matrículas              =CONT.SES(E:E;"Sim";K:K;"Sim")
Receita mês 1           =SOMASE(K:K;"Sim";M:M)
Tempo médio de resposta =MÉDIA(G:G)

Custo por conversa      =252/Conversas
Custo por matrícula     =(252+200)/Matrículas
Retorno do ciclo        =Receita/452
```

---

## O diagnóstico de uma olhada

Quando o resultado vier fraco, **o lugar onde o funil vaza diz o que consertar** — e quase sempre
não é onde o dono acha:

| Sintoma | Causa provável | O que mexer |
|---|---|---|
| Poucas conversas, verba toda gasta | Criativo ou público | Trocar o ad de pior desempenho, abrir o raio |
| Muitas conversas, poucos agendamentos | Roteiro de WhatsApp ou demora | Olhar "Respondido em (min)". Acima de 30 min, o problema é esse |
| Agenda cheia, ninguém aparece | Falta confirmação de véspera | Implantar o Passo 6 do roteiro |
| Todos aparecem, ninguém matricula | Fechamento presencial ou preço | **Não é problema de anúncio.** Mexer na campanha aqui é desperdício |

---

## Modelo do relatório de 1 página

```
RELATÓRIO SIMMUS — DIA [7/14]

Investido: R$ ___ (verba) + R$ 200 (setup)

Conversas do anúncio ......... ___    Custo por conversa ..... R$ ___
Visitas agendadas ............ ___    Taxa de agendamento .... ___%
Compareceram ................. ___    Taxa de comparecimento . ___%
MATRÍCULAS ................... ___    Custo por matrícula .... R$ ___

Receita do mês 1 ............. R$ ___
Projeção com [N] meses de permanência .... R$ ___

Melhor criativo: ______________
O que vou mudar na próxima semana: ______________
O que preciso de você: ______________
```
