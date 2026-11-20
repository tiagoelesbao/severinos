# LTM-30: "Nenhum título encontrado" quando o problema não foi o telefone

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente C)
**Prioridade:** **P2** — não bloqueia o ensaio; **a mensagem errada é sobre a compra de alguém**
**Complexidade:** **S** — duas linhas e um teste; o difícil é não transformar em refatoração
**Criada por:** @aiox-master · 2026-11-20
**Origem:** dívida que o @dev **viu e deixou declarada** ao fim da `LTM-08`, por não haver AC que a cobrisse

## O que acontece

`src/app/loja/[tenant]/meus-titulos/lookup-form.tsx:58`:

```ts
const result = await lookupOrdersByPhone(tenantSlug, phone);
setOrders((result.orders as OrderRow[]) ?? []);
```

O `as` **engole o ramo de erro**. `lookupOrdersByPhone` devolve
`{ error: "Operador não encontrado." }` quando o operador não existe
(`src/lib/actions/my-titles.ts:29`), e nesse caso `result.orders` é `undefined` → `?? []` → lista
vazia → a tela mostra **"Nenhum título encontrado para esse telefone"**.

> **A mensagem está errada sobre o assunto mais sensível que esta loja tem.** Num produto de
> sorteio, *"você não tem títulos"* é a pior frase falsa possível: a pessoa comprou, tem o
> comprovante no banco, e a tela diz que não encontrou nada **do telefone dela**. Ela vai concluir
> que perdeu a compra, não que errou a URL.

## E o ramo é alcançável — conferido, não suposto

A primeira suspeita é que isto seja teórico: se o operador não existe, a página não deveria nem
abrir. **Ela abre.** `src/app/loja/[tenant]/meus-titulos/page.tsx` **não valida o operador** — lê
`params.tenant` e passa a slug adiante, sem `notFound()` e sem consulta:

```ts
const { tenant: tenantSlug } = await params;
...
<LookupForm tenantSlug={tenantSlug} />
```

Então URL com slug errada **renderiza a tela inteira**, aceita o telefone, e responde com a mentira.

## Story

**Como** comprador que digitou o endereço da loja errado
**Eu quero** saber que a loja não existe
**Para que** eu não conclua que perdi os títulos que eu comprei.

---

## Decisão de arquitetura

### O conserto é o estreitamento, não o `try`/`catch`

O padrão correto desta base já está escrito e medido: `"error" in result` **sozinho não estreita**
aqui, porque os `return` literais no mesmo corpo fazem o TypeScript normalizar a união com
`error?: undefined`. O @dev mediu isso na `LTM-08` e levou `TS2345` e `TS18048` por causa disso. A
forma que funciona é:

```ts
if ("error" in result && result.error !== undefined) { /* mostra o erro */ }
```

**Nenhum `as`.** O `as` é a causa: ele afirma ao compilador um fato que o retorno não garante, e o
compilador para de ajudar exatamente onde ajudaria.

### Duas camadas, e as duas valem

| Camada | O que faz | Por que não basta a outra |
|---|---|---|
| **a página valida o operador** | `notFound()` quando a slug não existe | é a correção **na raiz**: a tela não deveria abrir |
| **o formulário mostra o erro** | mensagem do `{ error }` em vez de lista vazia | a action tem **outros** ramos de erro no futuro, e engolir qualquer um deles repete o defeito |

⚠️ **Fazer só a primeira deixaria o `as` no lugar**, e o próximo ramo de erro que a action ganhar
volta a virar "nenhum título encontrado". Fazer só a segunda deixaria a loja inexistente abrindo
uma tela funcional.

---

## Tarefas (Checklist)

- [ ] A página de "Meus títulos" responde `notFound()` para operador inexistente.
- [ ] O formulário distingue **erro** de **lista vazia**, sem `as`.
- [ ] A mensagem de lista vazia continua existindo para o caso legítimo: telefone **sem** compras.

---

## Critérios de Aceite

- [ ] **AC1 (a loja inexistente não abre):** `/loja/slug-que-nao-existe/meus-titulos` responde 404,
      não a tela de consulta.
- [ ] **AC2 (erro é erro):** com a action devolvendo `{ error }`, a tela mostra **a mensagem do
      erro** — e **nunca** "Nenhum título encontrado para esse telefone". Teste exige que a frase da
      lista vazia **não** apareça neste caminho.
- [ ] **AC3 (vazio continua vazio):** telefone válido **sem** compras continua vendo "Nenhum título
      encontrado". ⚠️ **É o AC que impede o conserto de trocar um texto errado por outro** — a lista
      vazia legítima é informação correta e tem de sobreviver.
- [ ] **AC4 (sem `as`):** o estreitamento é `"error" in result && result.error !== undefined`.
      Teste de fonte: **nenhum `as OrderRow[]`** no arquivo. ⚠️ Varrer **código**, nunca texto — os
      comentários desta base escrevem a forma proibida para condená-la.
- [ ] **AC5 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

---

## Escopo

**IN:** a validação do operador na página; o estreitamento no formulário; o teste dos três caminhos
(erro, vazio legítimo, com títulos).

**OUT:**

- **Varrer os outros `as` do app.** Se houver mais, é varredura própria com critério próprio — esta
  story conserta **o caminho onde a mensagem falsa é sobre a compra de alguém**.
- **Mudar o contrato de `lookupOrdersByPhone`.** O retorno em união está certo; quem errou foi quem
  o leu com `as`.
- **Sessão de comprador.** É a `LTM-21`. Esta tela consulta por telefone **de propósito** e continua
  assim.

---

## Dependências

- **Depende da `LTM-08`** (`InReview`) — ela acabou de tocar os dois arquivos (`my-titles.ts` para
  trazer o `half` na consulta, `lookup-form.tsx` para carregar a metade até a tela). **Serializar
  depois dela.**
- **Não colide** com `reserve.ts`, com `payments/` nem com o editor de sorteio.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/loja/[tenant]/meus-titulos/page.tsx          (notFound do operador)
  apps/lotemania/src/app/loja/[tenant]/meus-titulos/lookup-form.tsx   (o estreitamento, sem `as`)
  apps/lotemania/tests/loja/meus-titulos-erro.test.ts                 (novo)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao

Depends-on: LTM-08 (toca os dois arquivos)
```

---

## Riscos

- **[Médio] Trocar um texto errado por outro.** Se o conserto fizer o caminho de lista vazia
  legítima passar a mostrar erro, o defeito muda de lado e fica pior: quem de fato não comprou passa
  a ver falha de sistema. `AC3` é a trava.
- **[Baixo] A validação do operador virar consulta duplicada.** A página já é servidor; uma leitura
  de `tenants` por slug é o que as outras páginas da loja fazem. **Seguir o padrão delas**, não
  inventar camada de cache.

---

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.0 | Nasce de dívida que o @dev **viu e declarou em vez de contornar** ao fim da `LTM-08`: `lookup-form.tsx:58` faz `setOrders((result.orders as OrderRow[]) ?? [])`, e o `as` engole o ramo `{ error }` — operador inexistente vira lista vazia, e o comprador lê **"Nenhum título encontrado para esse telefone"**. Conferido por mim que o ramo é **alcançável**: a página de Meus títulos **não valida o operador**, lê `params.tenant` e passa a slug adiante sem `notFound()`, então URL errada renderiza a tela inteira e responde com a mentira. Num produto de sorteio, *"você não tem títulos"* é a pior frase falsa possível. O conserto são **duas camadas** — `notFound()` na página e estreitamento sem `as` no formulário — e as duas valem: só a primeira deixaria o `as` para o próximo ramo de erro repetir o defeito; só a segunda deixaria a loja inexistente abrindo tela funcional. O estreitamento tem forma medida nesta base: `"error" in result` **sozinho não estreita**, porque os `return` literais no mesmo corpo normalizam a união com `error?: undefined` — custou `TS2345` e `TS18048` ao @dev na `LTM-08`. | @aiox-master |
