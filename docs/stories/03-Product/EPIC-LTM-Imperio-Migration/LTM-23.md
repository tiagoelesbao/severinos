# LTM-23: Duas reservas simultâneas do mesmo telefone novo derrubam uma delas

**Status:** Draft
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

- [ ] A criação da identidade vira idempotente no banco, com alvo explícito em `(tenant_id, phone)`.
- [ ] Teste de **duas reservas simultâneas do mesmo telefone novo**.
- [ ] Conferir se o mesmo padrão existe em `signup.ts` e `affiliate-signup.ts` — **[CONFIRMAR]**, a
      mesma identidade pode ser criada por mais de um caminho.

## Critérios de Aceite

- [ ] **AC1 (o defeito):** N reservas simultâneas do **mesmo telefone sem cadastro** → **todas**
      resolvem para **um** `users.id`, **nenhuma** estoura. Hoje são N−1 falhas.
- [ ] **AC2 (uma identidade, não N):** depois da corrida, existe **exatamente uma** linha em `users`
      para aquele `(tenant_id, phone)`. O índice único já garante; o teste prova que o código não
      tenta contorná-lo.
- [ ] **AC3 (a ficha sobrevive):** comprador **com** `consecutive_unpaid_reservations` > 0 que entra
      numa corrida de reserva **mantém** a ficha. Regressão contra o conserto que recria o usuário —
      e contra desfazer o que a `LTM-20` arrumou.
- [ ] **AC4 (o conflito certo):** o `ON CONFLICT` tem alvo `(tenant_id, phone)`. Teste: conflito de
      **e-mail** com telefone diferente **não** é engolido — ele deve falhar, não devolver um
      usuário alheio. É o AC que impede o conserto de virar um defeito de identidade.
- [ ] **AC5 (a identidade continua fora da transação):** reserva que falha **não** apaga o cadastro
      recém-criado. Teste: comprador novo perde a disputa pelo número e **continua cadastrado**.
- [ ] **AC6 (regressão):** a suíte inteira continua verde.
- [ ] **AC7 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

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

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Nasce de medição do @dev durante a `LTM-20`, com sonda descartável: 5 rodadas × 6 operações, **6 rejeições sem identidade pré-criada e 0 com**. Não foi consertado lá porque nenhum AC daquela story o cobria e mexer em criação de identidade merece decisão própria. A suíte não pega porque `reserve-concurrency.test.ts:66` usa um telefone por disputante — **terceira vez neste epic em que o buraco mora onde o teste não olha**. | @aiox-master |
