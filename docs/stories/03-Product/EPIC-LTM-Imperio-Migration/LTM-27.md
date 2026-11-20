# LTM-27: Definir ganhadores — o último elo da corrente

**Status:** InReview
> ✅ **Validada pelo @po em 2026-11-20 — GO (8,5/10). `Draft` → `Ready`.** Conferi o fim aberto no
> código: `recordWinnersForDrawnTitle` tem **um** importador em todo o repositório e **é um teste**
> (`tests/money-path/half-quota-domain.test.ts:42`). A tela não existe. A story está certa no
> diagnóstico e certa no recorte. **Três ACs foram corrigidos por mim contra o domínio entregue** —
> o valor do prêmio por lugar, o conjunto de recusas e o caminho da página pública — e um **AC11**
> novo fecha o buraco que teria pago o prêmio várias vezes. Ver *Validação @po* ao fim.
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação)
**Prioridade:** **P0** — sem ela o sorteio **não termina**. O ensaio ponta a ponta para no encerramento, que é meio sorteio
**Complexidade:** M — a tela é pequena; o que ela aciona é o rateio, que já existe
**Criada por:** @aiox-master · 2026-11-19
**Evidência:** quatro capturas do founder, 2026-11-19 19h28 — **a tela da Sorteamos, observada**

## Como esta story nasceu

Mapeando a corrente ponta a ponta (`ENSAIO-GERAL.md`), apareceu um buraco no fim:

- `src/lib/raffles/winners.ts` foi entregue pela `LTM-07` e **faz o rateio corretamente**;
- **nenhum código o chama** — busca por `raffles/winners` fora do próprio arquivo devolve **zero**;
- **não existe tela** — `find src/app/dashboard -iname "*winner*"` devolve nada.

Eu havia registrado três perguntas como *"não se respondem por dedução"*. **O founder respondeu
mandando o que eu deveria ter modelado:** ele pediu desde o início o inventário completo da
Sorteamos, e esta tela ficou de fora porque `Definir ganhadores` é ação mutante e o sorteio de teste
de lá não tinha vendas.

**As capturas respondem as três.**

---

## A tela, observada

### Entrada

Menu **⋮** da linha do sorteio, na lista `/dashboard/products` — quarto item:

```
QR Code · Salvar cópia · Ordenação: 0 · Definir ganhadores
```

### O modal `Ganhadores`

```
Ganhadores

Data do sorteio
┌──────────────────────────────┐
│ 19/11/2027 02:48 PM          │
└──────────────────────────────┘

Informe os números sorteados de acordo com os prêmios.

* Informe os números corretamente, sem ponto ou vírgula.
* Utilize os dígitos corretos para os números. Essa campanha é de 1 dígitos.

┌──────────────────────────────┐
│ Ganhador: Prêmio 1 *         │
└──────────────────────────────┘

                    [ Fechar ]  [ Salvar ]
```

### As três perguntas, respondidas

| Pergunta que eu havia deixado aberta | **Resposta observada** |
|---|---|
| Quem informa o número sorteado? | **O operador digita.** Um campo por prêmio |
| O sistema valida? | **Sim, a quantidade de dígitos** — *"Essa campanha é de 1 dígitos"*, derivado do tamanho do sorteio |
| O rateio é automático ou confirmado? | **Automático ao salvar.** Não há tela de prévia; o operador informa o número e o sistema resolve o resto |

### O que acontece depois de salvar

A linha do sorteio na lista passa a mostrar, **inline**:

```
8° RAPIDINHA VALENDO R$ 900,00...
Sorteio: 19/11/2026 22:00:30
Ganhador: Sandra Mara Gosenheimer     ← nome COMPLETO, sem máscara (é o painel)
Título: 42
Data da compra: 19/11/2026 13:02:47
Cadastro: 19/11/2026
```

> **O sistema resolve o número → comprador sozinho.** O operador digita `42`; a plataforma encontra
> quem comprou o título 42 naquele sorteio e exibe **nome** e **data da compra**. Isso confirma, pelo
> comportamento, que o ganhador **não é digitado** — é **derivado da venda**.

---

## Story

**Como** operador do Império que acabou de ver o resultado no grupo
**Eu quero** digitar o número sorteado e o sistema achar quem comprou
**Para que** o ganhador apareça na loja sem eu ter que procurar o comprador na mão.

---

## Decisão de arquitetura

### 1. O número é a entrada; o ganhador é derivado

O operador digita **o número**. O sistema procura em `product_numbers` quem o comprou — e só grava
`winners` se achar.

### 2. ⚠️ A meia cota muda isto, e a Sorteamos não tem resposta

**Num sorteio divisível, o número 42 tem DUAS pessoas** — metade 1 e metade 2. A tela da Sorteamos
tem **um campo por prêmio** e resolve para **um** ganhador, porque lá a meia cota não existe.

**É o ponto onde a paridade estrita não basta e o lotemania tem de decidir.** A `LTM-07` já entregou
o rateio: `src/lib/raffles/winners.ts` sabe dividir o prêmio entre as metades e lidar com a **metade
órfã** (quando só uma metade foi vendida, o prêmio inteiro vai para quem a tem).

**Proposta:** a tela continua pedindo **o número**; o sistema descobre sozinho se o sorteio é
divisível e quantas pessoas aquele número tem:

| Caso | O que o sistema faz |
|---|---|
| cota inteira | **1** linha de ganhador, prêmio integral |
| divisível, duas metades vendidas | **2** linhas, prêmio rateado, cada uma com `winning_half` |
| divisível, **metade órfã** | **1** linha, **prêmio integral** para quem comprou a metade vendida |
| número não vendido | **recusa**, com motivo nomeado |

> Isso **não inventa tela** — mantém a da Sorteamos — e **usa o domínio que já existe**. O operador
> não precisa saber se o sorteio é divisível: ele digita o número, como sempre fez.

> ### ⚠️ E o rateio opera sobre o valor DAQUELE lugar, não sobre o do sorteio
>
> Decisão do founder de 2026-11-20 (`AC3`/`AC11`): **são N ganhadores, quantos o operador quiser**, e
> **cada lugar tem o seu valor, digitado no modal**. Então a tabela acima se lê assim: onde está
> *"prêmio"*, entenda **o valor daquele lugar** — a metade órfã leva o prêmio **inteiro do lugar
> dela**, não o do sorteio.
>
> **O `prizeAmount` do sorteio continua sendo o padrão**, usado quando o operador não informa valor —
> que é o caso de um sorteio de prêmio único, o mais comum, e o do ensaio ponta a ponta.

### 3. A validação de dígitos é da Sorteamos e vale copiar

*"Essa campanha é de N dígitos"* — derivado de `totalNumbers`. Evita o operador digitar `042` num
sorteio de 100 ou `7` num de 1.000. É barato e previne erro no caminho do prêmio.

### 4. `Data do sorteio` é editável no modal

A Sorteamos deixa corrigir a data ali. Faz sentido: o sorteio aconteceu fora do sistema, e a data
registrada no cadastro pode não ser a da extração real.

---

## Tarefas (Checklist)

- [x] Item **`Definir ganhadores`** no menu ⋮ da linha do sorteio.
- [x] Modal `Ganhadores`: data do sorteio editável, **uma linha por ganhador** (número, descrição e valor), aviso de dígitos e botão `Acrescentar ganhador` — a forma do `AC3` v1.2.
- [x] Resolver número → comprador(es), **acionando `src/lib/raffles/winners.ts`**.
- [x] Gravar `winners`, incluindo `winning_half` em sorteio divisível.
- [x] A lista de sorteios mostra o ganhador inline depois de salvo.
- [x] **Mostrar as quatro recusas do domínio** com a razão de cada uma (AC2) — mais três próprias da entrada: dígitos, valor ilegível e data ilegível.
- [ ] ~~`[CONFIRMAR]` com o founder: **dá para corrigir um ganhador já definido?**~~
      **Metade respondida pelo código** (@po, 2026-11-20): `winners.ts:131-152` já **recusa** a
      segunda gravação do mesmo título (`already_recorded`), *"nada foi alterado"*. Então o
      comportamento desta story está decidido: **não sobrescreve**. O que continua sendo pergunta de
      founder é se existe **desfazer** — e isso é story própria, porque apagar ganhador no caminho do
      prêmio sem a trilha da `LTM-16` é irreversível e inexplicável.

---

## Critérios de Aceite

- [x] **AC1 (o número acha o dono):** operador digita um número **vendido**; o sistema grava um
      ganhador com o comprador daquele número, e a lista mostra nome e data da compra.
  - ⚠️ **A data da compra não está em `winners`** (@po, 2026-11-20). A tabela tem `winner_name`,
    `phone`, `prize_description`, `prize_amount`, `winning_number`, `winning_half` e `announced_at`
    — e **nenhuma referência ao pedido**. Exibir *"Data da compra"* como a Sorteamos exibe obriga a
    juntar `product_numbers.order_id → orders.created_at` **na hora de exibir**. É alcançável e não
    pede coluna nova; está escrito aqui porque descobrir isso no meio da implementação é o que faz
    um AC virar "mostra o que der".
- [x] **AC2 (toda recusa é nomeada, e são quatro):** o domínio entregue já recusa em **quatro**
      situações, e a tela tem de mostrar **a razão de cada uma**, nunca um erro genérico:
      `no_sold_units` (ninguém comprou o título), `already_recorded` (o título já tem ganhador),
      `prize_not_rateable` (prêmio não é dinheiro, ou o valor não se lê) e `raffle_not_found`.
      **Nunca** grava ganhador vazio nem inventa comprador.
  - ⚠️ **Conferido em `src/lib/raffles/winners.ts:30-38` (@po, 2026-11-20).** A redação anterior
    cobria **uma** das quatro. As outras três não são teóricas: `prize_not_rateable` é a que o
    **ensaio ponta a ponta vai encontrar primeiro** se o sorteio de teste não tiver `prizeKind`
    `cash` **com valor declarado** — e aí a tela recusa com razão certa e o operador acha que a
    funcionalidade está quebrada.
- [x] **AC3 (quantos ganhadores o operador quiser — decisão do founder, 2026-11-20):** o modal
      permite cadastrar **N ganhadores**, um por prêmio, e **o operador decide quantos**. Sorteio com
      3 prêmios cadastra 3; se ele quiser cadastrar mais, cadastra. O número de campos **parte** dos
      prêmios configurados (`prizes`, `product-settings.ts:39`) e **não é teto**.
  - **A decisão, textual** (founder, 2026-11-20): *"assim como na sorteamos, aqui devemos poder como
    usuário definir mais de um ganhador, devo poder cadastrar quantos eu quiser assim como também é
    possível na sorteamos"*.
  - ✅ **Tomada depois de ouvir o risco.** A objeção do `AC11` — o prêmio ratear o valor cheio a cada
    chamada — foi levada a ele **antes** da resposta. Ele reafirmou a capacidade, então o remédio
    mudou de *recusar* para *pedir o valor*. É decisão informada, não desconhecimento.
  - ⚠️ **Cada ganhador cadastrado precisa do seu próprio valor** — ver `AC11`. Sem isso, N
    cadastros pagam N× o prêmio do sorteio.
- [x] **AC4 (a meia cota gera dois ganhadores):** sorteio divisível, número com **as duas metades
      vendidas a pessoas diferentes** → **duas** linhas de `winners`, cada uma com seu
      `winning_half`, e os prêmios **somando exatamente** o prêmio do lugar. É o AC que prova a
      feature que o cliente pediu, ponta a ponta.
- [x] **AC5 (metade órfã leva tudo):** sorteio divisível, só **uma** metade vendida → **uma** linha,
      **prêmio integral**. É a regra do `ADR-0001` exercitada pela tela.
- [x] **AC6 (a validação de dígitos):** sorteio de 100 números recusa `042` e `7`? **[CONFIRMAR]** o
      comportamento exato da Sorteamos — ela **avisa** (*"Utilize os dígitos corretos"*); se ela
      recusa ou só orienta, não foi observado. Na dúvida, **recusar** é mais seguro que aceitar.
- [x] **AC7 (a data do sorteio é editável e é a gravada):** a data informada no modal é a que vai
      para `winners.announced_at`, não a data do clique.
- [x] **AC8 (aparece na loja):** depois de salvo, o ganhador aparece na página pública
      **`/loja/{tenant}/ganhadores`** e na página da campanha concluída — **com nome e telefone
      mascarados**, como a `LTM-15` exige. O painel mostra inteiro; a loja, não.
  - ✅ **A metade mascarada deste AC já está construída** (@po, 2026-11-20):
    `src/app/loja/[tenant]/ganhadores/page.tsx:62` e `:81` já aplicam `maskName` e `maskPhone`, e a
    página já ordena por `announced_at`. **O que falta não é a página — é a linha de `winners`**,
    que é exatamente o que esta story cria. O caminho era citado como `/ganhadores`; a rota literal
    é `/loja/{tenant}/ganhadores`, e rota sem tenant não existe nesta loja.
  - ⚠️ **A página não exibe `winning_half`**, então um título divisível sorteado sai como `42` para
    as duas pessoas — contra a regra *metade sempre marcada* do `GLOSSARY`. **Isso é da `LTM-08`**
    (o comentário de `raffles.ts:306` já lhe atribui a exibição), **não desta story**, e está
    escrito aqui para a aresta não se perder entre as duas.
- [ ] **AC9 (ação mutante tem rastro):** quem definiu o ganhador e quando ficam registrados.
      Depende da `LTM-16`; enquanto ela não existir, o AC fica aberto e **declarado**.
- [ ] **AC10 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.
- [x] **AC11 (o valor de cada lugar é digitado, nunca deduzido — reescrito em 2026-11-20 pela
      decisão do founder):** cada ganhador cadastrado carrega **o valor do seu prêmio, informado pelo
      operador no modal**. O rateio da meia cota opera **sobre esse valor**, não sobre o do sorteio.
      Teste: dois lugares com valores diferentes produzem linhas de `winners` com
      `prize_amount` **diferentes**, e a soma dos ganhadores de um mesmo lugar é **exatamente** o
      valor daquele lugar.
  - **O defeito que este AC existe para impedir, medido antes de a decisão chegar** (@po,
    2026-11-20): o domínio lê **um** valor por sorteio — `advanced_settings.prizeAmount`, em
    `winners.ts:106-116` — e `recordWinnersForDrawnTitle` recebe **um** número por chamada. Com N
    cadastros e nenhum valor por lugar, **o sorteio pagaria N× o prêmio**, e nada no código impede.
    Foi esse achado que fez o valor por lugar virar requisito de desenho em vez de bug futuro.
  - **A forma autorizada:** `recordWinnersForDrawnTitle` ganha um **parâmetro opcional de valor** —
    **ausente**, lê `prizeAmount` como hoje (todos os testes existentes seguem verdes);
    **presente**, usa o valor dado. ✅ **Retrocompatível por construção**, que é o que permite a
    mudança sem reabrir a `LTM-07`.
  - ⛔ **As duas travas que continuam valendo, e não são negociáveis:**
    1. **Não dividir o `prizeAmount` do sorteio entre os lugares.** Assumir que o 2º vale metade, ou
       repartir o total pelo número de prêmios, é **inventar no caminho do prêmio**. `prizes` é
       `z.array(z.string())` — **descrição livre, sem valor** (`product-settings.ts:39-44`).
    2. **Prêmio não monetário grava descrição sem valor.** `winners.prize_amount` é **nulável de
       propósito** (`raffles.ts:297`, sem `.notNull()`), e é o que permite registrar *"uma moto"* sem
       forçar um número que ninguém declarou. **Não preencher 0,00** — zero é um valor, e um prêmio
       de R$ 0,00 na página pública é pior que um prêmio sem valor.
  - ✅ **A pergunta *"como se declara o valor do 2º prêmio"* está RESPONDIDA:** pelo operador, no ato
    de definir o ganhador. Era a única fonte possível sem invenção, e é também o que a Sorteamos
    faz — o campo do modal é por prêmio, não por sorteio.

---

## Escopo

**IN:** o item de menu, o modal, a resolução número → comprador, o acionamento do rateio, a
exibição inline na lista.

**OUT:**

- **Sortear.** O sorteio acontece **fora** do sistema — loteria federal, grupo de WhatsApp. Esta
  tela **registra resultado**, não produz resultado. É a mesma fronteira que o `ADR-0001` já
  estabeleceu.
- **`Horário Premiado`** — aquele **sorteia** entre compradores de uma janela de tempo
  (`README.md` §5 do inventário) e tem botão `Realizar Sorteio`. É outra mecânica, outra story.
- **Títulos premiados / Caixa / Roleta / Raspadinha** — prêmio instantâneo na compra, não no
  encerramento. São a `LTM-18` grupo C.
- **Foto do ganhador** — o cartão da loja tem placeholder quando não há foto; subir foto é outra
  story.

---

## Dependências

- **Depende da `LTM-07`** (entregue) — é o rateio que esta tela aciona. **Sem esta story, aquele
  código nunca roda.**
- **Conversa com a `LTM-15`** — ela constrói a seção de ganhadores no catálogo; esta alimenta.
- **Conversa com a `LTM-11`** — o menu ⋮ da linha do sorteio tem 4 itens, e `Definir ganhadores` é
  um deles. **Decidir quem é dono do menu**, ou as duas o criam.
- **AC9 depende da `LTM-16`.**

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/app/dashboard/products/product-row-actions.tsx   (o item de menu)
  apps/lotemania/src/app/dashboard/products/winners-dialog.tsx        (novo — o modal)
  apps/lotemania/src/app/dashboard/products/page.tsx                  (o ganhador inline na linha)
  apps/lotemania/src/lib/actions/winners.ts                           (novo — resolve e grava)
  apps/lotemania/tests/money-path/definir-ganhadores.test.ts          (novo)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao  — winners ja existe, e a LTM-07 ja criou winning_half

Depends-on: LTM-07 (entregue), LTM-16 (so o AC9)
```

- ✅ **Não toca `reserve.ts`** — fica **fora** da fila serial que `LTM-04`, `LTM-17`, `LTM-21`,
  `LTM-23` e `LTM-18` disputam. Pode correr em paralelo com qualquer uma delas.
- ⛔ **Não pode compartilhar onda com a `LTM-11`** — as duas mexem no menu da linha.

---

## Riscos

- **[Alto] Gravar ganhador em número não vendido.** É o erro mais caro desta tela: cria um ganhador
  que não existe, num registro que vai para a página pública. AC2 é a trava.
- **[Alto] Esquecer a meia cota.** Copiar a tela da Sorteamos ao pé da letra resolveria **um**
  ganhador por número — e num sorteio divisível isso **rouba metade do prêmio** de alguém que pagou.
  A Sorteamos não tem este caso; a paridade estrita aqui seria um defeito. AC4 e AC5 existem por
  isso.
- **[Médio] Corrigir um ganhador já definido.** Não observado. Se a tela permitir salvar duas vezes,
  o que acontece com a primeira gravação? `[CONFIRMAR]`.
- **[Médio] Dado pessoal.** O painel mostra o nome completo do ganhador — e está certo, é o
  operador. A **loja** tem de continuar mascarando (AC8).

---

## Validação @po (2026-11-20) — **GO, 8,5/10. `Draft` → `Ready`**

É a story mais bem ancorada do epic nesta rodada, e por um motivo que vale nomear: ela **modela de
captura e recorta contra o domínio que já existe**, em vez de inventar tela. O `AC2` original (número
não vendido) e o `AC5` (metade órfã leva tudo) são as duas travas certas nos dois lugares onde o erro
custa dinheiro de verdade.

### O fim aberto é real — medido, não herdado

| Afirmação da story | Medição de hoje |
|---|---|
| `recordWinnersForDrawnTitle` existe e ninguém o chama | ✅ **um** importador no repositório, e é `tests/money-path/half-quota-domain.test.ts:42`. Em `src/`, zero |
| não existe tela de ganhadores no painel | ✅ `src/app/dashboard/products/` tem 7 entradas, nenhuma de ganhador |
| `winning_half` já existe | ✅ `src/db/schema/raffles.ts:316`, nulável de propósito |
| `announced_at` recebe a data informada | ✅ `raffles.ts:317-319`, `notNull().defaultNow()`, e `winners.ts:218` só o escreve se vier — o `AC7` é implementável sem coluna nova |
| os 5 arquivos do bloco `Files:` | ✅ os **2** existentes existem (`product-row-actions.tsx`, `page.tsx`); os **3** novos não existem, como declarado |
| `src/lib/raffles/winners.ts` não é reivindicado por nenhuma story aberta | ✅ confere |

### O que eu corrigi, e por que cada um importa

1. **`AC11` novo — o prêmio pago N vezes.** É o achado desta validação. `AC3` manda renderizar um
   campo por prêmio; o domínio rateia **um valor por sorteio** e recebe **um número por chamada**.
   Três campos salvos = três rateios do valor cheio. Não é bug de implementação futura: é um AC
   mandando fazer uma coisa que o domínio executa errado por construção.
   > 🔄 **Atualização do mesmo dia: o remédio que eu propus foi trocado pelo founder, e o achado
   > sobreviveu.** Eu propus **recusar** o 2º lugar; levada a objeção a ele, ele respondeu que
   > cadastrar **quantos ganhadores quiser** é requisito — *"assim como também é possível na
   > sorteamos"*. **Decisão informada, tomada depois de ouvir o risco, e ela vale.** O remédio passou
   > a ser **o operador digitar o valor de cada lugar**, que é a única fonte sem invenção. As duas
   > travas que eu pus continuam inteiras: não dividir o `prizeAmount` por dedução, e `prize_amount`
   > **nulável** para prêmio não monetário em vez de 0,00. **O valor da medição não era a recusa — era
   > saber que o valor por lugar não existia em lugar nenhum.**
2. **`AC2` cobria uma de quatro recusas.** As outras três estão em
   `winners.ts:30-38`, e uma delas (`prize_not_rateable`) é a que o ensaio encontra primeiro.
3. **`AC8` citava `/ganhadores`;** a rota é `/loja/{tenant}/ganhadores`, e a máscara que ele exige
   **já está implementada lá**. O AC passou de *"construir"* para *"a linha aparecer"*.
4. **`AC1` pedia a data da compra, que `winners` não guarda.** Nomeada a junta.
5. **O `[CONFIRMAR]` do ganhador já definido** estava metade respondido pelo código.

### A meia cota é o lugar onde esta story se recusa a copiar, e está certa

A Sorteamos resolve **um** dono por número porque lá a meia cota não existe. Copiar ao pé da letra
roubaria metade do prêmio de quem pagou. `AC4` e `AC5` existem por isso, e o rateio que eles exercitam
**já está entregue e testado** pela `LTM-07` — esta story é o caminho de produção até ele.

### Pontuação

| Eixo | Nota |
|---|---|
| Completude de template | ✅ |
| Estrutura de arquivos / árvore | ✅ 5 caminhos declarados, todos conferidos |
| UI/Frontend | ✅ modelada de captura, com o modal transcrito |
| Satisfação dos ACs | ⚠️ → ✅ depois do `AC11` e da correção do `AC2`; o `AC9` fica declaradamente aberto na `LTM-16` |
| Instruções de teste | ✅ o arquivo de teste é declarado e os casos são enumeráveis |
| Segurança | ✅ painel inteiro × loja mascarada, com a divisão certa (`AC8`) |
| Sequência de tarefas | ✅ |
| Duplicação funcional | ✅ fora da fila de `reserve.ts`; colisão com a `LTM-11` e a `LTM-26` declarada |
| Anti-alucinação | ✅ as quatro capturas, e tudo que elas não cobrem está marcado |
| Prontidão para @dev | ✅ `LTM-07` entregue; nada bloqueia |

### O que fica aberto, declarado

- **`AC9`** espera a `LTM-16` (trilha). Não bloqueia o ensaio.
- ~~**O valor do 2º prêmio** é pergunta de uma linha ao founder (`AC11`).~~ ✅ **RESPONDIDA em
  2026-11-20:** o operador digita o valor de cada lugar no modal. Ver `AC11` reescrito.
- **`winning_half` na loja** é da `LTM-08`.

## Dev Agent Record

**Agente:** @dev (Dex) · **Data:** 2026-11-20 · **Status:** `Ready` → `InProgress` → `InReview`

### O que a story errou no tamanho, e para menos

O diagnóstico estava certo e o recorte também: **faltava a fiação e a tela, não o domínio**.
`recordWinnersForDrawnTitle` estava inteiro — transação, quatro recusas nomeadas, rateio de meia
cota — e tinha **um** importador no repositório, que era um teste. Nada em `src/` o chamava. Esta
story não escreveu rateio nenhum: ela construiu o caminho de produção até ele.

### IDS — as decisões de reuso, uma por arquivo

| Alvo | Decisão | Razão |
|---|---|---|
| `recordWinnersForDrawnTitle` | **REUSE** (+1 parâmetro aditivo) | o rateio, a transação e as quatro recusas já estavam entregues e testados |
| `splitPrizeAmongHalves`, `centsOrNull`, `toCents` | **REUSE** | a fronteira de dinheiro mora num lugar só |
| `productAdvancedSettingsSchema` | **REUSE** | `prizes` e `prizeAmount` lidos por `safeParse`, nunca por jsonb cru |
| `Dialog`/`Input`/`Label`/`Button`/`DropdownMenu`, `formatDate` | **REUSE** | zero componente novo de UI |
| `src/lib/raffles/define-winners.ts` | **CREATE** | a decisão precisa ser verificável contra o Postgres sem mockar `cookies()` — molde de `divisibility.ts`, `gateway-config.ts`, `expire-reservations.ts` |
| `src/lib/actions/winners.ts` | **CREATE** | a casca `"use server"` que autoriza e revalida |
| `winners-dialog.tsx` | **CREATE** | não existia tela de ganhador em `src/app/dashboard/` |

### O sexto arquivo, e por que ele não cabia nos cinco declarados

O bloco `Files:` previa cinco. Entreguei **seis** — `src/lib/raffles/define-winners.ts` — e a razão
é estrutural, não conveniência:

1. **`"use server"` só exporta função assíncrona.** Exportar tipo, constante ou helper de
   `actions/winners.ts` zeraria **todas** as exportações dele no grafo do cliente — `lint` e
   `typecheck` passam e só `next build` acusa, num outro arquivo. Já aconteceu três vezes nesta base.
2. **Mockar `cookies()` para verificar regra de prêmio verificaria o dublê.** A razão está escrita
   em `gateway-config.test.tsx:17-22`, e foi por ela que `divisibility.ts` e `gateway-config.ts`
   existem. A validação de dígitos, a leitura do valor e a junta da data da compra moram lá e são
   testadas contra o banco de verdade.

### Três defeitos achados no caminho, nenhum previsto pela story

**1. `42702` — a coluna ambígua que derrubaria a lista inteira de sorteios.** A junta do `AC1`
(`product_numbers.order_id → orders.created_at`) é subconsulta correlacionada. Em consulta de
**tabela única** o drizzle emite a coluna **sem qualificar** (`"product_id"`), e dentro da
subconsulta — que tem `product_numbers pn` no escopo, com uma `product_id` também — a referência
fica ambígua. O Postgres responde `42702` e **toda a página `/dashboard/products` morre**, não só a
exibição do ganhador. Pior: `alias(winners, "w")` **não resolve sozinho** — ele qualifica a consulta
de fora (`"w"."tenant_id"`) mas não o que é interpolado **dentro** do template `sql`. Medido duas
vezes: 20 verdes com 2 vermelhos na primeira, os mesmos 2 vermelhos depois do `alias`. O conserto é
qualificar **literalmente** no template (`w."product_id"`). Os dois testes vermelhos eram
**exatamente os dois que gravam ganhador de verdade** — AC1/AC8 e a meia cota do AC4.

**2. A metade tem de entrar na junta, e isso não é cosmético.** Num título divisível com as duas
metades vendidas, casar ganhador ↔ compra **sem** `winning_half` casa as **duas** linhas com a
**mesma** compra: a data de uma pessoa aparece ao lado do nome da outra, no painel, no caminho do
prêmio. O teste do `AC4` afirma metade 1 → pedido da Ana e metade 2 → pedido do Bruno, e é a
asserção que discrimina.

**3. `prizeKind` tem default `"other"`, e isso quase matou a capacidade nova.** Um sorteio com
`advanced_settings = {}` — **o caso comum** — cai no default conservador. Se o valor digitado pelo
operador tivesse de atravessar a recusa `prize_not_rateable`, ele informaria quanto o 2º lugar paga e
levaria *"este sorteio tem prêmio other sem valor"* na cara, justamente nos sorteios que mais
precisam da capacidade. O caminho do valor informado **pula** aquela recusa — e atravessa o **mesmo**
`centsOrNull` e a **mesma** recusa de valor ≤ 0.

### A mudança no domínio foi aditiva, por construção

`recordWinnersForDrawnTitle` ganhou `prizeAmount?: string | null`:

- **ausente ou vazio** — a condição é a de antes, **caractere por caractere**. Nenhum chamador
  anterior muda de comportamento e **nenhum teste da `LTM-07` foi tocado**;
- **presente** — é esse o valor rateado, e a meia cota opera sobre ele.

String decimal e nunca `number`, pela razão de `money.ts:36-39`: `number` chega tendo passado por
ponto flutuante e depois do fato não se distingue *"o dado tem três casas"* de *"o binário deixou
resíduo"*.

### O que **não** foi implementado, declarado e não contornado

| Item | Situação |
|---|---|
| **`AC9`** (trilha de auditoria) | **ABERTO.** Depende da `LTM-16`; nenhuma das tabelas de hoje serve de trilha. Nada foi inventado — não há registro de quem definiu o ganhador |
| **`AC10`** (porta verde) | **PARCIAL por protocolo de onda.** `pnpm typecheck` verde, `pnpm lint` 0 erros (5 avisos pré-existentes), `definir-ganhadores.test.ts` **22/22**. `pnpm build` e a suíte inteira são do controlador na árvore combinada — `.next` e a cota do Neon são recursos compartilhados |
| **`AC11`, trava 2** (prêmio não monetário grava descrição **sem** valor) | **A proibição foi honrada; a capacidade, não.** Nada escreve `0,00` nem valor deduzido. Mas registrar *"uma moto"* com `prize_amount` nulo **continua recusado** (`prize_not_rateable`): habilitar isso exige mudar as recusas de `winners.ts`, que é domínio da `LTM-07` sob portaria do @qa agora — passa do *"parâmetro opcional + um if"* autorizado. **O que seria possível:** um `prizeKind: "other"` explícito na linha do modal que gravasse descrição com valor nulo, pulando o rateio. É story própria, e o teste de hoje **fixa a recusa** para que a mudança seja deliberada |
| **Mais de 2 ganhadores no mesmo número** | **FORA por decisão do founder** (2026-11-20), não por limitação. A guarda `already_recorded` **não foi tocada** |
| **`winning_half` na loja pública** | Da `LTM-08`. Não toquei `ganhadores/page.tsx` |

### Decisões autônomas, registradas

- **[AUTO-DECISION]** *Sorteio sem prêmio descrito renderiza quantas linhas?* → **uma**, rotulada
  `Prêmio 1` (razão: `prizes` é descrição livre e **opcional**; zero linhas deixaria a
  funcionalidade inalcançável exatamente no caso do ensaio ponta a ponta, que declara `prizeAmount`
  e nenhuma descrição — e a captura da Sorteamos mostra um campo).
- **[AUTO-DECISION]** *`Prêmio 1` vai para `winners.prize_description`?* → **nunca** (razão: é
  rótulo de tela; gravar texto que ninguém escreveu é invenção no caminho do prêmio. Sem descrição
  digitada nem configurada, quem escreve é o domínio: `Prêmio do título N`).
- **[AUTO-DECISION]** *`maxLength` no campo do número?* → **não** (razão: cortaria `042` em `04` e
  registraria ganhador do título 4 **em silêncio**; a recusa com razão nomeada é o `AC6`).
- **[AUTO-DECISION]** *Valor digitado como `100.000,00`?* → **recusa nomeada**, sem normalizar
  (razão: `"1.000"` é mil ou é um? Adivinhar no caminho do prêmio é pior que pedir de novo).
- **[AUTO-DECISION]** *`router.refresh()` depois de salvar?* → **não** (razão: o `revalidatePath` da
  action já devolve a lista nova na mesma resposta; e `useRouter` tornaria o formulário
  irrenderizável fora do contexto do app router, que é onde o teste do `AC3` o renderiza).
- **[AUTO-DECISION]** *A action lança quando falha?* → **nunca** (razão: `find src/app -name
  error.tsx` devolve vazio; um throw deixa o modal mudo — o defeito da `LTM-26`. Até a falha não
  prevista volta como `unexpected_error` com mensagem).

### Debug Log

| Porta | Resultado |
|---|---|
| `pnpm typecheck` (com `tsconfig.tsbuildinfo` apagado antes) | ✅ verde |
| `pnpm lint` | ✅ **0 erros**, 5 avisos — os mesmos 5 pré-existentes, nenhum nos arquivos desta story |
| `npx vitest run tests/money-path/definir-ganhadores.test.ts` | ✅ **22 passed (22)**, 98,8 s |

A suíte inteira e `pnpm build` **não** foram rodados aqui, por protocolo de onda: `.next`,
`tsconfig.tsbuildinfo` e a cota do Neon são compartilhados com os outros agentes da onda.

### Completion Notes

O último elo fechou: o número que o operador digita chega ao rateio, as duas metades saem com
`winning_half`, a metade órfã leva o prêmio inteiro, e a linha nasce com o `tenant_id` que a
página pública filtra — a máscara de lá já estava construída e o que faltava era a linha existir.
Sete recusas chegam à tela com a razão de cada uma, e nenhuma delas passa por um `throw`.

### File List

| Arquivo | O que |
|---|---|
| `apps/lotemania/src/lib/raffles/define-winners.ts` | **novo** — a decisão: dígitos, valor por lugar, data, aciona o rateio, lê o painel |
| `apps/lotemania/src/lib/actions/winners.ts` | **novo** — a casca `"use server"`: autoriza, delega, revalida, nunca lança |
| `apps/lotemania/src/app/dashboard/products/winners-dialog.tsx` | **novo** — `WinnersForm` + `WinnersDialog`, com `Acrescentar ganhador` |
| `apps/lotemania/tests/money-path/definir-ganhadores.test.ts` | **novo** — 22 testes |
| `apps/lotemania/src/app/dashboard/products/product-row-actions.tsx` | item `Definir ganhadores` no menu ⋮ (que tinha **um** item, e era `Excluir`) |
| `apps/lotemania/src/app/dashboard/products/page.tsx` | o ganhador inline na linha, com metade e data da compra |
| `apps/lotemania/src/lib/raffles/winners.ts` | **+1 parâmetro aditivo** (`prizeAmount?`), autorizado pelo controlador em 2026-11-20 |

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.3 | **Implementada. `Ready` → `InReview`.** Seis arquivos, e o quinto não estava no bloco `Files:`: `raffles/define-winners.ts` existe porque `"use server"` só exporta função assíncrona e porque mockar `cookies()` para verificar regra de prêmio verificaria o dublê. **Três defeitos achados que a story não previa:** (1) `42702` — a junta da `Data da compra` é subconsulta correlacionada e o drizzle emite coluna não qualificada em consulta de tabela única, derrubando **toda** a `/dashboard/products`; `alias()` não resolve o que é interpolado dentro do template `sql`, e os dois testes vermelhos eram os dois que gravam ganhador de verdade; (2) ignorar `winning_half` na junta casaria as duas metades com a **mesma** compra — a data de uma pessoa ao lado do nome da outra; (3) `prizeKind` tem default `"other"`, então o valor digitado tem de **pular** `prize_not_rateable` ou a capacidade nova morreria no caso comum. `winners.ts` ganhou `prizeAmount?` **aditivo** — ausente, a condição é a de antes caractere por caractere. **Fica aberto e declarado:** `AC9` (espera a `LTM-16`), `AC10` (build e suíte inteira são do controlador) e a **trava 2 do `AC11`** — a proibição de inventar valor foi honrada, mas registrar prêmio não monetário com valor nulo continua recusado, porque habilitar exige mudar as recusas da `LTM-07`. Portas: `typecheck` verde, `lint` 0 erros, `definir-ganhadores.test.ts` **22/22**. | @dev (Dex) |
| 2026-11-20 | 1.2 | **`AC3` e `AC11` reescritos por decisão do founder.** Ele respondeu à objeção do `AC11` reafirmando a capacidade: *"assim como na sorteamos, aqui devemos poder como usuário definir mais de um ganhador, devo poder cadastrar quantos eu quiser"* — **decisão informada, tomada depois de ouvir o risco do prêmio pago N vezes**. `AC3` passa a exigir **N ganhadores, quantos o operador quiser**, com os prêmios configurados como ponto de partida e **não** como teto. `AC11` troca de remédio: em vez de **recusar** o 2º lugar, **o operador digita o valor de cada lugar no modal** — a única fonte sem invenção, já que `prizes` é `z.array(z.string())` sem valor. Forma autorizada: **parâmetro opcional de valor** em `recordWinnersForDrawnTitle` (ausente lê `prizeAmount` como hoje, e os testes existentes seguem verdes; presente usa o dado), retrocompatível por construção. **As duas travas da medição original continuam inteiras:** (1) não dividir o `prizeAmount` do sorteio entre os lugares — assumir que o 2º vale metade é inventar no caminho do prêmio; (2) **`prize_amount` é nulável de propósito** (`raffles.ts:297`, conferido sem `.notNull()`), então prêmio não monetário grava descrição **sem valor** e **nunca 0,00** — zero é um valor, e R$ 0,00 na página pública é pior que nenhum. O rateio da meia cota passa a operar sobre o valor **daquele lugar**: a metade órfã leva o prêmio inteiro **do lugar dela**. **A pergunta *"como se declara o valor do 2º prêmio"* está respondida** e sai das pendências. | @po (Pax) |
| 2026-11-20 | 1.1 | **Validada — GO (8,5/10). `Draft` → `Ready`.** Fim aberto confirmado por medição: `recordWinnersForDrawnTitle` tem **um** importador e é um teste. Corrigi quatro ACs contra o domínio entregue e acrescentei o **AC11**: `AC3` manda um campo por prêmio, mas o domínio rateia **um** `prizeAmount` por sorteio e recebe **um** número por chamada — N campos salvos pagariam **N× o prêmio**, e nada no código impede. A trava é **recusar o 2º lugar com razão nomeada**, nunca dividir o valor por dedução; o valor por lugar vira pergunta de uma linha ao founder. `AC2` passou a cobrir as **quatro** recusas de `winners.ts:30-38` (a redação cobria uma, e a que o ensaio encontra primeiro é `prize_not_rateable`: sorteio sem prêmio em dinheiro declarado é recusado). `AC8` corrigido para a rota literal `/loja/{tenant}/ganhadores`, com o registro de que a máscara **já está construída** lá (`page.tsx:62`, `:81`) e de que `winning_half` não é exibido — aresta da `LTM-08`. `AC1` ganhou a junta `product_numbers.order_id → orders.created_at`, porque `winners` não guarda a data da compra. O `[CONFIRMAR]` do ganhador já definido está **metade respondido pelo código**: `already_recorded` recusa a segunda gravação. | @po (Pax) |
| 2026-11-19 | 1.0 | Nasce do mapeamento da corrente ponta a ponta, que achou o fim aberto: o rateio da `LTM-07` existe e **ninguém o chama**. Eu havia registrado três perguntas como *"não se respondem por dedução"*; **o founder respondeu mandando a tela da Sorteamos**, que eu deveria ter modelado no inventário e não modelei — `Definir ganhadores` é ação mutante e ficou de fora. As quatro capturas respondem as três perguntas: o operador **digita o número**, há **um campo por prêmio**, e o sistema **resolve número → comprador** sozinho. O que a Sorteamos **não** responde é a meia cota: lá o número tem um dono, aqui pode ter dois. | @aiox-master |
