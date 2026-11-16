# MED-06: Paridade de Render do Studio — Imagem Pexels + FX

**Status:** InReview
**Epic:** EPIC-MKT-Creative-Editor
**Complexidade:** M-L (8 pontos)
**Criada por:** @sm (River) · 2026-06-18
**Origem:** comparação real dos outputs do `01-falajoaobranco` — o carrossel gerado pelo pipeline automático (`ModeledCarouselSlide`) é visivelmente superior ao exportado pelo Studio (`LayeredSlide` ← presets), por DOIS motivos concretos.

## Story
**Como** usuário do Creative Studio
**Eu quero** que o criativo exportado pelo Studio tenha a mesma riqueza visual do gerado pelo pipeline automático (imagem real + efeitos)
**Para que** editar no frontend não signifique perder qualidade frente à geração automática.

## Contexto
Há dois caminhos de render:
- **Automático:** `orchestrate_carousel` → `ModeledCarouselSlide`. Busca **foto no Pexels** por slide (via `pexels_query`, `tools/pexels_service.search_and_download`) e a emoldura como card premium; aplica FX (glow nas réguas, corpo em caixa glass, glow-orb de leitura, grão).
- **Studio:** `LayeredSlide` ← camadas do preset (`templatePresets`). **Não busca Pexels** e o `LayerView` é mais simples.

Resultado: slides do Studio saem **sem imagem** e **mais chapados**. A ausência de imagem é o gap dominante (os briefs não carregam imagem — o Pexels é resolvido só no render automático).

## Gaps
- **G1 — Imagem (dominante):** o Studio nunca recebe foto. Precisa buscar Pexels pelo `pexels_query` do slide e popular a camada de imagem-card (mesmo card premium da MED-05/frame).
- **G2 — FX polish:** `LayerView`/preset não reproduzem: glow na régua do kicker, corpo em caixa glass com borda+glow, glow-orb de leitura atrás do texto, grão de coesão, e o CTA como chip (não só "DESLIZE" texto).
- **G3 (a confirmar):** relato de "paginação quebrada (vertical/horizontal)" — não reproduzido nos PNGs exportados (slides 1/5/7 OK); investigar canvas/slide específico.

## Decisão de arquitetura
### G1 — Imagem Pexels no Studio
- **Nova rota** `GET /api/pexels?q=<query>&orientation=portrait|landscape` (Node) — lê `PEXELS_API_KEY` (do `.env` da raiz), busca em `api.pexels.com/v1/search`, baixa para `public/render-assets/`, devolve `{ url }`. Espelha `pexels_service`.
- **Preset editorial** cria o card de imagem quando o slide tem `pexels_query` (placeholder se ainda sem `src`); a camada guarda `query` (termo de busca).
- **Load do brief:** auto-busca Pexels para slides com `query` e sem `src` (casa o default com o automático). + botão manual **"Buscar no Pexels"** no Inspector (campo de query prefilled) para trocar/re-buscar.

### G2 — FX no LayerView/preset
- `LayerView` (ou novo tipo de camada "fx") passa a suportar: glow em régua (shape com boxShadow de acento), corpo em GlassPanel, glow-orb decorativo, grão. Mantém WYSIWYG canvas/export.

## Tarefas (Checklist)
- [x] G1: rota `/api/pexels` (fetch+download para `render-assets/`, lê `PEXELS_API_KEY` da raiz, degrada sem chave). Testada → `{url}`.
- [x] G1: `ImageLayer.query` + `PresetContent.pexelsQuery`; preset editorial cria card com `query` quando há `pexels_query` (placeholder até buscar).
- [x] G1: Inspector — botão "Buscar no Pexels" + campo de query (prefill do slide).
- [x] G1: `loadBrief` auto-busca imagem (`hydratePexels`) para slides com query e sem src; salvar persiste e evita re-busca.
- [x] G1: Validação E2E (render LayeredSlide com Pexels) — card premium com foto real + paginação/FX. `tsc` limpo.
- [x] G2: FX — `ShapeLayer.glow/glass` + `TextLayer.glow` no `LayerView`; Backdrop editorial+technical ganharam luz-de-leitura (glow-orb); grão de coesão sobre as camadas (LayeredSlide + StudioCanvas); preset editorial usa glow na régua/kicker/barra + caixa glass no corpo. Render validado.
- [x] G2 (propagação): FX aplicados a TODOS os presets — `dataCard` (card glass + número/kicker glow), `stepList` (número/kicker glow), `cinematic` (kicker/régua glow), `dialogBox` (avatar glow). Render do `dataCard` validado.
- [x] G3: **resolvido** — o numeral-fantasma (role `ghost`, w fixa 620 + fonte 600px) quebrava linha com nº de 2 dígitos ("01"→"0"/"1" empilhados na vertical). Fix: `LayerView` aplica `white-space: nowrap` + `overflow: visible` para `ghost` (espelha o `<span>` do template automático). Validado no pior caso ("07").
- [x] **Layout de notícia vertical** — título topo · imagem-herói centralizada · descrição em painel glass abaixo · numeral-fantasma de volta (peek no rodapé). Proporções refinadas. Render validado.
- [x] **Smart guides** (react-moveable snappable) — aparecem só ao arrastar; snap a centro/margens/elementos; botão "⊹ Guias" liga/desliga.
- [x] **Grade de referência** (colunas × linhas, 2–16) — botão "⊞ Grade" + ajuste C×L; overlay só no editor (não exporta).
- [x] **Polish de proporções**: editorial (vertical) + dataCard (card centralizado, número-herói, rodapé com divisor) refinados e validados.
- [ ] Validação final: exportar `01-falajoaobranco` pelo Studio (UI) e comparar com o automático.

## Critérios de Aceite
- [ ] **AC1:** Slides do Studio com `pexels_query` exibem foto real (card premium) por padrão, igual ao automático.
- [ ] **AC2:** Botão manual permite buscar/trocar a imagem por um termo no Inspector.
- [ ] **AC3:** Régua do kicker, corpo e luz têm o FX (glow/glass/grão) — paridade visual perceptível com o `ModeledCarouselSlide`.
- [ ] **AC4:** `/api/pexels` é path-safe (baixa só para `render-assets/`) e degrada sem chave (não quebra o load).
- [ ] **AC5:** E2E: export do Studio do `01` visualmente comparável ao automático.
- [ ] **AC6:** `tsc` limpo; regressão zero nos templates sem imagem.

## Escopo
**IN:** `apps/creative-design/src` (nova rota `/api/pexels`, `lib/layers.ts`, `lib/templatePresets.ts`, `components/studio/*`, `components/design-system/fx` se preciso).
**OUT:** pipeline Python (já busca Pexels); copy/MCI.

## Dependências
- `PEXELS_API_KEY` no `.env` (raiz) ✔
- MED-05 (frame 'card', presets, atmosfera) ✔

## Riscos
- **R1:** auto-busca na carga = N chamadas Pexels (lento/rate-limit). → buscar só quando sem `src`; cache por arquivo; degradar em silêncio.
- **R2:** Next não carrega o `.env` da raiz por padrão. → a rota lê a chave do `.env` da raiz explicitamente.
- **R3:** FX no LayerView pode pesar no canvas. → efeitos CSS leves (já usados no Backdrop).

## Change Log
- 2026-06-18 — @sm — Story drafted da comparação real `01-falajoaobranco` (auto vs Studio). G1 imagem Pexels (dominante), G2 FX, G3 paginação a confirmar. Início imediato por G1 (decisão do dono). Status: InProgress.
- 2026-06-19 — @dev — Fix de regressão: **Grade não aparecia** no canvas. Causa: overlay desenhado dentro do `stage` (que tem `transform: scale`), fazendo as linhas de 1px virarem subpixel (~0.42px no zoom 42%) e somirem. Correção: mover a grade para o container externo (resolução de tela) — `backgroundSize` passa a usar `CANVAS_W*scale/cols`, 1px real em qualquer zoom; alpha 0.28→0.35. Arquivo: `apps/creative-design/src/components/studio/StudioCanvas.tsx`. tsc limpo (StudioCanvas: 0 erros).
