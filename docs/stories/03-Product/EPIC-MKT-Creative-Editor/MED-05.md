# MED-05: Editor Avançado Híbrido (Camadas, Drag & Objetos)

**Status:** InProgress
**Epic:** EPIC-MKT-Creative-Editor
**Complexidade:** L (Complex — reabre o epic; provável quebra em sub-stories)
**Criada por:** @marketing-chief (orquestração) · 2026-06-13

## Story
**Como** Marketing Chief / operador de criativos
**Eu quero** um editor visual com camadas, manipulação direta (drag/resize), e adicionar/remover objetos livres
**Para que** eu consiga ajustar finamente um criativo como em um software de edição de imagem, sem depender só de campos de formulário.

## Contexto
O EPIC-MKT-Creative-Editor (MED-01..04) entregou um editor **baseado em formulário por slide**
(`apps/creative-design/src/app/editor/page.tsx`): campos de texto, sliders de fonte, 1 imagem
com zoom/posição, remover slide. O preview é o próprio componente React escalado, e o export
re-renderiza via Playwright (`orchestrate_carousel.py`).

O dono pediu uma evolução para uma experiência **tipo software de imagem**: redimensionamento e
reposicionamento por handles, remoção/adição de objetos, **separação por camadas**, e ajuste fino
de parâmetros arbitrários por camada. Esta story registra essa frente (Fase C) — separada das
Frentes A+B (gerador de template a partir de benchmark), que são entregues em paralelo fora deste epic.

## Decisão de arquitetura (alinhada com o dono)
**Abordagem: HÍBRIDA** (decidida via AskUserQuestion em 2026-06-13).
- Camada interativa (drag / handles de transform / painel de camadas) **sobre o preview**.
- O **export final continua no pipeline React→PNG existente** (Playwright + `/render`), preservando
  fidelidade e compatibilidade com `orchestrate_carousel.py`.
- O estado do editor (camadas + transforms + objetos) precisa **serializar para um modelo** que o
  `/render/page.tsx` saiba reconstruir — provável extensão dos props de slide com um array `layers[]`.
- Alternativas descartadas: canvas puro (Konva/Fabric — diverge do pipeline de render, exige novo
  motor de export); estender só o form (não entrega a experiência pedida).

## Escopo proposto (a refinar por @sm/@architect ao ativar)
**IN (provável):**
- Modelo de camadas serializável (`layers[]`: texto, imagem, forma, com x/y/w/h/rotation/z/opacity).
- Painel de camadas no editor (reordenar, mostrar/ocultar, travar, remover).
- Manipulação direta no preview: selecionar, arrastar, redimensionar por handles, rotacionar.
- Adicionar objetos (texto livre, imagem, forma).
- Reconstrução das camadas no `/render` para o export Playwright.
**OUT (provável):**
- Filtros avançados de pixel (blur/curvas) — fase posterior.
- Remoção de objeto por IA (inpainting) — fase posterior.
- Co-edição em tempo real / múltiplos usuários.

## Critérios de Aceite (rascunho)
- **AC1:** Usuário arrasta e redimensiona um elemento no preview e a mudança persiste.
- **AC2:** Painel de camadas permite reordenar, ocultar, travar e remover camadas.
- **AC3:** Usuário adiciona um objeto novo (texto/imagem/forma) que aparece no render final.
- **AC4:** O export Playwright reproduz fielmente o layout editado (camadas + transforms).
- **AC5:** Back-compat: briefs/criativos antigos (sem `layers[]`) continuam renderizando.

## Dependências
- Frentes A+B (`feat/benchmark-derived-templates`) — independentes, mas tocam o mesmo `/render` switch.
- Convenção de props de slide atual (`orchestrate_carousel._process_slide`).

## Riscos
- Reconciliação editor↔render é a parte difícil (estado interativo → props determinísticos do Playwright).
- Escopo grande: forte candidato a quebrar em MED-05.1 (modelo+camadas), MED-05.2 (manipulação direta),
  MED-05.3 (objetos novos + render).

## Dev Agent Record

### Entregue nesta iteração (1ª onda — rota `/studio`)
- **Modelo de camadas serializável** (`Layer` text/image/shape + `SlideDoc` + `SlideBackground`)
  com fábricas e seeding a partir do conteúdo do brief.
- **Canvas interativo** com react-moveable: drag / resize (com escala de fonte) / rotate por handles,
  seleção, deseleção no fundo.
- **Painel de camadas:** reordenar (z-index), ocultar, travar, duplicar, renomear, remover + adicionar
  objetos (texto/imagem/forma).
- **Inspector completo:** transform (x/y/w/h/rotação/opacidade); texto (conteúdo/fonte/peso/tamanho/cor/
  alinhamento/entrelinha/espaçamento/caixa/itálico/sombra); imagem (upload/fit/cantos/brilho/contraste/
  saturação/desfoque/flip); forma (tipo/preenchimento/borda/espessura/cantos); fundo do slide
  (marca/sólido/imagem).
- **Undo/redo** (histórico coalescido), **atalhos** (Delete, setas, Ctrl+D, Ctrl+Z/Y, Esc), **zoom**,
  abas de slides.
- **Export híbrido validado:** novo template de render `LayeredSlide` (`templateId: layered`) +
  `LayerView` compartilhado entre canvas e export → o Playwright reproduz fielmente as camadas
  (smoke test renderizou PNG correto). Persistência grava `layers`/`background` no brief;
  `orchestrate_carousel` detecta camadas e renderiza via `layered`.

### File List
- `apps/creative-design/src/lib/layers.ts` (novo)
- `apps/creative-design/src/components/studio/LayerView.tsx` (novo)
- `apps/creative-design/src/components/studio/StudioCanvas.tsx` (novo)
- `apps/creative-design/src/components/studio/LayersPanel.tsx` (novo)
- `apps/creative-design/src/components/studio/Inspector.tsx` (novo)
- `apps/creative-design/src/components/studio/controls.tsx` (novo)
- `apps/creative-design/src/components/design-system/templates/LayeredSlide.tsx` (novo)
- `apps/creative-design/src/app/studio/page.tsx` (novo)
- `apps/creative-design/src/app/render/page.tsx` (case `layered`)
- `apps/creative-design/src/app/editor/page.tsx` (link p/ Studio)
- `apps/creative-design/src/app/api/briefs/[id]/route.ts` (persiste `layers`/`background`)
- `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` (render `layered`)
- `apps/creative-design/package.json` (+ react-moveable)

### Pendente (próximas ondas)
- Snap/alinhamento entre camadas e guias inteligentes (recurso do moveable a expor na UI).
- Filtros de pixel avançados (curvas/níveis) e remoção de objeto por IA (inpainting) — fase posterior.
- Multi-seleção e agrupamento.
- Testes automatizados (vitest) do modelo de camadas e do mapeamento editor↔render.
- QA gate formal (@qa) + validação @po dos AC.

### 2ª onda — Templates como PRESETS DE CAMADAS (totalmente editáveis)
- Biblioteca de FX premium (`fx/index.tsx`): Backdrop por mood, FilmGrain (local), GlowOrb,
  LightLeak, Vignette, DottedGrid, GradientText, GlassPanel, GhostNumeral.
- **Templates decompostos em camadas editáveis** via `lib/templatePresets.ts` (`buildPreset` +
  `extractContent`): editorial, data, technical/steps, cinematic/quote+provocation, diary, dialog-box.
- Cada elemento (headline/body/kicker/número/decor/ghost) é uma **camada reposicionável/editável**.
- **Troca de template recalibra** o layout preservando o conteúdo (por `role`).
- **Fundo editável**: mood (brand) / cor sólida / imagem (com zoom+posição).
- `LayeredSlide` + `StudioCanvas` usam o Backdrop por mood (WYSIWYG canvas↔export).
- Flagships React (`ModeledCarouselSlide`, `DataCardSlide`) também upgradados (pipeline não-Studio).
- **Bugs corrigidos:** Studio mostrava seeds genéricos (agora mostra o template real decomposto);
  sobreposição de texto (posições desenhadas); `PremiumBackground` puxava noise de URL externa
  (trocado por SVG local — fim da dependência de rede no render); contorno de seleção no canvas.

### File List (2ª onda)
- `apps/creative-design/src/lib/layers.ts` (role + mood + bg framing)
- `apps/creative-design/src/lib/templatePresets.ts` (novo)
- `apps/creative-design/src/components/design-system/fx/index.tsx` (novo)
- `apps/creative-design/src/components/design-system/TemplateSwitch.tsx` (novo)
- `apps/creative-design/src/components/design-system/templates/{ModeledCarouselSlide,DataCardSlide,LayeredSlide}.tsx`
- `apps/creative-design/src/components/design-system/molecules/PremiumBackground.tsx` (noise local)
- `apps/creative-design/src/components/studio/{StudioCanvas,Inspector}.tsx`
- `apps/creative-design/src/app/studio/page.tsx`
- `apps/creative-design/src/app/render/page.tsx`

## Change Log
- 2026-06-13 — @marketing-chief — Story registrada (Draft) ao iniciar as Frentes A+B.
- 2026-06-13 — @marketing-chief (orquestração) — 1ª onda implementada (Studio `/studio`: modelo de
  camadas, canvas moveable, painel, inspector, undo/redo, export `LayeredSlide` validado). Status → InProgress.
  Decisão híbrida confirmada na prática. Pendente refino @sm/@architect + QA gate.
