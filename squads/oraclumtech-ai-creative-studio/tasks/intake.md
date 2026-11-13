---
task_name: intake
status: ready
responsible_executor: studio-chief
execution_type: agent
tipo: estagio
stage_id: intake
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-001
pipelines: [P1, P2, P3, P4, P5, P6]
input: |
  - pedido bruto em linguagem natural
  - data/genre-catalog.yaml e data/pipeline-profiles.yaml
  - registros persistentes: series/{serie-id}/, canais/{canal}/
output: |
  - {job}/00-intake/pedido.md   (ou pauta.md em P5)
  - {job}/job.json              manifesto inicial
gate: checklists/gate-intake.md
failure_modes: |
  - Abrir job com objetivo em forma de adjetivo
  - Aceitar pedido sem canal de destino
  - Não detectar série/canal existente e abrir peça avulsa
  - Classificar pelo formato em vez do objetivo
acceptance_criteria: |
  - Objetivo declarado é verificável, não adjetivo
  - Gênero classificado existe no catálogo com status active
  - Canal de destino definido
  - Pré-requisito do pipeline verificado antes de abrir
---

# intake — Porta de entrada

O `studio-chief` recebe o pedido bruto, decide **se vira job**, **que job vira** e
**quem entra no elenco**. Nunca executa peça. Este é o estágio mais barato de todos e o
que mais evita desperdício: uma pergunta aqui custa dez minutos; um pipeline errado custa
o job inteiro.

## Comando

```text
@studio-chief
*intake {pedido}
*route {pedido}     # só mostra o roteamento, sem abrir job
```

## Não se abre job no escuro

Três campos são inegociáveis antes de qualquer coisa:

| Campo | Por que trava o job |
|---|---|
| **Objetivo de negócio** | "Ficar moderno" não tem critério de aceite. "Gerar reunião com diretor de marketing" tem. |
| **Canal de destino** | Determina formato, safe area e duração. Sem ele não existe critério de composição nem de corte. |
| **Cliente** | Define qual `brand-identity` rege a peça. Interno Oraclum, farming e cliente externo têm marcas-guia diferentes. |

Faltando qualquer um: **elicitar 3 perguntas fechadas** e não abrir job antes de
respondê-las.

## Action Items

1. **Ler o pedido** e extrair objetivo, destino, cliente, prazo e restrições conhecidas.
2. **Chamar `tasks/classify-genre.md`** para obter `genero` + `pipeline_ref`.
3. **Verificar precedência** — `series/{serie-id}/` ou `canais/{canal}/` existentes
   transformam o pedido em episódio, não em peça nova.
4. **Verificar o pré-requisito do pipeline** (channel-brief em P5, registro de série em
   P3, `_request.yaml` em P6 embutido).
5. **Escrever `pedido.md`** com os campos obrigatórios do `handoff-matrix.yaml`:
   solicitante, objetivo declarado, gênero classificado, cliente, canal destino, prazo,
   restrições conhecidas (a lista pode ser vazia, mas o campo existe).
6. **Chamar `tasks/open-job.md`** para criar a estrutura e o `job.json`.
7. **Convocar o elenco** do pipeline e registrar quem entra.
8. **Rodar `checklists/gate-intake.md`.**

## Variações por pipeline

| Pipeline | O que o intake precisa arrancar do pedido |
|---|---|
| **P1 brand-film** | Verba e prazo de campanha, e o que a peça precisa fazer o público SENTIR. Sem isso o `concept` não tem contra o que trabalhar. |
| **P2 ugc-ads** | A **oferta exata** e a conta de anúncios de destino. Sem oferta, devolve: UGC sem oferta é conteúdo, não anúncio. |
| **P3 nicho-series** | Se é piloto (bíblia nova) ou episódio (bíblia existente). Pedido de episódio sem registro de série é RECLASSIFICADO como piloto. |
| **P4 oraclum-institucional** | O serviço-alvo do portfólio. Sem ele, o chief escolhe o serviço com maior lacuna de comunicação e propõe — institucional sem serviço-alvo vira peça bonita e inútil. |
| **P5 dark-room** | A pauta e o canal. Escreve `pauta.md`, não `pedido.md`. Canal sem `channel-brief.yaml` → o job vira job de fundação de canal (ADR-007). |
| **P6 image-lab** | Asset, formato e **destino**. Em modo embutido o intake é PULADO — o pedido já existe como `_request.yaml` do pai. |

## Gate

`checklists/gate-intake.md`, mais:

- [ ] Objetivo verificável, não adjetivo
- [ ] Canal de destino definido
- [ ] Gênero com `status: active` no catálogo
- [ ] Precedência de série e canal verificada
- [ ] Pré-requisito do pipeline satisfeito

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Objetivo em forma de adjetivo | Elicitar até virar frase verificável. O `qa-critic` não consegue reprovar "moderno". |
| Pedido sem canal | Devolver. O canal decide formato, safe area e duração — três coisas que atravessam o pipeline inteiro. |
| Série existente ignorada | O episódio abre sem bíblia e o personagem muda. Checar `series/` e `canais/` sempre. |
| Chief começa a executar | O `studio-chief` roteia e veta; nunca produz peça. Se ele escrever roteiro, o `head-of-copy` deixou de existir. |
| Pedido ambíguo aceito "para não travar" | Travar é mais barato. Três perguntas fechadas resolvem o que um pipeline inteiro não conserta. |

## Handoff

`{job}/00-intake/pedido.md` + `{job}/job.json` → **brief** (ou **research** em P5, ou
**design** em P6 embutido).
