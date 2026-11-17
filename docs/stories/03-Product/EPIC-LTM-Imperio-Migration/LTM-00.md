# LTM-00: O app tem que compilar

**Status:** **Done** (2026-11-16)
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação) · pré-requisito de **todas** as demais
**Prioridade:** **P0** — enquanto não compilava, nenhum critério de aceite de nenhuma story era verificável
**Complexidade:** L — cinco módulos recuperados + 55 erros de tipo
**Executada por:** @aiox-master (controlador) + @dev (Dex)

> **Story escrita depois da execução, e isso está sendo dito em voz alta.** O problema foi
> descoberto rodando o compilador pela primeira vez, no meio da elaboração das outras stories, e o
> conserto era pré-requisito de qualquer verificação — inclusive da própria validação do @po. O
> registro existe para o epic ficar íntegro, não para fingir que o processo foi seguido na ordem.

## Story

**Como** qualquer pessoa que precise provar que algo neste app funciona
**Eu quero** que `lint`, `typecheck` e `build` passem
**Para que** "está pronto" deixe de ser afirmação e volte a ser medição.

## Contexto — como isso passou despercebido

Ninguém tinha instalado as dependências nem compilado este app desde a importação. O
`package.json` **não tinha `typecheck` nem `test`**, e `next build` nunca havia sido rodado aqui.

É a terceira vez que a casa encontra o mesmo padrão: 177 testes invisíveis no `video-studio`, 45
no `creative-design`, e agora um app inteiro que não compila. **Script ausente não é verificação
que passa.**

Evidência completa: `docs/research/2026-11-16-lotemania-build-health.md`.

### O que estava quebrado

**Dez arquivos-fonte de 0 bytes**, cinco deles importados por código existente — e import de
módulo vazio não é aviso, é erro de build.

| Arquivo | Quem quebrava |
|---|---|
| `components/ui/badge.tsx` | **7 arquivos** do painel e da loja |
| `loja/[tenant]/[productSlug]/raffle-extras.tsx` | **a página onde o comprador escolhe o número** — o produto |
| `dashboard/settings/settings-tabs.tsx` | `settings/page.tsx` |
| `dashboard/users/users-filters.tsx` | `users/page.tsx` |
| `dashboard/contacts/contact-card.tsx` | `contacts/page.tsx` |

Mais três `page.tsx` de 0 bytes (`analytics`, `social`, `utm-links`) que o validator de tipos do
Next recusa, e dois arquivos vazios sem consumidor (`social-form`, `utm-link-form`).

**Os timestamps mostram perda, não ausência.** O `raffle-extras.tsx` está datado **três horas e
meia depois** da página que o importa, e está vazio. Os outros foram escritos no mesmo minuto que
seus consumidores íntegros. Algo sobrescreveu código que funcionava com nada — e o deploy em
produção **ainda executa** a versão com os componentes.

## O que foi feito

### Recuperação, não reescrita — e a distinção importa

| Arquivo | Como | Fonte |
|---|---|---|
| `raffle-extras.tsx` (7 componentes) | **recuperado** | estava no bundle de produção: `number-grid.tsx` é `"use client"` e puxa o módulo para o grafo do cliente. Reconstruído do minificado + HTML renderizado, classe por classe |
| `badge.tsx` | reescrito | padrão dos outros primitivos (`cva` + `cn` + `data-slot`), com as 4 variantes que os consumidores já usavam |
| `users-filters.tsx` | **reconstruído** | `users/page.tsx` lê exatamente `name/cpf/email/phone/code/role` de `searchParams` |
| `contact-card.tsx` | **reconstruído** | `resolveContact()` já existia em `actions/misc.ts` |
| `settings-tabs.tsx` | **reconstruído** | o `siteConfigSchema` agrupa os próprios campos nos comentários — é de lá que saem as abas |

Cada arquivo diz no cabeçalho se foi recuperado ou reconstruído, e de qual fonte.

### Os 55 erros de tipo

| Grupo | Qtd | Correção |
|---|---|---|
| `zodResolver` v6 + `zod` v4 | 43 | `useForm<z.input, unknown, z.output>` — validado em um arquivo antes de propagar |
| `Select` do base-ui entrega `string \| null` | 4 | default da própria tela |
| `.default({})` no zod | 2 | `.prefault({})` — **mudança de comportamento real**, ver abaixo |
| tipo `Game` duplicado | 3 | fonte única, a que casa com as tabelas `*_combos` |
| `dashboard/layout.tsx` | 1 | `users.name` é nullable |
| ternário morto em `actions/banking.ts` | 1 | removido |
| três rotas de 0 bytes | 3+3 | placeholder honesto com `EmptyState` |

### Duas coisas que não eram mecânicas

**O `.prefault({})` muda comportamento, e isso foi medido antes de decidir.** O `.default({})` do
zod v4 devolve o `{}` literal **sem aplicar os defaults dos campos internos**: o tipo prometia
strings, o runtime entregava `undefined` — em input controlado no editor de sorteio
(`advanced-settings-tabs.tsx:763`) e na loja pública
(`loja/[tenant]/[productSlug]/page.tsx:196`). **Era bug, não escolha.** Nenhum campo muda de
valor; o objeto deixa de sair vazio.

**Um erro que o type check mascarava.** Com o typecheck verde, o build avançou e morreu em
`/login`: `useSearchParams()` sem fronteira de Suspense. O remédio documentado do Next (dividir em
`page` + Suspense + `login-form`) foi aplicado **e medido**: o HTML estático ficou com **zero**
markup do formulário — a tela de login inteira sairia do HTML. Revertido. O `from` só é lido
dentro do handler de submit, então o hook nunca foi necessário. Diff de 3 linhas em vez de 114.

## Critérios de Aceite — todos verificados

- [x] **AC1:** `npm run lint` sai **0**. Os 3 erros que restavam (`set-state-in-effect` em
      `raffle-extras` e `use-mobile`, um `as any` no `rich-text-editor`) foram corrigidos — os dois
      primeiros com `useSyncExternalStore`, o terceiro usando `chain().focus().setFontSize().run()`
      como o vizinho, já que a extensão `FontSize` sempre esteve registrada.
- [x] **AC2:** `npm run typecheck` sai **0**, com `tsconfig.tsbuildinfo` limpo.
- [x] **AC3:** `npx next build` sai **0** — 43 rotas, 32 páginas estáticas.
- [x] **AC4:** o `package.json` declara `typecheck`. *(`test` continua ausente — é a `LTM-05`.)*
- [x] **AC5:** `/login` continua estática e com o formulário no HTML servido (15,8 KB, `id="username"`
      e `id="password"` presentes).
- [x] **AC6:** nenhum arquivo de `LTM-01/02/03/05` foi tocado — `reserve.ts`, `checkout.ts`,
      `db/schema/**` e `db/index.ts` estão intactos, preservando a linha de base de teste delas.
- [x] **AC7:** `typescript.ignoreBuildErrors` **não** foi ligado.

## Duas armadilhas de medição, registradas para não custarem de novo

1. **`tsc --noEmit` mentia por 26 erros.** `"incremental": true` com um `tsconfig.tsbuildinfo`
   velho escondia justamente o ternário morto do módulo bancário e os dois `.default({})`.
   `rm -f tsconfig.tsbuildinfo` faz os números coincidirem. **O `next build` é a autoridade.**
2. **`next build` sai 1 depois de um build verde.** O Next 16.4.3 para num interstício de aviso de
   segurança **depois** de compilar, passar o typecheck e gerar as 32 páginas. A segunda execução
   sai 0. Quem automatizar a porta precisa saber disto.

## Escopo

**IN:** os cinco módulos importados; os 55 erros de tipo; os 3 erros de lint; o script `typecheck`;
placeholder honesto nas três rotas vazias.

**OUT:** construir de verdade `analytics`, `social` e `utm-links` — são Frente B (paridade), e no
caso de `utm-links` o contrato está incompleto (`clicks` e `fullUrl` não são colunas e a convenção
de montagem da URL não está declarada em lugar nenhum, então **não foi inventada**). Também fora:
o `next upgrade --agent=security` que o Next pede — é dependência, escopo do @devops, e decisão do
dono.

## Pendência que esta story deixa

- [ ] **`next upgrade --agent=security`** — o Next 16.4.3 reporta aviso de vulnerabilidade a cada
      build. Não executado: mexer em dependência é @devops, e é decisão do dono do projeto.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-16 | 1.0 | Executada: `a6ed25f0` (cinco módulos) + `90c8ca59` (55 erros, lint limpo). | @aiox-master + @dev |
| 2026-11-17 | 1.1 | Story escrita retroativamente para o epic ficar íntegro, com a ordem invertida declarada. | @aiox-master |
