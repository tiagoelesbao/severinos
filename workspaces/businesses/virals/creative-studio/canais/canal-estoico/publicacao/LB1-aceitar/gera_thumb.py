# -*- coding: utf-8 -*-
"""Thumb do LB1 · Aceitar o que ja chegou.

A imagem NAO e gerada aqui — ela vem do pack visual do proprio episodio
(`Materiais Brutos/08-perfil-entre-colunas-quentes`). A tipografia entra por
cima, com fonte real: o canal nunca aceita texto desenhado por IA dentro do
quadro.

Saidas:
  thumb-final.png   1280x720 — o entregavel
  thumb-168.png     168 px de largura — o teste que decide (e como o feed mostra)
"""
import os
from PIL import Image, ImageDraw, ImageFont, ImageEnhance

AQUI = os.path.dirname(os.path.abspath(__file__))
FONTE_IMG = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\outputs"
             r"\canal-estoico\video-plans\LB1-aceitar\Materiais Brutos"
             r"\08-perfil-entre-colunas-quentes_00001_.png")

W, H = 1280, 720

# Paleta travada do canal (marmore frio + ambar de recorte)
CREME = (242, 237, 228)
AMBAR = (232, 168, 58)
SOMBRA = (6, 10, 12)

LINHA_1 = "ISSO NÃO É"
LINHA_2 = "DESISTIR"


def base():
    im = Image.open(FONTE_IMG).convert("RGB")
    w, h = im.size
    alvo = w * 9 / 16                      # 1344 -> 756: corta 6 px em cima e embaixo
    topo = int((h - alvo) / 2)
    im = im.crop((0, topo, w, topo + int(alvo))).resize((W, H), Image.LANCZOS)
    # A referencia do genero e dessaturada e fria. Um empurrao pequeno, medido:
    # contraste para o perfil separar do fundo aos 168 px, saturacao para baixo
    # para o ambar do texto ser a unica cor quente saliente.
    im = ImageEnhance.Contrast(im).enhance(1.16)
    im = ImageEnhance.Color(im).enhance(0.88)
    return im


def scrim(im):
    """Veu escuro so na METADE ESQUERDA — onde o texto mora.

    Sem ele o ambar cai em cima da neblina quente entre as colunas e some.
    O gradiente termina antes do rosto: a face fica com o brilho original."""
    veu = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(veu)
    fim = int(W * 0.62)
    for x in range(fim):
        a = 1.0 - (x / float(fim))
        d.line([(x, 0), (x, H)], fill=int(214 * (a ** 1.35)))
    preto = Image.new("RGB", (W, H), SOMBRA)
    return Image.composite(preto, im, veu)


def escreve(im):
    d = ImageDraw.Draw(im)
    f1 = ImageFont.truetype(r"C:\Windows\Fonts\seguibl.ttf", 86)
    f2 = ImageFont.truetype(r"C:\Windows\Fonts\seguibl.ttf", 156)

    x = 64
    b1 = d.textbbox((0, 0), LINHA_1, font=f1)
    b2 = d.textbbox((0, 0), LINHA_2, font=f2)
    alt = (b1[3] - b1[1]) + 26 + (b2[3] - b2[1])
    y = (H - alt) // 2 - 10

    def com_sombra(pos, txt, font, cor):
        px, py = pos
        # contorno escuro grosso: aos 168 px e ele que garante a separacao
        for dx in range(-6, 7, 2):
            for dy in range(-6, 7, 2):
                if dx or dy:
                    d.text((px + dx, py + dy), txt, font=font, fill=SOMBRA)
        d.text((px, py), txt, font=font, fill=cor)

    com_sombra((x, y - b1[1]), LINHA_1, f1, CREME)
    y2 = y + (b1[3] - b1[1]) + 26
    com_sombra((x, y2 - b2[1]), LINHA_2, f2, AMBAR)

    # regua de bronze — fecha o bloco e da base para a linha 2
    larg = b2[2] - b2[0]
    ry = y2 + (b2[3] - b2[1]) + 26
    d.rectangle([x, ry, x + larg, ry + 9], fill=AMBAR)
    return im


def main():
    im = escreve(scrim(base()))
    fim = os.path.join(AQUI, "thumb-final.png")
    im.save(fim)
    p = os.path.join(AQUI, "thumb-168.png")
    im.resize((168, 94), Image.LANCZOS).save(p)
    print("ok:", fim)


if __name__ == "__main__":
    main()
