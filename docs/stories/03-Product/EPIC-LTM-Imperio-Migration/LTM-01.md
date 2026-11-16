# LTM-01: Índices em `product_numbers` e `orders` — o comentário do schema vira verdade

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · fecha o problema **F1**
**Prioridade:** **P0** — toda reserva hoje faz varredura sequencial; o esgotamento medido mais rápido é de 18 min (~5,5 números/minuto) com 5 rodadas simultâneas
**Complexidade:** M (Standard) — schema + migração + prova de plano de execução, sem lógica de aplicação
**Criada por:** @pm (Morgan) · 2026-11-16

## Story

**Como** operador do Império vendendo 100 números que esgotam em minutos
**Eu quero** que cada reserva encontre o número por índice, não varrendo a tabela inteira
**Para que** o custo de uma reserva não cresça junto com o histórico de ~900 mil linhas/ano.

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

Comparação de referência: `products` e `payment_gateways` **têm** `uniqueIndex` declarado no mesmo arquivo e no mesmo estilo — o padrão do projeto existe e `product_numbers` ficou de fora.

## Decisão de arquitetura (proposta)

1. **`uniqueIndex` em `(product_id, number)`** — não só índice: a unicidade é a **invariante que sustenta "um dono por linha"**, que é a razão pela qual o `UPDATE` condicional por status da reserva é atômico. Sem a restrição, um seed ou uma importação com bug duplica o número e o sistema vende o mesmo título duas vezes sem nunca reclamar.
2. **Índice em `product_numbers(order_id)`** — três caminhos de código consultam por `orderId`.
3. **Índice parcial para a varredura de expiração** — `(status, reserved_until)` restrito às linhas reservadas. Parcial porque as reservas vivas são sempre uma fração mínima da tabela; um índice cheio paga por 900 mil linhas para encontrar dezenas.
4. **`orders`:** índices derivados dos acessos que existem no código, um a um — não um índice por coluna "por garantia". Cada um precisa de um `EXPLAIN` da consulta real que o justifique (ver AC4).
5. **Criar os índices com a tabela vazia, antes de qualquer importação de histórico do Império.** Hoje ninguém comprou nada — este é o momento de custo zero. Depois de importar o histórico, a criação passa a exigir criação concorrente e janela de manutenção.
6. **O comentário mentiroso sai ou vira verdade** — nunca fica como está.

## Tarefas (Checklist)

- [ ] `src/db/schema/raffles.ts`: terceiro argumento em `productNumbers` com `uniqueIndex` `(product_id, number)`, índice `(order_id)` e índice parcial de expiração.
- [ ] `src/db/schema/raffles.ts`: índices em `orders` conforme os acessos comprovados por `EXPLAIN`.
- [ ] Corrigir o comentário sobre indexação para refletir o que de fato existe.
- [ ] Gerar a migração (`pnpm db:generate`) e revisar o SQL emitido à mão antes de aplicar — índice parcial e `uniqueIndex` são os dois pontos onde o Drizzle Kit costuma emitir algo diferente do pretendido.
- [ ] Script de seed de carga para o teste de plano: 1 milhão de linhas em `product_numbers` (≈ 1 ano do volume medido: 177 rodadas / 7 dias × 100 números ≈ 920 mil/ano).
- [ ] Capturar e registrar no Dev Record o `EXPLAIN (ANALYZE, BUFFERS)` de cada consulta, **antes e depois**.
- [ ] Teste de violação de unicidade (usa a base de teste da LTM-05).

## Critérios de Aceite

- [ ] **AC1 (a invariante existe):** inserir duas linhas com o mesmo `(product_id, number)` falha com violação de unicidade. Comprovado por teste automatizado que espera o erro — não por inspeção visual do schema.
- [ ] **AC2 (reserva sem varredura):** numa base semeada com **1 milhão** de linhas em `product_numbers`, a consulta de reserva (um `product_id`, 10 números, status disponível) executa **sem `Seq Scan on product_numbers`** no plano. Prova: saída de `EXPLAIN (ANALYZE, BUFFERS)` colada no Dev Record, antes (com `Seq Scan`) e depois (com `Index Scan` ou `Bitmap Index Scan`).
- [ ] **AC3 (invariância de escala):** a mesma consulta de reserva executada numa base de 10 mil linhas e numa de 1 milhão difere em menos de **2×** no tempo medido (`EXPLAIN ANALYZE`, mediana de 10 execuções). É este critério — e não um limite absoluto de milissegundos — que prova que o custo deixou de acompanhar o tamanho da tabela.
- [ ] **AC4 (cada índice tem dono):** para **cada** índice criado em `orders` e em `product_numbers` existe, no Dev Record, a consulta real do código que o usa (arquivo e linha) e o `EXPLAIN` mostrando o índice sendo escolhido. Índice sem consulta que o justifique é removido antes do fim da story — índice não usado é custo de escrita em todo pedido pago, e são 10.550 por semana.
- [ ] **AC5 (varredura de expiração):** a consulta de expiração (junção `orders` × `product_numbers`, reserva vencida, pedido pendente) executa sem `Seq Scan` em nenhuma das duas tabelas na base de 1 milhão de linhas. `EXPLAIN` no Dev Record.
- [ ] **AC6 (o schema para de mentir):** uma busca por "Indexed by" em `src/db/schema/raffles.ts` ou não retorna nada, ou retorna um comentário cujo conteúdo corresponde a índice declarado no mesmo arquivo.
- [ ] **AC7 (migração reprodutível):** `pnpm db:push` numa base limpa produz exatamente os índices acima, verificado por consulta a `pg_indexes` listando os nomes esperados.

## Escopo

**IN:** índices e restrição de unicidade em `product_numbers` e `orders`; correção do comentário; migração; script de seed de carga; evidência de `EXPLAIN`.
**OUT:** qualquer mudança de lógica de reserva (é a LTM-02); índices para telas da Frente B que ainda não existem (sem consulta real, não há índice — AC4); particionamento da tabela (o volume medido não pede — ≈900 mil linhas/ano com índice é trivial para Postgres).

## Dependências

- **Nenhuma bloqueante.** Pode rodar na Onda 1, em paralelo com a LTM-05.
- **Habilita a LTM-02:** a unicidade `(product_id, number)` do AC1 é a premissa que torna o `UPDATE` condicional da reserva atômico. A LTM-02 constrói sobre ela.
- O teste do AC1 precisa da base de teste da LTM-05 — se a LTM-05 não estiver pronta, o teste entra junto com ela e esta story registra a pendência.
- ⚠️ **Recurso mutável compartilhado:** gera migração — o journal do Drizzle (`drizzle/meta/_journal.json`) não suporta duas gerações concorrentes. Serializar esse passo.

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
