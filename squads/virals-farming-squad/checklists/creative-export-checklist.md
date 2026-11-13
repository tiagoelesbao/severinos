# Creative Export Checklist — Gate Final (F6)

```yaml
checklist:
  id: creative-export-checklist
  version: 1.0.0
  owner: farming-producer
  mode: blocking
  phase: f6-assembly
  purpose: "Impedir que criativo com defeito técnico ou violação de guardrail seja exportado"
```

> Este é o **último** gate antes do arquivo publicável. Reprovação aqui significa que o
> criativo **não é exportado** — não existe modo automatizado que contorne.

---

## 1. Integridade técnica

```yaml
technical:
  - id: file-exists
    check: "O .mp4 existe em disco e tem tamanho > 100 KB"
    type: blocking
  - id: aspect-ratio
    check: "Proporção é 9:16"
    type: blocking
  - id: plays-through
    check: "ffprobe lê o arquivo e a duração bate com o plano (±0,5s)"
    type: blocking
  - id: audio-present
    check: "Há trilha de áudio e ela não está muda"
    type: blocking
  - id: audio-sync
    check: "O áudio cobre a duração total; o último take foi estendido se necessário"
    type: blocking
  - id: no-black-frames
    check: "Sem quadros pretos não intencionais entre takes"
    type: warning
```

## 2. Legendas

```yaml
captions:
  - id: burned-in
    check: "Legenda queimada presente — vertical é consumido sem som"
    type: blocking
  - id: style-matches-niche
    check: "Estilo é o caption_style do nicho"
    type: blocking
  - id: safe-area
    check: "Nenhuma linha cortada nas bordas nem sob a UI do TikTok"
    type: blocking
  - id: no-typos
    check: "Sem erro de grafia herdado de transcrição automática"
    type: warning
```

## 3. Contaminação visual

```yaml
visual_cleanliness:
  - id: no-foreign-watermark
    check: "Sem marca d'água do TikTok ou de outra plataforma vinda do benchmark"
    type: blocking
  - id: no-ui-artifacts
    check: "Sem botões, avatares ou contadores herdados do screenshot original"
    type: blocking
    note: >
      Se aparecer, a falha é na F3: as camadas não foram descartadas antes da
      tradução do screenshot. Volte ao prompts-imagem.md e refaça a tradução.
  - id: no-ai-text
    check: "Sem texto renderizado pela IA de imagem (todo texto vem do video-studio)"
    type: blocking
  - id: no-real-faces
    check: "Sem rosto de pessoa real ou identificável"
    type: blocking
```

## 4. Guardrails do nicho — BLOQUEANTE

```yaml
niche_guardrails:
  - id: rules-respected
    check: "Todas as regras de guardrails.rules do nicho respeitadas"
    type: blocking
    source: "data/niches/{nicho}.yaml"
  - id: blocked-terms
    check: "Nenhum termo de blocked_terms aparece no vídeo, na legenda ou na descrição"
    type: blocking
  - id: required-framing
    check: "Enquadramento obrigatório presente quando o nicho exige"
    type: blocking
    conditional: "niche.guardrails.required_framing existe"
```

### Gate de fidelidade factual — nicho `noticias`

```yaml
fact_fidelity:
  - id: transcription-exists
    check: "O pack tem transcrição"
    type: blocking
    terminal: true
  - id: every-claim-anchored
    check: "Toda afirmação factual aponta para um trecho da transcrição"
    type: blocking
    terminal: true
  - id: no-invented-data
    check: "Nenhum número, data, estatística, fonte, citação ou nome próprio inventado"
    type: blocking
    terminal: true
```

> **Terminal** significa: não é degradado, não é contornado pelo modo automatizado, não é
> waivable. Sem transcrição, qualquer afirmação factual seria invenção.

## 5. Kit de publicação

```yaml
publishing_kit:
  - id: kit-exists
    check: "publishing-kit.md existe ao lado do .mp4"
    type: blocking
  - id: description-present
    check: "Descrição baseada em author_description do benchmark.json"
    type: blocking
  - id: hashtags-present
    check: "Hashtags do post original preservadas na ordem"
    type: blocking
```

---

## Veredito

| Resultado | Condição | Ação |
|:---|:---|:---|
| **PASS** | 100% dos blocking | Exporta |
| **CONCERNS** | 100% blocking, algum warning | Exporta e documenta |
| **FAIL** | Qualquer blocking reprovado | **Não exporta** — volta à fase de origem |
| **BLOCKED** | Gate terminal reprovado | **Não exporta** — sem waiver possível |

**Fase de retorno por tipo de falha:**

| Falha | Volta para |
|:---|:---|
| Artefato de UI, watermark, texto de IA na imagem | F3 (descarte de camadas) → F4 |
| Anatomia distorcida, movimento errado | F5 |
| Áudio dessincronizado, legenda cortada | F6 |
| Violação de guardrail | F3 (replanejar) |
| Transcrição ausente em notícias | F2 (recapturar) |
