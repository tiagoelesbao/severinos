---
task_name: emit-human-card
status: ready
responsible_executor: exec-producer
execution_type: agent
tipo: orquestracao
squad: oraclumtech-ai-creative-studio
pattern: OCS-TP-004
aplica_a: [P1, P2, P3, P4, P5, P6]
executor_alternativo: 'studio-chief em P4 e P6 (sem exec-producer — ADR-006)'
input: |
  - o Pacote de Direção do estágio: {job}/11-stills/_direction/{asset-id}.yaml,
    {job}/12-takes/_direction/{asset-id}.yaml ou {job}/13-audio/_direction/*.yaml
  - {job}/job.json — estágio corrente, operador alocado, prazo
  - templates/human-task-card-tmpl.md
  - data/model-routing.yaml — a rota de modelo já decidida pelo owner_agent
output: |
  - {job}/_cards/card-{stage}-{n}.md    o card de tarefa humana
  - {job}/job.json → human_cards[] com {card_id, stage, emitido_em, status: aberto}
  - {job}/job.json → status: waiting_human · stage_atual mantido
gate: checklists/gate-stills.md · gate-takes.md · gate-audio.md (o do estágio que emitiu)
failure_modes: |
  - Emitir card sem Pacote de Direção pronto — retrabalho garantido
  - Card sem path exato de devolução: o arquivo volta em lugar nenhum
  - Critério de aceite subjetivo ("ficar bom") em vez de verificável
  - Não registrar em human_cards[]: o job fica parado e ninguém sabe
  - Card gigante com 40 assets soltos em vez de agrupados por família
  - Simular a execução humana quando o card demora
acceptance_criteria: |
  - Existe Pacote de Direção correspondente em disco ANTES do card
  - O card traz prompt pronto para colar, parâmetros exatos e plano B
  - O path de devolução é absoluto e o padrão de nome está declarado
  - Todo critério de aceite é verificável por outra pessoa
  - job.json registra o card e o job entra em waiting_human
---

# emit-human-card — Emissão de card de tarefa humana

Transforma o Pacote de Direção em uma instrução que um operador executa **sem precisar
perguntar nada**. É o artefato que faz a regra de ouro (§3.1) funcionar na prática: o
squad não gera o asset, mas entrega a direção tão completa que o humano acerta na
primeira ou segunda tentativa em vez da décima.

## Comando

```text
@exec-producer
*card {stage}                  # emite os cards do estágio corrente
*card {stage} --asset={id}     # um asset específico
*cards --open                  # lista os cards abertos do job
```

## O card não existe sem o pacote

> Card sem Pacote de Direção é retrabalho garantido — é exatamente o que este squad
> existe para evitar.
> — `data/pipeline-profiles.yaml` § convenções

Antes de emitir, verificar que o `asset_direction` correspondente está em disco, escrito
e revisado. Se não está, esta task **para** e devolve ao `owner_agent` do estágio. Um
card que diz "gera uma imagem bonita do produto" desperdiça o recurso mais caro do
pipeline: o tempo do operador.

## Conteúdo mínimo do card

Vem de `data/pipeline-profiles.yaml` § `card_de_tarefa_humana`:

1. **O que gerar**, em uma frase
2. **Ferramenta recomendada** + alternativa + por que
3. **Prompt pronto para colar** (e o negativo, se a ferramenta aceitar)
4. **Parâmetros exatos** — seed, aspect, steps, cfg, motion, duração
5. **Quantas variações** gerar
6. **Critério de aceite verificável**
7. **Onde devolver** o arquivo — path exato — e com que nome
8. **Plano B** se a ferramenta falhar

Mais três que a prática deste squad acrescentou:

9. **Armadilhas conhecidas do modelo** — o que ele erra nesse tipo de asset e como evitar
10. **Pós-processamento** esperado — upscale, corte, composição
11. **Prazo** e a quem avisar quando terminar

## Critério de aceite: verificável, não adjetivo

| ❌ Não serve | ✅ Serve |
|---|---|
| "Ficar bom" | "Rosto ocupa entre 1/4 e 1/3 da altura do quadro" |
| "Coerente com a marca" | "Fundo em #08080C; nenhum outro tom de roxo além de #A855F7" |
| "Sem artefato" | "Mãos: 5 dedos, sem fusão. Ampliar a 200% e conferir" |
| "Legível" | "Título legível a 168px de largura (tamanho real da thumb no player)" |

O teste: **outra pessoa, sem contexto, chegaria ao mesmo veredito?** Se não, reescrever.

## Agrupar por família visual

Em estágios de volume — b-roll de P5, lote de P2 — emitir 40 cards soltos faz o operador
gerar plano a plano, perdendo a coerência e o tempo. Agrupar por **família visual**: mesma
seed, mesmo sufixo de estilo, mesmo bloco de parâmetros, variando só a cena. Um card por
família, com a lista de assets dentro.

## Action Items

1. **Verificar o Pacote de Direção** em disco. Ausente ou incompleto → PARA e devolve ao
   `owner_agent`.
2. **Resolver o operador e o prazo** a partir de `job.json → plano_de_execucao`.
3. **Agrupar os assets** por família visual quando o estágio for de volume.
4. **Renderizar `templates/human-task-card-tmpl.md`** com os 11 itens.
5. **Escrever o path de devolução absoluto** e o padrão de nome do arquivo. Este é o
   campo que mais causa perda: arquivo devolvido no lugar errado é arquivo perdido.
6. **Gravar o card** em `{job}/_cards/card-{stage}-{n}.md`.
7. **Registrar em `job.json → human_cards[]`** com `status: aberto` e `emitido_em`.
8. **Mudar `job.json → status` para `waiting_human`.** O estágio não é falha: é espera.
9. **Notificar o operador** pelo canal combinado, com o path do card.
10. **NÃO simular.** Enquanto o arquivo não estiver em disco, o estágio não avança.
    Retomada é por `tasks/resume-job.md`.

## Variações por pipeline

| Pipeline | O que muda no card |
|---|---|
| **P1 brand-film** | Cards de `stills` e `takes` carregam o bloco de câmera do `look.yaml` — lente, luz, movimento. É o pipeline com direção mais densa por asset. |
| **P2 ugc-ads** | Card de lote: um corpo × N hooks. Carrega o `seed-lock` do character-bible — se a seed do creator não estiver no card, o lote sai com N pessoas diferentes. |
| **P3 nicho-series** | O card referencia o sheet CANÔNICO em `series/{serie-id}/characters/`, não o último frame usado. Card com a referência errada é como a deriva de personagem começa. |
| **P4 oraclum-institucional** | O `prompt_negativo` do card carrega o clichê de IA proibido pelo brand-identity (robô apertando mão, cérebro azul, circuito). O card de `audio` é de GRAVAÇÃO, não de geração — a voz é a do founder. |
| **P5 dark-room** | Cards agrupados por família visual, obrigatoriamente — é o pipeline de maior volume. O card de `audio` carrega o `voice-lock.yaml`: o operador não escolhe voz, ele usa a do canal. |
| **P6 image-lab** | DOIS cards por asset: `card-stills` (geração da cena) e `card-finalizacao` (composição tipográfica e marca). O segundo pode ir para outro operador — gerar e diagramar são habilidades diferentes. |

## Gate

- [ ] Pacote de Direção existe em disco e está completo
- [ ] O card tem os 11 itens do conteúdo mínimo
- [ ] O path de devolução é absoluto e o padrão de nome está declarado
- [ ] Todo critério de aceite passa no teste "outra pessoa chegaria ao mesmo veredito"
- [ ] Assets de volume estão agrupados por família
- [ ] `job.json → human_cards[]` registrado e `status: waiting_human`
- [ ] O operador foi notificado

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Card emitido sem pacote | O operador improvisa, devolve algo fora da direção, e o retake queima o dobro. Parar e exigir o pacote. |
| Path de devolução vago | O arquivo volta para a pasta errada e o `wait_for` nunca satisfaz. Path absoluto, sempre. |
| Critério subjetivo | O review vira discussão de gosto em vez de checagem. Reescrever até ficar verificável. |
| Card não registrado em `human_cards[]` | O job fica parado sem aparecer em `job-status`. É o modo de falha mais silencioso. |
| 40 cards soltos | O operador perde a coerência visual e o tempo. Agrupar por família. |
| Operador demora e o agente "adianta" | PROIBIDO simular. O estágio fica em `waiting_human`. Se o prazo estourar, escalar ao founder — não inventar o asset. |
| Ferramenta do card indisponível | O campo `se_falhar` do pacote já traz a alternativa. Reemitir o card com a ferramenta B, não improvisar no meio. |

## Handoff

`{job}/_cards/card-{stage}-{n}.md` → **operador humano**.
Devolução do operador → **`tasks/resume-job.md`** → a fase `.review` do estágio.
