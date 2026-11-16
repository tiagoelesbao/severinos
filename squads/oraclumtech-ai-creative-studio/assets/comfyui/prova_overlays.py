# -*- coding: utf-8 -*-
"""Folha de prova dos overlays: cada efeito COMPOSTO sobre uma imagem real.

POR QUE ISTO EXISTE
  Um overlay visto sozinho nao diz nada — e um retangulo quase preto. O que
  importa e o resultado da MESCLAGEM, e ela depende do modo: `screen` some com
  o preto, `overlay` e `soft-light` precisam de cinza medio, `multiply` escurece.
  Trocar o modo faz o mesmo arquivo ir de "nao aparece nada" a "cobre a imagem".

  Esta folha reproduz, em numpy, exatamente a conta que o navegador faz com
  `mix-blend-mode`. Se aqui ficar bom, no player fica igual.

LIMITE DESTA FOLHA
  As celulas sao reduzidas para 470x264. Efeito cujo detalhe tem 1 px — como
  `linhas-de-tv` — SOME nessa reducao e aparece aqui mais fraco do que sera em
  1080. Nao subir a opacidade com base nesta folha: a medicao esta enviesada
  contra os padroes finos. Para esses, olhar no player em tamanho real.

Uso:  python prova_overlays.py [imagem_de_fundo]
"""
import glob, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
OVER = os.path.normpath(os.path.join(AQUI, "..", "overlays"))
DEST = os.path.normpath(os.path.join(AQUI, "..", "overlays", "PROVA.jpg"))

# (arquivo, blend, opacidade) — espelha `EFEITOS` de src/lib/fxCatalog.ts.
# Manter os dois lados em sincronia e manual de proposito: sao linguagens
# diferentes e um gerador so para isto seria mais peca para manter do que valor.
CATALOGO = [
    ("particulas-lentas", "screen", 0.55),
    ("particulas-densas", "screen", 0.45),
    ("nevoa", "screen", 0.20),
    ("bolhas", "screen", 0.40),
    ("grao-de-pelicula", "overlay", 0.30),
    ("riscos-de-pelicula", "screen", 0.40),
    ("vazamento-quente-esq", "screen", 0.50),
    ("vazamento-frio-dir", "screen", 0.50),
    ("textura-de-papel", "soft-light", 0.35),
    ("vhs", "screen", 0.40),
    ("linhas-de-tv", "overlay", 0.35),
]


def mescla(base, camada, modo):
    """As mesmas contas do CSS `mix-blend-mode`, em 0..1."""
    a, b = base, camada
    if modo == "screen":
        return 1 - (1 - a) * (1 - b)
    if modo == "multiply":
        return a * b
    if modo == "overlay":
        return np.where(a <= 0.5, 2 * a * b, 1 - 2 * (1 - a) * (1 - b))
    if modo == "soft-light":
        # formula do W3C: o ramo escuro nao e simetrico ao claro
        d = np.where(a <= 0.25, ((16 * a - 12) * a + 4) * a, np.sqrt(np.maximum(a, 0)))
        return np.where(b <= 0.5, a - (1 - 2 * b) * a * (1 - a), a + (2 * b - 1) * (d - a))
    return b


def frame_do_meio(mp4, w, h):
    import subprocess
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", "3", "-i", mp4, "-frames:v", "1",
         "-vf", "scale=%d:%d" % (w, h), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True)
    dados = np.frombuffer(r.stdout, np.uint8)
    if dados.size < w * h * 3:
        return None
    return dados[: w * h * 3].reshape(h, w, 3).astype(np.float64) / 255.0


def fonte(t):
    try:
        return ImageFont.truetype("segoeui.ttf", t)
    except OSError:
        return ImageFont.load_default()


def main():
    if len(sys.argv) > 1:
        fundo_arq = sys.argv[1]
    else:
        cand = sorted(glob.glob(os.path.join(
            "C:" + os.sep, "Users", "Pichau", "Desktop", "ComfyUI_windows_portable",
            "ComfyUI", "output", "canal-estoico", "LA1-disciplina", "cru", "03-*.png")))
        if not cand:
            print("sem imagem de fundo — passe uma como argumento")
            return 1
        fundo_arq = cand[0]

    CW, CH, COLS, PAD, TOP = 470, 264, 4, 12, 74
    base = np.asarray(Image.open(fundo_arq).convert("RGB").resize((CW, CH), Image.LANCZOS),
                      dtype=np.float64) / 255.0

    itens = []
    for nome, modo, op in CATALOGO:
        mp4 = os.path.join(OVER, nome + ".mp4")
        if not os.path.isfile(mp4):
            print("  FALTA: %s" % nome)
            continue
        cam = frame_do_meio(mp4, CW, CH)
        if cam is None:
            print("  sem quadro: %s" % nome)
            continue
        # opacidade e interpolacao ENTRE o resultado mesclado e a base — que e o
        # que o navegador faz. Aplicar a opacidade na camada ANTES de mesclar
        # daria outro resultado, mais fraco e errado.
        out = base * (1 - op) + mescla(base, cam, modo) * op
        itens.append((nome, modo, op, np.clip(out, 0, 1)))

    # a base pura entra como primeira celula, para comparacao
    itens.insert(0, ("(sem efeito)", "-", 0.0, base))

    linhas = (len(itens) + COLS - 1) // COLS
    W = COLS * CW + (COLS + 1) * PAD
    H = TOP + linhas * (CH + 40) + PAD
    folha = Image.new("RGB", (W, H), (18, 18, 20))
    d = ImageDraw.Draw(folha)
    d.text((PAD, 12), "PROVA DE MESCLAGEM — overlays sobre imagem real", font=fonte(23), fill=(240, 240, 240))
    d.text((PAD, 44), "A opacidade interpola entre a base e o resultado mesclado, igual ao navegador. "
                      "Fundo: %s" % os.path.basename(fundo_arq), font=fonte(12), fill=(150, 150, 160))

    for i, (nome, modo, op, img) in enumerate(itens):
        col, lin = i % COLS, i // COLS
        px, py = PAD + col * (CW + PAD), TOP + lin * (CH + 40)
        folha.paste(Image.fromarray((img * 255).astype(np.uint8)), (px, py))
        d.text((px + 4, py + CH + 5), nome, font=fonte(14), fill=(150, 200, 255))
        if modo != "-":
            d.text((px + 4, py + CH + 21), "%s · %d%%" % (modo, round(op * 100)),
                   font=fonte(11), fill=(150, 150, 160))

    folha.save(DEST, quality=90)
    print("escrito: %s  (%d overlays)" % (DEST, len(itens) - 1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
