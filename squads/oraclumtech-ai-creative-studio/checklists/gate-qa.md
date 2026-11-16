# Gate de Estágio — QA (`gate-qa`)

> **Estágio:** `gate` · **Dono:** `@qa-critic` · **Executor:** `agent`
> **Roda:** depois do `factcheck`, antes de liberar `delivery`.
> **Artefato validado:** `{job}/15-gate/gate-verdict.md`
> **Libera:** estágio `delivery`
> **Distinção importante:** o julgamento da **peça** acontece no gate de PIPELINE
> (`gate-<pipeline-id>.md` + `gate-transversal-entrega.md`). Este checklist valida o
> **veredito como artefato**: se foi produzido corretamente, se é auditável e se a regra de
> decisão foi aplicada na ordem certa. Veredito mal escrito é tão danoso quanto peça ruim,
> porque libera entrega sem rastro.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha e a entrega não é liberada |
| `ATENÇÃO` | Fecha com ressalva registrada em `job.json` |

---

## Bloco 1 — Pré-condição e existência

- [ ] **QA-01** · `BLOQUEANTE` — O `gate-factcheck` foi aprovado antes deste estágio.
  **Teste:** `job.json` registra o estágio `factcheck` como aprovado, e o laudo não está `BLOCKED`.
  **Falha se:** o veredito foi produzido sem laudo aprovado.

- [ ] **QA-02** · `BLOQUEANTE` — Existe `{job}/15-gate/gate-verdict.md` para esta versão da peça.
  **Teste:** o arquivo existe e sua data é posterior à do master avaliado.
  **Falha se:** não existe, ou julga uma versão anterior.

- [ ] **QA-03** · `BLOQUEANTE` — O veredito declara quais checklists foram usados.
  **Teste:** o cabeçalho nomeia o `gate-<pipeline-id>.md` correspondente ao gênero de `job.json` **e** o `gate-transversal-entrega.md`.
  **Falha se:** ausente, ou usou o gate de outro gênero.

---

## Bloco 2 — Completude do veredito

- [ ] **QA-04** · `BLOQUEANTE` — O veredito é um dos quatro estados canônicos.
  **Teste:** `PASS`, `CONCERNS`, `FAIL` ou `WAIVED`, escrito de forma inequívoca.
  **Falha se:** o documento termina em recomendação, sem estado.

- [ ] **QA-05** · `BLOQUEANTE` — Todos os itens dos dois checklists foram respondidos.
  **Teste:** contar itens do gate de gênero + do transversal; cada um marcado PASS, FAIL ou N/A.
  **Falha se:** há item sem resposta, ou N/A sem justificativa.

- [ ] **QA-06** · `BLOQUEANTE` — Todo item FAIL tem achado no formato de quatro partes.
  **Teste:** item do checklist + evidência localizável (timecode, frame, arquivo, linha) + conserto executável + responsável nomeado.
  **Falha se:** falta qualquer parte. Achado incompleto não é acionável e não deveria ter sido registrado.

- [ ] **QA-07** · `BLOQUEANTE` — A rubrica D1–D6 foi pontuada com justificativa ancorada no critério.
  **Teste:** cada dimensão tem nota de 1 a 5 e a justificativa aplica a pergunta verificável (contagem de defeitos, listagem de divergências, enunciado da big idea).
  **Falha se:** há nota sem justificativa, ou justificativa por impressão.

- [ ] **QA-08** · `BLOQUEANTE` — O veredito lista os itens **aprovados**.
  **Teste:** existe a seção de aprovados.
  **Falha se:** ausente — veredito só com faltas não é auditável.

- [ ] **QA-09** · `ATENÇÃO` — Vocabulário vago ausente do documento.
  **Teste:** varrer por "está bom", "ficou legal", "faltou impacto", "não me convenceu", "tem qualidade", "poderia ser melhor".
  **Falha se:** encontrar qualquer um.

---

## Bloco 3 — Correção da decisão

- [ ] **QA-10** · `BLOQUEANTE` — A regra de veredito foi aplicada na ordem canônica.
  **Teste:** conferir a sequência — fact-check aberto → bloqueante de gênero → bloqueante transversal → média < 3,0 → atenção reprovada ou média 3,0–3,9 → PASS. O primeiro critério satisfeito define o estado.
  **Falha se:** o estado declarado não corresponde ao que a regra produz com os dados do próprio documento.

- [ ] **QA-11** · `BLOQUEANTE` — Nenhum PASS ou CONCERNS com bloqueante em aberto.
  **Teste:** cruzar a contagem de bloqueantes reprovados com o estado declarado.
  **Falha se:** há bloqueante reprovado e o estado não é FAIL nem WAIVED válido.

- [ ] **QA-12** · `BLOQUEANTE` — `WAIVED` foi usado corretamente.
  **Teste:** há item bloqueante dispensado, de categoria waivable, com autor `@studio-chief`, justificativa material, data e **prazo de correção**.
  **Falha se:** o estado é `WAIVED` sem esses campos, ou o item era non-waivable, ou o waiver foi assinado por quem não podia.

- [ ] **QA-13** · `BLOQUEANTE` — Em `FAIL`, o documento nomeia o estágio exato de retorno.
  **Teste:** cada falta aponta o estágio de origem (`script`, `stills`, `takes`, `audio`, `assembly`).
  **Falha se:** o FAIL devolve "para o time", sem endereço.

- [ ] **QA-14** · `ATENÇÃO` — Em `CONCERNS`, as ressalvas estão prontas para anexar ao manifesto.
  **Teste:** existe lista de ressalvas em formato transportável para o `delivery-manifest`.
  **Falha se:** as ressalvas estão diluídas no texto corrido.

- [ ] **QA-15** · `ATENÇÃO` — O contador de ciclos está registrado e dentro do teto.
  **Teste:** `job.json` registra o número de regates; o teto é 3.
  **Falha se:** estourou sem escalação ao `@studio-chief`, ou o contador não existe.

- [ ] **QA-16** · `ATENÇÃO` — Critérios novos foram para o backlog, não usados contra esta peça.
  **Teste:** existe a seção de backlog de checklist; nenhum item reprovado cita regra que não estava escrita antes da produção.
  **Falha se:** a peça foi reprovada por critério criado durante o julgamento.

- [ ] **QA-17** · `ATENÇÃO` — Histórico preservado em regate.
  **Teste:** relatórios anteriores continuam em disco, com sufixo de ciclo.
  **Falha se:** o relatório anterior foi sobrescrito.

---

## Registro

| Campo | Valor |
|:---|:---|
| Veredito declarado | |
| Gate de gênero usado | |
| Bloqueantes reprovados / atenções | |
| Média da rubrica | |
| Ciclo (regate nº) | |
| Waivers (item, autor, prazo) | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera `delivery` conforme o estado
  declarado: PASS entrega; CONCERNS exige ciência escrita do solicitante; WAIVED entrega
  com dívida registrada e prazo.
- **REPROVADO** — o veredito volta ao `@qa-critic` para ser refeito. Enquanto o artefato de
  veredito for inválido, a entrega não acontece, mesmo que a peça esteja boa.
