---
task_name: concept
status: ready
responsible_executor: creative-director
execution_type: agent
tipo: estagio
stage_id: concept
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-004
pipelines: [P1, P3, P4]
ausente_em: 'P2 e P5 (big idea trabalha contra o código do gênero) · P6 (a rota visual é do design)'
input: |
  - {job}/01-brief/brief.yaml — objetivo, avatar e o INSIGHT humano
  - {job}/02-research/dossie-referencia.md e nao-copiar.md
  - {job}/01-brief/brand-lock.yaml
output: |
  - {job}/03-concept/rotas.md                 as rotas consideradas, com o veredito de cada
  - {job}/03-concept/territorio-criativo.md   o território escolhido
gate: checklists/gate-concept.md
failure_modes: |
  - Entregar formato disfarçado de ideia
  - Rota que não sobrevive ao próprio crivo aprovada por falta de alternativa
  - Big idea que só funciona explicada
  - Em P4, rota que precisa de case para fechar
  - Pular o checkpoint humano
acceptance_criteria: |
  - A big idea é enunciável em UMA frase, sem explicação
  - rotas.md mostra as alternativas descartadas com o motivo
  - O território respeita o nao-copiar.md e o brand-lock
  - O founder aprovou a rota (checkpoint bloqueante)
---

# concept — Big idea e território criativo

O `creative-director` (método Washington Olivetto) é dono da big idea e tem poder de
**matar rota antes de qualquer produção**. É o gate mais barato do pipeline: reprovar aqui
custa uma reescrita; reprovar depois custa toda a geração já feita.

## Comando

```text
@creative-director
*concept {job-id}
*routes {job-id}      # só as rotas, sem escolher
*kill {rota}          # mata uma rota, com o motivo
```

## Ideia ≠ formato

A pergunta que separa as duas: **dá para enunciar em uma frase, sem explicar?**

| ❌ Formato | ✅ Ideia |
|---|---|
| "Série de 5 vídeos com depoimentos" | "Quem automatiza para de pedir desculpa pelo prazo" |
| "Vídeo mostrando o produto em uso" | "O trabalho que ninguém vê é o que atrasa todo mundo" |
| "Carrossel educativo sobre IA" | — |

Formato responde "como vamos fazer". Ideia responde "o que vamos dizer que ninguém disse".
Se a peça precisa ser explicada para funcionar, o `concept` não fechou — e o `script` vai
tentar consertar com texto, que é o remendo mais caro do pipeline.

## Rotas descartadas fazem parte do entregável

`rotas.md` mostra **o que foi considerado e por que morreu**. Serve para duas coisas: o
founder decide com alternativa à vista, e o job fica auditável quando alguém perguntar,
três semanas depois, por que não fizeram o óbvio.

Três rotas é o padrão. Uma rota só não é escolha; cinco é indecisão.

## Nenhuma rota sobrevive? Volta ao research

Seguir com a menos ruim é o erro que contamina tudo a jusante. Se nenhuma rota passa no
crivo do próprio `creative-director`, o problema é **falta de matéria-prima**, não falta
de talento: volta ao `research`.

## Action Items

1. **Ler o brief**, com atenção ao **insight humano** — é dele que a ideia nasce.
2. **Ler o `nao-copiar.md`** antes de gerar rotas, não depois.
3. **Gerar 3 rotas**, cada uma enunciada em uma frase.
4. **Aplicar o crivo**: é ideia ou formato? funciona sem explicação? respeita o
   `brand-lock`? é do avatar ou é da agência?
5. **Matar as que não passam**, com o motivo escrito.
6. **Escrever `rotas.md`** com as três e os vereditos.
7. **PARAR no checkpoint humano.** O founder escolhe.
8. **Escrever `territorio-criativo.md`** com a rota aprovada e os limites do território.
9. **Rodar `checklists/gate-concept.md`.**

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P1 brand-film** | O uso pleno do estágio. A big idea rege roteiro, decupagem, fotografia e arte — é o documento mais consultado do job. Checkpoint `cp-big-idea`: o gate mais barato do pipeline. |
| **P3 nicho-series** | O território precisa ser **engraçado ou afiado**, e isso não se conserta na produção. Em **piloto** o checkpoint é obrigatório; em **episódio de temporada aprovada** o território é herdado de `series.yaml` e o estágio roda em modo leitura, confirmando a herança em `job.json`. |
| **P4 oraclum-institucional** | A rota precisa **provar sem case** — a Oraclum não tem case de cliente. Nenhuma rota fecha sem prova disponível → volta ao `brief` para escolher outra prova. **Nunca se inventa case para fechar a rota.** Checkpoint `cp-rota`: o founder sabe qual parte do sistema está apresentável. |
| **P2 ugc-ads** | **Estágio ausente.** Em UGC o que performa é ângulo de mensagem e rosto crível; big idea faria a peça parecer dirigida, que é o oposto do código. |
| **P5 dark-room** | **Estágio ausente.** O território é do canal, travado no `channel-brief.yaml`. |
| **P6 image-lab** | **Estágio ausente.** A rota visual é decidida no `design`. |

## Gate

`checklists/gate-concept.md`, mais:

- [ ] A big idea é enunciável em uma frase, sem explicação
- [ ] `rotas.md` traz as alternativas com o motivo da morte
- [ ] O território respeita `nao-copiar.md` e `brand-lock.yaml`
- [ ] Checkpoint humano cumprido (exceto episódio herdado em P3)
- [ ] P4: a prova da rota existe de verdade

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Formato entregue como ideia | Aplicar o teste da frase única. Se precisa de dois parágrafos, é formato. |
| Menos ruim aprovada | Voltar ao `research`. Falta matéria-prima, não talento. |
| Ideia que só funciona explicada | O `script` vai tentar consertar com texto e a peça fica verbosa. Refazer aqui. |
| Case inventado para fechar a rota (P4) | Violação direta do `_BLUEPRINT.md` §1. Trocar a prova, não inventar. |
| Checkpoint pulado | O founder descobre a rota com a peça pronta. É o gate mais barato — usá-lo. |
| Rota que ignora o `nao-copiar` | Vira cópia da referência. Ler antes de gerar. |

## Handoff

`{job}/03-concept/territorio-criativo.md` → **script** (P1, P4) ou **story** (P3).
