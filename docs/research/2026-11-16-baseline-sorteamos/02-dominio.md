# 02 — O modelo de domínio da Sorteamos

> No vocabulário do cliente, não no do código. Quando o nome técnico divergir do nome que o
> operador usa, os dois aparecem — e **o nome do cliente é o que manda na interface.**
> Procedência marcada termo a termo. Legenda em [`00-INDICE.md`](00-INDICE.md).

---

## O glossário, em uma passada

| O cliente chama | O código chama | É |
|---|---|---|
| **Sorteio** (ou *rodada*, ou *rapidinha*, ou *campanha*) | `product` | a unidade de venda: um lote de títulos numerados com um prêmio no fim |
| **Título** | `number` / `numbers` | um número vendável dentro de um sorteio |
| **Compra** | `order` | o pedido de um comprador: N títulos, um valor, um status |
| **Reserva** | `status: waiting-payment` | título separado para alguém que ainda não pagou |
| **Participante** | `user` | quem compra |
| **Baixa** | `approvedBy` | o ato de marcar a compra como paga |
| **Prêmio** | `awards` | o que o ganhador leva |
| **Ganhador** | `winners` | quem levou |
| **Afiliado** | `affiliate` | quem revende e ganha comissão |
| **Capitalizadora** | — | a empresa regulada que dá lastro jurídico ao sorteio |

---

## 1. Sorteio

**O que é.** Um lote fechado de títulos numerados, com preço unitário, com um ou mais prêmios
declarados, e com uma data/hora de sorteio. É a unidade econômica de tudo: faturamento, prêmio,
margem e giro são medidos **por sorteio**.

**Como o cliente nomeia.** Os títulos dos sorteios reais seguem o padrão
`{N}° RAPIDINHA VALENDO R$ {valor} {complemento}!` — com ordinal, com o valor do prêmio no
próprio nome, e com variações de grafia que importam (ver §10). Há numeração de *edição*
("7º EDIÇÃO"). `[AMOSTRA]`

**O ciclo de vida.** `[PROD]`

```
(criado)  --->  active  --->  done
                  |
                  +-------->  canceled / cancelled   [DEFENSIVO — grafia dupla no nosso código,
                                                      nunca confirmada ao vivo]
```

Não há `draft` observado. O lotemania inventou `draft` e `finished` — ver `04-lacunas.md`.

**A regra que não é óbvia.** `[PROD]`, achado 2026-10-15: **`active` não quer dizer "tem título
à venda"**. Um sorteio com data de sorteio já vencida continuava `active`. Disponibilidade real
é `numbersConfig.qtyFree > 0`. O backend demora a virar o status. Quem construir a vitrine do
lotemania precisa decidir disponibilidade por contagem de títulos livres, não por status.

**Escala típica de uma rodada.** `[PROD]`, via `bi_aggregator.py`: `qty` tipicamente **100**
títulos, `max` por pedido **25**. O ciclo de vida é curto — a métrica `horas_ate_esgotar` existe
porque esgotar é o caso normal, não a exceção.

**Ordem de grandeza da operação.** `[RELATO]` — números declarados em
`apps/lotemania/README.md` como medidos no BI do Império nos últimos 7 dias. **Não recalculei.**
Tratar como ordem de grandeza, não como número auditado:

- 177 rodadas, 174 esgotadas, 100 títulos cada
- esgotamento típico em 1,8 h; o mais rápido em 18 min (~5,5 títulos/minuto)
- 10.550 compras pagas, R$ 639.325, ticket médio R$ 61
- **5 rodadas ativas simultâneas**, sorteando no mesmo horário

O que isso implica para o sucessor: o gargalo **não é volume de dados**, é **contenção** — cem
títulos finitos esgotando em minutos.

---

## 2. Título

**O que é.** Um número. O cliente chama de **título** (vocabulário de capitalização, não de
rifa), e é esse o nome que aparece no painel: "Títulos", "Títulos Premiados", "Quantidade de
títulos".

**Formato.** String de **2 dígitos** com zero à esquerda (`"07"`, `"19"`, `"49"`) numa rodada de
100 títulos. `[PROD]` — confirmado ao vivo 2026-10-08. Guardar como string, não como int: o zero
à esquerda é parte da identidade visual do título.

**Os três estados.** `[PROD]`, derivados de `numbersConfig`:

| Estado | Contador | Significado |
|---|---|---|
| livre | `qtyFree` | à venda |
| reservado | `qtyReserved` | separado para alguém que não pagou ainda |
| pago | `qtyPaid` | vendido |

`qtyFree + qtyReserved + qtyPaid` deve fechar com `qty`. **Não verifiquei essa identidade** —
é `[INFERIDO]` da semântica dos nomes.

**Escolha consciente.** O comprador **escolhe** os títulos: o pedido carrega `numbers` com uma
entrada por título, e o painel oferece (por configuração) um modo de seleção aleatória como
alternativa. É a única fonte de "qual número a pessoa quis" que o produto tem — alimenta teste de
uniformidade e mapa de números frios no BI. `[PROD]`

---

## 3. Compra

**O que é.** Um pedido: um participante, um sorteio, N títulos, um valor, um status, um
pagamento. É a linha do export de 25 colunas.

**O ciclo de vida.** `[PROD]` — os três status confirmados ao vivo:

```
waiting-payment  ---(pagamento confirmado)--->  paid
       |
       +---------(prazo venceu)------------->  expired
```

**O que "iniciar checkout" significa aqui.** `[PROD]`, achado 2026-10-07: consultar o endpoint
de pedidos com `filterStatus="all"` devolve também `waiting-payment` e `expired` — ou seja,
**todo checkout iniciado**, não só o que terminou pago. A plataforma **não** tem um momento de
"carrinho" distinto de "checkout iniciado": a auditoria de 2026-10-10 registra que o evento
`AddToCart` não tem equivalente de servidor porque **a API não expõe esse momento**. Reserva e
início de checkout são o mesmo ato.

**O preço fica congelado na compra.** `[PROD]`. O pedido carrega `price` (unitário) além de
`total`, porque **o preço do sorteio pode ser editado no meio da vida da rodada** — a compra
guarda o preço que aquele comprador pagou. Qualquer recálculo de faturamento tem que usar o
preço do pedido, não o do produto.

---

## 4. Reserva

**O que é.** O título sai de `livre` e fica separado para um comprador por um prazo. Se ele não
paga, volta para `livre`.

**O prazo.** Vem configurado **por sorteio**, em `numbersConfig.expirationSeconds`. `[PROD]` — é
parâmetro de rodada, não constante global. O valor típico em produção não foi registrado: o
nosso código só lê o campo e o grava no BI. `[NÃO OBSERVADO]`

**Quem executa a expiração.** `[NÃO OBSERVADO]`. Não sabemos se há job agendado varrendo
reservas vencidas, se a expiração é avaliada na leitura, ou se o campo `expiredBy` registra qual
dos dois aconteceu. O campo `expiredBy` existe e é capturado (`[PROD]`), mas **os valores que ele
assume são desconhecidos** — e é exatamente aí que a resposta está.

**Anti-abuso.** O painel tem uma aba "Anti Spam" por sorteio (`[BRIEFING]`, via a lista de 14
abas do editor). O mecanismo — contar reservas não pagas consecutivas e bloquear o comprador — é
`[INFERIDO]` do que o clone implementou, **não** observado na Sorteamos.

---

## 5. Baixa: automática contra manual

Este é o conceito mais específico do negócio, e o mais fácil de implementar errado.

**Baixa automática.** O gateway confirma o PIX, a plataforma marca a compra como paga.
`approvedBy` fica com o nome do gateway: `paysure` ou `pay2m`. `[PROD]`

**Baixa manual.** `[PROD]`, achado 2026-10-17 a pedido do cliente:

> Quando um título **não vende organicamente** até o sorteio fechar, um admin marca a compra como
> paga **na mão**, e `approvedBy` fica `"admin"` em vez do nome de um gateway real.

**Por que isso existe.** Uma rodada de 100 títulos precisa dos 100 vendidos para sortear. O que
não vendeu, o operador "compra" — e o título entra no sorteio como qualquer outro.

**Medido ao vivo:** 647 títulos em 10 dias / 295 sorteios, e **11 casos em que o título de baixa
manual ganhou o prêmio do dia**. `[PROD]`

**A consequência contábil, e é uma armadilha.** `[PROD]`: o valor da baixa manual **já está
dentro do faturamento** — ela conta como compra paga. O campo `approvedBy` só permite
**separar depois**, na visualização. Qualquer tela de faturamento que não separe os dois
reporta como receita de cliente aquilo que foi o próprio operador fechando o lote.

É por isso que o modal **Faturamento** do painel separa baixa automática de baixa manual
(`[BRIEFING]`) — e é por isso que o lotemania, que não tem o campo, **não pode** construir essa
tela.

---

## 6. Prêmio e ganhador

**Prêmio** (`awards`) é uma **lista de strings em texto livre** com valores em reais, não um
valor estruturado. `[PROD]` Um sorteio pode ter vários prêmios (o campo `premios_qtd` do BI
conta). O título do sorteio normalmente repete o valor do prêmio principal.

**Ganhador** (`winners`) é uma lista de objetos com **`number`** (o título vencedor) e
**`award`** (o prêmio que ele levou). `[PROD]` O BI usa isso para montar o mapa
`título -> valor do prêmio` por rodada e contar ganhadores declarados.

**Quem decide o número vencedor é externo.** `[PROD]`: a descrição dos sorteios lista os horários
de extração do **PT-Rio** (banca "Para Todos", Rio de Janeiro) — PPT 09:35, PTM 11:35, PT 14:35,
PTV 16:35, PTN 18:35 (quartas e sábados 20:25 pela Federal), COR 21:45. Confirmado nas descrições
de **todos os 363 sorteios** de uma janela analisada, e batem com o calendário público da banca.

Isso define o domínio de um jeito que o clone precisa respeitar: **o sorteio não gera o número
vencedor, ele o importa.** O operador registra o resultado de uma loteria externa. O painel
oferece, por configuração, um mecanismo manual e um por loteria — `[INFERIDO]` do clone
(`drawMechanism: manual | lottery`), **não** confirmado na Sorteamos.

**Títulos Premiados** é outra coisa. `[BRIEFING]` — existe como aba do editor de sorteio e como
ação do menu ("Ativar títulos premiados"). É prêmio instantâneo atrelado a títulos específicos,
revelado na compra, independente do sorteio principal. **Mecanismo `[NÃO OBSERVADO]`.**

---

## 7. Participante

**O que é.** Quem compra. O painel chama de **Participante** nas telas de relatório e de
**Usuário** na tela de cadastro — dois nomes para a mesma entidade, dependendo do contexto.
`[BRIEFING]` (os dois nomes aparecem na barra lateral e no menu de ações).

**Como ele se identifica.** `[PROD]`: **o login é o próprio telefone.** O campo `userId.login`
carrega o telefone. Isso define o cadastro mínimo: telefone identifica a pessoa.

**Preenchimento real dos campos de identidade**, medido ao vivo (`[PROD]`):

| Campo | Preenchimento |
|---|---|
| nome | 100% |
| telefone | 100% (e já vem normalizado em E.164) |
| país | 100% (sempre `br` — a plataforma só opera no Brasil) |
| e-mail | ~36,5% a 39,5% |
| CPF | ~18,8% |

A leitura disso: existe **checkout rápido só com telefone** e **cadastro completo** com e-mail e
CPF, e a maioria usa o rápido. O export de 25 colunas tem ainda **Nome Social** e **Data de
Nascimento**, que o nosso ETL nunca leu — o que sugere um formulário de cadastro completo mais
longo do que o que vemos pela API. `[INFERIDO]` do contrato de export.

---

## 8. Afiliado e link de desconto

**Afiliado.** Quem revende e ganha comissão. Cada compra carrega `affiliate` (o código do
afiliado) — é a coluna "Código do Afiliado" do export. `[PROD]` Há também `primeAffiliate`, cuja
semântica é **`[NÃO OBSERVADO]`** (segundo nível? afiliado principal? plano premium?). É um dos
itens de investigação de `05`.

A afiliação é **habilitável por sorteio**: o editor tem uma aba "Afiliados". `[BRIEFING]`
A taxa de comissão, o fluxo de saque e o painel do próprio afiliado são `[NÃO OBSERVADO]`.

**Link de desconto.** Item próprio da barra lateral ("Links De Desconto"). `[BRIEFING]`
O que ele faz exatamente — percentual? quantidade fixa de títulos? limite de uso? checkout
direto? — é `[NÃO OBSERVADO]`. O clone implementou sete parâmetros (código, percentual, tipo de
checkout, quantidade, mínimo, limite de uso, limite por usuário), mas **isso é desenho do clone**,
não observação da Sorteamos.

---

## 9. Capitalizadora

**O que é.** A empresa regulada que dá lastro jurídico ao sorteio. No Brasil, sorteio com compra
de título é produto de **capitalização**, regulado pela **SUSEP**, e precisa de número de
processo.

**O que sabemos.** Que existe como item da barra lateral e como aba do editor de sorteio
("Capitalizadora"). `[BRIEFING]` Que é vinculada **por sorteio**, não só globalmente — porque é
aba do editor.

**O que não sabemos.** Que campos tem o cadastro, se o número de processo SUSEP é exibido na
loja, se há mais de uma por operador, e se há validação. `[NÃO OBSERVADO]`

Esta é uma área onde **não** se deve inferir a partir do clone: o clone tem
`susepProcessNumber`, `terms` e `isActive`, mas isso foi escolha de quem o escreveu.

---

## 10. Economia da rodada

O modelo financeiro que o nosso BI usa contra esta plataforma — vale como baseline porque foi
validado contra o planejamento real do cliente. `[PROD]`

| Conceito | Definição | Valor |
|---|---|---|
| **Receita potencial** | `qty × price` — o que a rodada renderia esgotada | — |
| **Faturamento** | soma dos pedidos pagos | — |
| **Taxa de plataforma** | fatia que a plataforma cobra sobre o faturamento | **5%** (era 4% até 2026-10-15) |
| **Prêmio total** | soma de `awards` | — |
| **Lucro** | faturamento − taxa − prêmio | — |
| **Payout** | prêmio / receita potencial — a fatia que volta ao jogador | observado entre **50% e 89,6%** |
| **Giro** | lucro por hora que a rodada ficou aberta | a única métrica que compara uma rapidinha de R$ 3 com um jackpot |

Duas notas de fidelidade, as duas `[PROD]`:

**A taxa de 5% é cobrança da plataforma, não imposto nem COGS.** O modelo antigo (sintético, com
COGS e impostos) foi descartado por não bater com o planejamento real do cliente.

**O prêmio entra sem desconto.** Registrado explicitamente no código: "awards entra SEM desconto
— não inventamos custo que a API não dá".

### A armadilha de parsing que custa dinheiro

`[PROD]`: o cliente **grafa o zero como a letra O** nos títulos e nas descrições de prêmio
(`VALEND0`, `R$ 1.OOO`). Qualquer parser de valor precisa normalizar `O -> 0` antes de converter.
A regra de desempate em produção: se o valor extraído do título for **>= 10x** a soma de
`awards`, vale o do título; senão vale `awards`.

---

## 11. O resto do domínio, nomeado mas não conhecido

Tudo aqui é `[BRIEFING]` quanto à **existência** e `[NÃO OBSERVADO]` quanto ao **comportamento**.
Está listado para que nenhum deles seja esquecido nem inventado.

| Conceito | O que se sabe | O que falta |
|---|---|---|
| **Banco** | item de barra lateral ("Bancos") | é conta bancária do operador? extrato? saque de afiliado? as três coisas? |
| **Relatório** | item de barra lateral + 5 relatórios no menu do sorteio | formato, colunas, se exporta CSV |
| **Contato** | item de barra lateral | é formulário de suporte da loja? lista de leads? |
| **Integração** | item de barra lateral | quais provedores, que credenciais |
| **Comunicado** | item de barra lateral | aviso para a equipe ou para o participante? onde aparece |
| **Pergunta Frequente** | item de barra lateral | ordenação, visibilidade |
| **Analytics** | item de barra lateral | que métricas, que período |
| **Certificado** | nomeado na barra lateral do clone, não na da Sorteamos | é domínio próprio com SSL? certificado de capitalização? **ambíguo e importante** |
| **Filantropia** | idem | destinação de parte da arrecadação |
| **Upsell / Promoções / Alertas** | abas do editor de sorteio | mecanismo nenhum conhecido |
| **Jogos bônus** (caixa premiada, roleta, raspadinha) | **não aparecem** em nenhuma evidência da Sorteamos | o clone os implementou. **Pode ser invenção do clone** — ver `04-lacunas.md` |
