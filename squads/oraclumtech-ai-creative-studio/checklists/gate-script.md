# Gate de Estágio — Script (`gate-script`)

> **Estágio:** `script` · **Dono:** `@head-of-copy` · **Executor:** `agent`
> **Roda:** ao fim do roteiro, antes de liberar `decupagem` (ou `character`/`stills`, conforme o pipeline).
> **Artefato validado:** `{job}/05-script/script.md` + `{job}/05-script/claim-ledger.yaml`
> **Libera:** próximo estágio do pipeline
> **Não se avalia aqui:** o veredito de fidelidade — isso é do `gate-factcheck`. Aqui se
> valida se **cada claim já nasce com fonte declarada**, para o `factcheck` ter o que checar.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **SC-01** · `BLOQUEANTE` — Existe `claim-ledger.yaml` com uma entrada por afirmação do roteiro.
  **Teste:** segmentar o roteiro em afirmações atômicas; cada uma tem entrada no ledger com tipo (C-NUM, C-CMP, C-RES, C-AUT, C-CAP, C-3P, C-TMP, C-LEG) e fonte.
  **Falha se:** o ledger não existe, ou há afirmação sem entrada.
  **Por quê:** sem ledger, o `@fact-checker` vira detetive e o custo do gate explode.

- [ ] **SC-02** · `BLOQUEANTE` — Nenhum claim numérico sem fonte literal.
  **Teste:** para cada C-NUM, a fonte declarada contém o número exatamente como escrito.
  **Falha se:** há número sem fonte, ou a fonte traz um valor diferente do usado.

- [ ] **SC-03** · `BLOQUEANTE` — Nenhuma atribuição sem nome, link e data.
  **Teste:** para cada C-AUT ("segundo X", "pesquisa mostra"), o ledger traz os três campos.
  **Falha se:** falta qualquer um.

- [ ] **SC-04** · `BLOQUEANTE` — Nenhum resultado de cliente em peça da Oraclum.
  **Teste:** varrer por C-RES quando `cliente = oraclum`.
  **Falha se:** existe qualquer um. É proibição do brand-identity, e o `factcheck` a trata como non-waivable.

- [ ] **SC-05** · `BLOQUEANTE` — Léxico proibido ausente.
  **Teste:** varrer o roteiro, o texto em tela e a caption contra `lexico.nunca_usar` do `brand-lock`.
  **Falha se:** encontrar qualquer ocorrência.

- [ ] **SC-06** · `BLOQUEANTE` — CTA único e fora da lista proibida.
  **Teste:** contar os verbos de ação dirigidos ao espectador; conferir contra `cta_estilo.exemplos_proibidos`.
  **Falha se:** há mais de uma ação pedida, ou o CTA está na lista proibida.

- [ ] **SC-07** · `BLOQUEANTE` — O roteiro cabe na duração-alvo.
  **Teste:** estimar pela contagem de palavras da locução (referência: ~2,5 palavras/segundo em ritmo normal de VO em pt-BR) e comparar com a duração-alvo do brief.
  **Falha se:** o desvio passa de 15% sem decisão registrada.

- [ ] **SC-08** · `BLOQUEANTE` — O hook entrega a proposição dentro da janela do gênero.
  **Teste:** localizar no texto o ponto da proposição; comparar com a janela do gênero (3 s em short-form; primeiros 25% em brand film; 10% em dark room).
  **Falha se:** está fora da janela.

- [ ] **SC-09** · `ATENÇÃO` — Há variantes de hook quando o gênero pede teste.
  **Teste:** em `ugc-ads` e `dark-room`, existem ≥ 3 variantes, cada uma isolando uma variável.
  **Falha se:** há menos de 3, ou as variantes mudam mais de uma variável.

- [ ] **SC-10** · `ATENÇÃO` — A voz corresponde ao `brand-lock`.
  **Teste:** conferir arquétipo e `lexico.sempre_usar`; ler em voz alta procurando corporativês e construção formal.
  **Falha se:** o texto soa fora do arquétipo declarado.

- [ ] **SC-11** · `ATENÇÃO` — Sem jargão abstrato como manchete.
  **Teste:** aplicar a régua de `copy_guardrails.py` (hook fraco, densidade, jargão abstrato) ao hook e ao texto em tela.
  **Falha se:** o hook descreve problema abstrato em vez de prometer benefício.

- [ ] **SC-12** · `ATENÇÃO` — Texto em tela e locução não se duplicam integralmente.
  **Teste:** comparar overlay e fala.
  **Falha se:** o overlay é a transcrição da fala — desperdiça o canal visual.

---

## Registro

| Campo | Valor |
|:---|:---|
| Afirmações no ledger (qtd por tipo) | |
| Claims sem fonte (qtd) | |
| Duração estimada vs. alvo | |
| Proposição em (posição) | |
| CTA | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **REPROVADO** — devolve ao `@head-of-copy` com a lista de claims a resolver.
