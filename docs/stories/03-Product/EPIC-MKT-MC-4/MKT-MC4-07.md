# MKT-MC4-07: Output Unique-Per-Run + HOOK image loading

## Status
Done

## Story
**Como** dono testando templates novos
**Eu quero** que (a) cada execução de `*design-creative` crie sua própria subpasta (`<template>__<timestamp>/`) ao invés de sobrescrever a pasta anterior, e (b) o HOOK variant do `StepListSlide` consuma a imagem Pexels do orquestrador como background full-bleed (não fique vazio no topo)
**Para que** EU CONSIGA comparar runs lado-a-lado (`carousel-news` vs `carousel-step` do mesmo bench) sem perder histórico, e o HOOK fique visualmente correto (imagem + texto sobreposto, não texto solto sobre fundo escuro)

## Contexto
Durante teste de Tiago com `--template=carousel-step`, dois problemas apareceram:

1. **Output sobrescrevia:** rodar `*design-creative` 2 vezes no mesmo bench (mudando só o template) gerava em `outputs/<client>/carousels/<slug>/` — a 2ª execução apagava os PNGs da 1ª. Impossível comparar visualmente os outputs de 2 templates diferentes
2. **HOOK sem imagem:** `StepListSlide` HOOK foi desenhado para ter foto bastidor full-bleed + texto sobreposto na parte inferior. Mas só lia `props.backgroundImage` (preset BG, raramente setado). A imagem real do Pexels vai em `props.mainObjectImage`. Resultado: topo vazio, texto solto no rodapé — "tudo centralizado abaixo, parecendo corrompido"

## Tarefas (Checklist)
- [x] **Output unique-per-run:** em `orchestrate_carousel.py`, mudar `output_dir`:
  - De: `outputs/<client>/carousels/<slug>/`
  - Para: `outputs/<client>/carousels/<slug>/<template>__<YYYYMMDDTHHMMSS>/`
  - Cada run cria nova subpasta, nunca sobrescreve
- [x] **Symlink `_latest`:** após criar a subpasta, criar um symlink/junction `outputs/<client>/carousels/<slug>/_latest` apontando para o run atual. Fallback no Windows (sem privilégio symlink): criar `_latest.txt` com o nome da pasta
- [x] **Remover cleanup obsoleto:** o `for old in os.listdir(output_dir): rm slide_*` agora itera num dir vazio (recém-criado) — comportamento harmless mas removido por clareza
- [x] **StepListSlide HOOK aceita `mainObjectImage`:**
  - Adicionar `mainObjectImage?: string` ao interface
  - Lógica: `const hookBg = backgroundImage || mainObjectImage`
  - Usar `hookBg` como `<img>` source quando truthy
- [x] **Ajustar overlay do HOOK:** trocar `bg-black/60` (muito plano) por gradient `from-black via-black/70 to-black/40` (escurece mais o rodapé para destacar texto, deixa topo mais visível)

## Critérios de Aceite
- [x] Rodando `*design-creative` 2× no mesmo bench com templates diferentes → 2 subpastas distintas, ambas preservadas
- [x] `_latest.txt` (ou symlink `_latest`) aponta para o run mais recente
- [x] Smoke test: `tiago-step__20260523T205952/slide_01.webp` mostra imagem do estádio full-bleed + gradient escuro inferior + headline+body legíveis em cima do gradient
- [x] Slide HOOK sem imagem (caso degenerado): cai no `PremiumBackground` (não quebra)
- [x] Sintaxe Python e TypeScript OK após edits

## Out of Scope
- Aplicar a mesma lógica de subpasta-por-run ao `orchestrate_post_single.py` (legacy single — fica para iteração futura)
- Fazer STEP e CTA_THINK variants do `StepListSlide` também consumirem imagem (intencionalmente text-only no spec, hierarquia visual em torno do número GIGANTE; adicionar imagem competiria com o número)
- Aplicar fallback `mainObjectImage` em `DataCardSlide` / `ProvocationHeroSlide` (eles já têm `backgroundImage` opcional; orquestrador pode setá-lo se necessário em iteração futura)

## Referências
- Orquestrador: `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` (bloco "Output unique-per-run (MKT-MC4-07)")
- Template: `apps/creative-design/src/components/design-system/templates/StepListSlide.tsx` (variant HOOK)
- Smoke test output: `outputs/tiago-elesbao/carousels/v5-precision-06-publicitarioscriativos-2a6dbb/tiago-step__20260523T205952/`
