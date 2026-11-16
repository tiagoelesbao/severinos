# Template de Briefing — Post Único (@casey-neistat-img)

**Template ID:** `casey-post-brief-tmpl`
**Agente:** @casey-neistat-img
**Workflow:** `casey-post-production.yaml`
**Versão:** 1.0.0

---

## Instruções de Uso

Preencha este briefing antes de acionar `*post-single`. Campos marcados com `*` são obrigatórios.
Quanto mais detalhe no briefing, menor a necessidade de iteração criativa.

---

## 📋 Briefing do Post

```yaml
post_brief:

  # --- IDENTIDADE ---
  slug: ""                    # * Identificador único (ex: "lancamento-produto-maio")
  tema: ""                    # * Tema central do post (ex: "Lançamento do Produto X")
  objetivo: ""                # * O que este post deve fazer? (engajar / vender / educar / anunciar)

  # --- COPY ---
  headline: ""                # * Frase principal que aparece na imagem (máx. 60 chars)
  body_text: ""               # Texto secundário na imagem (máx. 3 linhas, opcional)
  cta_text: ""                # * Chamada para ação visual (ex: "Saiba mais", "Compre agora")

  # --- PÚBLICO ---
  publico_alvo: ""            # Quem vai ver este post? (ex: "empreendedores 25-45 anos")
  temperatura_audiencia: ""   # "fria" | "morna" | "quente"

  # --- VISUAL ---
  layout: ""                  # "imagem-first" | "texto-over-imagem" | "split-layout"
  referencia_visual: ""       # URL ou path de uma imagem de referência estética (opcional)
  mood: ""                    # Tom visual: "energético" | "elegante" | "urgente" | "inspiracional"
  cor_destaque: ""            # Cor de destaque extra (hex) — usa paleta do brand se vazio

  # --- IMAGEM BASE ---
  imagem_fonte: ""            # Path de imagem existente (vazio = geração via IA)
  ai_prompt: ""               # Prompt para FLUX/Diffusers se não houver imagem (em inglês)
  ai_negative_prompt: ""      # O que evitar na geração (padrão: "blurry, watermark, text")
  ai_seed: null               # Seed para reprodutibilidade (null = aleatório)

  # --- FORMATOS ---
  formatos:
    - "1:1"                   # Instagram Feed (padrão)
    - "4:5"                   # Instagram Feed vertical
    - "9:16"                  # Stories (opcional)

  # --- MARCA ---
  brand_config: "squads/virals-marketing-squad/data/clients/virals/brand-config.yaml"  # default; trocar para clients/<slug>/brand-config.yaml conforme cliente
  aplicar_logo: true
  posicao_logo: "default"     # "default" | "top-left" | "top-right" | "bottom-center"

  # --- CONTEXTO ---
  data_publicacao: ""         # ISO8601 ou "ASAP"
  plataformas: []             # ["instagram", "linkedin", "facebook"]
  observacoes: ""             # Qualquer informação adicional para @casey
```

---

## 📌 Exemplos de Preenchimento

### Exemplo 1 — Post de Produto

```yaml
slug: "produto-x-lancamento"
tema: "Lançamento do Produto X"
objetivo: "vender"
headline: "O produto que vai mudar seu dia."
body_text: "Disponível a partir de segunda-feira."
cta_text: "Ver oferta"
layout: "imagem-first"
mood: "energético"
ai_prompt: "A sleek modern product on a minimalist white background, professional photography, studio lighting"
formatos: ["1:1", "4:5"]
```

### Exemplo 2 — Quote Motivacional

```yaml
slug: "quote-resiliencia-semana-3"
tema: "Resiliência no empreendedorismo"
objetivo: "engajar"
headline: "Quem desiste nunca vai saber o quanto estava perto."
layout: "texto-over-imagem"
mood: "inspiracional"
ai_prompt: "Dramatic mountain summit at sunrise, cinematic golden hour lighting, epic landscape"
formatos: ["1:1", "9:16"]
```

---

_Template Version: 1.0.0_
_Last Updated: 2026-05-10_
