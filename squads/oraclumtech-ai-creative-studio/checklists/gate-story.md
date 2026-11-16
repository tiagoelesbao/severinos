# Gate de Estágio — Story (`gate-story`)

> **Estágio:** `story` · **Dono:** `@showrunner` · **Executor:** `agent`
> **Roda:** ao fim da arquitetura de história, antes de liberar `script`.
> **Aplica-se a:** `nicho-series` (e a qualquer gênero com série/sketch/short film).
> **Artefato validado:** `{job}/04-story/arco.md` + `{job}/09-character/character-bible.yaml` (versão inicial)
> **Libera:** estágio `script`
> **Não se avalia aqui:** o timing de comédia do episódio montado nem a consistência
> visual do personagem gerado — isso é do `gate-nicho-series` e do `gate-character`.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **ST-01** · `BLOQUEANTE` — O episódio tem arco próprio declarado.
  **Teste:** `arco.md` aponta situação inicial, virada e desfecho **deste** episódio.
  **Falha se:** falta algum dos três, ou o desfecho depende do episódio seguinte.

- [ ] **ST-02** · `BLOQUEANTE` — O gancho para o próximo episódio está declarado e é distinto do desfecho.
  **Teste:** o documento separa "como fecha" de "por que voltar".
  **Falha se:** os dois se confundem — episódio interrompido não é série.

- [ ] **ST-03** · `BLOQUEANTE` — O episódio é compreensível para quem nunca viu a série.
  **Teste:** listar o que o espectador precisa saber; conferir que tudo é apresentado no próprio episódio.
  **Falha se:** exige conhecimento prévio.

- [ ] **ST-04** · `BLOQUEANTE` — Cada personagem recorrente tem entrada na bíblia.
  **Teste:** todo personagem que fala ou aparece em destaque tem ficha em `character-bible.yaml`.
  **Falha se:** há personagem sem ficha — ele vai mudar de cara no próximo episódio.

- [ ] **ST-05** · `BLOQUEANTE` — A continuidade com episódios anteriores foi verificada.
  **Teste:** conferir wardrobe, cenário-base, relações e fatos estabelecidos contra os episódios anteriores da série.
  **Falha se:** o episódio contradiz um fato estabelecido sem tratar a contradição na história.

- [ ] **ST-06** · `BLOQUEANTE` — A sátira mira comportamento/arquétipo, não pessoa nomeável.
  **Teste:** aplicar o teste de três perguntas do `@fact-checker` a cada personagem inspirado em gente real.
  **Falha se:** algum personagem é inequivocamente identificável, ou o roteiro imputa fato desabonador a pessoa real.
  **Por quê:** matar isso aqui custa uma reescrita; matar no `factcheck` custa todos os assets já gerados.

- [ ] **ST-07** · `BLOQUEANTE` — Os beats estão listados com função.
  **Teste:** cada beat declara o que faz (apresenta, complica, vira, paga, gancho).
  **Falha se:** há beat sem função, ou dois beats consecutivos com a mesma função sem escalada.

- [ ] **ST-08** · `ATENÇÃO` — A duração-alvo foi distribuída entre os beats.
  **Teste:** a soma das durações dos beats bate com a duração-alvo do brief (±15%).
  **Falha se:** não há distribuição — o roteiro nasce longo e é cortado no susto.

- [ ] **ST-09** · `ATENÇÃO` — A referência de bolha é reconhecível pelo avatar do brief.
  **Teste:** identificar o código de nicho que a história usa.
  **Falha se:** a história é genérica e perde o valor de pertencimento.

- [ ] **ST-10** · `ATENÇÃO` — O episódio se conecta ao funil declarado no brief.
  **Teste:** apontar como o episódio serve ao objetivo de negócio (crescimento de página, funil para a Oraclum).
  **Falha se:** é entretenimento sem função declarada.

---

## Registro

| Campo | Valor |
|:---|:---|
| Série / episódio | |
| Arco (situação / virada / desfecho) | |
| Gancho | |
| Personagens com ficha (qtd) | |
| Teste de 3 perguntas | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera `script`.
- **REPROVADO** — devolve ao `@showrunner`.
