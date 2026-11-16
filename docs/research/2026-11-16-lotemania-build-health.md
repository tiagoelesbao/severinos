# lotemania — saúde de build, medida em 2026-11-16

Primeira vez que alguém instala as dependências e tenta compilar este app desde a importação.
Tudo abaixo é **executado**, não lido: `pnpm install`, `npx tsc --noEmit`, `npx next build`.

---

## O veredicto em uma linha

**O lotemania não compila.** Não é "tem dívida", não é "falta profundidade": `next build`
termina com erro. Nenhum deploy existente deste app é possível hoje.

---

## 1. A causa: dez arquivos-fonte de 0 bytes

```
0 bytes  src/app/dashboard/analytics/page.tsx
0 bytes  src/app/dashboard/contacts/contact-card.tsx
0 bytes  src/app/dashboard/settings/settings-tabs.tsx
0 bytes  src/app/dashboard/social/page.tsx
0 bytes  src/app/dashboard/social/social-form.tsx
0 bytes  src/app/dashboard/users/users-filters.tsx
0 bytes  src/app/dashboard/utm-links/page.tsx
0 bytes  src/app/dashboard/utm-links/utm-link-form.tsx
0 bytes  src/app/loja/[tenant]/[productSlug]/raffle-extras.tsx
0 bytes  src/components/ui/badge.tsx
```

Cinco deles são **importados por código que existe**. O import de um módulo vazio não é aviso:
é erro de build.

| Arquivo vazio | Exports que o código pede | Quem quebra |
|---|---|---|
| `components/ui/badge.tsx` | `Badge` | **7 arquivos** — integrações, gateways, pedidos, transações, usuários, meus-títulos, status de pagamento |
| `loja/[tenant]/[productSlug]/raffle-extras.tsx` | `MeusTitulosRow`, `PrizesPanel`, `DescriptionPanel`, `ShareRow`, `FloatingSupportButtons`, `WinnersInline`, `AvailabilityWarning` | **a página do sorteio na loja pública** e a `number-grid` |
| `dashboard/settings/settings-tabs.tsx` | `SettingsTabs` | `dashboard/settings/page.tsx` |
| `dashboard/users/users-filters.tsx` | `UsersFilters` | `dashboard/users/page.tsx` |
| `dashboard/contacts/contact-card.tsx` | `ContactCard` | `dashboard/contacts/page.tsx` |

**O pior deles é o `raffle-extras.tsx`.** A página que ele derruba é
`/loja/[tenant]/[productSlug]` — a tela onde o comprador escolhe o número. É o produto.

## 2. Typecheck: 39 erros

`npx tsc --noEmit` → 39 erros. Por código:

| Código | Qtd | O que é |
|---|---|---|
| `TS2306` | 12 | "File is not a module" — os arquivos vazios acima |
| `TS2322` | 11 | tipo incompatível em atribuição — concentrado em `onValueChange` de `Select` do `@base-ui/react`, que entrega `string \| null` onde o código espera `string` |
| `TS2345` | 9 | argumento `string \| null` passado onde se espera `string` — mesmo padrão, em `products-filters.tsx` |
| `TS2719` | 3 | tipos idênticos de declarações separadas |
| `TS2769` | 2 | `.default({})` em objeto zod cujos campos não têm default — `src/lib/validations/product-settings.ts` |
| `TS2367` | 1 | **comparação impossível** em `src/lib/actions/banking.ts:26`: compara `"paid" \| "approved" \| "rejected"` com `"pending"`. Um ramo de código morto, sempre falso |
| `TS2304` | 1 | `LayoutProps` não existe — `src/app/layout.tsx:22` |

O `TS2367` merece nome: não é ruído de tipo, é **lógica que nunca executa**. Está no módulo
bancário.

## 3. Por que ninguém viu

O `package.json` **não tem script `typecheck` nem `test`**. `next build` nunca foi rodado nesta
máquina. O app foi escrito, versionado e entregue sem que uma única verificação automática
olhasse para ele. É exatamente a classe de problema que a disciplina de porta de verificação
existe para pegar — e que já encontramos em dois outros apps da casa (177 testes invisíveis no
`video-studio`, 45 no `creative-design`).

## 4. Correção de medição — e correção da minha correção

Este achado desmente **as duas** medições anteriores, em direções opostas. Registro inteiro
porque o número errado já viajou por três documentos.

| Afirmação | Quando | Veredicto |
|---|---|---|
| "3 páginas de dashboard são arquivos vazios" | medição original do README | **Certa.** `analytics/page.tsx`, `social/page.tsx` e `utm-links/page.tsx` têm 0 bytes |
| "só `social` é vazia; `analytics` tem 20 linhas" | minha correção, 2026-11-16 | **Errada.** Contei a pasta e vi `analytics-chart.tsx` com 20 linhas — mas o `page.tsx`, que é a rota, tem 0 bytes |
| "`reports` tem 149 linhas, não 22" | minha correção | **Certa, e irrelevante.** São 22 no `page.tsx` + 127 no `reports-form.tsx`. Os dois números descrevem coisas diferentes e nenhum dos dois era a pergunta |

**A lição real não é "contar a pasta" nem "contar o arquivo".** É que nenhuma contagem de linha
responde "isto funciona?". Trinta segundos de `tsc --noEmit` responderam o que três rodadas de
`wc -l` não responderam — e deram uma resposta pior do que qualquer uma das estimativas.
**Rodar a ferramenta vale mais que medir o artefato.**

## 5. O que isto muda no epic

1. **Nasce um trabalho antes de tudo** (candidato a `LTM-00`): o app tem que compilar. Sem
   isso, nenhum AC de `LTM-01` a `LTM-05` é verificável — não dá para testar reserva atômica
   num app que não builda.
2. **A causa raiz de "ninguém nunca comprou nada" é mais rasa do que o epic diz.** O epic
   atribui isso ao `TODO` no webhook. Verdade, mas o comprador não chega lá: a página de
   escolha de número não compila. São **dois** bloqueios em série, e o primeiro é mais barato.
3. **`utm-links` vazio reforça a `LTM-04`.** O epic registrava `utm_links` como "construtor de
   link que não resolve atribuição por pedido". É pior: a **tela inteira** não existe.
4. **O portão G1 ganha um pré-requisito óbvio:** `pnpm build` verde e `tsc --noEmit` limpo,
   com os dois scripts declarados no `package.json`.

## 6. Escopo do conserto, dimensionado

Não é tudo igual. Dois grupos:

| Grupo | Itens | Natureza |
|---|---|---|
| **Destravar o build** | `badge.tsx` (1 componente trivial de UI), `raffle-extras.tsx` (7 componentes da loja), `settings-tabs`, `users-filters`, `contact-card` | Implementação de verdade — o `raffle-extras` é o único grande |
| **Limpar o typecheck** | 11 `TS2322` + 9 `TS2345` do mesmo padrão `string \| null` do `Select`, 2 zod, 1 `LayoutProps`, 1 comparação morta | Mecânico, exceto a comparação morta em `banking.ts` que precisa de decisão: qual era a intenção |

As três páginas de 0 bytes (`analytics`, `social`, `utm-links`) são **provavelmente** Frente B
(paridade) e não `LTM-00` — mas isso **não foi verificado**. O build morre antes, nos imports
quebrados, e nunca chega a avaliar essas rotas. O Next exige um default export de `page.tsx` e
pode muito bem recusar um arquivo vazio. **Decidir isso é o segundo passo da `LTM-00`:** depois
que os cinco módulos importados existirem, rodar o build de novo e ver se as três rotas vazias
passam ou não. Se não passarem, entram no escopo de destravar o build, não no de paridade.

---

*Medido com `pnpm install --prefer-offline` (23,4 s), `npx tsc --noEmit` e `npx next build` em
2026-11-16. `pnpm` 12.15.0, Node do ambiente, TypeScript 5.9.3, Next 16.4.3.*

---

## 7. Adendo — o schema: zero índice de performance, zero migração versionada

Medido na mesma passada, porque a pergunta "isto aguenta produção?" não para no build.

### 33 tabelas, 10 restrições de unicidade, **nenhum índice de performance**

Todo índice declarado no schema é `uniqueIndex` — ou seja, **restrição de integridade**, não
decisão de desempenho. Não existe **um único** `index()` em `src/db/schema/`.

As dez restrições existentes, e só elas:

| Tabela | Restrição |
|---|---|
| `discount_links` | `(tenant_id, code)` |
| `users` | `(tenant_id, email)` · `(tenant_id, username)` · `(tenant_id, phone)` · `(tenant_id, affiliate_code)` |
| `blocked_numbers` | `(tenant_id, phone)` |
| `integrations` | `(tenant_id, provider)` |
| `payment_gateways` | `(tenant_id, provider)` |
| `products` | `(tenant_id, slug)` |
| `site_pages` | `(tenant_id, slug)` |

**Vinte e quatro tabelas não têm absolutamente nada.** Entre elas, as quatro do caminho do
dinheiro: `product_numbers`, `orders`, `banking_transactions` e `payment_webhook_events`.

Isso confirma a `LTM-01` e a amplia: o problema não é "falta o índice de `product_numbers`",
é que **nenhuma consulta deste sistema tem índice**, exceto onde um `uniqueIndex` criou um por
efeito colateral. Cada listagem de pedidos do painel é varredura de tabela.

### Zero migração versionada

```
drizzle.config.ts → out: "./drizzle"
pasta ./drizzle    → não existe
```

Nunca se rodou `drizzle-kit generate`. O único caminho exercitado é `db:push`, que **compara o
schema com o banco ao vivo e aplica a diferença, sem histórico**.

Três consequências, todas para a migração do Império:

1. **Não há como saber o que já foi aplicado** a um banco. Não existe `_journal.json`, não
   existe trilha.
2. **Não há como reverter.** O portão **G6** do epic exige plano de volta exercitado — sem
   migração versionada, o "plano de volta" do schema é restaurar backup.
3. **`push` em tabela com dado é operação sem revisão.** Hoje o banco está vazio e isso é
   indolor. No dia em que ele tiver 900 mil linhas de `product_numbers` e R$ 90 mil/dia
   atravessando, não é.

A nota de ondas do epic já previa colisão em `drizzle/meta/_journal.json` entre stories que
geram migração. **O arquivo não existe** — a primeira story a gerar migração vai criá-lo. A
nota continua válida a partir daí.

### O que isto acrescenta à LTM-01

A story hoje é "criar os índices de `product_numbers` e `orders`". O escopo honesto é maior:

- [ ] Estabelecer o **regime de migração versionada** (`drizzle-kit generate` + pasta `drizzle/`
      commitada) **antes** de qualquer índice — senão o índice também nasce sem histórico;
- [ ] Índices do caminho do dinheiro, com `EXPLAIN` como critério de aceite;
- [ ] Decidir, tabela a tabela, quais das 24 sem índice precisam de um — não é "todas", e
      índice a mais custa escrita no ponto de contenção que a `LTM-02` está consertando.
