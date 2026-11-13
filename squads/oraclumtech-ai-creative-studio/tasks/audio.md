---
task_name: audio
status: ready
responsible_executor: sound-designer
execution_type: human
tipo: estagio
stage_id: audio
squad: oraclumtech-ai-creative-studio
pattern: OCS-TS-013
regra_de_ouro: true
regra_de_ouro_escopo: 'a GERAÇÃO DE VOZ é humana; o sound design é do agente'
pipelines: [P1, P2, P3, P4, P5]
ausente_em: 'P6 — image-lab não tem áudio'
input: |
  - {job}/05-script/roteiro.md — o texto a ser dito
  - {job}/12-takes/entregues/ — a duração real dos takes
  - {job}/09-character/elenco.yaml — casting travado por personagem (P2, P3)
  - canais/{canal}/voice-lock.yaml (P5) · series/{serie-id}/biblia.yaml (P3)
  - data/model-routing.yaml#voice
output: |
  - {job}/13-audio/_direction/asset-direction-vo.yaml   Pacote de Direção de voz
  - {job}/13-audio/sound-spec.yaml                      SFX, trilha e spec de mixagem
  - {job}/_cards/card-audio-{n}.md
  - {job}/13-audio/entregues/                           voz e trilha devolvidas
  - {job}/13-audio/captions.srt                         legenda REAL, por palavra
gate: checklists/gate-audio.md
failure_modes: |
  - Trocar a voz entre episódios ou entre lotes — reseta o reconhecimento
  - Estimar a legenda pelo roteiro em vez de usar timestamps reais
  - Pacote de voz só com o texto, sem direção de leitura
  - Trilha durante a fala onde o gênero proíbe
  - Simular a geração de voz
acceptance_criteria: |
  - O casting vem do registro travado, não é escolhido no estágio
  - captions.srt vem de timestamps reais, não de estimativa
  - sound-spec.yaml traz a spec de mixagem para o Premiere
  - Nenhum áudio marcado entregue sem arquivo em disco
---

# audio — Voz, trilha e sound design

> **REGRA DE OURO (§3.1).** Vale também para voz: o `sound-designer` **dirige**, o humano
> **gera**. O que é do agente aqui é o sound design — SFX, trilha, ducking, spec de
> mixagem. O que é humano é a geração ou gravação da voz.

O `sound-designer` (método Ben Burtt) entrega direção de leitura, não só texto.

## Comando

```text
@sound-designer
*direct {job-id}       # Pacote de Direção de voz + sound-spec
*card {job-id}         # emite o card de geração/gravação
*review {job-id}       # avalia a leitura devolvida
```

## As três fases

| Fase | Executor | Produz |
|---|---|---|
| `audio.direction` | agent | `asset-direction-vo.yaml` + `sound-spec.yaml` |
| `audio.human` | **human** | `entregues/` — voz gerada ou gravada |
| `audio.review` | agent | `captions.srt` + `_review/review-r{n}.md` |

## O casting não se escolhe aqui — se carrega

A voz é ativo, não decisão de peça:

| Pipeline | Onde a voz está travada |
|---|---|
| P2 | `character-bible` — a mesma persona fala igual em todo lote e nos lotes futuros |
| P3 | `series/{serie-id}/biblia.yaml` — a voz é parte do personagem |
| P5 | `canais/{canal}/voice-lock.yaml` — a voz é **o** ativo do canal |
| P4 | a voz real do founder, por decisão de coerência de discurso |

Trocar a voz entre episódios **reseta o reconhecimento do público**, que é a única coisa
que o canal ou a série acumula. O Pacote de Direção **referencia** o casting travado; não
o escolhe.

## A legenda vem de timestamps reais

```bash
python apps/video-studio/scripts/transcribe.py {job}/13-audio/entregues/*.wav
```

`transcribe.py` (faster-whisper) devolve timestamps **por palavra**: o que foi dito, no
tempo exato. Estimar a legenda pelo roteiro assume ritmo constante de fala — e fala não
tem ritmo constante: há pausa, ênfase, respiração. O erro acumula ao longo da peça e a
legenda adianta e atrasa.

## A spec de mixagem é para o Premiere

`sound-spec.yaml` carrega o que o operador precisa para mixar (§3.3): níveis, ducking sob
a voz, curva de trilha, ponto de SFX por timecode. Sem isso, a mixagem é improvisada e
cada peça soa diferente.

## Action Items

1. **Ler o roteiro** e a duração real dos takes entregues.
2. **Carregar o casting travado** do registro correspondente ao pipeline.
3. **Escrever o `asset-direction-vo.yaml`** com **direção de leitura**: ritmo, ênfase,
   onde respirar, o que não enfatizar. Texto sem direção produz locução genérica.
4. **Escrever o `sound-spec.yaml`** — SFX por timecode, trilha, ducking, níveis.
5. **Emitir o card** (`tasks/emit-human-card.md`) com o casting anexo.
6. **PARAR.** `waiting_human`.
7. **Rodar o `transcribe.py`** sobre o que voltou e gerar o `captions.srt`.
8. **Avaliar** leitura fiel ao roteiro, entonação conforme direção, ruído e respiração,
   duração compatível com os takes. Teto de 3 retakes.
9. **Rodar `checklists/gate-audio.md`.**

## Variações por pipeline

| Pipeline | O que muda |
|---|---|
| **P1 brand-film** | Sound design mais denso: SFX, trilha e VO em camadas. Sem casting aprovado → trilha e SFX apenas, com o `editor` montando legenda no lugar da voz, registrado em `degraded[]`. |
| **P2 ugc-ads** | A voz é a do `character-bible` e precisa ser a MESMA em todas as variações. Em UGC, **som limpo demais reduz credibilidade** — a spec pede ambiência, não estúdio. Imperfeição é aceitável; ausência total de som, não. Sem VO → a legenda queimada carrega a mensagem e a peça vai a teste marcada em `degraded[]`. |
| **P3 nicho-series** | Regra do gênero: **sem trilha durante a fala**. Trilha entra na tag final e nas transições. Voz inconsistente com episódios anteriores → manter a voz anterior e ajustar a fala; a voz é parte da bíblia. |
| **P4 oraclum-institucional** | Preferência declarada pela **voz real do founder**: voz sintética em peça institucional da própria marca contradiz o discurso da casa. Sem VO do founder → a peça vira corte com cartela e trilha, marcada em `degraded[]`. O card é de **gravação**, não de geração. |
| **P5 dark-room** | A voz é **o** ativo do canal, travada em `voice-lock.yaml`. Voz indisponível no provedor → **o episódio PARA**. Publicar com outra voz custa mais caro que atrasar: o reconhecimento não se recupera. Autolegenda **por palavra** é parte do código do gênero, não conveniência. |
| **P6 image-lab** | **Estágio ausente.** |

## Gate

`checklists/gate-audio.md`, mais:

- [ ] Casting carregado do registro travado, não escolhido no estágio
- [ ] Pacote com direção de leitura, não só texto
- [ ] `captions.srt` de timestamps reais
- [ ] `sound-spec.yaml` com a spec de mixagem para o Premiere
- [ ] Nenhum áudio marcado entregue sem arquivo em disco
- [ ] P3: sem trilha durante a fala

## Failure modes

| O que acontece na prática | O que fazer |
|---|---|
| Voz trocada entre episódios | Reseta o reconhecimento do público. Carregar o casting travado; se indisponível, parar. |
| Legenda estimada pelo roteiro | Adianta e atrasa ao longo da peça. Usar `transcribe.py`. |
| Pacote só com o texto | Locução genérica. Direção de leitura é o produto. |
| Trilha sob a fala (P3) | Quebra o código do gênero e come o timing da piada. |
| Som limpo demais (P2) | Reduz credibilidade do UGC. A spec pede ambiência. |
| Voz sintética em peça institucional (P4) | Contradiz o discurso da casa. Gravar, ou cair para cartela e trilha. |
| Operador demora e o agente "adianta" | PROIBIDO. `waiting_human` não é falha. |

## Handoff

`{job}/13-audio/entregues/` + `sound-spec.yaml` + `captions.srt` → **assembly**.
