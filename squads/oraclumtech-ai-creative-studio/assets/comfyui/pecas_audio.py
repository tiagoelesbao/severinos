# -*- coding: utf-8 -*-
"""Catalogo das pecas de audio do pack. Consumido pelo runner e pelo organizador.

Estrutura: segmento / tipo / intencao.
  01-trilhas     -> musica COM estrutura (ACE-Step, Apache 2.0)
  02-leitos      -> cama atmosferica SEM melodia (Stable Audio Open)
  03-ambiencias  -> som de LUGAR (Stable Audio Open)
  04-sfx         -> pontuacao (Stable Audio Open)
"""

# (id, pasta_relativa, engine, duracao_s, prompt/tags, intencao_em_pt)
PECAS = [
    # ── 01 TRILHAS · musica estruturada (ACE-Step) ───────────────────────────
    ("tr-estoico-solene", "01-trilhas/dark-estoicismo", "ace", 60,
     "cinematic orchestral, solemn, stoic, low strings, sustained cello, distant "
     "french horn, slow tempo 60 bpm, minor key, contemplative, sparse, no drums, "
     "instrumental, film score",
     "Abertura de video estoico. Entra sob a narracao, nunca disputa com ela."),

    ("tr-estoico-tensao", "01-trilhas/dark-estoicismo", "ace", 60,
     "cinematic orchestral build, dark, tense, tremolo strings, low brass swell, "
     "timpani pulse, gradual crescendo, minor key, ominous, instrumental, film score",
     "Meio do video, quando a narracao aperta o argumento. Sobe e nao resolve."),

    ("tr-novela-suspense", "01-trilhas/novela-recap", "ace", 60,
     "dramatic television underscore, suspense, staccato strings, pizzicato pulse, "
     "piano ostinato, medium tempo, minor key, tense but melodic, instrumental",
     "Recap de novela na parte do conflito. Melodica o bastante para prender."),

    ("tr-novela-revelacao", "01-trilhas/novela-recap", "ace", 45,
     "dramatic orchestral reveal, emotional strings swell, piano melody, resolving "
     "chord progression, warm, cinematic, mid tempo, instrumental",
     "O momento em que a novela revela. Resolve harmonicamente — e o alivio."),

    ("tr-hospedagem-tropical", "01-trilhas/imobiliario-hospedagem", "ace", 60,
     "warm organic acoustic, nylon guitar, soft marimba, light hand percussion, "
     "brazilian bossa influence, relaxed, sunny, tropical, uplifting, mid tempo, "
     "instrumental, no vocals",
     "Anuncio de hospedagem tropical brasileira. Corrige o leito antigo, que foi "
     "escrito para 'modern real estate' e soava americano e frio."),

    ("tr-marca-cinematografica", "01-trilhas/institucional-marca", "ace", 60,
     "modern cinematic brand score, hybrid orchestral and electronic, pulsing synth "
     "bass, soft piano motif, building strings, confident, premium, mid tempo, "
     "instrumental",
     "Filme institucional de marca. Premium sem ser generico de banco de trilha."),

    # ── 02 LEITOS · cama atmosferica sem melodia (Stable Audio) ──────────────
    ("le-tensao-baixa", "02-leitos/tensao-suspense", "sao", 45,
     "dark ambient drone bed, low sustained pad, subtle sub bass, faint metallic "
     "shimmer, no melody, no drums, tense, seamless loop, cinematic underscore",
     "Sustenta fala longa sem competir. Deixa a voz mandar."),

    ("le-tensao-alta", "02-leitos/tensao-suspense", "sao", 45,
     "tense ambient bed, dissonant string cluster, pulsing low drone, rising "
     "atmospheric noise, unsettling, no melody, cinematic underscore",
     "Onde a narracao vira ameaca. Ainda sem melodia, mas incomoda."),

    ("le-contemplativo-mistico", "02-leitos/contemplativo", "sao", 45,
     "mystical ambient bed, deep warm pad, soft choral texture, distant bowl "
     "resonance, slow evolving, spacious reverb, no percussion, meditative",
     "O leito que faltava para o estoicismo. Misterio sem drama."),

    ("le-resolucao-calorosa", "02-leitos/esperanca-resolucao", "sao", 45,
     "warm ambient bed, soft major pad, gentle piano resonance, airy strings, "
     "hopeful, calm, slow, spacious, no percussion",
     "Fechamento. Entra quando a narracao chega na conclusao."),

    # ── 03 AMBIENCIAS · som de lugar (Stable Audio) ─────────────────────────
    ("am-quarto-noite-chuva", "03-ambiencias/interior-noturno", "sao", 30,
     "interior room ambience at night, steady rain against a window, distant "
     "thunder, quiet, no music, field recording",
     "Interior noturno. Base de cena intimista."),

    ("am-templo-pedra-eco", "03-ambiencias/interior-noturno", "sao", 30,
     "large empty stone temple interior, long natural reverb, faint wind through "
     "columns, distant echo, no music, field recording",
     "Casa exatamente com a imagem do templo noturno do pack estoico."),

    ("am-noite-grilos-vento", "03-ambiencias/exterior-natureza", "sao", 30,
     "night outdoor ambience, crickets, soft wind through grass, distant owl, "
     "no music, field recording",
     "Exterior noturno. Serve para dark de qualquer nicho."),

    ("am-mar-ondas-suaves", "03-ambiencias/exterior-natureza", "sao", 30,
     "gentle ocean waves on a sandy beach, soft sea breeze, distant seagulls, "
     "calm, no music, field recording",
     "Hospedagem litoranea. Casa com as fotos do Airbnb."),

    ("am-cidade-distante-noite", "03-ambiencias/urbano", "sao", 30,
     "distant city ambience at night from a high window, faint traffic hum, "
     "occasional far siren, quiet, no music, field recording",
     "Urbano sem poluir. Fundo de cena de janela."),

    # ── 04 SFX · pontuacao (Stable Audio) ───────────────────────────────────
    ("fx-whoosh-grave", "04-sfx/transicao", "sao", 6,
     "deep cinematic whoosh transition, low frequency sweep, short, clean, "
     "no music, sound effect",
     "Corte entre blocos. O mais usado do pack."),

    ("fx-riser-tensao", "04-sfx/transicao", "sao", 8,
     "cinematic riser, rising tension sweep building to a peak, orchestral and "
     "synthetic layers, no music bed, sound effect",
     "Antes de uma revelacao. Termina onde o impacto entra."),

    ("fx-impacto-sub-boom", "04-sfx/impacto-revelacao", "sao", 6,
     "deep cinematic impact boom, sub bass hit with short tail, trailer style, "
     "clean, sound effect",
     "O golpe. Cai na palavra que importa."),

    ("fx-sino-revelacao", "04-sfx/impacto-revelacao", "sao", 8,
     "single bright bell chime with long shimmering tail, ethereal, reverb, "
     "revelation accent, sound effect",
     "Revelacao que nao e violenta. Alternativa ao boom."),

    ("fx-tick-contador", "04-sfx/interface-ui", "sao", 5,
     "short mechanical tick click, dry, precise, single hit, ui sound effect",
     "Contagem, lista, item que aparece na tela."),

    ("fx-pop-legenda", "04-sfx/interface-ui", "sao", 5,
     "soft short pop sound, subtle, clean, single hit, ui notification, "
     "sound effect",
     "Entrada de legenda ou selo. Discreto de proposito."),
]
