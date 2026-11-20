# LTM-26: Excluir sorteio sem vendas — e hoje o lotemania exclui qualquer um

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente B — Paridade) · **diverge da Sorteamos de propósito**
**Prioridade:** **P2** para o recurso · ⚠️ **P1 para a guarda** — ver *O achado que muda a natureza desta story*
**Complexidade:** **M** — a função existe, a interface existe, o critério é que não existe
**Criada por:** @pm (Morgan) · 2026-11-19, pela decisão **D7** do founder
**Evidência:** `docs/research/2026-11-18-inventario-sorteamos/README.md` §2 (a busca em seis lugares) · leitura do código em 2026-11-19

## Story

**Como** operador do Império que criou um sorteio por engano
**Eu quero** poder apagá-lo enquanto ninguém comprou nada nele
**Para que** um rascunho errado não fique para sempre na lista — **e para que um sorteio com histórico de compra nunca possa ser apagado por acidente.**

## A decisão do founder — 2026-11-19

> **Textual (D7):** *"Permitir excluir sorteio sem vendas."*

**Isto diverge da Sorteamos, e a divergência é deliberada e a favor do operador.**

**A Sorteamos não exclui sorteio.** Procurado em **seis** lugares em 2026-11-18, [OBSERVADO]:

| Onde | O que tem |
|---|---|
| Ações da linha (9 botões) | Privado · Em breve · Destaque · Copiar link · Editar · Resumo das Vendas · Links de Campanha · Visualizar página · Compras |
| Menu ⋮ da linha (4 itens) | QR Code · Salvar cópia · Ordenação · Definir ganhadores |
| Página de edição | nenhum controle de exclusão |
| Seletor de status da linha | **não abre** para sorteio `Em breve` |
| Filtro de status | 4 estados (`Todos`/`Ativos`/`Em breve`/`Encerrados`), **nenhum** de exclusão |
| Cabeçalho e menu ⋮ da lista de compras (7 ícones + 14 itens) | nenhum |

Um sorteio criado é **permanente** para o operador: pode ser encerrado, despromovido, tornado
privado — **não apagado**. É o que explica os **10.774** sorteios na conta do Império, acumulados
desde sempre. **E é o motivo pelo qual o sorteio de teste da `LTM-19` não pôde ser excluído** —
decisão **D5**, que o deixou lá.

O mandato de 11-18 é replicar tudo; a **D7** abre uma exceção nomeada. **A exceção é o ponto da
story**, e por isso ela tem de ser estreita.

## ⚠️ O achado que muda a natureza desta story

**O lotemania já exclui sorteio. Qualquer sorteio. Sem nenhuma guarda.**
`src/lib/actions/products.ts:211-217`:

```ts
export async function deleteProduct(id: string) {
  const user = await requireUser();
  await db
    .delete(products)
    .where(and(eq(products.id, id), eq(products.tenantId, user.tenantId)));
  revalidatePath("/dashboard/products");
}
```

**E está ligada à interface em dois lugares:** `dashboard/products/product-row-actions.tsx:179` e
`dashboard/products/[id]/status-actions.tsx:52`.

Não há verificação de pedido, de pagamento, de ganhador, de nada. **A única coisa que separa o
operador de apagar um sorteio com faturamento é uma chave estrangeira.** E o que as FKs fazem é
desigual de um jeito que ninguém escolheu:

| Tabela | FK para `products` | O que acontece ao excluir |
|---|---|---|
| **`orders`** | `references(products.id)` — **sem `onDelete`** | Postgres **recusa** (`NO ACTION`). O operador recebe **erro cru de FK**, não mensagem |
| **`product_numbers`** | `onDelete: "cascade"` | **apaga todos os números** do sorteio, em silêncio |
| **`winners`** | `onDelete: "cascade"` | ⛔ **apaga os ganhadores**, em silêncio |
| `awarded_boxes` · `reward_spins` · `scratch_cards` | `onDelete: "cascade"` | apagam, em silêncio |

**Três consequências, e cada uma é um defeito por si:**

1. **A proteção que existe é acidental.** "Sorteio com pedido não é excluído" é efeito colateral de
   uma FK sem `onDelete`, não de uma regra escrita. Ninguém a declarou, ninguém a testou, e qualquer
   mudança de schema que acrescente `onDelete: "cascade"` em `orders` — por simetria com as outras,
   que é exatamente o tipo de "arrumação" que parece certa — **destrói o histórico de pedidos pagos
   sem um erro em lugar nenhum.**
2. **A falha é feia.** O operador clica, e recebe um erro de restrição de banco. Não um
   *"este sorteio tem 1.482 compras e não pode ser excluído"*.
3. **`winners` cascateia.** A linha de `winners` é a **prova de quem ganhou o quê** — `LTM-07`
   entregou `winning_half` e o valor rateado ali. Em teoria ela só existe se houver pedido, o que a
   FK de `orders` já barra; mas a cascata está declarada e **depende de outra tabela para não ser
   alcançada**. Isso é uma proteção de segunda ordem para o dado mais sensível do produto.

> **Então a D7 não é "construir a exclusão" — é *"pôr critério e mensagem numa exclusão que já está
> no ar sem nenhum dos dois"*.** É a razão de a guarda ser **P1** mesmo com o recurso sendo **P2**:
> a `LTM-18` ensinou que *controle inerte é informação falsa*; aqui é pior — o controle **funciona**,
> e o que está ausente é o limite.

## A definição de "sem vendas" — **decidida**

A pergunta é a story: *zero pedidos? zero pedidos **pagos**? pedido pendente conta?* Porque é a
diferença entre apagar um rascunho e apagar o histórico de alguém.

### A decisão: **zero pedidos, em qualquer estado**

```
Excluir é permitido quando  count(orders WHERE product_id = X) = 0
                            E count(winners WHERE product_id = X) = 0
```

Os cinco estados de `orderStatusEnum` (`raffles.ts:35-41`) são `pending`, `paid`, `expired`,
`refunded`, `canceled`. **Nenhum deles libera a exclusão.**

### Por que não "zero pedidos **pagos**"

Era a alternativa óbvia, e ela perde em quatro pontos:

1. **`pending` pode ser alguém pagando agora.** Um pedido pendente tem reserva viva: o comprador está
   com a tela de PIX aberta, com até **1 dia** de janela depois da `LTM-17`. Excluir cascateia
   `product_numbers` e o PIX dele passa a apontar para um sorteio que não existe. **Não é histórico —
   é uma pessoa no meio de uma compra.**
2. **`expired` é histórico do funil, não lixo.** O ETL lê pedidos com `filterStatus: "all"`
   justamente para alimentar o `InitiateCheckout` (`client_api.py`), e `expired` é a maior parte
   disso. Apagar pedido expirado **apaga o denominador da taxa de conversão** do cliente.
3. **`refunded` é dinheiro que saiu.** Há `banking_transactions` casadas, e a disputa MED pode vir
   depois.
4. **`canceled` é decisão registrada de alguém.** Apagá-la apaga a razão.

### Por que isto continua sendo o que o founder pediu

O caso de uso da D7 é **o rascunho criado por engano** — um sorteio que nunca foi ao ar. Esse caso
tem **zero** pedidos por construção, e o critério o atende inteiro.

### O custo da decisão, declarado em vez de escondido

**Um sorteio que teve uma única reserva abandonada fica permanentemente não-excluível.** Se o
operador criar um sorteio errado e ele mesmo testar uma reserva nele, perdeu a janela.

**É o custo certo**, por três razões: (a) é **exatamente o comportamento da Sorteamos**, então a
divergência fica mínima e intencional; (b) o remédio já existe e é o da Sorteamos — tornar privado,
despromover, encerrar; (c) o erro na outra direção não tem remédio nenhum.

> **E a saída honesta para quem perdeu a janela não é alargar o critério — é `archived`.** Um estado
> que tira o sorteio da lista sem apagar linha nenhuma entrega 100% do valor prático da D7 com 0% do
> risco. **Fica registrado como recomendação do @pm e está OUT desta story**, porque a D7 pediu
> exclusão e inventar um estado novo em cima dela seria responder outra pergunta.

## Tarefas (Checklist)

- [ ] **A guarda em `deleteProduct`** (`products.ts:211`): contar pedidos e ganhadores **dentro de
      uma transação**, e recusar com erro nomeado quando houver qualquer um.
- [ ] A recusa devolve **quantos** pedidos existem e **em que estados**, para a mensagem ser útil.
- [ ] A interface mostra a mensagem em vez do erro cru — nos **dois** pontos de chamada
      (`product-row-actions.tsx:179`, `status-actions.tsx:52`).
- [ ] **Confirmação explícita** antes de excluir, nomeando o sorteio pelo título. A exclusão é
      irreversível e cascateia `product_numbers`.
- [ ] **Registro na trilha de auditoria da `LTM-16`**: quem excluiu, quando, qual sorteio, título,
      contagem de números. **Depois da exclusão não há linha para consultar** — o registro é a única
      memória de que aquele sorteio existiu.
- [ ] **Declarar a FK de `orders` como regra, não como acidente:** comentário no schema dizendo que a
      **ausência** de `onDelete` em `orders.product_id` é **deliberada** e é a última linha de defesa.
- [ ] **Reavaliar a cascata de `winners`** com @data-engineer: ganhador apagado por cascata é o dado
      mais caro do produto. Decidir e **registrar** — não deixar implícito.
- [ ] Conferir na `LTM-19` se o estado `Encerrados` da Sorteamos tem equivalente no lotemania — é o
      remédio alternativo que esta story aponta e que o inventário deixou `[NÃO OBSERVADO]`.

## Critérios de Aceite

- [ ] **AC1 (sorteio com qualquer pedido não é excluído):** cinco testes, um por estado
      (`pending`, `paid`, `expired`, `refunded`, `canceled`). Em todos, `deleteProduct` **recusa** e o
      sorteio continua existindo. ⚠️ **Teste chama a ação direto, sem passar pela interface** — limite
      que só existe na tela não é limite (`AC3` da `LTM-18`).
- [ ] **AC2 (sorteio com zero pedidos é excluído, e os números vão com ele):** sorteio sem pedido é
      removido, e as linhas de `product_numbers` dele também — a cascata é o comportamento **desejado
      neste caso**, e o teste prova que ela não deixa órfão.
- [ ] **AC3 (a recusa é uma mensagem, não um erro de banco):** a recusa é **da aplicação**, com texto
      que nomeia a contagem e os estados. **Nenhum teste deve depender da violação de FK do
      Postgres** — se a mensagem vier da FK, a guarda não existe.
- [ ] **AC4 (a contagem e a exclusão são atômicas):** a verificação e o `delete` vivem na **mesma
      transação**. Teste de concorrência: um pedido criado **entre** a contagem e a exclusão
      **impede** a exclusão. É o mesmo gênero de defeito que a `LTM-02` corrigiu na reserva —
      verificar e agir fora de transação é a corrida clássica desta base.
- [ ] **AC5 (ganhador nunca é apagado por cascata alcançável):** sorteio com linha em `winners` não é
      excluível. ⚠️ **Em teoria isso é redundante** — ganhador pressupõe pedido, que o `AC1` já barra.
      **O AC existe porque a cascata de `winners` está declarada no schema**, e proteção que depende
      de outra tabela para não ser alcançada não é proteção. Teste direto, com `winners` semeado.
  - ⚠️ **E hoje `winners` semeado à mão é a *única* forma de testar isto**, porque **nenhum caminho de
    produção cria a linha**: `recordWinnersForDrawnTitle` (`src/lib/raffles/winners.ts:68`) só é
    importada por um teste. **A `LTM-27` (P0, epic §2-A) é quem constrói o acionador** — e ela deve
    ir **antes** desta story. Com ela entregue, o `AC5` passa a ser exercitável pelo caminho real em
    vez de por fixture, e deixa de ser teórico.
- [ ] **AC6 (a exclusão fica na trilha):** cada exclusão gera registro de auditoria com operador,
      horário, id, título e contagem de números. **Depois não há o que consultar.**
- [ ] **AC7 (escopo de tenant):** operador de um tenant **não** exclui sorteio de outro, nem recebe
      mensagem que revele a existência dele. A guarda atual (`eq(products.tenantId, …)`) está certa e
      **não se perde** na mudança.
- [ ] **AC8 (a ausência de `onDelete` em `orders` está declarada):** o schema registra por escrito que
      a FK **sem** `onDelete` é deliberada e é a última linha de defesa. Sem isso, a próxima
      "arrumação por simetria" acrescenta `cascade` e apaga faturamento sem erro nenhum.
- [ ] **AC9 (a porta de verificação continua verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build` e
      `npm run test` passam.

## Escopo

**IN:** a guarda em `deleteProduct`; a mensagem de recusa; a confirmação na interface nos dois pontos
de chamada; o registro de auditoria; a declaração escrita da FK de `orders`; a decisão registrada
sobre a cascata de `winners`.

**OUT:**

- **O estado `archived`.** É a recomendação do @pm para quem perdeu a janela de exclusão, e é um
  recurso **diferente** do que a D7 pediu. Story própria, se o founder quiser.
- **Exclusão em massa** e exclusão de sorteio de outro tenant.
- **Exclusão com estorno.** Cancelar pedido pago e devolver dinheiro é outro recurso inteiro.
- **Mudar as cascatas de `awarded_boxes`, `reward_spins`, `scratch_cards`.** Elas são features do
  grupo C da `LTM-18` e ainda não existem de verdade; mexer nelas aqui é mexer no que não se observou.
- **O estado `Encerrados` da Sorteamos.** A story conferir se existe equivalente; construir, não.

## Dependências

- **Depende da `LTM-16` (`Ready`)** — a trilha de auditoria. **`AC6` não é satisfazível sem ela**, e
  exclusão sem trilha é irreversível **e** inexplicável. ⚠️ Se a `LTM-26` chegar primeiro, ela
  **espera**: não há nenhuma das 34 tabelas que sirva de trilha.
- **Depende da `LTM-27`** (P0, epic §2-A) — ela constrói o acionador que registra ganhador, que hoje
  **não existe em produção**. Sem ela o `AC5` só se prova por fixture. ⚠️ **E as duas colidem em
  `dashboard/products/**`**: a `LTM-27` ocupa o lugar do `Definir ganhadores` da Sorteamos, que é o
  menu ⋮ da linha do sorteio — **o mesmo menu** onde a exclusão vive. **Serializar, `LTM-27` primeiro.**
- **Toca o caminho de `orders`** por leitura (a contagem), não por escrita. **Não colide com
  `reserve.ts`.**
- ⚠️ **`dashboard/products/**` é disputado** com a `LTM-12` (painel de controle por sorteio) e com a
  `LTM-10` (lista de compras). Conferir no despacho.
- **Informa a `LTM-19`:** o `AC5` do inventário é *existe e funciona* / *existe e não funciona* /
  *não existe*. A exclusão de sorteio é um caso em que o **lotemania tem e a Sorteamos não** — a
  coluna que falta na comparação, e vale registrar como gênero.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/actions/products.ts                              (a guarda em deleteProduct :211)
  apps/lotemania/src/app/dashboard/products/product-row-actions.tsx       (mensagem + confirmacao :179)
  apps/lotemania/src/app/dashboard/products/[id]/status-actions.tsx       (mensagem + confirmacao :52)
  apps/lotemania/src/db/schema/raffles.ts                                 (SO comentarios: a FK de orders, a cascata de winners)
  apps/lotemania/tests/dashboard/excluir-sorteio/**                       (novo)

Resources:
  banco de teste    — COMPARTILHADO com toda a suite. Base/esquema proprio por tarefa.
  NENHUMA migracao  — se a decisao sobre a cascata de `winners` for mante-la.
                      Se for mudar, ha migracao e `drizzle/meta/_journal.json` entra em disputa.
  trilha de auditoria — da LTM-16. Dependencia de codigo, nao de arquivo.

Depends-on: LTM-16 (trilha de auditoria) · LTM-27 (o acionador de ganhador, para o AC5 sair da fixture)
```

- ⛔ **Não compartilha onda com a `LTM-12` nem com a `LTM-10`** se elas tocarem
  `dashboard/products/**`.
- ✅ **Não toca `reserve.ts`, nem `src/lib/payments/`, nem o editor de sorteio.** Fica fora das três
  filas disputadas do epic.
- ⚠️ `src/db/schema/raffles.ts` é tocado **só em comentário** no caminho recomendado. Se a decisão
  sobre `winners` virar mudança de schema, a story passa a disputar `_journal.json` e **tem de ser
  serializada** com toda story que gere migração (epic §8).

## Riscos

- **[Alto] A proteção acidental ser "arrumada" antes de ser declarada.** Hoje o que impede apagar um
  sorteio com faturamento é uma FK **sem** `onDelete`, enquanto as cinco tabelas vizinhas têm
  `cascade`. Acrescentar `cascade` ali por simetria **parece** limpeza e apaga histórico de pedido
  pago **sem erro em lugar nenhum**. `AC8` existe só por isso, e este é o risco mais grave da story.
- **[Alto] Excluir sorteio com pedido `pending` vivo.** Não é histórico — é alguém com a tela de PIX
  aberta e até **1 dia** de janela. A cascata tira os números debaixo de uma compra em andamento.
  `AC1` cobre pelo estado, não pelo pagamento.
- **[Médio] A corrida entre contar e excluir.** Verificar fora de transação é o defeito clássico
  desta base — foi o que a `LTM-02` corrigiu na reserva. `AC4`.
- **[Médio] `winners` apagado por cascata.** A linha de ganhador é a prova de quem ganhou o quê, com
  `winning_half` e valor rateado. A proteção hoje é **indireta** (passa pela FK de `orders`). `AC5` a
  torna direta.
- **[Médio] A mensagem vazar existência de sorteio de outro tenant.** A recusa informativa é
  informação; o escopo de tenant tem de vir **antes** dela. `AC7`.
- **[Baixo] O operador perder a janela e ficar sem saída.** Mitigação declarada: tornar privado,
  despromover, encerrar — os remédios da Sorteamos. A recomendação do `archived` fica registrada.

## Dev Agent Record

### Agent Model Used
_(preencher na implementação)_

### A decisão sobre a cascata de `winners`
_(registrar o que @data-engineer decidiu, e por quê)_

### Notas
_(preencher na implementação)_

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Nasce da decisão **D7** do founder: *"permitir excluir sorteio sem vendas"* — **divergência deliberada** da Sorteamos, que não exclui (procurado em seis lugares, [OBSERVADO] 11-18, e é o que explica os 10.774 sorteios da conta). **Achado que mudou a natureza da story:** `deleteProduct` (`products.ts:211-217`) **já existe, já está ligado à interface em dois lugares e não tem guarda nenhuma** — a única coisa que separa o operador de apagar um sorteio com faturamento é a FK de `orders` sem `onDelete`, enquanto `product_numbers`, **`winners`**, `awarded_boxes`, `reward_spins` e `scratch_cards` têm `onDelete: "cascade"`. Então a story é *"pôr critério e mensagem numa exclusão que já está no ar sem nenhum dos dois"*, e a guarda é **P1** mesmo com o recurso sendo P2. **Critério decidido: zero pedidos em qualquer estado, mais zero ganhadores** — e não "zero pagos", com as quatro razões escritas (`pending` é alguém pagando agora, com até 1 dia de janela depois da `LTM-17`; `expired` é o denominador do funil que o ETL lê com `filterStatus: "all"`; `refunded` é dinheiro que saiu e disputa MED que pode vir; `canceled` é decisão de alguém). Custo declarado: sorteio com uma reserva abandonada fica permanentemente não-excluível — **que é exatamente o comportamento da Sorteamos**, logo divergência mínima. `archived` fica como recomendação do @pm e **OUT**: responde a outra pergunta. Depende da **`LTM-16`** — exclusão sem trilha é irreversível e inexplicável. | @pm (Morgan) |
