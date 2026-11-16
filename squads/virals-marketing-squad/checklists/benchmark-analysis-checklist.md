# Benchmark Analysis Checklist v2.0

Este checklist garante que o fluxo completo de análise de benchmark foi executado corretamente, do ETL à síntese final.

**Workflow:** `benchmark-creative-analysis.yaml`
**Task Orquestradora:** `analyze-benchmark.md`
**Template:** `viral-deep-analysis-tmpl.md`

---

## 📦 Phase 1: ETL Extraction
> Task: `benchmark-etl-extract.md` | Executor: Worker

- [ ] Vídeo foi baixado corretamente (arquivo > 0 bytes)?
- [ ] Áudio extraído e audível?
- [ ] Transcrição gerada via Gemini e salva como `Transcrição.md`?
- [ ] Frames capturados (mínimo 5) e organizados em `Screenshots/`?
- [ ] Dados brutos salvos como `Benchmark.json`?
- [ ] Dossier de handoff criado em `.aiox/handoffs/`?

---

## 🎬 Phase 2a: MrBeast Retention Audit
> Task: `benchmark-mrbeast-audit.md` | Executor: @mrbeast-mk

- [ ] Hook visual (0-3s) identificado com descrição visual E verbal?
- [ ] "Pattern Interrupt" explicado (o que quebrou o padrão)?
- [ ] Hook Promise (3-10s) analisada?
- [ ] Open Loops mapeados (mínimo 2) com timestamps?
- [ ] Micro-rewards identificados ao longo do conteúdo?
- [ ] Curva de energia descrita (início, meio, fim, picos)?
- [ ] Payoff avaliado (promessa cumprida)?
- [ ] **Retention Score (1-10) fornecido com justificativa?**

---

## 🥤 Phase 2b: GaryVee Context Audit
> Task: `benchmark-garyvee-audit.md` | Executor: @garyvee-mk

- [ ] Vibe classificada (Raw / Polished / Hybrid)?
- [ ] Cultural relevance e trend alignment descritos?
- [ ] Audience Empathy Map com persona e jornada emocional?
- [ ] Tipo de valor identificado (Entretenimento / Educação / Inspiração / Utilidade)?
- [ ] Shareability trigger primário identificado?
- [ ] Platform-native fit avaliado para ao menos 3 plataformas?
- [ ] Content repurposing opportunities listadas?
- [ ] **Context Score (1-10) fornecido com justificativa?**

---

## ✍️ Phase 2c: Ladeira Copy Audit
> Task: `benchmark-ladeira-audit.md` | Executor: @ladeira

- [ ] Headline/hook textual classificado por tipo?
- [ ] Rewrite de headline sugerido?
- [ ] Framework persuasivo detectado (AIDA / PAS / BAB / Story)?
- [ ] Breakdown de abertura/desenvolvimento/fechamento?
- [ ] Mínimo 3 gatilhos mentais identificados com trechos?
- [ ] CTA principal identificado com clareza e urgência avaliadas?
- [ ] Text overlays analisados (quantidade, keywords, legibilidade)?
- [ ] **Copy Score (1-10) fornecido com justificativa?**

---

## 🧬 Phase 3: Blueprint de Modulação
> Task: `benchmark-modulation-blueprint.md` | Executor: @marketing-chief

- [ ] Metadata completo (URL, plataforma, autor, data, duração)?
- [ ] Executive Summary com top 3 insights?
- [ ] Deconstrução Multimodal preenchida (visual, audio, text, pacing)?
- [ ] Seções dos 3 auditores inseridas corretamente?
- [ ] Script de Modulação com template fill-in-the-blanks?
- [ ] Visual Style Guide com fontes, cores, ritmo?
- [ ] Psychological Triggers Map completo?
- [ ] Scoring Matrix consolidada com weighted scores?
- [ ] Transcrição completa incluída na seção final?
- [ ] **Relatório segue 100% do `viral-deep-analysis-tmpl.md`?**

---

## 🏁 Phase 4: Output & Cleanup

- [ ] Pasta `services/ETL/outputs/Conteudo{N}-{titulo}/` criada?
- [ ] Contém: `Transcrição.md`, `Benchmark.json`, `Screenshots/`, `Análise.md`?
- [ ] Handoff JSON marcado como `consumed: true`?
- [ ] Vídeo bruto deletado do temp?
- [ ] Áudio bruto deletado do temp?
- [ ] Pronto para iniciar próximo conteúdo?

---

_Checklist Version: 2.0.0_
_Last Updated: 2026-03-24_
