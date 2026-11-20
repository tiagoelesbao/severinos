# LTM-23: Duas reservas simultâneas do mesmo telefone novo derrubam uma delas

**Status:** Done
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação)
**Prioridade:** **P1** — não trava a rodada como a `LTM-20`, mas quebra **a primeira compra da vida** do comprador
**Complexidade:** S — o conserto é pequeno e conhecido; o cuidado está em não recriar o que a `LTM-20` acabou de arrumar
**Criada por:** @aiox-master · 2026-11-19
**Origem:** medido pelo @dev durante a `LTM-20`, com sonda descartável. **Não consertado lá de propósito** — nenhum AC daquela story o cobria.

## O defeito

`src/lib/actions/reserve.ts:245-258` — **check-then-act** sobre um índice único:

```ts
const [existingUser] = await db.select()…           // 1. procura
  .limit(1);

const userId = existingUser
  ? existingUser.id
  : (await db.insert(users)                          // 2. insere, sem onConflict
      .values({ tenantId, phone: data.phone, role: "subscriber" })
      .returning())[0].id;
```

O índice é `uniqueIndex("users_tenant_phone_idx").on(tenantId, phone)` (`src/db/schema/core.ts:77`).

**Duas reservas simultâneas do mesmo telefone que ainda não tem cadastro:** as duas não acham nada
no passo 1, as duas tentam inserir no passo 2. Uma vence; a outra estoura com
`Failed query: insert into "users"`, e a action **relança**.

**O que o comprador vê:** um **500** — por ter batido duas vezes em "Reservar" na primeira compra
da vida dele. Na segunda compra isso não acontece nunca, porque o cadastro já existe.

> **É o pior lugar possível para um erro assim.** O comprador novo, que chegou pelo anúncio, na
> ação em que decide gastar dinheiro pela primeira vez. Quem já é cliente está imune.

### Como foi medido — não é teoria

Sonda descartável durante a `LTM-20`, **5 rodadas × 6 operações entrelaçadas**:

| Cenário | Resultado |
|---|---|
| **sem** identidade pré-criada | **6 rejeições** |
| **com** identidade pré-criada | **0 rejeições** |

A segunda linha prova, de quebra, que **a varredura em corrida com a reserva não dá impasse nem
erro** — o problema é só a criação da identidade.

### Por que a suíte não pega

`tests/money-path/reserve-concurrency.test.ts:66` usa **um telefone distinto por disputante**. É o
desenho natural de quem escreve teste de concorrência pensando em compradores diferentes — e o
defeito só existe quando são **o mesmo comprador novo**.

> **Terceira vez neste epic que o buraco mora onde o teste não olha.** A `LTM-20` era "dois
> compradores"; esta é "o mesmo comprador, duas abas". O padrão vale mais que a ocorrência:
> **a suíte modela atores distintos bem, e o mesmo ator em paralelo mal.**

## Story

**Como** pessoa comprando no Império pela primeira vez
**Eu quero** que bater duas vezes no botão não me devolva um erro de servidor
**Para que** a primeira compra não seja também a última.

## Decisão de arquitetura

**O conserto é `INSERT … ON CONFLICT DO NOTHING` seguido de releitura**, ou `ON CONFLICT … DO UPDATE
… RETURNING` — o idioma que torna a criação idempotente no próprio banco, em vez de depender de o
`SELECT` anterior ainda ser verdade.

⚠️ **Três coisas que o conserto NÃO pode quebrar:**

1. **A identidade continua fora da transação da reserva.** `reserve.ts:247-250` registra por escrito
   por quê: desfazê-la junto apagaria o cadastro de quem perdeu uma disputa — **e com ele a ficha do
   anti-spam**, que é por comprador. Essa decisão é da `LTM-02` e **permanece**.
2. **A ficha do anti-spam é do dono do pedido.** A `LTM-20` acabou de mover a contagem para dentro
   da expiração, justamente para que ela não se perca. Um conserto que recrie ou zere o usuário em
   conflito **apagaria a ficha** — e aí o anti-spam volta a ser contornável criando corrida.
3. **`ON CONFLICT` precisa do alvo certo.** `users` tem **quatro** índices únicos por tenant:
   `email`, `username`, `phone`, `affiliate_code` (`core.ts:75-80`). Um `ON CONFLICT` sem coluna
   alvo engoliria conflito de **e-mail** como se fosse de telefone, e devolveria o usuário errado.

## Tarefas (Checklist)

- [x] A criação da identidade vira idempotente no banco, com alvo explícito em `(tenant_id, phone)`.
- [x] Teste de **duas reservas simultâneas do mesmo telefone novo**.
- [x] Conferir se o mesmo padrão existe em `signup.ts` e `affiliate-signup.ts` — **[CONFIRMAR]**, a
      mesma identidade pode ser criada por mais de um caminho.

## Critérios de Aceite

- [x] **AC1 (o defeito):** N reservas simultâneas do **mesmo telefone sem cadastro** → **todas**
      resolvem para **um** `users.id`, **nenhuma** estoura. Hoje são N−1 falhas.
- [x] **AC2 (uma identidade, não N):** depois da corrida, existe **exatamente uma** linha em `users`
      para aquele `(tenant_id, phone)`. O índice único já garante; o teste prova que o código não
      tenta contorná-lo.
- [x] **AC3 (a ficha sobrevive):** comprador **com** `consecutive_unpaid_reservations` > 0 que entra
      numa corrida de reserva **mantém** a ficha. Regressão contra o conserto que recria o usuário —
      e contra desfazer o que a `LTM-20` arrumou.
- [x] **AC4 (o conflito certo):** o `ON CONFLICT` tem alvo `(tenant_id, phone)`. Teste: conflito de
      **e-mail** com telefone diferente **não** é engolido — ele deve falhar, não devolver um
      usuário alheio. É o AC que impede o conserto de virar um defeito de identidade.
- [x] **AC5 (a identidade continua fora da transação):** reserva que falha **não** apaga o cadastro
      recém-criado. Teste: comprador novo perde a disputa pelo número e **continua cadastrado**.
- [x] **AC6 (regressão):** a suíte inteira continua verde.
- [x] **AC7 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

## Escopo

**IN:** a criação idempotente da identidade no caminho da reserva; os testes; a conferência dos
outros caminhos que criam usuário.

**OUT:**

- **Repensar o modelo de identidade do comprador.** A `LTM-21` traz cadastro com 14 campos e senha,
  e a `LTM-22` traz verificação de telefone. Esta story **não** antecipa nenhuma das duas: ela
  conserta a corrida no caminho que existe hoje.
- **Transação única para identidade + reserva.** É a decisão da `LTM-02`, e mantê-la é requisito
  (AC5), não omissão.

## Dependências

- **Depende da `LTM-20`** (em `InReview`) — ela moveu a contagem do anti-spam, e o AC3 desta story
  protege exatamente o que ela arrumou.
- **Toca `reserve.ts`** → vai **em série** com `LTM-04`, `LTM-17`, `LTM-21` e `LTM-18` grupo A.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/actions/reserve.ts                      (a criacao da identidade)
  apps/lotemania/tests/money-path/identidade-concorrente.test.ts (novo)
  apps/lotemania/src/lib/actions/signup.ts                       (SE o [CONFIRMAR] achar o mesmo padrao)
  apps/lotemania/src/lib/actions/affiliate-signup.ts             (idem)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao  — o indice unico ja existe (core.ts:77); falta usa-lo

Depends-on: LTM-20
```

## Riscos

- **[Alto] `ON CONFLICT` sem alvo engolir o conflito errado.** São quatro índices únicos na mesma
  tabela. Devolver o usuário de outro e-mail seria **trocar a identidade do comprador** — defeito
  muito pior que o 500 original. AC4 existe só por isso.
- **[Médio] Apagar a ficha do anti-spam** ao recriar o usuário em conflito. A `LTM-20` acabou de
  arrumar isso. AC3 é a regressão.
- **[Baixo] O mesmo padrão existir em outro caminho de cadastro** e esta story consertar só um.
  A tarefa de `[CONFIRMAR]` cobre.

## Dev Agent Record

**Agente:** @dev (Dex) - claude-opus-5 - 2026-11-19 - modo YOLO
**Base:** commit `4dd7ae7d` (suite em 276 testes verdes)

### O defeito foi CONFIRMADO, nao refeito

A story mandou confirmar e nao remedir. Confirmado nas duas pontas:

| Afirmacao da story | Estado no codigo |
|---|---|
| `reserve.ts:245-258` faz `SELECT` e depois `INSERT` sem `onConflict` | VERDADEIRO, literal |
| o alvo e `uniqueIndex("users_tenant_phone_idx")` em `core.ts:77` | VERDADEIRO |
| `users` tem QUATRO indices unicos por tenant | VERDADEIRO (`core.ts:75-80`) |
| nenhuma migracao e necessaria | VERDADEIRO. O indice ja esta no baseline versionado, `drizzle/0000_baseline_schema.sql:435`. Nenhum arquivo em `drizzle/` foi tocado |

E foi confirmado por EXECUCAO, nao por leitura. Com o conserto temporariamente
removido do arquivo (uma linha: o `.onConflictDoNothing`), o teste novo fica
VERMELHO com a mensagem exata do defeito:

```
AssertionError: excecoes vazadas (antes da LTM-23: 5):
  ["Error: Failed query: insert into "users" ... params: 7a32e86a-...,55000000001,subscriber", x5]
  expected [ Array(5) ] to have a length of +0 but got 5

 Test Files  1 failed (1)
      Tests  2 failed | 4 passed (6)
```

5 excecoes em 6 abas - exatamente o N-1 que a story previu. O conserto foi
restaurado em seguida e a suite confirmada verde. Teste que nao fica vermelho
sem o conserto nao prova conserto nenhum.

### A decisao: `DO NOTHING` + releitura, em laco limitado

`src/lib/actions/reserve.ts` ganhou `ensureBuyerIdentity(tenantId, phone)`,
privada do modulo, com o bloco de razao inteiro escrito. O idioma e

```
INSERT INTO users (tenant_id, phone, role)
VALUES (...) ON CONFLICT (tenant_id, phone) DO NOTHING RETURNING id
```

e nao `DO UPDATE ... RETURNING`. A razao e o AC3, e ela e estrutural:

> `DO UPDATE` OBRIGA a escrever alguma coluna da linha que ja existe - e a
> linha que ja existe e a do comprador, com `consecutive_unpaid_reservations`
> dentro. `DO NOTHING` nao escreve NADA na linha alheia. A sobrevivencia da
> ficha do anti-spam deixa de depender de alguem ter escolhido bem o `SET`.

O `SELECT` anterior ficou: o comprador que JA existe (o caso comum) nunca
chega ao `INSERT`, e portanto nunca tem a linha tocada. O laco de 3 voltas
cobre o unico caso que a releitura sozinha nao cobre - a vencedora que nos
fez esperar e depois ABORTOU, deixando a linha inexistente. Teto, nao
expectativa: esgotado, lanca com mensagem que nomeia o estado, em vez de
virar laco infinito num caminho de dinheiro.

IDS: o idioma nao foi inventado. `pix-charge.ts:377` ja usava `DO NOTHING` com
alvo + releitura, com a razao escrita, e
`api/webhooks/payment/.../route.ts:283` usa a forma com alvo composto.
Decisao: **ADAPT** desses dois, nao CREATE.

### AC por AC, com o teste que prova

Tudo em `tests/money-path/identidade-concorrente.test.ts` (6 testes, novos).

| AC | Prova | Como |
|---|---|---|
| **AC1** | `AC1/AC2: 6 reservas simultaneas do mesmo telefone SEM cadastro...` | `fanOut(6)` sobre `reserveSelectedNumbers`, mesmo telefone sem cadastro, NUMEROS DISTINTOS. 0 excecoes, 0 recusas, e os 6 pedidos com o MESMO `user_id`. Os numeros sao distintos de proposito: com todas as abas no mesmo numero, 5 recusas por disputa de unidade seriam indistinguiveis de 5 falhas de identidade, e o teste ficaria verde pelo motivo errado |
| **AC2** | o mesmo teste, item (c) | exatamente UMA linha em `users` para `(tenant_id, phone)` depois da corrida |
| **AC3** | `AC3: comprador com ficha do anti-spam > 0 entra na corrida...` | comprador semeado com ficha 2 (um abaixo do limite de 3), 6 reservas simultaneas. Asserta o `id` ANTES da ficha - um conserto que apagasse e reinserisse o usuario passaria na ficha zerada e seria pego no id. Ficha continua 2, `blocked_until` nulo |
| **AC4** | `AC4 (forma)` + `AC4 (comportamento)` | duas camadas, ver abaixo |
| **AC5** | `AC5: comprador novo cuja reserva FALHA continua cadastrado` + `AC5 (na corrida real)` | o deterministico: numero ja tomado, novato recusado, cadastro dele permanece. E a corrida de verdade: dois telefones novos sobre o unico numero, um vence, e os DOIS continuam cadastrados. Nenhuma assercao sobre QUEM vence - seria intermitente |
| **AC6** | suite inteira | 332 passed, 2 skipped, exit 0 |
| **AC7** | as quatro portas | exit 0 nas quatro |

### AC4 - o risco [Alto], e a premissa que teve de ser ajustada

O AC4 pede teste de "conflito de e-mail com telefone diferente nao e
engolido". **Esse estado e inalcancavel por `reserveSelectedNumbers`**, e isso
e um fato do codigo, nao uma esquiva: o `INSERT` da identidade escreve
`(tenant_id, phone, role)` e nada mais, entao `email` nasce `NULL` - e o
Postgres trata cada `NULL` como distinto, de modo que `users_tenant_email_idx`
nunca e tocado por este caminho. Nao existe entrada da acao que produza o
cenario.

O AC foi provado onde ele de fato vive, em duas camadas:

1. **A forma do codigo** (`AC4 (forma)`) - varredura da fonte de `reserve.ts`
   com o COMENTARIO REMOVIDO antes de qualquer assercao. O bloco de
   documentacao de `ensureBuyerIdentity` escreve a forma proibida para
   condena-la; varrer o texto cru daria vermelho contra a propria explicacao
   do conserto. Asserta: existe UM unico `.insert(users)` no arquivo (se
   alguem acrescentar outro, o teste para junto), ele tem alvo
   `[users.tenantId, users.phone]`, e a forma sem alvo NAO aparece.
2. **O comportamento do Postgres** (`AC4 (comportamento)`) - contra a tabela
   real, com um comprador alheio de e-mail preenchido. `ON CONFLICT
   (tenant_id, phone) DO NOTHING` com e-mail colidente **ESTOURA**, e o teste
   casa o nome do indice de verdade (`users_tenant_email_idx`). A mesma
   insercao SEM alvo devolve **zero linha e zero erro** - a colisao
   desaparece. E a diferenca que o alvo nomeado compra, medida, nao afirmada.

Estourar e o certo: e um estado que ninguem previu, e engoli-lo seria inventar
uma resposta para ele. Devolver um usuario alheio seria trocar a identidade do
comprador.

### AC5 - a decisao da LTM-02 permanece, e esta amarrada

`ensureBuyerIdentity` **nao recebe `tx`** e nao abre transacao. Isso nao e
detalhe de assinatura: e o que torna o AC5 impossivel de quebrar por descuido.
Amarra-la a transacao da reserva faria o cadastro de quem perdeu a disputa ser
desfeito junto com o pedido que nao nasceu - e com ele a ficha do anti-spam. O
comentario de `reserve.ts:247-250` foi preservado no lugar da chamada.

### As quatro portas, saida real

Todas em `apps/lotemania`.

| Porta | Saida | Exit |
|---|---|---|
| `pnpm lint` | `5 problems (0 errors, 5 warnings)` - as 5 warnings sao PREEXISTENTES e em arquivos que esta story nao toca (`products/new/page.tsx`, `blocked-numbers-card.tsx`, `bonus-game-player.tsx`, `site-config.ts` x2). Zero achado nos meus dois arquivos | **0** |
| `pnpm typecheck` | `tsc --noEmit`, sem saida | **0** |
| `pnpm build` | tabela de rotas completa, 38 rotas, `Proxy (Middleware)` | **0** |
| `pnpm test` | `Test Files 25 passed / 2 skipped (27)` - `Tests 332 passed / 2 skipped (334)` - suite 590344 ms | **0** |

**O typecheck foi conferido duas vezes, de proposito.** `tsconfig.json` tem
`incremental: true` e o `tsconfig.tsbuildinfo` e compartilhado com outro
agente trabalhando em paralelo - cache quente sub-reporta. Alem de
`pnpm typecheck`, rodei `npx tsc --noEmit --incremental false` (varredura
completa, sem ler nem escrever cache): **exit 0** tambem.

**A contagem de 332 nao e minha, e a aritmetica fecha.** A base era 276.
Durante a execucao da suite, o agente que trabalha em paralelo acrescentou
`tests/loja/pedido/` com tres arquivos (26 + 20 + 4 = 50 testes). 276 + 6
(meus) + 50 (deles) = **332**. Nenhum teste preexistente regrediu; nenhum dos
50 e meu, e nao os reivindico.

### [CONFIRMAR] - o mesmo padrao em outros caminhos de cadastro

A tarefa mandava olhar `signup.ts` e `affiliate-signup.ts`. Olhei - e a
varredura por `.insert(users)` achou **mais dois caminhos que a story nao
nomeia**. Nenhum foi consertado: todos sao acao propria, fora do caminho da
reserva e fora do `Files:` desta story.

| Caminho | Mesmo padrao? | Veredito |
|---|---|---|
| **`bonus-play.ts:48-61`** | **SIM - copia byte-a-byte** | **O achado mais grave.** Mesmo `SELECT` por `(tenantId, phone)`, mesmo `INSERT` com os mesmos `values({ tenantId, phone, role: "subscriber" })`, mesmo `.returning()[0].id`. E a MESMA criacao de identidade contra o MESMO indice, no caminho do comprador na loja. Duas batidas em "comprar" de um comprador novo = o mesmo 500. A story procurou nos dois lugares onde o conserto e DIFICIL e passou ao lado do unico onde ele e mecanicamente identico |
| `signup.ts:29-58` | SIM, mas o conserto e outro | `SELECT ... WHERE phone = P OR email = E` e depois `INSERT` com phone E email. Duas submissoes simultaneas estouram em `users_tenant_phone_idx` ou `users_tenant_email_idx`. `ON CONFLICT (tenant_id, phone)` aqui seria ERRADO: a colisao pode ser legitimamente de e-mail, e a resposta certa e a mensagem que o proprio arquivo ja tem ("Ja existe uma conta com este telefone ou email"), nao idempotencia silenciosa. Exige decisao de produto sobre o que a segunda submissao deve VER |
| `affiliate-signup.ts:25-47` | SIM, e tem dois defeitos a mais | `SELECT` so por e-mail e `INSERT` escrevendo `phone` sem nunca te-lo conferido: e-mail novo com telefone JA USADO estoura em `users_tenant_phone_idx` **sem concorrencia nenhuma**, deterministico. E `affiliateCode: randomBytes(4).toString("hex")` sao 8 hex sorteados sem conferencia nem repeticao contra `users_tenant_affiliate_code_idx` |
| `affiliates.ts:25-54` | SIM, mesma forma de `affiliate-signup.ts` | caminho do painel do operador. Mesmo `randomBytes(4)` para `affiliateCode`, mesmo `phone` escrito sem conferencia |

**Recomendacao de forma, para quem pegar isso:** `ensureBuyerIdentity` resolve
`bonus-play.ts` sem uma linha de logica nova - mas ela **nao pode ser
exportada de `reserve.ts`**, que e `"use server"` (exportar a transformaria em
endpoint POST publico, e e a mesma razao pela qual a LTM-20 mudou a varredura
para `lib/raffles/expire-reservations.ts`). O caminho e um modulo puro, no
molde daquele.

### Arquivos tocados

| Arquivo | O que |
|---|---|
| `apps/lotemania/src/lib/actions/reserve.ts` | +87 / -14. `ensureBuyerIdentity` nova e privada; o `SELECT`+`INSERT` cru do corpo da acao virou uma chamada. O comentario da LTM-02 sobre a identidade fora da transacao foi preservado |
| `apps/lotemania/tests/money-path/identidade-concorrente.test.ts` | novo, 6 testes |
| `docs/stories/03-Product/EPIC-LTM-Imperio-Migration/LTM-23.md` | este registro |

Nenhuma migracao. Nenhum arquivo em `drizzle/`. Nada tocado em
`src/lib/mask.ts` nem em `pedido/[orderId]/*`, que sao do agente paralelo.

### Premissas da story conferidas contra o codigo

| Premissa | Veredito |
|---|---|
| o defeito, o indice, as 4 unicidades, nenhuma migracao | VERDADEIRAS, uma por uma |
| `reserve-concurrency.test.ts:66` usa um telefone por disputante | VERDADEIRO - e o comentario de la JA DIZ a razao ("20 pessoas disputando, nao uma pessoa clicando 20 vezes"). O buraco nao foi descuido: foi um caso que nao ocorre a quem modela atores distintos |
| AC4: provar o conflito de e-mail pela acao de producao | **PREMISSA FALSA.** Inalcancavel: a reserva nunca escreve `email`, e `NULL` nao colide com `NULL`. Provado em duas camadas no lugar - ver acima |
| o `[CONFIRMAR]` cobre os caminhos que criam usuario | **INCOMPLETA.** Nomeia 2 de 4. `bonus-play.ts` e `affiliates.ts` ficaram de fora, e o primeiro e copia exata do defeito |

## QA Results

### Review Date: 2026-11-20

### Reviewed By: Quinn (Test Architect)

**Veredito: PASS** — `InReview` → `Done`

#### Os dois riscos que me mandaram desconfiar, conferidos no código

**1. `ON CONFLICT` sem alvo engoliria colisão de e-mail como se fosse de telefone — trocaria a identidade do comprador, defeito pior que o 500 que esta story conserta.**

**Alvo nomeado, e a colisão em outro índice continua estourando.** `src/lib/actions/reserve.ts:247` é `onConflictDoNothing({ target: [users.tenantId, users.phone] })`. Os quatro índices únicos por operador estão em `src/db/schema/core.ts:73-81` (`email`, `username`, `phone`, `affiliate_code`).

E não é só a forma — o **comportamento** é provado contra o Postgres de verdade em `tests/money-path/identidade-concorrente.test.ts:271-300`: com alvo, um `INSERT` de telefone novo com e-mail já existente é rejeitado **com o nome do índice real**, `users_tenant_email_idx`; sem alvo, a mesma colisão devolve **zero linha e zero erro** (`:290-300`) — que é exatamente o defeito nomeado. Varri o app inteiro: o único `onConflict` sem alvo que resta é `src/db/seed.ts:63`, semeadura de desenvolvimento, não caminho de comprador.

**2. Um `SET` descuidado zeraria `consecutive_unpaid_reservations` em silêncio — verde na suíte, feature morta.**

**Impossível por construção: é `DO NOTHING`, não `DO UPDATE`.** `reserve.ts:247` não tem cláusula `set`, e a escolha está justificada por escrito em `:204-213` — `DO UPDATE` obriga a escrever alguma coluna da linha **que já existe**, e essa linha é a do comprador, com a ficha do anti-spam dentro. A LTM-20 acabou de mover a contagem para a expiração justamente para ela não se perder. Com `DO NOTHING`, a sobrevivência da ficha deixa de depender de alguém ter escolhido bem o `SET`.

A regressão está presa em `identidade-concorrente.test.ts:172-224`, e o **desenho** dela merece registro: ela assere o **id antes da ficha** (`:206-212`). Um conserto que apagasse e reinserisse o usuário passaria na asserção da ficha — id novo, ficha zerada, tudo verde. Asserir o id primeiro fecha essa saída.

#### AC por AC

| AC | Âncora lida |
|---|---|
| AC1/AC2 | `ensureBuyerIdentity` (`reserve.ts:233-257`); provado em `identidade-concorrente.test.ts:123-168` com **6 abas** — o número da sonda que mediu o defeito, mantido igual de propósito — e cada aba pedindo um **número diferente**: com todas no mesmo número, as N−1 recusas por disputa de unidade seriam indistinguíveis das N−1 falhas de identidade, e o teste ficaria verde pelo motivo errado |
| AC3 | `identidade-concorrente.test.ts:172-224`, com ficha semeada em 2 — um abaixo do limite de 3, para o comprador ainda reservar |
| AC4 (forma) | `identidade-concorrente.test.ts:244-246` remove bloco e comentário de linha **antes** de qualquer asserção, com a razão escrita (`:231-242`): o bloco de documentação de `ensureBuyerIdentity` **escreve a forma proibida para condená-la**, e varrer o texto cru daria vermelho contra a própria explicação do conserto. E `:248-254` conta os `INSERT` em `users` do arquivo, para a asserção deixar de cobrir o arquivo inteiro — e o teste parar junto — se alguém acrescentar um segundo |
| AC5 | a identidade fica **fora** da transação da reserva (`reserve.ts:322-331`; a função não recebe `tx`, de propósito — `:215-220`), porque amarrá-la desfaria o cadastro de quem perdeu a disputa junto com o pedido que não nasceu, e com ele a ficha. Provado nos dois cenários: `:325-363` (recusa determinística) e `:365-404` (a corrida real, dois novatos sobre o único número, os dois ficam cadastrados) |
| o laço | `reserve.ts:234-256` — três tentativas, e **estoura com mensagem nomeada** em vez de virar laço infinito num caminho de dinheiro. O caso que exige a segunda volta está escrito (`:222-231`): a vencedora nos fez esperar e depois abortou, a linha não existe, e insistir uma vez transforma isso em sucesso em vez de erro |

#### A lição de desenho de teste, que vale mais que esta story

`reserve-concurrency.test.ts:66` usa **um telefone por disputante** — 20 atores distintos — e por isso nunca viu este defeito. A suíte modela atores distintos bem e **o mesmo ator em paralelo** mal. É a terceira vez neste epic em que o buraco mora onde o teste não olha (LTM-20 era "dois compradores", esta é "o mesmo comprador, duas abas"). O padrão vale mais que a ocorrência, e o arquivo novo o registra no topo.

#### Verificação própria

`npx vitest run tests/money-path/identidade-concorrente.test.ts tests/money-path/expiracao-entre-compradores.test.ts tests/money-path/anti-spam.test.ts` → **3 arquivos, 22 testes, 22 passed, 147,88s**.

Portões da árvore combinada (do @lead, não repetidos): `typecheck` limpo, `lint` 0 erros, `build` completo, `346 passed | 2 skipped`, exit 0.

#### O que fica (não bloqueia)

- **`REQ-001` [low] — premissa da story corrigida pelo @dev, e a correção está certa.** O AC4 como escrito (*"conflito de e-mail com telefone diferente não é engolido"*) é **inalcançável** pela ação de produção: `ensureBuyerIdentity` escreve só `(tenant_id, phone, role)`, então `email` nasce `NULL` e o Postgres trata cada `NULL` como distinto — `users_tenant_email_idx` nunca é tocado por esse caminho. Conferido em `reserve.ts:246-248` contra `core.ts:70-73`. Ele provou o AC onde ele de fato vive e registrou a premissa ajustada. Registro aqui para o veredito não ser lido como complacência com AC reescrito: a conduta correta é esta — não forçar o cenário inalcançável nem marcar o AC sem prova.
- **`REL-001` [low]** — o mesmo padrão check-then-act sobre índice único sobrevive em **cinco** outros caminhos de criação de identidade, e um deles (`bonus-play.ts:48-61`) é **cópia byte a byte** do defeito consertado aqui, no caminho do comprador na loja. Encontrado pelo próprio `[CONFIRMAR]` desta story, que mandou olhar dois e a varredura achou seis. **Quem resolve:** `LTM-28`, já criada e enfileirada (P1). Fora do escopo desta story, corretamente.
- **`MNT-001` [low]** — `src/db/seed.ts:63` é o único `onConflictDoNothing()` sem alvo que resta, e não está entre os cinco caminhos da LTM-28. Se ela passar perto, vale varrer junto para o idioma ser um só.

### Gate Status

Gate: PASS → `docs/qa/gates/LTM-23-identidade-idempotente.yml`

---

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.2 | **QA Gate PASS — Status: InReview → Done.** Os dois riscos do portao conferidos no codigo. (1) O alvo do ON CONFLICT e NOMEADO — reserve.ts:247 com target tenantId e phone, contra os quatro indices unicos de core.ts:73-81 — e a colisao em outro indice CONTINUA estourando, provado contra o Postgres real em identidade-concorrente.test.ts:271-300: com alvo o erro traz o nome users_tenant_email_idx, sem alvo a colisao devolve zero linha E zero erro. (2) A ficha do anti-spam nao pode ser zerada porque nao existe SET: e DO NOTHING, com a razao escrita em :204-213. A regressao em :172-224 assere o ID ANTES da ficha, que e o que fecha a saida de um conserto que apagasse e reinserisse o usuario (passaria verde com id novo e ficha zerada). Varri o app inteiro: o unico onConflict sem alvo que resta e src/db/seed.ts:63, semeadura de desenvolvimento. Registrada a premissa que o @dev corrigiu e fez bem em corrigir: o AC4 e inalcancavel pela acao de producao porque email nasce NULL e NULL nao colide com NULL no Postgres — ele provou o AC onde ele de fato vive em vez de forcar o cenario ou marcar sem prova. Verificacao propria: 22 testes em 3 arquivos, 22 passed. Os cinco caminhos restantes do mesmo defeito, um deles copia byte a byte no caminho do comprador na loja, sao a LTM-28, ja enfileirada. | @qa (Quinn) |
| 2026-11-19 | 1.0 | Nasce de medição do @dev durante a `LTM-20`, com sonda descartável: 5 rodadas × 6 operações, **6 rejeições sem identidade pré-criada e 0 com**. Não foi consertado lá porque nenhum AC daquela story o cobria e mexer em criação de identidade merece decisão própria. A suíte não pega porque `reserve-concurrency.test.ts:66` usa um telefone por disputante — **terceira vez neste epic em que o buraco mora onde o teste não olha**. | @aiox-master |
| 2026-11-19 | 1.1 | Implementada. `ensureBuyerIdentity` com `ON CONFLICT (tenant_id, phone) DO NOTHING` + releitura em laco limitado; `SELECT` preservado para o comprador que ja existe nunca ter a linha tocada. 6 testes novos em `identidade-concorrente.test.ts`. Vermelho provado removendo a linha do conserto: 5 excecoes em 6 abas. Quatro portas em exit 0. Duas premissas corrigidas: o AC4 e inalcancavel pela acao de producao (a reserva nunca escreve `email`), e o `[CONFIRMAR]` nomeia 2 de 4 caminhos - `bonus-play.ts:48-61` e copia byte-a-byte do defeito e segue sem conserto, fora do escopo. | @dev |
