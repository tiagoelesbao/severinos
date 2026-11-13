# Template de Briefing — Vídeo Longo (@sam-kolder-vid)

**Template ID:** `sam-video-brief-tmpl`
**Agente:** @sam-kolder-vid
**Workflow:** `sam-long-form-production.yaml`
**Versão:** 1.0.0

---

```yaml
video_brief:

  # --- IDENTIDADE ---
  slug: ""                    # * (ex: "entrevista-fundador-ep12")
  titulo: ""                  # * Título do vídeo para YouTube
  tema: ""                    # * Tema central
  objetivo: ""                # * "educar" | "entrevistar" | "documentar" | "vender"

  # --- MATERIAL ---
  raw_video_path: ""          # * Path do vídeo bruto
  content_type: ""            # * "interview" | "podcast" | "tutorial" | "webinar" | "lecture"
  duracao_estimada_min: null  # Duração estimada (opcional — FFmpeg detecta automaticamente)

  # --- PLATAFORMA ---
  platform: ""                # * "youtube" | "linkedin" | "podcast-video"
  gerar_highlights: true      # Extrair 3-5 clips para Reels automaticamente?
  n_highlights: 5             # Quantos highlights extrair?

  # --- CAPÍTULOS ---
  chapters_manual:            # Deixar vazio para auto-geração via Whisper+NLP
    - title: ""
      start_s: 0
    # - title: "Introdução"
    #   start_s: 0
    # - title: "Capítulo 1"
    #   start_s: 120

  # --- PARTICIPANTES ---
  host:
    nome: ""                  # Nome para lower third
    titulo: ""                # Cargo/título para lower third
  convidado:
    nome: ""
    titulo: ""

  # --- EDIÇÃO ---
  silence_cut: true
  silence_threshold_pct: 8    # Conservador para entrevistas/podcasts
  adicionar_intro: true       # Adicionar intro com logo animado?
  intro_duration_s: 10
  adicionar_end_screen: true  # Adicionar end screen nos últimos 20s?

  # --- LEGENDAS ---
  whisper_model: "medium"     # "small" | "medium" | "large" para vídeo longo
  language: "pt"
  hardcode_captions: false    # false = entrega .srt para upload no YouTube
                              # true = burna as legendas no vídeo

  # --- COLOR GRADE ---
  lut_preset: "neutral-grade"  # Grade neutro para vídeo longo
  lut_intensity_pct: 80
  base_correction: true

  # --- EXPORT ---
  formatos:
    - "youtube"               # 16:9 principal
    - "linkedin"              # 16:9 para LinkedIn (opcional)
  exportar_thumbnail_frame: true   # Capturar frame para thumbnail?

  # --- YOUTUBE METADATA ---
  youtube:
    descricao: ""
    tags: []
    categoria: ""
    playlist: ""

  # --- CONTEXTO ---
  data_publicacao: ""
  observacoes: ""
```

---

## 📌 Exemplo Preenchido

```yaml
slug: "entrevista-ceo-virals-ep01"
titulo: "Como crescemos 300% em 6 meses | Entrevista com o CEO"
tema: "Crescimento de negócio e estratégia de produto"
content_type: "interview"
platform: "youtube"
gerar_highlights: true
n_highlights: 5
host: {nome: "João Silva", titulo: "Host — Virals Podcast"}
convidado: {nome: "Maria Souza", titulo: "CEO da Empresa X"}
silence_threshold_pct: 8
whisper_model: "medium"
lut_preset: "neutral-grade"
formatos: ["youtube", "linkedin"]
```

---

_Template Version: 1.0.0_
_Last Updated: 2026-05-10_
