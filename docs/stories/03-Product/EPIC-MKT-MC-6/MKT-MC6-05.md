# MKT-MC6-05: Wire-up — render switch + templates.yaml + smoke test

## Status
Done

## Story
**Como** sistema integrado
**Eu quero** que os 4 novos componentes (StepListSlide, DataCardSlide, FounderDiarySlide, ProvocationHeroSlide) estejam plugados no fluxo `*design-creative` ponta a ponta — registry → orquestrador → render → output
**Para que** o usuário consiga rodar `*design-creative` com qualquer um deles selecionado e ver o output em `outputs/tiago-elesbao/{carousels|posts}/`

## Contexto
Depois de MKT-MC6-01..04 entregarem os componentes React, esta story conecta tudo: atualiza `templates.yaml`, mapeia template_ids no `render/page.tsx` switch, garante que o orquestrador trata os IDs novos como qualquer outro, e roda um smoke test ponta a ponta.

## Tarefas (Checklist)
- [x] Atualizar `apps/creative-design/src/app/render/page.tsx`:
  - Importar 4 novos componentes
  - Adicionar 4 cases no switch: `tiago-step` → StepListSlide, `tiago-data` → DataCardSlide, `tiago-diary` → FounderDiarySlide, `tiago-provocation` → ProvocationHeroSlide
- [x] Atualizar `data/clients/tiago-elesbao/templates.yaml`:
  - `carousel-step`: trocar `react_component` para `StepListSlide`, `template_id_render` para `tiago-step`, `preview_status: ready`, remover `preview_note`
  - `single-data`: idem para `DataCardSlide` / `tiago-data`
  - Adicionar `carousel-founder-diary` (4º carrossel) → `FounderDiarySlide` / `tiago-diary`
  - Adicionar `single-provocation` (4º single) → `ProvocationHeroSlide` / `tiago-provocation`
  - Atualizar `scoring_match` com os 2 novos templates (ver spec seção 4 para ordens recomendadas)
- [x] Validar: `python design_creative.py --list-templates --client=tiago-elesbao` mostra 4 carousel + 4 single, todos `preview_status: ready`
- [x] Smoke test ponta a ponta:
  - Escolher um benchmark do Tiago (e.g., `workspaces/businesses/tiago-elesbao/.../benchmark/instagram/10-falajoaobranco-dbaea6/`)
  - Rodar `*design-creative` no agent com bench-type=carousel, output=carousel, template=carousel-step
  - Confirmar geração em `outputs/tiago-elesbao/carousels/<slug>/`
  - Repetir para os outros 3 novos templates (data, diary, provocation)
- [x] Verificar léxico: nenhum default/placeholder dos componentes contém palavras-tabu (segredo, mentoria, dica, etc.)
- [x] (Opcional) Atualizar editor `pickTemplate()` em `apps/creative-design/src/app/editor/page.tsx` para reconhecer os 4 novos `template_id_render` (usar mapping correto no preview)

## Critérios de Aceite
- [x] 4 novos `templateId` reconhecidos no switch do `render/page.tsx`
- [x] `templates.yaml` do Tiago tem 4 + 4 templates, todos `ready`
- [x] `--list-templates` confirma o estado
- [x] Smoke test: 4 outputs gerados corretamente, paleta preto+âmbar consistente
- [x] Editor mostra preview do template correto na sidebar quando brief tem `template_id_render` novo
- [x] EPIC-MKT-MC-4 status atualizado de "PARTIAL" para "COMPLETE" (Fase B1 + B2 entregues)

## Out of Scope
- Adicionar esses 4 templates ao `templates.yaml` do Virals (decisão B2: exclusivos Tiago)
- Templates futuros (5º, 6º+ por cliente)

## Referências
- Render switch: `apps/creative-design/src/app/render/page.tsx`
- Templates YAML: `data/clients/tiago-elesbao/templates.yaml`
- Lista de CLI: `python design_creative.py --list-templates --client=tiago-elesbao`
- Spec: `data/clients/tiago-elesbao/templates-spec-fase-b2.md` (seção 4)
- Critério de aceite global do epic: `EPIC-MKT-MC-6.md` (Critério "templates dedicados entregues")
