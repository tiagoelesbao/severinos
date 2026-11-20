---
name: feedback-po-conferir-o-numero-medido
description: Número marcado como "conferido" na story tem de ser recontado, não aceito — em arquivo da fila serial do lotemania a linha envelhece em DIAS (as duas que eu corrigi em 11-18 moveram de novo em 48 h), então citação sem nome de símbolo não se escreve
metadata:
  type: feedback
---

Quando uma story apresenta um número como **medido** ("conferido em {data}: as 22 tabelas…",
"`bi_aggregator.py:1099` faz…"), recontar o número, não só confirmar a conclusão que ele sustenta.

**Why:** numa só rodada de validação no `EPIC-LTM` (2026-11-18) quatro números marcados como
conferidos estavam errados, e **todas as conclusões que eles sustentavam estavam certas** — foi por
isso que passaram:

| Afirmado | Real | Onde |
|---|---|---|
| "as 22 tabelas de `src/db/schema/`" | **34** | `LTM-16`, propagado para `LTM-10` (×2) e `LTM-13` |
| `bi_aggregator.py:1099` | **:1128** | `LTM-07`, 3ª ocorrência de citação velha na mesma story |
| `reserve.ts:353` (`reservedUntil`) | **:375** — e **`:423-424`** 48 h depois | `LTM-17` |
| `pedido/[orderId]/page.tsx:63` | **:98** — e **`:117`** 48 h depois | `LTM-17` |

O dano não é o número: é que um número apresentado como medido e que está 12 fora gasta a confiança
em **todos os outros números do mesmo artefato** — e aí a validação seguinte tem de reconferir tudo,
que é o custo que a marcação "conferido" existia para evitar. Pior quando propaga: o "22" já tinha
viajado para três stories antes de alguém recontar.

Causa estrutural, nesta base: **número de linha envelhece em dias.** `reserve.ts` e
`validations/reserve.ts` foram reescritos duas vezes em 48 horas por `LTM-02` e `LTM-03b`; toda
citação escrita antes disso mentia depois, sem ninguém errar nada.

**E em 2026-11-20 as duas linhas da tabela acima envelheceram de novo** — `:375` virou `:423-424` e
`:98` virou `:117`, porque `LTM-20` e `LTM-23` entraram em `reserve.ts` no intervalo. **As correções
que eu mesmo apliquei em 11-18 duraram dois dias**, e esta memória, que as registrava como "o
valor real", passou a mentir junto. Isso promove a regra 2 de boa prática a **obrigatória**: em
arquivo da fila serial, **citação sem símbolo não se escreve** — não porque é imprecisa, porque tem
prazo de validade medido em dias. Na mesma rodada, a citação que **não** envelheceu foi a única
ancorada em nome de função (`reservationMinutesFor`, `validations/reserve.ts:149`).

**How to apply:**

1. **Recontar, não reler.** `grep -c`, `wc -l`, contar as colunas do bloco. Se a story diz "as N
   tabelas", a conferência é um comando, não uma impressão.
2. **Citar o símbolo junto do número** — `reservationMinutesFor` (`validations/reserve.ts:149`), não
   só `:149`. O símbolo sobrevive ao `git`; o número não. Exigir isso na redação das stories.
3. **Quando o número estiver errado e a conclusão certa: corrigir o número, pontuar ⚠️ no eixo de
   alinhamento, e não dar NO-GO por isso.** Foi o que fiz com a `LTM-07` (9/10) e a `LTM-16` (8,5).
   O que decide NO-GO é conjunto de arquivos errado ou AC inexequível — não citação velha.
4. **Verificar se o número propagou** antes de considerar a correção feita: `grep` o número no epic
   inteiro. Se vazou para stories que não são minhas na rodada, registrar como item solto em vez de
   editá-las no meio de trabalho de outro agente.
5. **Não reescrever histórico.** Corrigir a citação nas seções **vivas** (AC, tarefas, contexto) e
   deixar as seções de validação antiga como estão — elas são registro do que eu escrevi na época.

Ver também [[feedback-po-conferir-correcao-aplicada]] (a correção foi aplicada?) e
[[feedback-po-conferir-contrato-no-codigo]] (o contrato é o que a story diz?). Este é o terceiro do
mesmo gênero: **a story é uma afirmação sobre o código, e o código é a autoridade.**
Contexto do epic em [[epic-ltm-validation]].
