# -*- coding: utf-8 -*-
"""Folha de contato: N sementes por cena, para o founder escolher qual segue.

O metodo dos cursos e volume + escolha humana. Esta folha e o instrumento dessa
escolha: mesma cena, mesmo prompt, sementes diferentes, lado a lado.

Uso:  python monta_folha_contato.py
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Qual estagio a folha mostra: `cru` (escolha de semente, barato) ou `pro`/`lite`
# (inspecao do acabamento). O fluxo com o founder e sempre cru primeiro.
ESTAGIO = sys.argv[1] if len(sys.argv) > 1 else "cru"
CRU = (r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI"
       r"\output\pack-estoico-yt" + "\\" + ESTAGIO)
DEST = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\squads"
        r"\oraclumtech-ai-creative-studio\assets\pack-estoico-yt")

CENAS = [
    ("y01-filosofo-sentado", "Filosofo sentado",
     "anomalia do v1: uma perna a mais saindo do meio da tunica"),
    ("y02-busto-perfil", "Busto em perfil",
     "anomalia do v1: cunha escura flutuando sob a base"),
    ("y03-maos-pergaminho", "Maos com pergaminho",
     "anomalia do v1: o pergaminho virou um tubo oco que nao e nada"),
    ("y04-templo-noturno", "Templo noturno",
     "anomalia do v1: meia coluna extra, sem base, na borda direita"),
]
SEMENTES = 3
CW, CH = 620, 354          # celula 16:9
PAD, LEFT, TOP = 14, 230, 62


def fonte(t):
    try:
        return ImageFont.truetype("segoeui.ttf", t)
    except OSError:
        return ImageFont.load_default()


F_T, F_M, F_P = fonte(24), fonte(17), fonte(13)


def achar(slug, n):
    for nome in sorted(os.listdir(CRU)):
        if nome.startswith("%s-s%d_" % (slug, n)):
            return os.path.join(CRU, nome)
    return None


def main():
    os.makedirs(DEST, exist_ok=True)
    W = LEFT + SEMENTES * CW + (SEMENTES + 1) * PAD
    H = TOP + len(CENAS) * (CH + 30) + PAD
    f = Image.new("RGB", (W, H), (18, 18, 20))
    d = ImageDraw.Draw(f)
    d.text((PAD, 12), "PACK ESTOICO 16:9 — %s — 3 sementes por cena" % ESTAGIO.upper(),
           font=F_T, fill=(240, 240, 240))
    d.text((PAD, 40),
           ("Escolha UMA por linha. So a escolhida segue para acabamento. 1344x768."
            if ESTAGIO == "cru" else
            "Acabamento PRO concluido: 4032x2304, detailer + upscale 3x."),
           font=F_P, fill=(150, 150, 160))

    faltando = []
    for i, (slug, titulo, anom) in enumerate(CENAS):
        y = TOP + i * (CH + 30)
        d.text((PAD, y + 8), titulo, font=F_M, fill=(240, 240, 240))
        d.text((PAD, y + 34), anom, font=F_P, fill=(210, 140, 110))
        for c in range(SEMENTES):
            px = LEFT + PAD + c * (CW + PAD)
            p = achar(slug, c + 1)
            if not p:
                faltando.append("%s-s%d" % (slug, c + 1))
                d.rectangle([px, y, px + CW, y + CH], outline=(90, 60, 60))
                continue
            f.paste(Image.open(p).convert("RGB").resize((CW, CH), Image.LANCZOS), (px, y))
            d.text((px + 6, y + CH + 6), "semente %d   ->  %s-s%d" % (c + 1, slug, c + 1),
                   font=F_P, fill=(150, 200, 255))

    p = os.path.join(DEST, "folha-de-contato-%s.jpg" % ESTAGIO)
    f.save(p, quality=88)
    print("escrito:", p, f.size)
    if faltando:
        print("  FALTANDO:", ", ".join(faltando))


if __name__ == "__main__":
    main()
