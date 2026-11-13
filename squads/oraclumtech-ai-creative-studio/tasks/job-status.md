---
task_name: job-status
status: ready
responsible_executor: exec-producer
execution_type: agent
tipo: orquestracao
squad: oraclumtech-ai-creative-studio
pattern: OCS-TP-006
aplica_a: [P1, P2, P3, P4, P5, P6]
executor_alternativo: 'studio-chief em P4 e P6 (sem exec-producer — ADR-006)'
input: |
  - job-id (ou --all para todos os jobs abertos)
  - {job}/job.json — estado declarado
  - o disco de {job}/ — estado real
  - {job}/_degraded.md e {job}/15-gate/gate-verdict.md, quando existirem
output: |
  - relatório de estado em tela (não gera arquivo por padrão)
  - {job}/job.json → status corrigido, se a varredura encontrar divergência
  - lista priorizada do que destrava o job agora
gate: 'não tem gate próprio — é uma task de leitura. Mas VALIDA os gates dos outros.'
failure_modes: |
  - Reportar progresso lendo o job.json em vez do disco
  - Dizer "em andamento" quando o job está parado há dias esperando gente
  - Somar estágios concluídos sem conferir se os artefatos existem
  - Não destacar o card humano aberto — a informação mais acionável do relatório
  - Relatar lote como bloqueado quando só uma variação está retida
acceptance_criteria: |
  - Todo estágio marcado done teve os artefatos do handoff conferidos em disco
  - Divergência entre manifesto e disco aparece em destaque, não em rodapé
  - Card humano aberto aparece com quantos dias está esperando
  - O relatório termina com o próximo passo concreto e de quem é
  - Lote reporta por variação, não por job
---

# job-status — Relatório de estado do job

Responde, em ordem de importância: **está parado esperando quem?**, **o que já existe de
verdade?**, **o que destrava agora?**

Não é um relatório de progresso bonito. É um instrumento de detecção da divergência
entre o que o manifesto afirma e o que o disco contém.

## Comando

```text
@exec-producer
*status {job-id}
*status --all              # todos os jobs abertos, ordenados por tempo parado
*status {job-id} --deep    # confere artefato por artefato contra o handoff-matrix
```

## O princípio que governa este relatório

> O sumário é montado lendo o DISCO, não o log dos estágios.

Um estágio marcado `done` cujo artefato de handoff não existe **não está done** — está
com bug de manifesto, e este relatório é onde isso aparece. É a mesma armadilha do
pipeline que reportava "10 ok / 0 failed" com zero vídeo em disco: número que fecha e
disco vazio.

## Estrutura do relatório

### 1. Cabeçalho — a resposta em uma linha

```
{job-id} · {genero} · {cliente}
Status: WAITING_HUMAN há 3 dias · stage: stills · card: card-stills-1.md · operador: {nome}
```

Se o job está esperando gente, **isso é a primeira linha**. Tudo o mais é contexto.

### 2. Trilha de estágios

Uma linha por estágio, na ordem canônica, com o veredito de gate e a conferência de disco:

```
00-intake     done      gate PASS      2 artefatos ok
01-brief      done      gate PASS      2 artefatos ok
02-research   done      gate PASS      4 artefatos ok
05-script     done      gate PASS      3 artefatos ok
11-stills     waiting   —              direção ok (12) · entregues 0/12   ← PARADO
12-takes      pending   —              —
```

### 3. Divergências (em destaque, nunca no rodapé)

```
⚠ 14-assembly marcado done, mas master/ está vazio
⚠ 11-stills/entregues/ tem 3 arquivos que o _slots não conhece
```

### 4. Degradação e waivers

Do `_degraded.md` e de `job.json → waivers[]`. Waiver sempre com autor e motivo — waiver
anônimo é waiver que ninguém assumiu.

### 5. Próximo passo — concreto e com dono

```
→ Operador {nome}: gerar os 12 stills do card-stills-1.md (aberto há 3 dias)
→ Depois: image-lead roda *drift-check
```

Terminar com "continuar o pipeline" não serve. Quem faz o quê, agora.

## Action Items

1. **Ler `job.json`** e capturar o estado declarado.
2. **Varrer o disco** de `{job}/`, pasta por pasta.
3. **Conferir cada estágio `done`** contra os `artifacts` do `handoff` do workflow —
   e, em modo `--deep`, contra `data/handoff-matrix.yaml` campo a campo.
4. **Registrar as divergências** nos dois sentidos: artefato prometido que não existe, e
   arquivo que existe mas o manifesto não conhece.
5. **Calcular o tempo de espera** de cada card aberto em `human_cards[]`. Esta é a
   métrica mais acionável do relatório.
6. **Ler `_degraded.md`** e `waivers[]`.
7. **Se houver `gate-verdict.md`**, extrair o veredito e, em FAIL, o estágio de retorno.
8. **Corrigir `job.json`** quando a divergência for clara (estágio `done` sem artefato
   volta para `in_progress`), registrando a correção.
9. **Montar o relatório** na estrutura acima e terminar com o próximo passo com dono.

## Variações por pipeline

| Pipeline | O que o relatório precisa mostrar a mais |
|---|---|
| **P1 brand-film** | 4 paradas humanas possíveis — dizer em qual está e quantas faltam. É o job mais longo; o founder precisa da noção de quanto falta, não só de onde está. |
| **P2 ugc-ads** | Reporta **por variação**: `h1 entregue · h2 entregue · h3 retida no factcheck`. Um lote com 2 de 3 entregues é sucesso parcial declarado, não job bloqueado. Reportar o lote como bloqueado por causa de uma variação é enganoso. |
| **P3 nicho-series** | Mostrar `job_type` (piloto/episódio), se o `.lock` da série está com este job, e se há **canon pendente** — job entregue mas sem write-back é o estado mais fácil de esquecer. |
| **P4 oraclum-institucional** | Sem exec-producer: quem roda é o `studio-chief`. A espera mais comum é a agenda do founder para o VO — dizer isso explicitamente em vez de "aguardando audio". |
| **P5 dark-room** | Reportar **planos de b-roll pedidos vs. entregues**. É o pipeline onde o "quase completo" mais engana: 18 de 25 planos parece bom e produz um episódio com plano repetido cinco vezes. |
| **P6 image-lab** | Distinguir as duas paradas: `entregues/` (geração) e `finalizadas/` (composição). Em modo embutido, reportar também o job PAI e se o `_result.yaml` já foi escrito — sub-rotina concluída sem `_result.yaml` deixa o pai esperando para sempre. |

## Gate

Esta task não tem gate próprio — ela **valida** os gates dos outros. Auto-checagem:

- [ ] Nenhum estágio reportado `done` sem artefato conferido em disco
- [ ] Divergências em destaque, não em rodapé
- [ ] Tempo de espera de cada card aberto calculado
- [ ] Lote reportado por variação, quando o pipeline for de lote
- [ ] O relatório termina com próximo passo concreto e com dono
- [ ] Correções aplicadas ao `job.json` estão registradas

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Progresso lido do manifesto | O relatório fica bonito e falso. Sempre conferir o disco. |
| "Em andamento" para job parado há dias | `waiting_human` é um estado distinto de `in_progress` e precisa aparecer na primeira linha, com os dias. |
| Estágios `done` somados sem conferência | O job "termina" e a entrega vem incompleta. Conferir artefato por artefato. |
| Card aberto escondido no meio do relatório | É a informação mais acionável que existe. Vai no cabeçalho. |
| Lote reportado como bloqueado por 1 variação | Reportar por variação. 2 de 3 entregues é sucesso parcial declarado. |
| Divergência corrigida em silêncio | Corrigir e REGISTRAR. Um `job.json` que se auto-conserta sem rastro esconde bug de pipeline. |
| Sub-rotina "concluída" sem `_result.yaml` (P6) | O pai espera indefinidamente. Verificar sempre o contrato de saída, não a pasta. |

## Handoff

Relatório → **founder** e **operador**.
Job com divergência ou parada → **`tasks/resume-job.md`**.
