# LTM-27: Definir ganhadores — o último elo da corrente

**Status:** Ready
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

### 3. A validação de dígitos é da Sorteamos e vale copiar

*"Essa campanha é de N dígitos"* — derivado de `totalNumbers`. Evita o operador digitar `042` num
sorteio de 100 ou `7` num de 1.000. É barato e previne erro no caminho do prêmio.

### 4. `Data do sorteio` é editável no modal

A Sorteamos deixa corrigir a data ali. Faz sentido: o sorteio aconteceu fora do sistema, e a data
registrada no cadastro pode não ser a da extração real.

---

## Tarefas (Checklist)

- [ ] Item **`Definir ganhadores`** no menu ⋮ da linha do sorteio.
- [ ] Modal `Ganhadores`: data do sorteio editável, **um campo por prêmio**, aviso de dígitos.
- [ ] Resolver número → comprador(es), **acionando `src/lib/raffles/winners.ts`**.
- [ ] Gravar `winners`, incluindo `winning_half` em sorteio divisível.
- [ ] A lista de sorteios mostra o ganhador inline depois de salvo.
- [ ] **Mostrar as quatro recusas do domínio** com a razão de cada uma (AC2).
- [ ] ~~`[CONFIRMAR]` com o founder: **dá para corrigir um ganhador já definido?**~~
      **Metade respondida pelo código** (@po, 2026-11-20): `winners.ts:131-152` já **recusa** a
      segunda gravação do mesmo título (`already_recorded`), *"nada foi alterado"*. Então o
      comportamento desta story está decidido: **não sobrescreve**. O que continua sendo pergunta de
      founder é se existe **desfazer** — e isso é story própria, porque apagar ganhador no caminho do
      prêmio sem a trilha da `LTM-16` é irreversível e inexplicável.

---

## Critérios de Aceite

- [ ] **AC1 (o número acha o dono):** operador digita um número **vendido**; o sistema grava um
      ganhador com o comprador daquele número, e a lista mostra nome e data da compra.
  - ⚠️ **A data da compra não está em `winners`** (@po, 2026-11-20). A tabela tem `winner_name`,
    `phone`, `prize_description`, `prize_amount`, `winning_number`, `winning_half` e `announced_at`
    — e **nenhuma referência ao pedido**. Exibir *"Data da compra"* como a Sorteamos exibe obriga a
    juntar `product_numbers.order_id → orders.created_at` **na hora de exibir**. É alcançável e não
    pede coluna nova; está escrito aqui porque descobrir isso no meio da implementação é o que faz
    um AC virar "mostra o que der".
- [ ] **AC2 (toda recusa é nomeada, e são quatro):** o domínio entregue já recusa em **quatro**
      situações, e a tela tem de mostrar **a razão de cada uma**, nunca um erro genérico:
      `no_sold_units` (ninguém comprou o título), `already_recorded` (o título já tem ganhador),
      `prize_not_rateable` (prêmio não é dinheiro, ou o valor não se lê) e `raffle_not_found`.
      **Nunca** grava ganhador vazio nem inventa comprador.
  - ⚠️ **Conferido em `src/lib/raffles/winners.ts:30-38` (@po, 2026-11-20).** A redação anterior
    cobria **uma** das quatro. As outras três não são teóricas: `prize_not_rateable` é a que o
    **ensaio ponta a ponta vai encontrar primeiro** se o sorteio de teste não tiver `prizeKind`
    `cash` **com valor declarado** — e aí a tela recusa com razão certa e o operador acha que a
    funcionalidade está quebrada.
- [ ] **AC3 (um campo por prêmio):** sorteio com 3 prêmios mostra **3** campos; com 1, mostra 1. O
      número de campos vem dos prêmios configurados (`prizes`, `product-settings.ts:39`), não de
      constante.
  - ⚠️ **Observado × deduzido** (@po, 2026-11-20): a captura mostra **um** campo, rotulado
    `Ganhador: Prêmio 1`. *"Três prêmios → três campos"* é **dedução razoável a partir do rótulo**,
    não observação. Fica marcado como tal, e o **AC11** governa o que acontece a partir do segundo.
- [ ] **AC4 (a meia cota gera dois ganhadores):** sorteio divisível, número com **as duas metades
      vendidas a pessoas diferentes** → **duas** linhas de `winners`, cada uma com seu
      `winning_half`, e os prêmios **somando exatamente** o prêmio do lugar. É o AC que prova a
      feature que o cliente pediu, ponta a ponta.
- [ ] **AC5 (metade órfã leva tudo):** sorteio divisível, só **uma** metade vendida → **uma** linha,
      **prêmio integral**. É a regra do `ADR-0001` exercitada pela tela.
- [ ] **AC6 (a validação de dígitos):** sorteio de 100 números recusa `042` e `7`? **[CONFIRMAR]** o
      comportamento exato da Sorteamos — ela **avisa** (*"Utilize os dígitos corretos"*); se ela
      recusa ou só orienta, não foi observado. Na dúvida, **recusar** é mais seguro que aceitar.
- [ ] **AC7 (a data do sorteio é editável e é a gravada):** a data informada no modal é a que vai
      para `winners.announced_at`, não a data do clique.
- [ ] **AC8 (aparece na loja):** depois de salvo, o ganhador aparece na página pública
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
- [ ] **AC11 (o prêmio do lugar tem valor, ou a tela recusa — @po, 2026-11-20):** o domínio rateia
      **um** valor por sorteio — `advanced_settings.prizeAmount`, lido em `winners.ts:106-116` — e
      `recordWinnersForDrawnTitle` recebe **um** número por chamada. Então, num sorteio com **mais de
      um** prêmio em `prizes`, salvar os N campos faria **N chamadas rateando o valor cheio N vezes**:
      o sorteio pagaria N× o prêmio, e **nada no código de hoje impede isso**.
      Nesta story, o comportamento exigido é: **o segundo campo preenchido em diante é recusado com a
      razão nomeada** — *"este sorteio declara um valor de prêmio só; o valor do 2º lugar não existe
      no cadastro"* — e **nenhuma linha de `winners` é gravada** para ele.
  - ⛔ **Não inventar o valor por lugar.** Dividir o `prizeAmount` entre os lugares, ou assumir que o
    2º vale metade, é inventar no caminho do prêmio. `prizes` é `z.array(z.string())` — **descrição
    livre, sem valor** (`product-settings.ts:39-44`).
  - ❓ **Pergunta de uma linha para o founder, registrada e não deduzida:** *"como se declara o valor
    do 2º e do 3º prêmio?"* Enquanto ela não for respondida, sorteio de **um** prêmio em dinheiro é o
    caminho completo — e é o caso do ensaio ponta a ponta, que não fica bloqueado por ela.

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
   mandando fazer uma coisa que o domínio executa errado por construção. A trava é recusar, **não**
   dividir por dedução.
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
- **O valor do 2º prêmio** é pergunta de uma linha ao founder (`AC11`). Não bloqueia o ensaio, que
  roda com um prêmio em dinheiro.
- **`winning_half` na loja** é da `LTM-08`.

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.1 | **Validada — GO (8,5/10). `Draft` → `Ready`.** Fim aberto confirmado por medição: `recordWinnersForDrawnTitle` tem **um** importador e é um teste. Corrigi quatro ACs contra o domínio entregue e acrescentei o **AC11**: `AC3` manda um campo por prêmio, mas o domínio rateia **um** `prizeAmount` por sorteio e recebe **um** número por chamada — N campos salvos pagariam **N× o prêmio**, e nada no código impede. A trava é **recusar o 2º lugar com razão nomeada**, nunca dividir o valor por dedução; o valor por lugar vira pergunta de uma linha ao founder. `AC2` passou a cobrir as **quatro** recusas de `winners.ts:30-38` (a redação cobria uma, e a que o ensaio encontra primeiro é `prize_not_rateable`: sorteio sem prêmio em dinheiro declarado é recusado). `AC8` corrigido para a rota literal `/loja/{tenant}/ganhadores`, com o registro de que a máscara **já está construída** lá (`page.tsx:62`, `:81`) e de que `winning_half` não é exibido — aresta da `LTM-08`. `AC1` ganhou a junta `product_numbers.order_id → orders.created_at`, porque `winners` não guarda a data da compra. O `[CONFIRMAR]` do ganhador já definido está **metade respondido pelo código**: `already_recorded` recusa a segunda gravação. | @po (Pax) |
| 2026-11-19 | 1.0 | Nasce do mapeamento da corrente ponta a ponta, que achou o fim aberto: o rateio da `LTM-07` existe e **ninguém o chama**. Eu havia registrado três perguntas como *"não se respondem por dedução"*; **o founder respondeu mandando a tela da Sorteamos**, que eu deveria ter modelado no inventário e não modelei — `Definir ganhadores` é ação mutante e ficou de fora. As quatro capturas respondem as três perguntas: o operador **digita o número**, há **um campo por prêmio**, e o sistema **resolve número → comprador** sozinho. O que a Sorteamos **não** responde é a meia cota: lá o número tem um dono, aqui pode ter dois. | @aiox-master |
