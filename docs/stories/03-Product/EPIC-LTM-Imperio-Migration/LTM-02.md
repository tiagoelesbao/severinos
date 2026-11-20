# LTM-02: Driver transacional e reserva atômica — fim do "desfaz na mão"

**Status:** Ready
> ✅ **Contradição de cabeçalho resolvida pelo @po em 2026-11-20.** Este bloco dizia *"segue `Draft`"*
> **ao lado de** `Status: Ready`, e sobreviveu à correção que ele mesmo exigia — a v1.4 do Change Log
> aplicou as duas pendências e o aviso não foi apagado. **As duas fecharam, conferidas no arquivo e
> no código hoje:**
>
> | A pendência de 17-11 | Onde está fechada, hoje |
> |---|---|
> | `Files:` sem os dois arquivos do AC9 | o bloco `Files:` declara `src/lib/validations/reserve.ts` e `number-grid.tsx`, com o recorte contra a `LTM-08` escrito. Os **6** caminhos existem no disco (conferidos um a um) |
> | preço da metade sem dono e sem AC | **AC10** existe e é desta story: *"em sorteio divisível, reservar uma metade cria pedido com `amount` igual a metade do `pricePerNumber`, sem ágio"* |
>
> **`Ready` é a verdade; o aviso era o resíduo.** O `reserveUnitSchema` com `half` nullable está em
> `validations/reserve.ts:159-162` — ou seja, o contrato que o AC9 exigia **não é mais hipótese**.
>
> ⚠️ **E `Ready` já está atrasado, não adiantado.** O epic §7 registra código desta story commitado
> em `b4d8765b`. A transição `Ready → InProgress → InReview` é do @dev (`story-lifecycle.md`), não
> minha — fica apontada aqui para quem passar por este arquivo não concluir que a fundação não começou.
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o problema **F2**
**Prioridade:** **P0** — é a fundação de tudo que mexe em dinheiro; a LTM-03 não pode ser feita antes
**Complexidade:** L (Standard) — troca de driver + reescrita do caminho de reserva + prova de concorrência
**Criada por:** @pm (Morgan) · 2026-11-16

## Story

**Como** dono de uma operação com ≈ R$ 90 mil/dia atravessando o fluxo
**Eu quero** que criar pedido e tomar números seja uma operação única, que acontece inteira ou não acontece
**Para que** duas pessoas disputando o mesmo número nunca produzam pedido órfão, número com dois donos ou número preso sem pedido.

## Contexto (evidência lida no código, 2026-11-16)

### A causa raiz é o driver, não a lógica

`apps/lotemania/src/db/index.ts`, íntegro, são 7 linhas:

```ts
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

const sql = neon(process.env.DATABASE_URL!);

export const db = drizzle(sql, { schema });
```

`neon-http` fala HTTP: cada consulta é uma requisição independente, **sem sessão**. Transação interativa exige sessão. Por isso existem **zero** `db.transaction()` em 14.462 linhas — não por descuido, mas porque a chamada não funcionaria.

### O que a reserva faz hoje, em consequência

`src/lib/actions/reserve.ts`, função `reserveSelectedNumbers`:

1. insere a linha em `orders` com status pendente;
2. faz o `UPDATE` condicional em `product_numbers` tomando os números disponíveis;
3. se reservou **menos** do que foi pedido, **desfaz à mão**: devolve os números a disponível e marca o pedido como cancelado.

Três coisas quebram nesse desenho:

| Falha | Consequência |
|---|---|
| O processo morre entre (1) e (2) | Pedido pendente com zero números. Conta no funil, nunca expira pelo caminho normal (a varredura de expiração procura por números com reserva vencida — e não há números). |
| O processo morre entre (2) e o desfazer | Números presos em reservado apontando para um pedido que ninguém vai pagar, por 15 minutos de relógio — em rodada que esgota em 18 minutos, é o sorteio inteiro. |
| O desfazer roda normalmente | Deixa resíduo deliberado: um pedido em `canceled` por cada disputa perdida, poluindo a contagem de pedidos. Com esgotamento a ~5,5 números/minuto, disputa perdida é rotina, não exceção. |

A mesma ausência de atomicidade está em `expireStaleReservationsAndCheckSpam`, que faz três escritas soltas (libera números → expira pedidos → atualiza o contador anti-spam do usuário) e em `simulatePayment` em `src/lib/actions/checkout.ts`, que faz quatro.

## Decisão de arquitetura (proposta)

1. **Trocar o driver para `drizzle-orm/neon-serverless` com `Pool`** (WebSocket, mantém sessão) — a saída já identificada. É o único caminho para transação interativa mantendo Neon.
2. **A reserva inteira dentro de um `db.transaction()`:** inserir pedido + tomar números + decidir. Se tomou menos do que pediu, **lançar** e deixar o banco desfazer. Zero compensação manual, zero resíduo em `canceled`.
3. **`expireStaleReservationsAndCheckSpam` e `simulatePayment` também em transação** — pelo mesmo motivo, e porque a LTM-03 vai reusar o fechamento de pedido.
4. **Pool com limite explícito.** Rota de servidor do Next cria e descarta contexto com frequência; pool sem teto em plataforma serverless esgota a conexão do Neon. O teto é configuração, não padrão implícito.
5. **O nível de isolamento é decisão explícita, documentada.** O `UPDATE` condicional por status com `uniqueIndex` em `(product_id, number)` (LTM-01) já dá a exclusão mútua por linha sob `READ COMMITTED` — a transação é o que torna a sequência toda reversível, não o que resolve a corrida. Isso precisa estar escrito, porque a próxima pessoa vai perguntar.

   > **Pergunta aberta que a documentação tem que responder (@po, validação 2026-11-16).** Exclusão mútua *por linha* não é, por si, o que garante o AC3 — que exige **um vencedor com os 10 números**, não "ninguém com número nenhum". Com 20 disputantes pelo mesmo conjunto, se dois `UPDATE` tomarem subconjuntos diferentes, **os dois** voltam com menos do que pediram e **os dois** desfazem: resultado possível é 10 números livres e zero reservas, que falha o AC3 tanto antes quanto depois da transação. O que decide isso é a **ordem em que as linhas são travadas**, e é aí que o índice da LTM-01 entra — não só pela unicidade. **A tarefa de documentação acima deve apurar e registrar qual mecanismo garante o vencedor único** (ordem de travamento por varredura de índice, travamento do conjunto inteiro, ou repetição limitada), com a verificação que sustenta a conclusão. Não presuma: o AC3 repetido 10× (LTM-05, mitigação de intermitência) é o que separa mecanismo de sorte.
6. **Compatibilidade de runtime verificada no runtime real**, não só em teste: o driver WebSocket precisa funcionar no runtime em que as server actions efetivamente rodam.

## Tarefas (Checklist)

- [ ] `src/db/index.ts`: `neon-serverless` + `Pool` com teto configurável; dependência de WebSocket declarada no `package.json`.
- [ ] `src/lib/actions/reserve.ts`: `reserveSelectedNumbers` inteira em `db.transaction()`; remover o bloco de compensação manual.
- [ ] `src/lib/actions/reserve.ts`: `expireStaleReservationsAndCheckSpam` em transação (as três escritas).
- [ ] `src/lib/actions/checkout.ts`: `simulatePayment` em transação (as quatro escritas) — ponto de reuso da LTM-03.
- [ ] Documentar no arquivo a escolha de isolamento e por que o `UPDATE` condicional + unicidade bastam para a corrida.
- [ ] Smoke de runtime: `pnpm build` + `pnpm start` e uma reserva real pelo caminho da loja, com o resultado registrado no Dev Record.
- [ ] Medição de conexões abertas sob carga sequencial.

## Critérios de Aceite

- [ ] **AC1 (transação funciona de verdade):** um teste abre `db.transaction()`, escreve em `orders` e em `product_numbers`, lança, e depois verifica que **nenhuma** das duas escritas persistiu. Hoje esse teste é impossível de passar — é a prova de que o driver mudou de fato.
- [ ] **AC2 (a reserva é uma coisa só):** `reserveSelectedNumbers` executa pedido + números dentro de uma única transação, e o bloco de compensação manual não existe mais. Verificável por busca no arquivo: nenhum caminho de código devolve números a disponível ou marca pedido como cancelado para desfazer a própria operação.
> ## ⚖️ Recorte com a `LTM-07`, decidido em 2026-11-17
>
> **`reserveSelectedNumbers` é reescrito UMA vez, e é aqui.** Esta story entrega a reserva
> transacional **já na forma de metades**; a `LTM-07` fica com schema, regras de divisibilidade,
> geração dos títulos e rateio, e **não toca** `src/lib/actions/reserve.ts`.
>
> Era a colisão que o @po apontou: as duas reivindicavam a mesma função. Reescrever o arquivo mais
> delicado do sistema duas vezes é exatamente o desperdício que o grilling existiu para evitar.
>
> ### ⚠️ A armadilha do `inArray`, que o `ADR-0001` quase escondeu
>
> O ADR diz que o `UPDATE` condicional "não muda de forma". Verdade sobre a **atomicidade**, falso
> sobre o **predicado**: hoje é `inArray(productNumbers.number, data.numbers)` (`reserve.ts:157`),
> que casa por **número**. Com duas linhas por número, casa **as duas** — quem pede uma metade
> reserva as duas e paga por uma. Não falha, não loga: só some um título do estoque a cada compra
> de metade. **O `WHERE` tem de endereçar a unidade vendável.** É o AC9.

- [ ] **AC3 (concorrência — o teste que a LTM-05 escreve vermelho e esta story torna verde):** **20** reservas concorrentes disputando as **mesmas 10 unidades vendáveis** terminam com: cada **unidade** com **exatamente um** `order_id`; a soma das unidades reservadas igual a 10; zero pedido pendente com zero unidades; zero unidade reservada apontando para pedido inexistente. O verificador de invariantes da LTM-05 passa ao final. O teste precisa ter sido demonstrado **falhando** no código anterior — as duas execuções ficam no Dev Record.
- [ ] **AC4 (falha parcial não deixa resíduo):** uma reserva de **5 unidades** em que 2 já estão tomadas deixa a contagem de linhas em `orders` **idêntica** à de antes da chamada (zero pedido criado, nem mesmo em `canceled`), e as 3 disponíveis continuam disponíveis. Medido por contagem antes/depois.
  - **Três cenários, não um** (@po, 2026-11-17): (a) 5 metades avulsas; (b) 5 títulos inteiros, isto é 10 unidades; (c) **carrinho misturado** — o 42 inteiro e metade do 43. O `ADR-0001` afirma que o carrinho misturado "sai de graça" com a metade virando linha; **isso merece ser provado, não presumido**.
- [ ] **AC5 (morte no meio não deixa estado inválido):** teste que aborta a conexão entre a inserção do pedido e a tomada dos números (encerrando a transação à força) termina com zero linha nova em `orders` e zero número reservado.
- [ ] **AC10 (o preço é da unidade, não do título):** em sorteio divisível, reservar **uma metade**
      cria pedido com `amount` igual a **metade** do `pricePerNumber`, sem ágio; reservar o título
      inteiro cobra o preço cheio. Em sorteio de cota inteira o cálculo é idêntico ao de hoje —
      regressão.
  - **O preço estava num vão** (@po, 2026-11-17): a `LTM-07` riscou `amount` dizendo *"a `LTM-02`
    entrega"* e esta story não o mencionava. Ele lê o **marcador de divisibilidade**, que por isso
    subiu para a `LTM-01` — lá entra na mesma migração que o `half`.
- [ ] **AC9 (o `WHERE` endereça a unidade, não o número):** reservar **uma** metade do 42 deixa a **outra metade do 42 disponível**. Teste de uma linha que impede a regressão de venda dupla descrita acima. Em sorteio de cota inteira o comportamento é idêntico ao de hoje — regressão.
- [ ] **AC6 (expiração e pagamento também atômicos):** `expireStaleReservationsAndCheckSpam` e `simulatePayment` rodam em transação única — teste que falha no meio de cada uma verifica que nenhuma das escritas parciais persistiu (incluindo o contador anti-spam do usuário, que hoje pode ser atualizado sem que os números tenham sido liberados).
- [ ] **AC7 (runtime real):** a reserva funciona em `pnpm build` + `pnpm start`, pelo caminho da loja pública, com o resultado registrado. Se algum runtime (por exemplo Edge) for incompatível com o driver WebSocket, isso está **documentado no arquivo** com a restrição explícita de onde o `db` pode ser importado.
- [ ] **AC8 (pool contido):** após 200 reservas sequenciais, o número de conexões abertas ao Postgres permanece **igual ou abaixo** do teto configurado — medido por `pg_stat_activity` e registrado no Dev Record. Sem essa prova, a troca de driver troca varredura sequencial por esgotamento de conexão.

## Escopo

**IN:** troca de driver; transação na reserva, na expiração e no pagamento simulado; teto de pool; documentação do isolamento; smoke no runtime real; prova de concorrência.
**OUT:** fechamento do pedido pelo webhook (é a LTM-03, e depende desta); atribuição por pedido (LTM-04); fila ou lock distribuído — o `UPDATE` condicional com unicidade resolve a corrida no volume medido (100 números, ~5,5/minuto), e introduzir infraestrutura de fila sem medição que a exija seria escopo inventado.

## Dependências

- **Depende de LTM-01** — a unicidade `(product_id, number)` é a premissa de atomicidade por linha.
- **Depende de LTM-05** — o teste de concorrência do AC3 é escrito lá e tem que existir vermelho antes.
- **Bloqueia LTM-03** — fechar pedido sem transação recria exatamente este problema, agora com dinheiro já capturado.
- **Onda 2, sozinha.** Toca `src/db/index.ts`, `src/lib/actions/reserve.ts`, `src/lib/actions/checkout.ts` e `package.json` — a LTM-04 também toca `reserve.ts` e a LTM-05 também toca `package.json`, então não compartilha onda com nenhuma das duas.

## Files

Conferido no código em 2026-11-17.

**Escreve:**

```
apps/lotemania/src/db/index.ts                     driver neon-http -> neon-serverless com Pool
apps/lotemania/src/lib/actions/reserve.ts          a reserva, JA na forma de metades
apps/lotemania/src/lib/actions/checkout.ts         simulatePayment transacional
apps/lotemania/src/lib/validations/reserve.ts      o pedido deixa de ser lista de NUMEROS
apps/lotemania/src/app/loja/[tenant]/[productSlug]/number-grid.tsx
                                                   o unico chamador, SO o que o contrato exige
apps/lotemania/package.json                        dependencia do driver WebSocket
```

> **Os dois arquivos do meio entraram em 2026-11-17, e sem eles o AC9 não é implementável.**
> `reserveNumbersSchema.numbers` é `z.array(z.number())` — **não existe `(number, half)`**. Endereçar
> a unidade vendável obriga a mudar o contrato de entrada, e o chamador junto, senão o `typecheck`
> quebra — que é AC1 da `LTM-05`. O bloco anterior declarava só três arquivos e a story teria
> travado no primeiro dia.
>
> **Recorte com a `LTM-08`, que também toca `number-grid.tsx`:** esta story mexe **apenas no que o
> contrato de reserva exige** — como a seleção vira a carga enviada. A **aparência** da grade
> (célula partida, bandas clicáveis, rótulo de unidade) é da `LTM-08`. Mesmo arquivo, recortes
> disjuntos; se as duas forem à mesma onda, **serializar**.

**Depends-on:** `LTM-01` (a coluna `half`, **o marcador de divisibilidade** e os índices) · `LTM-05` (a suíte que prova).

> **O preço da unidade é desta story, e isso fecha um ciclo.** O @po encontrou `amount` num vão: a `LTM-07` o riscou dizendo "a `LTM-02` entrega", e esta story não o mencionava. Cobrar metade exige saber se o sorteio é divisível — por isso o marcador subiu para a `LTM-01` em 2026-11-17, e esta story passa a lê-lo. **Acrescentar à checklist:** `amount` calculado na unidade do sorteio, metade custando exatamente metade, sem ágio.

⚠️ **`reserve.ts` é exclusivo desta story.** A `LTM-07` **não** o toca — recorte decidido em
2026-11-17. `package.json` é disputado com a `LTM-05` (scripts de teste): chaves diferentes do
mesmo arquivo, **serializar** se forem na mesma onda, que é o caso.

## Riscos

- **[Alto] O driver WebSocket se comportar diferente no runtime do Next** (cold start, conexão interrompida, incompatibilidade com Edge). Mitigação: AC7 exige smoke no runtime real, não só em teste de integração.
- **[Médio] Esgotamento de conexão do Neon** sob 5 rodadas simultâneas esgotando. Mitigação: AC8 mede; teto de pool explícito.
- **[Médio] Latência maior por conexão (WebSocket vs. HTTP)** no primeiro acesso. Mitigação: medir e registrar; o ganho de correção é inegociável, mas o número precisa ser conhecido antes do corte (portão G4 do epic).
- **[Baixo] Transação longa segurando linha e aumentando contenção.** Mitigação: manter dentro da transação só o que é escrita do pedido — leitura de tenant, produto e bloqueio de telefone continua fora.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Teste de concorrência — execução vermelha (antes)
_(colar aqui)_

### Teste de concorrência — execução verde (depois)
_(colar aqui)_

### Medição de pool e latência
_(colar aqui)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-16)

**Veredicto: GO — 9/10.** Toda a evidência confere com o código: `src/db/index.ts` usa `neon-http` e tem as 7 linhas; `reserveSelectedNumbers` (`reserve.ts:77`) insere o pedido, faz o `UPDATE` condicional e compensa à mão em `reserve.ts:164-169`; `expireStaleReservationsAndCheckSpam` (`reserve.ts:23`) tem as três escritas soltas descritas; `simulatePayment` (`checkout.ts:10`) tem as quatro.

Correções aplicadas nesta validação:

1. **Citação do `db/index.ts` completada** — faltava o `import * as schema`, e a frase dizia "íntegro".
2. **Pergunta aberta registrada no item 5 da decisão de arquitetura** — o AC3 exige **um vencedor com os 10 números**; exclusão mútua por linha, sozinha, admite o resultado "todos desfazem, ninguém leva". A tarefa de documentar o isolamento passa a ter que apurar qual mecanismo garante o vencedor único. É o ponto onde a dependência da LTM-01 é mais forte do que a story dizia.

**Não bloqueante, para ciência do @dev:** `product_numbers.order_id` não tem FK para `orders` (ver LTM-01, AC8). O invariante "número reservado apontando para pedido inexistente" do AC3 é, por isso, responsabilidade da aplicação e do verificador da LTM-05 — não do banco.

## Revalidação @po (2026-11-17) — contra o `ADR-0001`

**Veredicto: NO-GO — 6/10.** `Ready` → `Draft`.

A suspeita do epic era "a reserva que ela torna transacional é a de metades". **Confirmada, com uma
correção importante de ênfase:** a troca de driver e o envelope transacional não são afetados pela
meia cota. O que é afetado é **o predicado da reserva** — e a frase do `ADR-0001` que diz que ele
*"não muda de forma"* é, lida ao pé da letra, um convite a um bug de venda dupla.

### A armadilha concreta, no código real

`src/lib/actions/reserve.ts:150-160`:

```ts
.where(and(
  eq(productNumbers.productId, product.id),
  inArray(productNumbers.number, data.numbers),
  eq(productNumbers.status, "available"),
))
.returning({ number: productNumbers.number });
```

Com a metade virando linha, `inArray(number, [42])` **casa as duas linhas do 42**. Quem pede
*uma* metade do 42 reserva as duas — e a outra metade sai do mercado sem ninguém ter comprado,
em silêncio, sem erro em lugar nenhum.

O `ADR-0001` está certo sobre o que importa (a atomicidade mora em *cabe um dono por linha*, e isso
se preserva), mas a afirmação *"o `UPDATE` condicional **não muda de forma**"* é falsa sobre o
`WHERE`: `number IN (...)` tem que virar casamento de par `(number, half)`. Um @dev em YOLO que
leia o ADR e mantenha o `inArray` entrega essa regressão com o ADR na mão como justificativa.

Dois efeitos colaterais no mesmo bloco, igualmente concretos:

| Linha | Hoje | Com metade |
|---|---|---|
| `.returning({ number })` | lista de números | devolve `[42, 42]` — perde qual metade foi tomada; precisa de `half` no `returning` |
| `reserved.length < data.numbers.length` | contagem contra contagem | compara **linhas** com **números pedidos**; só volta a ser verdade se as duas pontas estiverem na mesma unidade |
| `amount = data.numbers.length * Number(product.pricePerNumber)` (`:136`) | preço por título | em sorteio divisível é metade exata do preço, sem ágio (`GLOSSARY` → meia cota) |

### Colisão de onda — e uma contradição dentro do epic

O epic diz, em *Ordem recomendada*: `LTM-02` **+** `LTM-07` na mesma onda. E diz, na *Nota para
formação de ondas*: **"Onda 2: `LTM-02` sozinha"**. As duas frases não podem ser verdade ao mesmo
tempo, e a primeira viola `.claude/rules/parallel-waves.md`: as duas stories tocam
`src/lib/actions/reserve.ts` — a **mesma função**, `reserveSelectedNumbers`. Conjuntos de arquivo
não disjuntos não formam onda.

Pior: a `LTM-07` reivindica explicitamente o `amount` e o formato do pedido como lista de metades,
que é o mesmo bloco de linhas que esta story reescreve. Sem recorte, `reserve.ts` é reescrito duas
vezes — exatamente o desperdício que o epic diz que o `/grill-with-docs` existiu para evitar.

### A pergunta aberta do item 5 ficou mais difícil, não igual

Registrei em 2026-11-16 que exclusão mútua *por linha* não garante, sozinha, o AC3 ("um vencedor com
os 10 números"), e que o que decide isso é a **ordem de travamento**, ligada ao índice da `LTM-01`.
Com a metade:

- o índice mudou de `(product_id, number)` para `(product_id, number, half)` — a ordem de varredura
  muda com ele;
- comprar **10 títulos inteiros** passa a exigir **20 linhas** na mesma instrução, dobrando a
  superfície do resultado ruim "dois desfazem, nenhum leva";
- a contenção dobra no mesmo ponto (`ADR-0001`, *Contexto*).

A tarefa de documentação do item 5 continua necessária e agora tem que responder na forma
divisível. Não é um parágrafo a mais: é a diferença entre mecanismo e sorte, sob o dobro da
disputa.

### Correções exigidas antes de voltar a `Ready`

1. **Recorte com a `LTM-07`, por escrito.** Quem reescreve `reserveSelectedNumbers`? Recomendação
   do @po: **uma reescrita só**, e ela é desta story — a `LTM-02` passa a entregar a reserva
   transacional **já na forma de metades**, e a `LTM-07` fica com schema, regras de divisibilidade,
   geração dos títulos e rateio. A alternativa (a `LTM-07` reescreve e a `LTM-02` só troca o driver
   e envolve em transação) também é legítima; o que não é legítimo é as duas reivindicarem a função.
2. **Nomear a armadilha do `inArray`** no contexto da story, com AC próprio: reservar uma metade do
   42 deixa a outra metade do 42 **disponível**. É um AC de uma linha que impede uma regressão de
   venda dupla.
3. **AC3 reescrito na unidade do sorteio** — "20 reservas disputando as mesmas 10 **unidades**", com
   o caso de título inteiro (20 linhas, tudo-ou-nada) como cenário próprio, que é o AC2 da `LTM-07`.
4. **AC4 e AC5** revistos: "5 números em que 2 já estão tomados" precisa dizer se são 5 metades, 5
   títulos, ou um carrinho misturado — o `ADR-0001` diz que o carrinho misturado "sai de graça", e
   isso merece ser provado, não presumido.
5. **Dependência da `LTM-07` declarada** nos dois sentidos. Hoje a `LTM-07` declara depender desta;
   esta não menciona a `LTM-07`.

### O que **não** mudou e segue valendo

- Tudo sobre o driver: `neon-http` → `neon-serverless` com `Pool`, teto explícito, **AC1**, **AC7**
  e **AC8**. A meia cota não toca nenhum deles.
- **AC6** (expiração e `simulatePayment` atômicos) continua válido. Conferido hoje: a varredura
  libera por `inArray(productNumbers.orderId, expiredIds)` (`reserve.ts:110-113`), isto é, **por
  pedido** — então as duas metades de um título inteiro, que vivem no mesmo pedido e recebem o mesmo
  `reservedUntil` no mesmo `UPDATE`, sempre expiram juntas. **Não há aqui o risco de meia expiração
  que eu esperava encontrar** — está mitigado por construção, e registro isso para ninguém inventar
  a mitigação de um problema que não existe.
- A evidência de 2026-11-16 (as 7 linhas de `db/index.ts`, a compensação manual em `:164-169`, as
  três escritas soltas, as quatro de `simulatePayment`): reconferida, exata.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ❌ conjunto declarado colide com a `LTM-07` na mesma onda |
| UI/Frontend | ➖ n/a |
| Satisfação dos ACs | ⚠️ AC3/AC4/AC5 sem unidade declarada |
| Instruções de teste | ⚠️ |
| Segurança | ✅ |
| Sequência de tarefas | ❌ mesma função reivindicada por duas stories |
| Duplicação funcional | ❌ `reserve.ts` reescrito duas vezes se nada for decidido |
| Anti-alucinação | ✅ |
| Prontidão para @dev | ❌ a armadilha do `inArray` não está escrita em lugar nenhum |

## Revalidação 2 @po (2026-11-17) — duas fecharam, duas abriram

**Veredicto: NO-GO — 6,5/10.** Permanece `Draft`. **Onda 2** — não atrasa a onda 1.

As correções que eu pedi foram aplicadas, e bem. O NO-GO é por duas consequências **novas** do
próprio recorte, que não existiam na versão anterior porque a versão anterior não tinha AC9.

| Correção exigida em 1.2 | Estado |
|---|---|
| 1. Recorte com a `LTM-07`, por escrito | ✅ e **nos dois arquivos**: o bloco em destaque aqui diz *"reescrito UMA vez, e é aqui"*, e a `LTM-07` traz a contrapartida riscada (*"a `LTM-02` entrega"*). É assim que recorte se fecha |
| 2. Armadilha do `inArray` nomeada, com AC próprio | ✅ **AC9** é a melhor peça nova do epic hoje: uma linha de teste contra uma venda dupla silenciosa |
| 3. AC3 na unidade do sorteio | ✅ *"as mesmas 10 unidades vendáveis"*, com título inteiro remetido ao AC2 da `LTM-07` |
| 4. AC4/AC5 com a unidade declarada | ✅ e melhor do que pedi: três cenários, com o **carrinho misturado** provado em vez de presumido — o `ADR-0001` diz que ele "sai de graça", e "de graça" é exatamente o tipo de afirmação que merece teste |
| 5. Dependência da `LTM-07` nos dois sentidos | ❌ **a mais importante, e segue aberta** — ver item 2 abaixo |

### 1. O `Files:` não declara os dois arquivos que o AC9 exige — e é a classe de defeito que derrubou a `LTM-03`

**AC9:** *"reservar **uma** metade do 42 deixa a **outra metade do 42 disponível**"*.

Para pedir *uma metade do 42*, a entrada precisa dizer **qual**. Conferido hoje, o contrato de
entrada não tem onde carregar isso:

```ts
// src/lib/validations/reserve.ts
numbers: z.array(z.number().int().min(0)).min(1, "Selecione ao menos um número"),
```

É uma lista de inteiros. Não existe `(number, half)`. Então:

- **`src/lib/validations/reserve.ts`** tem que mudar — é lá que `ReserveNumbersInput` nasce, e é o
  tipo que `reserveSelectedNumbers(input)` consome (`reserve.ts:77`);
- **`src/app/loja/[tenant]/[productSlug]/number-grid.tsx`** tem que mudar junto. É o **único**
  chamador (conferido: `grep -rn reserveSelectedNumbers src/` devolve a importação na linha 18 e a
  chamada na linha 59, e nada mais). Mudar o tipo de entrada e não mudar o chamador **quebra o
  `typecheck`** — que é AC1 da `LTM-05` e gate desta fundação.

Nenhum dos dois está no bloco `Files:`. Foi exatamente a omissão do conjunto de arquivos que
derrubou a `LTM-03` em 2026-11-16, e eu não tenho como aplicar um critério para ela e outro aqui.

**E tem colisão nova embutida:** a grade é da **`LTM-08`** (AC1 de lá: *"cada título renderiza duas
bandas"*). Então `number-grid.tsx` é disputado, e o recorte tem que ser escrito como o da
`reserve.ts` foi:

> **Recomendação do @po:** esta story muda o **contrato de entrada** e faz o chamador atual
> **compilar e continuar correto** — a grade de hoje passa a enviar o título inteiro como **as duas
> metades**, sem mudar um pixel. A `LTM-08` faz a **célula partida** e a seleção de metade avulsa.
> Assim `number-grid.tsx` é tocado duas vezes, mas por razões disjuntas e em ondas diferentes — e a
> segunda não desfaz a primeira.

### 2. O preço da metade ficou sem dono, sem AC, e depende de uma coluna que ninguém cria na onda certa

Três fatos, cada um conferido:

1. A **`LTM-07`** risca o `amount` da sua lista de tarefas com *"a `LTM-02` entrega"*.
2. Esta story **não menciona `amount`** em nenhuma tarefa e em nenhum AC. A única aparição é na
   **tabela de efeitos colaterais** da minha revalidação de 1.2 — isto é, no histórico, não no
   escopo. Entre as duas stories, **o preço da meia cota caiu no vão**.
3. Para cobrar metade, a reserva precisa saber que o sorteio é divisível. Conferido:
   **`products` não tem marcador de divisibilidade** (`src/db/schema/raffles.ts:44-79`; a
   configuração dos ~12 painéis vive no blob `advancedSettings`), e criar esse marcador é escopo
   declarado da **`LTM-07`** — que vem **depois** desta na ordem do epic.

Isto é um ciclo: a onda 2 precisa de uma coluna da onda 3. Como está, o @dev da `LTM-02` tem duas
saídas e as duas são ruins — inventar o marcador (roubando escopo da `LTM-07`, no arquivo que a
`LTM-01` acabou de tocar) ou deixar o preço errado em sorteio divisível, que é dinheiro.

> **Recomendação do @po:** o marcador de divisibilidade em `products` passa para a **`LTM-01`**,
> junto com a coluna `half`. É **uma coluna** no arquivo que a `LTM-01` já possui na **onda 1**,
> antes de existir qualquer código de reserva — exatamente o argumento que fechou a disputa do
> `half`. A `LTM-07` continua dona das **regras** (recusa de prêmio não-dinheiro, congelamento na
> primeira venda, geração dos títulos); só a **forma** sobe para a onda 1.
>
> E esta story ganha o AC que falta: **AC10 (o preço da unidade)** — em sorteio divisível, reservar
> uma metade cobra **exatamente metade** do `pricePerNumber`, sem ágio (`GLOSSARY` -> meia cota); em
> sorteio de cota inteira o valor é idêntico ao de hoje. Medido no `amount` do pedido, não na tela.

### 3. Uma precisão de linha (Artigo IV)

O AC9 e o bloco em destaque citam o `inArray` em **`reserve.ts:157`**. Conferido hoje com
`grep -n inArray`: o predicado está na **linha 157**. As linhas 54 e 58 são os outros dois
`inArray` (a liberação por pedido e a expiração dos pedidos). A citação veio do `ADR-0001`, que
tem o mesmo número errado — corrigi lá e registro aqui. Linha citada é evidência; evidência torta
manda o @dev olhar o bloco errado do arquivo mais delicado do sistema.

### O que **não** mudou e segue valendo

- Tudo sobre o driver: `neon-http` -> `neon-serverless` com `Pool`, teto explícito, **AC1**, **AC7**,
  **AC8**. A meia cota não toca nenhum deles.
- A **pergunta aberta do item 5** (qual mecanismo garante o vencedor único, e não "todos desfazem,
  ninguém leva") continua necessária e continua sem resposta — e agora sobre 20 linhas em vez de 10
  quando o pedido é de títulos inteiros. Não é parágrafo a mais: é a diferença entre mecanismo e
  sorte.
- **AC6** e o registro de que a expiração **não** tem risco de meia expiração (ela libera por
  pedido, `reserve.ts:51-58`): reconferido no código, exato.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ❌ faltam `validations/reserve.ts` e `number-grid.tsx`, e o segundo é disputado com a `LTM-08` |
| UI/Frontend | ⚠️ a story muda o contrato que a grade chama e não diz o que acontece com a grade |
| Satisfação dos ACs | ⚠️ AC9 não é implementável dentro do conjunto declarado; o preço da metade não tem AC |
| Instruções de teste | ✅ os três cenários do AC4 são o padrão certo |
| Segurança | ✅ |
| Sequência de tarefas | ❌ precisa de uma coluna que a `LTM-07` cria depois dela |
| Duplicação funcional | ✅ o recorte com a `LTM-07` está fechado nos dois lados |
| Anti-alucinação | ⚠️ `reserve.ts:157` é `:157` |
| Prontidão para @dev | ❌ |

### Correções exigidas antes de voltar a `Ready`

1. **`Files:` ganha `src/lib/validations/reserve.ts` e
   `src/app/loja/[tenant]/[productSlug]/number-grid.tsx`**, com o recorte da grade escrito contra a
   `LTM-08` (recomendação acima).
2. **O preço da metade ganha dono e AC** (`AC10` proposto acima), e o **marcador de divisibilidade
   em `products` sobe para a `LTM-01`** — ou, se a decisão for outra, a dependência
   `LTM-02 -> LTM-07` passa a estar declarada e a ordem das ondas muda junto. O que não pode ficar é
   o vão.
3. `reserve.ts:157` -> `:157` nas duas citações.

Nenhuma das três mexe no mérito da story, e nenhuma depende de decisão do founder.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-17 | 1.4 | As três correções do @po aplicadas: `Files:` ganhou `validations/reserve.ts` e `number-grid.tsx` (sem eles o AC9 não é implementável — `reserveNumbersSchema.numbers` é `z.array(z.number())`), com o recorte contra a `LTM-08` escrito; **AC10** novo dá dono ao preço da unidade, que estava num vão entre esta story e a `LTM-07`; e as quatro citações de `reserve.ts:152` passaram para `:157`. **`Draft` → `Ready`.** Nenhuma das três mexia no mérito nem dependia de decisão do founder. | @aiox-master |
| 2026-11-20 | 1.5 | **Contradição de cabeçalho resolvida — `Ready` confirmado.** O aviso *"segue `Draft`"* convivia com `Status: Ready` desde a v1.4: ele listava duas pendências que a própria v1.4 fechou e ninguém apagou o aviso. Conferido hoje: **AC10 existe** no corpo dos critérios; o bloco `Files:` declara os **6** caminhos e **todos existem no disco**; `reserveUnitSchema` com `half` nullable está em `validations/reserve.ts:159-162`. Nenhum AC, escopo ou título alterado — só o bloco de status. Registrada a divergência inversa (código commitado em `b4d8765b` sobre story `Ready`), que é do @dev corrigir. | @po (Pax) |


| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-16 | 1.1 | Validada — GO (9/10). Draft → Ready. Citação do driver completada; pergunta aberta sobre o mecanismo de vencedor único registrada no item 5. | @po (Pax) |
| 2026-11-17 | 1.2 | **Revalidada contra o `ADR-0001` — NO-GO (6/10). Ready → Draft.** A armadilha do `inArray(number, ...)` casando as duas metades; colisão de onda e de função com a `LTM-07`; contradição interna do epic sobre a onda 2. Registrado que a expiração **não** tem o risco de meia expiração — está mitigada por construção. | @po (Pax) |
| 2026-11-17 | 1.3 | **Revalidada (2a) — NO-GO (6,5/10). Permanece `Draft`.** Recorte com a `LTM-07` e armadilha do `inArray` (AC9): fechados. Abertos: `Files:` sem `validations/reserve.ts` nem `number-grid.tsx` (sem eles o AC9 não é implementável e o `typecheck` quebra), e o preço da metade sem dono nem AC, dependendo de um marcador de divisibilidade que a `LTM-07` cria depois desta onda. | @po (Pax) |
