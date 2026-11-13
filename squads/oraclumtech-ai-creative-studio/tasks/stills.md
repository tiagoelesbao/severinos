---
task_name: stills
status: ready
responsible_executor: image-lead
execution_type: human
tipo: estagio
stage_id: stills
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-011
regra_de_ouro: true
pipelines: [P1, P2, P3, P4, P5, P6]
input: |
  - {job}/08-design/art-spec.yaml e {job}/07-look/look.yaml (quando o pipeline os tem)
  - {job}/06-decupagem/storyboard.yaml — os planos que precisam de still
  - {job}/09-character/elenco.yaml + data/characters/{character-id}/canon.png e prompt-block.md
  - {job}/01-brief/brand-lock.yaml — léxico e clichê visual proibidos
  - data/model-routing.yaml — rota de modelo de imagem
output: |
  - {job}/11-stills/_direction/{asset-id}.yaml   Pacote de Direção (§3.2) — o produto do agente
  - {job}/_cards/card-stills-{n}.md              card de tarefa humana
  - {job}/11-stills/entregues/                   o CRU devolvido pelo operador
  - {job}/11-stills/_review/review-r{n}.md       drift-check e retake dirigido
  - (P6) {job}/11-stills/finalizadas/            após composição tipográfica
gate: checklists/gate-stills.md
failure_modes: |
  - Card emitido com Pacote de Direção incompleto — Parte A do gate existe para barrar isso
  - Prompt com marcador de preenchimento ([inserir], TODO, {{ }})
  - Prompt que descreve só o assunto e deixa look e art-spec para o modelo decidir
  - Personagem sem âncora de consistência no pacote
  - Pedir texto dentro da imagem
  - Simular a devolução humana quando o operador demora
  - Promover a canon um still que saiu bonito
acceptance_criteria: |
  - Parte A do gate-stills passa ANTES de qualquer card sair
  - Um asset_direction por plano que precisa de still, sem sobra nem falta
  - Todo prompt é colável sem edição
  - Todo asset devolvido foi avaliado contra o criterio_de_aceite do próprio pacote
  - Nenhum asset marcado entregue sem arquivo em disco
---

# stills — Direção de imagem, geração humana e avaliação

> **REGRA DE OURO (§3.1 · `_CONVENTIONS.md` §6).** O squad **não gera** a imagem.
> O `image-lead` entrega o **Pacote de Direção**; um operador humano gera; o agente
> **avalia** e dirige o retake. Não existe variante `agent` ou `worker` deste estágio,
> em nenhum pipeline. Nunca simular a execução humana.

O produto do `image-lead` não é o arquivo — é a **direção que faz o humano acertar na
primeira ou segunda tentativa em vez da décima**.

## Comando

```text
@image-lead
*direct {job-id}          # escreve os Pacotes de Direção
*card {asset-id}          # emite o card (só depois da Parte A do gate)
*drift-check {asset-id}   # avalia o que o humano devolveu
*retake {asset-id}        # reescreve o pacote apontando O QUE mudar
```

## As quatro fases, nesta ordem

| Fase | Executor | Produz | Trava |
|---|---|---|---|
| `stills.direction` | agent | `_direction/{asset-id}.yaml` | — |
| **gate Parte A** | agent | aprovação do pacote | **o card não sai sem isso** |
| `stills.human` | **human** | `entregues/` | o pipeline PARA |
| `stills.review` + gate Parte B | agent | `_review/review-r{n}.md` | teto de 3 retakes |

Em **P6** existe uma quinta fase: `stills.finish` (composição tipográfica e marca),
também humana, produzindo `finalizadas/`.

## O gate roda duas vezes, e a Parte A vale por si

`checklists/gate-stills.md` é dividido em duas partes que avaliam **coisas diferentes**:

- **Parte A — qualidade do Pacote de Direção**, antes do card. Aqui não se avalia imagem
  nenhuma: não existe imagem ainda. Reprovou → **o card não sai**.
- **Parte B — qualidade do asset devolvido**, depois da geração humana.

> Um pacote vago é **FALHA mesmo que o asset saia bom por sorte**: acerto sem direção
> não se repete no próximo lote, no próximo episódio, nem com outro operador.

É por isso que a ordem importa: emitir card antes da Parte A queima o recurso mais caro
do pipeline — o tempo do operador — para descobrir depois que a direção estava vaga.

## O que faz um pacote passar na Parte A

- Um `asset_direction` por plano que precisa de still — os conjuntos coincidem com o
  storyboard, sem sobra nem falta (`STL-A-01`)
- Todos os campos do schema §3.2 preenchidos (`STL-A-02`)
- Prompt **colável sem edição**: nenhum `<`, `{{`, `[inserir`, `TODO`, "adaptar conforme"
  (`STL-A-03`)
- Prompt que carrega **look e art-spec**, não só o assunto. "Uma pessoa usando o notebook"
  reprova: deixa luz, lente e paleta para o modelo decidir (`STL-A-04`)
- `parametros` com aspect, resolução-alvo (≥ a exigida pelo destino) e política de seed
  (`STL-A-05`)
- Âncora de consistência quando há personagem: a reference sheet aprovada e o valor da
  âncora (`STL-A-06`)

## Texto na imagem: nunca

Nenhum gerador entrega texto e logo legíveis — é falha **estrutural**, não de prompt. O
`prompt_negativo` barra texto, letreiro, watermark e logo. O gerador entrega **cena**;
tipografia e marca entram em pós-produção. Pedir texto ao gerador é o erro mais comum e
o mais caro do estágio.

## Action Items

1. **Ler os insumos** — storyboard, `look.yaml`, `art-spec.yaml`, `brand-lock.yaml` e,
   quando houver personagem, `data/characters/{character-id}/prompt-block.md` e `canon.png`.
2. **Levantar os assets** — um por plano que precisa de still. Escrever `_direction/INDEX.md`.
3. **Escolher a rota de modelo** por `data/model-routing.yaml`, com alternativa declarada.
4. **Escrever um `asset_direction` por asset** (`templates/asset-direction-tmpl.yaml`),
   com os 12 campos do §3.2. O campo `tecnica` é onde mora o valor: o que extrair daquela
   ferramenta específica. O `armadilhas_conhecidas` é o que aquele modelo erra.
5. **Rodar a Parte A de `checklists/gate-stills.md`.** Reprovou → corrigir o pacote.
   **O card não sai.**
6. **Chamar `tasks/emit-human-card.md`** — agrupando por família visual quando for volume.
7. **PARAR.** O job entra em `waiting_human`. Retomada por `tasks/resume-job.md`.
8. **Drift-check** do que voltou, contra o `criterio_de_aceite` do próprio pacote.
9. **Retake dirigido** quando reprovar: reescrever o pacote apontando **o que mudar** no
   prompt ou no parâmetro — não reemitir o card idêntico. Teto de 3.
10. **Rodar a Parte B do gate** e registrar o que veio parcial em `degraded[]`.

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P1 brand-film** | O pacote mais denso do squad: carrega o bloco de câmera do `look.yaml` (lente, luz, movimento) plano a plano. Pode chamar `wf-image-lab.yaml` como sub-rotina para key art e packshot. |
| **P2 ugc-ads** | Stills do creator, com a seed e o sheet do `character-bible` travados em TODO pacote do lote. Sem isso o lote sai com N pessoas diferentes. Deriva de identidade → reduzir cenas e reusar still: consistência vale mais que variedade de cenário no UGC. |
| **P3 nicho-series** | A âncora é o sheet **canônico** em `data/characters/{character-id}/canon.png`, nunca o último frame usado — regerar a partir do último frame acumula deriva até o personagem virar outra pessoa lá pelo episódio 5. A capa do episódio é sub-rotina de P6. |
| **P4 oraclum-institucional** | O `prompt_negativo` carrega o clichê de IA proibido pelo brand-identity: robô apertando mão humana, cérebro azul, circuito brilhante. Não é preferência estética — é trava de marca. Falhou → captura de tela real e abstração geométrica. |
| **P5 dark-room** | O maior volume do squad. O `INDEX.md` agrupado por **família visual** é o artefato mais importante do estágio: mesma seed e mesmo sufixo de estilo por família, variando só a cena. Sem agrupar, o b-roll sai incoerente e o episódio parece colagem. `prompt_negativo` barra rosto identificável — é o código do gênero. A thumb é sub-rotina de P6, herdando `thumb-system.yaml` do canal. |
| **P6 image-lab** | Único com **quatro** paradas: `direction → human → finish → review`. A fase `finish` é a composição tipográfica e a aplicação de marca, com `finalizadas/` separado de `entregues/`. A checagem de legibilidade é feita no **tamanho real do destino** — thumb aprovada em 1080px e ilegível em 168px é reprovada. |

## Gate

`checklists/gate-stills.md`, Partes A e B. Itens `BLOQUEANTE NON-WAIVABLE` não caem nem
pelo `studio-chief`.

- [ ] Parte A aprovada **antes** de qualquer card sair
- [ ] Um pacote por plano; conjuntos coincidem com o storyboard
- [ ] Prompt colável sem edição, carregando look e art-spec
- [ ] Âncora de consistência presente quando há personagem
- [ ] Nenhum asset marcado entregue sem arquivo em disco
- [ ] Devolução parcial registrada em `degraded[]`

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Card sai com pacote vago | O operador improvisa e o retake queima o dobro. A Parte A do gate existe exatamente para isso — respeitá-la. |
| Prompt com `[inserir X]` | O operador não sabe o que pôr e chuta. Varrer por marcadores antes de emitir. |
| Prompt só com o assunto | O modelo decide luz e paleta, e o resultado não conversa com a peça. Carregar look e art-spec. |
| Personagem sem âncora | Cada geração produz uma pessoa. Referenciar `canon.png` e `prompt-block.md` do registry. |
| Texto pedido ao gerador | Volta ilegível, sempre. Texto entra em pós. |
| Operador demora e o agente "adianta" | PROIBIDO. `waiting_human` não é falha. Cobrar ou escalar. |
| Still bonito promovido a canon | Deriva sendo promovida a decisão. Canon só muda por decisão explícita do `showrunner` ou do `studio-chief`, registrada no `continuity-log.md`. |
| 3 retakes estourados | O problema quase nunca está no prompt — está no estágio anterior (sheet, art-spec, look). Escalar ao `studio-chief`. |

## Handoff

`{job}/11-stills/entregues/` + `_direction/` + `_review/` → **takes**
(ou **factcheck**, em P6).
