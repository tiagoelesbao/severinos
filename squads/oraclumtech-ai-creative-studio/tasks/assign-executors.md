---
task_name: assign-executors
status: ready
responsible_executor: exec-producer
execution_type: agent
tipo: orquestracao
squad: oraclumtech-ai-creative-studio
pattern: OCS-TP-003
aplica_a: [P1, P2, P3, P4, P5, P6]
executor_alternativo: 'studio-chief em P4 e P6 (sem exec-producer — ADR-006)'
input: |
  - {job}/job.json com stages[] completo
  - data/pipeline-profiles.yaml — o executor DECLARADO de cada estágio do perfil
  - disponibilidade do operador humano (quem gera, quando, com que ferramentas)
  - disponibilidade real dos workers (script existe? roda? o pré-requisito está lá?)
  - orçamento de crédito de IA do job, quando houver teto
output: |
  - {job}/job.json → stages[].executor preenchido e stages[].executor_resolvido
  - {job}/job.json → plano_de_execucao: ordem, paradas humanas previstas, estimativa
  - relatório curto: onde o job vai PARAR e esperar gente
gate: checklists/gate-intake.md
failure_modes: |
  - Tentar reatribuir stills/takes/audio para agent ou worker — violação de arquitetura
  - Marcar worker onde o script não existe ou não roda no job
  - Não avisar o operador antes do job chegar na parada
  - Ignorar teto de crédito e descobrir no meio da geração
  - Assumir que worker disponível = worker compatível com a estrutura do job
acceptance_criteria: |
  - stills e takes permanecem executor: human em 100% dos casos
  - Todo estágio worker tem comando concreto E pré-requisito verificado
  - Todo estágio human tem operador nomeado e prazo
  - As paradas humanas estão listadas ANTES do job começar
  - Estágio sem worker disponível cai para agent ou human com fallback declarado
---

# assign-executors — Alocação humano × worker × agente

Decide **quem executa** cada estágio antes do job andar. O perfil em
`pipeline-profiles.yaml` declara o executor de projeto; esta task confronta essa
declaração com a **realidade de hoje**: o script existe? roda nesta estrutura de job?
o operador está disponível? há crédito?

O produto mais valioso desta task não é a tabela de alocação — é a lista de **onde o job
vai parar e esperar gente**, entregue antes de começar.

## Comando

```text
@exec-producer
*assign {job-id}
*assign {job-id} --operator={nome} --budget={creditos}
*assign {job-id} --dry-run     # só mostra as paradas previstas
```

## A trava que não se negocia

> `stills`, `takes` e a geração de voz dentro de `audio` são `executor: human`,
> **sempre**, em todos os pipelines.
> — `_BLUEPRINT.md` §3.1 · `_CONVENTIONS.md` §6

Isso **não entra na conta de alocação**. Não é uma escolha entre custo e velocidade: é
decisão de negócio. Declarar `worker` ou `agent` nesses estágios é violação de
arquitetura, não preferência — e esta task deve recusar, não negociar.

O que se aloca nesses estágios é **quem é o operador humano** e **quando ele consegue**.

## Os três executores, na prática

| Executor | Quando é a escolha certa | Custo real | Modo de falha |
|---|---|---|---|
| **worker** | O trabalho é determinístico e o script existe, roda e entende a estrutura do job | Barato e rápido | Reportar sucesso sem arquivo em disco |
| **agent** | O trabalho é julgamento, redação ou direção | Caro em token, rápido em relógio | Produzir texto genérico que parece pronto |
| **human** | Geração de asset, montagem em AE/Premiere, decisão de gosto | Caro em relógio, é o gargalo | Ficar esperando sem ninguém saber |

## Worker disponível ≠ worker compatível

O erro que mais custa aqui: marcar `worker` porque o script existe. Existir não basta —
ele precisa entender a estrutura do job. Três casos reais neste squad:

- `apps/video-studio/scripts/ingest.ts` espera `outputs/{client}/video-plans/{creative}/`.
  Um job do creative-studio vive em `jobs/{job-id}/`. **Falta a ponte.**
- `farm-images.js` e `farm-takes.js` resolvem a cascata de geração, mas são amarrados a
  `--niche` e `--session` do farming. **Não aplicáveis a job.**
- `quality_gate_video.py` exige um `video-brief.yaml` compatível. Em P6 (imagem pura)
  ele simplesmente **não se aplica**.

Marcar `worker` nesses casos produz falha no meio do pipeline, com o job já caro.
A regra: **verificar o pré-requisito, não a existência do arquivo.**

## Action Items

1. **Ler o perfil** e copiar o executor declarado de cada estágio para `stages[]`.
2. **Travar a regra de ouro.** `stills` e `takes` → `human`. Se o input pedir outra
   coisa, recusar e citar `_CONVENTIONS.md` §6.
3. **Verificar cada worker declarado:** o comando existe? o pré-requisito (arquivo de
   entrada, formato, convenção de pasta) está satisfeito? Se não, rebaixar para `agent`
   ou `human` e registrar `worker_indisponivel` com o motivo.
4. **Nomear o operador** de cada estágio humano, com prazo. Estágio humano sem nome é
   estágio que vai esperar indefinidamente.
5. **Somar as paradas.** Produzir a lista ordenada de checkpoints humanos: quantos são,
   em que ordem, o que cada um exige do operador.
6. **Conferir o orçamento de crédito**, quando houver teto. Estimar por estágio de
   geração a partir de `quantas_variacoes` do Pacote de Direção. Estouro previsto →
   avisar ANTES, não no meio.
7. **Avisar o operador** com a lista de paradas previstas. Este é o entregável que evita
   o modo de falha mais caro do squad: job parado há três dias porque ninguém sabia.
8. **Gravar em `job.json`** `stages[].executor`, `executor_resolvido` e
   `plano_de_execucao`.

## Variações por pipeline

| Pipeline | O que muda na alocação |
|---|---|
| **P1 brand-film** | Mais estágios agent (concept, look, design) e 4 paradas humanas de geração. `research` e `decupagem` são worker reais. O job mais longo — o aviso ao operador vale mais aqui. |
| **P2 ugc-ads** | Alocação por LOTE: uma parada humana cobre N variações. O ganho de escala está em agrupar os cards, não em paralelizar estágio. `character` é agent mas alimenta uma parada humana longa. |
| **P3 nicho-series** | Herda muito do registro da série: se os sheets canônicos existem, a parada de `stills` encolhe. Alocar sabendo o que já está pronto em `series/{serie-id}/`. |
| **P4 oraclum-institucional** | Sem `exec-producer` (ADR-006) — quem aloca é o `studio-chief`. Sem `research`. O `audio` costuma ser gravação do próprio founder: o operador é ele, e a agenda dele é a restrição real. |
| **P5 dark-room** | O maior volume de asset por peça. A alocação precisa AGRUPAR o b-roll por família visual, senão o operador gera plano a plano e o job trava. O gargalo é sempre `stills`. |
| **P6 image-lab** | Único com DUAS paradas humanas no mesmo estágio: `stills.human` (geração) e `stills.finish` (composição tipográfica). Alocar as duas, e possivelmente com operadores diferentes — gerar e diagramar são habilidades distintas. Em modo embutido, herda o operador do job pai. |

## Gate

- [ ] `stills` e `takes` estão `human` em todos os pipelines
- [ ] Todo estágio `worker` tem comando concreto e pré-requisito verificado
- [ ] Todo estágio `human` tem operador nomeado e prazo
- [ ] Todo estágio rebaixado tem `worker_indisponivel` com motivo técnico real
- [ ] A lista de paradas humanas foi comunicada antes do job começar
- [ ] Estimativa de crédito cabe no teto, ou o estouro foi avisado

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Pedido para "automatizar stills e ganhar tempo" | Recusar. Citar `_CONVENTIONS.md` §6. É decisão de negócio registrada, não gargalo a otimizar. |
| Worker marcado sem checar pré-requisito | O job quebra no meio, já caro. Verificar entrada e convenção, não só a existência do script. |
| Operador não avisado | O modo de falha mais caro do squad: job em `waiting_human` por dias. O aviso prévio É o entregável desta task. |
| Teto de crédito descoberto no meio | Estimar por `quantas_variacoes` antes. Estouro previsto vira decisão do founder: reduzir variações ou aumentar o teto. |
| Estágio sem worker nem operador | Não deixar `pending` mudo. Rebaixar para `agent` com fallback declarado, ou marcar o job como bloqueado com o motivo. |
| Dois estágios humanos alocados ao mesmo operador no mesmo dia | Serializar e dizer a ordem. Paralelismo fictício em recurso humano único vira atraso silencioso. |

## Handoff

`{job}/job.json` com `stages[].executor` e `plano_de_execucao` → o pipeline começa a
andar. A lista de paradas → **operador** e **founder**.
