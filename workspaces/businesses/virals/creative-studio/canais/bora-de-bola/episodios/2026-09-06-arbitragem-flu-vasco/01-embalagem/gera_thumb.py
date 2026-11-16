# -*- coding: utf-8 -*-
"""Thumb 2026-09-06 — estilo NOTICIA DE ESPORTE, referencia de MMA do founder.

A REFERENCIA (print enviado em 06/09)
  faixa superior VERMELHA com texto branco gritado
  varios personagens em paineis lado a lado
  SETAS CURVAS amarelas ligando um ao outro
  faixa inferior VERMELHA com a frase de acao

O QUE MUDOU EM RELACAO A MINHA PRIMEIRA VERSAO
  Eu tinha feito faixa PRETA e seta RETA. A referencia usa VERMELHO nas duas
  faixas e curva nas setas -- e e a curva que da o movimento de "foi pra cima".
  O founder disse "a seta pode ser vermelha"; com as faixas vermelhas ela
  sumiria, entao ela fica AMARELA, como na propria referencia dele.

AS DUAS FOTOS
  f12-canobbio.jpg  ge.globo — a peitada do arbitro (uniforme neon)
  f18-hulk.jpg      Jogada10 — o Hulk dando a declaracao

O TESTE QUE DECIDE
  168px. "O que nao se le aos 168px nao existe."
"""
import math
import os

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

AQUI = os.path.dirname(os.path.abspath(__file__))
FOTOS = os.path.join(os.path.dirname(AQUI), "04-takes", "fotos")
FONTE = r"C:\Windows\Fonts\impact.ttf"

W, H = 1280, 720
# PALETA DO CANAL, nao a da referencia. A estrutura veio da thumb de MMA
# (faixa em cima, paineis no meio, seta curva, faixa embaixo); as CORES sao as
# do `thumb-system.yaml` do Bora de Bola. Copiar o vermelho do MMA faria a thumb
# parecer de outro canal -- e a faixa e justamente o que se reconhece de longe.
VERDE = (12, 36, 12)          # fundo_base #0C240C — a cor-mae, 66% do logo
GRAMADO = (36, 108, 12)       # campo #246C0C — fio de separacao
AMARELO = (252, 204, 12)      # realce_primario — carrega UMA coisa: a seta
VERMELHO = (224, 32, 32)      # alerta #E02020 — reservado a cartao/X, detalhe so
BRANCO = (252, 252, 252)
PRETO = (12, 12, 12)

TOPO_H = 132
BASE_H = 0            # sem faixa inferior (direcao do founder, 06/09)


def texto(d, xy, txt, fonte, cor, contorno=6, ancora="mm"):
    x, y = xy
    for dx in range(-contorno, contorno + 1, 2):
        for dy in range(-contorno, contorno + 1, 2):
            if dx * dx + dy * dy <= contorno * contorno:
                d.text((x + dx, y + dy), txt, font=fonte, fill=PRETO, anchor=ancora)
    d.text((x, y), txt, font=fonte, fill=cor, anchor=ancora)


def painel(caminho, caixa, destino, foco=None):
    """Recorta, escala e ISOLA o sujeito do fundo.

    O `foco` e a elipse (em fracao do painel) onde o sujeito esta. Fora dela o
    fundo e desfocado e escurecido. Sem isso, o painel do Hulk fica dominado
    pelos logos de Betano da zona mista -- e `thumb-system.yaml` proibe "cor de
    clube dominando o fundo" e azul, que e justamente o que aquele painel tem.
    """
    im = Image.open(caminho).convert("RGB").crop(caixa)
    lw, lh = destino
    e = max(lw / im.width, lh / im.height)
    im = im.resize((int(im.width * e), int(im.height * e)), Image.LANCZOS)
    ex = (im.width - lw) // 2
    im = im.crop((ex, 0, ex + lw, lh))
    if foco:
        fundo = im.filter(ImageFilter.GaussianBlur(24))
        fundo = Image.blend(fundo, Image.new("RGB", (lw, lh), PRETO), 0.66)
        m = Image.new("L", (lw, lh), 0)
        dm = ImageDraw.Draw(m)
        x0, y0, x1, y1 = foco
        dm.ellipse((lw * x0, lh * y0, lw * x1, lh * y1), fill=255)
        m = m.filter(ImageFilter.GaussianBlur(46))
        im = Image.composite(im, fundo, m)
    return im


def seta_curva(d, p0, p1, curva=-150, larg=26, cor=None):
    """Arco com ponta, desenhado na ordem certa.

    NAO E USADA NESTA THUMB -- o founder pediu para tirar a seta em 06/09. Fica
    aqui porque o defeito que ela resolve volta em qualquer seta futura do canal,
    e redescobri-lo custa uma rodada.

    O DEFEITO DA VERSAO ANTERIOR: eu tracava a curva INTEIRA ate o ponto final e
    so depois punha o triangulo em cima. A haste continuava por baixo da ponta e
    aparecia do outro lado -- a seta parecia quebrada, atravessada pelo proprio
    corpo. A correcao e cortar a haste na BASE do triangulo: calcula-se onde a
    base cai e a linha para ali.
    """
    cor = cor or VERMELHO
    x0, y0 = p0
    x1, y1 = p1
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2 + curva
    pts = []
    for i in range(81):
        t = i / 80.0
        pts.append(((1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1,
                    (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1))

    PONTA = 74                      # comprimento do triangulo
    # anda de tras para frente ate acumular PONTA de comprimento: e ali que a
    # base do triangulo cai, e onde a haste deve terminar.
    acc, corte = 0.0, len(pts) - 1
    for i in range(len(pts) - 1, 0, -1):
        acc += math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1])
        if acc >= PONTA:
            corte = i
            break
    haste = pts[:corte + 1]

    for c, w in ((PRETO, larg + 10), (cor, larg)):
        for i in range(len(haste) - 1):
            d.line([haste[i], haste[i + 1]], fill=c, width=w)
        # circulo em TODOS os pontos. A cada 4 deixava a borda serrilhada --
        # a linha do PIL nao tem juncao arredondada, e o vao entre segmentos
        # aparece como dente aos 1280 px.
        for x, y in haste:
            d.ellipse((x - w / 2, y - w / 2, x + w / 2, y + w / 2), fill=c)

    ax, ay = pts[-1]
    bx, by = pts[corte]
    ang = math.atan2(ay - by, ax - bx)
    for c, off in ((PRETO, 9), (cor, 0)):
        d.polygon([(ax + off * math.cos(ang), ay + off * math.sin(ang)),
                   (ax - (PONTA + off) * math.cos(ang - 0.52),
                    ay - (PONTA + off) * math.sin(ang - 0.52)),
                   (ax - (PONTA + off) * math.cos(ang + 0.52),
                    ay - (PONTA + off) * math.sin(ang + 0.52))], fill=c)


def main():
    im = Image.new("RGB", (W, H), PRETO)
    meio = W // 2
    corpo_y, corpo_h = TOPO_H, H - TOPO_H - BASE_H

    # ESQUERDA: o Hulk (direcao do founder — quem age fica a esquerda, e o olho
    # ocidental le da esquerda para a direita: sujeito primeiro, alvo depois).
    # A caixa e ALTA de proposito. Sem a faixa inferior, a copy passou a ficar
    # sobre a imagem -- e com a caixa curta o zoom subia e o queixo do Hulk caia
    # atras do texto. Incluindo mais altura na origem, o rosto entra inteiro e
    # sobra ar embaixo, que e onde a copy mora.
    hulk = painel(os.path.join(FOTOS, "f18-hulk.jpg"), (330, 0, 1110, 800),
                  (meio, corpo_h), foco=(0.18, 0.00, 0.94, 0.86))
    im.paste(hulk, (0, corpo_y))
    # DIREITA: o arbitro, que e para onde a seta aponta.
    arb = painel(os.path.join(FOTOS, "f12-canobbio.jpg"), (705, 20, 1040, 700),
                 (W - meio, corpo_h), foco=(0.02, 0.00, 0.98, 0.88))
    im.paste(arb, (meio, corpo_y))

    im = ImageEnhance.Color(im).enhance(0.72)
    im = ImageEnhance.Contrast(im).enhance(1.16)

    d = ImageDraw.Draw(im, "RGBA")
    d.rectangle((meio - 3, corpo_y, meio + 3, corpo_y + corpo_h), fill=BRANCO + (235,))

    # faixas vermelhas
    d.rectangle((0, 0, W, TOPO_H), fill=VERDE + (255,))
    d.rectangle((0, TOPO_H - 8, W, TOPO_H), fill=AMARELO + (255,))
    texto(d, (W // 2, TOPO_H // 2 - 4), "SITUAÇÃO COMPLICOU",
          ImageFont.truetype(FONTE, 104), BRANCO, 5)

    # "HULK" em branco, o RESTO em amarelo -- o destaque vai para a acao, que e
    # o que o founder pediu. Com a seta em vermelho, o amarelo fica livre para
    # carregar o texto sem competir (a regra do amarelo diz UMA coisa por thumb;
    # aqui ela e a frase).
    f_base = ImageFont.truetype(FONTE, 68)
    p1, p2 = "HULK ", "FOI PRA CIMA DO ÁRBITRO"
    w1 = d.textlength(p1, font=f_base)
    w2 = d.textlength(p2, font=f_base)
    x0 = (W - (w1 + w2)) / 2
    yb = H - 62
    texto(d, (x0, yb), p1, f_base, BRANCO, 9, "lm")
    texto(d, (x0 + w1, yb), p2, f_base, AMARELO, 9, "lm")

    # seta curva: do Hulk (direita) para o arbitro (esquerda)

    im.save(os.path.join(AQUI, "thumb-final.png"))
    im.resize((168, 94), Image.LANCZOS).save(os.path.join(AQUI, "thumb-168.png"))
    print("thumb-final.png · thumb-168.png")


if __name__ == "__main__":
    main()
