# -*- coding: utf-8 -*-
"""Transforma o logo em JPG sobre branco num PNG com alpha de verdade.

DOIS PROBLEMAS, E O SEGUNDO E O QUE NINGUEM VE

  1. A CAIXA NAO E O DESENHO. O arquivo tem 800x250, mas a coroa ocupa
     x 4..291 -- o resto e branco. Qualquer `overlay` centrado centra a
     CAIXA, e o desenho acaba 136 px a esquerda do centro num quadro de
     1080. Foi exatamente o que aconteceu na cartela.

  2. NEM TODO BRANCO E FUNDO. A coroa tem estrelas e uma faixa BRANCAS por
     dentro. Um `colorkey` no branco fura essas partes junto com o fundo, e
     sobre preto elas viram buracos pretos.

  A solucao do segundo e topologica, nao de cor: o fundo e o branco que
  ENCOSTA NA BORDA. Preenchimento a partir dos quatro cantos separa o branco
  de fora do branco de dentro -- os dois sao o mesmo pixel, mas so um deles
  esta ligado ao lado de fora.

USO
    python limpa_logo.py --entrada logo.jpg --saida imperio-coroa.png
"""
import argparse
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DOWN = r"C:\Users\Pichau\Downloads"


def main():
    import cv2
    import numpy as np

    ap = argparse.ArgumentParser()
    ap.add_argument("--entrada", required=True)
    ap.add_argument("--saida", default="imperio-coroa.png")
    ap.add_argument("--limiar", type=int, default=238,
                    help="acima disto o pixel conta como branco")
    ap.add_argument("--margem", type=int, default=6,
                    help="px de folga em volta do desenho")
    a = ap.parse_args()

    ent = a.entrada if os.path.isabs(a.entrada) else os.path.join(DOWN, a.entrada)
    im = cv2.imread(ent, cv2.IMREAD_COLOR)
    if im is None:
        raise SystemExit("nao consegui abrir %s" % ent)
    h, w = im.shape[:2]

    # ── quem e branco ──────────────────────────────────────────────────────
    branco = (im.min(axis=2) >= a.limiar).astype(np.uint8)

    # ── qual branco esta LIGADO A BORDA ────────────────────────────────────
    # floodFill precisa de uma mascara 2 px maior que a imagem; ela marca o
    # que foi alcancado. Partir dos quatro cantos cobre o fundo mesmo quando
    # o desenho encosta num dos lados.
    campo = branco.copy() * 255
    mask = np.zeros((h + 2, w + 2), np.uint8)
    for y, x in ((0, 0), (0, w - 1), (h - 1, 0), (h - 1, w - 1)):
        if campo[y, x] == 255:
            cv2.floodFill(campo, mask, (x, y), 128)
    fundo = (campo == 128)

    alpha = np.where(fundo, 0, 255).astype(np.uint8)

    # ── a borda do desenho, para cortar a caixa vazia ──────────────────────
    ys, xs = np.where(alpha > 0)
    if not len(xs):
        raise SystemExit("a imagem inteira virou fundo -- baixe o --limiar")
    x0 = max(0, xs.min() - a.margem)
    x1 = min(w - 1, xs.max() + a.margem)
    y0 = max(0, ys.min() - a.margem)
    y1 = min(h - 1, ys.max() + a.margem)

    # ── suavizar SO a borda externa ────────────────────────────────────────
    # Um alpha binario em cima de preto deixa serrilha visivel a 1080. Um
    # blur leve so no alpha resolve sem sujar a cor.
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)

    rec = im[y0:y1 + 1, x0:x1 + 1]
    rec_a = alpha[y0:y1 + 1, x0:x1 + 1]
    saida = a.saida if os.path.isabs(a.saida) else os.path.join(DOWN, a.saida)
    cv2.imwrite(saida, np.dstack([rec, rec_a]))

    dentro = int(((alpha > 0) & (branco > 0)).sum())
    print("entrada   %d x %d" % (w, h))
    print("desenho   x %d..%d  y %d..%d" % (xs.min(), xs.max(), ys.min(), ys.max()))
    print("recorte   %d x %d  (com %d px de margem)"
          % (x1 - x0 + 1, y1 - y0 + 1, a.margem))
    print("branco preservado por dentro: %d px  (estrelas e faixa da coroa)"
          % dentro)
    print("→ %s" % saida)
    return 0


if __name__ == "__main__":
    sys.exit(main())
