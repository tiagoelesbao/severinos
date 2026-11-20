# LTM-08: A meia cota — a superfície

**Status:** Ready
> ✅ **Revalidada pelo @po em 2026-11-20 — GO (8/10). `Draft` → `Ready`.** O **único** item que a
> travava em 11-17 era o bloco `Files:`, e ele foi recusado então por uma razão certa: *"não vou
> inventar a lista a partir das tarefas"*. **Hoje ela não se inventa, se mede** — a `LTM-07` está
> entregue (`4d18f17a`), as superfícies existem no disco e cada caminho abaixo foi conferido um a um.
> A dependência bloqueante **caiu**, e a story saiu de *"não está no caminho crítico"* para **dentro
> dele**: o founder mandou que o ensaio ponta a ponta **inclua meia cota**, e hoje a meia cota é
> **inalcançável pela interface em três pontos**, não um. Ver *Revalidação @po (2026-11-20)*.
**Epic:** EPIC-LTM-Imperio-Migration (Frente C)
**Prioridade:** **P0** — a feature existe quando o comprador consegue comprar e o operador consegue conferir
**Complexidade:** M — grade, unidade na interface, anúncio, relatório, aviso de órfã
**Criada por:** @aiox-master · 2026-11-17, a partir do `/grill-with-docs` com o founder
**Par:** `LTM-07` (o domínio) · **Decisão:** `docs/architecture/adr/0001-meia-cota-como-linha.md`

## Story

**Como** comprador de uma Rapidinha de 100 mil
**Eu quero** entender, sem esforço, o que estou comprando e a quanto estou concorrendo
**Para que** eu não descubra depois que paguei metade e concorro a metade — achando que concorria ao valor que vi na tela.

## Contexto

A `LTM-07` define o domínio. Esta é a parte que **chega às pessoas** — e é onde o erro é caro de
um jeito diferente: um bug de reserva perde um pedido, um número ambíguo na tela ou no relatório
vira disputa com o ganhador.

### A armadilha das contagens

Existem **seis** configurações de contagem por sorteio, todas em `advancedSettings`:
`minPerReservation`, `maxPerReservation`, `maxPerBuyer`, `maxQuantityPerBuyer`,
`initialPerReservation` e `quickBuyCards` (hoje `[5, 10, 50, 100, 500, 1000]`).

Num sorteio divisível, "comprar 10" dá **10 metades — cinco títulos** — enquanto o cartão sugere
dez de alguma coisa. A decisão (ADR-0001, `GLOSSARY.md` → **unidade**): **uma unidade por
sorteio, sempre nomeada**. A interface escreve o nome da unidade em vez de deixar o número solto.

### A armadilha do anúncio

Mostrar "R$ 100.000" ao lado do preço da metade induz a erro: a pessoa compra achando que concorre
ao valor cheio. Isso cai em `.claude/rules/claims-ledger.md` — afirmação que não se sustenta não
sai, e valor inflado é prática enganosa.

## Tarefas (Checklist)

- [ ] **Grade partida**: um botão por título, dividido ao meio, cada banda clicável e colorida por
      conta própria. O comprador continua vendo cem títulos.
- [ ] **Unidade nomeada** nas seis configurações, nos cartões de compra rápida, na barra de
      progresso e no resumo do carrinho.
- [ ] **Anúncio dos dois valores** lado a lado com o que se está comprando.
- [ ] **Editor do sorteio**: o marcador de divisibilidade, com o congelamento visível (desabilitado
      e com motivo depois da primeira venda) e a recusa para prêmio não divisível.
- [ ] **Metade marcada** nos três exports por sorteio (Vendas, Expirados, Participantes) e na
      consulta "Meus títulos" do comprador.
- [ ] **Contagem de metades órfãs** no painel do sorteio, visível sem o operador procurar.

## Critérios de Aceite

- [ ] **AC1 (a grade é honesta):** em sorteio divisível, cada título renderiza duas bandas
      independentes; clicar numa não seleciona a outra; o estado de cada banda reflete o da sua
      metade. Em sorteio de cota inteira a grade renderiza **exatamente como hoje** — regressão
      visual.
- [ ] **AC2 (nenhum número solto):** nenhuma contagem exibida ao comprador ou ao operador aparece
      sem o nome da unidade. Verificável por varredura dos rótulos das seis configurações e do
      resumo do carrinho.
  - **Recorte do @po (2026-11-20), mesma classe de correção do AC5.** O AC citava *"os cartões de
    compra rápida"*. **Eles não existem**: `quickBuyCards` aparece em **um** arquivo em todo o
    repositório — a própria declaração, `product-settings.ts:30` — e em nenhuma tela. É um dos **8**
    campos do **grupo B** da `LTM-18` (*"prometem uma tela que não existe"*). A unidade nomeada nos
    cartões entra como **condição de aceite da story que construir os cartões**, e está registrada
    no `OUT`.
    - **Nesta story:** as seis configurações (que existem em
      `advanced-settings-tabs.tsx`), a barra de progresso **se e quando existir**, e o resumo do
      carrinho na grade.
- [ ] **AC3 (o anúncio não engana):** numa tela onde se compra metade, o valor que a metade
      concorre aparece **junto** do preço da metade. Teste: a página de um sorteio divisível de
      R$ 100.000 nunca exibe "R$ 100.000" como o valor de uma compra de metade.
- [ ] **AC4 (congelamento visível):** num sorteio com ao menos uma venda, o controle de
      divisibilidade aparece desabilitado **com o motivo escrito**, não apenas inerte.
- [ ] **AC5 (relatório sem ambiguidade):** em **todo artefato de saída que existir no fim desta
      story**, uma metade sai marcada e um título inteiro sai nu. Quem tem a metade do 42 e o 43
      inteiro produz `42 (metade)` e `43`. O cabeçalho traz a unidade do sorteio.
  - **Recorte do @po (2026-11-17), porque o AC original era insatisfazível.** Dos quatro artefatos
    citados, **um existe**: `src/app/loja/[tenant]/meus-titulos` (conferido). O relatório que
    existe é `generateReport` (`src/lib/actions/reports.ts:15`, colunas
    `Data, Pagos, Reservados, Expirados, Faturamento` — agregado por dia, **não lista número**).
    Os **três exports por sorteio** (Vendas, Expirados, Participantes) **ainda não foram
    construídos**: são Frente B, hoje despriorizada e com escopo "a definir" no epic. Um AC não
    pode exigir marcação em export inexistente.
    - **Nesta story:** "Meus títulos" e qualquer coluna de número que a story introduza.
    - **Na Frente B:** a regra do `GLOSSARY` → *metade marcada* entra como **condição de aceite dos
      três exports quando eles forem escritos**, e isso precisa ficar registrado lá — não aqui,
      pendurado num AC que ninguém pode fechar.
- [ ] **AC6 (o operador enxerga a órfã):** o painel de um sorteio divisível mostra quantos títulos
      têm metade órfã, **antes** do sorteio, na tela que o operador já abre — não atrás de um
      filtro. Teste monta o estado e confere o número.
- [ ] **AC7 (recusa de prêmio não divisível):** tentar habilitar divisibilidade em sorteio de
      prêmio não monetário mostra o motivo, não um erro genérico.

## Escopo

**IN:** grade partida; unidade nomeada em toda contagem exibida; anúncio dos dois valores; controle
de divisibilidade no editor com congelamento e recusa; marcação da metade no "Meus títulos" e em
qualquer saída que esta story introduza; contagem de metades órfãs no painel.

**OUT:** o modelo de dados, a reserva e o rateio (`LTM-07`); construir de verdade `analytics`,
`social` e `utm-links`, que são Frente B; **construir os três exports por sorteio** (Vendas,
Expirados, Participantes) — são Frente B, e a regra da metade marcada entra como condição de aceite
deles **lá** (ver nota do AC5); qualquer mudança nos sorteios de cota inteira além da regressão que
prova que **não** mudaram.

## Dependências

- **Depende de `LTM-07` (bloqueante).** A superfície mostra o que o domínio define; construir a
  grade antes de a metade existir é desenhar contra um modelo que ainda pode mudar.
- **Independe de `LTM-03a/b` e `LTM-04`** — conjuntos de arquivo disjuntos (componentes da loja e
  do painel, contra rotas de API e schema de pagamento/atribuição).
- **Não gera migração** — não disputa o journal do Drizzle.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

**Declarado pelo @po em 2026-11-20, medido caminho por caminho.** Era o último item que travava a
story, e em 11-17 ele foi corretamente recusado como dedução a partir das tarefas. Hoje a `LTM-07`
está entregue e cada superfície existe no disco — então a lista abaixo é **medição**, com a linha
citada onde a linha é o alvo.

```
Files (escreve):
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/number-grid.tsx
      a celula partida e a banda clicavel. :70 e a linha que TRAVA a meia cota hoje
      (`units: selected.map((number) => ({ number, half: null }))`), e o comentario
      de :60-66 JA ATRIBUI a esta story a selecao de metade avulsa
  apps/lotemania/src/app/loja/[tenant]/[productSlug]/page.tsx
      o anuncio dos dois valores lado a lado (AC3)
  apps/lotemania/src/app/loja/[tenant]/meus-titulos/lookup-form.tsx
      a metade marcada no que o comprador consulta. O numero sai em :88; o tipo
      `numbers: number[]` em :18 NAO tem onde carregar a metade
  apps/lotemania/src/lib/actions/my-titles.ts
      A FONTE do defeito do AC5: :35 faz `.select({ number: productNumbers.number })`
      e DESCARTA `half` na consulta. Marcar a metade so no componente e impossivel
  apps/lotemania/src/app/dashboard/products/[id]/advanced-settings-tabs.tsx
      a unidade nomeada nas seis configuracoes + o marcador de divisibilidade com
      o congelamento visivel (AC4) e a recusa de premio nao divisivel (AC7)
  apps/lotemania/src/app/dashboard/products/[id]/page.tsx
      a contagem de metades orfas no painel do sorteio (AC6). E a tela `Editar
      Sorteio` (:88), que e a que o operador ja abre
  apps/lotemania/src/app/loja/[tenant]/ganhadores/page.tsx
      `winning_half` no cartao publico. A mascara ja esta la (:62, :81); o que falta
      e `42 (metade)` em vez de `42` — regra *metade marcada* do GLOSSARY
  apps/lotemania/src/lib/raffles/orphan-halves.ts                      (NOVO)
      a consulta de metade orfa, que nao existe: `grep -rn "orf\|orphan" src` = ZERO
  apps/lotemania/tests/loja/meia-cota-superficie/**                    (NOVO)

Cobertos, NAO editados:
  apps/lotemania/src/lib/actions/products.ts
      `setProductDivisibility` (:179) JA EXISTE e e a porta do marcador. Esta story
      a CHAMA; quem valida o congelamento e a recusa e `raffles/divisibility.ts`,
      que e da LTM-07 e esta em InReview — NAO editar nenhum dos dois
  apps/lotemania/src/lib/raffles/divisibility.ts, prize-split.ts, winners.ts
      o dominio da LTM-07. Esta story e so superficie

Resources:
  banco de teste      — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao    — `is_divisible` (raffles.ts:90) e `half` ja existem
  branch Neon efemera — cota finita; nao rodar a suite em duas ondas ao mesmo tempo

Depends-on: LTM-07 (ENTREGUE, 4d18f17a — a dependencia bloqueante caiu)
```

#### ⚠️ A aresta com a `LTM-27`, declarada antes do despacho

**As duas tocam `dashboard/products/`, e os arquivos são diferentes** — mas a diferença é de **um
segmento de caminho**, que é o tipo de coisa que se confunde ao abrir o editor:

| | `LTM-08` (esta) | `LTM-27` (ganhadores) |
|---|---|---|
| no painel | `products/**[id]**/page.tsx` e `products/**[id]**/advanced-settings-tabs.tsx` | `products/page.tsx`, `products/product-row-actions.tsx`, `products/winners-dialog.tsx` |
| na loja | `ganhadores/page.tsx` — **`winning_half`** | — (o `AC8` dela **atribui a exibição da metade a esta story**) |
| em `src/lib` | `raffles/orphan-halves.ts` (novo) | `actions/winners.ts` (novo) |

✅ **Os conjuntos são disjuntos arquivo por arquivo, então as duas PODEM compartilhar onda.**
⛔ **Com uma condição:** se a `LTM-27` precisar entrar em `products/[id]/**` — ou esta em
`products/*.tsx` da raiz —, **a onda se rompe e serializa**. `products/page.tsx` e
`products/[id]/page.tsx` são arquivos distintos com o mesmo nome de arquivo, e nenhum dos dois
blocos usa glob justamente por isso.
⚠️ **`ganhadores/page.tsx` é o único ponto onde as duas encostam no mesmo resultado** e não no mesmo
arquivo: a `LTM-27` **cria a linha** de `winners`, esta **marca a metade** nela. A `LTM-27` pode ir
primeiro sem esperar; o cartão sai com `42` até esta chegar, o que é o estado de hoje.
⛔ **Não compartilha onda com a `LTM-17` nem com a `LTM-18a`/`18c`** — as três querem
`advanced-settings-tabs.tsx`.
⛔ **Não compartilha onda com a `LTM-02`** — `number-grid.tsx` é declarado por ela (o recorte do
contrato de entrada); esta story mexe na **aparência** do mesmo arquivo.

## Riscos

- **[Alto] Anúncio ambíguo.** É o risco com consequência fora do software: cliente que compra
  metade achando que concorre ao valor cheio tem queixa legítima, e isso é prática enganosa pelo
  CDC. AC3 existe por isso.
- **[Médio] Export ambíguo.** `42` para uma metade vira disputa na hora de pagar o prêmio. AC5.
- **[Médio] Regressão na grade dos sorteios atuais.** São 5 rodadas simultâneas em produção. AC1
  exige a regressão explícita.
- **[Baixo → Médio] Grade partida no celular.** A banda de cada metade precisa continuar clicável
  num alvo de toque usável. ⚠️ **Correção do @po (2026-11-20): a grade não é "de sete colunas".**
  `number-grid.tsx:119` é `grid grid-cols-6 gap-1.5 sm:grid-cols-10` — **6 no celular, 10 a partir
  de 640px**. Partir ao meio uma célula de **uma grade de dez** no desktop é metade do alvo de toque
  que o número de "sete" sugeria, e é o lado que a decisão **D4** do founder (manter 6) **não
  fecha** — ela decidiu 6 contra 7, não 6 contra 10 (epic §6, item 7). **Esta story não muda o
  número de colunas**: mudá-lo por dedução é o que o epic registrou como não-corrigido de propósito.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### Notas
_(preencher na implementação)_

## Validação @po (2026-11-17)

> ✅ **Histórico — o item que faltava foi fechado em 2026-11-20.** O bloco `Files:` está declarado na
> seção *Dependências*, medido caminho por caminho. Esta seção fica como registro do que foi exigido
> e por quê; o veredito vigente é o de **2026-11-20**, ao fim do arquivo.

**Veredicto: GO condicional — 7/10.** Permanece `Draft` até **um** item ser fechado: o bloco
`Files:`. A correção de escopo do AC5 já foi aplicada nesta validação.

É uma story honesta e bem recortada. O AC3 (o anúncio não engana) e o AC1 (regressão da grade de
cota inteira) são as duas travas certas nos dois lugares onde o erro é caro de verdade — um com
consequência fora do software, outro com 5 rodadas simultâneas em produção. A invocação de
`.claude/rules/claims-ledger.md` no anúncio é apropriada: valor inflado ao lado do preço da metade
é prática enganosa, não só UX ruim.

### Correção aplicada: o AC5 era insatisfazível

Exigia marcação da metade *"nos três exports"* por sorteio. **Eles não existem.** Conferido hoje:
`src/lib/actions/reports.ts` tem **uma** função, `generateReport`, e ela devolve um agregado por dia
(`Data, Pagos, Reservados, Expirados, Faturamento`) — não lista número nenhum. Os três relatórios
por sorteio estão listados no epic como **Frente B, despriorizada, "a definir"**.

"Meus títulos" **existe** (`src/app/loja/[tenant]/meus-titulos`) e continua no AC. O resto migrou
para condição de aceite da Frente B, registrada no OUT. Um AC que depende de trabalho não
especificado em outra frente é um AC que trava a story sem defeito nenhum nela.

### O item que falta — **fechado em 2026-11-20**

**Bloco `Files:`/`Resources:`/`Depends-on:`**, no padrão da `LTM-03a`. A story diz, corretamente,
que é disjunta de `03a`/`04` e que não gera migração — mas **não lista um arquivo**. Não vou
inventar a lista a partir das tarefas: inferir conjunto de arquivo foi exatamente o que derrubou a
`LTM-03`, quando a validação achou um terceiro consumidor
(`src/lib/validations/payment-gateway.ts`) fora do conjunto suposto. Quem escreve a story declara.

Não está no caminho crítico: esta story é bloqueada pela `LTM-07` de qualquer forma.

### Dois pontos de atenção, não bloqueantes

1. **AC2 não é automatizável como está.** *"Verificável por varredura dos rótulos"* é inspeção
   humana. As seis configurações estão nomeadas, o que salva o AC — mas vale converter a varredura
   numa lista enumerada no Dev Record, como o AC7 da `LTM-05` fez para os ramos de falha. Caixinha
   marcável é o risco.
2. **AC6 (o operador enxerga a órfã)** depende de a contagem de metades órfãs ser consultável, o que
   depende da chave de unidade que a `LTM-07` ainda não fechou. Herdado, não defeito daqui.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ⚠️ sem bloco `Files:` — ✅ **fechado em 11-20** |
| Estrutura de arquivos / árvore | ⚠️ disjunção afirmada, conjunto não declarado — ✅ **declarado em 11-20** |
| UI/Frontend | ✅ é a força da story — grade, unidade, anúncio, congelamento visível |
| Satisfação dos ACs | ✅ após a correção do AC5 |
| Instruções de teste | ⚠️ AC2 por varredura manual |
| Segurança | ✅ claims-ledger invocado onde devia |
| Sequência de tarefas | ✅ |
| Duplicação funcional | ✅ nenhum arquivo em disputa |
| Anti-alucinação | ✅ as seis configurações e o `quickBuyCards` conferem com o código |
| Prontidão para @dev | ⚠️ bloqueada pela `LTM-07` |

## Revalidação @po (2026-11-20) — **GO, 8/10. `Draft` → `Ready`**

O veredito de 11-17 foi *GO condicional, travado em **um** item*: o bloco `Files:`. **Ele está
declarado.** E a razão pela qual ele podia ser declarado hoje e não então é a parte que importa: em
11-17 recusei inventá-lo a partir das tarefas — *"inferir conjunto de arquivo foi exatamente o que
derrubou a `LTM-03`"* — e isso continua certo. O que mudou é que a `LTM-07` **entregou**
(`4d18f17a`), as superfícies existem no disco, e **lista medida não é lista inferida**.

### A story saiu de "não está no caminho crítico" para dentro dele

Em 11-17 eu fechei com *"não está no caminho crítico: esta story é bloqueada pela `LTM-07` de
qualquer forma"*. **As duas metades dessa frase caíram:** a `LTM-07` entregou, e o founder mandou
que o ensaio ponta a ponta **inclua meia cota**. Ela é P0 e é agora.

### O que eu medi, e é pior do que a story supunha

A meia cota não está **inalcançável pela interface em um ponto. São três** — e isso é o achado
desta revalidação:

| # | O que não dá para fazer pela tela | Medição |
|---|---|---|
| **1** | **Marcar um sorteio como divisível** | `setProductDivisibility` (`actions/products.ts:179`) tem **zero chamadores** — só comentários e testes. Nenhum formulário expõe `isDivisible`: `grep -rn "isDivisible" src/app --include=*.tsx` = **zero**. E `productSchema` o resolve para **`false`** (`validations/product.ts:25`, `z.boolean().default(false)`), então **todo sorteio criado pela tela nasce indivisível, sem ninguém escolher isso** |
| **2** | **Comprar uma metade** | `number-grid.tsx:70` envia sempre `half: null` |
| **3** | **Registrar o ganhador da metade** | `recordWinnersForDrawnTitle` tem um importador, e é um teste — é a `LTM-27` |

> **O ponto 1 é o que ninguém tinha nomeado, e é o primeiro da fila.** Mesmo com a grade partida
> pronta, **nenhum sorteio pode ser divisível** — a porta existe no servidor e não tem maçaneta na
> tela. É a tarefa *"Editor do sorteio: o marcador de divisibilidade"*, que a story já tinha, e que
> acabou de passar de *"configuração a mais"* para **pré-requisito do ensaio**.
>
> A boa notícia é que o trabalho é pequeno e **nenhuma lógica nova é necessária**: a ação, o
> congelamento na primeira venda e a recusa de prêmio não divisível **já estão construídos e
> testados** pela `LTM-07` (`raffles/divisibility.ts`). Falta o controle que os chama.
>
> ⚠️ **E isso tem uma consequência para o portão da `LTM-07`, registrada aqui porque o arquivo dela é
> do @qa agora:** três ACs dela guardam uma transição que **ninguém pode disparar fora de teste**. Os
> testes provam a regra; **nenhum caminho de produção a exercita**. Não é defeito da `LTM-07` — o
> domínio é dela, a superfície é desta story —, mas é o tipo de cobertura que parece completa e não é.
> **Esta story é o que torna aqueles três ACs exercitáveis pelo caminho real.**

### A segunda correção de escopo, da mesma classe da de 11-17

O `AC2` exigia unidade nomeada *"nos cartões de compra rápida"*. **Eles não existem** —
`quickBuyCards` aparece em **um** arquivo, a própria declaração, e é **grupo B da `LTM-18`**
(*"prometem uma tela que não existe"*). É o mesmo defeito que o `AC5` tinha com os três exports, e
o conserto é o mesmo: a regra migra para condição de aceite de quem construir a tela.

**Duas vezes a mesma classe de defeito na mesma story diz algo sobre o epic, não sobre a story:**
nesta base, *"a configuração existe"* não autoriza concluir *"a tela existe"*. São 36 campos nessa
situação, e é a razão de a `LTM-18` ser P0.

### A citação de linha que eu corrigi

O risco *[Baixo] Grade partida no celular* dizia *"a grade já é de sete colunas"*. **É
`grid-cols-6 sm:grid-cols-10`** (`number-grid.tsx:119`): seis no celular, **dez** no desktop. Partir
uma célula de dez ao meio é metade do alvo de toque que "sete" sugeria — e é exatamente o lado que a
**D4** do founder não fechou.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ bloco `Files:`/`Resources:`/`Depends-on:` declarado |
| Estrutura de arquivos / árvore | ✅ 9 caminhos medidos; a aresta com a `LTM-27` escrita antes do despacho |
| UI/Frontend | ✅ segue sendo a força da story |
| Satisfação dos ACs | ✅ depois do recorte do `AC2`; `AC6` ganhou arquivo próprio (`orphan-halves.ts`) |
| Instruções de teste | ⚠️ `AC2` ainda é varredura de rótulo — vale enumerar no Dev Record |
| Segurança | ✅ `claims-ledger` invocado no anúncio, onde devia |
| Sequência de tarefas | ⚠️ → ✅ **com uma ordem interna obrigatória**: o marcador de divisibilidade **antes** da grade partida, ou não há sorteio divisível para testar a grade contra |
| Duplicação funcional | ✅ colisões declaradas: `LTM-02` (`number-grid.tsx`), `LTM-17`/`LTM-18` (`advanced-settings-tabs.tsx`), `LTM-27` (disjunta, com condição) |
| Anti-alucinação | ✅ as seis configurações conferem; corrigida a grade de "sete" colunas |
| Prontidão para @dev | ✅ `LTM-07` entregue; nada bloqueia |

### A ordem interna, que vale mais que a nota

**O marcador de divisibilidade vai primeiro.** Sem ele não existe sorteio divisível no banco, e sem
sorteio divisível a grade partida não tem contra o que ser testada — o `AC1` viraria inspeção visual
em vez de teste.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.2 | **Revalidada — GO (8/10). `Draft` → `Ready`.** O único item que a travava desde 11-17 — o bloco `Files:` — **está declarado**, medido caminho por caminho, com `Resources:` e `Depends-on:`; a dependência bloqueante caiu com a `LTM-07` entregue (`4d18f17a`). **Achado da revalidação: a meia cota é inalcançável pela interface em TRÊS pontos, não um.** Além de `number-grid.tsx:70` (`half: null` sempre), **nenhum sorteio pode ser marcado como divisível** — `setProductDivisibility` (`actions/products.ts:179`) tem **zero chamadores** e nenhum formulário expõe `isDivisible` — e o ganhador da metade não se registra (é a `LTM-27`). Isso impõe **ordem interna**: o marcador de divisibilidade antes da grade partida, ou o `AC1` não tem sorteio contra o que ser testado. **`AC2` recortado** pela mesma razão que o `AC5` foi em 11-17: exigia unidade nomeada *"nos cartões de compra rápida"*, que **não existem** (`quickBuyCards` aparece só na própria declaração; é grupo B da `LTM-18`) — a regra migra para condição de aceite de quem construir os cartões. Corrigido o risco que afirmava *"a grade já é de sete colunas"*: é `grid-cols-6 sm:grid-cols-10` (`:119`). Declarada a aresta com a `LTM-27` **antes do despacho**: conjuntos disjuntos arquivo por arquivo (`products/[id]/**` aqui × `products/*.tsx` lá), podem compartilhar onda, e `ganhadores/page.tsx` — a exibição de `winning_half` — **é desta story**, conforme o `AC8` da `LTM-27` e o comentário de `raffles.ts:306`. | @po (Pax) |
| 2026-11-17 | 1.0 | Nasce do `/grill-with-docs` com o founder, separada da `LTM-07` desde o início para não repetir o tamanho que derrubou a `LTM-03` na validação. | @aiox-master |
| 2026-11-17 | 1.1 | **Validada — GO condicional (7/10). Permanece `Draft` até o bloco `Files:` ser declarado.** AC5 recortado: exigia marcação da metade em três exports que não existem (Frente B); fica com "Meus títulos", e a regra da metade marcada migra para condição de aceite da Frente B. | @po (Pax) |
