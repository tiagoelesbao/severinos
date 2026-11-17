# ADR-0001 — A meia cota é uma linha, não uma coluna

**Status:** Aceito
**Data:** 2026-11-17
**Decisores:** founder (decisão) · @aiox-master (condução do grilling)
**Contexto da decisão:** sessão de `/grill-with-docs` sobre a meia cota do lotemania, 17 decisões
**Afeta:** `LTM-01`, `LTM-02`, `LTM-03a`, `LTM-04`, `LTM-05`, `LTM-07`, `LTM-08` (Frente C) do `EPIC-LTM-Imperio-Migration`
> `LTM-04` acrescentada em 2026-11-17 (@po): é nela que o custo aceito de `quantity` aterrissa — o
> ETL lê `numbers` com `len == quantity` (`client_api.py:455-465`) e `bi_aggregator.py:1099` soma
> `"Quantidade"`. A lista original não a citava.

---

## Contexto

O Império pediu **meia cota**: cada título de um sorteio pode ser comprado inteiro por uma pessoa
ou em duas metades por duas pessoas, que dividem o prêmio. A razão de negócio é baixar a barreira
de entrada para viabilizar prêmios de 100 mil e 200 mil sobre os mesmos 100 títulos.

O modelo atual tem uma propriedade que não é acidental e que sustenta a correção do sistema
inteiro:

```sql
UPDATE product_numbers
   SET status = 'reserved', order_id = $1, reserved_until = $2
 WHERE product_id = $3 AND number = ANY($4) AND status = 'available'
RETURNING number;
```

Seguido de `if (reserved.length < pedidos.length) → desfaz tudo`.

Isso é atômico **porque cabe exatamente um dono por linha**. Não há travamento explícito, não há
transação (o driver `neon-http` nem suporta), não há leitura-antes-de-escrever. A condição
`status = 'available'` dentro do próprio `UPDATE` faz o banco resolver a disputa, e a conferência
de contagem detecta quem perdeu.

A meia cota ataca exatamente essa premissa. E ataca num momento ruim: o esgotamento medido no BI
do Império chega a **18 minutos para 100 títulos** (~5,5 por minuto), com **5 rodadas
simultâneas**. Dividir o título **dobra a contenção** no ponto mais quente.

## Decisão

**`product_numbers` passa a ter uma linha por unidade vendável, e num sorteio divisível a unidade
vendável é a metade.** Cem títulos divisíveis são 200 linhas, com unicidade em
`(product_id, number, half)`.

> **`half` é `NOT NULL`, inclusive no caso degenerado.** Num sorteio de cota inteira a linha tem
> `half = 1`, não `NULL`. Isto não é estilo: o Postgres trata `NULL` como **distinto de si mesmo**
> em índice único, então uma coluna nulável faria a restrição **parar de proteger em silêncio** —
> seria possível inserir duas linhas `(produto, 42, NULL)` e ter dois donos do mesmo título sem
> nenhum erro. Achado do @po na revalidação de 2026-11-17.

Comprar o título inteiro é reservar **as duas linhas daquele número na mesma instrução**.

### ⚠️ O que exatamente não muda — e o que muda

Uma versão anterior deste ADR dizia que "o `UPDATE` condicional não muda de forma". **Isso estava
errado o bastante para causar dano**, e o @po pegou na revalidação. A correção:

| | |
|---|---|
| **Não muda** | a **atomicidade**: a condição `status = 'available'` dentro do próprio `UPDATE` continua fazendo o banco resolver a disputa, e `reserved.length < pedidos.length` continua detectando quem perdeu. Nenhum travamento novo, nenhuma leitura-antes-de-escrever |
| **Muda, e é obrigatório** | o **predicado**. Hoje é `inArray(productNumbers.number, data.numbers)` (`reserve.ts:157`), que casa por **número**. Com duas linhas por número, esse predicado casa **as duas** — quem pede uma metade reserva as duas, e quem paga por uma leva duas |

**O `WHERE` tem de passar a endereçar a unidade vendável, não o número.** Um `WHERE` por número
num schema de metades é venda dupla silenciosa: o pedido é criado com `quantity` de uma metade, o
comprador paga meia cota, e o sistema marca o título inteiro como dele. Não falha, não loga, não
aparece em teste de caminho feliz — só desaparece um título do estoque a cada compra de metade.

Num sorteio de cota inteira, a linha continua sendo uma por título — é o caso degenerado de uma
metade só, e os 177 sorteios/semana que já rodam não mudam de forma.

## Alternativa rejeitada: a metade como coluna

Dar à linha do título dois donos possíveis (`order_id_a` / `order_id_b`, ou um estado de ocupação
com três valores: vazio, meio, cheio).

**Por que não:**

1. **Destrói a atomicidade que existe.** "Disponível" deixa de ser um predicado sobre a linha e
   passa a ser uma pergunta sobre *qual* metade. O `UPDATE` condicional deixa de bastar, e o
   substituto é travamento explícito ou `SELECT ... FOR UPDATE` — exatamente o que o driver atual
   não oferece e o que a `LTM-02` está tentando resolver em separado.
2. **Troca uma propriedade simples por uma complicada no pior momento.** A contenção dobra com a
   feature; o mecanismo que resolve disputa não deveria dobrar de complexidade junto.
3. **Vaza para todo consumidor.** Toda consulta de disponibilidade, todo relatório e o ETL
   passariam a ter de interpretar um estado de ocupação em vez de contar linhas.

A forma em coluna é mais "econômica" em linhas — 100 contra 200 — e esse é o único argumento a
favor dela. Com ~900 mil linhas/ano projetadas em `product_numbers`, dobrar para 1,8 milhão é
irrelevante para Postgres **com índice**, e o índice é escopo da `LTM-01` de qualquer forma.

## Consequências

### Boas

- A reserva permanece correta pelo mesmo motivo de hoje, sob o dobro da contenção.
- Carrinho misturado ("o 42 inteiro e metade do 43") sai de graça: o pedido é uma lista de
  metades, e o título inteiro são duas delas.
- Expiração por metade, com relógio próprio, é consequência natural de a metade ser a linha.
- Sorteio de cota inteira não muda de forma nenhuma.

### Custos aceitos

- **`product_numbers` dobra de tamanho em sorteio divisível.** Aceito: é trivial para Postgres com
  índice, e o índice é pré-requisito independente.
- **`quantity` do pedido.** Uma versão anterior deste ADR dizia, em frases consecutivas, que
  `quantity` *"passa a contar metades"* e que *"nunca"* deve haver reinterpretação silenciosa de
  `quantity`. **As duas não podem ser verdade**, e o @po mediu a consequência: o agregador do BI
  faz `numeros_vendidos = ("Quantidade", "sum")` (`services/Meta/imperio-premios/bi_aggregator.py:1099`),
  então "números vendidos" **dobraria** num sorteio divisível, em silêncio, num painel que decide
  investimento de mídia.

  **A decisão, agora sem ambiguidade:** `quantity` continua contando **o que o pedido contém**, que
  num sorteio divisível são metades — porque é o que a reserva de fato criou e mentir ali
  dessincroniza o pedido do estoque. O que **não** pode acontecer é o consumidor descobrir a
  unidade por adivinhação: o pedido carrega **campo explícito de unidade**, e quem agrega tem de
  lê-lo. A `LTM-07` (AC7) cobre o lado do contrato; o lado do BI é escopo do `ADR-0002`, onde o
  pipeline novo nasce sabendo disto e o atual continua lendo a Sorteamos, intocado.
- **Toda configuração de contagem fica ambígua** (`minPerReservation`, `maxPerReservation`,
  `maxPerBuyer`, `maxQuantityPerBuyer`, `initialPerReservation`, `quickBuyCards`). **Mitigação:**
  uma unidade por sorteio, sempre nomeada na interface — título em sorteio de cota inteira, metade
  em sorteio divisível.

### Invariantes que passam a precisar de prova (escopo `LTM-05`)

1. Nenhuma metade tem dois donos.
2. Reservar título inteiro reserva **as duas** metades ou **nenhuma** — nunca uma.
3. Expirar a metade de um pedido não toca a metade do **outro** pedido. ⚠️ **Reescrito em
   2026-11-17 (@po):** a forma anterior — *"expirar uma metade não toca na outra"* — é **falsa** para
   as duas metades de um **mesmo** pedido, que expiram juntas por construção e devem. Escrita sem
   qualificar, ela produz o mesmo defeito do invariante 4: um teste que falha com o sistema
   correto. Ver a nota abaixo.
4. O rateio de um título sorteado soma **o prêmio**, ou **o prêmio + R$ 0,01** quando o prêmio tem
   centavo ímpar — **nunca menos**. Ver a decisão de arredondamento abaixo.
5. Metade órfã em título sorteado paga o prêmio **inteiro** a quem tem a metade vendida.

> **Invariante 3 já está satisfeito por construção, e isso precisa ser dito** para ninguém mitigar
> o que não existe: as duas metades de um mesmo pedido nascem no mesmo `UPDATE`, com o mesmo
> `reservedUntil`, e a varredura de expiração libera **por pedido** — `inArray(productNumbers.orderId,
> expiredIds)`, em **`reserve.ts:51-58`**. Elas
> nunca divergem. O invariante que vale provar é o de metades de **pedidos diferentes** — que é o
> caso real, porque é o que acontece quando duas pessoas compram metades do mesmo título. Achado
> do @po, que foi procurar o risco inverso e não achou.

### Dois buracos de schema que os invariantes expõem

Encontrados na revalidação, e nenhum deles estava neste ADR:

1. **`winners` não tem onde marcar a metade.** A tabela tem `winning_number`, e nada mais. Duas
   linhas para o mesmo número são indistinguíveis de duplicata acidental, e o feed público de
   ganhadores só sabe dizer "42" — contra a regra **metade marcada** do `GLOSSARY.md`.
2. **O rateio não fecha em `numeric(12,2)`.** `prize_amount` tem duas casas; metade de
   R$ 100.000,01 é R$ 50.000,005, que **não é representável**.

   **Decidido pelo founder em 2026-11-17: arredondar os dois para cima.** Prêmio com centavo ímpar
   produz duas metades de R$ 50.000,01 — o operador paga **R$ 0,01 a mais** que o prêmio
   anunciado, e nenhum ganhador recebe a menos.

   ⚠️ **Isto reescreve o invariante 4.** A redação anterior — *"a soma dos rateios é **exatamente**
   o prêmio"* — passa a ser **falsa** por um centavo quando o prêmio é ímpar. Mantê-la produziria
   um teste que falha com o sistema correto, que é precisamente o defeito que o @po encontrou na
   `LTM-05`. A forma verdadeira e testável:

   > A soma dos rateios de um título sorteado é **o prêmio**, ou **o prêmio + R$ 0,01** quando o
   > prêmio tem centavo ímpar. **Nunca menos.** Nenhum ganhador recebe menos que a sua fração
   > arredondada para cima.

   A assimetria é deliberada: o erro cai do lado do operador, nunca do ganhador. Um centavo a mais
   é custo; um centavo a menos é disputa.

## Decisões de domínio que acompanham esta

Fechadas na mesma sessão e registradas no `GLOSSARY.md`:

| | |
|---|---|
| Prêmio | meia cota só em sorteio de **prêmio em dinheiro**; o sistema recusa habilitar em outros |
| Preço | metade custa **exatamente metade**, sem ágio |
| Escopo | divisibilidade é **por sorteio**, nunca por título |
| Fusão | duas metades do mesmo dono **continuam duas metades** — não se fundem |
| Metade órfã | quem tem a metade vendida leva o **prêmio inteiro** |
| Congelamento | divisibilidade vira somente-leitura **na primeira venda** |
| Ganhador | **uma linha de `winners` por ganhador**, com o valor já rateado |
| Grade | **célula partida** — um botão por título, dividido ao meio |
| Relatório | a metade aparece **sempre marcada**, nunca como número nu |
| Anúncio | os **dois** valores lado a lado; nunca o número grande sozinho numa tela de metade |

## Notas

O sorteio em si **acontece fora deste sistema** — nada no código escreve em `winners`. O rateio é
registro do resultado, não cálculo de um sorteio automatizado.

Jogos bônus (roleta, caixas, raspadinha) são comprados à parte, com combos de preço e quantidade
próprios. **Não são tocados por esta decisão.**
