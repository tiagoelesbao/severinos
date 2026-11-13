# Gate de Estágio — Brief (`gate-brief`)

> **Estágio:** `brief` · **Dono:** `@brief-strategist` · **Executor:** `agent`
> **Roda:** ao fim do brief, antes de liberar `research` (ou `concept`, conforme o pipeline).
> **Artefato validado:** `{job}/01-brief/brief.yaml` + `{job}/01-brief/brand-lock.yaml`
> **Libera:** próximo estágio do pipeline
> **Não se avalia aqui:** se a ideia é boa. Aqui se valida se o **problema** foi
> formulado de forma que alguém consiga resolvê-lo e verificar se resolveu.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **BR-01** · `BLOQUEANTE` — O brief segue o template e não tem campo obrigatório vazio.
  **Teste:** conferir `{job}/01-brief/brief.yaml` contra `templates/brief-tmpl.yaml`; nenhum campo obrigatório com `TODO`, `<...>` ou `null`.
  **Falha se:** falta qualquer campo obrigatório.

- [ ] **BR-02** · `BLOQUEANTE` — Objetivo de negócio expresso como mudança de comportamento, não como peça.
  **Teste:** o campo `objetivo_negocio` descreve o que deve acontecer no mundo (mais lead qualificado, mais recorrência, mais reconhecimento), não o entregável ("fazer um vídeo de 30s").
  **Falha se:** o objetivo é a descrição do produto que se vai fabricar.

- [ ] **BR-03** · `BLOQUEANTE` — KPI declarado e mensurável.
  **Teste:** `kpi` traz métrica, valor-alvo (ou baseline) e onde será medida.
  **Falha se:** o KPI é "engajamento" sem métrica, ou não diz onde é lido.

- [ ] **BR-04** · `BLOQUEANTE` — Avatar descrito com dor e contexto, não com demografia solta.
  **Teste:** `avatar` traz quem é, a dor concreta e a situação em que a peça o encontra.
  **Falha se:** só há faixa etária e gênero.

- [ ] **BR-05** · `BLOQUEANTE` — Insight declarado e distinto do objetivo.
  **Teste:** `insight` é uma verdade sobre o avatar que a peça vai explorar; não repete o objetivo nem descreve o produto.
  **Falha se:** o campo repete o objetivo, ou lista features.

- [ ] **BR-06** · `BLOQUEANTE` — `brand-lock.yaml` gerado a partir do brand-identity do cliente correto.
  **Teste:** o arquivo registra caminho e `meta.versao` do brand-identity usado, o léxico proibido, o léxico próprio, o arquétipo e as restrições.
  **Falha se:** o brand-lock não existe, ou aponta o brand-identity da Oraclum num job de cliente externo.

- [ ] **BR-07** · `BLOQUEANTE` — Restrições não-negociáveis do cliente transcritas no brief.
  **Teste:** para a Oraclum, o brief carrega explicitamente "sem case fabricado" e a lista `lexico.nunca_usar`.
  **Falha se:** as restrições ficaram só no arquivo de origem — quem escreve o roteiro lê o brief, não o brand-identity.

- [ ] **BR-08** · `BLOQUEANTE` — Existe a seção "o que NÃO fazer".
  **Teste:** `nao_fazer[]` tem ao menos 3 itens específicos deste job.
  **Falha se:** vazio, ou preenchido com generalidades que valem para qualquer peça.

- [ ] **BR-09** · `BLOQUEANTE` — Canal, formato, proporção e duração-alvo declarados por destino.
  **Teste:** cada destino de `job.json` tem a especificação correspondente no brief.
  **Falha se:** falta especificação de algum destino.

- [ ] **BR-10** · `ATENÇÃO` — Referências iniciais anexadas ou explicitamente adiadas para o `research`.
  **Teste:** `referencias[]` preenchido, ou marcado como responsabilidade do `research`.
  **Falha se:** o campo ficou ambíguo.

- [ ] **BR-11** · `ATENÇÃO` — O brief cabe no prazo e no orçamento do job.
  **Teste:** o `@exec-producer` confirmou viabilidade do escopo contra `job.json.prazo` e `orcamento_creditos`.
  **Falha se:** não houve confirmação.

- [ ] **BR-12** · `ATENÇÃO` — O solicitante validou o brief.
  **Teste:** existe registro de aprovação (data e quem) em `job.json`.
  **Falha se:** o pipeline avança com brief não validado — retrabalho garantido no `concept`.

---

## Registro

| Campo | Valor |
|:---|:---|
| Objetivo de negócio | |
| KPI e onde é medido | |
| Insight em uma frase | |
| brand-identity (caminho + versão) | |
| Itens "não fazer" (qtd) | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **REPROVADO** — devolve ao `@brief-strategist`. Um brief incompleto contamina todos
  os estágios seguintes e o erro só aparece no gate de pipeline, caro demais.
