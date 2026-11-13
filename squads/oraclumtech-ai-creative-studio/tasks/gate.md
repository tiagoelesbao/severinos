---
task_name: gate
status: ready
responsible_executor: qa-critic
execution_type: agent
tipo: estagio
stage_id: gate
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-016
pipelines: [P1, P2, P3, P4, P5, P6]
input: |
  - {job}/14-assembly/master/ (ou 11-stills/finalizadas/ em P6)
  - {job}/15-gate/factcheck-report.md — precisa estar aprovado
  - checklists/gate-<pipeline-id>.md — o gate de gênero
  - checklists/gate-transversal-entrega.md — sempre, em todos os pipelines
  - {job}/01-brief/brief.yaml — o que a peça precisava fazer acontecer
output: |
  - {job}/15-gate/gate-verdict.md   veredito PASS | CONCERNS | FAIL | WAIVED
gate: checklists/gate-qa.md
failure_modes: |
  - Veredito que termina em recomendação, sem estado canônico
  - FAIL sem achado de quatro partes — não é acionável
  - Vocabulário vago ("ficou bom", "faltou impacto")
  - Veredito sem a seção de aprovados — não é auditável
  - Julgar peça com gate de outro gênero
  - WAIVED sem autor e sem prazo
  - Produzir veredito com factcheck não aprovado
acceptance_criteria: |
  - factcheck aprovado antes deste estágio
  - O veredito nomeia os dois checklists usados, e o de gênero é o certo
  - Todo item respondido (PASS/FAIL/N-A), N/A com justificativa
  - Todo FAIL tem item + evidência localizável + conserto executável + responsável
  - A seção de aprovados existe
---

# gate — Quality gate e veredito de peça

O `qa-critic` julga a peça contra o padrão do gênero e escreve o **veredito**. A regra da
casa: **escreve o que falta, não opinião vaga**.

## Comando

```text
@qa-critic
*gate {job-id}
*verdict {job-id}     # só o documento de veredito
```

## Dois julgamentos diferentes, não confundir

| Documento | Julga | Dono |
|---|---|---|
| `gate-<pipeline-id>.md` + `gate-transversal-entrega.md` | **a peça** | este estágio |
| `checklists/gate-qa.md` | **o veredito como artefato** | este estágio, sobre si mesmo |

`gate-qa` não pergunta se a peça é boa. Pergunta se a **decisão foi produzida
corretamente**: se a regra foi aplicada na ordem canônica, se é auditável, se todo FAIL
é acionável. Veredito mal escrito é tão danoso quanto peça ruim, porque **libera entrega
sem rastro**.

## O achado de quatro partes

Todo item FAIL precisa das quatro partes (`QA-06`). Falta qualquer uma e o achado não é
acionável — não deveria ter sido registrado:

1. **Item do checklist** — qual regra foi violada
2. **Evidência localizável** — timecode, frame, arquivo, linha. Não "no meio do vídeo"
3. **Conserto executável** — o que fazer, não "melhorar"
4. **Responsável nomeado** — qual agente, em qual estágio

```
❌ "O hook está fraco."
✅ "TRV-04 · Hook — 00:00–00:03 abre com a marca em vez de com a tensão.
    Conserto: trocar o plano 1 pelo plano 4 (a pergunta) e mover a marca para 00:08.
    Responsável: @film-director, estágio decupagem."
```

## Os quatro estados, e o que cada um obriga

| Veredito | Significa | Obriga |
|---|---|---|
| **PASS** | Libera `delivery` | Seção de aprovados presente |
| **CONCERNS** | Libera com ressalva | Ressalva registrada em `job.json`; decisão do founder |
| **FAIL** | Volta | O estágio **exato** de retorno e o que precisa mudar |
| **WAIVED** | Segue com risco aceito | **Autor e prazo** registrados em `job.json → waivers[]` |

Veredito que termina em recomendação, sem estado, reprova em `QA-04`.

## Waiver não é atalho

Waiver é permitido em qualquer gate **exceto `factcheck`** (ADR-003). E exige autor —
alguém assume o risco — e prazo, porque waiver sem prazo é dívida que não vence.

Item marcado `NON-WAIVABLE` nos checklists não cai nem por decisão do `studio-chief`.

## O worker cobre três checks

`python squads/virals-marketing-squad/scripts/quality_gate_video.py {job}/05-script/video-brief.yaml`

Deste script o gate lê **V1** (hook: variantes, 4–7 palavras, pattern interrupt), **V2**
(cadência de corte) e **V6** (shotlist completa). V3, V4, V5 e V7 são do `factcheck` — não
reprocessar aqui.

Em **P6** o script não se aplica.

## Action Items

1. **Verificar a pré-condição** (`QA-01`): `factcheck` aprovado e laudo não `BLOCKED`.
   Sem isso, não se produz veredito.
2. **Confirmar a versão** (`QA-02`): o veredito julga o master atual, não um anterior.
3. **Carregar os dois checklists** — o `gate-<pipeline-id>.md` do gênero declarado em
   `job.json` e o `gate-transversal-entrega.md` — e **nomeá-los no cabeçalho** (`QA-03`).
4. **Rodar o worker_assist** e registrar V1, V2, V6.
5. **Responder TODOS os itens** dos dois checklists. N/A exige justificativa (`QA-05`).
6. **Escrever cada FAIL no formato de quatro partes** (`QA-06`).
7. **Pontuar a rubrica D1–D6** com justificativa ancorada no critério verificável —
   contagem de defeitos, listagem de divergências, enunciado da big idea. Nota sem
   justificativa, ou justificativa por impressão, reprova (`QA-07`).
8. **Escrever a seção de aprovados** (`QA-08`). Veredito só com faltas não é auditável.
9. **Varrer o próprio documento** por vocabulário vago: "está bom", "ficou legal",
   "faltou impacto", "não me convenceu", "poderia ser melhor" (`QA-09`).
10. **Emitir o veredito** e rodar `checklists/gate-qa.md` sobre ele.

## Variações por pipeline

| Pipeline | O que o gate de gênero cobra |
|---|---|
| **P1 brand-film** | `gate-brand-film.md`. Acabamento e desejo — a peça-vitrine é julgada pelo acabamento. A big idea precisa ser **enunciável em uma frase**; se não for, era formato, não ideia. |
| **P2 ugc-ads** | `gate-ugc-ads.md`. Veredito **por variação**: um lote de 3 pode entregar 2 e reter 1 — sucesso parcial declarado, não falha. V1 (hook) tem o maior peso. E os hooks precisam ser realmente distintos: N variações do mesmo ângulo não é teste. |
| **P3 nicho-series** | `gate-nicho-series.md`. Timing da piada, continuidade com episódios anteriores, gancho do próximo. **Piloto reprovado bloqueia a temporada; episódio reprovado bloqueia só a si.** O gate também decide se o `canon-novo.md` pode ser promovido ao registro da série — canon só entra com PASS. |
| **P4 oraclum-institucional** | `gate-oraclum-institucional.md`. Ritmo dor→solução, e a prova mostrada precisa existir de verdade. Paleta travada (#08080C, #A855F7) e safe area no derivado 9:16. |
| **P5 dark-room** | `gate-dark-room.md`. Antecipação do b-roll sobre a locução (0,5–1s), sincronia da legenda por palavra, ausência de plano repetido visível, e o par título-thumb coerente com o conteúdo. |
| **P6 image-lab** | `gate-image-lab.md`. Legibilidade **no tamanho real do destino**, safe area do canal, tipografia conforme design. Veredito por asset. Em modo embutido, o gate escreve `_result.yaml` para o pai e encerra o job como `closed_embedded` — **sem delivery**. |

## Gate

`checklists/gate-qa.md` — o gate deste estágio julga o próprio veredito.

- [ ] `factcheck` aprovado antes (QA-01)
- [ ] Veredito posterior ao master avaliado (QA-02)
- [ ] Cabeçalho nomeia o gate de gênero certo + o transversal (QA-03)
- [ ] Estado canônico explícito (QA-04)
- [ ] Todos os itens respondidos (QA-05)
- [ ] Todo FAIL no formato de quatro partes (QA-06)
- [ ] Rubrica D1–D6 pontuada e justificada (QA-07)
- [ ] Seção de aprovados presente (QA-08)
- [ ] Sem vocabulário vago (QA-09)

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Veredito termina em recomendação | Não é veredito. Fechar num dos quatro estados. |
| FAIL sem evidência localizável | O `@dev` do estágio de retorno não sabe onde olhar. Timecode, frame ou linha, sempre. |
| Vocabulário vago | Vira discussão de gosto e o retrabalho não converge. Varrer antes de emitir. |
| Sem seção de aprovados | Veredito só com faltas não é auditável e desmotiva sem informar. |
| Gate de outro gênero | Julga a peça pelo padrão errado. Conferir o gênero em `job.json`. |
| WAIVED sem autor | Ninguém assumiu o risco. Waiver exige autor e prazo. |
| Veredito com factcheck pendente | Libera entrega sem checagem. QA-01 barra. |
| Lote reprovado inteiro por 1 variação | Veredito é por variação em P2. Reter uma e entregar as outras. |

## Handoff

`{job}/15-gate/gate-verdict.md` → **delivery** (PASS/CONCERNS aceito), ou de volta ao
estágio nomeado no veredito (FAIL). Em P6 embutido → `_result.yaml` para o job pai.
