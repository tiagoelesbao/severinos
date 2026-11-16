# -*- coding: utf-8 -*-
"""Prepara os dois assets de referencia que o CCC precisa para carregar a marca.

POR QUE DOIS, E NAO UM
  O CCC aceita ate quatro imagens de referencia por grupo de geracao. A aula usa
  isso para um detalhe que o modelo erra sozinho -- na dela, um colar. Aqui e o
  logo. Sao dois papeis diferentes:

    imperio-logo.png   o logo LIMPO, chapado, fundo branco. Entra como TERCEIRA
                       referencia. E dele que o modelo copia forma, proporcao e
                       cor -- e por isso ele nao pode ter nada em volta.

    bruno-ref.png      a foto do personagem JA com o logo no peito. E a primeira
                       referencia (`pixels`), a que diz "esta pessoa usa isto".
                       Sem ela, o modelo recebe um logo solto e nao sabe onde
                       nem em que tamanho ele mora.

POR QUE MULTIPLICAR EM VEZ DE COLAR
  Logo colado chapado vira adesivo: fica reto num tecido que tem prega e sombra,
  e o modelo de edicao aprende o adesivo. Multiplicando o logo pela luminancia
  do tecido embaixo, a prega atravessa a arte -- que e o que acontece numa
  estampa de verdade.

ONDE O LOGO VAI
  Nao e chute nem olhometro: a posicao sai da caixa do ROSTO detectada por YOLO.
  Numa pose frontal de pe, o centro do rosto e o centro do torso, e a estampa de
  peito comeca por volta de 0,64 altura-de-rosto abaixo do queixo. Assim o
  script funciona em qualquer foto nova do personagem, nao so nesta.

  O 0,64 nao e gosto: e a medida da estampa na foto ORIGINAL do Bruno, a da
  jaqueta. La a arte vai de 0,64 a 1,21 altura-de-rosto abaixo do queixo -- ou
  seja, torax e nada mais. E por isso que o padrao aqui e esse: a camiseta de
  verdade da marca e assim.

USO
    python prepara_ref_logo.py
    python prepara_ref_logo.py --largura 0.62 --desce 1.25   # ajuste fino
"""
import argparse
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from PIL import Image
import numpy as np

LOGO = r"C:\Users\Pichau\Downloads\imperio_transparent.png"
PESSOA = r"C:\Users\Pichau\Desktop\Brun0_R1fa.jpg"
ENTRADA = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\input"
YOLO = r"D:\ComfyUI_Models\ultralytics\bbox\face_yolov8m.pt"


def corta_alpha(im, folga=0.02):
    """Tira a margem transparente. Sobra que o modelo nao precisa ver."""
    a = np.asarray(im.split()[-1])
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return im
    x1, x2, y1, y2 = xs.min(), xs.max(), ys.min(), ys.max()
    fx = int((x2 - x1) * folga)
    fy = int((y2 - y1) * folga)
    return im.crop((max(0, x1 - fx), max(0, y1 - fy),
                    min(im.width, x2 + fx + 1), min(im.height, y2 + fy + 1)))


def versao_camiseta(logo, escuro=(20, 20, 22)):
    """Escurece o wordmark, que no arquivo oficial e BRANCO.

    O logo veio para fundo magenta: coroa dourada e "IMPERIO PREMIOS" em branco.
    Aplicado numa camiseta branca, o texto simplesmente desaparece -- e o modelo
    aprenderia uma camiseta com coroa e mais nada. A camiseta real da marca (da
    primeira foto que o founder mandou) tem o wordmark ESCURO. Entao isto nao e
    invencao de cor: e a aplicacao que ja existe.

    O corte e geometrico, nao por cor: as estrelinhas brancas DENTRO da coroa
    tambem sao brancas e devem continuar brancas. Tudo que esta abaixo do
    ultimo pixel dourado e wordmark; acima, e coroa.
    """
    a = np.asarray(logo.convert("RGBA"), dtype=np.int16)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    dourado = (al > 128) & (r > 120) & (r - b > 45) & (g > 80)
    linhas = np.where(dourado.any(axis=1))[0]
    if len(linhas) == 0:
        return logo
    corte = int(linhas.max())
    branco = (al > 128) & (r > 190) & (g > 190) & (b > 190)
    branco[:corte + 1, :] = False
    a[..., 0] = np.where(branco, escuro[0], r)
    a[..., 1] = np.where(branco, escuro[1], g)
    a[..., 2] = np.where(branco, escuro[2], b)
    print("   wordmark escurecido abaixo da linha %d (%d px)"
          % (corte, int(branco.sum())))
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def sobre_branco(im):
    fundo = Image.new("RGB", im.size, (255, 255, 255))
    fundo.paste(im, (0, 0), im)
    return fundo


def caixa_do_rosto(caminho):
    from ultralytics import YOLO as _Y
    im = Image.open(caminho)
    r = _Y(YOLO)(im, conf=0.4, verbose=False)[0]
    cx = r.boxes.xyxy.cpu().numpy()
    if len(cx) == 0:
        raise SystemExit("nenhum rosto encontrado em %s" % caminho)
    # o maior, caso haja mais de um
    b = sorted(cx, key=lambda x: (x[2] - x[0]) * (x[3] - x[1]))[-1]
    return [float(v) for v in b]


def estampa(pessoa, logo, caixa, largura_rel, desce):
    """Aplica o logo no peito, multiplicando pela luz do tecido."""
    x1, y1, x2, y2 = caixa
    lr, ar = x2 - x1, y2 - y1
    cx = (x1 + x2) / 2.0                       # centro do torso
    topo = y2 + ar * desce                     # abaixo do queixo
    larg = int(lr * largura_rel)
    alt = int(larg * logo.height / float(logo.width))
    lg = logo.resize((larg, alt), Image.LANCZOS)

    px = int(cx - larg / 2.0)
    py = int(topo)
    if py + alt > pessoa.height:
        raise SystemExit("a estampa nao cabe -- reduza --largura ou --desce")

    base = pessoa.convert("RGB")
    regiao = np.asarray(base.crop((px, py, px + larg, py + alt)),
                        dtype=np.float32) / 255.0
    arte = np.asarray(lg.convert("RGB"), dtype=np.float32) / 255.0
    alfa = np.asarray(lg.split()[-1], dtype=np.float32)[..., None] / 255.0

    # luminancia do tecido, normalizada em torno da propria media: >1 onde o
    # tecido pega luz, <1 na prega. E isso que faz a arte deixar de ser adesivo.
    lum = regiao @ np.array([0.299, 0.587, 0.114], dtype=np.float32)
    sombra = np.clip(lum / max(float(lum.mean()), 1e-3), 0.72, 1.12)[..., None]

    misto = np.clip(arte * sombra, 0, 1) * alfa + regiao * (1 - alfa)
    base.paste(Image.fromarray((misto * 255).astype(np.uint8)), (px, py))
    return base, (px, py, larg, alt)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--largura", type=float, default=1.20,
                    help="largura da estampa em LARGURAS-DE-ROSTO (padrao 1.20)")
    ap.add_argument("--desce", type=float, default=0.64,
                    help="quanto abaixo do queixo a estampa comeca, em "
                         "alturas-de-rosto (padrao 0.64)")
    ap.add_argument("--logo", default=LOGO)
    ap.add_argument("--pessoa", default=PESSOA)
    ap.add_argument("--wordmark-branco", action="store_true",
                    help="mantem o texto branco do arquivo oficial (so serve "
                         "para aplicacao em fundo escuro)")
    a = ap.parse_args()

    os.makedirs(ENTRADA, exist_ok=True)

    # 1 · o logo limpo, para ser a terceira referencia
    lg = Image.open(a.logo).convert("RGBA")
    lg = corta_alpha(lg)
    print("logo recortado: %dx%d" % lg.size)
    if not a.wordmark_branco:
        lg = versao_camiseta(lg)
    d_logo = os.path.join(ENTRADA, "imperio-logo.png")
    sobre_branco(lg).save(d_logo)
    print("→ %s" % d_logo)

    # 2 · a pessoa com a estampa
    pessoa = Image.open(a.pessoa).convert("RGB")
    caixa = caixa_do_rosto(a.pessoa)
    x1, y1, x2, y2 = caixa
    print("rosto: %dx%d px em (%d,%d)" % (x2 - x1, y2 - y1, x1, y1))
    fora, cx = estampa(pessoa, lg, caixa, a.largura, a.desce)
    d_ref = os.path.join(ENTRADA, "bruno-ref.png")
    fora.save(d_ref)
    print("estampa: %dx%d px em (%d,%d)" % (cx[2], cx[3], cx[0], cx[1]))
    print("→ %s" % d_ref)

    # 3 · um recorte para conferir sem abrir o ComfyUI
    tmp = os.environ.get("TEMP", ".")
    m = int(cx[2] * 0.45)
    conf = fora.crop((max(0, cx[0] - m), max(0, cx[1] - m),
                      min(fora.width, cx[0] + cx[2] + m),
                      min(fora.height, cx[1] + cx[3] + m)))
    p = os.path.join(tmp, "confere_estampa.png")
    conf.resize((conf.width * 2, conf.height * 2), Image.LANCZOS).save(p)
    print("→ %s (conferencia)" % p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
