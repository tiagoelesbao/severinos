# EPIC-LTM: Migração do Império Prêmios para o lotemania

## Visão Geral

Levar o **Império Prêmios** da **Sorteamos** (`painel.rapidinhas24hr.com`) para o **lotemania** (`apps/lotemania`, importado em 2026-11-16 pelo commit `2ac7d133`) sem perder um pedido, um real ou um dado de atribuição.

O lotemania é a sucessora da Sorteamos: mesma operação, plataforma própria, multi-tenant white-label. A troca só acontece quando o lotemania aguentar o que a Sorteamos já aguenta — e isso é medível, não opinável.

**Epic ID:** LTM · **Owner:** @pm (Morgan) · implementação @dev · schema @data-engineer
**Priority:** **Critical** — é o caminho do dinheiro de um cliente em produção
**Criado:** 2026-11-16 · **Atualizado:** 2026-11-19
**App:** `apps/lotemania` · **Origem a substituir:** Sorteamos (`api.rapidinhas24hr.com`)

---

## Status — 2026-11-19

**A fundação saiu do papel.** Em três dias o caminho do dinheiro passou de andaime a código commitado e testado: seis stories entregues, **263 testes verdes contra Postgres real** (eram zero), `lint`/`typecheck`/`build` em 0. O que trava agora **não é mais a fundação** — são duas coisas: um defeito P0 em implementação (`LTM-20`) e **sete decisões que esperam o founder**.

| A pergunta | A resposta curta | Onde |
|---|---|---|
| O que já funciona? | reserva atômica, fechamento de pedido, PIX na Paysure, meia cota no domínio, suíte real, migração versionada | §1 |
| O que falta para o **sorteio de teste**? | `LTM-20` (defeito P0), `LTM-08`, `LTM-14`, `LTM-17`, `LTM-18` grupo A, `LTM-21` — e o `ci`/`cs` do cliente | §2 |
| O que falta para a **paridade total**? | o inventário (`LTM-19`) primeiro; depois 9 stories de superfície e as 36 chaves inertes | §3 |
| Que decisões estão **esperando o founder**? | sete, e duas delas mudam escopo de verdade | §4 |

---

## 1. O que já funciona — entregue, commitado, provado

| Story | Commit | O que entrou | Status atual |
|---|---|---|---|
| `LTM-00` | `2026-11-16` | o app compila: cinco módulos recuperados, 55 erros de tipo | **Done** |
| `LTM-01` | `4edfc18c` | `half NOT NULL`, `is_divisible`, 4 índices de performance, **regime de migração versionada** (a pasta `drizzle/` não existia) | `InProgress` — AC2/AC3/AC5 (carga) e AC8 (FK) abertos |
| `LTM-02` | `b4d8765b` | driver transacional, `reserveSelectedNumbers` inteira em `db.transaction()`, predicado endereçado à **unidade vendável** | `Ready` (divergente — ver §7) |
| `LTM-03a` | `011b2305` | arcabouço de gateway multi-campo, `settle-order`, rota de webhook tokenizada, idempotência | `InReview` |
| `LTM-03b` | `29785b12` | adaptador Paysure: cria cobrança PIX, entende o aviso, tabela `pix_charges` | `InReview` |
| `LTM-05` | `e62c80ca` | suíte contra Postgres real em branch Neon efêmera, verificador de invariantes | `Ready` (divergente — ver §7) |
| `LTM-07` | `4d18f17a` | meia cota como domínio: `orders.unit`, `winners.winning_half`, **`prizeKind`/`prizeAmount`**, geração por unidade, rateio | `InReview` |

> **Um achado da `LTM-07` que vale mais que a story:** **não existia campo de prêmio em lugar nenhum** no lotemania. Os AC10 e AC12 eram inimplementáveis como escritos, e `prizeKind`/`prizeAmount` nasceram para que o rateio tivesse o que ratear. Um sorteio sem prêmio declarado não é um detalhe de interface.

### Estado real, medido — antes e agora

Fonte: leitura direta do código em 2026-11-19 (`find`/`grep` sobre `apps/lotemania/`), mais os Dev Records das stories acima. **Nada aqui foi executado** — a medição é estática por decisão, porque há implementação em curso disputando `.next` e a cota de branches do Neon.

| | 2026-11-16 | **2026-11-19** |
|---|---|---|
| Arquivos / linhas em `src/` | 187 · 14.462 | **203 · 21.747** |
| Suíte de teste | **zero** | **34 arquivos · 8.353 linhas · 263 verdes, 2 pulados** |
| `lint` · `typecheck` · `build` | 0 · 0 · 0 | **0 · 0 · 0** (43 rotas) |
| `db.transaction()` | **zero** em 14.462 linhas | **8 arquivos** no caminho do dinheiro |
| Índices de performance | **zero** `index()` em 33 tabelas | **4 `index()` + 14 `uniqueIndex`** em 34 tabelas |
| Migrações versionadas | **zero** — a pasta não existia | **4** (`0000_baseline` → `0003_ltm07_meia_cota_dominio`) |
| Fechamento de pedido | `TODO` no webhook | `settle-order` transacional + rota tokenizada + idempotência |
| Gateway | `paysure` **irrepresentável** nas duas listas | representável, credencial `ci`+`cs`, adaptador escrito |
| Meia cota | não existia | **domínio pronto**; superfície pendente (`LTM-08`) |
| Atribuição por pedido | nenhuma | **ainda nenhuma** — zero `utm_*`/`fbc`/`gclid` em `orders` |
| API de leitura para o ETL | não existe | **ainda não existe** — só `auth/*` e o webhook |
| Editor de sorteio | não medido | **45 campos, 36 sem nenhum leitor** |
| Reserva vencida | não medido | **não volta ao estoque** — `LTM-20`, P0, em implementação |

Deixou de ser andaime. É um caminho do dinheiro completo que ainda **não recebeu dinheiro real**.

> **A lição de medição de 2026-11-16 continua valendo, e foi usada de novo aqui:** nenhuma contagem de linha responde *"isto funciona?"*. O que mudou o diagnóstico naquele dia foram trinta segundos de `tsc --noEmit`; o que o mudou hoje foram os 263 testes dos Dev Records. As linhas da tabela acima são contexto, não prova. (`docs/research/2026-11-16-lotemania-build-health.md`)

### O que a migração tem que aguentar

Medido no BI do Império, **janela móvel de 7 dias, snapshot de 2026-11-16**. Os estruturais batem exatamente contra `apps/BI/imperio-premios/data-produto.json`: 100 números em 100% das rodadas, mediana de esgotamento 1,748 h, mínimo 0,3 h. **Os agregados andam a cada refresh — deriva é esperada, não é erro de medição.**

| | |
|---|---|
| Rodadas | **177** · 174 esgotadas · **100 números cada** |
| Esgotamento típico | **1,8 h** · o mais rápido em **18 min** (~5,5 números/minuto) |
| Pedidos pagos | **10.550** · R$ 639.325 · ticket médio R$ 61 |
| Rodadas ativas simultâneas | **5** · fluxo diário ≈ **R$ 90 mil/dia** |

O gargalo **não é volume** (~900 mil linhas/ano em `product_numbers` é trivial para Postgres *com índice*; até ~1,84 milhão na forma divisível). O gargalo é **contenção**: cem números finitos esgotando em minutos, cinco rodadas ao mesmo tempo.

---

## 2. O que falta para o primeiro sorteio de teste

A meta mais próxima continua sendo **um sorteio de teste do Império rodando no lotemania, já com a meia cota**. Falta isto, e só isto:

| # | Story | Por que bloqueia | Prioridade |
|---|---|---|---|
| 1 | **`LTM-20`** · reserva vencida travada | **Com este defeito um sorteio não consegue esgotar.** A varredura de expiração roda em um lugar só e filtra por **um comprador**: a reserva abandonada só é liberada se quem a fez voltar | **P0 — em implementação agora** |
| 2 | **`LTM-08`** · a meia cota na superfície | O founder pediu a meia cota **no** sorteio de teste. O domínio está pronto; sem grade partida, unidade nomeada e anúncio dos dois valores, o comprador não consegue comprar meia cota | P0 |
| 3 | **`LTM-14`** · o fluxo de compra | É a tela que o comprador vê depois de pagar. Sem ela o ciclo não fecha | P0 |
| 4 | **`LTM-21`** · a loja do comprador | Entrar e se cadastrar. Sem ela não há por onde entrar comprador novo | P0 |
| 5 | **`LTM-18` grupo A** | O operador configura o sorteio de teste nesta tela, e ela **aceita qualquer coisa sem obedecer** | P0 |
| 6 | **`LTM-17`** · relógio da reserva | Pedido direto do founder. Depende da decisão **D3** (§4) | P1 |
| 7 | **`LTM-01`** fechar AC2/AC3/AC5 | Os ACs de carga exigem base de 1 milhão de linhas. AC1 e AC7 já foram provados contra Postgres real em branch efêmera | P0 |
| 8 | **`ci`/`cs` do Império** | **Externo.** Trava o primeiro pagamento real (portão **G5**), não a implementação | bloqueio do cliente |

**O que não bloqueia o sorteio de teste:** `LTM-04` (atribuição e API), `LTM-09` (BI da frente nova), `LTM-06` (bordas de sessão) e toda a Frente B de paridade. Eles bloqueiam **o corte**.

---

## 3. O que falta para a paridade total

O mandato de 2026-11-18 é *"absolutamente tudo"* (§5). O que torna isso finito é o portão **G8** e a lista que ele exige.

| Story | O que é | Prioridade | Status |
|---|---|---|---|
| **`LTM-19`** | **O inventário completo da Sorteamos.** Primeira entrega do mandato — não se replica o que ninguém enumerou. Sessão 1 feita: 7 documentos em `docs/research/2026-11-18-inventario-sorteamos/` | **P0** | `Draft` |
| `LTM-10` | lista de compras: 5 abas, 2 buscas, ações por linha | P1 | `Draft` |
| `LTM-11` | o menu do sorteio — **14 ações, não 13** (ver §6) | P1 | `Draft` |
| `LTM-12` | painel de controle por sorteio | P1 | `Draft` |
| `LTM-13` | os três exports (2 CSV + 1 PDF), contrato de 25 colunas | P1 | `Draft` |
| `LTM-15` | as duas seções que faltam no catálogo | P2 | `Draft` |
| **`LTM-16`** | **a trilha de ação do operador** — pré-requisito compartilhado de `LTM-10`, `LTM-11` e `LTM-13`, que presumem uma auditoria que **não existe** em nenhuma das 34 tabelas | P1 | **`Ready`** |
| **`LTM-18`** | os 36 controles inertes do editor, em três grupos: A (ligar), B (8 telas), C (11 features) | P0 | `Draft` |
| `LTM-21` | a loja do comprador: entrar, cadastrar, navegar | P0 | `Draft` |
| **`LTM-22`** | verificação do telefone por SMS — **pós-lançamento por decisão do founder** | P3 | `Draft` |
| `LTM-04` | atribuição por pedido + API de leitura — **é o portão G3** | P0 | `Draft` |
| `LTM-09` | BI próprio da frente nova (`ADR-0002`) | P1 | `Draft` |
| `LTM-06` | as duas bordas de sessão que ficaram abertas | P1 | `Draft` |

**Fora deste epic, mas acoplado a ele:** `docs/stories/02-Platform/OPS-01-tarefas-agendadas-cegas.md` — as tarefas agendadas do ETL reportam sucesso enquanto falham. Importa aqui porque a evidência do portão **G3** (janela de leitura dupla) é produzida por esse mesmo agendamento. Um pipeline que mente sobre falhar não serve de prova de nada.

### O escopo da paridade cresceu ao ser observado

Três coisas que o inventário de 2026-11-18 revelou e que mudam tamanho, não detalhe:

1. **`instantPrizesEnabled` não é uma feature — é a porta de quatro.** `Títulos Premiados`, `Caixas Surpresas`, `Roletas Premiadas` e `Raspadinhas Premiadas` são mecânicas distintas, com tela própria, e **já têm tabela** no lotemania (`awarded_boxes`, `reward_spins`, `scratch_cards`, `bonus_game_plays`). O grupo C da `LTM-18` é maior do que a classificação original supôs.
2. **Na Sorteamos não existe sorteio sem gateway.** O provedor é por sorteio e **obrigatório na criação**. No lotemania, `paymentGatewayProvider` é `z.string().nullable()` sem validação e **ninguém lê**.
3. **Os padrões de criação da Sorteamos são o oposto do seguro:** público, na home, vendendo imediatamente, **1.000.000 de cotas**. Copiar os padrões é copiar o risco.

---

## 4. Decisões esperando o founder

Nenhuma destas é escolha de engenharia. Estão aqui nomeadas pelo que são, com o que já foi medido sobre cada uma, para serem decididas em vez de descobertas no corte.

| # | Decisão | O que está medido | O que depende dela |
|---|---|---|---|
| **D1** | **A segunda rota de pagamento.** O Império **não roda tudo na Paysure** | O BR Code de uma rodada observada ao vivo aponta para **`pix.banprime.com.br`**. O painel tem **dois** bancos cadastrados — `Banco paysure` e `PAY2M` — e a escolha é **por sorteio, obrigatória na criação** | Se as duas rotas precisam continuar, **falta um adaptador** que ninguém escreveu. Muda o escopo da Frente A e o portão **G5** |
| **D2** | **A barra de progresso editável** (`Porcentagem`) | Na Sorteamos, o operador ajusta e **fixa** a porcentagem de vendas exibida ao comprador, diferente da real | Replicar é **construir deliberadamente prova social fabricada**, e colide com `.claude/rules/claims-ledger.md`. O mandato manda replicar tudo; o risco é do negócio do cliente |
| **D3** | **O relógio da reserva** | Sorteamos: 3, 4, 5, 10, **30** min, 1 h, 3 h, 1 dia (oito). lotemania: 10, **15**, 30, 60, 120 (cinco). **O 15 é invenção nossa** — não existe na Sorteamos. O founder pediu *"15 ou 30"*; **30 existe nas duas** | Paridade estrita adota as oito e **remove o 15**. É o AC1 da `LTM-17` |
| **D4** | **Exclusão de sorteio** | **A Sorteamos não exclui sorteio** — procurado em seis lugares. Um sorteio criado é permanente para o operador. É o que explica os **10.774** sorteios na conta do Império | Paridade estrita significa o lotemania **também** não oferecer exclusão. É decisão de produto séria, não detalhe copiado |
| **D5** | **Identidade visual (B1) e Analytics (B2)** | A identidade da Sorteamos **é o Minimal UI**, template admin comercial com paleta verde por cima (provado pelos `ic_*.svg`, pela Public Sans e pela rota de demonstração deixada no bundle). A tela `/dashboard/analytics` exibe **dados fictícios do template, intocados** — "Bug Reports 234", Jan '03 a Oct '03 | B1: adotar o mesmo template, ou tratar "idêntico" como "equivalente em função". B2: clonar andaime não é paridade — construir analytics de verdade ou remover o item do menu |
| **D6** | **Retenção do dado pessoal do aviso de pagamento** | `payer_name` e `payer_document` (**CPF**) chegam no corpo do aviso da Paysure, e o corpo inteiro é gravado em `payment_webhook_events.payload` | Portão **G7**. Precisa ser decidido **antes do primeiro aviso real**, não depois |
| **D7** | **O sorteio de teste deixado na Sorteamos** | `ZZ TESTE TECNICO - NAO COMPRAR` existe, privado, agendado para **18/11/2027**, sem caminho de compra. **Não pôde ser excluído porque a Sorteamos não exclui** | Três caminhos: deixar como está (menor risco), pedir ao suporte do fornecedor, ou encerrar. Abrir chamado no fornecedor **do cliente** é decisão dele |

### Uma decisão já tomada, com uma consequência que fica aberta

**SMS fica para depois do lançamento** (founder, 2026-11-19 — `LTM-22`). O login do lotemania passa a ser **telefone + senha**.

> **A consequência precisa estar escrita:** sem SMS, **o telefone não é verificado** — e o telefone **é a identidade do comprador** neste produto. É por ele que se entra, é por ele que o título é dele, é por ele que o ganhador é encontrado. Alguém pode se cadastrar com um número que não é seu. **Isso é escolha consciente de prazo, não descuido**, e fecha com a `LTM-22`.

---

## 5. O mandato, em três decisões do founder

| Data | Decisão | O que sobrevive dela hoje |
|---|---|---|
| **2026-11-16** | A meta deixa de ser paridade e passa a ser **sorteio de teste rodando**, com a meia cota. Só `paysure`. Frente B desce de prioridade | **Parcialmente superada.** O sorteio de teste continua sendo a meta mais próxima (§2). O "só paysure" foi **medido falso como premissa** — ver §6.1. A despriorização da Frente B foi revertida em 11-18 |
| **2026-11-18** | *"quero que implemente **todas as 36 features** e **tudo que tem na Sorteamos** — absolutamente tudo deve ser replicado"*. Os sorteios hoje no lotemania são **descartáveis** | **Vigente.** Frente B volta a ser o mandato. O portão **G8** é o teste que encerra a lista. `LTM-19` é a primeira entrega |
| **2026-11-19** | **SMS fica para depois do lançamento** (`LTM-22`). Login por telefone + senha | **Vigente.** E traz a consequência do telefone não verificado (§4) |

**Por que os sorteios descartáveis importam mais do que parece.** Era o risco **[Alto]** da `LTM-18`: sorteio existente tem configuração gravada que **nunca teve efeito**, e ligar os leitores faria esses valores passarem a valer de repente — um `maxPerBuyer = 1` salvo por engano recusaria a segunda compra de todo mundo. A decisão **elimina o risco inteiro**, não o mitiga: sem sorteio real no banco, não há configuração herdada para obedecer. E **tem prazo**: vale até o primeiro sorteio de verdade existir. É o mesmo tipo de liberdade que a ausência de venda real deu ao modelo de dados em 11-16 — e aquela janela **já foi usada** pelo `ADR-0001`.

**O que não muda:** a fundação continua na frente. Sem fechar pedido pago, nenhuma configuração do mundo faz o lotemania vender. A paridade total é **o destino**; a fundação é **o caminho**.

### A meia cota — o contrato vigente (`ADR-0001`)

A metade é uma **linha**, não uma coluna. `product_numbers` tem uma linha por **unidade vendável**; num sorteio divisível a unidade é a metade, e comprar inteiro é reservar as duas linhas na mesma instrução. Isso preserva **intacta** a propriedade que torna a reserva correta — um dono por linha — em vez de substituí-la por travamento explícito justo quando a contenção dobra. **Entregue na `LTM-07`** (`4d18f17a`); falta a superfície (`LTM-08`).

| | |
|---|---|
| Prêmio | só em sorteio de **dinheiro**; o sistema recusa os outros |
| Preço | metade custa **metade exata**, sem ágio |
| Escopo | **por sorteio**, nunca por título · divisibilidade congela na **primeira venda** |
| Fusão | duas metades do mesmo dono **não se fundem** |
| Metade órfã | quem tem a metade vendida leva o **prêmio inteiro** |
| Ganhador | **uma linha de `winners` por pessoa**, valor já rateado |
| Unidade | **uma por sorteio, sempre nomeada** na interface |
| Grade · Relatório · Anúncio | **célula partida** · metade **sempre marcada** · os **dois** valores lado a lado |
| `quantity` | conta **o que o pedido contém** (metades, em sorteio divisível), **e** o pedido carrega **campo explícito de unidade** (`orders.unit`), que quem agrega tem de ler |

---

## 6. Onde este epic estava errado

Cada item abaixo era afirmação deste documento. Está aqui porque apagar em silêncio uma afirmação errada é perder a razão pela qual ela era crível.

1. **"Só a `paysure` importa"** *(B3, decisão de 2026-11-16)* — **errada como premissa, não como decisão.** O founder decidiu reduzir o escopo de 19 gateways para um; o que o epic supôs em seguida é que a Paysure **cobre a operação do Império**. Não cobre: o BR Code de uma rodada observada ao vivo em 2026-11-19 aponta para `pix.banprime.com.br`, e o painel tem `Banco paysure` **e** `PAY2M`. A `LTM-03b` entregou a Paysure; se as duas rotas continuam, **falta um adaptador** (decisão **D1**).

2. **"A `LTM-07` não toca `reserve.ts`"** — **errada.** Esse recorte foi o argumento que tirou a `LTM-07` da onda 2 e a pôs na onda 3. Na implementação, o @dev precisou de **uma linha** em `reserve.ts` para o AC7 passar (preço indivisível, que `reserve.ts:264-267` delegava à `LTM-07` sem a story mencionar). O recorte sobreviveu por **sorte** — as duas não rodaram juntas —, mas a premissa que formou a onda era falsa. Serializar `reserve.ts` por ondas deixou de ser precaução e passou a ser a regra (§8).

3. **"Atribuição sem perda de campo"** *(portão G3 e KPI)* — **mal especificada.** A Sorteamos **declara 13 campos de rastreio** no `order.paid` e os entrega **vazios em 100% dos pedidos reais**, inclusive em 25 pedidos com clique de anúncio confirmado; pela API REST, `UTM_Source` vem vazio em **99,6%**. "Sem perda de campo" é satisfeito trivialmente entregando vazio igual. **Paridade é o piso errado para atribuição:** o entregável da `LTM-04` é o campo **preenchido**, e é por isso que `apps/utm-capture-imperio` existe. G3 e o KPI foram reescritos (§9 e §11).

4. **"O menu do sorteio tem 13 ações"** *(`LTM-11`)* — **são 14.** Faltava `Números`. Observado em 2026-11-18.

5. **A tabela de estado de 2026-11-16** — **envelhecida inteira**, e isso é o processo funcionando. "Zero índice", "zero transação", "zero teste", "zero migração", "o webhook é um `TODO`", "`paysure` não existe em nenhuma das duas listas": **todas falsas hoje**. Ficam registradas em §1 como coluna "antes", porque são a linha de base contra a qual o progresso se mede.

6. **"Frente B: 3 decisões pendentes (B1/B2/B3)"** — B3 era decisão **já tomada** (e agora corrigida pelo item 1). Pendentes são B1 e B2, hoje consolidadas em **D5**.

### Correções de rumo que já se fecharam

- **O AC11 circular da `LTM-03`** (o adaptador exigia aviso real; o aviso exigia credencial; a credencial estava num portão posterior) — desfeito pela documentação oficial da Paysure (`docs/research/2026-11-16-paysure-contrato.md`), e **quatro premissas do código caíram com ele**: não existe assinatura HMAC (o `x-webhook-signature` era invenção, e rejeitaria 100% dos avisos), a credencial são **dois** cabeçalhos, o `webhookSecret` **não tem destinatário**, e a idempotência **já existe nos dois sentidos**. A autenticidade mora na URL — token opaco por tenant, em segmento de caminho. **`LTM-03a` e `LTM-03b` entregues.**
- **A incoerência de `quantity` no `ADR-0001`** — fechada: `quantity` conta o que o pedido contém, **e** o pedido carrega unidade explícita. Entregue como `orders.unit` na `LTM-07`.
- **A contradição da onda 2** (*Ordem recomendada* dizia `LTM-02` + `LTM-07`; a nota de ondas dizia `LTM-02` sozinha) — resolvida em 11-17 e vencida pelos fatos: as duas já foram implementadas em ondas separadas.
- **`product_numbers.order_id` não tem FK para `orders`** — é por isso que "número órfão" é alcançável. Continua sendo o **AC8 aberto** da `LTM-01`: a decisão de criar ou não a FK é de @architect/@data-engineer, e a story exige **registrá-la**, não adiá-la.

---

## 7. Divergência de status — registro, não correção

`Ready → InProgress → InReview` é do @dev; `InReview → Done` é do @qa (`.claude/rules/story-lifecycle.md`). **O @pm registra, não corrige.**

| Story | Status no arquivo | O que o git diz | Divergência |
|---|---|---|---|
| `LTM-02` | `Ready` | código em `b4d8765b` | **sim** — implementada e commitada, ainda marcada como pronta para começar |
| `LTM-05` | `Ready` | suíte em `e62c80ca`, 34 arquivos rastreados | **sim** — idem |
| `LTM-01` | `InProgress` | `4edfc18c` + AC1/AC7 provados em `46284e2f` | **parcial** — o status está certo (AC2/AC3/AC5/AC8 abertos), mas **os checkboxes de AC1 e AC7 não foram marcados** e o changelog para na v1.4 |
| `LTM-03a`, `LTM-03b`, `LTM-07` | `InReview` | implementadas | coerente — esperando @qa |
| `LTM-20` | `Draft` | implementação em curso na árvore de trabalho | **sim** — trabalho em voo sobre story em `Draft` |
| `LTM-03` | `Superseded` | repartida em `03a`/`03b` | coerente |

**O @po já apontou o padrão.** Ele tem causa conhecida: quando a implementação e a documentação saem no mesmo commit, o campo `Status` é a única linha que ninguém relê. A correção é do @dev e do @qa; o que cabe aqui é não deixar o epic afirmar `Ready` sobre código que já roda.

---

## 8. Sequenciamento e ondas

```
LTM-00 (compila) ✅ ──► LTM-01 + LTM-05 ✅ ──► LTM-02 ✅ ──► LTM-03a ✅ ──► LTM-03b ✅
                                                        └──► LTM-07 ✅
AGORA:  LTM-20 (defeito P0, sozinha)
        ├─► depois, EM SÉRIE: LTM-04 → LTM-17 → LTM-21 → LTM-18 grupo A
        └─► EM PARALELO (arquivos disjuntos): LTM-08, LTM-14, LTM-16, LTM-09, LTM-19
```

### `reserve.ts` é o recurso disputado — e isso define as ondas

`src/lib/actions/reserve.ts` (com `src/lib/validations/reserve.ts`, onde mora `reservationMinutesFor`) é reivindicado por **cinco** stories ainda abertas:

| Story | O que faz nele |
|---|---|
| **`LTM-20`** | separa as duas funções de expiração — o escopo por comprador é o defeito |
| **`LTM-04`** | grava a atribuição na mesma transação do pedido |
| **`LTM-17`** | o corpo de `reservationMinutesFor` — que vive em `validations/reserve.ts:149`, **não** em `actions/` |
| **`LTM-21`** | a mensagem de conflito de reserva |
| **`LTM-18`** | seis campos do grupo A |

**Elas vão em série. Não formam onda, em nenhuma combinação** (`.claude/rules/parallel-waves.md`, condição 2: conjuntos de `Files` disjuntos). A ordem recomendada é **`LTM-20` → `LTM-04` → `LTM-17` → `LTM-21` → `LTM-18` grupo A**: o defeito primeiro porque sem ele nenhum sorteio esgota; `LTM-04` em seguida porque é o portão G3 e tem o caminho mais longo; `LTM-18` por último porque seis dos seus campos pressupõem o arquivo estável.

> **A `LTM-17` tem uma armadilha de propriedade já documentada:** seu bloco `Files:` aponta `actions/reserve.ts`, mas o corpo que ela precisa mudar está em `validations/reserve.ts` — arquivo **declarado pela `LTM-02`**. É o mesmo defeito, no mesmo arquivo, pelo qual a `LTM-02` levou 6,5 em 17-11. Corrigir o bloco `Files:` é pré-condição do despacho.

### O que pode rodar em paralelo

| Onda | Stories | Por que são disjuntas |
|---|---|---|
| Paralela a `reserve.ts` | **`LTM-16`** (`src/lib/audit/`, novo + migração) | nenhuma das 34 tabelas é trilha de auditoria; árvore própria |
| Paralela | **`LTM-08`** (grade, interface da meia cota) | superfície; cuidado com `number-grid.tsx`, disputado com `LTM-02` |
| Paralela | **`LTM-14`** (telas do fluxo de compra) | ⚠️ toca `pedido/[orderId]/page.tsx`, compartilhado com `LTM-17` |
| Paralela | **`LTM-09`** (`services/Meta/`, `apps/BI/`) | três árvores disjuntas de `apps/lotemania/`; `ADR-0002` |
| Paralela | **`LTM-19`** (pesquisa, zero código) | só escreve em `docs/research/` |

- ⚠️ **Recurso mutável compartilhado:** `drizzle/meta/_journal.json`. Qualquer story que gere migração o toca, e dois `drizzle-kit generate` concorrentes colidem. **Serializar a geração de migração** mesmo quando as stories rodam em paralelo.
- ⚠️ **Base de dados:** a suíte usa branch Neon efêmera por execução. **A cota de branches do Neon é recurso finito** — duas ondas rodando a suíte ao mesmo tempo disputam o mesmo recurso. Declarar na brief de cada implementador.

---

## 9. Portões de "pronto para migrar o cliente"

A migração do Império só é autorizada quando os portões abaixo estiverem verdes. Nenhum é opinião.

| Portão | Critério | Como se comprova | Estado |
|---|---|---|---|
| **G0 — Compila** | `lint`, `typecheck` e `build` verdes | `LTM-00` Done | ✅ |
| **G1 — Fundação** | `LTM-01`, `02`, `03a`, `03b`, `04`, `05`, **`20`** em Done | suíte verde + verificador de invariantes passando no cenário de concorrência | 🟡 código entregue em 6 de 7; nenhuma em Done; `LTM-20` em implementação |
| **G2 — Superfície do operador** | zero tela vazia no caminho do operador; os três exports reproduzidos | checklist item a item | ⬜ |
| **G3 — Atribuição e BI** | o ETL e o CAPI leem o lotemania com **campo preenchido**, não apenas declarado | janela de leitura dupla: mesmo período, mesmo faturamento, mesma contagem de pedidos pagos **e taxa de preenchimento de atribuição maior que a da Sorteamos** (que é ~0%). Evidência mora na `LTM-09` (`ADR-0002`) | ⬜ |
| **G4 — Carga** | cenário medido em staging: **5 rodadas simultâneas de 200 metades**, esgotando no ritmo do pior caso real (~5,5 unidades/minuto) | zero oversell, zero pedido órfão, **zero unidade vendável com dois donos** — não "zero número": em sorteio divisível o mesmo número tem dois donos legítimos. Verificador da `LTM-05`, **chavado na unidade** | ⬜ |
| **G5 — Dinheiro real** | ao menos **um** pedido pago ponta a ponta com PIX real, em produção, em sorteio de teste | pedido `paid`, unidades `sold`, `banking_transactions` com o crédito, aviso casado | ⬜ bloqueado pelo `ci`/`cs` do cliente |
| **G6 — Reversão** | plano de volta à Sorteamos escrito **e exercitado uma vez** | registro do ensaio com tempo medido | ⬜ |
| **G7 — Dado pessoal** | a política de 2026-11-12 respeitada (`docs/ESTADO-ATUAL.md` §1-A) e a **retenção do CPF do aviso decidida** (D6) | nenhum CPF, telefone, e-mail ou nome em artefato versionado; varredura antes de cada commit | ⬜ |
| **G8 — Paridade total** | pegar os sorteios que a Sorteamos tem **hoje**, com a configuração que têm **hoje**, recriá-los no lotemania, e **cada controle se comportar igual** | exercício que passa ou falha, contra a lista da `LTM-19`. Não é opinião sobre o que falta | ⬜ |

**G1 a G5 são bloqueantes para o corte. G6 e G7 são bloqueantes para o commit do corte. G8 é o que encerra a lista do mandato de 2026-11-18** — e não bloqueia o sorteio de teste.

---

## 10. Histórico de validação do @po

| Data | Story | Nota | Veredicto | Efeito |
|---|---|---|---|---|
| 11-16 | `LTM-01`, `02`, `04`, `05` | 9/10 | GO | → `Ready` |
| 11-16 | `LTM-03` | 6,5/10 | NO-GO | repartida em `03a` + `03b` |
| 11-17 | `LTM-01`, `02`, `04`, `05` | 5 a 6/10 | **NO-GO** | revertidas a `Draft` — o `ADR-0001` trocou a unidade vendável |
| 11-17 | `LTM-03a` | 8,5/10 | GO | → `Ready` |
| 11-17 (2ª) | `LTM-01`, `LTM-05` | 8,5/10 | GO | → `Ready` — onda 1 liberada |
| 11-17 (2ª) | `LTM-02`, `LTM-07` | 6,5/10 | NO-GO | corrigidas e liberadas depois |
| 11-17 (2ª) | `LTM-04` | 5,5/10 | NO-GO | **ainda `Draft`** — 7 de 8 correções abertas |
| 11-18 | `LTM-16` | 8,5/10 | GO | → `Ready` |
| 11-18 | `LTM-17` | 6,5/10 | NO-GO | → `Draft`; o `Ready` havia sido posto por quem não tinha a autoridade |

**O defeito mais grave da revalidação de 11-17 não era o esperado.** A suspeita registrada era *"a suíte da `LTM-05` provaria invariantes que deixam de valer"* — verdade, e o menor dos dois problemas. O maior: o **verificador de invariantes**, que todas as outras stories herdam, nasceria chavado no **número** em vez de na **unidade vendável** — e um verificador chavado no número **acusa violação quando o sistema está certo**, porque em sorteio divisível o mesmo número associado a dois pedidos é o estado correto. Um invariante determinísticamente vermelho com o sistema certo é pior que intermitente, e é ele que o portão **G4** usa como prova.

---

## 11. KPIs de sucesso do epic

- [ ] Reserva em sorteio com 1 milhão de linhas em `product_numbers` sem `Seq Scan` (`EXPLAIN`) — **`LTM-01` AC2, aberto**
- [x] 100% do caminho do dinheiro dentro de transação — zero compensação manual no código (`LTM-02`, `LTM-03a`)
- [x] Evento de webhook reentregue 5× produz **1** pedido pago e **1** lançamento bancário (`LTM-03a`, coberto por teste)
- [ ] Todo campo de atribuição que o `client_api.py` lê hoje **chega preenchido** no lotemania — **não "existe": preenchido** (ver §6.3)
- [x] Suíte roda contra Postgres de verdade e cobre o ramo de falha de cada arquivo do caminho do dinheiro — **263 verdes, 2 pulados**
- [ ] Um sorteio consegue **esgotar**: toda reserva vencida volta ao estoque sem depender de quem a fez voltar — **`LTM-20`**
- [ ] Cada controle do editor que o operador vira muda alguma coisa de verdade — **36 ainda não mudam nada**

---

## 12. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| **A segunda rota de pagamento descoberta no corte** | **Alto** | D1 (§4). O Império usa `pix.banprime.com.br` numa campanha ao vivo; a Paysure sozinha não cobre a operação |
| Perda de atribuição no dia do corte cega o CAPI e o BI | **Alto** | G3 exige janela de leitura dupla **antes** do corte, e agora mede **preenchimento**, não declaração |
| Corte com paridade incompleta derruba o faturamento do cliente | **Alto** | G8 bloqueante do corte; `LTM-19` transforma "absolutamente tudo" em lista conferível |
| **`reserve.ts` reescrito por duas stories na mesma onda** | **Alto** | Série obrigatória (§8). Já houve uma premissa falsa de disjunção neste arquivo (§6.2) |
| **Telefone não verificado sendo a identidade do comprador** | **Médio** | Escolha consciente de prazo (founder, 11-19). `LTM-22` fecha depois do lançamento |
| CPF do pagador em `payment_webhook_events` sem política de retenção | **Médio** | G7 + D6, antes do primeiro aviso real |
| Replicar a barra de progresso editável | **Médio** | D2. Nomeado pelo que é; a decisão é do dono do negócio |
| Índice criado em tabela grande na importação do histórico | **Médio** | criar os índices **antes** de importar, com a tabela vazia (feito na `LTM-01`) |
| Adaptador de gateway escrito sobre premissa errada | **Médio** | já aconteceu uma vez nesta base (o `x-webhook-signature` inventado). A `LTM-03b` exige conferir contra o primeiro aviso real |
| Decidir o grupo C da `LTM-18` por dedução | **Médio** | `instantPrizesEnabled` é a porta de quatro mecânicas, nenhuma observada por dentro. `LTM-19` antes de ligar |

---

## Referências

- App: `apps/lotemania/` · levantamento inicial em `apps/lotemania/README.md`
- **Inventário da Sorteamos (sessão 1, 2026-11-18)** — `docs/research/2026-11-18-inventario-sorteamos/`: `README.md`, `editor-14-abas.md`, `menu-lista-de-compras.md`, `painel-telas.md`, `webhook-saida-contrato.md`, `loja-comprador.md`, `fluxo-de-compra.md`
- Pesquisa anterior: `2026-11-16-baseline-sorteamos/`, `2026-11-16-paysure-contrato.md`, `2026-11-16-lotemania-build-health.md`, `2026-11-17-painel-sorteamos-editor.md`, `2026-11-17-painel-acoes-por-sorteio.md`, `2026-11-17-paridade-visual-loja.md`
- Decisões: `docs/architecture/adr/0001-meia-cota-como-linha.md` · `0002-frente-nova-medida-a-parte.md` · `GLOSSARY.md` (raiz)
- Estado do sistema e política de dado pessoal: `docs/ESTADO-ATUAL.md`
- ETL que hoje lê a Sorteamos: `services/Meta/imperio-premios/client_api.py` · CAPI: `apps/webhook-imperio-capi/api/order-paid.js` · UTM própria: `apps/utm-capture-imperio/api/capture.js`
- Stories: `docs/stories/03-Product/EPIC-LTM-Imperio-Migration/` · acoplada: `docs/stories/02-Platform/OPS-01-tarefas-agendadas-cegas.md`

---
*A plataforma que não vende não migra. A que vende errado migra o erro junto.*
