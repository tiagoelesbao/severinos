---
task_name: resume-job
status: ready
responsible_executor: exec-producer
execution_type: agent
tipo: orquestracao
squad: oraclumtech-ai-creative-studio
pattern: OCS-TP-005
aplica_a: [P1, P2, P3, P4, P5, P6]
executor_alternativo: 'studio-chief em P4 e P6 (sem exec-producer — ADR-006)'
input: |
  - job-id do job parado
  - {job}/job.json — status, stage_atual, human_cards[], degraded[], waivers[]
  - o disco: o que existe de verdade dentro de {job}/
  - o card aberto correspondente, quando a parada foi humana
output: |
  - {job}/job.json atualizado: status, stage_atual, human_cards[].devolvido_em/status
  - {job}/_degraded.md com o que voltou incompleto e por quê
  - diagnóstico curto: por que parou, o que mudou, qual o próximo passo concreto
gate: 'o gate do estágio retomado — a retomada não pula gate nenhum'
failure_modes: |
  - Retomar confiando no job.json sem conferir o disco
  - Aceitar devolução parcial como completa
  - Retomar em estágio adiante do que o gate permite
  - Perder o motivo original da parada ao reescrever job.json
  - Reemitir card idêntico ao que já falhou
  - Retomar sub-rotina de P6 sem reler o _request.yaml do pai
acceptance_criteria: |
  - O diagnóstico de parada foi feito ANTES de qualquer ação
  - O disco foi conferido contra o job.json e a divergência está registrada
  - Devolução parcial vira degraded[], nunca "completo"
  - O gate do estágio retomado roda normalmente
  - job.json reflete o estado real e o histórico da parada não foi apagado
---

# resume-job — Retomada de job parado

Um job deste squad para o tempo todo, e isso é por design: `stills`, `takes`, `audio` e
`assembly` esperam gente. Parar não é falha. **Parar sem ninguém saber, sim.**

Esta task responde três perguntas nesta ordem: *por que parou?*, *o que mudou desde
então?*, *qual é o próximo passo concreto?*

## Comando

```text
@exec-producer
*resume {job-id}
*resume {job-id} --verify        # só confere o disco, não avança
*resume {job-id} --force-stage={id}   # retomada dirigida, exige justificativa
```

## Primeiro o disco, depois o manifesto

O `job.json` diz o que **deveria** existir. O disco diz o que **existe**. A retomada
começa comparando os dois — e a divergência é a informação mais valiosa do diagnóstico.

Retomar acreditando no manifesto é como o pipeline que reportava "10 ok / 0 failed" com
zero arquivo em disco. Aqui a regra é a mesma do resto do squad: **o disco manda.**

## Os cinco motivos de parada

| Motivo | Como reconhecer | O que fazer |
|---|---|---|
| **Espera humana** | `status: waiting_human` + card aberto em `human_cards[]` | Conferir se o arquivo chegou no path do card. Chegou → seguir para a fase `.review`. Não chegou → o card continua aberto; cobrar, não simular. |
| **Falha de worker** | `stages[].gate_result: fail` em estágio worker | Ler o erro real. Pré-requisito ausente? Convenção incompatível? Rebaixar para agent/human com fallback e registrar em `degraded[]`. |
| **Gate reprovado** | `gate_result: FAIL` no `gate-verdict.md` | Voltar ao estágio NOMEADO no veredito, não ao anterior por reflexo. O veredito diz o que precisa mudar. |
| **Bloqueio de factcheck** | `status: blocked` no estágio `factcheck` | Sem waiver possível (ADR-003). Só sai voltando ao `script` ou ao estágio que originou o claim. |
| **Sub-rotina pendente** | `subroutines[].status: requested` sem `_result.yaml` | Retomar a sub-rotina pelo `_request.yaml`, que continua em disco. O pai fica em `waiting_subroutine`. |

## Devolução parcial é degradação, não conclusão

Quando o operador devolve menos do que o card pediu — 2 variações em vez de 4, 18 planos
de b-roll em vez de 25 — o estágio **não** é marcado concluído. Vai para `degraded[]`
com a lista exata do que falta, e o `owner_agent` decide: aceitar reduzido, reemitir card
para o restante, ou trocar de rota.

Marcar como completo o que veio pela metade é o modo de falha que contamina todo o
relatório final do job.

## Action Items

1. **Ler `job.json`** e registrar o estado declarado: `status`, `stage_atual`,
   `human_cards[]` abertos, `degraded[]`, `waivers[]`.
2. **Varrer o disco** de `{job}/` e listar o que existe de verdade em cada pasta de
   estágio.
3. **Comparar** os dois. Toda divergência entra no diagnóstico — inclusive arquivo que
   existe mas o manifesto não conhece.
4. **Classificar o motivo da parada** nos cinco tipos acima.
5. **Se foi espera humana:** verificar o `wait_for` do card contra o disco.
   - Completo → marcar `human_cards[].status: devolvido` com `devolvido_em`, e seguir
     para a fase `.review` do estágio.
   - Parcial → registrar em `degraded[]` e em `_degraded.md`, e devolver ao `owner_agent`.
   - Vazio → o card continua aberto. **Não simular.** Cobrar o operador ou escalar.
6. **Se foi falha de worker:** ler o erro real, não o resumo. Aplicar o `fallback`
   declarado no workflow. Registrar o rebaixamento.
7. **Se foi gate reprovado:** ler `{job}/15-gate/gate-verdict.md` e voltar ao estágio
   que ele nomeia, com o que precisa mudar.
8. **Verificar a cadeia de gates a montante.** A retomada não pode começar num estágio
   cujo antecessor não tem `gate: PASS`. Se tiver, o job precisa recuar mais.
9. **Preservar o histórico.** Nunca sobrescrever o motivo original da parada — anexar,
   com data. O rastro de por que o job parou duas vezes no mesmo estágio é o que revela
   problema de direção, não de execução.
10. **Atualizar `job.json`** e emitir o diagnóstico curto: por que parou, o que mudou,
    próximo passo concreto.

## Variações por pipeline

| Pipeline | O que a retomada precisa saber |
|---|---|
| **P1 brand-film** | O job mais longo e com 4 paradas humanas. Verificar em qual das quatro está — `stills`, `takes`, `audio` ou `assembly` — antes de qualquer coisa. |
| **P2 ugc-ads** | Retomada é POR VARIAÇÃO. Um lote de 3 pode ter h1 e h2 completos e h3 parado. Retomar só o que falta; nunca reprocessar o lote inteiro. |
| **P3 nicho-series** | Verificar se `series/{serie-id}/.lock` ainda está com este job. Lock preso de um job morto trava a série inteira e precisa ser liberado. Se o job parou depois do gate mas antes do write-back, o canon está pendente — retomar pelo write-back, não pelo estágio. |
| **P4 oraclum-institucional** | Sem exec-producer: quem retoma é o `studio-chief`. A parada mais comum é `audio`, esperando a agenda do founder para gravar o VO. |
| **P5 dark-room** | A parada quase sempre é `stills`, pelo volume de b-roll. Contar **planos pedidos vs. entregues** — o modo de falha silencioso é retomar com metade do b-roll e o mesmo plano repetido cinco vezes. |
| **P6 image-lab** | Duas paradas humanas no mesmo estágio: distinguir se falta a geração (`entregues/`) ou a composição (`finalizadas/`). Em modo embutido, reler o `_request.yaml` do pai antes — o pedido é a fonte, o contexto do pai não é necessário. |

## Gate

- [ ] O disco foi varrido e comparado com o `job.json`
- [ ] O motivo da parada foi classificado
- [ ] Devolução parcial está em `degraded[]`, não marcada como completa
- [ ] A cadeia de gates a montante está `PASS` até o estágio retomado
- [ ] O histórico da parada anterior foi preservado
- [ ] O diagnóstico traz um próximo passo concreto, não "continuar"

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Retomar pelo manifesto sem ver o disco | O job "avança" com asset faltando e quebra três estágios adiante. Disco primeiro, sempre. |
| Parcial aceito como completo | Contamina o relatório final e o gate reprova tarde, caro. Parcial → `degraded[]`. |
| Retomar adiante do gate | Estágio roda sem insumo válido. Verificar a cadeia a montante antes. |
| Histórico sobrescrito | Perde-se o padrão: um job que parou 3× no mesmo estágio tem problema de DIREÇÃO, não de execução. Anexar, nunca substituir. |
| Card reemitido idêntico | Se falhou uma vez, falha de novo. Antes de reemitir, o `owner_agent` revisa o Pacote de Direção — o problema costuma estar no pacote. |
| Lock de série preso (P3) | Job morto segurando `.lock` trava a temporada. Verificar se o dono do lock ainda está vivo; se não, liberar e registrar. |
| Sub-rotina retomada sem reler `_request.yaml` | A sub-rotina reinventa o pedido e devolve um asset que não conversa com o pai. O pedido em disco é a fonte. |

## Handoff

`{job}/job.json` atualizado + diagnóstico → o estágio retomado.
Se a retomada não for possível, o job vai para `blocked` com o motivo, e o diagnóstico
vai ao **founder** via `tasks/job-status.md`.
