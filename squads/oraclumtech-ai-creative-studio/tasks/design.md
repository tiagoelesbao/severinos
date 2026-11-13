---
task_name: design
status: ready
responsible_executor: art-director
execution_type: agent
tipo: estagio
stage_id: design
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-009
pipelines: [P1, P3, P6]
ausente_em: 'P2 (arte dirigida mata o UGC) · P4 (o look absorve) · P5 (assinatura é do canal)'
input: |
  - {job}/07-look/look.yaml (P1) · {job}/06-decupagem/storyboard.yaml (P1, P3)
  - {job}/04-story/biblia.yaml (P3) · series/{serie-id}/continuity-log.md
  - {job}/02-research/moodboard/ (P6)
  - {job}/01-brief/brand-lock.yaml — paleta e tipografia
output: |
  - {job}/08-design/art-spec.yaml      cenário, props, wardrobe, paleta — parseável
  - {job}/08-design/tipografia.md
  - {job}/08-design/continuidade.md    (P3) as âncoras visuais entre episódios
  - {job}/08-design/layout.md          (P6)
gate: checklists/gate-design.md
failure_modes: |
  - Inventar cor de marca em silêncio quando o brand-config está incompleto
  - Reduzir o corpo da fonte para o texto caber
  - Continuidade sem âncoras mínimas — cenário irreprodutível no próximo episódio
  - art-spec não parseável
  - Confiar no registry de templates, que está defasado
acceptance_criteria: |
  - art-spec.yaml parseável, alimentando o Pacote de Direção
  - Paleta e tipografia rastreáveis ao brand-lock, ou a inferência declarada
  - P3: pelo menos 3 âncoras visuais mínimas declaradas
  - P6: o texto cabe no formato sem reduzir o corpo
---

# design — Direção de arte, cenário, props e tipografia

O `art-director` (método Nathan Crowley) é o **guardião da coerência com o brand-config**.
Define o que aparece no quadro e como a peça se parece com a marca.

## Comando

```text
@art-director
*design {job-id}
*typography {job-id}
*continuity {job-id}    # P3: âncoras entre episódios
```

## Nunca inventar cor de marca em silêncio

`brand-config` sem paleta ou tipografia → extrair do `brand-identity` ou do material
existente (site, perfil) e **registrar a inferência**. A cor inferida marcada como
inferida é honesta; a cor inventada apresentada como canônica contamina todas as peças
seguintes, porque a próxima vai copiar desta.

## Legibilidade vence completude

Texto que não cabe no formato → **cortar o texto, não o corpo da fonte**. Reduzir o corpo
resolve o layout e destrói a leitura no feed, que é onde a peça vive. É a regra que mais
se perde sob pressão de aprovação.

## O registry de templates está defasado

`python squads/virals-marketing-squad/scripts/video_templates.py --list-video-templates --client={client}`

Lista os packs de hook, legenda, transição e motion do cliente. **O script só mostra o
catálogo; o art-director escolhe.** Em conflito entre o preset do registry e o
`brand-config`, **vence o brand-config** e a divergência é registrada.

## `art-spec.yaml` alimenta o Pacote de Direção

O item `STL-A-04` do `gate-stills` reprova prompt que descreve só o assunto. O
`image-lead` só cumpre isso se cenário, props, wardrobe e paleta estiverem estruturados
aqui. Prosa não é consumível; `art-spec.yaml` é.

## Action Items

1. **Ler os insumos** — storyboard, `look.yaml`, bíblia ou moodboard, conforme o pipeline.
2. **Carregar `brand-lock.yaml`** e conferir paleta e tipografia. Faltando → inferir e
   **declarar a inferência**.
3. **Listar o catálogo de templates** do cliente e escolher, sem delegar a escolha.
4. **Definir cenário, props e wardrobe** por plano ou por asset.
5. **Definir a tipografia** — família, pesos, hierarquia, tamanho mínimo no destino.
6. **Escrever `art-spec.yaml`** estruturado e validar o parse.
7. **P3:** escrever `continuidade.md` com as âncoras visuais mínimas.
8. **Rodar `checklists/gate-design.md`.**

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P1 brand-film** | Trabalha **depois** do `look`, sobre a fotografia já decidida: cenário, props e wardrobe que sustentam aquela luz e aquela paleta. Alimenta direto o Pacote de Direção de `stills`. |
| **P3 nicho-series** | O entregável crítico é `continuidade.md`. Cenário do episódio anterior irreprodutível → fixar **3 âncoras visuais mínimas** (cor de parede, um prop, o wardrobe) e aceitar variação no resto. Público de série perdoa cenário aproximado; não perdoa cenário que não lembra nada do anterior. Não há `look` neste pipeline — o design entra logo após a decupagem. |
| **P6 image-lab** | O estágio mais pesado do pipeline e o **ponto de entrada em modo embutido**: quando chamado por outro pipeline, o `design` lê o `_request.yaml` do pai e a herança declarada nele. Entrega `layout.md` além do `art-spec`. Texto que não cabe → cortar o texto, nunca o corpo. Checkpoint `cp-arte` só em modo autônomo. |
| **P2 ugc-ads** | **Estágio ausente.** Direção de arte é herdada do `brand-config` e do `character-bible`; arte dirigida faz a peça deixar de parecer UGC. |
| **P4 oraclum-institucional** | **Estágio ausente.** O `look` absorve a decisão visual, e a identidade vem travada do brand-config da Oraclum. |
| **P5 dark-room** | **Estágio ausente.** A assinatura visual é do canal (`channel-brief.yaml`, `thumb-system.yaml`). |

## Gate

`checklists/gate-design.md`, mais:

- [ ] `art-spec.yaml` parseável
- [ ] Paleta e tipografia rastreáveis ao `brand-lock`, ou inferência declarada
- [ ] Divergência com o registry de templates registrada
- [ ] P3: pelo menos 3 âncoras visuais mínimas
- [ ] P6: texto cabe sem reduzir o corpo; tamanho mínimo no destino declarado

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Cor de marca inventada | A próxima peça copia desta e o erro vira padrão. Inferir e declarar. |
| Corpo da fonte reduzido | Resolve o layout e destrói a leitura no feed. Cortar o texto. |
| Continuidade sem âncoras (P3) | O episódio seguinte não consegue reproduzir nada. Três âncoras mínimas. |
| `art-spec` em prosa | O `image-lead` não consome e o prompt fica genérico. Estruturar. |
| Preset do registry seguido cegamente | O registry está defasado. Brand-config vence, com a divergência registrada. |
| Escolha de template delegada ao script | O script lista; o art-director escolhe. |

## Handoff

`{job}/08-design/art-spec.yaml` → **character** (P3, P6) ou **stills** (P1).
