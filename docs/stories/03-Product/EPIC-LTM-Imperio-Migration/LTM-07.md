# LTM-07: A meia cota — o domínio

**Status:** Draft
> ⚠️ **Segue `Draft`, mas as três correções exigidas foram endereçadas em 2026-11-18 — aguarda a 3ª
> validação do @po.** A transição `Draft → Ready` é dele, não minha.
>
> | Correção exigida (2ª validação) | Estado em 2026-11-18 |
> |---|---|
> | 1. AC7 afirma **qual** forma `quantity` assume | ✅ reescrito com o caso numérico (3 metades → `quantity` = 3 + unidade = metade), e com a consequência no BI do Império nomeada como item solto |
> | 2. `Files:` declara o campo de unidade em `orders` | ✅ o bloco agora nomeia **dois** blocos de `raffles.ts`, e diz qual **saiu** |
> | 3. Onde nasce o marcador de divisibilidade | ✅ **já resolvido no código**: a `LTM-01` criou `isDivisible` (`raffles.ts:74`). O vão de sequenciamento que o @po apontou não existe mais |
**Epic:** EPIC-LTM-Imperio-Migration (Frente C — a feature que o cliente pediu)
**Prioridade:** **P0** — entra no primeiro sorteio de teste, e define a forma de `reserve.ts` antes de a `LTM-02` reescrevê-lo
**Complexidade:** L — schema, reserva e rateio. A superfície está na `LTM-08`
**Criada por:** @aiox-master · 2026-11-17, a partir do `/grill-with-docs` com o founder
**Decisão de arquitetura:** `docs/architecture/adr/0001-meia-cota-como-linha.md`
**Vocabulário:** `GLOSSARY.md` → título, meia cota, sorteio divisível, metade órfã, rateio, unidade

## Story

**Como** Império, que quer sortear 100 mil e 200 mil sem aumentar o preço de entrada
**Eu quero** vender cada título inteiro **ou** em duas metades, a duas pessoas
**Para que** o prêmio possa crescer sobre os mesmos 100 títulos, com quem comprou metade concorrendo a metade do prêmio.

## Contexto

### A propriedade que não pode ser perdida

`src/lib/actions/reserve.ts`:

```ts
const reserved = await db.update(productNumbers)
  .set({ status: "reserved", orderId: order.id, reservedUntil: ... })
  .where(and(
    eq(productNumbers.productId, product.id),
    inArray(productNumbers.number, data.numbers),
    eq(productNumbers.status, "available"),
  ))
  .returning({ number: productNumbers.number });

if (reserved.length < data.numbers.length) { /* desfaz tudo */ }
```

Isto é atômico **porque cabe exatamente um dono por linha**. Sem travamento, sem transação (o
driver `neon-http` não suporta), sem leitura-antes-de-escrever. A condição dentro do próprio
`UPDATE` faz o banco resolver a disputa; a conferência de contagem detecta quem perdeu.

**A meia cota dobra a contenção** exatamente aqui: o esgotamento medido chega a **18 minutos para
100 títulos** (~5,5/min), com **5 rodadas simultâneas**.

### A forma escolhida, e por quê

**A metade é uma linha, não uma coluna** (ADR-0001). Num sorteio divisível, `product_numbers` tem
uma linha por metade — 100 títulos são 200 linhas — e comprar inteiro é reservar as duas linhas
daquele número **na mesma instrução**.

⚠️ **Atenção ao que muda e ao que não muda — a redação anterior deste parágrafo estava errada**
(@po, 2026-11-17; o `ADR-0001` foi corrigido no mesmo sentido):

| | |
|---|---|
| **Não muda** | a **atomicidade**. A condição `status = 'available'` dentro do próprio `UPDATE` continua fazendo o banco resolver a disputa, e `reserved.length < pedidos.length` continua detectando quem perdeu. Sem travamento novo, sem leitura-antes-de-escrever |
| **Muda, e é obrigatório** | o **predicado**. Hoje é `inArray(productNumbers.number, data.numbers)` (`reserve.ts:157`), que casa por **número** — com duas linhas por número, casa **as duas**: quem pede uma metade reserva as duas e paga por uma. O `WHERE` tem de endereçar a **unidade vendável**. Quem implementa isso é a **`LTM-02`** (AC9 de lá), por força do recorte abaixo |

A frase anterior — *"o `UPDATE` condicional não muda de forma"* — lida ao pé da letra por um @dev
em YOLO, entrega venda dupla silenciosa com o ADR na mão como justificativa.

Sorteio de cota inteira é o caso degenerado de uma metade só: segue com uma linha por título.

### O sorteio não é nosso

**Nada no código escreve em `winners`.** O sorteio acontece fora do sistema; o operador registra
o resultado depois. O rateio desta story é **registro de resultado**, não cálculo de sorteio.

## Tarefas (Checklist)

### Schema

- [ ] ~~`product_numbers`: coluna `half` + `uniqueIndex`~~ — **a `LTM-01` cria**, decidido em
      2026-11-17. Esta story **lê** a coluna e **não toca** `src/db/schema/raffles.ts` nem
      `src/lib/actions/reserve.ts`. Era a colisão que o @po apontou.
- [ ] ~~`products`: marcador de **sorteio divisível**~~ — **a `LTM-01` já criou**, conferido em
      2026-11-18: `src/db/schema/raffles.ts:74`, `isDivisible` com default `false`. Era a
      recomendação de sequenciamento do @po (item 3 da 2ª validação) e ela está cumprida no código,
      não só no papel. Esta story **lê** o marcador e aplica as **regras** sobre ele.
- [ ] `orders`: campo **explícito de unidade**. ⚠️ **A decisão está fechada no `ADR-0001` e esta
      linha ainda dizia o contrário** (@po, 2026-11-17). A forma decidida é: **`quantity` continua
      contando o que o pedido contém** — que num sorteio divisível são **metades**, porque é o que a
      reserva de fato criou, e mentir ali dessincroniza o pedido do estoque — **e o pedido carrega
      um campo explícito de unidade** para que nenhum consumidor descubra a unidade por adivinhação.
      A redação anterior (*"não reinterpretar `quantity`"*) implicava o oposto: `quantity` contando
      títulos e a contagem de metades num campo novo. As duas formas são defensáveis; **só uma está
      no ADR**, e divergir dela em silêncio é o que cega o BI (`bi_aggregator.py:1099` soma
      `"Quantidade"`). Ver AC7, que passa a ter de afirmar **qual** forma, não só "é distinguível".
- [ ] `winners`: já comporta uma linha por ganhador; confirmar que nada no código assume uma
      linha por `winning_number`.
- [ ] Migração versionada — depende do regime da `LTM-01`.

### Regras

- [ ] Habilitar divisibilidade **recusa** sorteio cujo prêmio não seja em dinheiro **nem divida
      exato em centavos** — as duas recusas, com motivos distintos.
- [ ] Divisibilidade vira **somente-leitura na primeira venda**.
- [ ] Geração dos títulos do sorteio cria uma ou duas linhas por número conforme a divisibilidade.

### Reserva

- [ ] ~~`reserve.ts`, expiração, anti-spam e `amount`~~ — **a `LTM-02` entrega**, numa reescrita
      só, já na forma de metades. Recorte decidido em 2026-11-17.

### Rateio

- [ ] Registro de ganhador por **linha por pessoa**, com `prize_amount` já rateado, todas
      apontando para o mesmo `winning_number`.
- [ ] Metade órfã em título sorteado → **prêmio inteiro** a quem tem a metade vendida.

## Critérios de Aceite

- [ ] **AC1 (uma metade, um dono):** sob concorrência, duas reservas disputando a **mesma** metade
      produzem exatamente um dono. Teste com as duas disparadas em paralelo, contagem medida.
- [ ] **AC2 (inteiro é tudo ou nada):** reservar o título inteiro reserva **as duas** metades ou
      **nenhuma**. Teste monta o estado em que a metade B já está reservada por outra pessoa e
      verifica que a metade A **não** ficou presa ao pedido perdedor.
- [ ] **AC3 (expiração não contamina — entre PEDIDOS, não dentro de um):** expirar a reserva do
      **pedido X**, que tem a metade A do 42, não altera `status`, `order_id` nem `reserved_until`
      da metade B do 42, que pertence ao **pedido Y**. Contagens antes/depois.
  - ⚠️ **A redação anterior mandava provar algo falso** (@po, 2026-11-17). Ela dizia "expirar a
    metade A não toca a metade B", sem qualificar. Metades do **mesmo** pedido nascem no mesmo
    `UPDATE`, com o mesmo `reservedUntil`, e a varredura libera **por pedido** —
    `inArray(productNumbers.orderId, expiredIds)`, em **`reserve.ts:51-58`** (a citação anterior,
    `:110-113`, estava errada: aquele bloco é a conferência de telefone bloqueado. Corrigido na 2ª
    validação): elas expiram **juntas, sempre**, e devem. Um título inteiro que
    expirasse pela metade seria o defeito. O caso que vale provar é o de pedidos **diferentes** —
    que é o que acontece quando duas pessoas compram as duas metades do mesmo título.
- [ ] **AC4 (o rateio fecha exato):** a soma dos `prize_amount` das linhas de `winners` de um
      título sorteado é **exatamente** o prêmio do título. Nem um centavo a mais, nem a menos.
  - **A política de arredondamento foi substituída por uma restrição** (founder, 2026-11-17). Ele
    corrigiu a premissa: na operação do Império os prêmios são **sempre valores cheios**, de
    divisão limpa. Prêmio com centavo ímpar não é caso raro — é caso que **não existe**. Então o
    sistema o **recusa na entrada** (AC12) em vez de desempatar na saída, e este AC volta à forma
    forte, sem ramo condicional.
- [ ] **AC5 (metade órfã paga inteiro):** título com uma metade vendida e uma não vendida, sorteado
      → **uma** linha de `winners` com o prêmio **integral**.
- [ ] **AC6 (duas metades do mesmo dono não se fundem):** quem compra as duas metades do 42 aparece
      como **dois** rateios, não um pagamento único.
- [ ] **AC11 (`winners` sabe dizer qual metade):** duas linhas de `winners` com o mesmo
      `winning_number` são **distinguíveis** — não ficam indistinguíveis de duplicata acidental, e
      o feed público consegue exibir `42 (metade)` em vez de `42` nu, como manda a regra *metade
      marcada* do `GLOSSARY.md`. Conferido: hoje `winners` tem `winning_number` e **nada** que
      identifique a metade. Alternativa aceita: decisão **escrita** de que o rateio não precisa
      distinguir — mas aí a regra do glossário tem de ser corrigida junto, não ignorada.
- [ ] **AC7 (a forma do `ADR-0001`, com o caso numérico):** num sorteio divisível, um pedido de
      **3 metades** tem `quantity` = **3** e o campo de unidade dizendo **metade**. Num sorteio de
      cota inteira, um pedido de 3 títulos tem `quantity` = **3** e o campo de unidade dizendo
      **título**. Duas asserções, uma por sorteio, sobre os **dois** campos.

      > Correção exigida pelo @po na 2ª validação, item 1, e ela era necessária: a redação anterior
      > (*"se distinguem por campo explícito, não por heurística sobre `quantity`"*) é verdadeira
      > nas **duas** formas possíveis — a do ADR e a oposta — e portanto **não testava a decisão**.
      > `quantity` conta **o que o pedido contém**, que num sorteio divisível são metades, porque é
      > o que a reserva de fato criou; e o campo de unidade existe para que ninguém descubra isso
      > por adivinhação.
      >
      > ⚠️ **A consequência fora deste repositório é medida, não hipotética:**
      > `services/Meta/imperio-premios/bi_aggregator.py:1099` faz
      > `numeros_vendidos = ("Quantidade", "sum")`. Sob esta forma, **"números vendidos" no BI do
      > Império passa a contar metades** em sorteio divisível — e é o painel pelo qual a operação
      > decide investimento de mídia. **Isto não se conserta aqui**: o conserto é do lado do BI, que
      > precisa ler o campo de unidade. Fica registrado como item solto para o @po, nomeado, em vez
      > de ser descoberto quando o número dobrar.
- [ ] **AC8 (cota inteira intacta):** regressão — todo teste de reserva de sorteio não divisível
      passa sem alteração. É o que garante que as 5 rodadas/dia do Império não mudam de forma.
- [ ] **AC9 (congelamento):** tentar alterar a divisibilidade de um sorteio com pelo menos uma
      venda falha com motivo nomeado, e **não** altera nada.
- [ ] **AC10 (prêmio em dinheiro):** habilitar divisibilidade em sorteio cujo prêmio não é
      dinheiro falha com motivo nomeado.
- [ ] **AC12 (prêmio divisível em centavos):** habilitar divisibilidade em sorteio cujo prêmio
      **não divide exato em centavos** falha com motivo nomeado, dizendo qual é o prêmio e por que
      ele não serve. Teste com R$ 100.000,01 → recusa; com R$ 100.000,00 → aceita. É o que mantém
      o AC4 na forma exata.

## Escopo

**IN:** schema da metade; marcador e unidade do sorteio; geração dos títulos; reserva na nova
forma com expiração e anti-spam por metade; cálculo de valor; rateio no registro de ganhador; as
regras de recusa (prêmio não divisível, congelamento).

**OUT:** tudo que o comprador e o operador **veem** — grade partida, rótulo de unidade, anúncio
dos dois valores, marcação da metade em relatório, contagem de metades órfãs no painel. É a
`LTM-08`. Também fora: ágio sobre a metade (decidido: não existe), divisão em mais de duas partes,
revenda ou transferência de metade, e qualquer automação do sorteio — que não é nosso.

## Files

Conferido em 2026-11-17, **depois** do recorte com `LTM-01` e `LTM-02`.

**Escreve:**

```
apps/lotemania/src/db/schema/raffles.ts      DOIS blocos, nao um:
                                               1. `orders` -> o campo explicito de UNIDADE (AC7)
                                               2. `winners` -> o marcador de metade, se o AC11 exigir
                                             O marcador de divisibilidade em `products` NAO entra:
                                             a LTM-01 ja o criou (ver abaixo)
apps/lotemania/src/lib/actions/products.ts   geracao dos titulos conforme a divisibilidade
apps/lotemania/src/lib/validations/product.ts  regra de recusa (premio nao divisivel) e congelamento
apps/lotemania/drizzle/**                    migracao
```

> **Correção exigida pelo @po na 2ª validação, item 3 — e era real.** O bloco anterior dizia *"**SÓ**
> o marcador de divisibilidade em `products`"*, enquanto a lista de tarefas criava **também** o campo
> de unidade em `orders` — e `orders` vive no **mesmo arquivo**, que é disputado com a `LTM-01`.
> Subdeclarar o que se escreve num arquivo disputado é exatamente como se forma colisão de onda
> achando que não há colisão.

> ### A recomendação do @po sobre o marcador de divisibilidade **já está cumprida no código**
>
> O @po recomendou que o marcador subisse para a `LTM-01` (onda 1), porque o preço da metade — que
> é da `LTM-02`, onda 2 — depende dele, e esta story é onda 3 ou posterior. Uma onda precisando de
> coluna de uma onda futura.
>
> **Conferido em 2026-11-18: a `LTM-01` já criou.** `src/db/schema/raffles.ts:74` tem
> `isDivisible: boolean("is_divisible").notNull().default(false)`, junto de `half` em
> `product_numbers`. O vão de sequenciamento **não existe mais**, e esta story fica com o que o @po
> queria que ela tivesse: as **regras** (recusa, congelamento, geração dos títulos), não a **forma**.
>
> O que **ainda não existe** é o campo de unidade em `orders` — conferido na mesma data: as colunas
> de `orders` são `id`, `tenant_id`, `user_id`, `product_id`, `affiliate_id`, `quantity`, `amount`,
> `status`, `payment_gateway_provider`, `paid_at`, `created_at`. Nenhuma de unidade. Esse campo é
> desta story, e é por isso que ela continua tocando `raffles.ts`.

**NÃO toca** — e isto é o recorte, não uma observação:

```
src/lib/actions/reserve.ts    -> LTM-02 (reserva, expiracao, anti-spam, amount)
a coluna `half` e a chave     -> LTM-01
```

⚠️ **`src/db/schema/raffles.ts` é disputado com a `LTM-01`**, que cria `half` e os índices. São
blocos diferentes do mesmo arquivo e **as duas geram migração**: serializar `pnpm db:generate`, e
a `LTM-01` vai primeiro por ser onda 1.

**Resources:**

```
banco de teste        — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa,
                        ou serializacao. Nome de branch nao isola banco.
pnpm db:generate      — escreve drizzle/meta/_journal.json. RECURSO UNICO: serializar com
                        LTM-01, LTM-03a, LTM-03b, LTM-04, LTM-12 e LTM-16, que tambem geram.
relogio do teste      — AC9 (congelamento) e AC1/AC2 medem estado, nao tempo: sem relogio falso.
```

**Depends-on:** `LTM-01` · `LTM-02` · `LTM-05`.

## Dependências

- **Depende de `LTM-01`** — a forma desta story é o que a `LTM-01` tem que indexar. Elas **se
  resolvem juntas**: criar índice sobre a forma antiga e depois mudar a forma é trabalho jogado
  fora.
- **Depende de `LTM-02`** — reserva atômica sob o dobro da contenção.
- **Depende de `LTM-05`** — AC1 a AC6 são todos de concorrência ou de invariante; nenhum se
  verifica à mão.
- **Precede `LTM-08`** — a superfície mostra o que este domínio define.
- ⚠️ **Gera migração.** Serializar `pnpm db:generate` com `LTM-01`, `LTM-03a` e `LTM-04`.

## O que esta story muda nas outras — **@po precisa revalidar**

As quatro abaixo estão em `Ready` ou `Draft` com escopo escrito **antes** desta decisão.

| Story | O que muda |
|---|---|
| `LTM-01` | o índice passa a ser sobre `(product_id, number, half)`, não `(product_id, number)` |
| `LTM-02` | a reserva que ela torna transacional é a de metades, não a de títulos |
| `LTM-05` | a suíte nasce provando os invariantes do ADR-0001. **Escrita para cota inteira, ela provaria invariantes que deixam de valer** |
| `LTM-03a` | o fechamento de pedido marca metades como vendidas, e `quantity` tem unidade |

## Riscos

- **[Alto] Implementar antes de a `LTM-05` existir.** AC1 a AC6 são todos de concorrência. "Ficou
  atômico" sem suíte é afirmação sem prova, no caminho do dinheiro.
- **[Alto] `quantity` reinterpretado em silêncio** cegaria o BI, o ETL e o CAPI de um jeito que só
  aparece na conferência de faturamento. AC7 existe só para isso.
- **[Médio] Arredondamento no rateio.** Prêmio ímpar em centavos dividido por dois não fecha
  sozinho. AC4 força o caso.
- **[Médio] A contenção dobra.** O cenário de carga do portão **G4** precisa ser refeito na forma
  divisível: 5 rodadas de 200 metades, não de 100 títulos.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Prêmio divisível — decisão registrada (AC12)
_(registrar a decisão e quem decidiu)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-17)

**Veredicto: NO-GO — 6,5/10.** Permanece `Draft`.

A story é bem pensada e os ACs são de invariante, não de impressão — o que é o padrão certo para o
caminho do dinheiro. O NO-GO é por **quatro buracos de recorte e de precisão**, todos fecháveis sem
mudar nada do que foi decidido no grilling. Nenhum deles é discordância do `ADR-0001`.

### 1. Nenhum bloco `Files:` — e os arquivos são disputados por três stories

Foi a omissão do conjunto de arquivos que derrubou a `LTM-03` na validação de 2026-11-16. Esta
story não declara nenhum, e não é um caso benigno:

| Arquivo | Também reivindicado por | O quê |
|---|---|---|
| `src/db/schema/raffles.ts` | **`LTM-01`** | as duas criam a coluna `half` e o `uniqueIndex (product_id, number, half)` |
| `src/lib/actions/reserve.ts` | **`LTM-02`** | as duas reescrevem `reserveSelectedNumbers`, incluindo o cálculo de `amount` |
| `drizzle/meta/_journal.json` | `LTM-01`, `LTM-03a`, `LTM-04` | recurso mutável compartilhado; a story já avisa para serializar |

E o epic põe `LTM-02` + `LTM-07` **na mesma onda** (*Ordem recomendada*), contrariando a sua própria
*Nota para formação de ondas* ("Onda 2: `LTM-02` sozinha") e `.claude/rules/parallel-waves.md`.
Conjuntos não disjuntos não formam onda.

**Exigido:** bloco `Files:`/`Resources:`/`Depends-on:` no padrão da `LTM-03a`, e o recorte decidido
por escrito — do mesmo jeito que a aresta `LTM-03a` ↔ `LTM-04` foi resolvida ("fica decidido aqui: a
`LTM-03a` cria"). Recomendação do @po: a **`LTM-01`** cria a coluna e a chave; a **`LTM-02`** faz a
única reescrita de `reserveSelectedNumbers`, já na forma de metades; esta story fica com
divisibilidade, geração dos títulos, regras de recusa, congelamento e rateio.

### 2. O AC3 afirma uma coisa que o código **não faz** — e não deveria fazer

**AC3:** *"expirar a metade A não altera `status`, `order_id` nem `reserved_until` da metade B"*.

Num **título inteiro**, as duas metades vivem no **mesmo pedido**, nascem no mesmo `UPDATE` com o
mesmo `reservedUntil`, e a varredura de expiração libera **por pedido** —
`inArray(productNumbers.orderId, expiredIds)` (`reserve.ts:110-113`). Elas expiram **juntas**, e
isso é correto: metade de um título inteiro expirada e metade não seria o pior estado possível.

O AC só é verdadeiro quando as duas metades pertencem a **pedidos diferentes**. Como está, ele
manda provar algo falso — e um @dev que tente fazê-lo verdadeiro quebraria a expiração do título
inteiro. **Exigido:** o AC nomeia que as duas metades são de pedidos distintos, e ganha um par
("metade A e B do mesmo pedido expiram juntas").

### 3. A armadilha do `inArray` não está escrita em lugar nenhum

O `ADR-0001` diz que o `UPDATE` condicional *"não muda de forma"*. Sobre a **atomicidade**, certo.
Sobre o **predicado**, não: `inArray(productNumbers.number, data.numbers)` (`reserve.ts:152`) casa
**as duas linhas** do 42. Quem pede uma metade reserva as duas, e a outra sai do mercado sem
comprador, em silêncio.

Esta story é a que define *"o pedido passa a ser uma lista de metades"* e é o lugar certo para a
armadilha estar nomeada, com AC próprio. Hoje um @dev tem o ADR na mão dizendo que o `UPDATE` não
muda e nenhuma linha dizendo o que muda.

### 4. Duas ambiguidades herdadas que só esta story pode fechar

**4a. `quantity`: o `ADR-0001` diz as duas coisas.** Em *Custos aceitos*: *"`quantity` do pedido
**passa a contar metades** em sorteio divisível"*. Na mitigação, na frase seguinte: *"campo novo e
explícito no pedido, **nunca reinterpretação silenciosa de `quantity`**"*. As duas não podem valer
juntas. Ou `quantity` continua contando títulos e a contagem na unidade mora num campo novo, ou
`quantity` passa a contar metades e um campo novo **nomeia a unidade**. A consequência é concreta e
já medida: `bi_aggregator.py:1099` faz `numeros_vendidos = ("Quantidade", "sum")` — na segunda
leitura, "números vendidos" no BI do Império dobra em sorteio divisível. O AC7 cobre o *contrato*
("distinguível por campo explícito"); não cobre **qual** das duas formas é a escolhida. Esta story
tem que escolher.

**4b. `winners` não tem onde marcar a metade.** Conferido: `winners`
(`src/db/schema/raffles.ts:172-188`) tem `winnerName`, `prizeAmount`, `winningNumber` (`integer`
nulável) e **nenhuma referência a pedido ou a linha de `product_numbers`** — é independente de
`orders` por desenho, para registrar sorteio externo. Consequências:

- o **AC6** ("duas metades do mesmo dono aparecem como dois rateios") produz duas linhas com o
  mesmo `winnerName` e o mesmo `winningNumber`, **indistinguíveis de uma duplicata acidental**;
- o `GLOSSARY` → **metade marcada** exige que a metade nunca apareça como número nu em relatório,
  export ou interface, e `winners` alimenta o feed público de ganhadores. Hoje ele só sabe dizer
  "42".

A tarefa atual diz apenas *"confirmar que nada no código assume uma linha por `winning_number`"* —
insuficiente. É preciso **o marcador da metade em `winners`**, ou a decisão escrita de que o rateio
se identifica por outro caminho.

### 5. O AC4 precisa do default de arredondamento, não só do caso de teste

O AC4 escolhe bem o caso (R$ 100.000,01) e deixa a política em branco no Dev Record. `prizeAmount`
é `numeric(12,2)` — metade de 100.000,01 é 50.000,005, **não representável**. Sem política
declarada, o invariante 4 do ADR ("soma exatamente o prêmio") não tem como ser cumprido e a decisão
cai no colo de quem implementa, no caminho do dinheiro do ganhador. **Exigido:** um default escrito
na story (ex.: o centavo ímpar vai para a metade de menor ordinal), confirmável pelo founder.

### O que está certo e não se toca

- Os ACs de **concorrência e invariante** (AC1, AC2, AC5, AC8, AC9, AC10) estão na forma certa:
  afirmam estado do sistema, não latência nem impressão.
- **AC8** (regressão de cota inteira) é a trava que protege as 5 rodadas simultâneas em produção.
- O recorte **domínio × superfície** com a `LTM-08` está bem feito desde o nascimento, e o OUT
  nomeia o que não existe (ágio, mais de duas partes, revenda, automação do sorteio).
- A nota de que **nada escreve em `winners`** porque o sorteio é externo: conferida, e é o que
  mantém o rateio como registro em vez de cálculo.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ⚠️ sem `Files:`/`Resources:` |
| Estrutura de arquivos / árvore | ❌ dois arquivos disputados com `LTM-01` e `LTM-02` |
| UI/Frontend | ✅ fora por desenho (é a `LTM-08`) |
| Satisfação dos ACs | ❌ AC3 pede prova de algo falso; AC4 sem política; AC6 sem âncora em `winners` |
| Instruções de teste | ✅ |
| Segurança | ➖ n/a |
| Sequência de tarefas | ❌ onda contraditória no epic |
| Duplicação funcional | ❌ `reserve.ts` e `raffles.ts` reescritos duas vezes se nada for decidido |
| Anti-alucinação | ✅ ancorada no `ADR-0001` e no código; zero número sem fonte |
| Prontidão para @dev | ❌ |

## Validação 2 @po (2026-11-17) — quatro fecharam, três abertas

**Veredicto: NO-GO — 6,5/10.** Permanece `Draft`. **Onda 3 ou posterior** — não atrasa a onda 1.

| Correção exigida na 1ª validação | Estado |
|---|---|
| 1. Bloco `Files:`/`Resources:`/`Depends-on:` + recorte escrito | ✅ e exemplar: o recorte está **riscado nas duas listas de tarefas**, aqui e na `LTM-02`, e o bloco "**NÃO toca**" nomeia os dois arquivos que saíram com o motivo. É o padrão que eu quero ver nas outras |
| 2. AC3 entre **pedidos diferentes** | ✅ e com a razão escrita, que é o que impede alguém de "consertar" a expiração do título inteiro |
| 3. Armadilha do `inArray` nomeada | ⚠️ **deslocada, não resolvida aqui** — ver item 1 abaixo |
| 4a. `quantity`: escolher uma das duas formas | ❌ o ADR escolheu; **esta story ainda diz o contrário** — ver item 2 |
| 4b. `winners` com marcador de metade | ✅ **AC11**, com a alternativa aceita explicitada (decidir que não distingue, mas então corrigir o `GLOSSARY` junto, não ignorá-lo) |
| 5. Política de arredondamento no AC4 | ✅ **e melhor do que eu pedi.** Eu sugeri "o centavo ímpar vai para a metade de menor ordinal"; o founder decidiu **arredondar as duas para cima**, e essa decisão é superior: a minha deixava uma metade recebendo um centavo menos que a outra, isto é, o erro caindo sobre **um ganhador**. A do founder faz o erro cair sobre o **operador**. Um centavo a mais é custo; um centavo a menos é disputa. Registro a mudança de opinião: o invariante 4 do ADR reescrito está certo e o meu estava pior |

### 1. O *Contexto* ainda ensina o erro que o ADR corrigiu hoje

O `ADR-0001` foi corrigido nesta data e diz, sobre a própria frase anterior: *"isso estava errado o
bastante para causar dano"*. A frase era *"o `UPDATE` condicional não muda de forma"*.

**Ela continuava aqui, no *Contexto*, palavra por palavra** — seguida de *"e a conferência de
contagem continua valendo sem alteração"*. O Contexto é o que o @dev lê **antes** de implementar; o
histórico de validação é o que ele lê depois, se ler. A correção do ADR não se propaga sozinha.

**Corrigido nesta validação**, com a tabela "não muda / muda" e o ponteiro para o AC9 da `LTM-02`.
Aceito que a armadilha seja **implementada** lá (foi o recorte, e está certo) — o que não podia
continuar é esta story afirmando que não existe armadilha.

### 2. `quantity`: o ADR fechou e a lista de tarefas ficou com a forma oposta

A tarefa dizia: *"`orders`: campo explícito para a unidade **e para a contagem na unidade** do
sorteio. **Não reinterpretar `quantity`**"* — isto é, `quantity` continua contando títulos.

O `ADR-0001`, depois da correção de hoje, decide o contrário e sem ambiguidade: **`quantity` conta
o que o pedido contém** (metades, em sorteio divisível) **mais um campo explícito de unidade**.

As duas formas são defensáveis — eu disse isso na 1ª validação e mantenho. **O que não é
defensável é a story e o ADR apontarem para lados opostos**, porque a consequência não é teórica:
`bi_aggregator.py:1099` faz `numeros_vendidos = ("Quantidade", "sum")`, e as duas formas produzem
números diferentes no painel que decide investimento de mídia.

Reescrevi a tarefa na forma do ADR. **Fica uma correção para o autor da story:** o **AC7** ainda
afirma apenas que a unidade é *"distinguível por campo explícito"* — o que é verdade nas duas
formas, e portanto não testa a decisão. O AC7 tem de afirmar **qual** forma: num pedido de sorteio
divisível de 3 metades, `quantity` vale **3** e o campo de unidade diz **metade**.

### 3. O `Files:` subdeclara o que esta story escreve no arquivo disputado

O bloco diz, sobre `src/db/schema/raffles.ts`: *"**SÓ** o marcador de divisibilidade em `products`
e, se o AC11 exigir, o marcador de metade em `winners`"*.

Mas a lista de tarefas também cria **o campo de unidade em `orders`** — e `orders` vive no **mesmo
arquivo** (`raffles.ts:93`). Subdeclarar o que se escreve num arquivo **disputado com a `LTM-01`** é
como se forma colisão de onda achando que não há colisão. São blocos diferentes do mesmo arquivo, a
serialização já está declarada, e o conserto é de uma linha — mas tem de ser feito.

### Um ponto que recomendo mover, e que não é correção minha para impor

O marcador de divisibilidade em `products` é **pré-requisito do preço da metade**, que o recorte
atribuiu à `LTM-02` — e a `LTM-02` vem **antes** desta na ordem do epic. Como está, a onda 2 precisa
de uma coluna da onda 3. **Recomendação:** a **forma** (a coluna) sobe para a `LTM-01`, na onda 1,
junto com `half`; as **regras** (recusa de prêmio não-dinheiro, congelamento, geração dos títulos)
ficam aqui. Registrado também na `LTM-02`, que é onde o vão dói.

### O que está certo e não se toca

- Os ACs de concorrência e invariante (**AC1**, **AC2**, **AC5**, **AC8**, **AC9**, **AC10**).
- **AC8** (regressão de cota inteira) continua sendo a trava que protege as 5 rodadas em produção.
- O recorte domínio × superfície com a `LTM-08`.
- A nota de que **nada escreve em `winners`** porque o sorteio é externo: reconferida.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ `Files:`/`Resources:`/`Depends-on:` entregues |
| Estrutura de arquivos / árvore | ⚠️ subdeclara o campo de `orders` no arquivo disputado |
| UI/Frontend | ✅ fora por desenho (é a `LTM-08`) |
| Satisfação dos ACs | ⚠️ AC4 e AC11 fecharam; o AC7 não testa a decisão que o ADR tomou |
| Instruções de teste | ✅ |
| Segurança | ➖ n/a |
| Sequência de tarefas | ⚠️ o marcador de divisibilidade está uma onda depois de quem precisa dele |
| Duplicação funcional | ✅ recorte fechado nos dois lados |
| Anti-alucinação | ❌ -> ⚠️ o Contexto repetia a frase que o ADR retirou hoje; corrigida aqui, junto com `reserve.ts:110-113` -> `:51-58` |
| Prontidão para @dev | ❌ |

### Correções exigidas antes de ir a `Ready`

1. **AC7 afirma qual forma** `quantity` assume (a do `ADR-0001`), com o caso numérico.
2. **`Files:` declara o campo de unidade em `orders`** dentro de `raffles.ts`.
3. **Decidir onde nasce o marcador de divisibilidade** — recomendação: `LTM-01`, onda 1. Se ficar
   aqui, a ordem das ondas muda e a `LTM-02` passa a declarar dependência desta.

Os itens 1 e 2 são de redação. O 3 é de sequenciamento e precisa ser combinado com a `LTM-02`.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce do `/grill-with-docs` com o founder: 17 decisões, fronteira fechada. Forma dos dados em `ADR-0001`; vocabulário em `GLOSSARY.md`. | @aiox-master |
| 2026-11-17 | — | **Validada — NO-GO (6,5/10). Permanece `Draft`.** Sem bloco `Files:` com dois arquivos disputados; AC3 manda provar que metades do mesmo pedido expiram separadas (não expiram, e não devem); armadilha do `inArray` não nomeada; `quantity` ambíguo no próprio ADR; `winners` sem onde marcar a metade; AC4 sem política de arredondamento. | @po (Pax) |
| 2026-11-18 | 1.2 | **As tres correcoes da 2a validacao endereçadas; aguarda 3a validacao do @po.** (1) AC7 reescrito para afirmar a forma do `ADR-0001` com caso numerico — 3 metades dao `quantity` = 3 e unidade = metade — e a consequencia medida no BI do Imperio (`bi_aggregator.py:1099`) fica nomeada como item solto, porque o conserto e do lado do BI. (2) O bloco `Files:` passa a declarar **dois** blocos de `raffles.ts`, incluindo o campo de unidade em `orders`, que e o que o @po apontou como subdeclarado num arquivo disputado. (3) O marcador de divisibilidade **ja existe**: conferido que a `LTM-01` criou `isDivisible` em `raffles.ts:74`, entao o vao de sequenciamento apontado pelo @po nao existe mais e esta story fica so com as regras. Acrescentado o bloco `Resources:`, que faltava. | @aiox-master |
| 2026-11-17 | 1.1 | **Validada (2a) — NO-GO (6,5/10). Permanece `Draft`.** Fecharam: `Files:` com recorte riscado nas duas stories, AC3 entre pedidos diferentes, AC11 (`winners` com marcador) e AC4 com a política do founder (arredondar as duas para cima — superior à minha sugestão anterior, que punha o centavo sobre um ganhador). Corrigidos nesta validação: o *Contexto* repetia a frase *"o `UPDATE` condicional não muda de forma"* que o `ADR-0001` retirou hoje, a tarefa de `quantity` apontava para o lado oposto ao do ADR, e a citação `reserve.ts:110-113` (é `:51-58`). Abertas: AC7 sem afirmar a forma de `quantity`, `Files:` subdeclarando o campo de `orders`, e o marcador de divisibilidade uma onda depois de quem precisa dele. | @po (Pax) |
