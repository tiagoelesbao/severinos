# EPIC-MKT-Creative-Editor — Editor de Criativos ("Check Mate")

**Status:** Aprovado pelo dono · 2026-05-17
**Autor:** @marketing-chief + @architect · 2026-05-17

## Visão
Hoje o pipeline `*design-creative` entrega o criativo **renderizado e final** — o usuário não consegue ajustar. Esta epic entrega a peça que falta: uma **UI de edição** onde, ao fim do fluxo, o usuário recebe o carrossel/post e faz o **ajuste fino** antes de publicar.

Isto transforma o motor de "gerador" em **produto usável**.

## Capacidades-alvo
- Ver o criativo renderizado, slide a slide.
- Editar os **textos** (headline, body, kicker) inline.
- Ajustar **tamanho de fonte** por slide (override do auto-scale).
- **Trocar/subir imagem** (upload de arquivo ou nova busca Pexels) e **reenquadrar** (zoom + posição).
- Re-render ao vivo e **exportar** o resultado final (PNG/WebP + ZIP).

## Arquitetura proposta

**Onde vive:** no app `apps/creative-design` (Next.js) que já existe — nova rota `/editor`.

| Aspecto | Decisão |
|---|---|
| Carregar criativo | API route lê o `brief-v5-*.yaml` → JSON para o browser |
| Preview ao vivo | Reusa os componentes React de template (`ModeledCarouselSlide`, `QuoteSlide`, `SinglePostSlide`) — render reativo ao estado |
| Estado de edição | Estado React do brief (textos, imagens, overrides de fonte) |
| Override de fonte | Templates ganham props opcionais `headlineFontSize`/`bodyFontSize` que sobrepõem o auto-scale |
| Upload de imagem | `<input type=file>` → grava em `public/render-assets`; troca de Pexels reusa `pexels_service` |
| Reenquadramento | `object-position` + zoom (scale) controlados por slider |
| Export final | Re-dispara o render Playwright (qualidade 2x) com o brief editado, OU captura client-side |
| Persistência | Salvar o brief editado de volta no `.yaml` |

## Stories (faseamento)

### MED-01 — Editor Shell + Carregar Criativo
Rota `/editor`, seletor de criativo, lista de slides, preview ao vivo (read-only). API de leitura do brief.

### MED-02 — Edição de Texto & Tipografia
Campos editáveis de headline/body/kicker; sliders de tamanho de fonte por slide; preview reativo; props de override nos templates.

### MED-03 — Imagens: Upload, Troca & Enquadramento
Trocar imagem por upload de arquivo ou nova busca Pexels; reenquadrar (zoom + posição); preview reativo.

### MED-04 — Export & Persistência
Exportar o criativo editado (PNG/WebP + ZIP) reusando o render Playwright; salvar o brief editado.

## Decisões (resolvidas pelo dono · 2026-05-17)
1. **Export:** ✅ Re-render via Playwright — alta qualidade (2x), mesma do pipeline.
2. **Persistência:** ✅ Sobrescrever o brief original (sem versionamento).
3. **Acesso:** ✅ Local (localhost) — junto do app `creative-design` atual.

## Dependências
- App `apps/creative-design` rodando · pipeline `*design-creative` (MKT-MEDIA-05..12) ✔

## Estimativa
4 stories · ~M cada · epic de porte L–XL.
