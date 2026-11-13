# Benchmark Completeness Checklist — Gate F2

```yaml
checklist:
  id: benchmark-completeness-checklist
  version: 1.0.0
  owner: farming-analyst
  mode: blocking
  phase: f2-benchmark
  purpose: "Garantir que cada pack tem os assets em disco — não só um relatório dizendo que tem"
```

> **A regra que este checklist existe para impor:** verificação é em disco, não em log.
> Um benchmark que reporta "10 ok" com zero arquivos já aconteceu neste monorepo.

---

## 1. Assets por pack

```yaml
assets:
  - id: video-exists
    check: "video.mp4 existe, tem > 50 KB e o ffprobe lê a duração"
    type: blocking
  - id: video-is-the-post
    check: "A duração bate com a do post e as dimensões são verticais"
    type: blocking
    note: >
      O CDN do TikTok também serve vídeos de UI. Capturar um asset de interface produz
      um mp4 válido de 2 segundos — o pior tipo de falha, porque parece sucesso.
  - id: frames-exist
    check: "screenshots/ tem ao menos 1 frame, e o hook (00-00) está entre eles"
    type: blocking
  - id: audio-exists
    check: "audio.mp3 existe e não está mudo"
    type: blocking
  - id: audio-description-exists
    check: "audio-description.md existe"
    type: blocking
  - id: benchmark-json-exists
    check: "benchmark.json existe e é JSON válido"
    type: blocking
```

## 2. Conteúdo do dossiê

```yaml
dossier:
  - id: author-description-captured
    check: "author_description está preenchido"
    type: blocking
    note: "É a legenda do autor — vai para o kit de publicação na F6, não é descartável."
  - id: hashtags-captured
    check: "hashtags[] extraídas da legenda do autor"
    type: warning
  - id: metrics-present
    check: "metrics e viral_score presentes"
    type: blocking
  - id: audio-kind-classified
    check: "audio.kind é 'music' ou 'original_speech'"
    type: blocking
    note: "Decide o tratamento na F6: música é leito, fala é estrutura narrativa."
  - id: cuts-detected
    check: "cuts[] presente (pode ser lista vazia — significa take único)"
    type: warning
  - id: take-count-derived
    check: "take_count derivado dos cortes — é quantas imagens a F4 vai gerar"
    type: blocking
  - id: capture-strategy-logged
    check: "source.capture_strategy registra qual via funcionou"
    type: blocking
```

## 3. Fidelidade

```yaml
fidelity:
  - id: no-inferred-fields
    check: "Nenhum campo preenchido por inferência — ausente é ausente"
    type: blocking
  - id: modelability-completed
    check: "modelability.stage == 'benchmark' com os sinais do vídeo em disco"
    type: blocking
  - id: transcription-or-flagged
    check: "Há transcrição OU o pack está marcado como degradado"
    type: blocking
```

### Gate terminal — nicho `noticias`

```yaml
noticias_gate:
  - id: transcription-mandatory
    check: "O pack tem transcrição"
    type: blocking
    terminal: true
    on_fail: "status = blocked. O criativo NÃO avança para F3."
    rationale: >
      Sem transcrição, qualquer afirmação factual do plano de modelagem seria invenção.
      Não há degradação aceitável aqui.
```

## 4. Relatório da rodada

```yaml
reporting:
  - id: degraded-file-written
    check: "_degraded.md existe se houve qualquer item parcial, degradado ou bloqueado"
    type: blocking
  - id: reasons-are-technical
    check: "Cada item degradado tem o motivo TÉCNICO real, não 'falhou'"
    type: blocking
  - id: attempts-logged
    check: "As estratégias de captura tentadas estão registradas por item"
    type: blocking
  - id: counts-match-disk
    check: "A contagem de completos bate com as pastas que realmente têm os assets"
    type: blocking
    terminal: true
```

---

## Veredito

| Resultado | Condição | Próximo passo |
|:---|:---|:---|
| **PASS** | 100% blocking em todos os packs | Segue para F3 |
| **CONCERNS** | Alguns packs parciais, os demais completos | Só os completos seguem |
| **FAIL** | Contagem não bate com o disco | Corrige o pipeline antes de qualquer coisa |

**Somente packs `complete` avançam para F3.** Packs `partial` avançam apenas com decisão
explícita do dono. Packs `degraded` e `blocked` não avançam.
