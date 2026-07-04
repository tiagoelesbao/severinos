# EPIC-MKT-Video-Excellence — Da Máquina Funcional ao Produto de Classe Mundial

**Status:** Draft (aguardando validação do dono)
**Autor:** Claude (auditoria completa Fase A + Fase B) · 2026-07-02
**Origem:** Auditoria de 2026-07-02 sobre o `*industrialize-video` (Fase A) e o `apps/video-studio` (Fase B) do EPIC-MKT-Video-Creative.

## Visão

O EPIC-MKT-Video-Creative entregou a fundação: pipeline spec-driven com gate de fidelidade (Fase A) e editor Remotion com montagem narração-driven (Fase B). A auditoria confirmou qualidade acima da média no núcleo (fidelidade terminal V1–V7, auto-cut por energia de áudio, correção de legendas por alinhamento DP), mas identificou:

1. **1 gap crítico que anula o valor do app:** o que se edita no `/studio` **não vira mp4** — não existe export que respeite o `studio-edit.json`; os scripts de render re-ingerem do zero e os assets das camadas extras (URLs `/library/`, `/api/media/`) não resolvem no render headless.
2. **A Fase A é cega:** os `Screenshots/` do benchmark nunca passam por visão computacional; a "cadência de cortes" medida vem da segmentação da transcrição, não dos cortes reais de edição.
3. **A ponte Fase A→B é manual no ponto mais caro:** `transcript.json` (Whisper) e `assembly.json` (âncoras narração→insert) são feitos à mão por criativo.
4. **O editor é um MVP funcional com aparência de protótipo:** inline styles, emoji como ícone, tipografia 9–11px, sem design system, sem atalhos core (Ctrl+Z), sem thumbnails, sem keyframes — longe da paridade com CapCut/Premiere que o produto exige para um pool de clientes.

Este épico transforma a máquina em **produto**: destrava o export, automatiza a ponte, dá olhos à Fase A, e eleva o editor a padrão profissional (funcionalidade + estética) com a pitada IA-first que é o diferencial da Virals.

## Princípios

- **Herança integral do EPIC-MKT-Video-Creative:** No Invention / fidelidade de fatos; benchmark é tema, voz é do cliente; gate bloqueante; cliente como 1º input; pesquisa-âncora 2026 (hook 0–3s, checkpoint ~1,5–2s).
- **O editor entrega ou não existe:** toda edição visível no Player deve ser reproduzível 1:1 no mp4 final. Preview ≠ produto até o export ser fiel.
- **Automação primeiro, ajuste fino depois:** cada passo manual recorrente (transcrever, ancorar, classificar) é dívida — vira código.
- **IDS REUSE > CREATE:** reusar `sam_whisper_service`, `pexels_service`, visão Gemini do `generate_template_from_benchmark.py`, detectores do `recast_engine`.
- **Um design system, não estilos ad-hoc:** tokens + componentes; o accent por cliente (brand-config) é a identidade visual do editor.

## Frentes de Atuação

| Frente | Objetivo | Stories | Prioridade |
|--------|----------|---------|------------|
| **F1 — Destravar o produto** | Export fiel + ponte A→B automática + confiabilidade do editor | VEX-01, VEX-02, VEX-03 | **P0** |
| **F2 — Qualidade do output** | Fase A com visão + áudio profissional + plano consumido de ponta a ponta | VEX-04, VEX-05, VEX-06 | **P1** |
| **F3 — Paridade NLE + estética** | Design system, timeline pro, keyframes/multi-track, preview pro | VEX-07, VEX-08, VEX-09, VEX-10 | **P2** |
| **F4 — Diferencial IA-first + escala** | Multi-hook batch, IA no editor, render em nuvem | VEX-11, VEX-12, VEX-13 | **P2/P3** |

## Roadmap (Stories)

### F1 — Destravar o produto (P0 — sem isso o app não entrega)
- [ ] **VEX-01** — Export final do Studio: render fiel ao `studio-edit.json` + resolução de assets + botão com progresso — Draft
- [ ] **VEX-02** — Ponte automática Fase A→B: transcrição Whisper + `assembly.json` auto-gerado + scaffold do criativo + protocolo do agente atualizado — Draft
- [ ] **VEX-03** — Confiabilidade do editor: atalhos core (Ctrl+Z/Y, Del, frame-step), guard de edições não salvas, persistir estilo de legenda — Draft

### F2 — Qualidade do output (P1)
- [ ] **VEX-04** — Fase A com olhos: visão computacional nos frames do benchmark + detecção de cortes reais (cadência verdadeira) — Draft
- [ ] **VEX-05** — Áudio profissional: crossfade anti-click na narração, ducking por envelope, keywords de legenda do brand-identity — Draft
- [ ] **VEX-06** — Plano consumido de ponta a ponta: `edit_spec` pré-plotado no editor + `classifyRole` dirigido pelo plano — Draft

### F3 — Paridade NLE + estética (P2)
- [ ] **VEX-07** — Design system do Studio: Tailwind + shadcn/ui, tokens, layout profissional com splitters, toasts, context menus — Draft
- [ ] **VEX-08** — Timeline pro: thumbnails/filmstrip, snap visual, track headers (mute/solo/lock), multi-seleção, markers — Draft
- [ ] **VEX-09** — Keyframes + multi-track de vídeo (PiP) + fades e volume por clipe — Draft
- [ ] **VEX-10** — Preview pro: safe-zones IG/TikTok, grade, medidores de áudio, command palette — Draft

### F4 — Diferencial IA-first + escala (P2/P3)
- [ ] **VEX-11** — Export batch "1 body × 3 hooks" (variantes A/B direto do plano) — Draft (P2)
- [ ] **VEX-12** — Suíte IA-first no editor: auto b-roll (Pexels), re-cut para cadência-alvo, SFX por tags, auto-reframe multi-formato — Draft (P3)
- [ ] **VEX-13** — Escala: render em nuvem (Lambda/Cloud Run) + biblioteca de assets indexada — Draft (P3)

## Sequenciamento e Dependências

```
VEX-01 (export) ──┬─► VEX-05, VEX-06 (qualidade do output exportado)
VEX-02 (ponte)  ──┼─► VEX-06 (classifyRole pelo plano exige assembly automático)
VEX-03 (confiab.)─┘
VEX-07 (design system) ──► VEX-08, VEX-09, VEX-10 (constroem sobre os componentes novos)
VEX-01 + VEX-02 ──► VEX-11 (batch de hooks exige export + ponte automáticos)
VEX-12, VEX-13 — após F1–F3 estabilizarem
```

Ordem recomendada de execução: **VEX-01 → VEX-02 → VEX-03 → VEX-04 → VEX-05 → VEX-06 → VEX-07 → VEX-08 → VEX-09 → VEX-10 → VEX-11 → VEX-12 → VEX-13**.

## Evidências da Auditoria (referências)

- Export ausente/infiel: `apps/video-studio/scripts/render-fx.ts` (re-ingere, ignora `studio-edit.json`); `src/app/api/timeline/route.ts` (POST salva mas nada renderiza); `src/remotion/TimelineFxComposition.tsx` (src de camadas extras são URLs do Next).
- Ponte manual: `src/lib/ingest.ts:483` (espera `assembly.json`/`transcript.json` que ninguém gera); QA da MVC-08 já rastreava "[Low · ambiente] automatizar na Fase A".
- Fase A cega: `deep_modeler_video.py:171` (frames só ganham timestamp); `analyze_video_benchmark.py:86` (`compute_cut_cadence` mede segmentação da transcrição).
- Editor: `src/app/studio/page.tsx` (atalhos limitados a Space/setas/Ctrl+S; `styleId` não persistido no save; `load()` descarta edições ao alternar auto-cut); `src/remotion/fx/Captions.tsx` (KEYWORDS hardcoded).

## Estimativa

F1: 3 stories (L, L, M). F2: 3 stories (L, M, M). F3: 4 stories (L, L, XL, M). F4: 3 stories (M, XL, L). Epic de porte **XL**.

## Referências

- Épico-pai: `docs/stories/03-Product/EPIC-MKT-Video-Creative/_EPIC-PLAN.md`
- App: `apps/video-studio/` · Pipeline Fase A: `squads/virals-marketing-squad/scripts/video_plan.py` (+ 4 motores)
- Serviços reusáveis: `squads/virals-marketing-squad/tools/{sam_whisper_service,pexels_service}.py`, `scripts/generate_template_from_benchmark.py` (visão Gemini)
- Caso de validação real: `outputs/tiago-elesbao/video-plans/13-realchasechappell-84d69e/`

---
*O export é a entrega. A ponte é a escala. Os olhos são a vantagem. O design é a confiança.*
