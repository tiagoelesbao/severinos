---
task_name: character
status: ready
responsible_executor: character-lead
execution_type: agent
tipo: estagio
stage_id: character
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-010
pipelines: [P2, P3]
condicional_em: 'P6 — somente quando o asset tem pessoa ou personagem recorrente'
ausente_em: 'P1, P4, P5'
input: |
  - {job}/05-script/roteiro.md — o perfil de quem fala
  - {job}/04-story/biblia.yaml (P3) · {job}/08-design/art-spec.yaml
  - data/characters/{character-id}/ — o REGISTRY: identity.yaml, canon.png, sheets/,
    continuity-log.md, prompt-block.md
output: |
  - {job}/09-character/elenco.yaml              aponta para os character-id e declara
                                                o estado do personagem NESTE job
  - {job}/09-character/especificacao-de-sheet.md
  - {job}/09-character/atributos-travados.md    o que NÃO pode derivar no take
  - {job}/09-character/_riscos-de-identidade.md BLOQUEANTE, vai para o factcheck
  - write-back: data/characters/{character-id}/ (identity, canon, continuity-log)
gate: checklists/gate-character.md
failure_modes: |
  - Redefinir a identidade dentro do job em vez de referenciar o registry
  - Regerar o sheet a partir do último frame usado — a deriva se acumula
  - Promover canon porque uma geração saiu bonita
  - Não escrever _riscos-de-identidade.md — o factcheck fica cego
  - Não travar a seed no lote (P2)
acceptance_criteria: |
  - elenco.yaml REFERENCIA character-id do registry; não redefine identidade
  - atributos-travados.md preenchido, para o campo nao_pode_se_mover do takes
  - _riscos-de-identidade.md existe, mesmo que declare risco zero
  - Canon só atualizado por decisão explícita, registrada no continuity-log
---

# character — Identidade que persiste acima do job

O `character-lead` cuida do ativo mais durável do squad. Um job é temporário; um
personagem de série ou um creator sintético é **ativo permanente do negócio**.

## Comando

```text
@character-lead
*cast {job-id}          # monta o elenco do job
*sheet {character-id}   # especificação de reference sheet
*drift {character-id}   # deriva contra o canon
*canon {character-id}   # atualização de canon (decisão explícita)
```

## O registry vive fora do job

```
data/characters/{character-id}/
├── identity.yaml       atributos com tolerância, traços âncora, wardrobe travado, escopo
├── canon.png           a imagem-âncora permanente — NÃO se atualiza sozinha
├── sheets/             vistas aprovadas: frontal, três-quartos, perfil, expressões
├── continuity-log.md   em que jobs apareceu, que deriva houve, que decisão foi tomada
└── prompt-block.md     o bloco literal para colar em qualquer prompt — uma das travas
```

**O job REFERENCIA; nunca redefine.** `{job}/09-character/elenco.yaml` aponta para os
`character-id` e declara apenas o estado **naquele job**: figurino da cena, estado
emocional, ferimento.

### Por que fora do job

> Um job isolado não consegue detectar deriva entre episódios, porque não tem o episódio
> anterior. E é exatamente aí que a deriva acontece — devagar, um pouco por episódio,
> cada passo dentro da tolerância. Sem um ponto de referência fora do job, ninguém percebe
> até o episódio 6, quando já é caro.

## Regerar a partir do canon, nunca do último frame

Personagem derivou → regerar a partir de `canon.png`, **não** do último frame usado.
Regerar a partir do último frame acumula a deriva geração após geração: cada passo parece
aceitável e o resultado no episódio 5 é outra pessoa.

## Canon não se atualiza porque a geração saiu bonita

| Quando atualizar canon | Quem decide |
|---|---|
| A bíblia pede que o personagem mude (envelhece, corta o cabelo, ferimento permanente) | `showrunner` (série) · `studio-chief` (creator sintético) |

Registro: nova entrada no `continuity-log.md` com data, motivo, autor, e o canon anterior
arquivado.

> **Proibido:** atualizar canon porque uma geração saiu bonita. Isso é deriva sendo
> promovida a decisão.

## `_riscos-de-identidade.md` é bloqueante

Vai direto para o `factcheck` e cobre: semelhança com pessoa real, status de disclosure do
creator sintético, e qualquer persona que faça afirmação sobre resultado. Sem esse
arquivo, o `factcheck` fica cego para o risco mais caro de P2.

## Action Items

1. **Resolver o elenco** do job a partir do roteiro e da bíblia.
2. **Verificar o registry**: personagem já existe? Se sim, a identidade vem de lá.
3. **Personagem novo:** escrever `identity.yaml` (atributos com tolerância, traços âncora,
   wardrobe travado, escopo, disclosure), definir o `canon.png` como primeira vista frontal
   aprovada, e escrever o `prompt-block.md`.
4. **Escrever `elenco.yaml`** referenciando os `character-id` e o estado no job.
5. **Escrever `especificacao-de-sheet.md`** para o `image-lead` — ele monta o Pacote de
   Direção; o `character-lead` **não** escolhe ferramenta nem parâmetros.
6. **Escrever `atributos-travados.md`** — alimenta `nao_pode_se_mover` no `takes`.
7. **Escrever `_riscos-de-identidade.md`**, mesmo para declarar risco zero.
8. **Rodar `checklists/gate-character.md`.**
9. **No `delivery`:** write-back do que o gate aprovou, com entrada no `continuity-log.md`.

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P2 ugc-ads** | O creator sintético é o **ativo reutilizável**: sheet gerado uma vez, reaproveitado em todo o lote e nos lotes seguintes daquele cliente. A **seed travada** entra em todo pacote do lote — sem ela, o lote sai com N pessoas diferentes. Consistência de rosto impossível na ferramenta → trocar a estratégia do lote para creator de costas, mãos ou POV, onde a identidade se sustenta por wardrobe e ambiente. `_riscos-de-identidade.md` é crítico: disclosure de IA e semelhança com pessoa pública. |
| **P3 nicho-series** | Elenco fixo entre episódios. A âncora é o sheet **canônico** do registry, com o `continuity-log.md` acumulando as decisões. Checkpoint `cp-elenco` quando é piloto ou quando entra personagem novo. É aqui que a série ganha ou perde coerência. |
| **P6 image-lab** | **Condicional** — só quando o asset tem personagem recorrente (capa de episódio, creator, mascote). Sem sheet prévio → criar o sheet como **primeiro asset do job** e usá-lo como referência dos demais. A ordem importa: gerar a capa antes do sheet produz um personagem que não bate com nada. |
| **P1 brand-film** | **Ausente.** Sem personagem recorrente; o talento em cena é decisão de casting do job, não ativo persistente. |
| **P4 oraclum-institucional** | **Ausente.** Quem aparece é o founder, pessoa real. |
| **P5 dark-room** | **Ausente.** Canal sem rosto — não há personagem a manter. |

## Gate

`checklists/gate-character.md`, mais:

- [ ] `elenco.yaml` referencia `character-id`; não redefine identidade
- [ ] `atributos-travados.md` preenchido
- [ ] `_riscos-de-identidade.md` existe
- [ ] Sheet regerado a partir do `canon.png`, nunca do último frame
- [ ] Canon atualizado só por decisão explícita, com entrada no `continuity-log.md`
- [ ] P2: seed travada declarada para o lote

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Identidade redefinida no job | O registry deixa de ser fonte de verdade e cada job diverge. Referenciar. |
| Regeração a partir do último frame | Deriva acumulada; personagem outro no episódio 5. Sempre do canon. |
| Canon promovido por geração bonita | Deriva virando decisão. Só o `showrunner` ou o `studio-chief` decidem, com registro. |
| `_riscos-de-identidade.md` ausente | O `factcheck` fica cego para semelhança e disclosure — o risco mais caro de P2. |
| Seed não travada (P2) | O lote sai com N pessoas diferentes e todo o trabalho de sheet se perde. |
| Character-lead escolhendo ferramenta | Não é o papel. Ele especifica identidade; o `image-lead` monta o pacote. |
| Capa gerada antes do sheet (P6) | O personagem não bate com nada. Sheet primeiro. |

## Handoff

`{job}/09-character/especificacao-de-sheet.md` + `canon.png` + `prompt-block.md` → **stills**
`atributos-travados.md` → **takes** · `elenco.yaml` → **audio**
`_riscos-de-identidade.md` → **factcheck** (bloqueante)
`identity.yaml` + `canon.png` + `continuity-log.md` → **registry**, no `delivery`
