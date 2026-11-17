# LTM-07: A meia cota — o domínio

**Status:** Draft
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
daquele número **na mesma instrução**. O `UPDATE` condicional **não muda de forma** e a
conferência de contagem continua valendo sem alteração.

Sorteio de cota inteira é o caso degenerado de uma metade só: segue com uma linha por título.

### O sorteio não é nosso

**Nada no código escreve em `winners`.** O sorteio acontece fora do sistema; o operador registra
o resultado depois. O rateio desta story é **registro de resultado**, não cálculo de sorteio.

## Tarefas (Checklist)

### Schema

- [ ] ~~`product_numbers`: coluna `half` + `uniqueIndex`~~ — **a `LTM-01` cria**, decidido em
      2026-11-17. Esta story **lê** a coluna e **não toca** `src/db/schema/raffles.ts` nem
      `src/lib/actions/reserve.ts`. Era a colisão que o @po apontou.
- [ ] `products`: marcador de **sorteio divisível** e a **unidade** derivada dele.
- [ ] `orders`: campo **explícito** para a unidade e para a contagem na unidade do sorteio.
      **Não reinterpretar `quantity`** — ver AC7.
- [ ] `winners`: já comporta uma linha por ganhador; confirmar que nada no código assume uma
      linha por `winning_number`.
- [ ] Migração versionada — depende do regime da `LTM-01`.

### Regras

- [ ] Habilitar divisibilidade **recusa** sorteio cujo prêmio não seja em dinheiro.
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
    `UPDATE`, com o mesmo `reservedUntil`, e a varredura libera **por pedido**
    (`reserve.ts:110-113`): elas expiram **juntas, sempre**, e devem. Um título inteiro que
    expirasse pela metade seria o defeito. O caso que vale provar é o de pedidos **diferentes** —
    que é o que acontece quando duas pessoas compram as duas metades do mesmo título.
- [ ] **AC4 (o rateio fecha, com o centavo do lado certo):** a soma dos `prize_amount` das linhas
      de `winners` de um título sorteado é **o prêmio**, ou **o prêmio + R$ 0,01** quando o prêmio
      tem centavo ímpar. **Nunca menos.** Teste com R$ 100.000,01 → duas linhas de R$ 50.000,01.
  - **Política decidida pelo founder em 2026-11-17: arredondar as duas metades para cima.** O
    operador paga um centavo a mais; nenhum ganhador recebe a menos. A assimetria é deliberada —
    um centavo a mais é custo, um centavo a menos é disputa. A redação anterior ("exatamente o
    prêmio") ficaria **falsa com o sistema correto**, que é o defeito que o @po encontrou na
    `LTM-05`.
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
- [ ] **AC7 (nenhum significado muda em silêncio):** num sorteio divisível, o consumidor do pedido
      consegue saber a unidade **sem inferir**. Teste de contrato: a leitura de um pedido de
      sorteio divisível e a de um de cota inteira se distinguem por campo explícito, não por
      heurística sobre `quantity`.
- [ ] **AC8 (cota inteira intacta):** regressão — todo teste de reserva de sorteio não divisível
      passa sem alteração. É o que garante que as 5 rodadas/dia do Império não mudam de forma.
- [ ] **AC9 (congelamento):** tentar alterar a divisibilidade de um sorteio com pelo menos uma
      venda falha com motivo nomeado, e **não** altera nada.
- [ ] **AC10 (prêmio divisível):** habilitar divisibilidade em sorteio cujo prêmio não é dinheiro
      falha com motivo nomeado.

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
apps/lotemania/src/db/schema/raffles.ts      SO o marcador de divisibilidade em `products` e,
                                             se o AC11 exigir, o marcador de metade em `winners`
apps/lotemania/src/lib/actions/products.ts   geracao dos titulos conforme a divisibilidade
apps/lotemania/src/lib/validations/product.ts  regra de recusa (premio nao divisivel) e congelamento
apps/lotemania/drizzle/**                    migracao
```

**NÃO toca** — e isto é o recorte, não uma observação:

```
src/lib/actions/reserve.ts    -> LTM-02 (reserva, expiracao, anti-spam, amount)
a coluna `half` e a chave     -> LTM-01
```

⚠️ **`src/db/schema/raffles.ts` é disputado com a `LTM-01`**, que cria `half` e os índices. São
blocos diferentes do mesmo arquivo e **as duas geram migração**: serializar `pnpm db:generate`, e
a `LTM-01` vai primeiro por ser onda 1.

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

### Política de arredondamento escolhida para o AC4
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

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.0 | Nasce do `/grill-with-docs` com o founder: 17 decisões, fronteira fechada. Forma dos dados em `ADR-0001`; vocabulário em `GLOSSARY.md`. | @aiox-master |
| 2026-11-17 | — | **Validada — NO-GO (6,5/10). Permanece `Draft`.** Sem bloco `Files:` com dois arquivos disputados; AC3 manda provar que metades do mesmo pedido expiram separadas (não expiram, e não devem); armadilha do `inArray` não nomeada; `quantity` ambíguo no próprio ADR; `winners` sem onde marcar a metade; AC4 sem política de arredondamento. | @po (Pax) |
