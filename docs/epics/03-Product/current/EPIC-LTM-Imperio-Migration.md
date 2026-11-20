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

**A fundação saiu do papel.** Em três dias o caminho do dinheiro passou de andaime a código commitado e testado: seis stories entregues, **263 testes verdes contra Postgres real** (eram zero), `lint`/`typecheck`/`build` em 0. O que trava agora **não é mais a fundação** — é um defeito P0 em implementação (`LTM-20`) e a superfície que o sorteio de teste exige.

**As sete decisões que esperavam o founder foram respondidas em 2026-11-19** (§4), mais duas que nem estavam na lista. Três delas **criaram story nova** — `LTM-24`, `LTM-25`, `LTM-26`. A `LTM-25` nasceu travada e **foi destravada no mesmo dia**: o founder decidiu sobre ela sem saber que a proteção em questão já estava construída, foi avisado, e **confirmou**.

| A pergunta | A resposta curta | Onde |
|---|---|---|
| O que já funciona? | reserva atômica, fechamento de pedido, PIX na Paysure, meia cota no domínio, suíte real, migração versionada | §1 |
| O que falta para o **sorteio de teste**? | `LTM-20` (defeito P0), `LTM-08`, `LTM-14`, `LTM-17`, `LTM-18` grupo A, `LTM-21`, **`LTM-27`** — e o `ci`/`cs` do cliente | §2 |
| Qual a lacuna **nova**, de 11-19? | **não existe como registrar ganhador.** O rateio da `LTM-07` está escrito e **ninguém o chama** | §2-A |
| O que falta para a **paridade total**? | o inventário (`LTM-19`) primeiro; depois 12 stories de superfície e as 36 chaves inertes | §3 |
| O que o founder **decidiu** em 11-19? | **nove** decisões, três delas viram story nova | §4 |
| O que **continua** pendente dele? | **três**, e duas são de uma linha: a identidade visual, o nome na tela do pedido, e o telefone no modal de Checkout | §4 |

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
| **Registro de ganhador** | não medido | **domínio pronto, acionador inexistente** — `recordWinnersForDrawnTitle` só é importado por um teste. `LTM-27`, P0 (§2-A) |

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
| 6 | **`LTM-17`** · relógio da reserva | Pedido direto do founder. **Destravada** pela decisão **D2** de 11-19 (§4): adota as 8 janelas da Sorteamos e remove o 15 | P1 |
| 7 | **`LTM-01`** fechar AC2/AC3/AC5 | Os ACs de carga exigem base de 1 milhão de linhas. AC1 e AC7 já foram provados contra Postgres real em branch efêmera | P0 |
| 8 | **`LTM-27`** · **registrar o ganhador** | **Não existe como registrar ganhador no lotemania.** O rateio da `LTM-07` está escrito e **ninguém o chama** — ver §2-A | **P0** |
| 9 | **`ci`/`cs` do Império** | **Externo.** Trava o primeiro pagamento real (portão **G5**), não a implementação | bloqueio do cliente |

### 2-A. A lacuna que o ensaio geral descobriu — **`LTM-27`**

O ensaio da corrente ponta a ponta (`docs/stories/03-Product/EPIC-LTM-Imperio-Migration/ENSAIO-GERAL.md`, commit `34100633`) encontrou o elo que falta, e ele não está no meio da corrente — **está no fim**.

**Não existe caminho de produção que registre um ganhador.** Medido no código em 2026-11-19:

| | |
|---|---|
| A função existe | `recordWinnersForDrawnTitle` — `src/lib/raffles/winners.ts:68` |
| O rateio existe | `splitPrizeAmongHalves` — `src/lib/raffles/prize-split.ts:77`, chamado em `winners.ts:204` |
| A escrita existe | `insert(winners)` — `winners.ts:211` |
| A loja **já lê** os ganhadores | `loja/[tenant]/ganhadores/page.tsx:34` e `loja/[tenant]/[productSlug]/page.tsx:63` |
| **Quem chama a função, em produção** | **ninguém.** O **único** importador em todo o repositório é um teste: `tests/money-path/half-quota-domain.test.ts:42` |

**Então o estado é este:** o domínio do prêmio foi entregue pela `LTM-07` — `winners.winning_half`, `prizeKind`/`prizeAmount`, geração por unidade, rateio da metade órfã — **e não tem acionador**. Nenhuma tela, nenhuma server action, nenhuma rota. A loja tem duas páginas que consultam `winners` e **que sempre mostrariam vazio**.

> **Por que isto é P0 e não P1.** O sorteio de teste tem a meia cota como objetivo declarado do founder, e **o prêmio rateado é a razão pela qual a meia cota existe** (`ADR-0001`: *metade órfã → quem tem a metade vendida leva o prêmio inteiro*; *uma linha de `winners` por pessoa, valor já rateado*). Sem acionador, **o ensaio ponta a ponta termina no encerramento do sorteio — que é meio sorteio.** Vende, cobra, fecha o pedido, e não entrega o prêmio a ninguém.
>
> E é a mesma classe de defeito que esta frente já catalogou três vezes (`LTM-17`, tabela das três ocorrências) com um grau a mais: ali eram **campos de configuração sem leitor**; aqui é **domínio de negócio sem acionador**. A `LTM-18` cunhou a frase que serve: *controle ausente é falta de paridade; controle inerte é informação falsa.* Uma loja que anuncia uma seção de ganhadores permanentemente vazia é a versão pública disso.

**A story está sendo escrita agora pelo agente que fez o ensaio**, modelada nas telas da Sorteamos que o founder enviou. O que este epic registra é o **lugar dela**: `LTM-27`, **P0 da Frente A**, e o que ela tem de alcançar:

- o acionador que falta — a tela/ação do operador que o `Definir ganhadores` da Sorteamos ocupa (menu ⋮ da linha do sorteio, item 4 de 4 — `README.md` §2 do inventário);
- chamar `recordWinnersForDrawnTitle` **de produção**, não de teste;
- fazer as duas páginas de loja que já leem `winners` passarem a ter o que mostrar.

⚠️ **Duas arestas já conhecidas, para a story não as descobrir no meio:**

1. **`Definir ganhadores` é ação mutante na Sorteamos** e **nunca foi observada por dentro** — ela cria ganhador. A `LTM-19` registra que o sorteio de observação existe e **continua no ar pela decisão `D5`**, então há instrumento para observá-la. **`AC7` da `LTM-18` vale aqui:** nada de comportamento inventado no caminho do prêmio.
2. **`winners.product_id` tem `onDelete: "cascade"`** (`raffles.ts`), e a **`LTM-26`** depende disso: excluir sorteio apagaria ganhador em silêncio. As duas stories se encontram nessa linha, e o `AC5` da `LTM-26` já a nomeia.

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
| `LTM-04` | atribuição por pedido + API de leitura — **é o portão G3**. **Cresceu em 11-19** (decisão **D8**): a tela de Analytics e os **13** campos de `params` entram no escopo | P0 | `Draft` |
| `LTM-09` | BI próprio da frente nova (`ADR-0002`) | P1 | `Draft` |
| `LTM-06` | as duas bordas de sessão que ficaram abertas | P1 | `Draft` |
| **`LTM-24`** | **o adaptador do segundo gateway** — decisão **D1** de 11-19. Irmã da `LTM-03b`, sobre o arcabouço da `LTM-03a`. A primeira tarefa é **descobrir qual é o provedor** | **P0** | `Draft` |
| **`LTM-25`** | **remover o mascaramento do dado pessoal do aviso** — decisão **D6** de 11-19, **confirmada**. Vale executar **antes do primeiro aviso real** | P2 | `Draft` |
| **`LTM-26`** | **excluir sorteio sem vendas** — decisão **D7** de 11-19. **Diverge da Sorteamos de propósito** | P2 | `Draft` |

**Fora deste epic, mas acoplado a ele:** `docs/stories/02-Platform/OPS-01-tarefas-agendadas-cegas.md` — as tarefas agendadas do ETL reportam sucesso enquanto falham. Importa aqui porque a evidência do portão **G3** (janela de leitura dupla) é produzida por esse mesmo agendamento. Um pipeline que mente sobre falhar não serve de prova de nada.

### O escopo da paridade cresceu ao ser observado

Três coisas que o inventário de 2026-11-18 revelou e que mudam tamanho, não detalhe:

1. **`instantPrizesEnabled` não é uma feature — é a porta de quatro.** `Títulos Premiados`, `Caixas Surpresas`, `Roletas Premiadas` e `Raspadinhas Premiadas` são mecânicas distintas, com tela própria, e **já têm tabela** no lotemania (`awarded_boxes`, `reward_spins`, `scratch_cards`, `bonus_game_plays`). O grupo C da `LTM-18` é maior do que a classificação original supôs.
2. **Na Sorteamos não existe sorteio sem gateway.** O provedor é por sorteio e **obrigatório na criação**. No lotemania, `paymentGatewayProvider` é `z.string().nullable()` sem validação e **ninguém lê**.
3. **Os padrões de criação da Sorteamos são o oposto do seguro:** público, na home, vendendo imediatamente, **1.000.000 de cotas**. Copiar os padrões é copiar o risco.

---

## 4. As decisões do founder — nove respondidas em 2026-11-19

As sete decisões que esperavam o founder foram respondidas, mais duas que não estavam nesta seção: a grade da loja (**D4**) e o mascaramento do telefone na tela do pedido (**D9**). **A seção deixou de ser uma fila de espera e passou a ser um registro.**

> ### ⚠️ A numeração mudou, e confundir as duas custa escopo
>
> O founder respondeu numerando de **D1 a D8** na ordem em que as perguntas lhe foram feitas — que **não é** a ordem em que esta seção as listava. A tabela abaixo é a numeração **dele**, que passa a ser a canônica, com a antiga ao lado. Qualquer referência a *"D3"* escrita antes de 2026-11-19 neste repositório significa **o relógio da reserva**, que hoje é a **D2**.

| # | Era | A decisão | **A resposta, 2026-11-19** | Onde aterrissa |
|---|---|---|---|---|
| **D1** | D1 | A segunda rota de pagamento. O Império **não roda tudo na Paysure** | **Construir o segundo adaptador** | **`LTM-24`** (nova). Portão **G5** passa a exigir evidência **por rota contratada** |
| **D2** | D3 | O relógio da reserva — Sorteamos tem oito valores, lotemania tem cinco, e **o 15 é invenção nossa** | **Adotar as 8 da Sorteamos** (3, 4, 5, 10, 30 min, 1 h, 3 h, 1 dia) — **remove o 15** | `LTM-17`: muda o seletor, o default e o AC da faixa da Paysure |
| **D3** | D2 | A barra de progresso editável (`Porcentagem`) | **Replicar — é ferramenta do cliente** | `LTM-18`, grupo **C** (era terreno de dúvida; vira escopo de construção) |
| **D4** | — | As colunas da grade da loja. **Medi 7** em duas campanhas de 100 números; a instrução de 11-17 era 6 | **Manter 6 colunas** | `loja-comprador.md`. A hipótese da grade responsiva **continua não confirmada** e **deixa de ser bloqueio** |
| **D5** | D7 | O sorteio de teste deixado na Sorteamos (`ZZ TESTE TECNICO`), que não pôde ser excluído porque a Sorteamos não exclui | **Deixar como está** | `LTM-19` e `README.md` §10 do inventário. Dos três caminhos, sobrou um |
| **D6** | D6 | Retenção do CPF e do nome do pagador que chegam no aviso de pagamento | **Igual à Sorteamos, sem mascarar nada** — e **confirmado** depois de ser avisado de que isso significa remover proteção já entregue | **`LTM-25`** (nova). ✅ **Destravada** — ver abaixo |
| **D7** | D4 | Exclusão de sorteio — a Sorteamos **não exclui**, e é o que explica os 10.774 sorteios na conta | **Permitir excluir sorteio sem vendas** — diverge da Sorteamos **a favor do operador** | **`LTM-26`** (nova) |
| **D8** | D5 (metade B2) | Analytics / atribuição | **Junto com a `LTM-04`, antes do corte** | `LTM-04`: a tela de Analytics entra no escopo, e com ela os **13** campos de `params` |
| **D9** | — | Mascaramento do **telefone** do comprador. A paridade aqui aponta para o lado **contrário**: a Sorteamos **mascara** nas duas telas públicas | **Telefone inteiro, mas só na tela do próprio pedido.** Cartão de ganhador **continua mascarado** | `LTM-14` (AC5, em implementação). Pergunta em aberto no modal de Checkout da `LTM-21` |

### A D6 foi confirmada, e isso merece ficar escrito

O founder respondeu *"igual à Sorteamos, sem mascarar nada"* **antes** de saber que o mascaramento **já existia, já estava implementado e já estava coberto por teste** desde a `LTM-03a` (`src/lib/payments/redact.ts`, `AC-G2`, marcado `[x]`). Ele foi informado disso **depois** de responder, com todas as letras: a decisão não é *"deixar de construir uma proteção"* — é **remover uma proteção entregue**, e ele podia reverter sem custo nenhum.

> **Ele manteve a decisão:** *"pode remover o mascaramento, confirmo a decisão do CPF."*
>
> **A `LTM-25` está destravada.** E o registro do desdobramento **fica no corpo dela**, não resumido aqui: é o que distingue uma decisão tomada de um descuido, e é a resposta pronta para quem reabrir o assunto num gate de QA ou numa revisão de segurança.

### A D9, e por que ela divide as duas telas

O founder pediu também remover o mascaramento **do telefone**. A pergunta de volta foi **onde**, porque aqui a paridade aponta para o lado contrário: a Sorteamos **mascara** nas duas telas, em **dois formatos distintos** (medido três vezes), e remover nos deixaria expondo **mais** que a plataforma que estamos substituindo.

| Tela | Antes | **Depois da D9** |
|---|---|---|
| `/compra/{orderId}` — o próprio pedido | `(DD) 9****-****` | **telefone inteiro** |
| Cartão de ganhador — loja pública | `(DD) ****-****` | **continua mascarado** |

**A razão da divisão é a melhor parte da decisão, e vale escrever:** a tela do pedido mostra o dado **da própria pessoa, para ela mesma** — ela já sabe o próprio telefone, e esconder metade dele dela mesma não protege ninguém. O cartão de ganhador é **página pública e indexável**, expondo **terceiros que não escolheram aparecer**. A D9 separa as duas pelo que de fato importa: **quem está vendo o dado de quem.**

> ⚠️ **E sobra uma incoerência que alguém vai topar com ela, então está aqui em vez de escondida:** na tela do pedido o **nome continua mascarado** (`Tiago ***`) e o **telefone passa a estar inteiro**. **Mesma pessoa, mesma linha, um escondido e o outro à mostra.**
>
> O founder falou de **número**, não de nome, e **o que ele não disse não foi estendido**. É uma pergunta de uma linha para ele — *"o nome também?"* — e fica visível em vez de resolvida por dedução.

#### Nota de reconciliação — o `AC5` da `LTM-14` (escrita aqui de propósito)

A `LTM-14` está **em implementação agora**, com o @dev escrevendo o Dev Record dela. O `@pm` **não toca o arquivo da story** enquanto isso (`.claude/rules/parallel-waves.md`: o arquivo tem dono). Então a mudança que a D9 provoca nela fica registrada **aqui**, para ser reconciliada quando ele terminar:

| | |
|---|---|
| **O que muda** | o `AC5` da `LTM-14` deixa de exigir telefone mascarado na tela do pedido e passa a exigir **telefone inteiro** |
| **Onde, no código** | **uma** chamada: `maskPhoneKeepingNinth` em `src/app/loja/[tenant]/[productSlug]/pedido/[orderId]/order-view.ts:220` |
| **O que NÃO muda** | `maskName` na linha `:219` — o nome segue mascarado (`Tiago ***`), e é a incoerência registrada acima |
| **O que NÃO muda, parte 2** | `src/lib/mask.ts` continua existindo, e o **cartão de ganhador** continua usando a máscara `(DD) ****-****` |
| **Quem reconcilia** | o agente que coordena, quando a `LTM-14` sair de implementação |

> ⚠️ **E isto não é a `LTM-25`.** As duas decisões chegaram no mesmo dia e as duas são *"parar de mascarar"*, mas são **mecanismos diferentes em arquivos diferentes**: a **D6** é **retenção** em `payment_webhook_events.payload` (`src/lib/payments/redact.ts`); a **D9** é **exibição** na tela do pedido (`src/lib/mask.ts`). **Não há sobreposição de arquivo entre elas**, e fundi-las removeria a máscara do cartão de ganhador — página pública, dado de terceiro, que **nenhuma das duas decisões autorizou**.

### O que ainda está pendente dele — três coisas

**1. A identidade visual (a metade B1 da antiga D5).** A D8 respondeu a metade *Analytics*; a metade *identidade visual* **não foi perguntada e não foi respondida**. A identidade da Sorteamos **é o Minimal UI** — template admin comercial com paleta verde por cima, provado pelos `ic_*.svg`, pela Public Sans e pela rota de demonstração `/user/reece-chung/edit` deixada no bundle. Adotar o mesmo template, ou tratar *"idêntico"* como *"equivalente em função"*? Enquanto não houver resposta, a divergência de tokens medida em `2026-11-17-paridade-visual-loja.md` (`--background`, `--card`, `--primary`, `--font-sans`) fica registrada e **não é corrigida por palpite**.

**2. O nome na tela do pedido** — a incoerência da D9, acima. Uma linha.

**3. O modal de Checkout.** Ele mostra **o mesmo telefone mascarado**, para **a mesma pessoa, antes de o pedido existir** — é materialmente o mesmo caso da tela do pedido, e a D9 nomeou **só a tela do pedido**. **Não foi decidido por extensão**, e está registrado como pergunta na `LTM-21`.

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
| **2026-11-19** | **As nove decisões de §4.** Segundo adaptador: construir. Janelas de reserva: as 8 da Sorteamos, sem o 15. `Porcentagem`: replicar. Grade: 6 colunas. Sorteio de teste na Sorteamos: deixar. CPF: igual à Sorteamos, sem mascarar. Exclusão de sorteio: permitir sem vendas. Analytics: junto com a `LTM-04`. **Telefone inteiro, só na tela do próprio pedido** | **Vigente, e a ressalva fechou:** a decisão do CPF foi tomada sem a informação de que o mascaramento já existia — o founder foi avisado e **confirmou**. Três stories novas: `LTM-24`, `LTM-25`, `LTM-26`. **Duas perguntas de uma linha sobraram** (o nome na tela do pedido; o telefone no modal de Checkout) |

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

1. **"Só a `paysure` importa"** *(B3, decisão de 2026-11-16)* — **errada como premissa, não como decisão.** O founder decidiu reduzir o escopo de 19 gateways para um; o que o epic supôs em seguida é que a Paysure **cobre a operação do Império**. Não cobre: o BR Code de uma rodada observada ao vivo em 2026-11-19 aponta para `pix.banprime.com.br`, e o painel tem `Banco paysure` **e** `PAY2M`. A `LTM-03b` entregou a Paysure; faltava um adaptador, e a decisão **D1** de 11-19 mandou construí-lo (**`LTM-24`**).

   > **E há uma segunda metade desta, descoberta ao escrever a `LTM-24`:** `pay2m` **já está nas duas listas de provedores** (`src/db/schema/payments.ts:132` e `src/lib/validations/payment-gateway.ts:38`) e **já tem adaptador atribuído** — o HMAC genérico, por `LEGACY_HMAC_SPEC`. Ou seja: não é um provedor recusado em voz alta esperando adaptador, como a `paysure` era. É um provedor **que o sistema acha que sabe falar**, com um esquema de autenticidade que ninguém leu da documentação de ninguém. É pior que o estado anterior da `paysure`, porque o `unsupported_provider` era honesto.

2. **"A `LTM-07` não toca `reserve.ts`"** — **errada.** Esse recorte foi o argumento que tirou a `LTM-07` da onda 2 e a pôs na onda 3. Na implementação, o @dev precisou de **uma linha** em `reserve.ts` para o AC7 passar (preço indivisível, que `reserve.ts:264-267` delegava à `LTM-07` sem a story mencionar). O recorte sobreviveu por **sorte** — as duas não rodaram juntas —, mas a premissa que formou a onda era falsa. Serializar `reserve.ts` por ondas deixou de ser precaução e passou a ser a regra (§8).

3. **"Atribuição sem perda de campo"** *(portão G3 e KPI)* — **mal especificada.** A Sorteamos **declara 13 campos de rastreio** no `order.paid` e os entrega **vazios em 100% dos pedidos reais**, inclusive em 25 pedidos com clique de anúncio confirmado; pela API REST, `UTM_Source` vem vazio em **99,6%**. "Sem perda de campo" é satisfeito trivialmente entregando vazio igual. **Paridade é o piso errado para atribuição:** o entregável da `LTM-04` é o campo **preenchido**, e é por isso que `apps/utm-capture-imperio` existe. G3 e o KPI foram reescritos (§9 e §11).

4. **"O menu do sorteio tem 13 ações"** *(`LTM-11`)* — **são 14.** Faltava `Números`. Observado em 2026-11-18.

5. **A tabela de estado de 2026-11-16** — **envelhecida inteira**, e isso é o processo funcionando. "Zero índice", "zero transação", "zero teste", "zero migração", "o webhook é um `TODO`", "`paysure` não existe em nenhuma das duas listas": **todas falsas hoje**. Ficam registradas em §1 como coluna "antes", porque são a linha de base contra a qual o progresso se mede.

6. **"Frente B: 3 decisões pendentes (B1/B2/B3)"** — B3 era decisão **já tomada** (e agora corrigida pelo item 1). B2 (Analytics) foi respondida em 11-19 pela decisão **D8**. **B1 (identidade visual) continua pendente** — é um dos dois itens abertos em §4.

7. **"A grade do lotemania tem 6 colunas"** — **meia verdade, e a metade falsa é a que o comprador vê no desktop.** `number-grid.tsx:119` é `grid grid-cols-6 gap-1.5 sm:grid-cols-10`: **6 no celular, 10 a partir de `sm`**. A instrução de 11-17 foi *"primeiro quero apenas 6 colunas conforme modelo original"*, e a decisão **D4** de 11-19 foi **manter 6** — mas 6 só vale abaixo de 640px, e acima dela a grade tem **dez**. A loja da Sorteamos é **desenhada para o celular e apenas centralizada no desktop** (`loja-comprador.md`), o que torna o `sm:grid-cols-10` uma divergência própria, **nunca observada do outro lado**. Registrado, não corrigido: corrigir é mudar a loja por dedução, e o `grid-cols-10` pode ter sido escolha deliberada de quem importou. **A `D4` fecha a pergunta de 6 contra 7; não fecha a de 6 contra 10.**

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
        ├─► EM PARALELO (arquivos disjuntos): LTM-08, LTM-14, LTM-16, LTM-09, LTM-19, LTM-24
        └─► EM SÉRIE entre si (dashboard/products + winners): LTM-27 → LTM-26
```

> **`LTM-27` vem antes da `LTM-26`**, e não é só por arquivo: a `LTM-26` tem um AC (`AC5`) sobre
> **não excluir sorteio com ganhador**, e hoje ele só é testável semeando `winners` à mão, porque
> nenhum caminho de produção cria a linha. Com a `LTM-27` entregue, esse AC passa a ser exercitável
> pelo caminho real — e o `AC5` deixa de ser teórico.

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
| Paralela | **`LTM-24`** (adaptador do 2º gateway) | `src/lib/payments/providers/` + as duas listas de provedores. **Não toca `reserve.ts`.** ⚠️ Colide com a `LTM-25` em `providers/` e nas rotas de webhook |
| **Serializada com a `LTM-24`** | **`LTM-25`** (remover o mascaramento) | `src/lib/payments/redact.ts` + as **duas** rotas de webhook + 4 arquivos de teste. ✅ Destravada em 11-19. ⚠️ **Não compartilha onda com a `LTM-23`** se ela tocar as rotas de webhook |
| ⚠️ **Em curso, com dono** | **`LTM-14`** aplicando a **D9** | `order-view.ts:220` — **uma** chamada de `maskPhoneKeepingNinth`. **Não é a `LTM-25`**: `mask.ts` e `redact.ts` são mecanismos distintos, em arquivos distintos. **Zero sobreposição** |
| Paralela | **`LTM-27`** (registrar ganhador) | `dashboard/products/**` + `src/lib/raffles/winners.ts` (que **nenhuma** story aberta reivindica). ⚠️ Colide com a **`LTM-26`** em `dashboard/products/**` e na cascata de `winners` — **serializar** |
| Paralela | **`LTM-26`** (excluir sorteio sem vendas) | `dashboard/products/`, `actions/products.ts`, migração. **Depende da `LTM-16`** — exclusão sem trilha é irreversível e inexplicável |

- ⚠️ **Recurso mutável compartilhado:** `drizzle/meta/_journal.json`. Qualquer story que gere migração o toca, e dois `drizzle-kit generate` concorrentes colidem. **Serializar a geração de migração** mesmo quando as stories rodam em paralelo.
- ⚠️ **Base de dados:** a suíte usa branch Neon efêmera por execução. **A cota de branches do Neon é recurso finito** — duas ondas rodando a suíte ao mesmo tempo disputam o mesmo recurso. Declarar na brief de cada implementador.

---

## 9. Portões de "pronto para migrar o cliente"

A migração do Império só é autorizada quando os portões abaixo estiverem verdes. Nenhum é opinião.

| Portão | Critério | Como se comprova | Estado |
|---|---|---|---|
| **G0 — Compila** | `lint`, `typecheck` e `build` verdes | `LTM-00` Done | ✅ |
| **G1 — Fundação** | `LTM-01`, `02`, `03a`, `03b`, `04`, `05`, **`20`**, **`27`** em Done | suíte verde + verificador de invariantes passando no cenário de concorrência | 🟡 código entregue em 6 de 8; nenhuma em Done; `LTM-20` em implementação; **`LTM-27` sendo escrita** (§2-A) |
| **G2 — Superfície do operador** | zero tela vazia no caminho do operador; os três exports reproduzidos | checklist item a item | ⬜ |
| **G3 — Atribuição e BI** | o ETL e o CAPI leem o lotemania com **campo preenchido**, não apenas declarado | janela de leitura dupla: mesmo período, mesmo faturamento, mesma contagem de pedidos pagos **e taxa de preenchimento de atribuição maior que a da Sorteamos** (que é ~0%). Evidência mora na `LTM-09` (`ADR-0002`) | ⬜ |
| **G4 — Carga** | cenário medido em staging: **5 rodadas simultâneas de 200 metades**, esgotando no ritmo do pior caso real (~5,5 unidades/minuto) | zero oversell, zero pedido órfão, **zero unidade vendável com dois donos** — não "zero número": em sorteio divisível o mesmo número tem dois donos legítimos. Verificador da `LTM-05`, **chavado na unidade** | ⬜ |
| **G5 — Dinheiro real** | ao menos **um** pedido pago ponta a ponta com PIX real, em produção, em sorteio de teste — **e um por rota de gateway contratada**, não um total | pedido `paid`, unidades `sold`, `banking_transactions` com o crédito, aviso casado. **Dois provedores em produção ⇒ duas evidências** (decisão **D1**) | ⬜ bloqueado pelo `ci`/`cs` do cliente, e agora também pela `LTM-24` |
| **G6 — Reversão** | plano de volta à Sorteamos escrito **e exercitado uma vez** | registro do ensaio com tempo medido | ⬜ |
| **G7 — Dado pessoal** | a política de 2026-11-12 respeitada (`docs/ESTADO-ATUAL.md` §1-A) e a **retenção do CPF do aviso decidida** (**D6**) | nenhum CPF, telefone, e-mail ou nome em **artefato versionado**; varredura antes de cada commit | 🟡 **a metade "decidida" está fechada**: D6 = não mascarar, **confirmada em 11-19** com o founder ciente de que é remoção de proteção entregue. A política vigente passa a ser *"guardar como recebido"*, executada pela `LTM-25`. A metade "artefato versionado" **segue valendo integralmente e não é afetada** — banco de produção não é artefato versionado, e fixture de teste continua sintética |
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
- [ ] **Um sorteio consegue terminar:** o operador define o ganhador, a linha de `winners` nasce com o valor já rateado, e as duas páginas de loja que já consultam `winners` mostram alguém — **`LTM-27`**. Hoje `recordWinnersForDrawnTitle` só é chamada por um teste, e a seção de ganhadores da loja é permanentemente vazia

---

## 12. Riscos

| Risco | Severidade | Mitigação |
|---|---|---|
| **A segunda rota de pagamento descoberta no corte** | **Alto** | **Decidido em 11-19 (D1): construir o adaptador — `LTM-24`.** O risco migra de "descoberta tardia" para "adaptador escrito contra o provedor errado": o BR Code diz `pix.banprime.com.br`, o painel diz `PAY2M`, e **ninguém sabe se são o mesmo**. A `LTM-24` AC1 é descobrir qual é |
| **`pay2m` tem adaptador HMAC genérico sem contrato lido** | **Alto** | Não é provedor esperando adaptador — é provedor com adaptador **suposto**. É a repetição exata do `x-webhook-signature` inventado da `LTM-03`, que rejeitaria 100% dos avisos. `LTM-24` AC2: ou o adaptador é escrito contra documentação, ou `pay2m` volta para `UNSUPPORTED` e recusa em voz alta |
| Perda de atribuição no dia do corte cega o CAPI e o BI | **Alto** | G3 exige janela de leitura dupla **antes** do corte, e agora mede **preenchimento**, não declaração |
| Corte com paridade incompleta derruba o faturamento do cliente | **Alto** | G8 bloqueante do corte; `LTM-19` transforma "absolutamente tudo" em lista conferível |
| **Domínio entregue sem acionador passar por "pronto"** | **Alto** | **Já aconteceu:** o rateio do prêmio da `LTM-07` está escrito, testado e **sem um único chamador de produção** (§2-A). Compila, os testes passam, e o sorteio não entrega prêmio. A `LTM-27` fecha este caso; o **gênero** pede varredura própria — é a `LTM-17` (campo sem leitor) um nível acima |
| **`reserve.ts` reescrito por duas stories na mesma onda** | **Alto** | Série obrigatória (§8). Já houve uma premissa falsa de disjunção neste arquivo (§6.2) |
| **Telefone não verificado sendo a identidade do comprador** | **Médio** | Escolha consciente de prazo (founder, 11-19). `LTM-22` fecha depois do lançamento |
| **CPF e nome do pagador em claro em `payment_webhook_events`** | **Médio → Alto** | **A decisão D6 de 11-19 elevou este risco em vez de fechá-lo, e foi confirmada sabendo disso.** A política de retenção passa a existir e a ser *"não mascarar"*; a **`LTM-25`** executa. **Mitigação que resta: executar antes do primeiro aviso real**, enquanto o conjunto de CPFs na trilha é **vazio** — depois do corte são ~1.500 pedidos pagos/dia, e a reversão deixa de ser só código. Base que migra: **183.381** usuários |
| **"Sem mascarar nada" ser lido além do que foi decidido** | **Médio** | Duas decisões de 11-19 são *"parar de mascarar"* e são **mecanismos diferentes**: a **D6** é retenção em `payment_webhook_events.payload` (`redact.ts`); a **D9** é exibição na tela do próprio pedido (`mask.ts`). Fundi-las remove a máscara do **cartão de ganhador** — página pública, dado de **terceiro**, que **nenhuma das duas autorizou**. Declarado na `LTM-25` (OUT e risco) e em §4 |
| Replicar a barra de progresso editável | **Médio** | **Decidido em 11-19 (D3): replicar.** Entra no grupo C da `LTM-18`, nomeada pelo que é. `.claude/rules/claims-ledger.md` continua valendo para material que **nós** produzimos; o uso desta ferramenta é do cliente |
| **Excluir sorteio apagar histórico de alguém** | **Médio** | **A `LTM-26` diverge da Sorteamos de propósito**, e o critério de *"sem vendas"* é o que separa apagar rascunho de apagar histórico. Decidido na story: **zero pedidos, em qualquer estado** — e a exclusão depende da trilha da `LTM-16` |
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
