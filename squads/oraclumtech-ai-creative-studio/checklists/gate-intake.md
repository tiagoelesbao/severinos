# Gate de Estágio — Intake (`gate-intake`)

> **Estágio:** `intake` · **Dono:** `@studio-chief` · **Executor:** `agent`
> **Roda:** ao fim do intake, antes de liberar `brief`.
> **Artefato validado:** `{job}/job.json` + `{job}/01-brief/pedido.md`
> **Libera:** estágio `brief`
> **Não se avalia aqui:** qualidade criativa, big idea, roteiro. Isso é dos gates de
> pipeline. Aqui só se verifica se o pedido virou um job executável.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o estágio não fecha e o `brief` não começa |
| `ATENÇÃO` | Reprovou → o estágio fecha com ressalva registrada em `job.json` |

---

## Itens

- [ ] **IN-01** · `BLOQUEANTE` — O job existe em disco com identificador único.
  **Teste:** existe `{job}/job.json` com `job_id` não vazio e único no diretório de jobs.
  **Falha se:** o job só existe na conversa, ou o `job_id` colide com outro.

- [ ] **IN-02** · `BLOQUEANTE` — O cliente está identificado e resolvido.
  **Teste:** `job.json.cliente` traz o slug; existe o `brand-identity` correspondente em `squads/virals-marketing-squad/data/clients/{slug}/`.
  **Falha se:** o cliente é "a definir", ou é externo e não há brand-identity — sem marca-guia o pipeline não pode começar.

- [ ] **IN-03** · `BLOQUEANTE` — O gênero foi classificado em um dos 6 pipelines MVP.
  **Teste:** `job.json.genero` ∈ {`brand-film`, `ugc-ads`, `nicho-series`, `oraclum-institucional`, `dark-room`, `image-lab`}.
  **Falha se:** o gênero está vazio, ou aponta um gênero do backlog de `data/genre-catalog.yaml` que ainda não tem pipeline implementado.

- [ ] **IN-04** · `BLOQUEANTE` — O pedido bruto foi registrado literalmente.
  **Teste:** existe `{job}/01-brief/pedido.md` com o que o solicitante pediu, nas palavras dele.
  **Falha se:** só existe a interpretação do agente. O pedido original é a prova contra escopo que muda de memória.

- [ ] **IN-05** · `BLOQUEANTE` — Canal e formato de destino declarados.
  **Teste:** `job.json.destinos[]` traz ao menos um destino com canal e proporção.
  **Falha se:** vazio. Sem destino não há como definir resolução, safe area nem duração.

- [ ] **IN-06** · `BLOQUEANTE` — Prazo declarado.
  **Teste:** `job.json.prazo` traz data.
  **Falha se:** ausente ou "o quanto antes".

- [ ] **IN-07** · `ATENÇÃO` — Orçamento de créditos de IA estimado.
  **Teste:** `job.json.orcamento_creditos` preenchido pelo `@exec-producer`.
  **Falha se:** ausente. Job sem teto estoura no estágio de geração, que é o mais caro.

- [ ] **IN-08** · `ATENÇÃO` — Materiais do solicitante recebidos ou declarados inexistentes.
  **Teste:** logo, referência de produto, footage e acessos estão em `{job}/01-brief/insumos/`, ou há registro de que não existem.
  **Falha se:** o job avança com "o cliente vai mandar depois" sem registro — o buraco reaparece no estágio de geração.

- [ ] **IN-09** · `ATENÇÃO` — O pedido cabe no gênero classificado.
  **Teste:** confrontar o pedido com o escopo do pipeline escolhido em `data/pipeline-profiles.yaml`.
  **Falha se:** o pedido exige estágio que o pipeline não tem (ex.: pede série sem `showrunner` no elenco).

---

## Registro

| Campo | Valor |
|:---|:---|
| job_id / cliente / gênero | |
| Destinos declarados | |
| Prazo / orçamento | |
| Insumos recebidos | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → libera `brief`.
- **REPROVADO** — devolve ao `@studio-chief` para completar o intake. Nada avança.
