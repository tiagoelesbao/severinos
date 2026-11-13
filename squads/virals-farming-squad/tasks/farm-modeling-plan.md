---
task_name: farm-modeling-plan
status: ready
responsible_executor: farming-modeler
execution_type: agent
phase: f3-modeling
squad: virals-farming-squad
pattern: VF-TP-001
input: |
  - pack de benchmark completo: benchmark.json, screenshots/, audio-description.md
  - data/niches/{nicho}.yaml — estética de modelagem e guardrails
output: |
  - plano-criativo.md      estrutura take a take do criativo autoral
  - prompts-imagem.md      um prompt 9:16 por take
  - prompts-animacao.md    um prompt de movimento + preset procedural por take
pre_conditions: |
  - Pack com status complete (ou partial aprovado explicitamente)
  - Nicho notícias: transcrição presente — sem ela, BLOQUEADO
post_conditions: |
  - Os 3 documentos existem
  - Todo prompt respeita avoid_in_prompt do nicho
  - Seed travada e idêntica entre os takes do criativo
acceptance_criteria: |
  - Seção de camadas descartadas presente em prompts-imagem.md
  - Nenhum prompt pede texto na imagem ou rosto de pessoa real
  - Cada take tem prompt de IA de vídeo E preset procedural
  - Toda afirmação aponta para uma âncora no pack
  - checklists/modeling-authorship-checklist.md passa
elicit: true
---

# F3 — Plano de Modelagem Autoral

Consome o pack de benchmark e produz o criativo modelado: mesma **estrutura** que fez
performar, conteúdo **autoral**.

## Comando

```text
@farming-modeler
*plan {rank|all}
*translate {rank} {frame}     # só a tradução de um screenshot
*image-prompts {rank}
*motion-prompts {rank}
```

## Passo zero — descarte de camadas

> ⚠️ **A etapa que decide a qualidade de tudo que vem depois.**

Um screenshot do TikTok **não é a imagem**: é a imagem **mais** sobreposições. Traduzir
tudo junto faz o prompt pedir uma imagem com legenda, watermark e botão de curtir dentro.

| Camada | Destino |
|:---|:---|
| **Cena** — sujeito, fundo, luz, cor, composição | ✅ vai para o prompt |
| Legenda queimada e texto na tela | ❌ descartar — reentra na F6 |
| Texto do autor, @handle | ❌ descartar |
| Contadores, avatar, botão de seguir | ❌ descartar |
| UI do TikTok, barra de busca, ícone de música | ❌ descartar |
| Marca d'água do TikTok | ❌ descartar |
| Sticker ou borda de repost de outra rede | ❌ descartar |

**Oclusões.** Quando uma sobreposição cobre parte da cena, o que está atrás **não é
inventado**: registra-se a área ocluída e descreve-se apenas o visível. Inventar o fundo
oculto viola o Article IV. Este é um gate **terminal**.

O `prompts-imagem.md` abre com a lista do que foi descartado — a tradução é auditável,
não apenas confiável.

## Traduzir "para até cego ver"

Com a cena isolada, a descrição literal o bastante para reconstruir a imagem sem vê-la:

| Dimensão | O que cobrir |
|:---|:---|
| Enquadramento | plano, ângulo, posição do sujeito no quadro |
| Sujeito | o que ocupa o primeiro plano |
| Fundo | o que está atrás e quão desfocado |
| Luz | direção, temperatura, dureza, contraluz |
| Cor | paleta dominante, saturação, contraste |
| Textura | grão, halação, nitidez, atmosfera |
| Lente | distância focal aparente, profundidade de campo |

## Action Items

1. **Ler o pack completo** — `benchmark.json`, `audio-description.md`, todos os frames.
2. **Carregar o nicho** — `modeling.visual_style`, `avoid_in_prompt`, `guardrails`.
3. **Verificar o gate de entrada** — nicho `noticias` sem transcrição → BLOQUEIA e reporta.
4. **Descartar camadas** de cada screenshot e declarar as oclusões.
5. **Traduzir** cada frame nas 7 dimensões.
6. **Definir o que se preserva e o que se troca** — estrutura fica, conteúdo muda.
7. **Escrever `plano-criativo.md`** via `templates/modeling-plan-tmpl.md`.
8. **Escrever `prompts-imagem.md`** via `templates/image-prompts-tmpl.md` — seed travada,
   sufixo de estilo do nicho, negativos.
9. **Escrever `prompts-animacao.md`** via `templates/animation-prompts-tmpl.md` — prompt
   de IA **e** preset procedural por take.
10. **Rodar** `checklists/modeling-authorship-checklist.md`.
11. **ELICITAR aprovação do dono** antes de liberar para F4.

## Modelagem vs. cópia

| Modelagem | Cópia |
|:---|:---|
| Mesma estrutura de beats | Mesma fala palavra por palavra |
| Mesmo enquadramento e luz | Mesma cena e mesmo sujeito |
| Mesmo ritmo de corte | Mesmo arquivo re-encodado |
| Mesmo gatilho emocional | Mesma pessoa em cena |

## O gate mais barato do pipeline

Reprovar aqui custa uma reescrita. Reprovar na F6 custa **toda a cota de imagem e vídeo já
queimada**. Por isso a aprovação do dono é obrigatória antes de qualquer geração.

## Handoff

- `prompts-imagem.md` → **@farming-imager** (F4)
- `prompts-animacao.md` → **@farming-animator** (F5)
- `plano-criativo.md` → **@farming-producer** (F6)
