# Casey Neistat — Post Visual Quality Checklist v1.0

Checklist de validação para posts únicos produzidos por @casey-neistat-img.

**Workflow:** `casey-post-production.yaml`
**Template:** `casey-post-brief-tmpl.md`

---

## 📋 Phase 1: Briefing

> Task: `casey-post-single-create.md` Step 1 | Executor: @casey-neistat-img

- [ ] Tema e objetivo do post definidos?
- [ ] Headline principal aprovada (máx. 60 chars)?
- [ ] CTA definido e claro?
- [ ] Público-alvo identificado?
- [ ] Brand config carregado e validado?
- [ ] Layout escolhido (imagem-first / texto-over / split)?

---

## 🎨 Phase 2: Imagem Base

> Task: `casey-ai-generate.md` ou processamento de imagem | Executor: @casey-neistat-img

- [ ] Resolução da imagem base ≥ 1080px no menor lado?
- [ ] Se gerada via IA: ausência de artefatos, watermarks ou deformações?
- [ ] Crop aplicado sem cortar ponto de interesse?
- [ ] Cor da imagem compatível com paleta de marca?
- [ ] Modelo de IA e seed documentados (para reprodutibilidade)?

---

## 🖼️ Phase 3: Composição

> Task: `casey-post-single-create.md` Step 4 | Executor: @casey-neistat-img

- [ ] **Contrast ratio do texto ≥ 4.5:1** (WCAG AA)?
- [ ] Headline legível sem zoom em tela de smartphone?
- [ ] Logo visível e proporcional?
- [ ] Nenhum elemento cortado nas safe zones (60px de margem)?
- [ ] Overlay semi-transparente não destrói a imagem base?
- [ ] Elementos vetoriais PyCairo renderizados nítidos em todos os tamanhos?
- [ ] Body text ≤ 3 linhas (posts não são artigos)?
- [ ] CTA element visualmente destacado (botão, seta, tag)?
- [ ] Z-order correto: logo sobre texto, texto sobre overlay, overlay sobre imagem?

---

## 📦 Phase 4: Export

> Task: `casey-image-resize-export.md` | Executor: @casey-neistat-img

- [ ] Formato 1:1 (1080×1080) exportado?
- [ ] Formato 4:5 (1080×1350) exportado?
- [ ] Formato 9:16 (1080×1920) exportado para Stories?
- [ ] Versões WebP geradas para cada formato?
- [ ] PNG ≤ 2MB por formato?
- [ ] WebP ≤ 500KB por formato?
- [ ] export_manifest.json com todos os paths e file sizes?
- [ ] Pasta de output organizada com slug claro?

---

## ✅ Validação Final

- [ ] Post revisado em fundo claro E fundo escuro (feed misto)?
- [ ] Post testado em preview de smartphone (proporcão correta)?
- [ ] Brand tokens documentados no manifest?
- [ ] Post aprovado pelo responsável criativo?

---

_Checklist Version: 1.0.0_
_Last Updated: 2026-05-10_
_Pattern: VM-TP-001_
