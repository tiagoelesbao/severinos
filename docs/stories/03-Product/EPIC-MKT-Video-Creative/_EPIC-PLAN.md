# EPIC-MKT-Video-Creative — `*industrialize-video` Renascido (Benchmark → Plano → Edição Própria)

**Status:** Aprovado pelo dono · 2026-06-19
**Autor:** @marketing-chief + @architect · 2026-06-19
**Decisões do dono (2026-06-19):** Motor = **Remotion** · Sequência = **Frente 1 → Frente 2** · Formalização = **EPIC + stories**

## Visão
Hoje o `*industrialize-video` é um **pós-processador** de um vídeo que já existe: o `export_to_davinci.py` roda 9 passos lineares (reformat → áudio → LUT → corte de silêncio → transcrição → Director AI → FCPXML → legendas → overlays) e termina num **export drag-drop para o DaVinci Resolve**. Não há cliente (voz/avatar), não há planejamento, não há guarda de qualidade.

Esta epic reconstrói o comando como uma **máquina completa de criativo de vídeo viral**, espelhando a maturidade do `*design-creative`:

1. **Frente 1 — Fluxo de criação spec-driven:** o benchmark VVS vira **bússola**. O sistema extrai padrões dos prints (frames), da copy da `Transcrição.md` e da inteligência da `Análise.md`, e produz um **plano de criativo completo** na voz do cliente — hook, storyboard batida-a-batida, roteiro, spec de edição e **shotlist de gravação** (o material bruto exato a captar).
2. **Frente 2 — App próprio de edição viral (`apps/video-studio`, Remotion):** substitui o export para DaVinci por um editor proprietário que **automatiza** a montagem (cortes, legendas word-by-word, zoom/b-roll, FX de hook, transições, motion graphics) e permite ajuste fino — o equivalente em vídeo do app `creative-design`.

Transforma o motor de "exportador para terceiro" em **produto end-to-end on-brand**.

## Princípios herdados do `*design-creative`
- **No Invention / Fidelidade de fatos:** o roteiro só cita número/data/quantidade que JÁ EXISTE no benchmark (reusa o guard de `recast_engine` / `test_fact_fidelity`).
- **Benchmark é tema, voz é do cliente:** modelagem, não cópia. `brand-identity` + `brand-config` por cliente.
- **Gate bloqueante:** copy/plano que não passa nos checklists não vira produção (espelha MCI-06).
- **Cliente como 1º input** em todo o fluxo (registry `data/clients/_registry.yaml`).
- **Pesquisa-âncora 2026:** drop-off em 0–3s; hook multimodal (pattern interrupt + texto 4–7 palavras + fala keyword-rich); ritmo com checkpoint de retenção a cada 1,5–2s; estratégia "1 body, 3 hooks".

## Arquitetura

### Frente 1 — Pipeline de planejamento (Python, espelha `design_creative.py`)
```
video_plan.py  (orquestrador — mesmo padrão de design_creative.py)
  1. deep_modeler_video    → extrai do benchmark: hook, batidas, pacing, frames,
                             copy (Transcrição.md) + inteligência (Análise.md)
                             → grava video-brief.yaml
  2. analyze_video_benchmark → análise holística de retenção (tipo de hook,
                             pattern interrupts, cadência de cortes, b-roll, legenda)
  3. plan_video_creative   → PLANO COMPLETO na voz do cliente:
       • Hook (3s) × 3 variantes  • Storyboard batida-a-batida
       • Roteiro/copy (fact-fidelity)  • Spec de edição  • SHOTLIST de gravação
  4. quality_gate_video    → checklists (hook, retention checkpoints, fidelidade,
                             voz) + self-healing → GATE bloqueante
  OUTPUT: video-brief.yaml + Plano-de-Criativo.md (storyboard + shotlist legível)
```

### Frente 2 — App de edição (`apps/video-studio`, Next.js + Remotion)
- Espelha `apps/creative-design`: `/studio` (editor timeline), `/render` (composição Remotion headless), `video-templates.yaml` por cliente.
- Motor: **Remotion** + `@remotion/captions` (legendas TikTok word-by-word) + `@remotion/install-whisper-cpp` + `@remotion/transitions`. Render local headless (paridade com o `orchestrate` Playwright) e opção Lambda/Cloud Run.
- Reaproveita `sam_ffmpeg_service`, `sam_whisper_service`, `director_agent_service`, `auto-editor`, `pexels_service`, geração de LUT como **pré-processamento** que alimenta o Remotion.
- `export_to_davinci.py` vira **export target opcional**, não o destino final.

## Roadmap (Stories)

### Fase A — Fluxo de criação spec-driven (Frente 1) — **construir primeiro**
- [x] **MVC-01** — Schema do `video-brief` + `deep_modeler_video` — gate @qa PASS
- [x] **MVC-02** — `analyze_video_benchmark` — gate @qa PASS
- [x] **MVC-03** — `plan_video_creative` (hook×3 + storyboard + roteiro + edit_spec + shotlist) — gate @qa CONCERNS (fechado pela MVC-04)
- [x] **MVC-04** — `quality_gate_video` (gate terminal V1–V7 + self-healing + fidelidade completa) — re-gate pendente (cobertura ampliada na MVC-05)
- [x] **MVC-05** — Orquestrador `video_plan.py` + `Plano-de-Criativo.md` + wire `*industrialize-video` (2 fases) — Ready for Review
- [ ] **MVC-06** — `video-templates.yaml` por cliente (registry de packs hook/legenda/transição/motion)

> **Fase A ~completa** (MVC-01..05 implementadas; MVC-06 é o registry-ponte para a Fase B). Pipeline end-to-end validado em benchmark real (Hormozi→Tiago): planeja, audita fidelidade e **bloqueia fabricação** antes da entrega.

### Fase B — App de edição viral (Frente 2 · Remotion) — **draftar quando a Fase A fechar**
- [ ] **MVC-07** — Scaffold `apps/video-studio` (Next.js + Remotion), composição base, brand tokens, render headless
- [ ] **MVC-08** — Ingestão automática: video-brief + material bruto → timeline auto-montada
- [ ] **MVC-09** — Biblioteca de FX/templates: hook FX, transições, legendas word-by-word, inserts/b-roll, motion graphics
- [ ] **MVC-10** — Editor timeline `/studio` (tracks/clips/keyframes, ajuste fino, undo/redo)
- [ ] **MVC-11** — Export & render final (mp4) + persistência; DaVinci vira target opcional

## Decisões (resolvidas pelo dono · 2026-06-19)
1. **Motor de vídeo:** ✅ Remotion (continuidade com o stack React do `creative-design`).
2. **Sequência:** ✅ Frente 1 primeiro (entrega valor sozinha e alimenta o app), depois Frente 2.
3. **Formalização:** ✅ EPIC + stories (este documento).

## Decisões Resolvidas (dono · 2026-06-19, via @po)
- [x] **Analyze:** `analyze_video_benchmark.py` **dedicado** (não acopla slide-logic a vídeo).
- [x] **LLM do plano/análise:** **`call_llm_json`** (`recast_engine`) — herda o guard de fidelidade.
- [x] **Shotlist:** **YAML no brief + Markdown legível** — cobre máquina (Fase B) e humano.

## Dependências
- `*creative-benchmark` já produz `benchmark/{plataforma}/{rank}-{handle}/` com `Benchmark.json`, `Transcrição.md`, `Análise.md`, `Screenshots/` — **input da Frente 1**.
- `data/clients/_registry.yaml` + `brand-identity`/`brand-config` por cliente.
- EPIC-MKT-VIDEO (motor Sam: ffmpeg/whisper/director) — reaproveitado na Frente 2.
- App `apps/creative-design` — referência de arquitetura para `apps/video-studio`.

## Estimativa
Fase A: 6 stories (~M–L cada). Fase B: 5 stories (~L–XL cada). Epic de porte **XL**.

## Referências
- Estado atual: `squads/virals-marketing-squad/scripts/export_to_davinci.py`
- Espelho-alvo (estáticos): `squads/virals-marketing-squad/scripts/design_creative.py` + `plan_creative.py` + `quality_gate.py`
- App-referência: `apps/creative-design/src/app/{studio,render}/page.tsx`
- Motor: Remotion · `@remotion/captions` · `@remotion/install-whisper-cpp` · `@remotion/transitions`

---
*O benchmark é a bússola. O plano é o mapa. O editor próprio é a máquina.*
