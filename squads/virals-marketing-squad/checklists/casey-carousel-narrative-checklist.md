# Casey Neistat — Carousel Narrative Quality Checklist v1.0

Checklist de validação para carrosséis produzidos por @casey-neistat-img.

**Workflow:** `casey-carousel-production.yaml`
**Template:** `casey-carousel-brief-tmpl.md`

---

## 📋 Phase 1: Estrutura Narrativa

> Task: `casey-carousel-create.md` Step 1 | Executor: @casey-neistat-img

- [ ] Slide 1 tem headline de hook (cria curiosidade, não entrega tudo)?
- [ ] Slides intermediários têm UM único conceito cada (sem sobrecarga)?
- [ ] Último slide tem CTA explícito e acionável?
- [ ] Slide_count entre 3 e 15?
- [ ] Fluxo narrativo testado: faz sentido ler em sequência?
- [ ] content_data completo para todos os slides antes de iniciar?

---

## 🎨 Phase 2: Layout e Consistência Visual

> Task: `casey-carousel-create.md` Step 2 | Executor: @casey-neistat-img

- [ ] Grid master definido (posições, safe zones, tipografia)?
- [ ] Safe zones respeitadas em TODOS os slides (mín. 60px)?
- [ ] Número de slide visível em posição consistente?
- [ ] Logo em posição e tamanho consistente em todos os slides?
- [ ] Tipografia: mesma família em todos (variação apenas em peso)?

---

## 🖼️ Phase 3: Composição por Slide

> Task: `casey-carousel-create.md` Step 4 | Executor: @casey-neistat-img

**Slide 1 (Hook):**
- [ ] Imagem de impacto visual — para o scroll?
- [ ] Headline cria curiosidade sem entregar o conteúdo?
- [ ] Visualmente diferente do conteúdo orgânico do feed (destaca-se)?

**Slides 2..N-1 (Valor):**
- [ ] Cada slide é autossuficiente (faz sentido isolado)?
- [ ] Texto máx. 3 linhas por slide?
- [ ] Contrast ratio ≥ 4.5:1 em todos os slides?

**Slide N (CTA):**
- [ ] CTA claro e direto (o que fazer agora)?
- [ ] Reforço de marca visível?
- [ ] Incentivo para salvar/compartilhar/comentar?

---

## 🎨 Phase 4: Coerência Visual da Série

> Task: `casey-carousel-create.md` Step 5 (OpenCV batch) | Executor: @casey-neistat-img

- [ ] Transição visual entre slides é fluida (sem choques de cor)?
- [ ] Paleta harmoniosa aplicada em batch via OpenCV?
- [ ] Brilho e saturação consistentes entre slides com imagem?

---

## 📦 Phase 5: Export e Empacotamento

> Task: `casey-carousel-create.md` Step 6 | Executor: @casey-neistat-img

- [ ] Slides numerados sequencialmente (slide_01 primeiro)?
- [ ] Todos os slides em PNG + WebP?
- [ ] ZIP gerado com slides em ordem correta?
- [ ] carousel_manifest.json com estrutura narrativa documentada?
- [ ] Pasta de output organizada com slug claro?

---

## ✅ Teste Final do Carrossel

- [ ] Carrossel assistido na sequência completa — narrativa coesa?
- [ ] Testado em preview de smartphone (1:1 correto)?
- [ ] Slide 1 sozinho funciona como post unitário (para compartilhamento)?
- [ ] Carrossel aprovado pelo responsável criativo?

---

_Checklist Version: 1.0.0_
_Last Updated: 2026-05-10_
