# Gate de Estágio — Delivery (`gate-delivery`)

> **Estágio:** `delivery` · **Dono:** `@exec-producer` · **Executor:** `agent`
> **Roda:** depois do `gate`, é o último estágio do job.
> **Artefatos validados:** `{job}/16-delivery/entrega/` + `{job}/16-delivery/delivery-manifest.yaml` + `{job}/16-delivery/publishing-kit.md` + `{job}/job.json`
> **Libera:** nada — encerra o job (`status: delivered`).
> **Não se avalia aqui:** o conteúdo da peça. A avaliação de formato, codec, legenda,
> nomenclatura e direitos é do `gate-transversal-entrega.md`, que já rodou no estágio
> anterior. Aqui se valida a **operação de entrega**: o pacote saiu completo, foi entregue
> a quem pediu, e o job foi fechado de forma auditável.

| Marca | Efeito |
|:---|:---|
| `BLOQUEANTE` | Reprovou → o job não fecha e nada é enviado |
| `ATENÇÃO` | Fecha com ressalva registrada em `job.json` |

---

## Bloco 1 — Autorização para entregar

- [ ] **DL-01** · `BLOQUEANTE` — Existe veredito aprovado no estágio `gate`.
  **Teste:** `{job}/15-gate/gate-verdict.md` com estado `PASS`, `CONCERNS` ou `WAIVED`.
  **Falha se:** o estado é `FAIL`, ou não há veredito.

- [ ] **DL-02** · `BLOQUEANTE` — Em `CONCERNS`, há ciência escrita do solicitante.
  **Teste:** `job.json` registra quem aceitou as ressalvas, quando, e a lista aceita.
  **Falha se:** a entrega segue com ressalvas que ninguém aceitou formalmente.

- [ ] **DL-03** · `BLOQUEANTE` — Em `WAIVED`, a dívida está registrada com prazo.
  **Teste:** o manifesto carrega o waiver (item, autor, justificativa, prazo de correção) e ele entrou no backlog do gênero.
  **Falha se:** o waiver não viajou com a entrega — quem recebe não sabe que há dívida.

---

## Bloco 2 — Pacote de entrega

- [ ] **DL-04** · `BLOQUEANTE` — O pacote está montado na estrutura canônica.
  **Teste:** `{job}/16-delivery/entrega/` contém `master/`, `canais/` e `fontes/` (ou a estrutura declarada no manifesto).
  **Falha se:** está tudo em pasta única — o destinatário não sabe qual arquivo é o principal.

- [ ] **DL-05** · `BLOQUEANTE` — Todo destino declarado em `job.json` tem arquivo correspondente.
  **Teste:** cruzar `job.json.destinos[]` com os arquivos em `canais/`.
  **Falha se:** falta derivado de algum destino, ou o mesmo arquivo foi copiado para dois destinos com presets diferentes.

- [ ] **DL-06** · `BLOQUEANTE` — Todo arquivo abre.
  **Teste:** abrir cada arquivo entregue; vídeo reproduz do início ao fim, imagem renderiza, legenda carrega.
  **Falha se:** há arquivo corrompido, truncado ou de 0 byte.
  **Por quê:** é a falha mais constrangedora possível e a mais barata de evitar.

- [ ] **DL-07** · `BLOQUEANTE` — O manifesto bate exatamente com o conteúdo do pacote.
  **Teste:** diff entre a lista do `delivery-manifest.yaml` e os arquivos em `entrega/`.
  **Falha se:** há arquivo fora do manifesto, ou manifesto apontando arquivo inexistente.

- [ ] **DL-08** · `BLOQUEANTE` — A versão entregue é a que passou no gate.
  **Teste:** comparar tamanho e data do arquivo em `master/` com o master avaliado no `gate-assembly`/`gate-qa`.
  **Falha se:** o arquivo foi regravado depois do veredito sem novo ciclo de gate.

- [ ] **DL-09** · `ATENÇÃO` — Peso total do pacote compatível com o canal de envio.
  **Teste:** conferir o tamanho contra o limite do meio de entrega (e-mail, Drive, ClickUp).
  **Falha se:** o pacote não cabe e não há link alternativo previsto.

---

## Bloco 3 — Kit de publicação

- [ ] **DL-10** · `BLOQUEANTE` — Existe `publishing-kit.md` com o texto de publicação aprovado.
  **Teste:** caption, título e hashtags são os que passaram pelo `factcheck`.
  **Falha se:** o kit traz texto que ninguém checou — é a porta de entrada de claim novo.

- [ ] **DL-11** · `BLOQUEANTE` — Flags de plataforma declaradas quando a política exige.
  **Teste:** conteúdo gerado por IA que se enquadra em AID-1..AID-4 traz a instrução de marcar a flag nativa.
  **Falha se:** a peça exige disclosure e o kit não instrui quem publica.

- [ ] **DL-12** · `ATENÇÃO` — Instruções de publicação por canal presentes.
  **Teste:** qual arquivo vai em qual canal, com qual texto, e em que ordem/momento.
  **Falha se:** ausente — quem publica improvisa e desfaz decisões do brief.

- [ ] **DL-13** · `ATENÇÃO` — Claims com validade sinalizados para quem publica.
  **Teste:** claims temporais (versão de modelo, preço, "lançado esta semana") têm data de revisão no kit.
  **Falha se:** a peça pode ser republicada meses depois com informação apodrecida.

---

## Bloco 4 — Arquivamento

- [ ] **DL-14** · `BLOQUEANTE` — Projetos-fonte arquivados.
  **Teste:** em `fontes/` estão o projeto do Premiere, os projetos de After Effects usados e o estado do `video-studio` (o `video-brief`/config que gerou a timeline).
  **Falha se:** falta qualquer projeto da cadeia usada.

- [ ] **DL-15** · `BLOQUEANTE` — Assets brutos aprovados arquivados.
  **Teste:** cada asset referenciado no master existe em `fontes/assets/` no formato original devolvido pelo operador.
  **Falha se:** o master referencia asset que só existe na máquina de alguém.

- [ ] **DL-16** · `BLOQUEANTE` — Rastreabilidade e Pacotes de Direção arquivados.
  **Teste:** os arquivos de `_direction/` dos estágios `stills`, `takes` e `audio`, o registro de rastreabilidade e os cards de `{job}/_cards/` estão no pacote arquivado.
  **Falha se:** o job foi entregue e a memória de como ele foi feito ficou de fora.

- [ ] **DL-17** · `ATENÇÃO` — Fontes tipográficas e licenças acompanham o arquivamento.
  **Teste:** famílias usadas listadas com origem e licença.
  **Falha se:** o projeto reabre com fonte faltando e ninguém sabe qual era.

---

## Bloco 5 — Fechamento do job

- [ ] **DL-18** · `BLOQUEANTE` — `job.json` atualizado para `status: delivered`.
  **Teste:** ler o arquivo; o estágio final, a data e o caminho da entrega estão registrados.
  **Falha se:** o job continua aberto depois de entregue — o estado do estúdio deixa de ser confiável.

- [ ] **DL-19** · `BLOQUEANTE` — Nenhum card humano aberto sem resolução.
  **Teste:** varrer `{job}/_cards/`; todo card está fechado, cancelado com motivo, ou explicitamente adiado com registro.
  **Falha se:** há card aberto — significa que alguém ainda espera uma tarefa que ninguém vai fazer.

- [ ] **DL-20** · `ATENÇÃO` — Consumo de créditos registrado contra o orçamento.
  **Teste:** comparar o consumo real com `job.json.orcamento_creditos`.
  **Falha se:** não há registro — o próximo job do mesmo gênero será orçado no escuro.

- [ ] **DL-21** · `ATENÇÃO` — Aprendizados do job registrados.
  **Teste:** existe nota com o que funcionou na direção, quais armadilhas de modelo apareceram e quais pacotes viraram referência.
  **Falha se:** ausente — o estúdio repete os mesmos erros no próximo job.

- [ ] **DL-22** · `ATENÇÃO` — Entrega confirmada pelo destinatário.
  **Teste:** `job.json` registra o envio (data, meio, destinatário) e, quando houver, a confirmação de recebimento.
  **Falha se:** não há registro de envio.

---

## Registro

| Campo | Valor |
|:---|:---|
| Veredito de origem (estado) | |
| Arquivos entregues / destinos | |
| Kit de publicação | sim · não |
| Projetos-fonte arquivados | |
| Cards abertos ao fechar | |
| Créditos consumidos / orçados | |
| Itens reprovados (IDs) | |

## Veredito

- **APROVADO** — nenhum `BLOQUEANTE` reprovado → job encerrado (`status: delivered`).
- **REPROVADO** — devolve ao `@exec-producer`. Nada é enviado ao solicitante enquanto o
  pacote estiver incompleto: entrega parcial vira retrabalho e ruído com o cliente.
