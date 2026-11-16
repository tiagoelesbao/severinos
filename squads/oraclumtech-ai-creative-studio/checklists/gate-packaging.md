# Gate de Estágio — Packaging (`gate-packaging`)

> **Estágio:** `packaging` · **Dono:** `@packaging-lead` · **Executor:** `agent`
> **Roda:** ao fim da embalagem, antes de liberar `script`.
> **Artefato validado:** `{job}/06-packaging/titulo.md` + `candidatos.md` + `thumb-spec.yaml`
> **Libera:** `script` — o roteiro só começa com a promessa fechada.
> **Não se avalia aqui:** se o vídeo cumpriu a promessa — isso é do `gate-factcheck`.
> Aqui se valida se a promessa **existe, cabe na fonte e cabe no feed**.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **PK-01** · `BLOQUEANTE` — O título escolhido tem nota ≥ 70 no pontuador.
  **Teste:** `python apps/regra-de-3/gerador.py --diagnostico "{título}" --thumb "{texto}"`
  **Falha se:** a nota é menor que 70, ou o comando não foi rodado.
  **Por quê:** a nota não é opinião — ela soma os três pilares, onde cada um está e se a thumb complementa. Abaixo de 70 falta pelo menos um pilar ou ele caiu depois do corte.

- [ ] **PK-02** · `BLOQUEANTE` — Os três pilares aparecem **antes do caractere 55**.
  **Teste:** o relatório do pontuador não traz a linha `corte`.
  **Falha se:** algum pilar só aparece depois do corte do feed.
  **Por quê:** pilar depois do corte existe no YouTube Studio e não existe para quem rola a tela. Foi exatamente o defeito medido no canal estoico: `(EFEITO IMEDIATO)` no caractere 70.

- [ ] **PK-03** · `BLOQUEANTE` — Risco classificado como `A`, `B1` ou `B2`.
  **Teste:** o campo `risco` do relatório.
  **Falha se:** `B3` — fala entre aspas atribuída a nome próprio sem confirmação em `fontes.json`.
  **Por quê:** B3 é difamação somada a prática enganosa. Não é strike contestável: é aviso, e três encerram o canal.

- [ ] **PK-04** · `BLOQUEANTE` — A **promessa** está declarada em uma frase e ancorada.
  **Teste:** `titulo.md` tem a seção `## Promessa` com uma frase, e `## Âncora` apontando ids de `fontes.json`.
  **Falha se:** falta a seção, a promessa tem mais de uma frase, ou a âncora aponta para fonte inexistente.
  **Por quê:** é o contrato que o `@head-of-copy` vai cumprir e o `@fact-checker` vai conferir. Sem ele, o roteiro volta a descrever em vez de entregar.

- [ ] **PK-05** · `BLOQUEANTE` — A thumb **complementa** o título.
  **Teste:** o relatório mostra repetição < 35%.
  **Falha se:** a thumb repete o título.
  **Por quê:** título e thumb são dois espaços de venda. Dizer a mesma coisa nos dois é usar um.

- [ ] **PK-06** · `BLOQUEANTE` — `candidatos.md` traz no mínimo **3 estruturas distintas**.
  **Teste:** entre os candidatos há pelo menos três padrões/moldes diferentes — não três rupturas do mesmo molde.
  **Falha se:** a lista é a mesma frase com interjeições diferentes.
  **Por quê:** escolher entre `BOMBA!` e `AGORA!` não é escolher. Escolher entre afirmar, perguntar e insinuar é.

- [ ] **PK-07** · `ATENÇÃO` — O padrão não está entre os 5 últimos de `title-patterns.md`.
  **Teste:** comparar a estrutura escolhida com o histórico do canal.
  **Falha se:** repete um padrão recente.
  **Por quê:** dois vídeos com o mesmo padrão disputam a mesma impressão. O catálogo canibaliza a si mesmo.

- [ ] **PK-08** · `ATENÇÃO` — O título respeita os tabus do `channel-brief.yaml`.
  **Teste:** varrer o léxico proibido do canal contra o título e a thumb.
  **Falha se:** há termo proibido.

- [ ] **PK-09** · `ATENÇÃO` — `thumb-spec.yaml` referencia o `thumb-system.yaml` do canal.
  **Teste:** o campo `sistema` existe e aponta para o arquivo do canal.
  **Falha se:** a spec inventa grade, cor ou tipografia própria.
  **Por quê:** thumb fora do sistema quebra o reconhecimento acumulado, que é o único ativo que o canal constrói com o tempo.

- [ ] **PK-10** · `BLOQUEANTE` — O título tem no máximo 100 caracteres.
  **Teste:** o campo `caracteres` do relatório.
  **Falha se:** passa de 100.

---

## Veredito

| Situação | Decisão |
|---|---|
| Todos os `BLOQUEANTE` passam | **PASS** — libera `script` |
| Algum `ATENÇÃO` falha | **CONCERNS** — fecha com ressalva em `job.json` |
| Algum `BLOQUEANTE` falha | **FAIL** — volta ao `packaging-lead` |
| PK-04 falha por fonte insuficiente | **FAIL para `research`** — o problema é o ângulo, não a redação |

A última linha é a que mais importa. Quando a promessa mais forte não cabe no que
foi apurado, a saída **não** é enfraquecer o título até caber — é voltar ao research
com o ângulo que precisaria ser coberto. Canal dark vive de credibilidade
acumulada, e um título que promete o que o vídeo não entrega derruba a retenção
do episódio e a confiança do canal ao mesmo tempo.
