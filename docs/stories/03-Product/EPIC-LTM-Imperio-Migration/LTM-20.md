# LTM-20: O número reservado e abandonado nunca volta ao estoque

**Status:** Done
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação)
**Prioridade:** **P0 — defeito de correção no caminho do dinheiro.** Com ele, um sorteio **não consegue esgotar**
**Complexidade:** M — o conserto é pequeno; decidir **onde** ele roda é a parte difícil
**Criada por:** @aiox-master · 2026-11-19, a partir de relato do founder usando o produto
**Diagnóstico:** confirmado no código na mesma data

## O relato

> *"reservas expiradas não saem da reserva disponibilizando o número novamente após tempo
> determinado"* — founder, 2026-11-19

## O diagnóstico — confirmado, não suposto

A varredura que libera reserva vencida é
`expireStaleReservationsAndCheckSpam` (`src/lib/actions/reserve.ts:129`).

**Duas propriedades dela, lidas no código, explicam o relato inteiro:**

### 1. É chamada em **um** lugar só

```
src/lib/actions/reserve.ts:306
  const spamCheck = await expireStaleReservationsAndCheckSpam(tenant.id, userId);
```

Dentro de `reserveSelectedNumbers`. **Não há job, não há cron, não há rota agendada.** Busca por
`reservedUntil` em `src/` devolve três arquivos: o schema, este arquivo e as validações. Nada mais
no sistema olha para o prazo.

> **Consequência:** se ninguém tentar reservar, **nada expira**. O relógio corre, o prazo vence, e o
> número continua amarelo na grade.

### 2. Filtra por **um** comprador

```sql
eq(orders.tenantId, tenantId),
eq(orders.userId, userId),      -- ← aqui
eq(orders.status, "pending"),
eq(productNumbers.status, "reserved"),
sql`reserved_until < now()`
```

A varredura só libera as reservas **de quem está reservando agora**.

### O caminho que trava o número para sempre

1. **Ana** reserva o número 42. `reservedUntil` = agora + 15 min.
2. Ana some. O prazo vence.
3. **Bruno** abre a loja. O 42 está **amarelo** — reservado.
4. Bruno tenta reservar o 42. A varredura roda **para o Bruno**, não para a Ana. A reserva vencida
   da Ana **não é tocada**. O `UPDATE ... WHERE status = 'available'` não acha o 42.
5. Bruno recebe *"Algum dos números escolhidos acabou de ser reservado por outra pessoa"* e desiste.
6. **O 42 fica travado até a Ana voltar e tentar reservar outra coisa.** Se ela nunca voltar, nunca.

**Um sorteio em que isso acontece não esgota.** As 5 rodadas diárias do Império esgotam em ~18
minutos; qualquer reserva abandonada vira um buraco permanente no estoque.

### A demonstração, medida na Sorteamos em 2026-11-19

Não é raciocínio: foi observado, por acidente, no mesmo dia.

Durante a observação do fluxo de compra (`docs/research/2026-11-18-inventario-sorteamos/fluxo-de-compra.md`)
foi criada uma reserva real no número **95** da campanha `46º RAPIDINHA`, às **08:33:19**, com
expiração às **09:02:49**. **O pagamento não foi feito** — a reserva foi abandonada de propósito.

Ao reabrir a campanha depois do prazo:

```
1 Livres   ·   0 Reservados   ·   99 Pagos
```

**A rodada esgotou**, e o **único** número livre é o 95 — o abandonado, **devolvido ao estoque pela
Sorteamos**. O contador de reservados zerou.

> **O mesmo caso no lotemania teria terminado assim:** o 95 ficaria **travado para sempre**, a
> rodada pararia em **99 de 100**, e o sorteio **nunca** esgotaria. Uma pessoa que desistiu de uma
> compra de R$ 4,00 teria impedido o fechamento da rodada inteira.
>
> **É o custo exato do defeito, numa rodada real, com números reais.**

### Por que o teste não pegou

A suíte da `LTM-05` tem teste de expiração, e ele **passa** — porque exercita a expiração
**do próprio usuário**, que é o caminho que funciona. O defeito mora no caminho **entre dois
compradores diferentes**, e esse caso não existe na suíte.

> **É o tipo de buraco que só aparece com duas pessoas.** Não é falta de teste por descuido: é um
> caso que não ocorre a quem escreve teste pensando num ator só.

## Story

**Como** comprador querendo o número que está livre há meia hora
**Eu quero** que ele esteja disponível quando o prazo de outro venceu
**Para que** o sorteio consiga esgotar, e eu não leve "reservado por outra pessoa" sobre uma reserva
que já morreu.

## Decisão de arquitetura — a parte difícil

Liberar reserva vencida **de qualquer um** é uma linha. **Onde isso roda** é a decisão.

| Caminho | Como funciona | Custo | Risco |
|---|---|---|---|
| **A. Varredura global na reserva** | tirar o `eq(orders.userId, userId)` do filtro de liberação | uma linha | a varredura passa a escrever linhas de outros compradores **dentro da transação de quem reserva** — e o contador anti-spam precisa continuar sendo só do usuário |
| **B. Varredura na leitura da grade** | a página do sorteio libera vencidos antes de pintar | sorteio parado nunca conserta sozinho, mas **ninguém vê número travado** | escrita no caminho de leitura, que é o mais quente |
| **C. Tarefa agendada** | um job periódico varre tudo | o jeito certo em regime | o lotemania **não tem** agendador; e a `OPS-01` registra o que acontece com tarefa agendada que falha calada |
| **D. A e B juntos** | varredura global nos dois pontos | cobre leitura e escrita | duas escritas a mais |

**Recomendação: A + B.** O caminho A conserta a disputa real (dois compradores pelo mesmo número); o
B conserta o que o comprador **vê**, que é o que gera a reclamação. Nenhum dos dois depende de
infraestrutura que não existe. O C fica para quando houver agendador, e aí substitui o B.

> ⚠️ **O anti-spam não pode viajar junto.** A função hoje faz **duas** coisas: libera unidades
> vencidas **e** conta reservas abandonadas do comprador para bloqueá-lo. **A liberação tem de virar
> global; a contagem tem de continuar sendo do usuário.** Fundir os dois escopos faria o comprador
> ser bloqueado pelo abandono de estranhos — defeito pior que o original.

## Tarefas (Checklist)

- [x] Separar a função em duas: **liberar vencidos** (global, por sorteio) e **contar abandono**
      (por comprador). Hoje são uma só.
- [x] A liberação global roda na reserva (caminho A).
- [x] A liberação global roda ao montar a grade do sorteio (caminho B).
- [x] Teste do caminho entre **dois compradores diferentes** — o caso que a suíte não tem.
- [x] `[CONFIRMAR]` com o founder: a `LTM-17` vai tornar a janela configurável por sorteio. A
      varredura global precisa respeitar a janela **de cada sorteio**, não uma só.
      → **[AUTO-DECISION]** respondido pelo código, não por elicitação: a varredura **já** decide
      pelo `reserved_until` **da unidade**, que é onde a janela do sorteio se materializa no momento
      da reserva. Ela nunca leu uma janela global, nem antes nem agora. Quando a `LTM-17` fizer
      `reservationMinutesFor` ler a configuração do sorteio, **nada aqui muda** — e o AC6 já tem
      teste de dois sorteios com prazos diferentes que prende essa propriedade.

## Critérios de Aceite

- [x] **AC1 (o caso de dois compradores):** Ana reserva o 42 e some; o prazo vence; **Bruno
      consegue reservar o 42**. Teste com dois usuários distintos — é o defeito, e nenhum teste
      atual o cobre.
- [x] **AC2 (a grade não mente):** depois do prazo vencido, a página do sorteio mostra o 42 como
      **livre**, sem que ninguém tenha tentado reservar nada. É o que o comprador vê.
- [x] **AC3 (o anti-spam continua sendo do comprador):** reservas abandonadas **de outros** não
      aumentam o contador de bloqueio de quem está reservando. Teste: Ana abandona 3 reservas,
      Bruno reserva normalmente e **não** é bloqueado. É a regressão que impede o conserto de criar
      um defeito pior.
- [x] **AC4 (pedido pago nunca é tocado):** unidade de pedido `paid` não é liberada em nenhum dos
      dois caminhos, mesmo com `reserved_until` no passado. Hoje o filtro `orders.status =
      'pending'` protege; o teste prova que continua protegendo depois da mudança.
- [x] **AC5 (sob concorrência não libera duas vezes):** duas liberações simultâneas do mesmo pedido
      vencido não produzem estado inconsistente nem erro. A `LTM-05` tem o ferramental.
- [x] **AC6 (a janela é a do sorteio):** com sorteios de janelas diferentes, cada um expira pela
      sua. Depende da `LTM-17`; enquanto ela não existir, o AC vale com a janela única.
- [x] **AC7 (regressão da `LTM-02`):** todos os testes de reserva existentes continuam passando.
- [x] **AC8 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

## Escopo

**IN:** a separação das duas responsabilidades; a liberação global nos dois pontos; os testes.

**OUT:**

- **Agendador / cron** (caminho C). É o jeito certo em regime e **o lotemania não tem**. Quando
  tiver, substitui o caminho B. Fica registrado, não construído.
- **Mudar a janela de reserva** — é a `LTM-17`.
- **Avisar o comprador que a reserva dele venceu** (e-mail, push). Outra story.

## Dependências

- **Depende da `LTM-02`** (entregue) — é o código que esta story corrige.
- **Conversa com a `LTM-17`** — quando a janela virar configuração por sorteio, a varredura global
  precisa ler a janela de cada um. Ordem recomendada: esta primeiro, porque é defeito; a `LTM-17`
  ajusta depois.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/actions/reserve.ts                      (separar as duas funcoes)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx    (liberacao ao montar a grade)
  apps/lotemania/tests/reserva/expiracao-entre-compradores/**    (novo)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao  — nenhuma coluna nova
  relogio do teste  — AC1/AC2 medem prazo vencido. Semear reserved_until no passado
                      e preferir isso a relogio falso: o predicado e SQL (now()), e
                      relogio falso de JS nao move o now() do Postgres.

Depends-on: LTM-02 (entregue)
```

- ⛔ **Não pode compartilhar onda com `LTM-07`, `LTM-04` nem `LTM-17`** — todas tocam `reserve.ts`.
- ⚠️ **Nota sobre o relógio no teste:** o filtro é `reserved_until < now()` **em SQL**. Adiantar o
  relógio do JS não adianta o do Postgres. Os testes têm de **semear** `reserved_until` no passado.

## Riscos

- **[Alto] Fundir os dois escopos e bloquear comprador pelo abandono alheio.** É o defeito pior que
  o original, e está a uma linha de distância. AC3 existe só por isso.
- **[Médio] Escrita no caminho de leitura** (caminho B). A página do sorteio é a mais acessada; uma
  escrita ali em toda visita tem custo. Mitigação: só escreve quando há o que liberar — o `UPDATE`
  com predicado não encontra linha e não escreve nada no caso comum.
- **[Médio] Liberar unidade de pedido que acabou de ser pago**, numa corrida entre o aviso do
  gateway e a varredura. AC4 e AC5 cobrem; o filtro `orders.status = 'pending'` é a defesa.

## QA Results

### Review Date: 2026-11-20

### Reviewed By: Quinn (Test Architect)

**Veredito: PASS** — `InReview` → `Done`

#### A pergunta que me foi feita primeiro, respondida primeiro

Fui avisada de que *"a minha versão da story **afirmava** que a guarda existia, e o `UPDATE` era `WHERE orderId IN (...)` sem checagem de estado nenhuma"*. Conferi no código, não na story.

**A guarda existe hoje, e nos dois `UPDATE`:**

- unidades — `src/lib/raffles/expire-reservations.ts:282`: `eq(productNumbers.status, "reserved")` no `WHERE`, por cima de uma trava ordenada que também filtra por `reserved` (`:264-274`);
- pedido — `:304`: `eq(orders.status, "pending")`, também por cima de trava ordenada (`:294-299`).

A dupla guarda não é redundância, e vale dizer por quê: a trava **escolhe** as linhas; o `WHERE` do `UPDATE` as **reavalia** depois de o Postgres liberar a trava da transação concorrente (EvalPlanQual). Sem a segunda, uma unidade recém-vendida voltaria a `available` com o pedido pago.

#### Os outros quatro pontos de desconfiança

| Ponto | Veredito | Âncora |
|---|---|---|
| `reserved_until < now()` é SQL — fake timer de JS não move o `now()` do Postgres | **correto, e nenhum teste do repositório finge relógio** | o predicado está em `:147` com o aviso ao lado (`:143-146`); a semeadura é SQL de verdade em `tests/helpers/seed.ts:424-431` e `:446-451`. Varredura no repositório inteiro por `useFakeTimers`/`setSystemTime`/`advanceTimers`: **zero** ocorrências em `src/` e `tests/` |
| A armadilha do `"use server"` | **limpo em todo o app, não só aqui** | `expire-reservations.ts` é módulo puro de propósito, com a razão escrita em `:23-32` (a grade também o chama, e exportá-lo de um arquivo de server action o viraria endpoint POST público). Varri os **19** arquivos cujo primeiro caractere é a diretiva: nenhum exporta `const`/`let`/`var`/`class`/`enum`/`default` — só função assíncrona |
| Varredura de fonte casando com comentário | **tratado, e com a medição que justifica** | `tests/payments/paysure/source.ts:51-63` remove bloco, linha e literais antes de qualquer asserção; `:16-19` registra que **6 das 12** primeiras falhas eram isso, em quatro arquivos. A regra: asserção sobre código usa `codigoDe`, sobre prosa usa `fonteDe` |
| O par LTM-20 + LTM-23 — um `SET` descuidado zeraria a ficha | **não se cruzam** | a LTM-20 só toca `users` em `applyAbandonmentStrikes` (`:202-241`), e só a linha de **quem abandonou**, travada (`:218`) e em ordem de `userId` (`:317`) para não haver impasse entre duas varreduras. A LTM-23 é `DO NOTHING`, não `DO UPDATE` (`reserve.ts:247`), e nunca escreve na linha alheia. O outro escritor da ficha é o pagamento, que a zera de propósito (`settle-order.ts:277-280`) |

#### AC por AC

| AC | Âncora lida |
|---|---|
| AC1 (global) | `abandonedOrderFilter` (`:132-149`) não tem filtro por `userId`; o recorte é `tenantId` obrigatório + `productId` opcional (`:107-110`). Era o `eq(orders.userId, userId)` que travava o 42 da Ana para o Bruno até ela voltar |
| AC2 (a grade) | `src/app/loja/[tenant]/[productSlug]/page.tsx:84`. A sonda fora de transação (`:179-188`) garante que sem nada a liberar nenhuma transação é aberta — é o que torna a chamada no caminho de leitura mais quente da loja pagável |
| AC3 (abandono alheio não bloqueia) | `releaseExpiredAndCheckBuyerBlock` (`:361-379`) libera de todos e **lê** a ficha de um só; `reserve.ts:342-350` passa o recorte largo de propósito, porque a ficha sempre contou o abandono no operador inteiro |
| AC4 (pago nunca é tocado) | as duas guardas + a ordem `product_numbers` → `orders`, que casa com `settle-order.ts:131-150`. É mecanismo: se o pagamento chega primeiro, a varredura reavalia as guardas e não casa nada |
| AC5 (duas varreduras simultâneas) | a ficha sai do que o `UPDATE` de `orders` **devolve** (`:301-307`), nunca da lista de candidatos — a transição `pending → expired` é o ponto de serialização |
| AC6 (prazo por sorteio, e fronteira do operador) | `tests/money-path/expiracao-entre-compradores.test.ts:490-531` e `:538-558` |

#### O achado de desenho que a story não pediu — contestei, e ele está certo

O @dev marcou como *"a única coisa aqui que a story não pediu, e a que mais merece contestação"*: a ficha do anti-spam passou a ser debitada **pela expiração**, não pela próxima reserva do abandonador.

**Confirmo, e a mudança era obrigatória.** Com a varredura global, quem expira o pedido da Ana é a visita do Bruno. Se a contagem continuasse pendurada na próxima tentativa **da Ana**, ela nunca encontraria nada para contar — o pedido já estaria `expired` — e o anti-spam morreria em silêncio, com todo mundo de ficha limpa para sempre. Verde na suíte, feature morta. A transição `pending → expired` **é** o evento de abandono.

#### Verificação própria

`npx vitest run tests/money-path/identidade-concorrente.test.ts tests/money-path/expiracao-entre-compradores.test.ts tests/money-path/anti-spam.test.ts` → **3 arquivos, 22 testes, 22 passed, 147,88s**. Branch efêmera `ltm05-202611201145342wrivr` provisionada e destruída.

Portões da árvore combinada (do @lead, não repetidos): `typecheck` limpo, `lint` 0 erros, `build` completo, `346 passed | 2 skipped`, exit 0.

#### O que fica (não bloqueia)

- **`DOC-001` [low]** — `src/lib/payments/settle-order.ts:126` cita `reserve.ts:149-156` como o lugar da varredura, para justificar por que a **ordem das travas** não pode ser invertida. Esta story moveu a varredura; `reserve.ts:149-156` é hoje o cabeçalho de `resolveTargetUnits`. Cenário concreto: um dev lê a justificativa, não acha varredura no destino, conclui que o comentário é lixo e inverte a ordem — o Postgres aborta uma das duas, o webhook responde 500, e o provedor reentrega contra o mesmo impasse. **Quem resolve:** @dev, trocando por `raffles/expire-reservations.ts:264-284`.
- **`MNT-001` [low]** — a varredura não tem teto de lote: `candidateIds` entra inteiro no `inArray` dos dois `UPDATE`. Com importação em massa do Império — cenário **deste** epic — uma varredura disparada pela grade pode travar muitas linhas numa transação só. Já nomeado pelo @dev. Story própria quando houver agendador, que é também quando a chamada na grade sai.
- **`REL-002` [low]** — o defeito adjacente que o @dev mediu e **não** consertou continua aberto; a decisão de escopo é dele e eu concordo. **@po:** decidir se vira story antes do ensaio ponta a ponta.

### Gate Status

Gate: PASS → `docs/qa/gates/LTM-20-expiracao-global-reserva.yml`

---

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.2 | **QA Gate PASS — Status: InReview → Done.** A guarda de estado que a story AFIRMAVA ter e o codigo nao tinha agora EXISTE nos dois UPDATE: status reserved nas unidades (expire-reservations.ts:282) e status pending no pedido (:304), cada um por cima de trava ordenada — a trava escolhe as linhas e o WHERE as reavalia depois do EvalPlanQual, e sem a segunda uma unidade recem-vendida voltaria a available com o pedido pago. Conferido que o predicado do prazo e SQL (:147) e que a semeadura tambem e SQL de verdade (seed.ts:424-431 e :446-451): varredura por useFakeTimers, setSystemTime e advanceTimers no repositorio inteiro devolve ZERO. Varridos os 19 arquivos com a diretiva de server action: nenhum exporta valor nao-assincrono, e esta funcao mora em modulo puro de proposito porque a grade tambem a chama. O par com a LTM-23 conferido JUNTO, como pedido: nao se cruzam — a LTM-20 so toca a linha de quem abandonou (:202-241, travada e ordenada por userId contra impasse) e a LTM-23 e DO NOTHING. O achado de desenho que o @dev marcou para contestacao — a ficha debitada PELA expiracao — foi contestado e esta certo: sem ele a varredura global mataria o anti-spam em silencio, com todos de ficha limpa para sempre. Verificacao propria: 22 testes em 3 arquivos, 22 passed, 147,88s. Ficam duas low: settle-order.ts:126 aponta a varredura no lugar antigo, e a varredura nao tem teto de lote (limite ja nomeado pelo @dev). | @qa (Quinn) |
| 2026-11-19 | 1.1 | Implementada. A varredura saiu de `actions/reserve.ts` para `lib/raffles/expire-reservations.ts`, partida em duas responsabilidades, e roda nos dois pontos (A + B). **O desenho mudou num ponto que a story não previa:** a ficha do anti-spam passou a ser debitada **pela própria expiração**, do dono do pedido — sem isso, a varredura global teria **matado o anti-spam em silêncio**. Ver Dev Agent Record. | @dev (Dex) |
| 2026-11-19 | 1.0 | Nasce de relato do founder usando o produto, e o diagnóstico foi confirmado no código na mesma data: a varredura é chamada **em um lugar** (`reserve.ts:306`) e filtra **por um comprador** (`eq(orders.userId, userId)`). Logo, reserva abandonada só é liberada se **quem a fez** voltar e tentar reservar de novo — e enquanto isso o número fica travado para todo mundo. Um sorteio com isso **não esgota**. A suíte não pegou porque o teste de expiração exercita o caminho de um ator só. | @aiox-master |

---

## Dev Agent Record

### Agent Model Used

`claude-opus-5` — @dev (Dex), 2026-11-19, modo YOLO.

### O diagnóstico da story: **confirmado linha a linha**

Não refeito, conferido. As duas propriedades estavam exatas:

| Afirmação da story | Conferência |
|---|---|
| `expireStaleReservationsAndCheckSpam` em `reserve.ts:129` | ✅ era a linha |
| chamada em **um** lugar, `reserve.ts:306` | ✅ única ocorrência |
| filtra por `eq(orders.userId, userId)` | ✅ `reserve.ts:149`, dentro do `and` |
| nenhum job, cron ou rota agendada | ✅ `expired` aparece em 6 pontos de `src/`, nenhum agendado |
| a última migração é a `0003` | ✅ `drizzle/0003_ltm07_meia_cota_dominio.sql` |
| **nenhuma coluna nova é necessária** | ✅ **verdadeiro** — não houve `0004`, e o conserto não pede dado novo |

### A separação, que é o coração da story

A função fazia duas coisas de escopos opostos. Ficaram três peças, em
`src/lib/raffles/expire-reservations.ts`:

| Função | Escopo | Quem chama |
|---|---|---|
| `releaseExpiredReservations(scope)` | **global** — qualquer comprador | a grade do sorteio (caminho B), recorte `{tenantId, productId}` |
| `releaseExpiredAndCheckBuyerBlock(scope, userId)` | libera global **e lê** a ficha de **um** comprador | a reserva (caminho A), recorte `{tenantId}` |
| `applyAbandonmentStrikes(tx, userId, n)` (privada) | **por comprador** — debita a ficha de **quem abandonou** | a própria varredura, um abandonador por vez |

O módulo é **puro**, não `"use server"`, e isso não é estilo: a grade é componente de servidor e
precisa importar a varredura. Exportá-la de `actions/reserve.ts` a transformaria num **endpoint
POST público** — e ela não é ação do comprador, é manutenção de estoque. Mesmo desenho, e mesma
razão, de `lib/raffles/divisibility.ts` e `lib/payments/gateway-config.ts`.

### ⚠️ O achado que mudou o desenho: a story, como escrita, teria matado o anti-spam

A story manda separar "liberar vencidos (global)" de "contar abandono (por comprador)", e avisa do
risco certo — bloquear o comprador pelo abandono alheio. **Mas a leitura literal cria um segundo
defeito, e ele é maior.**

Na leitura literal, a contagem continua pendurada na **próxima reserva do comprador**: ela procura
os pedidos vencidos *dele* e conta quantos achou. Componha isso com a varredura global:

1. Ana abandona 3 reservas.
2. Bruno abre a loja. A varredura global expira os 3 pedidos da Ana (`pending` para `expired`).
3. Ana volta e tenta reservar. Sua varredura procura pedidos **dela** vencidos e **não acha
   nenhum** — já estão `expired`.
4. **A ficha da Ana continua 0. Ela nunca é bloqueada.**

E como a grade varre em **toda visita**, isso vale para praticamente todo mundo: o anti-spam
passaria a existir só no código. **Verde na suíte, feature morta em produção** — e nenhum AC da
story pegaria, porque o AC3 só olha a ficha do Bruno.

**O conserto:** a ficha é debitada **pela própria expiração**, do **dono** do pedido. A transição
`pending` para `expired` *é* o evento de abandono, e é onde a contagem pertence. O
`UPDATE ... WHERE status = 'pending'` é o ponto de serialização: cada pedido transiciona uma vez só,
logo cada abandono vale exatamente uma ficha, não importa quem disparou a varredura.

Isto **não** viola o AC3 — é o AC3 levado a sério. O AC3 proíbe atribuir o abandono da Ana ao
Bruno; debitá-lo **da Ana** é exatamente o certo. O teste do AC3 prova os dois lados: a ficha do
Bruno em 0 **e** o bloqueio da Ana de pé.

### A ordem das escritas, e por que ela não podia ser invertida

O primeiro desenho era `orders` primeiro (compare-and-set no pedido), `product_numbers` depois — é
a ordem mais natural para serializar o abandono. **Está errada**, e quem diz é um comentário já no
código: `payments/settle-order.ts:123-141` registra que o fechamento do pagamento trava **unidades
antes do pedido**, *de propósito*, porque a varredura escrevia nessa ordem. Inverter aqui criaria
emparelhamento cruzado: o Postgres abortaria uma das duas, o webhook responderia 500 e o provedor
reentregaria contra o mesmo impasse.

Mantida a ordem original (**unidades, depois pedido**), ela virou também a prova do AC4, porque as
duas escritas ganharam **guarda de estado**:

- se o pagamento chega primeiro, ele trava as unidades, marca `sold` e `paid`; a varredura destrava
  depois, reavalia as guardas, não casa nenhuma linha e **não escreve nada**;
- se a varredura chega primeiro, o fechamento espera nas unidades e, quando entra, relê o pedido já
  `expired` e recusa com `order_expired` (`settle-order.ts:170`) — caminho que já existia e já
  tinha teste.

A trava ordenada (`FOR UPDATE` com `ORDER BY` em subconsulta) é o mesmo mecanismo que a reserva já
usa, e pela mesma razão escrita no topo de `reserve.ts`: duas varreduras com recortes diferentes
(uma por sorteio, outra por operador) visitariam as mesmas linhas em ordens diferentes sem ela.

### Premissas da story conferidas no código

#### Verdadeiras (todas as de diagnóstico)

Tabela acima. Em particular, a nota do relógio estava **certa e foi indispensável**: o predicado é
`reserved_until < now()` em SQL, e relógio falso de JS não o move. Todo prazo vencido nos testes é
**semeado** — `expireReservation`, e o novo `setReservedUntil` para o caso de dois prazos
diferentes.

#### Falsa 1 — a guarda que o AC4 diz existir protege o pedido, **não a unidade**

A story afirma, no AC4: *"Hoje o filtro `orders.status = 'pending'` protege."* Protege o **pedido**.
O `UPDATE` das unidades era, literalmente:

```
.where(inArray(productNumbers.orderId, expiredIds))
```

**Sem olhar o estado da linha.** Entre o `SELECT` dos candidatos e esse `UPDATE` havia janela para o
pagamento fechar: a unidade recém-vendida voltava a `available` **com o pedido pago** — e a
invariante I2 do verificador (`unidade 'sold' sem pedido pago`) pegaria o estrago só depois do fato.
Era corrida estreita enquanto a varredura rodava uma vez por reserva do próprio comprador; com a
varredura global na grade **deixaria de ser estreita**. Acrescentada a guarda
`eq(productNumbers.status, "reserved")`.

#### Falsa 2 — "liberar reserva vencida de qualquer um é **uma linha**"

A story estima o caminho A em "uma linha" (tirar o `eq(orders.userId, userId)`). Não é — e não pelo
anti-spam, que a story já previu. É porque a varredura **passou a correr contra o caminho do
pagamento com frequência muito maior**, e isso obriga a três coisas: guarda de estado nos dois
`UPDATE` (falsa 1), travamento em ordem determinística, e a mudança de quem debita a ficha (o achado
acima). O conserto final é um módulo de ~120 linhas de código, não uma linha.

#### Falsa 3, de nota de ondas — `tests/reserva/expiracao-entre-compradores/**`

A nota de ondas propõe uma árvore de testes nova. O teste ficou em
`tests/money-path/expiracao-entre-compradores.test.ts`: é a pasta que a suíte inteira usa, o
`vitest.config.ts` varre `tests/**` de qualquer jeito, e uma segunda árvore de testes de reserva só
criaria dois lugares para procurar.

### Defeito adjacente encontrado, medido, e **NÃO consertado** (fora do escopo)

Achado porque o AC5 falhou por ele, não por mim — e vale registro próprio.

**`src/lib/actions/reserve.ts:251-258` cria a identidade do comprador com um `INSERT` cru**, fora de
transação e sem `onConflict`, contra o índice **único** `users_tenant_phone_idx` em
`(tenant_id, phone)` (`src/db/schema/core.ts:77`).

Duas primeiras reservas **simultâneas do mesmo telefone novo**: uma insere, a outra estoura com
`Failed query: insert into "users" ...`, e a server action **relança** — corretamente, porque é
infraestrutura e não disputa. O comprador recebe erro de servidor, não mensagem.

**Medição**, com sonda descartável contra o Postgres de verdade (2026-11-19), 5 rodadas de 6
operações simultâneas cada:

| Estado | Rejeições |
|---|---|
| identidade **não** pré-criada | **6**, todas `insert into "users"` |
| identidade pré-criada | **0** |

Ou seja: a varredura em corrida com a reserva **não produz impasse nem erro** — o AC5 está provado
pelo lado que importa. O que estourava é pré-existente a esta story.

**Por que a suíte nunca viu:** `reserve-concurrency.test.ts:66` gera um telefone **distinto** por
disputante (`Array.from({ length: COMPRADORES }, () => syntheticPhone())`). Com 20 compradores
diferentes, a corrida de identidade não existe.

**Caso real:** primeira compra da vida, conexão ruim, duas batidas em "Reservar". Não é hipótese de
laboratório.

**Não consertado de propósito:** nenhum AC desta story o cobre, e o conserto (`onConflictDoNothing`
mais releitura, ou `onConflictDoUpdate ... returning`) mexe na criação de identidade — caminho do
dinheiro que merece story própria. O teste do AC5 pré-cria a identidade do Bruno e **diz por escrito
por quê**, com a medição ao lado.

### Limite aceito e nomeado: a varredura não tem teto de lote

`inArray(..., candidateIds)` carrega um parâmetro por pedido candidato. Sem teto.

**Não morde no uso orgânico:** a varredura roda em toda reserva **e** em toda visita à grade, então
a janela de acumulação é "entre duas visitas". Para o Império (5 rodadas/dia, ~18 min para esgotar),
o conjunto é da ordem de unidades, não de milhares.

**Morde num caso só, e ele é deste epic:** uma **importação em massa** de pedidos `pending`
históricos com `reserved_until` no passado — a própria migração do Império. Aí a primeira reserva do
operador varre o histórico inteiro de uma vez, e acima de ~30 mil pedidos candidatos o limite de
*bind parameters* do Postgres (65 535) é alcançado, com duas listas na mesma consulta.

**Onde o teto entraria**, se o @po quiser: um `.limit(N)` nas duas leituras de candidatos
(`findAbandonedOrderIdsWithin` e `probeAbandonedOrderIds`), tornando a varredura **incremental** — a
passagem seguinte continua de onde parou. Não foi feito porque nenhum AC o pede, e porque defesa
contra cenário que ainda não existe é código que ninguém mediu.

### Decisões autônomas (modo YOLO)

| Pergunta | Decisão | Razão |
|---|---|---|
| `[CONFIRMAR]` da tarefa 5: a varredura respeita a janela de cada sorteio? | **Já respeita** | Ela decide pelo `reserved_until` **da unidade**, que é onde a janela se materializa na reserva. Nunca leu janela global. A `LTM-17` não precisará tocar este módulo. O AC6 tem teste de dois prazos diferentes |
| Recorte da varredura na reserva: sorteio ou operador? | **operador** (`{tenantId}`) | A ficha do anti-spam sempre contou abandono no operador inteiro; estreitar perderia o abandono em sorteio vizinho |
| Recorte na grade? | **sorteio** (`{tenantId, productId}`) | É o caminho de leitura mais quente da loja; não tem por que olhar o estoque dos outros sorteios |
| Onde mora a varredura? | `lib/raffles/expire-reservations.ts`, módulo **puro** | Exportar de `"use server"` criaria endpoint POST público para manutenção de estoque |
| Comprador já bloqueado acumula ficha? | **não** | Comportamento da função antiga (voltava antes de contar), preservado |
| Nome do arquivo de teste e pasta | `tests/money-path/` | Convenção da suíte inteira; ver falsa 3 |

### Verificação da escrita no caminho de leitura

Duas coisas medidas, não supostas:

1. **A grade nunca é prerenderizada.** `pnpm build` classifica `/loja/[tenant]/[productSlug]` como
   **dynamic, server-rendered on demand**. A escrita no caminho de leitura, portanto, **não roda em
   `next build`** — a objeção óbvia a "escrita num componente de servidor" não se aplica aqui.
2. **Sem nada a liberar, nada é escrito e nenhuma transação é aberta.** A sonda
   (`probeAbandonedOrderIds`) é leitura amparada pelo índice parcial da LTM-01; vazia, a função
   retorna antes do `db.transaction`. É a mitigação que o risco [Médio] da story pede, e tem teste:
   *"AC2: montar a grade sem nada vencido não mexe em reserva viva"*.

### File List

| Arquivo | O que mudou |
|---|---|
| `apps/lotemania/src/lib/raffles/expire-reservations.ts` | **novo** — a varredura global, a ficha por comprador, a ordem das escritas e a razão de cada uma |
| `apps/lotemania/src/lib/actions/reserve.ts` | `expireStaleReservationsAndCheckSpam` **removida**; passa a chamar `releaseExpiredAndCheckBuyerBlock`; o bloco de isolamento do topo deixou de afirmar "só do próprio comprador", que virou mentira |
| `apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx` | caminho B — libera vencidos **antes** de ler o estoque da grade |
| `apps/lotemania/tests/money-path/expiracao-entre-compradores.test.ts` | **novo** — 13 testes, todos com **dois** compradores |
| `apps/lotemania/tests/helpers/seed.ts` | `setReservedUntil(orderId, when)` — semeia prazo num instante escolhido (AC6). `UnitRow` **intocado**, e `reserve.test.ts:53` segue compilando |

**Nenhuma migração.** A última continua sendo a `0003`.

### AC por AC — o teste que prova cada um

Todos em `tests/money-path/expiracao-entre-compradores.test.ts`.

| AC | Teste | O que ele prende |
|---|---|---|
| **AC1** | `AC1: Ana abandona o número, o prazo vence, e BRUNO consegue reservá-lo` | O defeito. Dois telefones distintos; a reserva do Bruno **passa** e a unidade fica no pedido dele |
| **AC1** | `AC1: o sorteio ESGOTA mesmo com um número abandonado no meio` | O custo medido na Sorteamos, em escala de teste: sem a varredura global, 9 de 10 para sempre |
| **AC2** | `AC2: a grade do sorteio mostra o número como LIVRE sem que ninguém tenha tentado reservar` | A página é **chamada como função**, que é o que o Next faz, e a asserção lê `props.numbers` da `NumberGrid` **por referência do componente** — é o que o comprador vê, não um `SELECT` escrito à mão |
| **AC2** | `AC2: montar a grade sem nada vencido não mexe em reserva viva` | A escrita no caminho de leitura não é indiscriminada |
| **AC3** | `AC3: o abandono da Ana NÃO bloqueia o Bruno — e a ficha vai para a Ana` | Os **dois** lados: ficha do Bruno em 0 **e** bloqueio da Ana de pé, isto é, o anti-spam não morreu |
| **AC3** | `AC3: a varredura da GRADE também debita a ficha de quem abandonou, e só dele` | A ficha segue o abandono mesmo quando quem dispara é uma visita |
| **AC4** | `AC4: unidade de pedido PAGO não é liberada, mesmo com o prazo no passado` | O estado mais hostil: pedido `paid`, unidade ainda `reserved`, prazo vencido. Pelos **dois** caminhos. Sem `assertProductInvariants` **de propósito** — o estado viola a I4 por construção, e é o ponto do teste |
| **AC4** | `AC4: quem já está VENDIDO não é tocado por nenhum dos caminhos` | A guarda `status = 'reserved'` do `UPDATE`, a que não existia |
| **AC5** | `AC5: duas varreduras simultâneas sobre o mesmo pedido vencido não erram nem contam em dobro` | 4 varreduras em paralelo: zero erro, o pedido reportado **uma** vez, ficha **1** |
| **AC5** | `AC5: varredura e reserva do MESMO número ao mesmo tempo terminam em estado consistente` | 6 operações entrelaçadas: zero erro, invariantes de pé. Identidade pré-criada, com a razão medida escrita no próprio teste |
| **AC6** | `AC6: cada sorteio expira pelo SEU prazo, não por um relógio comum` | Dois sorteios, prazos de −1 min e +120 min: só o vencido é liberado |
| **AC6** | `AC6: a varredura não atravessa a fronteira do operador` | O recorte largo da reserva ainda tem fronteira |
| — | `a recusa por conflito continua existindo quando a reserva do outro está VIVA` | A varredura global não virou licença para roubar reserva viva |
| **AC7** | a suíte inteira | Ver as portas |
| **AC8** | as quatro portas | Ver as portas |

### As quatro portas — saída real e código de saída

Rodadas na raiz de `apps/lotemania`, nesta ordem, no estado final do código.

**1. `pnpm lint` — exit 0**

```
$ eslint

.../src/app/dashboard/products/new/page.tsx
  31:5  warning  'watch' is assigned a value but never used  @typescript-eslint/no-unused-vars

.../src/app/dashboard/users/blocked-numbers-card.tsx
  3:10  warning  'useState' is defined but never used  @typescript-eslint/no-unused-vars

.../src/app/loja/[tenant]/[productSlug]/bonus-game-player.tsx
  45:10  warning  'playId' is assigned a value but never used  @typescript-eslint/no-unused-vars

.../src/lib/actions/site-config.ts
  3:19  warning  'asc' is defined but never used          @typescript-eslint/no-unused-vars
  7:24  warning  'requireUser' is defined but never used  @typescript-eslint/no-unused-vars

✖ 5 problems (0 errors, 5 warnings)
```

**0 erros.** Os 5 avisos são **pré-existentes** e nenhum deles está em arquivo desta story —
conferido um por um nos caminhos acima.

**2. `pnpm typecheck` — exit 0**

```
$ tsc --noEmit
```

Sem saída, que é o verde do `tsc`. ⚠️ **Rodado com o cache apagado**: `tsconfig.json:15` tem
`"incremental": true`, e `tsconfig.tsbuildinfo` foi removido antes da execução. Sem isso o `tsc`
sub-reporta — arquivo não revisitado não é arquivo verificado.

**3. `pnpm build` — exit 0**

```
ƒ /loja/[tenant]
ƒ /loja/[tenant]/[productSlug]
ƒ /loja/[tenant]/[productSlug]/pedido/[orderId]
...
○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand
```

Duas coisas que esta porta prova, e não só "compilou":

- **nenhum erro de exportação em `"use server"`.** `actions/reserve.ts` perdeu uma função e ganhou
  um `import`; o build é a única verificação que pega a armadilha do módulo `"use server"` perdendo
  todas as exportações, e ele está verde;
- **`/loja/[tenant]/[productSlug]` é `ƒ`, dynamic, server-rendered on demand.** É a medição que
  autoriza a escrita no caminho de leitura: a grade **nunca** é prerenderizada, então a varredura do
  caminho B não roda em `next build`.

**4. `npm run test` — exit 0**

```
 Test Files  21 passed | 2 skipped (23)
      Tests  276 passed | 2 skipped (278)
   Duration  584.54s (tests 97%, import 2%)

[LTM-05] base ltm05-... destruída. Provisionamento 19494 ms · suíte 563108 ms.
```

**A conta do AC7 fecha exatamente:** a suíte estava em **263**; os 13 testes novos deste arquivo dão
**276**. Nenhum teste existente foi alterado, nenhum foi removido, nenhum passou a ser ignorado — os
2 `skipped` já eram 2 antes.

Houve **uma** rodada vermelha antes desta, e ela foi informativa: o teste
`AC5: varredura e reserva do MESMO número ao mesmo tempo` falhou com 1 rejeição. A investigação
achou o defeito pré-existente da identidade do comprador (seção acima) — não um problema da
varredura. Medido nos dois estados, corrigido no teste, com a razão escrita nele.

### Status

| Transição | Quando | Por quê |
|---|---|---|
| `Draft` → `InProgress` | 2026-11-19 | início da implementação por @dev (Dex), modo YOLO. A story não passou por `Ready`: foi despachada direto, com o diagnóstico já confirmado |
| `InProgress` → `InReview` | 2026-11-19 | as quatro portas verdes, 8 ACs com teste nomeado, Dev Agent Record preenchido |

### O que fica para o @qa olhar primeiro

1. **A mudança de desenho** (quem debita a ficha do anti-spam). É a única coisa aqui que a story não
   pediu, e é a que mais merece contestação. O argumento inteiro está na seção do achado.
2. **O defeito adjacente não consertado** (`reserve.ts:251-258`). Merece story própria; a decisão de
   não consertar é minha e está justificada, mas é decisão de escopo, não técnica.
3. **O limite sem teto de lote**, com a condição exata que o faria morder — e ela é um cenário
   **deste epic** (importação em massa do Império).
