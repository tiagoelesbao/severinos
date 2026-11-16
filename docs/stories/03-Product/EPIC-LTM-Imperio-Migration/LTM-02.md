# LTM-02: Driver transacional e reserva atômica — fim do "desfaz na mão"

**Status:** Draft
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

```
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
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
- [ ] **AC3 (concorrência — o teste que a LTM-05 escreve vermelho e esta story torna verde):** **20** reservas concorrentes disputando os **mesmos 10 números** terminam com: cada número com **exatamente um** `order_id`; a soma dos números reservados igual a 10; zero pedido pendente com zero números; zero número reservado apontando para pedido inexistente. O verificador de invariantes da LTM-05 passa ao final. O teste precisa ter sido demonstrado **falhando** no código anterior — as duas execuções ficam no Dev Record.
- [ ] **AC4 (falha parcial não deixa resíduo):** uma reserva de 5 números em que 2 já estão tomados deixa a contagem de linhas em `orders` **idêntica** à de antes da chamada (zero pedido criado, nem mesmo em `canceled`), e os 3 números disponíveis continuam disponíveis. Medido por contagem antes/depois no teste.
- [ ] **AC5 (morte no meio não deixa estado inválido):** teste que aborta a conexão entre a inserção do pedido e a tomada dos números (encerrando a transação à força) termina com zero linha nova em `orders` e zero número reservado.
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
