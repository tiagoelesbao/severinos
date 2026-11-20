# LTM-27: Definir ganhadores — o último elo da corrente

**Status:** Draft
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
- [ ] `[CONFIRMAR]` com o founder: **dá para corrigir um ganhador já definido?** A Sorteamos
      permite reabrir o modal — mas o que acontece com o registro anterior **não foi observado**.

---

## Critérios de Aceite

- [ ] **AC1 (o número acha o dono):** operador digita um número **vendido**; o sistema grava um
      ganhador com o comprador daquele número, e a lista mostra nome e data da compra.
- [ ] **AC2 (número não vendido é recusa nomeada):** digitar número que ninguém comprou **não grava
      nada** e diz por quê. **Nunca** grava ganhador vazio nem inventa comprador. É o AC que impede
      o erro mais caro desta tela.
- [ ] **AC3 (um campo por prêmio):** sorteio com 3 prêmios mostra **3** campos; com 1, mostra 1. O
      número de campos vem dos prêmios configurados (`prizes`), não de constante.
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
      `/ganhadores` e na página da campanha concluída — **com nome e telefone mascarados**, como a
      `LTM-15` exige. O painel mostra inteiro; a loja, não.
- [ ] **AC9 (ação mutante tem rastro):** quem definiu o ganhador e quando ficam registrados.
      Depende da `LTM-16`; enquanto ela não existir, o AC fica aberto e **declarado**.
- [ ] **AC10 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

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

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-19 | 1.0 | Nasce do mapeamento da corrente ponta a ponta, que achou o fim aberto: o rateio da `LTM-07` existe e **ninguém o chama**. Eu havia registrado três perguntas como *"não se respondem por dedução"*; **o founder respondeu mandando a tela da Sorteamos**, que eu deveria ter modelado no inventário e não modelei — `Definir ganhadores` é ação mutante e ficou de fora. As quatro capturas respondem as três perguntas: o operador **digita o número**, há **um campo por prêmio**, e o sistema **resolve número → comprador** sozinho. O que a Sorteamos **não** responde é a meia cota: lá o número tem um dono, aqui pode ter dois. | @aiox-master |
