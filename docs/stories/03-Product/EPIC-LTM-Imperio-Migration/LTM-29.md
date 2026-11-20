# LTM-29: O sorteio de carro não consegue registrar ganhador

**Status:** Draft
**Epic:** EPIC-LTM-Imperio-Migration (Frente A — Fundação)
**Prioridade:** **P1** — não bloqueia o ensaio (o sorteio de teste é em dinheiro), **bloqueia metade da operação real**
**Complexidade:** S — o schema já suporta; o que falta é uma recusa deixar de ser larga demais
**Criada por:** @aiox-master · 2026-11-20
**Origem:** item devolvido pelo @dev ao fim da `LTM-27`, declarado em vez de contornado

## O que acontece hoje

Um sorteio de prêmio **não monetário** — um carro, uma moto, um celular — **não consegue registrar
ganhador nenhum**. `recordWinnersForDrawnTitle` recusa com `prize_not_rateable`
(`src/lib/raffles/winners.ts:143-150`), porque a condição é:

```ts
if (
  (informedAmount === null && prizeKind !== "cash") ||
  prizeAmount === null ||
  prizeAmount.trim() === ""
) { /* recusa */ }
```

**O segundo ramo é o que fecha a porta:** sem valor em reais, recusa — e prêmio não monetário **não
tem valor em reais por definição**. O operador que sorteia um carro chega ao fim da rodada, aperta
`Definir ganhadores`, e recebe *"o rateio precisa de um prêmio em dinheiro com valor declarado"*.

## Por que isto não é defeito da `LTM-27` nem da `LTM-07`

**A recusa está certa para o caso que ela foi escrita para proteger, e larga demais para o resto.**
O comentário de `winners.ts:110-114` diz, textualmente:

> *"Prêmio não monetário é RECUSADO aqui, e isso não tira função de ninguém: ratear "um carro" entre
> duas pessoas não tem resultado definido, e registrar ganhador de prêmio não monetário é a tela de
> ganhadores da LTM-08, que grava descrição sem valor."*

A primeira metade é **irrefutável**: meia cota de um carro não tem rateio definido — e a `LTM-08`
fecha isso pelo outro lado, com o `AC7`, que **recusa habilitar divisibilidade em sorteio de prêmio
não monetário**. Ou seja: **prêmio não monetário implica título inteiro**, e título inteiro **não
precisa de rateio nenhum**.

A segunda metade é o problema: ⚠️ **a `LTM-08` não tem essa função.** Conferido em 2026-11-20 —
a única menção a prêmio não monetário na `LTM-08` é o `AC7`, que vai na **direção oposta**
(recusar divisibilidade). O bloco `Files:` dela, validado pelo @po hoje com 9 caminhos medidos,
**não inclui nada que grave `winners`**.

> **Então a função não é de ninguém.** O comentário delegou, a story delegada não assumiu, e o
> resultado é um caminho de produto que nenhuma das duas cobre. **É o mesmo gênero de buraco que o
> `ENSAIO-GERAL.md` achou no fim da corrente** — lá era "ninguém chama `winners.ts`", aqui é
> "ninguém grava ganhador sem valor".

## A prova de que o caso é real, não hipotético

Os dois tipos de prêmio existem na operação do Império, medidos no inventário:

| Evidência | Onde | O que mostra |
|---|---|---|
| `"title": "Sorteio Fiat Toro 2025"` | `webhook-saida-contrato.md:92`, payload real de `order.paid` | sorteio de **veículo** |
| `Prêmio: R$ 27.000,00` | `loja-comprador.md:125` | sorteio em **dinheiro** |

**Hoje o lotemania registra ganhador do segundo e não do primeiro.**

## O que o banco já permite — e é por isso que a story é S e não M

```
winners.prize_description   text          NOT NULL      ← a descrição é obrigatória
winners.prize_amount        numeric(12,2) NULL          ← o valor é OPCIONAL
```

`src/db/schema/raffles.ts:296-297`. **A coluna de valor já é nulável.** Não há migração, não há
coluna nova, não há mudança de contrato de exibição — a página pública já lê `prizeAmount` e já
convive com ele ausente.

## Story

**Como** operador do Império que sorteia um carro
**Eu quero** registrar quem ganhou, com a descrição do prêmio e sem valor em reais
**Para que** o fim da rodada seja o mesmo fim das rodadas em dinheiro.

---

## Decisão de arquitetura

### A recusa não desaparece — ela ganha a condição que lhe faltava

O que hoje é *"sem valor em reais, recusa"* passa a ser *"sem valor em reais **e** com rateio a
fazer, recusa"*. As duas situações em que a recusa **tem** de continuar:

1. **Título divisível com prêmio sem valor.** É o caso que o comentário protege, e ele continua
   recusado — não há como dividir um carro entre duas metades.
2. **Prêmio em dinheiro com valor ausente ou inválido.** `prizeKind: "cash"` sem `prizeAmount`, ou
   com valor ≤ 0, é **cadastro incompleto**, não prêmio não monetário. Recusar é o certo, e a
   mensagem tem de distinguir os dois — hoje as duas caem no mesmo texto.

### ⛔ O que não se faz

- **Não inventar valor para o prêmio não monetário.** Nem 0,00, nem o preço da cota × número de
  cotas, nem "valor de mercado". `prize_amount` fica **nulo**, que é o que a coluna nulável existe
  para dizer. Gravar `0,00` afirmaria que o carro vale zero — e `0,00` é um número, não a ausência
  de um.
- **Não aceitar prêmio não monetário em sorteio divisível** só porque o caminho novo existe. O
  `AC7` da `LTM-08` recusa a divisibilidade na entrada; esta story recusa o rateio na saída. **As
  duas travas são necessárias**: a da `LTM-08` protege o cadastro, esta protege o registro de
  sorteios que já foram criados antes de ela existir.

### ⚠️ `winners.ts` está sob portaria, e isso define a forma

O portão do @qa fechou a `LTM-07` com `CONCERNS` em `commit:1df81ebe`, e a `LTM-27` já acrescentou
**um** parâmetro aditivo ao arquivo com autorização explícita. **Esta story mexe na lógica de recusa**,
que é o que a `LTM-27` foi instruída a *não* tocar — então ela é a story onde isso é feito **de
propósito e com teste próprio**, não de passagem.

---

## Tarefas (Checklist)

- [ ] A recusa `prize_not_rateable` ganha a condição de divisibilidade.
- [ ] O caminho sem valor grava `prize_description` com `prize_amount` **nulo**.
- [ ] A mensagem distingue **prêmio não monetário** de **cadastro de prêmio em dinheiro incompleto**.
- [ ] O modal de `Definir ganhadores` deixa o campo de valor **opcional** quando o sorteio não é
      divisível — e diz por quê, em vez de só aceitar vazio.
- [ ] A página pública de ganhadores exibe a descrição sem valor **sem quebrar** (conferir, não supor).

---

## Critérios de Aceite

- [ ] **AC1 (o carro tem ganhador):** sorteio **não divisível** com `prizeKind: "other"` e sem
      `prizeAmount` → `Definir ganhadores` grava **uma** linha de `winners` com a descrição informada
      e `prize_amount` **nulo** (`IS NULL`, não `'0.00'`).
- [ ] **AC2 (o rateio continua recusado):** sorteio **divisível** com prêmio sem valor → **recusa**,
      com a mensagem que nomeia a razão. **É o AC que impede esta story de desfazer a proteção que o
      comentário de `winners.ts:110` escreveu.**
- [ ] **AC3 (cadastro incompleto não passa por prêmio não monetário):** `prizeKind: "cash"` **sem**
      `prizeAmount`, ou com valor ≤ 0 → **recusa**, e com mensagem **diferente** da do AC2. Teste
      compara os dois textos e exige que sejam distintos. ⚠️ Hoje os dois casos caem no mesmo texto,
      e é isso que faz o operador não saber se o problema é o prêmio ou o cadastro.
- [ ] **AC4 (nada é inventado):** nenhum caminho grava `prize_amount` igual a `'0.00'`, ao preço da
      cota, ou a qualquer valor derivado. Teste de banco: no caso do AC1, a coluna é `NULL`.
- [ ] **AC5 (a meia cota em dinheiro não muda):** os testes da `LTM-07` e da `LTM-27` continuam
      verdes **sem serem tocados**. Mesma prova de aditividade que a `LTM-27` usou para o parâmetro
      de valor.
- [ ] **AC6 (a loja aguenta):** `/loja/{tenant}/ganhadores` renderiza o ganhador de prêmio não
      monetário — com nome e telefone mascarados, como a `LTM-15` exige — **sem** exibir "R$" vazio,
      "R$ 0,00" ou `null`.
- [ ] **AC7 (porta verde):** `pnpm lint`, `pnpm typecheck`, `pnpm build`, `npm run test`.

---

## Escopo

**IN:** a condição que falta na recusa; a gravação com valor nulo; a distinção das duas mensagens; o
campo opcional no modal; a conferência da página pública.

**OUT:**

- **Rateio de prêmio não monetário.** Não existe resultado definido, e a `LTM-08` já recusa a
  divisibilidade na entrada.
- **Valor de mercado do prêmio.** Se o founder quiser registrar *"um Fiat Toro, valor estimado
  R$ 120.000"*, isso é **campo novo de cadastro** e uma decisão dele — não se deduz desta story, e o
  caminho do valor informado da `LTM-27` **já atende** quem quiser digitar um valor.
- **Mudar o default de `prizeKind`.** Ele é `"other"` de propósito, conservador
  (`product-settings.ts:67`), e mudá-lo faria sorteio antigo passar a afirmar que o prêmio é
  dinheiro.

---

## Dependências

- **Depende da `LTM-27`** (`InReview`) — é de lá que vem o modal de `Definir ganhadores` e o caminho
  do valor informado. **Esta story edita o que aquela construiu.**
- ⚠️ **Toca `src/lib/raffles/winners.ts`**, que a `LTM-27` acabou de tocar e que está citado no
  portão da `LTM-07`. **Serializar: depois da `LTM-27` passar portão.**
- **Informa a `LTM-08`:** o `AC7` dela e o `AC2` desta são as duas metades da mesma regra, uma na
  entrada e outra na saída. Nenhuma das duas substitui a outra.

### Nota de formação de ondas (`.claude/rules/parallel-waves.md`)

```
Files:
  apps/lotemania/src/lib/raffles/winners.ts                          (a condicao da recusa)
  apps/lotemania/src/app/dashboard/products/winners-dialog.tsx       (valor opcional + a razao)
  apps/lotemania/tests/money-path/premio-nao-monetario.test.ts        (novo)

Resources:
  banco de teste    — COMPARTILHADO. Base/esquema proprio por tarefa.
  NENHUMA migracao  — `winners.prize_amount` JA e nulavel (raffles.ts:297)

Depends-on: LTM-27 (o modal e o caminho do valor informado)
```

- ⛔ **Não compartilha onda com a `LTM-27`** — mesmo arquivo, e a `LTM-27` vem primeiro.
- ✅ **Não toca `reserve.ts`**, nem `src/lib/payments/`, nem o editor de sorteio. Fica fora das três
  filas disputadas do epic.

---

## Riscos

- **[Alto] Desfazer a proteção do rateio ao alargar a recusa.** O caminho novo tem de ser **estreito**:
  título **não divisível**, e só. `AC2` é a trava, e é a razão de esta story ter ACs em vez de ser
  um ajuste de condição.
- **[Médio] As duas mensagens continuarem iguais.** Se prêmio não monetário e cadastro incompleto
  derem o mesmo texto, o operador não sabe o que fazer — e o que ele faz quando não sabe é digitar
  um valor qualquer, que é exatamente o que o `AC4` existe para impedir. `AC3` compara os textos.
- **[Baixo] A página pública exibir "R$ 0,00" ou vazio.** Ela já convive com `prizeAmount` nulo
  porque a coluna sempre foi nulável, mas **isso não foi conferido com dado real** — e é por isso que
  o `AC6` manda conferir em vez de supor.

---

## Change Log

| Data | Versão | Descrição | Autor |
|---|---|---|---|
| 2026-11-20 | 1.0 | Nasce de um item que o @dev **devolveu declarado em vez de contornar** ao fim da `LTM-27`: prêmio não monetário continua recusado. Medido: `winners.ts:143-150` recusa sempre que não há valor em reais, e prêmio não monetário **não tem** valor em reais — então **sorteio de carro não registra ganhador nenhum**. O comentário de `winners.ts:110-114` delega a função à `LTM-08`, e ⚠️ **a `LTM-08` não a tem**: conferido hoje, a única menção dela a prêmio não monetário é o `AC7`, que vai na direção **oposta** (recusar divisibilidade), e o bloco `Files:` validado pelo @po não inclui nada que grave `winners`. **A função não é de ninguém.** O caso é real e não hipotético: `webhook-saida-contrato.md:92` tem `"Sorteio Fiat Toro 2025"` num payload real, e `loja-comprador.md:125` tem `Prêmio: R$ 27.000,00` — os dois tipos existem na operação, e hoje só um registra ganhador. Complexidade **S** porque o banco já suporta: `winners.prize_amount` é nulável desde sempre (`raffles.ts:297`). A recusa **não desaparece** — ganha a condição que lhe faltava: sem valor **e** com rateio a fazer. E o `AC4` proíbe inventar: nem `0,00`, nem preço da cota × cotas, nem valor de mercado, porque `0,00` é um número e não a ausência de um. | @aiox-master |
