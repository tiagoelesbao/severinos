# Sam Kolder — Video Production Checklist v1.0

Checklist geral para produção de vídeo longo por @sam-kolder-vid.

**Workflow:** `sam-long-form-production.yaml`
**Template:** `sam-video-brief-tmpl.md`

---

## 📋 Phase 1: Ingestão e Planejamento

- [ ] Material bruto analisado (codec, resolução, duração, canais de áudio)?
- [ ] Duração estimada pós-silence-cut calculada?
- [ ] Plataforma alvo definida (YouTube/LinkedIn/podcast-vídeo)?
- [ ] Tom e formato definidos (entrevista, tutorial, vlog)?
- [ ] Capítulos fornecidos ou auto-geração autorizada?
- [ ] LUT preset selecionado (recomendado: neutral-grade para longo)?

---

## ✂️ Phase 2: Silence Cut Conservador

- [ ] Threshold conservador aplicado (8-12% para entrevistas/podcasts)?
- [ ] Nenhuma frase cortada no meio?
- [ ] Redução de 15-30% de duração atingida?
- [ ] Preview validado antes de confirmar?

---

## 📑 Phase 3: Capítulos

- [ ] Todos os capítulos com timestamps corretos?
- [ ] Capítulo 1 começa em 00:00?
- [ ] Títulos de capítulos descritivos e otimizados para YouTube?
- [ ] chapters.txt no formato YouTube pronto para copiar/colar?
- [ ] JSON de capítulos gerado para uso programático?

---

## 🎬 Phase 4: Edição e Montagem

- [ ] Intro de 5-15s com logo animado?
- [ ] Lower thirds para nome/cargo do apresentador/convidado?
- [ ] End screen nos últimos 20s (cards de recomendação)?
- [ ] Transições entre capítulos aplicadas?
- [ ] Material desnecessário cortado conforme capítulos?
- [ ] Áudio normalizado (-14 LUFS padrão YouTube)?

---

## 🔤 Phase 5: Legendas

- [ ] Transcrição completa via Whisper (modelo ≥ small)?
- [ ] SRT gerado para 100% da duração?
- [ ] Sincronização testada em 3 pontos aleatórios?
- [ ] Nomes próprios e termos técnicos revisados?
- [ ] SRT salvo em pasta de output?

---

## 🎨 Phase 6: Color Grade

- [ ] LUT neutro aplicado (correção, não estilo dramático)?
- [ ] Tons de pele naturais em todo o vídeo?
- [ ] Consistência de cor entre câmeras (se multicam)?
- [ ] Exposição e white balance normalizados?

---

## 🎯 Phase 7: Highlights para Reels

- [ ] 3-5 clips extraídos com Clips AI?
- [ ] Cada clip faz sentido fora do contexto do longo?
- [ ] Clips entre 45-90s?
- [ ] clips_manifest.json com score e tema por clip?
- [ ] Highlights selecionados para produção de Reel (opcional)?

---

## 📤 Phase 8: Export

- [ ] 16:9 (1920×1080) exportado para YouTube @ ≥10Mbps?
- [ ] Versão 1:1 gerada para LinkedIn?
- [ ] chapters.txt incluído na pasta de output?
- [ ] long_manifest.json com pipeline completo?
- [ ] Thumbnail frame capturado para Casey Neistat processar?

---

## ✅ Validação Final

- [ ] Intro e fim do vídeo assistidos?
- [ ] 3 pontos aleatórios no meio testados?
- [ ] Áudio limpo e sem picos?
- [ ] Metadados de YouTube preenchidos (título, descrição, tags, capítulos)?
- [ ] Vídeo aprovado pelo responsável?

---

_Checklist Version: 1.0.0_
_Last Updated: 2026-05-10_
