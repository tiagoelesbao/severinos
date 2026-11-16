# Gate de Estágio — Concept (`gate-concept`)

> **Estágio:** `concept` · **Dono:** `@creative-director` · **Executor:** `agent`
> **Roda:** ao fim do conceito, antes de liberar `script` (ou `story`, em série).
> **Artefato validado:** `{job}/03-concept/territorio.md` + `{job}/03-concept/rota-aprovada.md`
> **Libera:** próximo estágio do pipeline
> **Não se avalia aqui:** execução, roteiro, plano-a-plano. Valida-se se existe uma
> **ideia** e se ela foi escolhida contra alternativas, não por falta de opção.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha |
| `ATENÇÃO` | Reprovou → fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **CN-01** · `BLOQUEANTE` — A rota aprovada é enunciável em uma frase que não descreve o formato.
  **Teste:** escrever a frase. Ela precisa conter proposição, tensão ou virada.
  **Falha se:** a melhor frase possível descreve a mecânica ("um vídeo mostrando o produto com depoimentos").

- [ ] **CN-02** · `BLOQUEANTE` — Houve pelo menos 2 rotas consideradas e as descartadas estão registradas com o motivo.
  **Teste:** `territorio.md` lista as rotas e o motivo de morte de cada descartada.
  **Falha se:** só existe uma rota. Rota única não foi escolhida, foi aceita.

- [ ] **CN-03** · `BLOQUEANTE` — A rota se conecta ao insight do brief.
  **Teste:** apontar a linha do brief (`insight`) que a rota explora.
  **Falha se:** a rota não se apoia em nenhum insight — é execução bonita sem argumento.

- [ ] **CN-04** · `BLOQUEANTE` — A rota sobrevive ao teste de troca de marca.
  **Teste:** substituir mentalmente a marca por um concorrente; a ideia deveria ficar estranha.
  **Falha se:** funciona igual com qualquer marca.

- [ ] **CN-05** · `BLOQUEANTE` — A rota respeita o `brand-lock`.
  **Teste:** conferir contra arquétipo, léxico proibido e `restricoes.nunca_fazer`.
  **Falha se:** a rota depende de um recurso proibido (para a Oraclum: case de cliente, IA como mágica, robô apertando mão humana).

- [ ] **CN-06** · `BLOQUEANTE` — A rota é executável dentro do orçamento e do prazo.
  **Teste:** o `@exec-producer` estimou o volume de assets e o custo de geração da rota aprovada.
  **Falha se:** não houve estimativa, ou a estimativa estoura o teto sem decisão registrada.

- [ ] **CN-07** · `BLOQUEANTE` — A rota não depende de claim que o job não pode sustentar.
  **Teste:** listar as afirmações que a rota exige; conferir se há fonte para elas.
  **Falha se:** a ideia só funciona com um número ou depoimento que não existe — melhor matar aqui do que no `factcheck`.

- [ ] **CN-08** · `ATENÇÃO` — O território define o que a peça **não** vai ser.
  **Teste:** existe seção de fronteira (tom, recursos e clichês descartados).
  **Falha se:** ausente.

- [ ] **CN-09** · `ATENÇÃO` — A rota aprovada tem um dispositivo de retenção declarado.
  **Teste:** identificar o mecanismo que segura o espectador (open loop, transformação, escalada, enigma).
  **Falha se:** não há nenhum, num gênero em que a retenção é o KPI.

- [ ] **CN-10** · `ATENÇÃO` — A decisão foi registrada com autor e data.
  **Teste:** `rota-aprovada.md` traz quem aprovou e quando.
  **Falha se:** a aprovação é anônima — não há a quem voltar quando a rota for questionada.

---

## Registro

| Campo | Valor |
|:---|:---|
| Rota aprovada (uma frase) | |
| Rotas descartadas (qtd + motivos) | |
| Insight explorado | |
| Volume estimado de assets | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera o próximo estágio.
- **REPROVADO** — devolve ao `@creative-director`. Conceito frouxo é o defeito mais caro
  de consertar depois: ele só aparece no gate de pipeline, com todos os assets já gerados.
