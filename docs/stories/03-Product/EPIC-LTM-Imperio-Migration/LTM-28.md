# LTM-28: A identidade do comprador é criada em seis lugares, cada um do seu jeito

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação)
**Prioridade:** **P1** — um dos seis é cópia exata de um defeito já consertado, e vive no caminho do comprador
**Complexidade:** M — o conserto é pequeno por caminho; o difícil é que **dois deles não aceitam o mesmo conserto**
**Criada por:** @aiox-master · 2026-11-19
**Origem:** o `[CONFIRMAR]` da `LTM-23`, que achou **mais do que a story nomeava**

## O que a varredura achou

A `LTM-23` consertou a criação de identidade em `reserve.ts` e mandou conferir **dois** outros
caminhos. A varredura por `insert(users)` achou **seis** no total — conferido em 2026-11-19:

```
src/lib/actions/affiliates.ts:42
src/lib/actions/affiliate-signup.ts:36
src/lib/actions/bonus-play.ts:58
src/lib/actions/misc.ts:66
src/lib/actions/reserve.ts:245      ← consertado pela LTM-23
src/lib/actions/signup.ts:58
```

**Cinco continuam como estavam.** E eles **não são o mesmo problema**, o que é justamente a razão
de esta story existir em vez de um "aplicar o mesmo `ON CONFLICT` em todos".

---

## Os cinco, um a um

### 🔴 1. `bonus-play.ts:48-61` — **cópia byte a byte** do defeito consertado

```ts
const [existingUser] = await db.select().from(users)
  .where(and(eq(users.tenantId, tenant.id), eq(users.phone, data.phone)))
  .limit(1);

const userId = existingUser
  ? existingUser.id
  : (await db.insert(users)
      .values({ tenantId: tenant.id, phone: data.phone, role: "subscriber" })
      .returning())[0].id;
```

**Mesmo `SELECT`, mesmo `INSERT`, mesmos valores, mesmo `.returning()[0].id`, mesma ausência de
`onConflict`.** É o código da `reserve.ts` antes da `LTM-23`, linha por linha.

> **E está no caminho do comprador na loja.** Duas batidas em "jogar" de um comprador novo produzem
> o mesmo **500** que a `LTM-23` acabou de eliminar da reserva. **É o item mais grave desta story**,
> e o único que o conserto da `LTM-23` resolve sem pensar.

### 🟡 2. `signup.ts:29-58` — mesmo padrão, **conserto diferente**

O `SELECT` procura por **telefone OU e-mail**, e o `INSERT` escreve os dois. Um
`ON CONFLICT (tenant_id, phone)` aqui seria **errado**: a colisão pode ser legitimamente de
**e-mail**, e nesse caso a resposta certa é a mensagem que o arquivo já tem — *"já existe conta com
este e-mail"* — e não devolver silenciosamente o usuário do telefone.

> **É a mesma armadilha do AC4 da `LTM-23`, do outro lado.** Lá o risco era engolir conflito de
> e-mail; aqui o risco é **tratar como idempotência o que é recusa de negócio**.

### 🔴 3. `affiliate-signup.ts:25-47` — o padrão **mais dois defeitos que não precisam de corrida**

| | |
|---|---|
| a corrida | mesma de sempre |
| **defeito A** | o `INSERT` escreve `phone` **sem nunca conferi-lo**. E-mail novo com telefone já usado **estoura sozinho**, com um único usuário, sem concorrência nenhuma |
| **defeito B** | `affiliateCode` vem de `randomBytes(4)` **sem repetição** contra `users_tenant_affiliate_code_idx`. Colisão é improvável e **não é impossível** — e quando acontece, o cadastro falha com erro de banco |

> **O defeito A é o mais fácil de reproduzir de toda esta story:** um formulário, um envio, erro
> 500. Não precisa de duas abas nem de concorrência.

### 🟡 4. `affiliates.ts:25-54` — mesma forma, painel do operador

Mesmo padrão, mas quem dispara é o **operador**, não o comprador. Corrida é menos provável (uma
pessoa, um clique) e o estrago é menor (erro numa tela de gestão, não numa compra).

### ⬜ 5. `misc.ts:66` — **[NÃO ANALISADO]**

Apareceu na varredura e **não foi lido**. Entra na story para não ficar de fora da conta; a primeira
tarefa é descobrir o que ele é.

---

## Story

**Como** pessoa que se cadastra, joga ou compra pela primeira vez
**Eu quero** que o sistema sempre saiba resolver quem eu sou, por qualquer porta
**Para que** nenhuma delas me devolva um erro de servidor na estreia.

---

## Decisão de arquitetura

### Um lugar só para criar a identidade do comprador

A `LTM-23` criou `ensureBuyerIdentity` **privada** dentro de `reserve.ts`. Ela resolve o
`bonus-play.ts` sem lógica nova — mas **não pode ser exportada de lá**: `reserve.ts` é `"use
server"`, e exportar a função a transformaria em **endpoint POST público**.

**O caminho é extrair para módulo puro**, no molde de `src/lib/raffles/expire-reservations.ts` — que
existe exatamente porque a `LTM-20` esbarrou na mesma restrição.

> **É a terceira vez que `"use server"` decide a forma do código nesta base.** Primeiro na `LTM-03b`
> (a constante do relógio), depois na `LTM-20` (a varredura), agora aqui. Vale como padrão: **no
> lotemania, lógica compartilhada entre actions mora em módulo puro, não na action.**

### O que **não** se unifica

`signup.ts` e `affiliate-signup.ts` criam identidade com **e-mail e mais campos**, e têm regras de
recusa próprias. Forçá-los no mesmo molde do comprador por telefone trocaria uma recusa de negócio
por uma idempotência silenciosa. **Eles ganham o conserto deles, não o mesmo.**

---

## Tarefas (Checklist)

- [ ] Extrair `ensureBuyerIdentity` para módulo puro.
- [ ] `bonus-play.ts` passa a usá-la.
- [ ] `signup.ts`: idempotência por telefone **preservando** a recusa por e-mail.
- [ ] `affiliate-signup.ts`: a corrida **e** os dois defeitos sem corrida.
- [ ] `affiliates.ts`: mesmo conserto do painel.
- [ ] Ler `misc.ts:66` e decidir.

---

## Critérios de Aceite

- [ ] **AC1 (`bonus-play` deixa de estourar):** N jogadas simultâneas do mesmo telefone novo →
      **uma** identidade, **zero** exceções. É o AC1 da `LTM-23` no outro caminho.
- [ ] **AC2 (uma implementação, não seis):** `ensureBuyerIdentity` vive em **um** arquivo, e
      `reserve.ts` e `bonus-play.ts` a importam. Teste de fonte: nenhum `insert(users)` com
      `role: "subscriber"` fora do módulo.
- [ ] **AC3 (a recusa por e-mail sobrevive):** em `signup.ts`, cadastro com e-mail já usado **é
      recusado com a mensagem de negócio** — não devolve conta alheia nem cria segunda. **É o AC que
      impede o conserto de virar defeito de identidade.**
- [ ] **AC4 (o defeito sem corrida):** em `affiliate-signup.ts`, e-mail novo com **telefone já
      usado** devolve recusa nomeada. Hoje estoura com erro de banco, **sem concorrência**.
- [ ] **AC5 (código de afiliado não colide):** geração com repetição contra o índice único; esgotar
      tentativas falha alto, nomeando a causa.
- [ ] **AC6 (a ficha do anti-spam sobrevive):** em todos os caminhos. Mesma regressão do AC3 da
      `LTM-23` — `DO NOTHING`, nunca `DO UPDATE` sobre a linha do comprador.
- [ ] **AC7 (regressão):** suíte inteira verde.
- [ ] **AC8 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

---

## Escopo

**IN:** os cinco caminhos restantes; a extração para módulo puro; os dois defeitos sem corrida do
afiliado.

**OUT:**

- **Repensar o modelo de identidade.** A `LTM-21` traz cadastro de 14 campos com senha e a `LTM-22`
  traz verificação de telefone. Esta story **conserta o que existe**; não antecipa nenhuma das duas.
- **`reserve.ts`** — já consertado pela `LTM-23`.

---

## Dependências

- **Depende da `LTM-23`** (`InReview`) — é de lá que vem `ensureBuyerIdentity` e o idioma do
  conserto.
- ⚠️ **Toca `reserve.ts`** (só para trocar a função privada pelo import) → entra na fila serial com
  `LTM-04`, `LTM-17`, `LTM-21` e `LTM-18` grupo A.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/identity/ensure-buyer.ts        (novo — modulo puro)
  apps/lotemania/src/lib/actions/reserve.ts              (troca a privada pelo import)
  apps/lotemania/src/lib/actions/bonus-play.ts
  apps/lotemania/src/lib/actions/signup.ts
  apps/lotemania/src/lib/actions/affiliate-signup.ts
  apps/lotemania/src/lib/actions/affiliates.ts
  apps/lotemania/src/lib/actions/misc.ts                 (SE a leitura concluir que ele entra)
  apps/lotemania/tests/money-path/identidade-seis-caminhos.test.ts  (novo)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao  — os indices unicos ja existem
```

---

## Riscos

- **[Alto] Aplicar o mesmo conserto nos seis.** `signup.ts` e `affiliate-signup.ts` têm recusa de
  negócio por e-mail; transformá-la em idempotência devolveria **conta alheia**. AC3 é a trava, e
  este risco é a razão de a story existir em vez de um comando de busca-e-substitui.
- **[Médio] Exportar de `"use server"`.** Transformaria a função em endpoint POST público. O módulo
  puro existe por isso.
- **[Baixo] `misc.ts` ser outra coisa.** Por isso está como `[NÃO ANALISADO]` em vez de assumido.

---

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Nasce do `[CONFIRMAR]` da `LTM-23`, que mandou olhar **dois** caminhos e a varredura achou **seis**. O mais grave é `bonus-play.ts:48-61`, **cópia byte a byte** do defeito consertado, no caminho do comprador. E `affiliate-signup.ts` tem dois defeitos que **nem precisam de concorrência**: escreve telefone sem conferir, e gera código de afiliado sem repetição contra o índice único. A lição que a story carrega: **os seis não aceitam o mesmo conserto** — dois deles têm recusa de negócio que viraria idempotência silenciosa. | @aiox-master |
