# EPIC-LTM: Migração do Império Prêmios para o lotemania

## Visão Geral

Levar o **Império Prêmios** da **Sorteamos** (hoje em `painel.rapidinhas24hr.com`) para o **lotemania** (`apps/lotemania`, importado em 2026-11-16 pelo commit `2ac7d133`) sem perder um pedido, um real ou um dado de atribuição.

O lotemania é a sucessora da Sorteamos: mesma operação, plataforma própria, multi-tenant white-label. A troca só acontece quando o lotemania aguentar o que a Sorteamos já aguenta — e isso é medível, não opinável.

## Status: 🟢 ONDA 1 LIBERADA — `LTM-00` **Done**; `LTM-01`, `LTM-03a` e `LTM-05` em **`Ready`**; `LTM-02`, `LTM-04` e `LTM-07` em `Draft` com correções escritas (2ª revalidação do @po, 2026-11-17)

> **A onda 1 está fechada de novo, e isso é o processo funcionando.** O `ADR-0001` mudou a unidade
> vendável depois de quatro stories terem sido validadas. `LTM-01`, `LTM-02`, `LTM-04`, `LTM-05` e
> `LTM-07` têm escopo furado pela decisão e voltaram para `Draft`; `LTM-03a` passou e é a única em
> `Ready`. Detalhe em *Revalidação do @po (2026-11-17)*, mais abaixo.

> ## ⚠️ O objetivo mudou em 2026-11-16
>
> Decisão do founder: a meta **deixou de ser "paridade com a Sorteamos"** e passou a ser
> **colocar o lotemania operacional o mais rápido possível para um primeiro sorteio de teste do
> Império, já com a meia cota**.
>
> | | Antes | Agora |
> |---|---|---|
> | Meta | substituir a Sorteamos sem perder nada | **primeiro sorteio de teste rodando** |
> | Frente B (paridade) | bloqueante do corte | **desce de prioridade** — volta a ser bloqueante só na migração de verdade |
> | Frente C (meia cota) | "não vire story agora" | **entra junto com a fundação** — o cliente pediu, e ela define o formato de `reserve.ts` |
> | Gateways | 19 da Sorteamos | **só `paysure`** |
>
> O cliente **ainda não repassou `ci`/`cs` reais** e **nenhuma venda real aconteceu**. Isso é
> libertador: dá para mudar o modelo de dados sem migração de histórico.

**Epic ID:** LTM
**Owner:** @pm (Morgan) · implementação @dev · schema @data-engineer
**Priority:** **Critical** — é o caminho do dinheiro de um cliente em produção
**Criado:** 2026-11-16
**App:** `apps/lotemania` · **Origem a substituir:** Sorteamos (`api.rapidinhas24hr.com`)

---

## Estado real, medido

Fonte: `apps/lotemania/README.md` (levantamento de 2026-11-16) e leitura direta do código.

### O que o lotemania é hoje

| | |
|---|---|
| Arquivos / linhas | 187 · 14.462 |
| **Compila?** | ✅ **sim, desde 2026-11-16** (`LTM-00`). Antes **não compilava**: dez arquivos-fonte de 0 bytes, cinco importados por código existente |
| `lint` · `typecheck` · `build` | ✅ **0 · 0 · 0** — 43 rotas, 32 páginas estáticas |
| Páginas de dashboard | 27 — **três** `page.tsx` estavam com 0 bytes (`analytics`, `social`, `utm-links`) e hoje têm placeholder honesto |
| Gateway de produção | **`paysure` não existe em NENHUMA das duas listas** — e o modelo de credencial guarda **um** campo onde a paysure exige dois (`ci` + `cs`) |
| Transações no banco | **zero** `db.transaction()` em 14.462 linhas |
| Índices de performance | **zero em 33 tabelas** — todo índice declarado é `uniqueIndex`, isto é, restrição de integridade |
| Migrações versionadas | **zero** — a pasta `drizzle/` não existe; só `db:push` contra banco ao vivo |
| Pedidos pagos de verdade | **zero** — o webhook de pagamento é um `TODO` |
| Atribuição por pedido | **nenhuma** — sem `utm_*`, `fbc`, `fbp`, `gclid`, `ttclid` |
| API de leitura para o ETL | **não existe** (só `auth/*` e o webhook) |
| Sessão do painel | ✅ renova desde 2026-11-16; antes morria 15 min depois do login (`LTM-06` fecha as bordas) |
| Testes | **zero** |

É um **andaime** — mas um andaime que agora compila e cuja loja pública funciona em produção.

> **Duas correções de medição, nesta ordem, e a lição que elas deixam (2026-11-16).**
>
> | Afirmação | Veredicto |
> |---|---|
> | "3 páginas de dashboard são arquivos vazios" *(medição original)* | **certa** |
> | "só `social` é vazia; `analytics` tem 20 linhas" *(minha correção)* | **errada** — contei a pasta e vi o `analytics-chart.tsx`, mas o `page.tsx`, que é a rota, tinha 0 bytes |
>
> **A lição não é qual unidade contar.** É que nenhuma contagem de linha responde *"isto
> funciona?"*. Trinta segundos de `tsc --noEmit` responderam o que três rodadas de `wc -l` não
> responderam — e deram uma resposta pior que qualquer estimativa: **o app não compilava**.
> Detalhe em `docs/research/2026-11-16-lotemania-build-health.md`.

### O que a migração tem que aguentar

Medido no BI do Império, **janela móvel de 7 dias, snapshot de 2026-11-16**. O @po reconferiu contra `apps/BI/imperio-premios/data-produto.json`: os números estruturais batem exatamente (100 números em 100% das rodadas, mediana 1,748 h, mínimo 0,3 h). Os agregados andam a cada refresh — com o de 2026-11-16 a janela já dava 193 rodadas e ≈ R$ 701 mil. **Deriva é esperada; não leia como erro de medição.**

| | |
|---|---|
| Rodadas | **177** · 174 esgotadas · **100 números cada** |
| Esgotamento típico | **1,8 h** · o mais rápido em **18 min** (~5,5 números/minuto) |
| Pedidos pagos | **10.550** · R$ 639.325 · ticket médio R$ 61 |
| Rodadas ativas simultâneas | **5** |
| Fluxo diário | **≈ R$ 90 mil/dia** |

O gargalo **não é volume de dados** (~900 mil linhas/ano em `product_numbers` é trivial para Postgres *com índice*). O gargalo é **contenção**: cem números finitos esgotando em minutos, cinco rodadas ao mesmo tempo.

---

## O problema, em uma frase

Hoje o lotemania **não consegue vender**, e se conseguisse venderia errado: sem índice ele varre a tabela a cada reserva, sem transação ele deixa pedido órfão quando duas pessoas disputam o mesmo número, sem fechamento de pedido o PIX pago não vira título, e sem atribuição por pedido a migração cega o CAPI do Meta e o BI inteiro no dia do corte.

---

## Frentes

| Frente | Objetivo | Stories | Status |
|---|---|---|---|
| **0 — Compilar** | O app tem que buildar para qualquer AC ser verificável | `LTM-00` | ✅ **Done** (2026-11-16) |
| **A — Fundação** | O caminho do dinheiro: índice, atomicidade, fechamento de pedido, atribuição, testes | `LTM-01`, `02`, `03a`, `03b`, `04`, `05`, `06` | `03a` em **`Ready`**; `01`/`02`/`04`/`05` de volta em **`Draft`** (revalidação 2026-11-17); `03b` e `06` em `Draft` |
| **C — Meia cota** | O que o cliente pediu e a Sorteamos não faz | `LTM-07`, `LTM-08` | ✅ **Modelada** (2026-11-17) — 17 decisões no `/grill-with-docs`, `ADR-0001` escrito. Validadas pelo @po: `07` NO-GO (6,5), `08` GO condicional (7). Ambas em `Draft` |
| **D — Medição da frente nova** | Dashboard à parte para a frente nova, sem interferência no que roda hoje | `LTM-09` | 🆕 **Nasce em 2026-11-17** por decisão do founder — `Draft` |
| **B — Paridade** | A superfície do operador e do comprador | `LTM-10` a `LTM-15` | 🟡 **Reativada** (2026-11-17) — o founder pediu paridade visual **100%** e as ações do painel. Quatro stories nascidas da observação; B1/B2 ainda pendem dele |

### Frente A — Fundação (escopo deste epic)

| Story | Problema que fecha | Prioridade | Status |
|---|---|---|---|
| **LTM-00** | **F0** — o app não compilava; dez arquivos-fonte de 0 bytes | P0 | ✅ **Done** |
| **LTM-01** | **F1** — **zero índice de performance em 33 tabelas** e **zero migração versionada**; o comentário do schema mente | P0 | `Draft` (NO-GO 5/10 em 17/11) |
| **LTM-02** | **F2** — driver `neon-http` não faz transação; reserva desfaz "na mão" | P0 | `Draft` (NO-GO 6/10 em 17/11) |
| **LTM-03a** | **F3a** — webhook para num `TODO`; sem idempotência; `paysure` irrepresentável nas duas listas e na credencial | P0 | **`Ready`** (GO 8,5/10) |
| **LTM-03b** | **F3b** — o adaptador da Paysure: criar cobrança e entender o aviso | P0 | `Draft` |
| **LTM-04** | **F4** — atribuição por pedido não existe; sem API de leitura para o ETL | P0 | `Draft` (NO-GO 6/10 em 17/11) |
| **LTM-05** | **F5** — zero testes no caminho do dinheiro | P0 | `Draft` (NO-GO 5/10 em 17/11) |
| **LTM-06** | **F6** — duas decisões de segurança de sessão deixadas em aberto de propósito | P1 | `Draft` |
| **LTM-10** | **B1** — lista de compras: 5 abas, busca e as 5 ações por linha | P1 | `Draft` |
| **LTM-11** | **B2** — o menu de 13 ações do sorteio | P1 | `Draft` |
| **LTM-12** | **B3** — painel de controle por sorteio (11 cartões + gráfico) | P1 | `Draft` |
| **LTM-13** | **B4** — os três exports (2 CSV + 1 PDF), contrato de 25 colunas | P1 | `Draft` |
| **LTM-14** | **B5** — o fluxo de compra do comprador: reserva, PIX e espera | **P0** | `Draft` (faltava nesta tabela — @po, 2026-11-17) |
| **LTM-15** | **B6** — as duas seções que faltam no catálogo | P2 | `Draft` (faltava nesta tabela — @po, 2026-11-17) |
| **LTM-07** | **C1** — a meia cota: schema, reserva e rateio | P0 | `Draft` (NO-GO 6,5/10) |
| **LTM-08** | **C2** — a meia cota: grade, unidade, anúncio, relatório | P0 | `Draft` (GO condicional 7/10) |
| **LTM-09** | **D1** — BI próprio da frente nova, sem interferência no que roda hoje | P1 | `Draft` (nova) |

> **A `LTM-01` cresceu depois de medida.** O problema não é "falta o índice de `product_numbers`":
> **nenhuma consulta deste sistema tem índice**, exceto onde um `uniqueIndex` criou um por efeito
> colateral. São 33 tabelas, 10 restrições de unicidade, **zero** `index()`. E a pasta `drizzle/`
> **não existe** — `drizzle-kit generate` nunca rodou, só `db:push` contra banco ao vivo, sem
> histórico. Isso **impede cumprir o portão G6** (plano de volta exercitado) como está: sem
> migração versionada, o "plano de volta" do schema é restaurar backup. O regime de migração tem
> que ser estabelecido **antes** do primeiro índice, senão o índice também nasce sem histórico.

### Frente B — Paridade (fora deste epic)

O escopo da paridade **não é inventado aqui**. Ele vem da baseline da Sorteamos em `docs/research/2026-11-16-baseline-sorteamos/`, agora com observação ao vivo do painel (documento `06`). Três achados **mudam o enquadramento da frente inteira** e precisam de decisão do dono do negócio antes de virar story:

#### B1 — "Paridade visual idêntica" é uma decisão de template, não de implementação

A identidade visual da Sorteamos **é o Minimal UI**, um template React admin comercial, com uma paleta verde por cima. Provado pelos ícones `ic_*.svg`, pela fonte Public Sans e pela rota de demonstração `/user/reece-chung/edit` deixada no bundle.

Reconstruir isso à mão é refazer um template que se compra. **Decisão:** adotar o mesmo template no lotemania (paridade visual sai quase de graça), ou assumir identidade própria e tratar "idêntico" como "equivalente em função". Não é escolha de engenharia.

#### B2 — Analytics não é uma feature a replicar; é andaime morto

A tela `/dashboard/analytics` da Sorteamos exibe **dados fictícios do template, intocados**: "Bug Reports 234", séries "Team A / B / C", eixo de Jan '03 a Oct '03, pizza por continente. **Nenhum número ali vem do Império.**

Clonar isso seria clonar andaime. A tela `analytics` do lotemania, com suas 20 linhas, já é mais honesta que a original. Isto **elimina** a story de paridade de Analytics e a substitui por uma pergunta de produto: construir analytics de verdade (o BI do Império já existe e faz isso), ou remover o item da barra lateral.

#### B3 — O escopo de integrações encolheu por decisão do founder

A Sorteamos expõe 104 endpoints, incluindo 19 gateways e integrações de WhatsApp, SMS e push. **Decisão do founder em 2026-11-16: só a `paysure` importa agora.** z-api, wizebot, onesignal, paposms, liguelead, dxmidia e nexopro **saem da paridade**. O que sobra de gateway vira item da `LTM-03a` (representar a credencial) e da `LTM-03b` (falar com ela), não uma frente.

#### O que de fato sobra para a Frente B

| Item | Origem | Tamanho |
|---|---|---|
| `social` — única tela vazia de verdade | levantamento do app | pequeno |
| Os 3 relatórios do menu por sorteio (Vendas, Expirados, Participantes) | exports reais do cliente, já em `docs/research/.../05` | médio — é contrato de coluna, não tela |
| Os 3 tipos do `/reports` (`sales_by_day`, `top10_buyers`, `top10_regions`) | observação ao vivo | médio |
| `/settings/payment-errors` e `/settings/security-blocks` | só existem na Sorteamos | a dimensionar |
| As 14 abas do editor de sorteio | **ainda não observadas** | desconhecido — é o maior buraco restante |
| Armazenamento de mídia (S3) | hoje `products.imageUrl` é só string | médio |

**Bloqueio restante:** as 14 abas do editor e o modal de Faturamento continuam não observados. A passada de observação parou porque **a sessão do painel expirou** — precisa do founder logado para continuar.

### Frente C — A meia cota: **promovida**, e agora vem antes da reescrita

O Império quer **dividir a cota em dois**: cada número pode ser comprado inteiro ou em duas metades, por duas pessoas. Quem compra inteiro leva tudo; duas metades dividem o prêmio. Permite prêmios maiores (100k, 200k) sobre os mesmos 100 números — é a razão de negócio da feature.

**O que mudou em 2026-11-16.** O founder decidiu que a meia cota entra **no primeiro sorteio de teste**, e escolheu *modelar antes de reescrever*. A ordem se inverteu — e por um motivo que não é preferência:

> As três razões que antes a bloqueavam continuam todas verdadeiras. A diferença é que elas
> deixaram de ser argumento para **adiar** e passaram a ser argumento para **antecipar**:
>
> 1. **Mexe na premissa de um dono por linha.** Hoje `product_numbers` tem uma linha por número e a reserva é um `UPDATE ... WHERE status = 'available'` — atômico *porque* cabe exatamente um dono. **A `LTM-02` vai reescrever exatamente esse código.** Reescrever para um dono e depois reescrever de novo para dois é fazer o trabalho duas vezes no ponto mais delicado do sistema.
>    ⚠️ **Corrigido em 2026-11-17 (@po).** A redação anterior dizia *"a linha ganha três estados de
>    ocupação (vazio / meio / cheio) e o `UPDATE` condicional deixa de bastar"*. Essa é a
>    **alternativa que o `ADR-0001` rejeitou**, e exatamente pelo motivo descrito ali. Na forma
>    decidida — **a metade é uma linha** — continua cabendo um dono por linha e o `UPDATE`
>    condicional **continua bastando**; o que muda obrigatoriamente é o **predicado** (`WHERE` por
>    unidade vendável, não por número). O epic estava descrevendo o modelo descartado como se fosse
>    o escolhido.
> 2. **Dobra a contenção**, no mesmo lugar que a `LTM-01` e a `LTM-02` estão consertando. Então o conserto precisa ser dimensionado para a carga final, não para a atual.
> 3. **Muda o rateio de prêmio**, que é dinheiro do ganhador. A suíte da `LTM-05` tem que nascer já cobrindo o rateio — testes escritos para cota inteira não provam nada sobre metades.
>
> E há um fato que torna isso barato agora e caro depois: **nenhuma venda real aconteceu ainda** e
> o cliente **não repassou credencial**. Não há histórico para migrar. A janela para mexer no
> modelo de dados é esta.

### ✅ Modelada em 2026-11-17

O `/grill-with-docs` rodou: **17 decisões em quatro rodadas, fronteira fechada**. A decisão difícil de reverter virou **[`ADR-0001`](../../../architecture/adr/0001-meia-cota-como-linha.md)** e o vocabulário virou o **`GLOSSARY.md`** da raiz, que não existia antes.

**A decisão central:** a metade é uma **linha**, não uma coluna. `product_numbers` passa a ter uma linha por unidade vendável; num sorteio divisível a unidade é a metade, e comprar inteiro é reservar as duas linhas na mesma instrução. Isso preserva **intacta** a propriedade que torna a reserva correta hoje — um dono por linha — em vez de substituí-la por travamento explícito justo quando a contenção dobra.

| | |
|---|---|
| Prêmio | só em sorteio de **dinheiro**; o sistema recusa os outros |
| Preço | metade custa **metade exata**, sem ágio |
| Escopo | **por sorteio**, nunca por título |
| Fusão | duas metades do mesmo dono **não se fundem** |
| Metade órfã | quem tem a metade vendida leva o **prêmio inteiro** |
| Congelamento | divisibilidade vira somente-leitura **na primeira venda** |
| Ganhador | **uma linha de `winners` por pessoa**, valor já rateado |
| Unidade | **uma por sorteio, sempre nomeada** na interface |
| Grade | **célula partida** — um botão por título, dividido ao meio |
| Relatório | metade **sempre marcada**, nunca número nu |
| Anúncio | os **dois** valores lado a lado; nunca o grande sozinho numa tela de metade |

**Dois fatos levantados na sessão que mataram perguntas antes de serem feitas:** nada no código escreve em `winners` — o sorteio é externo e o operador registra depois —, e jogos bônus são comprados à parte, com combos próprios, então metades não os tocam.

### ⚠️ Quatro stories em `Ready` foram escritas antes desta decisão

`LTM-01`, `LTM-02`, `LTM-05` e `LTM-03a` têm escopo anterior ao `ADR-0001` e **precisam de revalidação do @po**:

| Story | O que muda |
|---|---|
| `LTM-01` | o índice é sobre `(product_id, number, half)`, não `(product_id, number)` |
| `LTM-02` | a reserva que ela torna transacional é a de metades |
| `LTM-05` | **a suíte escrita para cota inteira provaria invariantes que deixam de valer** |
| `LTM-03a` | o fechamento marca metades como vendidas, e `quantity` tem unidade |

E o portão **G4** (carga) precisa ser refeito na forma divisível: 5 rodadas de **200 metades**, não de 100 títulos.

**Impacto nas stories existentes:** `LTM-01` (índice sobre a nova forma), `LTM-02` (a reserva atômica **é** a feature), `LTM-05` (invariantes de posse e rateio) e `LTM-03a` (o fechamento de pedido marca posse). A modelagem precisa sair **antes** de a onda 2 começar.

---

## Sequenciamento e dependências

```
LTM-00 (compilar) ✅ ──► tudo o mais

/grill-with-docs (meia cota)  ◄── PORTA: define a forma de product_numbers
        │
        ├──────────────────────────────┐
        ▼                              ▼
LTM-05 (testes) ──┬─► LTM-02 (reserva) ──┬─► LTM-03a (fecha pedido) ──► LTM-03b (Paysure)
LTM-01 (schema) ──┘                      └─► LTM-04 (atribuição + API)

LTM-06 (sessão) ── independente, qualquer onda depois da LTM-05
Frente B (paridade) ── despriorizada
```

**Ordem recomendada:** ~~`/grill-with-docs`~~ ✅ → `LTM-01` + `LTM-05` (na forma do `ADR-0001`) → `LTM-02` **sozinha** → `LTM-03a` + `LTM-04` + `LTM-07` → `LTM-03b` + `LTM-08`.

> ⚠️ **Contradição interna resolvida em 2026-11-17 (@po).** Esta linha dizia `LTM-02` **+**
> `LTM-07` na mesma onda, enquanto a *Nota para formação de ondas* dizia **"Onda 2: `LTM-02`
> sozinha"**. As duas não podiam ser verdade, e a primeira violava
> `.claude/rules/parallel-waves.md`: as duas stories tocavam `src/lib/actions/reserve.ts` — a mesma
> função. Com o recorte de 2026-11-17 (a `LTM-02` é a **única** a reescrever
> `reserveSelectedNumbers`; a `LTM-07` não toca o arquivo), a `LTM-07` sai da onda 2 e passa para a
> onda 3, onde seu conjunto de arquivos (`products.ts`, `validations/product.ts`, blocos próprios de
> `raffles.ts`) é disjunto do da `LTM-03a` e do da `LTM-04` — **com a geração de migração
> serializada**, que já era regra.

> **Por que o grilling virou porta de entrada e não etapa final.** A `LTM-01` define a forma de
> `product_numbers` e a `LTM-02` reescreve a reserva. Se a meia cota entra depois, esses dois
> arquivos são reescritos **duas vezes** no ponto mais delicado do sistema — e a suíte da `LTM-05`
> nasce provando invariantes que deixarão de valer. Com zero venda real e zero histórico, mudar o
> modelo agora custa uma conversa; depois custa migração de dados com dinheiro em trânsito.

### Por que esta ordem

| Aresta | Razão |
|---|---|
| `LTM-05` antes de `LTM-02` | O teste de concorrência da reserva é **o critério de aceite** da LTM-02: ele tem que falhar antes e passar depois. Sem a suíte, "ficou atômico" é afirmação sem prova. |
| `LTM-02` antes de `LTM-03a` | Fechar pedido sem transação recria o problema que a LTM-02 resolve — marcar `orders.paid` + `product_numbers.sold` + `banking_transactions` em três `UPDATE` soltos é a mesma classe de bug, agora com dinheiro já capturado. |
| `LTM-01` independente | Só toca schema e migração. Pode rodar em paralelo com a LTM-05. |
| `LTM-03a` e `LTM-04` em paralelo | Arquivos-fonte disjuntos (ver nota de ondas abaixo). |
| `LTM-03b` depois da `LTM-03a` | O adaptador se encaixa no arcabouço que a `03a` cria; antes dele não há onde plugar. |

### Nota para formação de ondas (`.claude/rules/parallel-waves.md`)

- **Onda 1:** `LTM-05` (`tests/`, `package.json`, config de teste) + `LTM-01` (`src/db/schema/raffles.ts`, migração). Arquivos disjuntos.
- **Onda 2:** `LTM-02` sozinha (`src/db/index.ts`, `src/lib/actions/reserve.ts`, `src/lib/actions/checkout.ts`, `package.json`).
- **Onda 3:** `LTM-03a` + `LTM-04` + `LTM-07` (a `LTM-07` entra aqui desde o recorte de 2026-11-17 — ela deixou de tocar `reserve.ts`, que era a colisão com a onda 2). ⚠️ **Os conjuntos de arquivo completos vivem nas próprias stories** — foi exatamente a omissão deles que derrubou a `LTM-03` na validação do @po, que achou um terceiro consumidor (`src/lib/validations/payment-gateway.ts`) fora do conjunto declarado.
- **Onda 4:** `LTM-03b` sozinha. `LTM-06` é independente e cabe em qualquer onda a partir da 2.
- ⚠️ **Recurso mutável compartilhado:** o journal do Drizzle (`drizzle/meta/_journal.json`) é tocado por qualquer story que gere migração. Duas `drizzle-kit generate` concorrentes colidem. **Serializar o passo de geração de migração** mesmo quando as stories rodam em paralelo.

---

## Validação do @po (2026-11-16)

| Story | Pontuação | Veredicto | Status |
|---|---|---|---|
| LTM-01 (índices) | 9/10 | **GO** | `Ready` |
| LTM-02 (transação) | 9/10 | **GO** | `Ready` |
| LTM-03 (webhook) | 6,5/10 | **NO-GO** | ✅ **resolvido** — repartida em `LTM-03a` + `LTM-03b` em 2026-11-16 |
| LTM-04 (atribuição) | 9/10 | **GO** | `Ready` |
| LTM-05 (testes) | 9/10 | **GO** | `Ready` |

**A onda 1 está liberada.** `LTM-05` e `LTM-01` passaram com rigor extra justamente porque travam a cadeia; a onda 2 (`LTM-02`) também está `Ready`. O NO-GO da `LTM-03` está na **onda 3** e não atrasa nada antes dela — mas precisa de decisão **antes** do despacho da onda 3, e uma das saídas é externa (ver abaixo).

> ⚠️ **Superado em 2026-11-17.** A liberação da onda 1 acima valia contra o modelo de dados de
> 2026-11-16. O `ADR-0001` trocou a unidade vendável, e a revalidação de 2026-11-17 reverteu
> `LTM-01`, `LTM-02`, `LTM-04` e `LTM-05` para `Draft`. Ver a seção seguinte.

## Revalidação do @po (2026-11-17) — contra o `ADR-0001`

| Story | Pontuação | Veredicto | Status aplicado |
|---|---|---|---|
| LTM-01 (índices) | **5/10** | **NO-GO** | `Ready` → **`Draft`** |
| LTM-02 (transação) | **6/10** | **NO-GO** | `Ready` → **`Draft`** |
| LTM-03a (fecha pedido) | **8,5/10** | **GO** | `Draft` → **`Ready`** |
| LTM-04 (atribuição + API) | **6/10** | **NO-GO** | `Ready` → **`Draft`** |
| LTM-05 (testes) | **5/10** | **NO-GO** | `Ready` → **`Draft`** |
| LTM-07 (meia cota — domínio) | **6,5/10** | **NO-GO** | permanece `Draft` |
| LTM-08 (meia cota — superfície) | **7/10** | **GO condicional** | permanece `Draft` (falta o bloco `Files:`) |
| LTM-09 (BI da frente nova) | — | **nova** | nasce `Draft` |

**O defeito mais grave não era o esperado.** A suspeita registrada aqui era "a suíte da `LTM-05`
provaria invariantes que deixam de valer". Verdade, e é o menor dos dois problemas. O maior é que o
**verificador de invariantes** — descrito na própria `LTM-05` como a peça que todas as outras
herdam — nasceria chavado no **número** em vez de na **unidade vendável**, e um verificador chavado
no número **acusa violação quando o sistema está certo**: em sorteio divisível, o mesmo número
associado a dois pedidos é o estado correto. Um invariante determinísticamente vermelho com o
sistema certo é pior que intermitente, e é o verificador que o portão **G4** usa como prova.

**Uma suspeita desta tabela estava mal endereçada.** "O fechamento marca metades como vendidas, e
`quantity` passa a ter unidade" apontava para a `LTM-03a`. A primeira metade já funciona sem
mudança (o fechamento marca por `order_id`, isto é, por linha); a segunda **não pousa na `03a`**,
que nunca lê `quantity`. Pousa na `LTM-07` e, principalmente, na **`LTM-04`** — que esta tabela
**não listava** e que é onde `quantity` e `numbers` chegam ao ETL e ao BI.

### Três incoerências do epic, encontradas na revalidação

1. **A onda 2 é contraditória dentro deste documento.** *Ordem recomendada* diz
   `LTM-02` **+** `LTM-07`; a *Nota para formação de ondas* diz **"Onda 2: `LTM-02` sozinha"**. As
   duas stories tocam `src/lib/actions/reserve.ts` — a **mesma função**, `reserveSelectedNumbers` —
   e a `LTM-07` não declara conjunto de arquivos nenhum. Conjuntos não disjuntos não formam onda
   (`.claude/rules/parallel-waves.md`).
2. **A coluna `half` é reivindicada por duas stories.** `LTM-01` (chave de unicidade) e `LTM-07`
   (tarefa de schema) criam a mesma coluna no mesmo arquivo com a mesma migração. Precisa da mesma
   resolução que a aresta `LTM-03a` ↔ `LTM-04` recebeu: atribuição explícita, escrita numa das
   duas.
3. **A `LTM-04` faltava na lista de afetadas** pela meia cota, e é onde o custo aceito pelo ADR
   (*"`quantity` ... campo que o BI, o ETL e o CAPI já consomem"*) de fato aterrissa.

### Uma incoerência no `ADR-0001` — ✅ **fechada em 2026-11-17**

Era: em *Custos aceitos*, *"`quantity` do pedido **passa a contar metades**"*; na frase seguinte,
*"**nunca reinterpretação silenciosa de `quantity`**"*. As duas não podiam valer juntas, e a
consequência é medível — `bi_aggregator.py:1099` faz `numeros_vendidos = ("Quantidade", "sum")`.

**O `ADR-0001` foi corrigido e decidiu:** `quantity` conta **o que o pedido contém** (metades, em
sorteio divisível), **e** o pedido carrega **campo explícito de unidade**, que quem agrega tem de
ler. O lado do BI é escopo do `ADR-0002`; o pipeline atual continua lendo a Sorteamos, intocado.

⚠️ **Mas a decisão não chegou nas stories.** Na 2ª revalidação (2026-11-17) a `LTM-07` ainda trazia
na lista de tarefas a forma **oposta** (*"não reinterpretar `quantity`"*), e a `LTM-04` — onde o
custo de fato aterrissa — não tem nenhum AC sobre isso. Correção registrada nas duas stories.

### Caminho mais curto de volta à onda 1

1. Decidir **quem cria a coluna `half`** (recomendação: `LTM-01`) e **quem reescreve
   `reserveSelectedNumbers`** (recomendação: `LTM-02`, uma vez só, já na forma de metades).
2. `LTM-01`: chave em `(product_id, number, half)` com `half` **`NOT NULL`** — em índice único o
   Postgres trata `NULL` como distinto, e com `half` nulável a restrição deixa de proteger em
   silêncio.
3. `LTM-05`: reescrever AC4 e AC5 na **unidade vendável** (a linha), não no número — e pôr no OUT
   que esta story **não** escreve teste de meia cota (eles nascem na `LTM-07`, depois de a coluna
   existir; antes disso não compilam, e "fazer compilar" é a porta pela qual o defeito de YOLO de
   2026-11-16 voltaria).
4. `LTM-07`: bloco `Files:`, AC3 corrigido (metades do **mesmo** pedido expiram juntas, por
   construção), armadilha do `inArray` nomeada, política de arredondamento do AC4, e o marcador da
   metade em `winners`.
5. `LTM-04`: as oito correções listadas na própria story — sendo a primeira que `base_url` é
   **literal** no `client_api.py:74`, o que torna o AC3 ("trocar a URL base e nada mais")
   impossível como está escrito.

## Revalidação 2 do @po (2026-11-17) — depois das correções

| Story | Pontuação | Veredicto | Status aplicado |
|---|---|---|---|
| LTM-01 (índices) | **8,5/10** | **GO** | `Draft` → **`Ready`** |
| LTM-05 (testes) | **8,5/10** | **GO** | `Draft` → **`Ready`** |
| LTM-02 (transação) | **6,5/10** | **NO-GO** | permanece `Draft` (2 correções) |
| LTM-07 (meia cota — domínio) | **6,5/10** | **NO-GO** | permanece `Draft` (3 correções) |
| LTM-04 (atribuição + API) | **5,5/10** | **NO-GO** | permanece `Draft` (7 das 8 correções seguem abertas) |

### ✅ A onda 1 está liberada — e agora pelo motivo certo

`LTM-01` + `LTM-05`, as duas raízes, passaram. O que conferi antes de liberar:

- **Conjuntos de arquivo disjuntos.** `LTM-01` escreve `src/db/schema/raffles.ts` + `drizzle/**`;
  `LTM-05` escreve `tests/**` + `vitest.config.ts`. O único encontro é `package.json`, e ele
  **tende a não acontecer**: a `LTM-01` só o toca *"se o regime de migração exigir script novo"*, e
  `db:generate`/`db:push` **já existem** no arquivo. A serialização declarada vira precaução.
- **Recursos independentes.** `LTM-01` usa `drizzle/meta/_journal.json`; `LTM-05` usa base Postgres
  descartável por execução, declaradamente não compartilhada. Sem colisão de porta nem de base.
- **A dependência cruzada é de teste, não de arquivo.** O AC1 da `LTM-01` roda sobre a base da
  `LTM-05`, e a `LTM-01` já traz a regra: pode ser implementada em paralelo, **não** pode ser
  marcada `Done` com o AC1 pendente.
- **A coluna `half` não quebra os 9 leitores de `product_numbers`** (`integer NOT NULL default 1`).

### O que trava, e o que não trava

| | |
|---|---|
| **Não trava nada** | os três NO-GO estão nas ondas **2 e 3**. A onda 1 pode ser despachada hoje |
| **Trava a onda 2** | as 2 correções da `LTM-02` — e uma delas é de **sequenciamento**: o marcador de divisibilidade em `products` precisa descer para a onda 1 (recomendação: `LTM-01`), senão a onda 2 depende de uma coluna da onda 3 |
| **Trava a onda 3** | as 7 correções abertas da `LTM-04` (autenticação, rota, parâmetros, vocabulário) e as 3 da `LTM-07` |

> ⚠️ **Decisão que vale tomar antes de despachar a onda 1**, porque é mais barata agora: se o
> marcador de divisibilidade em `products` for subir para a `LTM-01`, ele entra na **mesma migração**
> que a coluna `half`. Depois da onda 1, é migração nova.

### O portão G4 precisa ser reescrito

O critério atual diz *"5 rodadas simultâneas de 100 números"*. Na forma divisível são **5 rodadas de
200 metades**, e o verificador de invariantes que o portão usa como prova é o da `LTM-05` — que
precisa estar chavado na unidade antes de o portão significar algo.

### Frente D — nova, por decisão do founder (2026-11-17)

| Story | Objetivo | Status |
|---|---|---|
| **LTM-09** | BI próprio da frente nova: coleta própria lendo a API da `LTM-04`, dashboard em projeto Vercel próprio, **zero interferência** no que roda hoje | `Draft` |

A decisão do founder — *"uma nova frente da empresa aberta com tudo a parte do que roda principal
hoje para nao haver interferencia e fazermos uma transicao realmente gradual"* — **reforça o portão
G3** em vez de substituí-lo: a leitura dupla deixa de ser procedimento sem dono e passa a ser a
razão de existir de dois pipelines simultâneos, com a comparação entre eles virando artefato. O BI
do Império atual continua lendo a Sorteamos, **intocado**, até o corte.

**Recorte decidido pelo @po: story nova, não escopo da `LTM-04`.** Três árvores de arquivo
disjuntas (`services/Meta/`, `apps/BI/`, contra `apps/lotemania/`), ciclo de vida próprio (o
dashboard continua existindo e evoluindo depois de a `LTM-04` estar Done), e a `LTM-04` já é L com
dez ACs. Dobrá-la faria dela a única story do epic impossível de paralelizar.

### A contradição de portão que existia — e como se desfez

O @po apontou um ciclo fechado: o AC11 da `LTM-03` exigia que o adaptador da `paysure` nascesse de um **aviso real capturado**; capturar exigia credencial ligada, que o epic punha em **G5**; e G5 vinha depois de **G1**, que continha a `LTM-03`. A story não podia ficar Done.

**Desfeito em 2026-11-16 pela documentação oficial da Paysure** (`docs/research/2026-11-16-paysure-contrato.md`): o contrato inteiro está publicado — autenticação, payload dos três fluxos, status, reentrega, idempotência, limites e erros. O aviso real passou de **pré-requisito** a **conferência pós-implementação**.

E o que a documentação revelou mudou o desenho, não só o cronograma:

| Premissa que estava no código | O que a documentação diz |
|---|---|
| assinatura HMAC-SHA256 em `x-webhook-signature` | **não existe assinatura nenhuma** — a orientação é validar o IP de origem da Cloudflare. O HMAC rejeitaria 100% dos avisos |
| credencial é uma `apiKey` | são **dois** cabeçalhos, `ci` + `cs` |
| o operador digita um `webhookSecret` | esse segredo **não tem destinatário**: não há onde informá-lo na Paysure |
| idempotência a inventar | **já existe nos dois sentidos**: `external_id` na saída (409 em repetido) e `reference_code` na entrada |

A substituição da assinatura: como a `postbackUrl` vai **por cobrança**, a autenticidade mora na URL — token opaco por tenant. A rota já tem a forma `[tenant]/[provider]`.

> **O que continua bloqueado, e só isso:** o `ci`/`cs` do Império, que o cliente ainda não repassou. Isso é o portão **G5** e trava o **primeiro pagamento real**, não a implementação. A `LTM-03b` é escrevível hoje.

### Achados que o epic não registrava

1. **`product_numbers.order_id` não tem FK para `orders`.** É por isso que "número órfão" é alcançável — e é o invariante que `LTM-02` (AC3) e `LTM-05` (AC5-d) verificam por asserção. Criar ou não a FK é decisão de @architect/@data-engineer; passou a ser AC8 da `LTM-01` **registrar a decisão**.
2. **A lista de provedores existe em duplicata.** `PAYMENT_GATEWAY_PROVIDERS` (`src/lib/validations/payment-gateway.ts`) é uma segunda cópia dos 18 provedores e é **ela** que produz o 404 do webhook, além de alimentar a validação da credencial e a tela de integrações. Acrescentar `paysure` só no `pgEnum` não resolve nada dos três.
3. **`paymentId`/`paymentEndToEndId` não têm onde morar.** O ETL os lê (`client_api.py:508-509`), e o lotemania só tem `externalReference` em `banking_transactions`. É uma aresta `LTM-03a` ↔ `LTM-04` que não estava mapeada, e as duas estão na mesma onda gerando migração. **Confirmado pela documentação da Paysure:** o aviso traz `end_to_end`, então o campo de origem existe e tem nome.
6. **O aviso da Paysure traz dado pessoal.** `payer_name` e `payer_document` (**CPF**) chegam no corpo, e o corpo inteiro é gravado em `payment_webhook_events.payload`. É dado pessoal entrando no banco por um caminho que ninguém declarou — **portão G7**, e precisa de decisão de retenção **antes** do primeiro aviso real, não depois.
4. ✅ **B3 não era decisão pendente — corrigido.** A tabela de Frentes diz que a Frente B tem "3 decisões de produto pendentes (B1/B2/B3)", mas o próprio texto do B3 registra a decisão **já tomada** pelo founder em 2026-11-16 (só `paysure`). Pendentes são B1 e B2.
5. **Os números do BI são uma janela móvel de 7 dias.** Conferidos hoje contra `apps/BI/imperio-premios/data-produto.json`: os estruturais batem exatamente — `numeros_total` = 100 em 100% das rodadas, mediana de esgotamento **1,748 h** (≈ 1,8 h) e mínimo **0,3 h** (18 min ⇒ ~5,5 números/minuto). Já as contagens agregadas andaram com o refresh de hoje (a janela de 7 dias agora dá 193 rodadas e ≈ R$ 701 mil, contra as 177 e R$ 639.325 registradas aqui). **Nada está errado** — é janela móvel. Recomendação: marcar a tabela com a data do snapshot, para a deriva não ser lida como erro de medição mais tarde.

## Critérios de "pronto para migrar o cliente"

A migração do Império só é autorizada quando **todos** os sete portões abaixo estiverem verdes. Nenhum deles é opinião.

| Portão | Critério | Como se comprova |
|---|---|---|
| **G0 — Compila** | ✅ **cumprido** — `lint`, `typecheck` e `build` verdes | `LTM-00` Done em 2026-11-16 |
| **G1 — Fundação** | `LTM-01`, `02`, `03a`, `03b`, `04`, `05` em Done | Suíte verde; o verificador de invariantes da LTM-05 passa no cenário de concorrência |
| **G2 — Paridade** | Zero tela vazia no caminho do operador do Império; os exports da Sorteamos reproduzidos | Checklist derivado da baseline (`docs/research/2026-11-16-baseline-sorteamos/`), item a item |
| **G3 — Atribuição e BI** | O ETL (`services/Meta/imperio-premios/client_api.py`) e o CAPI leem o lotemania **sem perda de campo** | Janela de leitura dupla: mesmo período lido das duas plataformas produz o mesmo faturamento e a mesma contagem de pedidos pagos. ⬅️ **A evidência passa a morar na `LTM-09`** (página de Comparação), por decisão do founder de 2026-11-17 |
| **G4 — Carga** | Cenário medido executado em staging: 5 rodadas simultâneas de 100 números, esgotando no ritmo do pior caso real (~5,5 números/minuto) ⚠️ **a reescrever na forma divisível: 5 rodadas de 200 metades** | Zero oversell, zero pedido órfão, **zero unidade vendável com dois donos** (não "zero número" — em sorteio divisível o mesmo número tem dois donos legítimos) — verificador de invariantes da LTM-05 ao final, **chavado na unidade** |
| **G5 — Dinheiro real** | Pelo menos **um** pedido pago ponta a ponta com gateway PIX real, em produção, num sorteio de teste | Pedido `paid`, números `sold`, `banking_transactions` com o crédito, evento de webhook casado |
| **G6 — Reversão** | Plano de volta à Sorteamos escrito **e exercitado uma vez** antes do corte | Registro do ensaio de reversão com tempo medido |
| **G7 — Dado pessoal** | A migração de histórico respeita a política de 2026-11-12 (`docs/ESTADO-ATUAL.md` §1-A) | Nenhum CPF, telefone, e-mail ou nome em artefato versionado; varredura antes de cada commit |

**G1 a G5 são bloqueantes para o corte. G6 e G7 são bloqueantes para o commit do corte.**

---

## KPIs de sucesso do epic

- [ ] Reserva em sorteio com 1 milhão de linhas em `product_numbers` sem `Seq Scan` (comprovado por `EXPLAIN`)
- [ ] 100% do caminho do dinheiro dentro de transação — zero compensação manual no código
- [ ] Evento de webhook reentregue 5× produz **1** pedido pago e **1** lançamento bancário
- [ ] Todo campo de atribuição que o `client_api.py` lê hoje existe e chega preenchido no lotemania
- [ ] Suíte roda contra Postgres de verdade e cobre o ramo de falha de cada arquivo do caminho do dinheiro

---

## Riscos do epic

| Risco | Severidade | Mitigação |
|---|---|---|
| Corte com paridade incompleta derruba o faturamento do cliente | **Alto** | G2 bloqueante; corte só com a baseline fechada e conferida item a item |
| Perda de atribuição no dia do corte cega o CAPI e o BI | **Alto** | G3 exige janela de leitura dupla antes do corte, não depois |
| Criação de índice em tabela grande no momento da importação do histórico | **Médio** | Criar os índices **antes** de importar histórico, com a tabela vazia (ver LTM-01) |
| Migração de dados pessoais do Império para artefato versionado | **Médio** | G7 — política já escrita no `.gitignore` desde 2026-11-12 |
| Meia cota modelada **depois** de `LTM-01`/`LTM-02` | **Alto** | Invertido em 2026-11-16: o `/grill-with-docs` virou **porta de entrada**. Reescrever a reserva para um dono e depois para dois é refazer o ponto mais delicado do sistema, e a suíte da `LTM-05` nasceria provando invariantes que deixariam de valer |
| Meia cota entrar sem a suíte de teste pronta | **Alto** | A `LTM-05` continua antes da implementação. O que mudou foi a **modelagem** vir antes, não a implementação pular o teste |
| Adaptador da Paysure escrito sobre premissa errada | **Médio** | Já aconteceu uma vez nesta base (o `x-webhook-signature` inventado). Mitigado pelo contrato documentado e pela conferência contra o primeiro aviso real, que a `LTM-03b` exige registrar |
| CPF do pagador entrando em `payment_webhook_events` sem política | **Médio** | Portão G7; decisão de retenção antes do primeiro aviso real |
| Driver WebSocket (`neon-serverless`) se comportar diferente no runtime do Next | **Médio** | LTM-02 exige smoke em `next build` + `next start`, não só em teste |

---

## Referências

- App: `apps/lotemania/` · levantamento honesto em `apps/lotemania/README.md`
- Estado do sistema e política de dado pessoal: `docs/ESTADO-ATUAL.md`
- ETL que hoje lê a Sorteamos: `services/Meta/imperio-premios/client_api.py`
- CAPI em tempo real (consome `data.params` do `order.paid`): `apps/webhook-imperio-capi/api/order-paid.js`
- Captura de UTM própria: `apps/utm-capture-imperio/api/capture.js`
- Stories: `docs/stories/03-Product/EPIC-LTM-Imperio-Migration/`

---
*A plataforma que não vende não migra. A que vende errado migra o erro junto.*
