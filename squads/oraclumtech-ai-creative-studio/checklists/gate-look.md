# Gate de Estágio — Look (`gate-look`)

> **Estágio:** `look` · **Dono:** `@dop` · **Executor:** `agent`
> **Roda:** ao fim do look-book, antes de liberar `design`/`stills`.
> **Artefato validado:** `{job}/07-look/look-book.md`
> **Libera:** próximo estágio do pipeline
> **Não se avalia aqui:** se os frames finais ficaram coerentes — isso é do gate de
> pipeline. Aqui se valida se o look foi traduzido em **parâmetro operável**, tanto para
> prompt de geração quanto para instrução de gravação real.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **LK-01** · `BLOQUEANTE` — O look-book define luz em termos operáveis.
  **Teste:** para cada cena/bloco, o documento traz qualidade (dura/difusa), direção (frontal, lateral, contraluz, cenital), temperatura e razão de contraste aproximada.
  **Falha se:** a luz é descrita por adjetivo ("dramática", "aconchegante") sem os parâmetros.

- [ ] **LK-02** · `BLOQUEANTE` — Lente e enquadramento traduzidos em valor.
  **Teste:** distância focal equivalente (ou "grande-angular/normal/tele" com faixa), altura de câmera e profundidade de campo pretendida.
  **Falha se:** ausente. Sem isso o prompt vira loteria e a gravação real vira improviso.

- [ ] **LK-03** · `BLOQUEANTE` — Paleta declarada com valores de cor.
  **Teste:** a paleta traz hex (ou referência de cor nomeada) e a relação com o `brand-config` do cliente.
  **Falha se:** a paleta é descrita só por nome de sensação ("tons terrosos quentes").

- [ ] **LK-04** · `BLOQUEANTE` — O look tem tradução dupla: prompt **e** gravação real.
  **Teste:** existe, por bloco, a formulação para prompt de geração e a instrução equivalente para captura real.
  **Falha se:** só existe uma das duas. O modo híbrido é premissa do squad.

- [ ] **LK-05** · `BLOQUEANTE` — Referência visual anexada por decisão, não por vibe.
  **Teste:** cada decisão de look aponta um frame de referência do moodboard.
  **Falha se:** as decisões flutuam sem âncora visual.

- [ ] **LK-06** · `BLOQUEANTE` — O look respeita o `brand-lock`.
  **Teste:** conferir paleta e tratamento contra o `brand-config`; conferir clichês proibidos.
  **Falha se:** o look contradiz a identidade sem decisão registrada.

- [ ] **LK-07** · `ATENÇÃO` — Tratamento de grade especificado.
  **Teste:** contraste, saturação, temperatura e referência de grade declarados.
  **Falha se:** ausente — cada asset chega com um tratamento diferente.

- [ ] **LK-08** · `ATENÇÃO` — Movimento de câmera definido por plano com propósito.
  **Teste:** cada movimento tem tipo e motivo.
  **Falha se:** o movimento é uniforme por padrão.

- [ ] **LK-09** · `ATENÇÃO` — Plano-âncora de look identificado.
  **Teste:** o documento aponta qual plano gerar primeiro para servir de referência aos demais.
  **Falha se:** não há âncora — a coerência vira sorte.

---

## Registro

| Campo | Valor |
|:---|:---|
| Blocos com luz parametrizada | |
| Paleta (hex) | |
| Plano-âncora | |
| Tradução dupla presente? | sim · não |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **REPROVADO** — devolve ao `@dop`.
