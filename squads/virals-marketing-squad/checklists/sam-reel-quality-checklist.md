# Sam Kolder — Reel Quality Checklist v1.0

Checklist de validação para Reels/TikToks/Shorts produzidos por @sam-kolder-vid.

**Workflow:** `sam-reel-production.yaml`
**Template:** `sam-reel-brief-tmpl.md`

---

## 📋 Phase 1: Briefing e Ingestão

- [ ] Material bruto analisado via FFmpeg probe?
- [ ] Codec, resolução e duração identificados?
- [ ] Plataforma alvo definida (Reels/TikTok/Shorts)?
- [ ] Target duration definido (máx. 90s)?
- [ ] LUT preset selecionado?
- [ ] Hook visual dos primeiros 3s planejado?

---

## ✂️ Phase 2: Silence Cut

- [ ] Silence cut executado com threshold correto para Reel (4%)?
- [ ] Nenhuma palavra cortada abruptamente?
- [ ] Cut report com % de redução gerado?
- [ ] Preview validado antes de confirmar cortes?

---

## 🎬 Phase 3: Edição e Montagem

- [ ] **Primeiros 3s têm hook visual claro e impactante?**
- [ ] Duração final dentro de ±5s do target?
- [ ] Pacing dinâmico — sem planos estáticos longos (>5s)?
- [ ] Zoom transitions aplicadas nos momentos de destaque?
- [ ] Cortes no ritmo do áudio/música (se aplicável)?
- [ ] B-roll intercalado para variedade visual (se disponível)?

---

## 🔤 Phase 4: Títulos e Legendas

- [ ] **Hook text animado nos primeiros 3s** — visível e legível?
- [ ] Estilo de animação coerente com o mood do conteúdo?
- [ ] Legendas geradas pelo Whisper e sincronizadas?
- [ ] Legendas hardcoded no vídeo?
- [ ] Máx. 2 linhas de legenda por momento?
- [ ] Legendas não cobrem rostos ou elementos visuais importantes?
- [ ] Marca d'água/logo em posição discreta?

---

## 🎨 Phase 5: Color Grade

- [ ] LUT aplicado com intensidade identificada?
- [ ] Diferença visual clara e intencional em relação ao original?
- [ ] Tons de pele naturais (sem dominante de cor)?
- [ ] Negros profundos e brancos limpos?

---

## 📤 Phase 6: Export

- [ ] Formato 9:16 (1080×1920) exportado como principal?
- [ ] Formato 1:1 (1080×1080) exportado para feed?
- [ ] Bitrate ≥ 8Mbps?
- [ ] FPS correto por plataforma (30 para Reels/TikTok, 60 para Shorts)?
- [ ] Arquivo .srt exportado junto?
- [ ] reel_manifest.json com pipeline completo documentado?

---

## ✅ Validação Final

- [ ] **Reel assistido completo** uma vez antes de aprovar?
- [ ] Os primeiros 3s prendem a atenção? (teste de scroll)
- [ ] O final tem CTA implícito ou explícito?
- [ ] Áudio audível e sem distorções?
- [ ] Reel aprovado pelo responsável?

---

_Checklist Version: 1.0.0_
_Last Updated: 2026-05-10_
