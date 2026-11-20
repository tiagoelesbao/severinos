# LTM-28: A identidade do comprador é criada em seis lugares, cada um do seu jeito

**Status:** Ready
> ✅ **Validada pelo @po em 2026-11-20 — GO (8,5/10). `Draft` → `Ready`.** Os **seis** caminhos
> conferidos linha por linha: as seis citações de `insert(users)` estão **exatas**. A tese central da
> story — *"os seis não aceitam o mesmo conserto"* — está certa e é o que a salva de ser um
> busca-e-substitui. **Três correções minhas:** o `AC2` contradizia o `AC3` e seria insatisfazível;
> o `misc.ts:66` sai de `[NÃO ANALISADO]` **respondido por medição**; e o **AC9** novo nomeia o que a
> medição de hoje mostrou ser pior do que a story supunha — nos dois caminhos do comprador o erro não
> aparece como 500, aparece como **nada**. Ver *Validação @po* ao fim.
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

### ⬜ 5. `misc.ts:66` — **lido pelo @po em 2026-11-20: é outro animal, e não entra no molde**

Era `[NÃO ANALISADO]`, e a resposta não precisava de decisão nenhuma — só de abrir o arquivo. É a
função **`createUser`**, e ela é o **oposto** dos quatro de cima:

| | |
|---|---|
| Quem dispara | **`requireAdmin()`** — o operador criando usuário de painel, na tela `/dashboard/users` |
| O que grava | `name`, `email`, **`passwordHash`** e **`role` arbitrário** (não `subscriber`) |
| Tem a corrida? | **Não.** Não existe `SELECT` antes: é um `insert` seco, uma instrução só |
| Precisa de `ensureBuyerIdentity`? | **Não.** Isto não é identidade de comprador — é cadastro administrativo |

**O que ele tem é o outro defeito**, o que não precisa de concorrência: `insert` seco contra os
índices únicos de `email` e `phone`. E-mail repetido **estoura cru**, com um único usuário e sem
disputa nenhuma. É o mesmo gênero do **defeito A** do `affiliate-signup.ts`, numa tela de operador.

> **Então ele fica na story, com escopo reduzido e explícito:** ganha **recusa nomeada**, não ganha
> o módulo. Forçá-lo no molde do comprador por telefone transformaria *"já existe usuário com este
> e-mail"* em *"aqui está a conta dele"* — que é precisamente o risco [Alto] desta story, aplicado à
> tela onde o estrago seria dar acesso de painel a quem não devia.

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
- [ ] ~~Ler `misc.ts:66` e decidir.~~ **Lido pelo @po em 11-20: é `createUser` sob `requireAdmin`.**
      Entra só para **recusa nomeada** no e-mail/telefone repetido; **não** recebe o módulo.
- [ ] **A recusa chega à pessoa**, nos quatro caminhos — ver `AC9`. Ação que **lança** em componente
      sem `catch` não produz mensagem nenhuma.

---

## Critérios de Aceite

- [ ] **AC1 (`bonus-play` deixa de estourar):** N jogadas simultâneas do mesmo telefone novo →
      **uma** identidade, **zero** exceções. É o AC1 da `LTM-23` no outro caminho.
- [ ] **AC2 (uma implementação para o comprador por telefone, não seis):** `ensureBuyerIdentity`
      vive em **um** arquivo, e `reserve.ts` e `bonus-play.ts` a importam. Teste de fonte: nenhum
      `insert(users)` **no caminho do comprador identificado por telefone** fora do módulo.
  - ⚠️ **Corrigido pelo @po em 2026-11-20: a redação anterior era insatisfazível junto com o `AC3`.**
    Ela dizia *"nenhum `insert(users)` com `role: "subscriber"` fora do módulo"* — e
    **`signup.ts:58` é exatamente isso**: `.values({ tenantId, role: "subscriber", ...values })`.
    Conferido hoje. Mas o `AC3` **manda esse `insert` continuar lá**, porque ele carrega a recusa por
    e-mail que não pode virar idempotência. **Os dois ACs se contradiziam**, e o teste de fonte
    reprovaria a implementação correta.
  - **As exceções declaradas, com o motivo de cada uma** — um teste de fonte precisa da lista, ou
    vira caixinha marcável:
    | Arquivo | Fica fora do módulo porque |
    |---|---|
    | `signup.ts:58` | identidade por **telefone OU e-mail** (`or(...)` no `SELECT`, conferido) com recusa de negócio própria |
    | `affiliate-signup.ts:36` | identidade por **e-mail**, com promoção a `role: "affiliate"` |
    | `affiliates.ts:42` | idem, pelo painel, com senha temporária |
    | `misc.ts:66` | **cadastro administrativo** sob `requireAdmin`, com `role` arbitrário |
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
- [ ] **AC9 (a recusa aparece para quem a causou — @po, 2026-11-20):** em cada um dos quatro
      caminhos, a recusa chega como **valor de retorno** (`{ error }`), não como exceção lançada — e
      o teste **verifica que a mensagem aparece**, não só que o banco não corrompeu.
  - ⚠️ **Esta é a correção de premissa desta validação, e ela inverte o que a story supõe.** A story
    diz *"erro 500"*, *"estoura com erro de banco"*, *"um formulário, um envio, erro 500"* — como se
    a pessoa visse algo. **Medido hoje, nos dois caminhos do comprador, ela não vê nada:**
    | Caminho | O componente | O que a pessoa vê quando a action **lança** |
    |---|---|---|
    | `bonus-play.ts` (comprador) | `bonus-game-player.tsx:60,67` trata `result.error`, **sem `try`/`catch`** | **nada** — a rejeição não é capturada |
    | `affiliate-signup.ts` (comprador) | `affiliate-panel.tsx:40` trata `result.error`, **sem `try`/`catch`** | **nada** |
    | `affiliates.ts` (operador) | `new-affiliate-dialog.tsx:44-48` **tem** `try`/`catch` + `toast.error` | a mensagem do erro |
    E **não existe `error.tsx` nem `global-error.tsx` em nenhum nível de `src/app`** — conferido:
    zero arquivos. Não há fronteira de erro para aparar o que escapa.
  - ⛔ **Falha silenciosa é pior que erro cru**, e a ironia mede o problema: o único caminho que
    **mostra** a falha é o do operador, que é o de menor estrago. Os dois do comprador — estreia de
    quem está jogando ou se cadastrando — falham calados.
  - 💡 **Os dois componentes já sabem ler `{ error }`.** Então o conserto é **devolver** em vez de
    lançar, e não há UI nova a construir. Isso faz o `AC4` deixar de medir a coisa errada: trocar a
    mensagem não resolve onde **não há mensagem nenhuma**.

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
  apps/lotemania/src/lib/actions/misc.ts                 (ENTRA - createUser, so recusa nomeada)
  apps/lotemania/tests/money-path/identidade-seis-caminhos.test.ts  (novo)

AC9 - a recusa tem de CHEGAR, e so estes dois leem `{ error }` hoje (nao editar se o
conserto for no retorno da action; declarados porque o AC9 se fecha contra eles):
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/bonus-game-player.tsx   (:60, :67)
  apps/lotemania/src/app/loja/[tenant]/afiliados/affiliate-panel.tsx         (:40)
  ⚠️ `bonus-game-player.tsx` e irmao de `number-grid.tsx` no mesmo diretorio, que e da
     LTM-02/LTM-08 - arquivos DISTINTOS, conjuntos disjuntos, mas o diretorio e disputado

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

## Validação @po (2026-11-20) — **GO, 8,5/10. `Draft` → `Ready`**

A story faz a coisa que mais me importa numa varredura: ela **recusa a generalização que ela mesma
poderia ter feito**. Achou seis ocorrências do mesmo padrão e, em vez de propor um
busca-e-substitui, mostrou que **dois deles têm recusa de negócio** que o conserto transformaria em
idempotência silenciosa — devolvendo conta alheia. É a diferença entre uma varredura e uma análise.

### As seis citações estão exatas

Conferido com `grep -rn "insert(users)" src`:

| Story diz | Medição |
|---|---|
| `affiliates.ts:42` | ✅ |
| `affiliate-signup.ts:36` | ✅ |
| `bonus-play.ts:58` | ✅ |
| `misc.ts:66` | ✅ |
| `reserve.ts:245` | ✅ (consertado pela `LTM-23`) |
| `signup.ts:58` | ✅ |

**Seis de seis, na linha exata.** Conferi também o que a story afirma sobre a **forma** de cada um:
`signup.ts:28` seleciona por `or(phone, email)` — a story está certa de que `ON CONFLICT (tenant_id,
phone)` ali seria errado; `affiliate-signup.ts:27` seleciona **só por e-mail** e insere `phone` —
está certa de que o **defeito A** existe sem concorrência nenhuma; e `ensureBuyerIdentity` está em
`reserve.ts:233`, **privada**, usada em `:331`.

### O argumento de arquitetura está certo, e já tem dois precedentes

*"Não pode ser exportada de `reserve.ts`: é `"use server"`, e exportar a transformaria em endpoint
POST público."* Correto, e a story faz melhor que afirmar — ela mostra que é a **terceira** vez que
`"use server"` decide a forma do código nesta base (`LTM-03b`, `LTM-20`, agora). **Subscrevo como
padrão da casa:** lógica compartilhada entre actions mora em módulo puro.

### As três correções que eu apliquei

1. **O `AC2` contradizia o `AC3`.** *"Nenhum `insert(users)` com `role: "subscriber"` fora do
   módulo"* reprovaria `signup.ts:58`, que o `AC3` **manda manter**. O teste de fonte falharia contra
   a implementação correta. Recortado para *"o caminho do comprador identificado por telefone"*, com
   as **quatro exceções declaradas e justificadas** — porque teste de fonte sem a lista das exceções
   é caixinha marcável.
2. **O `misc.ts:66` saiu de `[NÃO ANALISADO]`.** Não precisava de decisão, precisava de abrir o
   arquivo: é `createUser` sob `requireAdmin`, com `passwordHash` e `role` arbitrário. **Não é
   identidade de comprador, não tem a corrida** (`insert` seco, sem `SELECT`) e **não recebe o
   módulo** — ganha só recusa nomeada. A story passou de *"cinco conhecidos + um desconhecido"* para
   **seis conhecidos**, e o escopo dela ficou **menor**, não maior.
3. **O `AC9` novo — e é a correção de premissa.** Ver abaixo.

### A premissa invertida: não é 500, é silêncio

A story descreve o estrago como *"erro 500"*, *"estoura com erro de banco"*, *"um formulário, um
envio, erro 500"*. **Medido hoje, nos dois caminhos do comprador a pessoa não vê erro nenhum.** Os
dois componentes tratam `result.error` — valor de retorno — e **nenhum dos dois tem `try`/`catch`**,
então uma action que **lança** produz rejeição não capturada. E **não existe `error.tsx` nem
`global-error.tsx` em nenhum nível de `src/app`**: zero arquivos, conferido. Não há fronteira de erro.

> **A ironia mede o problema:** o único dos caminhos que **mostra** a falha é
> `new-affiliate-dialog.tsx` — o do **operador**, que é o de menor estrago. Os dois do **comprador**,
> onde a story corretamente põe a gravidade, falham **calados**: a pessoa clica em "jogar", nada
> acontece, e ela clica de novo.
>
> **Isso muda o que o `AC4` precisa provar.** Ele dizia *"devolve recusa nomeada; hoje estoura com
> erro de banco"* — e trocar a mensagem não é o conserto quando **não há mensagem**. O `AC9` fecha
> isso, e o conserto é barato: os dois componentes **já sabem ler `{ error }`**, então basta a action
> **devolver** em vez de lançar. Zero UI nova.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ✅ 8 caminhos; acrescentei os dois componentes contra os quais o `AC9` se fecha |
| UI/Frontend | ⚠️ → ✅ com o `AC9`; era o eixo que a story não tinha e onde o defeito de fato aparece |
| Satisfação dos ACs | ⚠️ → ✅ depois do recorte do `AC2`, que era insatisfazível com o `AC3` |
| Instruções de teste | ✅ `AC1` é o `AC1` da `LTM-23` no outro caminho, e aquele já provou que o teste pega |
| Segurança | ✅ o risco [Alto] *"devolver conta alheia"* é o eixo da story, não uma nota de pé |
| Sequência de tarefas | ✅ a extração primeiro, os consertos próprios depois |
| Duplicação funcional | ⚠️ **toca `reserve.ts`** → fila serial com `LTM-04`, `LTM-17`, `LTM-21`, `LTM-18` grupo A |
| Anti-alucinação | ✅ **seis de seis** citações exatas; corrigida a premissa do 500 |
| Prontidão para @dev | ✅ depende da `LTM-23`, que está `InReview` — ver abaixo |

### A dependência da `LTM-23`, e o que ela de fato bloqueia

A story depende da `LTM-23` *"de onde vem `ensureBuyerIdentity` e o idioma do conserto"*. A `LTM-23`
está **`InReview`** com o @qa rodando o portão **agora**. Conferido: a função **existe no código**
(`reserve.ts:233`), então o material desta story está disponível — mas se o portão voltar `FAIL` e o
idioma do conserto mudar, **esta story herda a mudança**. **Não bloqueia o `Ready`**; bloqueia o
despacho simultâneo, que a fila serial de `reserve.ts` já impede de qualquer forma.

### A posição dela na fila, e minha recomendação

Ela é **P1** e é a **mais curta** da fila de `reserve.ts` — toca o arquivo para **uma** troca (a
função privada pelo import). Das cinco da fila, é a que sai mais rápido. Mas o `bonus-play.ts`, que é
o item **[Alto]** dela, **não toca `reserve.ts`** — e é **cópia byte a byte** de um defeito já
consertado, no caminho do comprador. **Se a fila atrasar, o `bonus-play.ts` pode sair sozinho.**

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.1 | **Validada — GO (8,5/10). `Draft` → `Ready`.** As **seis** citações de `insert(users)` conferidas na linha exata, e as formas também (`signup.ts:28` seleciona por `or(phone, email)`; `affiliate-signup.ts:27` seleciona só por e-mail e insere `phone`; `ensureBuyerIdentity` privada em `reserve.ts:233`, usada em `:331`). **Três correções.** (1) **`AC2` contradizia o `AC3`** e era insatisfazível: *"nenhum `insert(users)` com `role: "subscriber"` fora do módulo"* reprovaria `signup.ts:58`, que o `AC3` manda manter — recortado para o caminho do comprador por telefone, com as **quatro exceções declaradas e justificadas**. (2) **`misc.ts:66` saiu de `[NÃO ANALISADO]` por medição**: é `createUser` sob `requireAdmin`, com `role` arbitrário e **sem a corrida** (`insert` seco) — entra só para **recusa nomeada**, **não** recebe o módulo; o escopo da story ficou menor. (3) **`AC9` novo, corrigindo a premissa central:** a story fala em *"erro 500"*, mas nos **dois caminhos do comprador** a pessoa **não vê nada** — `bonus-game-player.tsx` e `affiliate-panel.tsx` tratam `result.error` e **não têm `try`/`catch`**, e **não existe `error.tsx` em nenhum nível de `src/app`** (zero arquivos). O único caminho com mensagem é o do **operador**, o de menor estrago. **Falha silenciosa é pior que erro cru**, e isso muda o que o `AC4` prova: trocar a mensagem não conserta onde não há mensagem. Conserto barato — os dois componentes já leem `{ error }`, então a action **devolve** em vez de lançar. | @po (Pax) |
| 2026-11-19 | 1.0 | Nasce do `[CONFIRMAR]` da `LTM-23`, que mandou olhar **dois** caminhos e a varredura achou **seis**. O mais grave é `bonus-play.ts:48-61`, **cópia byte a byte** do defeito consertado, no caminho do comprador. E `affiliate-signup.ts` tem dois defeitos que **nem precisam de concorrência**: escreve telefone sem conferir, e gera código de afiliado sem repetição contra o índice único. A lição que a story carrega: **os seis não aceitam o mesmo conserto** — dois deles têm recusa de negócio que viraria idempotência silenciosa. | @aiox-master |
