# MKT-MC4-04: Brand-Agnostic Signature & Footer nos templates legacy

## Status
Done

## Story
**Como** Marketing Chief
**Eu quero** que `ModeledCarouselSlide`, `SinglePostSlide` e `QuoteSlide` aceitem props `signatureHandle` (substitui `BrandingLogo V+` por wordmark textual em accentColor) e `footerText` (default "Virals Intelligence Engine", pode ser suprimido)
**Para que** os templates legacy renderizem corretamente para qualquer cliente (não vazem branding Virals) quando o pipeline rodar com `--client=tiago-elesbao` ou outros

## Contexto
O 1º run de `*design-creative` para Tiago mostrou que slides renderizados via `ModeledCarouselSlide` (template `carousel-news`) tinham:
- Logo `V+` (BrandingLogo) hardcoded no header — wrong para Tiago
- Footer "Virals Intelligence Engine" hardcoded — wrong para Tiago

Diagnóstico: os 3 templates legacy eram **brand-hardcoded** apesar de receberem brand_tokens no brief. Os 4 templates novos (Fase B2) já tinham essa props desde o build inicial — só os legacy precisavam do retrofit.

## Tarefas (Checklist)
- [x] Adicionar `signatureHandle?: string` e `footerText?: string` ao interface de:
  - `ModeledCarouselSlide.tsx` (consumido por `carousel-news`)
  - `SinglePostSlide.tsx` (consumido por `single-insight`)
  - `QuoteSlide.tsx` (consumido por `single-quote` e `carousel-quote-stack`)
- [x] Criar helper `SignatureMark` (interno) que renderiza `<span>{handle}</span>` em accentColor + tracking uppercase, replacement direto do BrandingLogo
- [x] Em `ModeledCarouselSlide`: substituir as 2 ocorrências de `<BrandingLogo>` (header + variant CTA) por `signatureHandle ? <SignatureMark> : <BrandingLogo>` (back-compat)
- [x] Em `ModeledCarouselSlide`: trocar hardcode `"Virals Intelligence Engine"` por `{footerText}` (default "Virals Intelligence Engine")
- [x] Mesmas mudanças simétricas em `SinglePostSlide.tsx` (1 BrandingLogo + 1 hardcode footer)
- [x] Mesmas mudanças em `QuoteSlide.tsx` (1 BrandingLogo; QuoteSlide não tem footer text)
- [x] Atualizar `orchestrate_carousel.py` para:
  - Importar `_client_resolver.resolve_client`
  - Função `_resolve_client_signature(client_slug)` que devolve `(signatureHandle, footerText)` — vazio/canônico para Virals, handle/vazio para outros
  - Injetar `signatureHandle` + `footerText` no payload de props enviado ao render service

## Critérios de Aceite
- [x] `npx tsc --noEmit` não introduz novos erros nos 3 templates patched
- [x] Smoke test: pipeline rodado para tiago-elesbao com `--template=carousel-news` mostra `@TIAGOELESBAO` (não `V+`) no canto superior + footer "" (não "Virals Intelligence Engine")
- [x] Back-compat: rodando o mesmo pipeline para `--client=virals` mantém o BrandingLogo V+ + footer canônico (confirmado por inspeção)
- [x] `_pipeline-trace.json` registra `render_inputs.signature_handle` e `render_inputs.footer_text` — auditável

## Out of Scope
- Patches de `BrandingLogo.tsx` para suportar variants per-client (Tiago não tem logo dedicado por enquanto — wordmark serve)
- Patches em `orchestrate_post_single.py` (legacy, usa `SinglePostTemplate` não afetado por esse fix)

## Referências
- React templates: `apps/creative-design/src/components/design-system/templates/{ModeledCarouselSlide,SinglePostSlide,QuoteSlide}.tsx`
- Orquestrador: `squads/virals-marketing-squad/scripts/orchestrate_carousel.py` (`_resolve_client_signature`)
- Brief example: `squads/virals-marketing-squad/data/brief-v5-06-publicitarioscriativos-2a6dbb.yaml` (tem `client_slug: tiago-elesbao`)
