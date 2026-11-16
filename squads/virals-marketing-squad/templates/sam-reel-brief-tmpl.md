# Template de Briefing — Reel/TikTok/Short (@sam-kolder-vid)

**Template ID:** `sam-reel-brief-tmpl`
**Agente:** @sam-kolder-vid
**Workflow:** `sam-reel-production.yaml`
**Versão:** 1.0.0

---

## Instruções de Uso

Preencha antes de acionar `*reel-edit`. Campos com `*` são obrigatórios.
O briefing define o pipeline inteiro — quanto mais preciso, menos iteração.

---

## 📋 Briefing do Reel

```yaml
reel_brief:

  # --- IDENTIDADE ---
  slug: ""                  # * Identificador único (ex: "dica-produtividade-maio-01")
  tema: ""                  # * Tema central do vídeo
  objetivo: ""              # * "engajar" | "educar" | "converter" | "entreter"

  # --- MATERIAL ---
  raw_video_path: ""        # * Path do vídeo bruto
  material_type: ""         # * "talking-head" | "b-roll" | "screen-recording" | "misto"

  # --- PLATAFORMA ---
  platform: ""              # * "reels" | "tiktok" | "shorts"
  target_duration_s: 60     # * Duração alvo em segundos (máx. 90)

  # --- HOOK (PRIMEIROS 3 SEGUNDOS) ---
  hook_text: ""             # * Texto de abertura animado (máx. 40 chars)
  hook_visual: ""           # Como o hook aparece visualmente (ex: "zoom in, corte abrupto")
  hook_music: false         # Tem música de fundo? Se sim, fornecer path

  # --- EDIÇÃO ---
  pacing: ""                # "rápido" (cortes < 3s) | "médio" | "lento"
  transitions: ""           # "zoom" | "corte-seco" | "fade" | "whip"
  silence_cut: true         # Aplicar silence cut no material bruto?
  silence_threshold_pct: 4  # Threshold para silence cut (4% padrão para Reels)

  # --- LEGENDAS ---
  captions_enabled: true    # Sempre true para conteúdo social
  whisper_model: "base"     # "tiny" | "base" | "small" | "medium"
  language: "pt"
  caption_style:
    font: "Arial Bold"
    font_size: 48
    color: "#FFFFFF"
    outline: "#000000"
    position: "bottom_third"

  # --- COLOR GRADE ---
  lut_preset: "cinematic-warm"   # Ver sam-lut-library.yaml
  lut_intensity_pct: 85

  # --- EXPORT ---
  formatos:
    - "reels"               # 9:16 principal
    - "feed-square"         # 1:1 versão feed (opcional)
  reframe_mode: "center"    # "center" | "blur-bg" | "smart"

  # --- CONTEXTO ---
  data_publicacao: ""       # ISO8601 ou "ASAP"
  musica_path: ""           # Path para áudio de fundo (opcional)
  observacoes: ""           # Notas adicionais para @sam
```

---

## 📌 Exemplo Preenchido

```yaml
slug: "3-habitos-produtividade"
tema: "3 hábitos de produtividade que mudaram minha vida"
objetivo: "educar"
raw_video_path: "raw/gravacao-habitos-01.mp4"
material_type: "talking-head"
platform: "reels"
target_duration_s: 60
hook_text: "Esses 3 hábitos mudaram tudo."
hook_visual: "zoom-in rápido + flash de corte"
pacing: "rápido"
transitions: "corte-seco"
silence_cut: true
lut_preset: "cinematic-warm"
formatos: ["reels", "feed-square"]
```

---

_Template Version: 1.0.0_
_Last Updated: 2026-05-10_
