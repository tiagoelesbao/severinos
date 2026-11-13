# Template de Briefing — Carrossel (@casey-neistat-img)

**Template ID:** `casey-carousel-brief-tmpl`
**Agente:** @casey-neistat-img
**Workflow:** `casey-carousel-production.yaml`
**Versão:** 1.0.0

---

## Instruções de Uso

Preencha o briefing e o `content_data` slide por slide.
A estrutura narrativa é obrigatória: Hook → Valor → CTA.
Campos com `*` são obrigatórios.

---

## 📋 Briefing do Carrossel

```yaml
carousel_brief:

  # --- IDENTIDADE ---
  slug: ""              # * (ex: "5-erros-empreendedores")
  tema: ""              # * Tema central do carrossel
  objetivo: ""          # * "educar" | "engajar" | "converter" | "anunciar"
  slide_count: 7        # * Total de slides incluindo capa e CTA (3-15)

  # --- NARRATIVA ---
  tipo_narrativa: ""    # "lista-numerada" | "passo-a-passo" | "antes-depois" | "storytelling"
  tom: ""               # "educativo" | "inspiracional" | "urgente" | "humorístico"

  # --- VISUAL ---
  layout_master: ""     # "imagem-com-texto" | "texto-sobre-cor" | "misto"
  mood: ""              # Tom visual geral do carrossel
  cor_destaque: ""      # Hex extra (usa paleta brand se vazio)

  # --- MARCA ---
  brand_config: "squads/virals-marketing-squad/data/clients/virals/brand-config.yaml"  # default; trocar para clients/<slug>/brand-config.yaml conforme cliente

  # --- EXPORT ---
  formato_principal: "1:1"   # "1:1" | "4:5"
  gerar_webp: true

# ─────────────────────────────────────────────────────────────────────────────
# CONTEÚDO POR SLIDE — preencher um bloco por slide
# Estrutura obrigatória:
#   slide_1: HOOK (para o scroll, cria curiosidade)
#   slides_2_a_N-1: VALOR (um conceito por slide)
#   slide_N: CTA (próximo passo claro)
# ─────────────────────────────────────────────────────────────────────────────
content_data:

  - slide_n: 1
    tipo: "hook"
    headline: ""          # * Headline impactante — cria curiosidade
    body_text: ""         # Subtítulo opcional (curto)
    visual: ""            # "imagem" | "cor-de-marca" | "gradiente"
    imagem_path: ""       # Path se visual=imagem (ou vazio para IA)
    ai_prompt: ""         # Prompt IA se não houver imagem

  - slide_n: 2
    tipo: "valor"
    headline: ""          # * Título do conceito deste slide
    body_text: ""         # Explicação (máx. 3 linhas)
    visual: "cor-de-marca"
    icone: ""             # Emoji ou nome de ícone PyCairo (opcional)

  - slide_n: 3
    tipo: "valor"
    headline: ""
    body_text: ""
    visual: "cor-de-marca"

  - slide_n: 4
    tipo: "valor"
    headline: ""
    body_text: ""
    visual: "cor-de-marca"

  - slide_n: 5
    tipo: "valor"
    headline: ""
    body_text: ""
    visual: "cor-de-marca"

  - slide_n: 6
    tipo: "valor"
    headline: ""
    body_text: ""
    visual: "cor-de-marca"

  - slide_n: 7
    tipo: "cta"
    headline: ""          # * CTA claro: "Siga para mais conteúdo" / "Clique no link da bio"
    body_text: ""         # Reforço de valor opcional
    visual: "cor-de-marca"
    cta_action: ""        # "seguir" | "salvar" | "comentar" | "link-bio" | "dm"
```

---

## 📌 Exemplo Preenchido

```yaml
slug: "5-erros-empreendedores"
tema: "5 erros que matam o negócio nos primeiros 6 meses"
objetivo: "educar"
slide_count: 7
tipo_narrativa: "lista-numerada"
tom: "educativo"

content_data:
  - slide_n: 1
    tipo: "hook"
    headline: "5 erros que mataram negócios antes de 6 meses."
    body_text: "Você está cometendo algum deles?"
    visual: "imagem"
    ai_prompt: "Dramatic close-up of a crumbling brick building, dark moody lighting, cinematic"

  - slide_n: 2
    tipo: "valor"
    headline: "Erro #1: Não validar antes de lançar"
    body_text: "Produto sem cliente validado = dinheiro no lixo. Venda antes de construir."
    visual: "cor-de-marca"

  # ... slides 3-6 seguem o mesmo padrão ...

  - slide_n: 7
    tipo: "cta"
    headline: "Salve para não cometer esses erros."
    body_text: "Siga para mais conteúdo de negócios que realmente funciona."
    cta_action: "salvar"
```

---

_Template Version: 1.0.0_
_Last Updated: 2026-05-10_
