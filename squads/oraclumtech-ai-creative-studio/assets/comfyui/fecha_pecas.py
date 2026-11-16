# -*- coding: utf-8 -*-
"""Fecha uma peça: legendas do áudio real + timeline pronta para o editor.

É o último trecho do pipeline, e existe porque ele tem uma ordem que não pode
ser trocada e dois pré-requisitos fáceis de esquecer:

  1. o ComfyUI precisa estar FECHADO — 16 GB não comportam ele e o Whisper;
  2. a legenda tem de sair ANTES da timeline. Sem o `.captions.json`, a ponte
     cai na previsão do SRT escrito, e aí não só a legenda como a JANELA DAS
     IMAGENS fica fora de sincronia com a voz (medido: 76,5 s numa peça de 5 min).

Uso:
  python fecha_pecas.py                          todas as peças longas, voz clone
  python fecha_pecas.py --voz male02             idem, na voz publicável
  python fecha_pecas.py LB1-aceitar LB2-paz...   só essas
  python fecha_pecas.py --so-legenda             pula a timeline
"""
import os, subprocess, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
ROTEIROS = os.path.normpath(os.path.join(AQUI, "..", "..", "data", "roteiros", "estoico"))
NARRACAO = os.path.join("C:" + os.sep, "Users", "Pichau", "Desktop",
                        "ComfyUI_windows_portable", "ComfyUI", "output", "narracao")

LONGAS = ["LA1-disciplina", "LA2-ansiedade", "LA3-tempo",
          "LB1-aceitar", "LB2-paz-interior", "LB3-primeiros-minutos"]

# O destaque da legenda muda por lote: violeta na identidade de mármore (v1),
# carmesim na de bronze (v2). É o único parâmetro visual que a ponte recebe.
DESTAQUE = {"LA": "#7B3FF2", "LB": "#C1121F"}


def roda(cmd, titulo):
    print("  %s" % titulo, flush=True)
    r = subprocess.run(cmd, cwd=AQUI, capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    saida = (r.stdout or "") + (r.stderr or "")
    for l in saida.strip().split("\n")[-4:]:
        if l.strip():
            print("    %s" % l.strip(), flush=True)
    return r.returncode == 0


def main():
    args = sys.argv[1:]
    voz = "clone"
    if "--voz" in args:
        i = args.index("--voz")
        voz = args[i + 1]
        del args[i:i + 2]
    so_legenda = "--so-legenda" in args
    args = [a for a in args if not a.startswith("--")]
    pecas = args or LONGAS

    for p in pecas:
        mp3 = os.path.join(NARRACAO, "%s-%s.mp3" % (p, voz))
        srt = os.path.join(ROTEIROS, "%s.srt" % p)
        if not os.path.isfile(mp3):
            print("%s — SEM NARRACAO (%s)" % (p, os.path.basename(mp3)))
            continue

        print("%s / %s" % (p, voz), flush=True)
        caps = os.path.splitext(mp3)[0] + ".captions.json"
        if os.path.isfile(caps):
            print("  legendas ja existem — pulando a transcricao", flush=True)
        else:
            roda([sys.executable, "legendas_do_audio.py", mp3, srt],
                 "alinhando legendas ao audio (demora ~7 min por 20 min de fala)")

        if not so_legenda:
            roda([sys.executable, "gera_timeline_dark.py", p,
                  "--voz", voz, "--cliente", "canal-estoico",
                  "--destaque", DESTAQUE.get(p[:2].upper(), "#7B3FF2")],
                 "montando a timeline")
        print(flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
