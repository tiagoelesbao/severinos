# -*- coding: utf-8 -*-
"""Desenha um flare optico como PNG com alpha, para sobrepor no corte.

POR QUE UM PNG E NAO UM FILTRO
  O ffmpeg nao tem flare. Da para chegar perto com `geq`, mas `geq` avalia
  uma expressao POR PIXEL POR QUADRO -- num quadro de 1080x1920 sao dois
  milhoes de avaliacoes trinta vezes por segundo, e o render passa de
  minutos para dezenas de minutos. Desenhado uma vez em numpy e sobreposto
  como imagem, o custo e de um `overlay`.

AS TRES CAMADAS DO DESENHO
  NUCLEO   queda gaussiana a partir do centro. E o ponto de luz.
  HALO     uma segunda gaussiana bem mais larga e fraca -- e o que faz o
           flare ter TAMANHO. Sem ela o nucleo parece um ponto colado.
  ESTRIA   a risca horizontal anamorfica, que e o que o olho reconhece como
           "lente de cinema". Gaussiana estreita em y, larga em x.

  A cor nao e branca: e levemente quente no nucleo e fria nas pontas da
  estria. Flare branco puro parece efeito de software; a lente de verdade
  dispersa, e dispersao e diferenca de cor entre o centro e a borda.

USO
    python flare.py --saida flare.png
    python flare.py --saida f.png --larg 1080 --alt 1920 --y 0.44
"""
import argparse
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DOWN = r"C:\Users\Pichau\Downloads"


def main():
    import numpy as np
    import cv2

    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default="flare.png")
    ap.add_argument("--larg", type=int, default=1080)
    ap.add_argument("--alt", type=int, default=1920)
    ap.add_argument("--y", type=float, default=0.44,
                    help="altura do centro, em fracao do quadro")
    a = ap.parse_args()

    w, h = a.larg, a.alt
    cx, cy = w / 2.0, h * a.y
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    dx, dy = xx - cx, yy - cy

    # ── nucleo ─────────────────────────────────────────────────────────────
    nuc = np.exp(-((dx ** 2 + dy ** 2) / (2 * (w * 0.085) ** 2)))

    # ── halo ───────────────────────────────────────────────────────────────
    halo = 0.30 * np.exp(-((dx ** 2 + dy ** 2) / (2 * (w * 0.42) ** 2)))

    # ── estria anamorfica ──────────────────────────────────────────────────
    # estreita em y (o que a faz risca) e larga em x (o que a faz atravessar)
    est = 0.75 * np.exp(-(dy ** 2) / (2 * (h * 0.006) ** 2)) \
                * np.exp(-(dx ** 2) / (2 * (w * 0.60) ** 2))

    lum = np.clip(nuc + halo + est, 0, 1)

    # ── cor ────────────────────────────────────────────────────────────────
    # o centro puxa para o quente; a estria, nas pontas, para o frio. E a
    # dispersao da lente -- o que separa flare optico de borrao branco.
    quente = np.clip(nuc + halo, 0, 1)
    frio = np.clip(est, 0, 1)
    r = np.clip(lum * 1.00 + quente * 0.10, 0, 1)
    g = np.clip(lum * 0.93 + quente * 0.04 + frio * 0.03, 0, 1)
    b = np.clip(lum * 0.86 + frio * 0.14, 0, 1)

    rgb = (np.dstack([b, g, r]) * 255).astype(np.uint8)   # cv2 usa BGR
    alpha = (lum * 255).astype(np.uint8)

    saida = a.saida if os.path.isabs(a.saida) else os.path.join(DOWN, a.saida)
    cv2.imwrite(saida, np.dstack([rgb, alpha]))

    print("→ %s  (%d x %d)" % (saida, w, h))
    print("   centro em y = %.0f px (%.0f%% do quadro)" % (cy, a.y * 100))
    print("   nucleo sigma %.0f px · halo %.0f px · estria %.0f x %.0f px"
          % (w * 0.085, w * 0.42, w * 0.60, h * 0.006))
    print("   cobertura acima de 50%% de alpha: %.2f%% do quadro"
          % (100.0 * float((alpha > 127).sum()) / (w * h)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
