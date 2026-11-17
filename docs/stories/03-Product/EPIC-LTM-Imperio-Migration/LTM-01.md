# LTM-01: Índices em `product_numbers` e `orders` — o comentário do schema vira verdade

**Status:** Ready
> ✅ **De volta a `Ready` em 2026-11-17**, pela **segunda** revalidação do @po. As cinco correções
> exigidas foram conferidas uma a uma **no código**, não na palavra de quem corrigiu: a chave é
> `(product_id, number, half)` com `half NOT NULL` e a razão do `NOT NULL` escrita; a propriedade da
> coluna está decidida nesta story; o bloco `Files:` confere com `grep -rln productNumbers src/`.
> Ver *Revalidação 2 @po (2026-11-17)* ao fim do arquivo.
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o problema **F1**
**Prioridade:** **P0** — toda reserva hoje faz varredura sequencial; o esgotamento medido mais rápido é de 18 min (~5,5 números/minuto) com 5 rodadas simultâneas
**Complexidade:** M (Standard) — schema + migração + prova de plano de execução, sem lógica de aplicação
**Criada por:** @pm (Morgan) · 2026-11-16

## Story

**Como** operador do Império vendendo 100 números que esgotam em minutos
**Eu quero** que cada reserva encontre o número por índice, não varrendo a tabela inteira
**Para que** o custo de uma reserva não cresça junto com o histórico — ≈ 920 mil linhas/ano em sorteio de cota inteira, e até ≈ 1,84 milhão se todos fossem divisíveis (`ADR-0001`, *Custos aceitos*).

## Contexto (evidência lida no código, 2026-11-16)

`apps/lotemania/src/db/schema/raffles.ts` declara, logo acima da tabela:

> `// One row per sellable ticket number. Indexed by (productId, number).`

**O comentário mente.** A definição da tabela não tem terceiro argumento — nenhum `index`, nenhum `uniqueIndex`. A única chave é o `id` (uuid primário), que não serve a nenhum acesso real.

Acessos reais que hoje varrem a tabela:

| Onde | Consulta | Chave que falta |
|---|---|---|
| `src/lib/actions/reserve.ts` (reserva) | `productId = ?` + `number IN (...)` + `status = available` | `(product_id, number)` |
| `src/lib/actions/reserve.ts` (desfazer) | `orderId = ?` | `(order_id)` |
| `src/lib/actions/reserve.ts` (expiração) | junção `orders` × `product_numbers` por `order_id`, com `reservedUntil < now()` | `(order_id)` + `(status, reserved_until)` |
| `src/lib/actions/checkout.ts` (pagamento) | `orderId = ?` | `(order_id)` |

`orders` também não tem índice declarado nenhum — só o `id`. As FKs para `tenants`, `users` e `products` **não criam índice** no Postgres (ao contrário do que muita gente assume).

Comparação de referência: `products` **tem** `uniqueIndex` declarado no **mesmo arquivo** (`raffles.ts:78`), e o mesmo padrão aparece em `core.ts` (`users`, 4 índices), `payments.ts:124` (`payment_gateways`), `integrations.ts:45`, `affiliates.ts:70` e `settings.ts:103` — o padrão do projeto existe em seis arquivos de schema e `product_numbers` ficou de fora.

**Achado adicional da validação (@po, 2026-11-16):** `productNumbers.orderId` é declarado como `uuid("order_id")` **sem `.references(() => orders.id)`** — não existe chave estrangeira para `orders`. É por isso que "número reservado apontando para pedido inexistente" é um estado alcançável, e é exatamente o invariante que a LTM-02 (AC3) e a LTM-05 (AC5-d) verificam por asserção. Esta story indexa essa coluna; **se a FK deve ou não existir é decisão de @architect/@data-engineer**, não desta validação. O que a story passa a exigir é que a decisão seja **tomada e registrada** (AC8), não silenciosamente herdada.

## Decisão de arquitetura (proposta)

1. **`uniqueIndex` em `(product_id, number, half)`, com `half` `NOT NULL`** — não só índice: a unicidade é a **invariante que sustenta "um dono por linha"**, que é a razão pela qual o `UPDATE` condicional por status da reserva é atômico. Sem a restrição, um seed ou uma importação com bug duplica a unidade vendável e o sistema a vende duas vezes sem nunca reclamar.

   **A chave é sobre a unidade vendável, não sobre o número** (`ADR-0001`). Num sorteio divisível, duas linhas com o mesmo `(product_id, number)` e `half` diferente **são o estado correto** — chavear só por `(product_id, number)` tornaria a meia cota impossível de inserir.

   ⚠️ **`half` tem de ser `NOT NULL`, inclusive no caso degenerado.** Em índice único o Postgres trata `NULL` como **distinto de si mesmo**: com a coluna nulável, duas linhas `(p, 42, NULL)` conviveriam e a restrição **pararia de proteger em silêncio**, sem erro em lugar nenhum. Sorteio de cota inteira usa `half = 1`, com default, nunca `NULL`.

   **Esta story cria a coluna `half`** — decidido aqui para encerrar a disputa com a `LTM-07`, simétrico ao que foi feito entre `LTM-03a` e `LTM-04`. A forma da chave é o objeto desta story, e ela está na onda 1, antes de existir qualquer código de reserva. A `LTM-07` passa a **ler** a coluna e **não toca** `src/db/schema/raffles.ts`.
2. **Índice em `product_numbers(order_id)`** — três caminhos de código consultam por `orderId`.
3. **Índice parcial para a varredura de expiração** — `(status, reserved_until)` restrito às linhas reservadas. Parcial porque as reservas vivas são sempre uma fração mínima da tabela; um índice cheio paga por 900 mil linhas para encontrar dezenas.
4. **`orders`:** índices derivados dos acessos que existem no código, um a um — não um índice por coluna "por garantia". Cada um precisa de um `EXPLAIN` da consulta real que o justifique (ver AC4).
5. **Criar os índices com a tabela vazia, antes de qualquer importação de histórico do Império.** Hoje ninguém comprou nada — este é o momento de custo zero. Depois de importar o histórico, a criação passa a exigir criação concorrente e janela de manutenção.
6. **O comentário mentiroso sai ou vira verdade** — nunca fica como está.

## Tarefas (Checklist)

- [ ] `src/db/schema/raffles.ts`: coluna `half` (`integer`, `NOT NULL`, default `1`) em `productNumbers`, mais o terceiro argumento com `uniqueIndex` `(product_id, number, half)`, índice `(order_id)` e índice parcial de expiração.
- [ ] `src/db/schema/raffles.ts`: índices em `orders` conforme os acessos comprovados por `EXPLAIN`.
- [ ] Corrigir o comentário sobre indexação para refletir o que de fato existe.
- [ ] Gerar a migração (`pnpm db:generate`) e revisar o SQL emitido à mão antes de aplicar — índice parcial e `uniqueIndex` são os dois pontos onde o Drizzle Kit costuma emitir algo diferente do pretendido.
- [ ] Script de seed de carga para o teste de plano: **1 milhão de linhas** em `product_numbers`. ⚠️ **A conta citada aqui mudou com o `ADR-0001`, e corrigi-la faz parte desta story:** o volume medido é 177 rodadas / 7 dias × 100 **títulos** ≈ 920 mil **títulos**/ano — o que em **unidades vendáveis** são ≈ 920 mil linhas/ano com tudo em cota inteira e ≈ 1,84 milhão se tudo fosse divisível. O seed permanece em 1 milhão de linhas: ele deixou de representar "um ano exato" e passa a representar **a ordem de grandeza de um ano**, que é o que o AC3 de fato mede (invariância de escala, não um limite absoluto).
- [ ] Capturar e registrar no Dev Record o `EXPLAIN (ANALYZE, BUFFERS)` de cada consulta, **antes e depois**.
- [ ] Teste de violação de unicidade (usa a base de teste da LTM-05).

## Critérios de Aceite

- [ ] **AC1 (a invariante existe, e é sobre a unidade vendável):** duas afirmações, e **as duas são teste**:
  - inserir duas linhas com o mesmo `(product_id, number, half)` **falha** com violação de unicidade;
  - inserir duas linhas com o mesmo `(product_id, number)` e `half` **diferente** **é aceito** — porque é o estado correto de todo sorteio divisível.

  Comprovado por teste automatizado que espera o erro no primeiro caso e o sucesso no segundo — não por inspeção visual do schema. A segunda metade é o que impede alguém de "consertar" a chave de volta para `(product_id, number)` e quebrar a meia cota sem nenhum teste reclamar.
  - **Nota de sequenciamento (@po, 2026-11-16):** este AC é o único que depende da base de teste da LTM-05, e as duas stories rodam na **mesma onda 1**. A prova independente de que os índices existem é o **AC7** (`pg_indexes`), que não depende de ninguém. Portanto: a story pode ser implementada e revisada em paralelo com a LTM-05, mas **não pode ser marcada `Done` com o AC1 pendente** — se a suíte da LTM-05 chegar depois, a LTM-01 fica em `InReview` até o teste rodar. "Pendência registrada" não substitui o AC.
- [ ] **AC2 (reserva sem varredura):** numa base semeada com **1 milhão** de linhas em `product_numbers`, a consulta de reserva (um `product_id`, 10 números, status disponível) executa **sem `Seq Scan on product_numbers`** no plano. Prova: saída de `EXPLAIN (ANALYZE, BUFFERS)` colada no Dev Record, antes (com `Seq Scan`) e depois (com `Index Scan` ou `Bitmap Index Scan`).
- [ ] **AC3 (invariância de escala):** a mesma consulta de reserva executada numa base de 10 mil linhas e numa de 1 milhão difere em menos de **2×** no tempo medido (`EXPLAIN ANALYZE`, mediana de 10 execuções). É este critério — e não um limite absoluto de milissegundos — que prova que o custo deixou de acompanhar o tamanho da tabela.
- [ ] **AC4 (cada índice tem dono):** para **cada** índice criado em `orders` e em `product_numbers` existe, no Dev Record, a consulta real do código que o usa (arquivo e linha) e o `EXPLAIN` mostrando o índice sendo escolhido. Índice sem consulta que o justifique é removido antes do fim da story — índice não usado é custo de escrita em todo pedido pago, e são 10.550 por semana.
- [ ] **AC5 (varredura de expiração):** a consulta de expiração (junção `orders` × `product_numbers`, reserva vencida, pedido pendente) executa sem `Seq Scan` em nenhuma das duas tabelas na base de 1 milhão de linhas. `EXPLAIN` no Dev Record.
- [ ] **AC6 (o schema para de mentir):** uma busca por "Indexed by" em `src/db/schema/raffles.ts` ou não retorna nada, ou retorna um comentário cujo conteúdo corresponde a índice declarado no mesmo arquivo.
- [ ] **AC7 (migração reprodutível):** `pnpm db:push` numa base limpa produz exatamente os índices acima, verificado por consulta a `pg_indexes` listando os nomes esperados.
- [ ] **AC8 (a FK ausente de `product_numbers.order_id` é decisão registrada, não omissão):** o Dev Record traz a decisão explícita — criar a FK para `orders.id` ou **deliberadamente** não criar — com a razão e quem decidiu. Se a decisão for não criar, o comentário no schema diz isso em uma linha, para que a próxima pessoa saiba que o invariante de órfão é responsabilidade da aplicação e do verificador da LTM-05, não do banco. Nenhum caminho desta story deixa a coluna indexada sem que a questão da FK tenha sido respondida.

## Escopo

**IN:** índices e restrição de unicidade em `product_numbers` e `orders`; correção do comentário; migração; script de seed de carga; evidência de `EXPLAIN`.
**OUT:** qualquer mudança de lógica de reserva (é a LTM-02); índices para telas da Frente B que ainda não existem (sem consulta real, não há índice — AC4); particionamento da tabela (o volume medido não pede — ≈900 mil linhas/ano com índice é trivial para Postgres).

## Dependências

- **Nenhuma bloqueante.** Pode rodar na Onda 1, em paralelo com a LTM-05.
- **Habilita a LTM-02:** a unicidade `(product_id, number, half)` do AC1 é a premissa que torna o `UPDATE` condicional da reserva atômico. A LTM-02 constrói sobre ela — e, com a fusão decidida em 2026-11-17, já reescreve a reserva na forma de metades.
- **Habilita a LTM-07:** esta story entrega a coluna `half`; a `LTM-07` a consome e não toca `src/db/schema/raffles.ts`.
- O teste do AC1 precisa da base de teste da LTM-05 — se a LTM-05 não estiver pronta, o teste entra junto com ela e esta story registra a pendência.
- ⚠️ **Recurso mutável compartilhado:** gera migração — o journal do Drizzle (`drizzle/meta/_journal.json`) não suporta duas gerações concorrentes. Serializar esse passo.

## Files

Conjunto **completo**, conferido no código em 2026-11-17 (`grep -rln productNumbers src/`), não inferido das tarefas — foi a inferência que derrubou a `LTM-03` na validação.

**Escreve:**

```
apps/lotemania/src/db/schema/raffles.ts     coluna `half` + os tres indices
apps/lotemania/drizzle/**                   migracao gerada (pasta ainda nao existe)
apps/lotemania/package.json                 se o regime de migracao exigir script novo
```

**Lê `product_numbers` e portanto é afetado pela coluna nova — nenhum deles é editado por esta story, mas todos entram na conferência de regressão:**

```
apps/lotemania/src/lib/actions/reserve.ts
apps/lotemania/src/lib/actions/checkout.ts
apps/lotemania/src/lib/actions/products.ts
apps/lotemania/src/lib/actions/my-titles.ts
apps/lotemania/src/app/loja/[tenant]/page.tsx
apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx
apps/lotemania/src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/page.tsx
apps/lotemania/src/app/dashboard/products/page.tsx
apps/lotemania/src/app/dashboard/products/[id]/orders/page.tsx
```

**Resources:** `drizzle/meta/_journal.json` — recurso mutável compartilhado com `LTM-03a`, `LTM-04` e `LTM-07`. **Serializar `pnpm db:generate`.** A pasta não existe ainda: esta story a cria, e é por isso que o regime de migração versionada é pré-requisito do primeiro índice.

**Depends-on:** nenhuma. É a raiz da onda 1.

## Riscos

- **[Médio] Dado duplicado pré-existente impede criar o `uniqueIndex`** quando o histórico do Império for importado. Mitigação: criar o índice **antes** da importação (tabela vazia hoje) — a importação passa a falhar alto no duplicado em vez de absorvê-lo em silêncio, que é o comportamento desejado.
- **[Médio] Drizzle Kit emitir índice parcial diferente do pretendido.** Mitigação: revisar o SQL gerado à mão (tarefa explícita) e validar por `pg_indexes` (AC7).
- **[Baixo] Índice a mais custando escrita** em 10.550 pedidos/semana. Mitigação: AC4 obriga justificar cada um por consulta real.
- **[Baixo] Seed de 1 milhão de linhas lento na base de teste.** Mitigação: gerar por inserção em massa com `generate_series`, não linha a linha.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### EXPLAIN — antes
_(colar aqui)_

### EXPLAIN — depois
_(colar aqui)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-16)

**Veredicto: GO — 9/10.** Evidência conferida contra o código real: `productNumbers` (`raffles.ts:82`) e `orders` (`raffles.ts:93`) de fato não têm terceiro argumento; o comentário mentiroso está em `raffles.ts:81`; os quatro caminhos de acesso citados existem. Os números do BI reproduzem: `numeros_total` é 100 em 100% das rodadas, mediana de esgotamento 1,748 h (≈ 1,8 h) e mínimo 0,3 h (18 min ⇒ ~5,5 números/minuto).

Correções aplicadas nesta validação:

1. **Evidência imprecisa corrigida** — `payment_gateways` não está no mesmo arquivo que `products`; o padrão de `uniqueIndex` foi reenquadrado com os seis arquivos onde ele de fato aparece.
2. **AC1 destravado do limbo** — nota de sequenciamento: AC7 é a prova independente; `Done` continua exigindo o AC1.
3. **AC8 novo** — a ausência de FK em `product_numbers.order_id` passa a ser decisão registrada. Esta story indexa a coluna; a decisão de FK é de @architect/@data-engineer e precisa ficar escrita.

## Revalidação @po (2026-11-17) — contra o `ADR-0001`

**Veredicto: NO-GO — 5/10.** `Ready` → `Draft`.

A suspeita do epic era "o índice passa a ser sobre `(product_id, number, half)`". **Confirmada — e
é pior do que uma troca de colunas.** Como está escrita, esta story **proíbe** a forma de dados que
o `ADR-0001` escolheu.

### Por que é NO-GO e não uma emenda

O item 1 da decisão de arquitetura e o **AC1** estabelecem `uniqueIndex (product_id, number)` como
*a invariante que sustenta "um dono por linha"*. Com a metade virando linha, **duas linhas com o
mesmo `(product_id, number)` passam a ser o estado correto** de todo sorteio divisível. O AC1, como
está, é satisfeito exatamente por um schema que torna a meia cota inserível **zero vezes**: a
segunda metade do 42 viola a restrição.

Não é ajuste de redação. É a invariante central da story apontando para o lado contrário da
decisão.

### Armadilha de Postgres que a correção precisa evitar — e que ninguém escreveu ainda

`uniqueIndex (product_id, number, half)` **só protege se `half` for `NOT NULL`**. Em índice único,
o Postgres trata `NULL` como distinto de `NULL`: com `half integer` nulável, duas linhas
`(p, 42, NULL)` convivem e a restrição deixa de impedir a duplicação que o AC1 existe para
impedir — silenciosamente, sem erro em nenhum lugar. O caso degenerado de cota inteira tem que ser
`half = 1` (`NOT NULL`, com default), nunca `NULL`.

Evidência de forma atual: `product_numbers` (`src/db/schema/raffles.ts:82-91`) tem
`number: integer("number").notNull()` e nenhuma coluna de metade.

### Dono do arquivo e da coluna: contestado

A **`LTM-07`** reivindica, na sua lista de tarefas de schema, *"`product_numbers`: coluna `half` +
`uniqueIndex` em `(product_id, number, half)`"* — isto é, **a mesma coluna, no mesmo arquivo
(`src/db/schema/raffles.ts`), com a mesma migração**. Duas stories criando a mesma coluna é a classe
de colisão que a `LTM-03a` ↔ `LTM-04` resolveu por atribuição explícita ("fica decidido aqui: a
`LTM-03a` cria"). Aqui ainda não há decisão, e as duas geram migração sobre o mesmo
`drizzle/meta/_journal.json`.

### Correções exigidas antes de voltar a `Ready`

1. **Decidir e escrever quem cria a coluna `half`** — esta story ou a `LTM-07`. Recomendação do
   @po: **esta**, porque a forma da chave é o objeto da story e porque ela está na onda 1, antes de
   qualquer código de reserva existir. Nesse caso a `LTM-07` passa a **ler** a coluna e a não tocar
   `src/db/schema/raffles.ts` — simétrico ao que foi feito entre `03a` e `04`.
2. **Item 1 da arquitetura e AC1 reescritos sobre `(product_id, number, half)`**, com `half`
   `NOT NULL` e a razão do `NOT NULL` registrada (a semântica de `NULL` acima). O AC1 passa a
   afirmar o que de fato é invariante: duas linhas com o mesmo `(product_id, number, half)` falham;
   duas com o mesmo `(product_id, number)` e `half` diferente **são aceitas**, e isso também é
   teste.
3. **AC7 atualizado** — a lista de nomes esperados em `pg_indexes` muda.
4. **AC2/AC3/AC5 redimensionados para a forma divisível.** O seed de 1 milhão de linhas deixa de
   corresponder a "≈1 ano de 100 títulos": em sorteio divisível o mesmo ano são ~1,8 milhão de
   linhas (`ADR-0001`, *Custos aceitos*). O número do seed não precisa dobrar, mas a conta citada
   na tarefa precisa deixar de dizer o que deixou de ser verdade.
5. **Declarar o bloco `Files:` completo** no padrão da `LTM-03a`. Esta story nunca o declarou — o
   epic o declara por ela, e agora que o arquivo é disputado com a `LTM-07` isso deixa de ser
   detalhe. Foi a omissão do conjunto de arquivos que derrubou a `LTM-03`.

### O que **não** mudou e segue valendo

- O índice `(order_id)` e o índice parcial de expiração `(status, reserved_until)`: **intocados**
  pela decisão. Os quatro caminhos de acesso consultam por `order_id` e por `reserved_until`
  independentemente de a linha ser título ou metade.
- **AC4** (cada índice tem dono), **AC6** (o comentário para de mentir) e **AC8** (decisão de FK
  registrada): válidos sem uma vírgula de mudança.
- Toda a evidência de 2026-11-16 reconferida hoje: continua exata.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ❌ sem bloco `Files:`, e o arquivo é disputado |
| UI/Frontend | ➖ n/a |
| Satisfação dos ACs | ❌ AC1 afirma o contrário do `ADR-0001` |
| Instruções de teste | ⚠️ dimensionadas para a forma antiga |
| Segurança | ✅ |
| Sequência de tarefas | ❌ cria coluna que a `LTM-07` também cria |
| Duplicação funcional | ❌ a mesma migração em duas stories |
| Anti-alucinação | ✅ evidência reconferida, zero imprecisão nova |
| Prontidão para @dev | ❌ |

## Revalidação 2 @po (2026-11-17) — as correções fecharam

**Veredicto: GO — 8,5/10.** `Draft` → **`Ready`**.

Conferi as cinco correções **no código**, não na descrição de quem corrigiu.

| Correção exigida em 1.2 | Estado | Como conferi |
|---|---|---|
| 1. Decidir quem cria a coluna `half` | ✅ | Decisão de arquitetura, item 1: *"Esta story cria a coluna `half`"*, e a `LTM-07` traz a contrapartida riscada na própria lista de tarefas (*"a `LTM-01` cria"*) — a disputa está fechada nos **dois** arquivos, não só neste |
| 2. Item 1 e AC1 sobre `(product_id, number, half)`, `NOT NULL` com razão | ✅ | AC1 tem **duas** afirmações e as duas são teste: mesmo `(number, half)` falha, mesmo `number` com `half` diferente **passa**. É a segunda que impede alguém de "consertar" a chave de volta — a trava certa |
| 3. AC7 atualizado | ✅ | AC7 nunca enumerou nomes literais: exige `pg_indexes` listando *"os índices acima"*, e "acima" mudou com a correção 2. Continua verdadeiro |
| 4. AC2/AC3/AC5 e a conta do seed | ⚠️ → ✅ | **Estava aberta**: a tarefa do seed ainda dizia *"≈ 1 ano do volume medido … ≈ 920 mil/ano"*, que deixou de ser verdade em sorteio divisível. **Corrigida nesta validação** (Artigo IV), junto com a mesma conta na seção *Story*. AC2/AC3/AC5 não precisavam de mudança: medem `Seq Scan` e razão de tempo, não unidade |
| 5. Bloco `Files:` completo | ✅ | `grep -rln productNumbers src/` devolve **exatamente** os 10 arquivos declarados — `raffles.ts` mais os 9 leitores. Nenhum a mais, nenhum a menos |

### O que conferi além da lista

- **A armadilha de `NULL` está escrita onde o @dev vai ler** — na decisão de arquitetura, não só no histórico de validação. Era o ponto em que a correção podia nascer certa e ser implementada errada.
- **`half integer NOT NULL default 1` não quebra nenhum dos 9 leitores.** Conferido: nenhum deles insere em `product_numbers` sem default possível, e nenhum depende da forma do `returning`. A lista de regressão da story é a conferência certa, e é suficiente.
- **`package.json` provavelmente nem é tocado.** Os scripts `db:generate` e `db:push` **já existem** (conferido no `package.json`), então a condicional *"se o regime de migração exigir script novo"* tende a não disparar. Isso é bom: reduz a sobreposição com a `LTM-05` a zero na prática, e a serialização declarada passa a ser precaução, não dependência.
- **A pasta `drizzle/` de fato não existe** (conferido). Esta story a cria, como declara.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ✅ `Files:` confere com `grep`; disputa com a `LTM-07` resolvida nos dois lados |
| UI/Frontend | ➖ n/a |
| Satisfação dos ACs | ✅ AC1 virou duas afirmações, e a segunda é a que protege a meia cota |
| Instruções de teste | ✅ |
| Segurança | ✅ |
| Sequência de tarefas | ✅ onda 1, raiz, sem dono disputado |
| Duplicação funcional | ✅ uma migração, uma dona |
| Anti-alucinação | ⚠️ → ✅ a conta do seed ficou para trás e foi corrigida aqui |
| Prontidão para @dev | ✅ |

**Nada do que eu exigi em 1.2 ficou aberto depois desta validação.** O único item que chegou
incompleto (a conta do seed) é de redação e está corrigido no arquivo.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-16 | 1.1 | Validada — GO (9/10). Draft → Ready. Evidência de `uniqueIndex` corrigida, AC1 com nota de sequenciamento, AC8 (decisão de FK) acrescentado. | @po (Pax) |
| 2026-11-17 | 1.2 | **Revalidada contra o `ADR-0001` — NO-GO (5/10). Ready → Draft.** A chave `(product_id, number)` do AC1 proíbe a meia cota. Cinco correções exigidas, incluindo a semântica de `NULL` em índice único e a atribuição da coluna `half` entre esta story e a `LTM-07`. | @po (Pax) |
| 2026-11-17 | 1.3 | **Revalidada (2ª) — GO (8,5/10). Draft → Ready.** As cinco correções de 1.2 conferidas no código: chave `(product_id, number, half)` com `half NOT NULL` e a razão escrita, propriedade da coluna decidida aqui (e riscada na `LTM-07`), `Files:` idêntico ao `grep -rln productNumbers src/`. Corrigida nesta validação a única pendência remanescente: a conta do seed ainda dizia "≈ 1 ano" na forma não divisível (Artigo IV). | @po (Pax) |
