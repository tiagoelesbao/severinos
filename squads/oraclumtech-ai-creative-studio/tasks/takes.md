---
task_name: takes
status: ready
responsible_executor: motion-lead
execution_type: human
tipo: estagio
stage_id: takes
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-012
regra_de_ouro: true
pipelines: [P1, P2, P3, P4, P5]
ausente_em: 'P6 — image-lab não tem timeline'
input: |
  - {job}/11-stills/entregues/ — os stills aprovados no drift-check
  - {job}/06-decupagem/edit-spec.json — duração e ritmo por plano
  - {job}/09-character/atributos-travados.md — o que NÃO pode derivar no movimento
  - {job}/07-look/look.yaml (quando o pipeline tem dop)
  - data/model-routing.yaml — rota de modelo de vídeo
output: |
  - {job}/12-takes/_direction/{asset-id}.yaml    Pacote de Direção por take
  - {job}/12-takes/_direction/ae-compositions.md as composições de AE a construir
  - {job}/_cards/card-takes-{n}.md               card de tarefa humana
  - {job}/12-takes/entregues/                    os .mp4 devolvidos pelo operador
  - {job}/12-takes/_review/review-r{n}.md        drift-check e retake dirigido
gate: checklists/gate-takes.md
failure_modes: |
  - Card emitido com Pacote de Direção incompleto — Parte A do gate barra
  - Text-to-video direto em vez de image-to-video a partir do still aprovado
  - Pedir coreografia em vez de um movimento por take
  - Não declarar o que NÃO pode se mover — deriva de identidade no meio do take
  - Duração do take divergente do edit-spec
  - Simular a devolução humana
acceptance_criteria: |
  - Parte A do gate-takes passa ANTES de qualquer card sair
  - Todo take parte de um still aprovado, com a âncora declarada
  - O campo nao_pode_se_mover está preenchido quando há personagem
  - Duração de cada take bate com o edit-spec
  - Nenhum take marcado entregue sem .mp4 em disco
---

# takes — Direção de movimento, geração humana e avaliação

> **REGRA DE OURO (§3.1 · `_CONVENTIONS.md` §6).** O squad **não gera** o vídeo.
> O `motion-lead` entrega o **Pacote de Direção** por take e as composições de After
> Effects a construir; um operador humano gera; o agente **avalia** e dirige o retake.
> Não existe variante `agent` ou `worker`, em nenhum pipeline.

Este é o estágio onde a geração mais falha e mais custa. A direção existe para reduzir o
número de tentativas, não para descrever o resultado desejado.

## Comando

```text
@motion-lead
*direct {job-id}          # escreve os Pacotes de Direção por take
*card {asset-id}          # emite o card (só depois da Parte A do gate)
*drift-check {asset-id}   # avalia o take devolvido
*retake {asset-id}        # reescreve o pacote apontando O QUE mudar
```

## As três fases, nesta ordem

| Fase | Executor | Produz | Trava |
|---|---|---|---|
| `takes.direction` | agent | `_direction/{asset-id}.yaml` + `ae-compositions.md` | — |
| **gate Parte A** | agent | aprovação do pacote | **o card não sai sem isso** |
| `takes.human` | **human** | `entregues/` | o pipeline PARA |
| `takes.review` + gate Parte B | agent | `_review/review-r{n}.md` | teto de 3 retakes |

Como em `stills`, a Parte A avalia o **pacote** e a Parte B avalia o **asset**. Emitir
card antes da Parte A queima o tempo do operador para descobrir depois que a direção
estava vaga.

## As três técnicas que decidem o resultado

Vão escritas no campo `tecnica` do pacote — é o produto do estágio:

1. **Image-to-video a partir do still aprovado, nunca text-to-video direto.** O still já
   passou pelo drift-check; T2V joga fora essa aprovação e sorteia uma cena nova.
2. **Um movimento por take.** Coreografia — câmera que gira enquanto o sujeito anda e a
   luz muda — é o pedido que mais produz morphing. Movimento composto se constrói na
   montagem, não na geração.
3. **Declarar o que NÃO pode se mover.** O campo `nao_pode_se_mover` recebe os atributos
   travados de `{job}/09-character/atributos-travados.md`. Sem ele, o rosto deriva no meio
   do próprio take.

## Nem todo plano precisa de I2V

O pacote declara quais planos ganham **movimento gerado** e quais ganham **movimento
construído em After Effects** sobre o still. A segunda rota é mais barata, mais previsível
e, em vários formatos, visualmente indistinguível. Decidir isso na direção — e não
descobrir depois de queimar três tentativas — é economia real.

`ae-compositions.md` é o insumo direto de `assembly.spec`: lista as composições a
construir, com parâmetros de animação.

## Action Items

1. **Ler os insumos** — stills aprovados, `edit-spec.json`, `atributos-travados.md`,
   `look.yaml`.
2. **Levantar os takes** — um por plano do edit-spec. Escrever `_direction/INDEX.md`.
3. **Decidir a rota por take:** I2V gerado ou movimento em AE sobre still.
4. **Escolher a rota de modelo** por `data/model-routing.yaml`, com alternativa.
5. **Escrever um `asset_direction` por take**, com `tecnica`, `armadilhas_conhecidas`,
   `nao_pode_se_mover`, duração-alvo conforme o edit-spec e `se_falhar` concreto.
6. **Escrever `ae-compositions.md`** para o `editor`.
7. **Rodar a Parte A de `checklists/gate-takes.md`.** Reprovou → corrigir. **O card não sai.**
8. **Chamar `tasks/emit-human-card.md`.**
9. **PARAR.** `waiting_human`. Retomada por `tasks/resume-job.md`.
10. **Drift-check** contra o `criterio_de_aceite` do pacote: duração real, movimento
    conforme direção, deriva de identidade, morphing, coerência de look.
11. **Retake dirigido** apontando o que mudar. Teto de 3.
12. **Rodar a Parte B do gate**; parcial vai para `degraded[]`.

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P1 brand-film** | O pacote carrega o bloco de câmera do `look.yaml` por plano. Take que não sai em 3 rodadas cai para o plano B declarado: still + movimento construído em AE. |
| **P2 ugc-ads** | Takes falados, com lip-sync — a peça realmente nova, que nenhum script do repositório resolve hoje. Câmera na mão sutil: estabilidade de tripé mata o código de UGC. Lip-sync inaceitável → o take vira cena sem fala em quadro (mãos, produto, POV) e a fala vira VO. É o contorno mais usado em UGC real. |
| **P3 nicho-series** | Plano fixo com micro-movimento é o **código do gênero**, não pobreza. Movimento demais quebra a continuidade do personagem entre takes. `ae-compositions.md` lista cartelas e tag final. |
| **P4 oraclum-institucional** | Institucional tolera bem plano gráfico: quando o I2V não convence, movimento de câmera sobre still resolvido em AE é a rota **preferida**, não o consolo. `ae-compositions.md` traz lower-third Oraclum, big number e sublinhado. |
| **P5 dark-room** | Movimento discreto e contínuo — push-in lento, parallax, deriva de nuvem. Movimento chamativo compete com a locução, que é onde está a informação. É onde a economia de "AE em vez de I2V" mais se paga, pelo volume. |
| **P6 image-lab** | **Estágio ausente.** Não há timeline em imagem pura. |

## Gate

`checklists/gate-takes.md`, Partes A e B.

- [ ] Parte A aprovada **antes** de qualquer card sair
- [ ] Todo take parte de um still aprovado, com âncora declarada
- [ ] `nao_pode_se_mover` preenchido quando há personagem
- [ ] Duração de cada take bate com o `edit-spec.json`
- [ ] Rota (I2V vs. AE) declarada por take
- [ ] Nenhum take marcado entregue sem `.mp4` em disco

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Card sai com pacote vago | Mesmo erro de `stills`, mais caro: vídeo custa mais por tentativa. Respeitar a Parte A. |
| T2V em vez de I2V | Joga fora a aprovação do still e sorteia cena nova. Sempre partir do still. |
| Coreografia pedida | Morphing garantido. Um movimento por take; o resto na montagem. |
| `nao_pode_se_mover` vazio | O rosto deriva dentro do próprio take e o drift-check reprova tudo. Preencher a partir dos atributos travados. |
| Duração livre | O `assembly` não fecha e o áudio não cobre. Duração vem do edit-spec, não do modelo. |
| Operador demora e o agente "adianta" | PROIBIDO. `waiting_human` não é falha. |
| 3 retakes estourados | Ir para o plano B do pacote (still + AE) e registrar a troca em `degraded[]`. Não abrir a quarta tentativa. |

## Handoff

`{job}/12-takes/entregues/` + `_direction/` (incluindo `ae-compositions.md`) → **audio**.
