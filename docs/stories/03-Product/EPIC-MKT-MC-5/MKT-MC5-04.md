# MKT-MC5-04: Editor Preview reflete brand-agnostic (signature + paleta)

## Status
Done

## Story
**Como** dono editando um criativo de Tiago no `/editor?client=tiago-elesbao`
**Eu quero** que o preview à direita mostre o visual REAL (com `@tiagoelesbao` wordmark + paleta preto/âmbar/laranja-vermelho) e não o visual Virals (V+ logo + navy/violeta)
**Para que** o editor reflita fielmente o que o pipeline `*design-creative` produzirá no render final

## Contexto
Após MKT-MC4-04 e MKT-MC4-05 fixaram a injeção de signature/footer/paleta no **render pipeline** (Playwright server-side), o **editor** (live preview client-side) continuou usando os 3 templates legacy SEM passar essas props. Resultado: editor mostrava V+ logo Virals + paleta navy/violeta mesmo para briefs de Tiago, criando dessincronia visual entre o preview e o que o pipeline geraria.

## Tarefas (Checklist)
- [x] **API `/api/briefs/route.ts`:**
  - Trocar `loadClientDisplayMap` por `loadClientInfoMap` que retorna `{display, handle}` por cliente do registry
  - Incluir `handle_instagram` em `briefs[].client` e em `clients[]` da resposta
- [x] **Editor `editor/page.tsx`:**
  - Estender `BriefClient` e `ClientTab` com `handle?: string`
  - Adicionar interface `BrandPreviewProps` (signatureHandle + footerText + 4 cores da paleta)
  - State `brandPreview` populado no `loadBrief()`:
    - Lê `client_slug` + `brand_tokens.palette` do JSON do brief
    - Encontra o `handle` no `clients[]` da lista (já fetchada)
    - Resolve signature/footer/paleta com a mesma lógica do orquestrador (virals back-compat = "" handle + footer canônico; outros = handle + footer vazio)
  - Passar `brand={brandPreview}` ao `<SlidePreview>`
  - `loadBrief` ganha `clients` no deps array (closure precisa do handle)
- [x] **`SlidePreview` component:**
  - Aceitar nova prop `brand: BrandPreviewProps`
  - Spread `...brand` no objeto props (signatureHandle, footerText, primary/secondary/accentAlt/accentAurora vão direto para o template)

## Critérios de Aceite
- [x] `/editor?client=tiago-elesbao` mostra `@TIAGOELESBAO` (não `V+`) em todos os previews
- [x] Fundo do preview em preto + laranja-vermelho/âmbar (não navy/violeta)
- [x] Footer "Virals Intelligence Engine" suprimido para briefs de Tiago
- [x] Back-compat: `/editor?client=virals` continua mostrando V+ logo + paleta Virals (signatureHandle vazio → BrandingLogo renderiza)
- [x] `npx tsc --noEmit` clean nos 2 arquivos editados (route.ts + page.tsx)

## Out of Scope
- Atualizar `pickTemplate()` para escolher entre os 7 templates (hoje só os 3 legacy: quote / single / news). O preview sempre cai em um desses 3 mesmo quando o pipeline real usaria StepListSlide/DataCardSlide/etc. Pode entrar em iteração futura quando quisermos que o editor permita troca de template
- Suporte ao editor para EDITAR `mainObjectImage` que veio de Pexels (hoje só upload manual)

## Referências
- API: `apps/creative-design/src/app/api/briefs/route.ts` (loadClientInfoMap)
- Editor: `apps/creative-design/src/app/editor/page.tsx` (BrandPreviewProps, brandPreview state, SlidePreview)
- Pipeline equivalente (orchestrate): MKT-MC4-04 + MKT-MC4-05
