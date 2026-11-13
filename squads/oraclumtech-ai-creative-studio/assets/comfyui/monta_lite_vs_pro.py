# -*- coding: utf-8 -*-
"""Compara as duas rodas de acabamento na MESMA imagem crua.

A comparacao so e honesta em ZOOM 100%: as duas saidas tem tamanhos diferentes
(LITE 2688x1536, PRO 4032x2304), entao reduzi-las para caber lado a lado esconde
justamente o que as separa.

Uso:  python monta_lite_vs_pro.py [slug] [semente]
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

OUT = (r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI"
       r"\output\pack-estoico-yt")
DEST = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\squads"
        r"\oraclumtech-ai-creative-studio\assets\pack-estoico-yt")

SLUG = sys.argv[1] if len(sys.argv) > 1 else "y01-filosofo-sentado"
SEM = sys.argv[2] if len(sys.argv) > 2 else "1"
BASE = "%s-s%s" % (SLUG, SEM)

# A regiao de interesse e ACHADA, nao chutada: fixar coordenadas a mao ja me fez
# recortar fundo preto. Pega-se a caixa do assunto claro contra o fundo escuro e
# recorta-se o TERCO SUPERIOR dela, que e onde mora a cabeca — e onde o detailer atua.
ROI_LADO = 220          # em coordenadas do CRU


def achar_roi(caminho_cru):
    import numpy as np
    a = np.asarray(Image.open(caminho_cru).convert("L"), float)
    limiar = max(a.mean() + 2 * a.std(), 60.0)
    ys, xs = np.where(a > limiar)
    if len(xs) < 50:                       # cena sem assunto claro destacado
        h, w = a.shape
        cx, cy = w // 2, h // 2
    else:
        x1, x2 = int(xs.min()), int(xs.max())
        y1, y2 = int(ys.min()), int(ys.max())
        cx = (x1 + x2) // 2
        cy = y1 + (y2 - y1) // 6           # terco superior: a cabeca
    h, w = a.shape
    m = ROI_LADO // 2
    cx = max(m, min(w - m, cx))
    cy = max(m, min(h - m, cy))
    return (cx - m, cy - m, cx + m, cy + m)


def fonte(t):
    try:
        return ImageFont.truetype("segoeui.ttf", t)
    except OSError:
        return ImageFont.load_default()


F_T, F_M, F_P = fonte(24), fonte(17), fonte(13)


def achar(pasta, sufixo=""):
    d = os.path.join(OUT, pasta)
    if not os.path.isdir(d):
        return None
    for n in sorted(os.listdir(d)):
        if n.startswith(BASE + sufixo) and n.endswith(".png"):
            return os.path.join(d, n)
    return None


def recorte(caminho, escala, lado_saida, roi):
    """Recorta a MESMA regiao do mundo, na escala nativa daquele arquivo."""
    im = Image.open(caminho).convert("RGB")
    x1, y1, x2, y2 = [int(v * escala) for v in roi]
    return im.crop((x1, y1, x2, y2)).resize((lado_saida, lado_saida), Image.LANCZOS)


def main():
    cru = achar("cru")
    lite = achar("lite")
    pro = achar("pro")
    faltando = [n for n, p in (("cru", cru), ("lite", lite), ("pro", pro)) if not p]
    if faltando:
        print("  FALTANDO:", ", ".join(faltando))
        return

    roi = achar_roi(cru)
    print("  ROI no cru: x %d-%d  y %d-%d" % (roi[0], roi[2], roi[1], roi[3]))
    itens = [
        (cru, 1.0, "CRU", "1344x768 · geracao"),
        (lite, 2.0, "LITE — upscale 2x", "2688x1536 · ~175 s"),
        (pro, 3.0, "PRO — detailer + upscale 3x", "4032x2304 · ~360 s"),
    ]
    C, PAD = 560, 16
    W = len(itens) * C + (len(itens) + 1) * PAD
    H = C + 168
    f = Image.new("RGB", (W, H), (18, 18, 20))
    d = ImageDraw.Draw(f)
    d.text((PAD, 14), "AS DUAS RODAS — mesma imagem crua, mesmo pedaco do mundo",
           font=F_T, fill=(240, 240, 240))
    d.text((PAD, 44),
           "Zoom 100%%: cada painel mostra a MESMA regiao no pixel nativo do seu arquivo. "
           "Cena: %s, semente %s." % (SLUG, SEM),
           font=F_P, fill=(150, 150, 160))

    for i, (p, esc, rot, sub) in enumerate(itens):
        px = PAD + i * (C + PAD)
        f.paste(recorte(p, esc, C, roi), (px, 100))
        cor = [(150, 150, 160), (150, 200, 255), (130, 220, 150)][i]
        d.text((px, 72), rot, font=F_M, fill=cor)
        d.text((px, 100 + C + 8), sub, font=F_P, fill=(150, 150, 160))

    d.text((PAD, 100 + C + 30),
           "O CRU aparece ampliado ate o mesmo tamanho de tela — e a linha de base, "
           "nao um entregavel.",
           font=F_P, fill=(120, 120, 130))

    os.makedirs(DEST, exist_ok=True)
    saida = os.path.join(DEST, "lite-vs-pro.jpg")
    f.save(saida, quality=92)
    print("escrito:", saida, f.size)


if __name__ == "__main__":
    main()
