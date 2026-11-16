# -*- coding: utf-8 -*-
"""Folha de inspecao por PECA do canal — uma imagem por marcador do roteiro.

A inspecao aqui e ESTRUTURAL, nao de textura: contar membros, contar elementos
repetidos, e perguntar de cada objeto se ele tem funcao na cena. Textura ruim se
conserta com upscale; anatomia e arquitetura erradas exigem geracao nova.

Uso:  python monta_folha_canal.py [estagio] [catalogo]
        estagio:  cru (default), lite, pro
        catalogo: curtos (default) | lote-a (v1, marmore) | lote-b (v2, bronze)
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont

# rodado pelo python do ComfyUI, que nao tem esta pasta no path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ESTAGIO = sys.argv[1] if len(sys.argv) > 1 else "cru"
CATALOGO = sys.argv[2] if len(sys.argv) > 2 else "curtos"

# Os dois catalogos tem formatos diferentes: o dos curtos amarra peca+marcador
# na mesma tupla; o do lote A separa, porque as 3 pecas DIVIDEM os 11 marcadores
# e so a semente muda. Aqui o segundo e achatado no formato do primeiro.
if CATALOGO == "lote-a":
    from pack_visual_lote_a import MARCADORES, PECAS
    PACK = [(pc, n, slug, corpo) for pc in PECAS for n, slug, corpo in MARCADORES]
elif CATALOGO == "lote-b":
    from pack_visual_lote_b import MARCADORES, PECAS
    PACK = [(pc, n, slug, corpo) for pc in PECAS for n, slug, corpo in MARCADORES]
else:
    from pack_visual_estoico import PACK
OUT = (r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI"
       r"\output\canal-estoico")
DEST = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\squads"
        r"\oraclumtech-ai-creative-studio\assets\canal-estoico")

TITULOS = {
    "LB1-aceitar": "LB1 · Aceitar o que já chegou  (19m31s)",
    "LB2-paz-interior": "LB2 · A paz que ninguém pode tirar  (19m06s)",
    "LB3-primeiros-minutos": "LB3 · Os primeiros minutos do dia  (18m23s)",
    "LA1-disciplina": "LA1 · A disciplina que não depende de vontade  (20m23s)",
    "LA2-ansiedade": "LA2 · Pare de carregar o que não é seu  (20m10s)",
    "LA3-tempo": "LA3 · O tempo que ainda sobra  (19m58s)",
    "A1": "A1 · A ordem que muda tudo",
    "A2": "A2 · O que não depende de você",
    "A3": "A3 · A morte como conselheira",
    "B1": "B1 · Três reflexões para escutar toda manhã",
    "B2": "B2 · Três reflexões para os dias difíceis",
    "B3": "B3 · Três reflexões para antes de dormir",
}

COLS, CW, CH, PAD, TOP = 4, 470, 269, 14, 74


def fonte(t):
    try:
        return ImageFont.truetype("segoeui.ttf", t)
    except OSError:
        return ImageFont.load_default()


F_T, F_M, F_P = fonte(23), fonte(15), fonte(12)


def achar(peca, n, slug):
    d = os.path.join(OUT, peca, ESTAGIO)
    if not os.path.isdir(d):
        return None
    alvo = "%02d-%s" % (n, slug)
    for nome in sorted(os.listdir(d)):
        if nome.startswith(alvo) and nome.endswith(".png"):
            return os.path.join(d, nome)
    return None


def main():
    os.makedirs(DEST, exist_ok=True)
    por_peca = {}
    for p, n, slug, corpo in PACK:
        por_peca.setdefault(p, []).append((n, slug, corpo))

    for peca in sorted(por_peca):
        itens = sorted(por_peca[peca])
        linhas = (len(itens) + COLS - 1) // COLS
        W = COLS * CW + (COLS + 1) * PAD
        H = TOP + linhas * (CH + 42) + PAD
        f = Image.new("RGB", (W, H), (18, 18, 20))
        d = ImageDraw.Draw(f)
        d.text((PAD, 12), "%s  —  %s" % (TITULOS.get(peca, peca), ESTAGIO.upper()),
               font=F_T, fill=(240, 240, 240))
        d.text((PAD, 42),
               "Inspecao ESTRUTURAL: contar membros, contar elementos repetidos, e "
               "perguntar de cada objeto se ele tem funcao na cena. Textura vem depois.",
               font=F_P, fill=(150, 150, 160))

        faltando = []
        for i, (n, slug, _corpo) in enumerate(itens):
            col, lin = i % COLS, i // COLS
            px = PAD + col * (CW + PAD)
            py = TOP + lin * (CH + 42)
            p = achar(peca, n, slug)
            if not p:
                faltando.append("%02d-%s" % (n, slug))
                d.rectangle([px, py, px + CW, py + CH], outline=(90, 60, 60))
            else:
                f.paste(Image.open(p).convert("RGB").resize((CW, CH), Image.LANCZOS),
                        (px, py))
            d.text((px + 4, py + CH + 6), "img %02d" % n, font=F_M,
                   fill=(150, 200, 255))
            d.text((px + 66, py + CH + 8), slug.replace("-", " "), font=F_P,
                   fill=(150, 150, 160))

        saida = os.path.join(DEST, "%s-%s.jpg" % (peca, ESTAGIO))
        f.save(saida, quality=88)
        print("escrito: %s  (%d imagens%s)" %
              (os.path.basename(saida), len(itens) - len(faltando),
               ", %d faltando" % len(faltando) if faltando else ""))


if __name__ == "__main__":
    main()
