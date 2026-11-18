# LTM-12: Painel de controle por sorteio

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade)
**Prioridade:** **P1**
**Complexidade:** M
**Criada por:** @aiox-master · 2026-11-17
**Evidência:** `docs/research/2026-11-17-painel-acoes-por-sorteio.md` §2

## Story

**Como** operador decidindo se empurra mais tráfego para uma rodada
**Eu quero** ver, numa tela só, como aquele sorteio está indo
**Para que** a decisão seja sobre o número e não sobre a impressão.

## Contexto

`/dashboard/products/{id}/dashboard` na Sorteamos, título **"Geral: Campanha"**. Onze cartões,
lidos em 2026-11-17:

```
Faturamento · Compras · Ticket Médio
Visitas Hoje · Visitas Ontem · Visitas Total
Expirados      (contagem + total R$)
Upsell         (contagem + total R$)
Descontos      (contagem + total R$)
Participantes  (total + hoje)
```

Mais o gráfico **"Desempenho da Campanha Por Dia"** (faturamento e quantidade).

**O lotemania não tem a página.** Mas tem a matéria-prima: `pageViews` já é alimentada pelo layout
da loja — `src/app/loja/[tenant]/layout.tsx:23` insere uma linha a cada visita, e o comentário ali
diz que isso existe para alimentar *"the admin dashboard's Visitas Hoje/Ontem/Total cards with real
traffic instead of static numbers"*.

### Correção de premissa — 2026-11-18, conferida no código

A versão 1.0 desta story afirmava que a tabela *"enche desde sempre e **nunca foi lida**"*. **As
duas metades estão erradas, e a segunda muda o escopo.**

**1. Ela É lida.** `src/app/dashboard/app/page.tsx:80-95` já consulta `pageViews` para Hoje, Ontem
e Total — no painel principal, **por tenant**. O comentário no código foi cumprido; o que falta é
outra coisa.

**2. Visita POR SORTEIO é impossível com o dado de hoje, e não é questão de consulta.** Duas razões,
conferidas:

| Fato | Onde | Consequência |
|---|---|---|
| `page_views` **não tem** `product_id` | `src/db/schema/core.ts:120-129` — as colunas são `id`, `tenant_id`, `path`, `created_at` | não há como agrupar por sorteio |
| `path` é **constante por tenant**: `/loja/{slug}` | `src/app/loja/[tenant]/layout.tsx:23` | ler o caminho não ajuda: ele é o mesmo para catálogo, sorteio, afiliados e suporte |

A inserção mora no **layout**, que embrulha *todas* as páginas da loja. Ou seja, o número que existe
hoje não é "visitas ao sorteio" nem mesmo "visitas ao catálogo" — é **visitas a qualquer página da
loja**, com o caminho real descartado na escrita.

**O que isso impõe a esta story:**

- Os três cartões de Visitas **por sorteio** exigem mudança de schema (coluna `product_id`, ou um
  `path` que de fato registre o caminho) **e** inserção a partir da página do sorteio. Isso faz esta
  story **gerar migração** — o que muda a formação de onda dela, ver abaixo.
- **O histórico não é recuperável.** Nenhuma visita anterior à mudança sabe de qual sorteio foi. Os
  cartões mostrarão zero para todo o período anterior, e **zero aqui é número mentiroso** — é
  exatamente o caso do AC6. Ver AC2 reescrito.

## Tarefas (Checklist)

- [ ] Rota `/dashboard/products/{id}/dashboard`.
- [ ] Os onze cartões, com os mesmos rótulos.
- [ ] Gráfico de desempenho por dia (faturamento e quantidade).
- [ ] Consulta de visitas a partir de `pageViews`, por sorteio.
- [ ] `Upsell` e `Descontos`: **`[CONFIRMAR]`** o que a Sorteamos conta aí. Há `discount_links` no
      schema; upsell não tem correspondente óbvio.

## Critérios de Aceite

- [ ] **AC1 (os números batem):** Faturamento, Compras e Ticket Médio conferem com consulta direta
      ao banco para o mesmo sorteio. Ticket Médio é faturamento ÷ compras **pagas**, e o teste
      prova a definição, não só o valor.
- [ ] **AC2 (visitas por sorteio são de verdade, ou não são mostradas):** Hoje, Ontem e Total saem
      de `page_views` **com o sorteio identificado na linha** — não do total do tenant, que é o que
      existe hoje e contaria visita de afiliados, suporte e catálogo como visita do sorteio. Depois
      da mudança, uma visita à página do sorteio A **não** aparece no contador do sorteio B. Teste
      com dois sorteios.
- [ ] **AC2b (o período anterior à mudança não vira zero):** nenhuma visita registrada antes da
      coluna existir sabe de qual sorteio foi. A tela **não** exibe zero para esse período — ou
      informa que a contagem começa na data da mudança, ou omite. Zero silencioso aqui faz o
      operador ler "ninguém visitou", que é falso, e é o AC6 aplicado ao caso mais fácil de errar.
- [ ] **AC3 (Expirados conta e soma):** mostra quantidade **e** total em reais, como na Sorteamos.
- [ ] **AC4 (gráfico com dia sem venda):** um dia sem venda aparece como **zero**, não some do
      eixo. Buraco silencioso em série temporal é o jeito mais fácil de ler tendência errada.
- [ ] **AC5 (sorteio sem nada não quebra):** sorteio recém-criado mostra zeros, não erro nem tela
      vazia.
- [ ] **AC6 (nenhuma métrica inventada):** cartão cuja origem não existe no lotemania **não é
      exibido com zero** — fica fora até a `[CONFIRMAR]` ser respondida. Zero mentiroso é pior que
      ausência.

## Escopo

**IN:** a rota, os cartões cuja origem existe, o gráfico, as visitas reais.
**OUT:** Upsell e Descontos enquanto `[CONFIRMAR]`; comparação entre sorteios; exportar o painel.

## Dependências

- **Depende da `LTM-04`** para o que for atribuição.
- **Independe da fundação** no resto — é leitura, **com uma exceção**: a coluna de sorteio em
  `page_views` é escrita, gera migração e muda a onda (ver abaixo).

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/dashboard/products/[id]/dashboard/page.tsx        (novo — a rota)
  apps/lotemania/src/app/dashboard/products/[id]/dashboard/performance-chart.tsx (novo — o grafico)
  apps/lotemania/src/app/dashboard/products/[id]/product-edit-tabs-bar.tsx (link para a nova aba)
  apps/lotemania/src/db/schema/core.ts                                     (page_views ganha o sorteio)
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx              (registrar a visita COM o sorteio)
  apps/lotemania/drizzle/**                                                (migracao gerada)
  apps/lotemania/tests/dashboard/product-dashboard/**                      (novo)

Resources:
  banco de teste     — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  pnpm db:generate   — escreve drizzle/meta/_journal.json. Serializar com QUALQUER story que gere migracao.

Depends-on: LTM-04 (atribuicao)
```

- ⛔ **Não pode compartilhar onda com `LTM-03b`, `LTM-07` ou `LTM-16`** — todas geram migração, e
  `drizzle/meta/_journal.json` é recurso único. Isto **mudou** com a correção de premissa acima: na
  v1.0 esta story era "só leitura" e não disputava nada.
- ⛔ **Não pode compartilhar onda com a `LTM-14`:** a `LTM-14` é dona de `[productSlug]/page.tsx`?
  **Não** — ela é dona de `pedido/[orderId]/`. Mas a `LTM-15` toca `[tenant]/page.tsx` e esta toca
  `[tenant]/[productSlug]/page.tsx`: **são arquivos diferentes**, conjuntos disjuntos. ✅ pode
  compartilhar onda com a `LTM-15`, desde que só uma das duas gere migração — e a `LTM-15` não gera.
- ✅ **Pode compartilhar onda com a `LTM-10`** — conjuntos disjuntos, e a `LTM-10` não gera migração.
- 💡 **Alternativa para o @po:** cortar a coluna de `page_views` para uma story própria (ou para a
  `LTM-16`, que já é a dona de "migração da Frente B") devolve esta story ao estado de leitura pura
  e a libera para qualquer onda. Vale considerar: os onze cartões não dependem da coluna; **três**
  deles dependem.

## Riscos

- **[Médio] Ticket Médio com definição diferente da Sorteamos.** Se eles dividem por **todas** as
  compras e nós por pagas, o número diverge e parece erro de dado. AC1 fixa a definição.
- **[Médio] `pageViews` cresce sem limite.** Uma linha por visita, e o Império faz ~272
  visitas/dia **por sorteio**. Precisa de índice e de política de retenção — e **a `LTM-01` não
  cobre esta tabela**.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-18 | 1.1 | Acrescenta o bloco `Files:` e **corrige duas premissas**: `page_views` JA e lida (`dashboard/app/page.tsx:80-95`), e visita por sorteio e **impossivel** com o dado de hoje -- a tabela nao tem `product_id` e `path` e constante por tenant. A story passa a gerar migracao, o que muda a onda dela, e o historico anterior nao e recuperavel (novo AC2b). | @aiox-master |
| 2026-11-17 | 1.0 | Nasce da observação do painel com o founder. | @aiox-master |
