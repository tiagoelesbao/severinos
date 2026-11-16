# -*- coding: utf-8 -*-
"""Pacote de fundo da live: imagens de ambiente + cama de torcida.

POR QUE TAKES GERAIS E NAO PERSONALIZADO POR PARTIDA
  A live roda varias vezes por semana. Fazer arte por jogo e trabalho recorrente
  com retorno invisivel — e o overlay JA carrega a identidade da partida
  (escudos, cores dos clubes, nomes, escalacao). O fundo nao precisa repetir
  isso; precisa dar ambiente e sair da frente.

POR QUE IMAGEM E NAO VIDEO
  Um loop de video de estadio custa uma geracao de Wan por take (~20 min, e com
  o historico de estouro de VRAM). Uma imagem sai em 20 s e, com um movimento
  de camera lento aplicado no proprio overlay, entrega o mesmo em tela — porque
  o fundo esta DESFOCADO e sob um veu escuro. Ninguem repara que nao ha
  movimento proprio; repara se o fundo competir com a informacao.

POR QUE GERADO E NAO BAIXADO
  Mesma razao dos overlays de atmosfera do squad: foto de estadio real na web
  tem licenca a conferir, e o risco acaba transferido para quem publica. Gerado
  aqui, o material e nosso.

Uso:  python gera_fundos.py          # so lista o que sera gerado
      python gera_fundos.py --rodar  # enfileira no ComfyUI
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
COMFY = os.path.normpath(os.path.join(
    AQUI, "..", "..", "..", "squads", "oraclumtech-ai-creative-studio", "assets", "comfyui"))

# O fundo vive atras de paineis escuros e translucidos. Duas consequencias que
# guiam todo prompt daqui:
#   1. ele e ESCURO de proposito — fundo claro obriga a escurecer o veu, e ai
#      some de qualquer jeito;
#   2. ele tem pouca estrutura no centro, onde ficam o minicampo e o placar.
ACABAMENTO = ("cinematic wide shot, shallow depth of field, heavy bokeh, "
              "dark moody lighting, deep shadows, slight film grain, "
              "no text, no logos, no readable signage, 16:9")

NEG = ("text, letters, words, numbers, watermark, logo, brand, signage, "
       "scoreboard, jersey crest, faces in focus, deformed anatomy, "
       "extra limbs, bright daylight, washed out, oversaturated, "
       "cartoon, 3d render, low quality, blurry artifacts")

# (n, slug, prompt)
FUNDOS = [
    (1, "estadio-noite-luzes",
     "Empty football stadium at night seen from high in the stands, powerful "
     "floodlight towers glowing against a black sky, the pitch a deep green far "
     "below, thousands of empty seats receding into darkness, cold blue-teal "
     "atmosphere with warm amber highlights from the lights"),

    (2, "torcida-desfocada",
     "A packed football crowd in the stands at night photographed with a long "
     "lens, the whole crowd completely out of focus into soft colourful bokeh, "
     "scattered points of light from phone screens, dark blue and amber tones, "
     "no individual face recognisable"),

    (3, "gramado-contraluz",
     "Close low view across a football pitch at night, blades of grass catching "
     "hard backlight from stadium floodlights, long shadows stretching across "
     "the turf, thin mist hanging just above the ground, the stands a dark "
     "blur far behind"),

    (4, "arquibancada-bandeiras",
     "Football terrace at night filled with large waving flags and banners in "
     "generic colours, seen from below at a low angle, silhouetted supporters "
     "with arms raised, smoke and haze catching the floodlights, everything "
     "slightly out of focus"),

    (5, "tunel-vestiario",
     "The dark players tunnel of a football stadium seen from inside, looking "
     "out toward the bright green pitch at the far end, concrete walls in deep "
     "shadow on both sides, strong contrast between the dark tunnel and the "
     "lit opening"),

    (6, "campo-alto-noite",
     "Aerial wide view of a floodlit football pitch at night from directly "
     "above and slightly to one side, the green rectangle glowing in the middle "
     "of a dark stadium bowl, stands falling away into blackness at the edges"),
]

# ── cama e reacoes de torcida ───────────────────────────────────────────────
# Stable Audio compoe uma PECA com inicio, meio e fim — nao uma cama. Para
# ambiente continuo, gerar longo e recortar o miolo com `faz_loops.py`, que ja
# faz isso no squad. As reacoes sao curtas e usadas como one-shot.
AUDIOS = [
    ("torcida-ambiente", 45,
     "distant football stadium crowd ambience, steady murmur of thousands of "
     "people, occasional distant drums, no music, no speech, continuous"),
    ("torcida-expectativa", 12,
     "football crowd rising murmur of anticipation, growing tension, "
     "no cheering yet, no music"),
    ("torcida-gol", 14,
     "huge football stadium crowd explosion of celebration, roar, cheering, "
     "no music, no announcer"),
    ("torcida-perigo", 10,
     "football crowd sudden gasp and rising ooooh of a near miss, "
     "no music, no speech"),
]


def blocos_de_job():
    """As linhas que vao para `run_batch.py`. Impressas para copiar e colar."""
    linhas = []
    linhas.append("# ── FUNDOS DA LIVE DE FUTEBOL ───────────────────────────────────────────────")
    linhas.append("from live_fundos import FUNDOS as _FUNDOS_LIVE, ACABAMENTO as _ACAB_LIVE, NEG as _NEG_LIVE")
    linhas.append("")
    linhas.append("for _n, _slug, _corpo in _FUNDOS_LIVE:")
    linhas.append("    JOBS.append({")
    linhas.append('        "id": "live-fundo-%02d-%s" % (_n, _slug),')
    linhas.append('        "workflow": "flux2-klein-t2i.json",')
    linhas.append('        "nota": "Fundo da live de futebol — %s" % _slug,')
    linhas.append('        "overrides": {')
    linhas.append('            "4.text": _corpo + ", " + _ACAB_LIVE,')
    linhas.append('            "5.text": _NEG_LIVE,')
    linhas.append('            "6.width": 1920, "6.height": 1088,')
    linhas.append('            "7.width": 1920, "7.height": 1088,')
    linhas.append('            "9.noise_seed": 4200 + _n,')
    linhas.append('            "13.filename_prefix": "live-futebol/fundos/%02d-%s" % (_n, _slug),')
    linhas.append("        },")
    linhas.append("    })")
    return "\n".join(linhas)


def main():
    print("FUNDOS (%d imagens, 1920x1088 — múltiplo de 16 que o modelo aceita):" % len(FUNDOS))
    for n, slug, _ in FUNDOS:
        print("  %02d  %s" % (n, slug))
    print("\nÁUDIO (%d peças):" % len(AUDIOS))
    for nome, dur, _ in AUDIOS:
        print("  %-22s %2ds" % (nome, dur))
    print("\nsaída das imagens: ComfyUI/output/live-futebol/fundos/")
    if "--rodar" not in sys.argv:
        print("\nrode com --rodar para enfileirar")
    return 0


if __name__ == "__main__":
    sys.exit(main())
