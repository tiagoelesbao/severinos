# -*- coding: utf-8 -*-
"""Thumb 2026-09-07 — a briga pelo penalti no Cruzeiro.

O DESENHO, EXATAMENTE COMO O FOUNDER PEDIU EM 07/09

  faixa superior   VERDE com filete amarelo, texto branco: BRIGA PELO PÊNALTI
  corpo            dois paineis, divisao EXATAMENTE no centro (640 de 1280)
  legenda          uma frase embaixo de CADA jogador, as duas em AMARELO cheio

AS TRES CORRECOES QUE ELE APONTOU NO CORTE ANTERIOR

  1. CABECA CORTADA. O enquadramento anterior comia o topo da cabeca do Kaio
     Jorge. Agora o recorte de cada painel e calculado a partir do TOPO DA
     CABECA medido na foto, com folga declarada em `FOLGA_TOPO`.

  2. DIVISAO FORA DO CENTRO. A versao anterior punha o fio em 39,2%% da largura,
     seguindo o vao que a foto deixa entre os dois. Ficou estranho, e ele esta
     certo: numa thumb de confronto o olho espera simetria, e assimetria sem
     motivo le como erro de montagem. Agora o fio esta em 640, o centro exato,
     e sao os RECORTES que se ajustam a ele.

  3. AS FRASES. Sao as que ele escreveu, na grafia que ele escreveu -- incluindo
     o numeral 4 no lugar do A.

O RECORTE, E POR QUE ELE E CALCULADO E NAO CHUTADO
  Cada painel tem 640x588 (proporcao 1,088). O recorte sai da foto NA MESMA
  PROPORCAO, centrado no jogador e comecando acima da cabeca dele. Assim nao ha
  corte-surpresa: o que se recorta e exatamente o que aparece.

O TESTE QUE DECIDE
  168px. O que nao se le aos 168px nao existe.

RESSALVA DE DIREITO
  `f01-kaio-matheus.jpg` e foto de materia (Gustavo Aleixo / Cruzeiro, via
  Jogada10) -- rota 4 do `fontes_imagem.py`, a unica com ressalva. O retrato da
  ESPN nao existe para nenhum dos dois. Decisao de uso e do founder.

USO
    python gera_thumb.py              # gera as tres opcoes de fonte
    python gera_thumb.py --fonte F2   # so uma
"""
import argparse
import os
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
FOTOS = os.path.join(os.path.dirname(AQUI), "04-takes", "fotos")

W, H = 1280, 720
TOPO_H = 132
CORPO_H = H - TOPO_H
MEIO = W // 2                 # 640 — a divisao fica AQUI, e nada a desloca

# Paleta do canal (`thumb-system.yaml`).
VERDE = (12, 36, 12)
AMARELO = (252, 204, 12)
BRANCO = (252, 252, 252)
PRETO = (12, 12, 12)

FAIXA_TOPO = "BRIGA PELO PÊNALTI"

# As frases, na grafia pedida pelo founder.
LEG_ESQ = "VOCÊ NÃO FEZ O GOL"
LEG_DIR = "MOSTROU O DEDO DO MEIO E MANDOU A MERD4"

# Fontes para a LEGENDA. A faixa do topo fica sempre em Impact, que e a
# assinatura do canal; a legenda ganha alternativa porque o founder pediu para
# ver com outra tipografia.
FONTE_FAIXA = r"C:\Windows\Fonts\impact.ttf"
FONTES = {
    "F1": ("Impact", r"C:\Windows\Fonts\impact.ttf"),
    "F2": ("Arial Black", r"C:\Windows\Fonts\ariblk.ttf"),
    "F3": ("Segoe UI Black", r"C:\Windows\Fonts\seguibl.ttf"),
}

# ── ONDE CADA UM ESTA NA FOTO (1280x840), medido, nao estimado ──────────────
# `centro_x` e o eixo do corpo; `topo_cabeca` e onde comeca o cabelo. O recorte
# nasce desses dois numeros -- e por isso a cabeca nao volta a ser cortada.
SUJEITOS = {
    "esq": {"centro_x": 275, "topo_cabeca": 55},    # Kaio Jorge
    "dir": {"centro_x": 730, "topo_cabeca": 110},   # Matheus Pereira
}
FOLGA_TOPO = 30      # px acima do cabelo, na escala da foto original


def painel(im, s):
    """Recorte de um jogador, ja na proporcao exata do painel.

    Recortar na proporcao final e o que elimina o corte-surpresa: sem isso o
    `cover` decide sozinho o que sai do quadro, e foi assim que a cabeca do
    Kaio Jorge desapareceu no corte anterior.
    """
    prop = MEIO / float(CORPO_H)
    y0 = max(s["topo_cabeca"] - FOLGA_TOPO, 0)
    alt = 480                                   # peito para cima
    larg = int(alt * prop)
    x0 = int(s["centro_x"] - larg / 2)
    # nao deixa sair da foto
    x0 = max(0, min(x0, im.width - larg))
    y1 = min(y0 + alt, im.height)
    return im.crop((x0, y0, x0 + larg, y1)).resize((MEIO, CORPO_H), Image.LANCZOS)


def texto(d, xy, txt, fonte, cor, contorno=8, ancora="mm"):
    x, y = xy
    for dx in range(-contorno, contorno + 1, 2):
        for dy in range(-contorno, contorno + 1, 2):
            if dx * dx + dy * dy <= contorno * contorno:
                d.text((x + dx, y + dy), txt, font=fonte, fill=PRETO, anchor=ancora)
    d.text((x, y), txt, font=fonte, fill=cor, anchor=ancora)


def quebra(d, txt, caminho, util, corpo_max=68, corpo_min=34, linhas_max=2):
    """Maior corpo em que a frase cabe na metade do quadro.

    A frase da direita tem 38 caracteres e a da esquerda 18. Fixar um corpo
    faria a longa estourar ou a curta ficar minuscula; medindo, as duas ocupam
    a largura util que existe.
    """
    for corpo in range(corpo_max, corpo_min - 1, -2):
        f = ImageFont.truetype(caminho, corpo)
        linhas, atual = [], []
        for p in txt.split():
            teste = atual + [p]
            if atual and d.textlength(" ".join(teste), font=f) > util:
                linhas.append(" ".join(atual))
                atual = [p]
            else:
                atual = teste
        if atual:
            linhas.append(" ".join(atual))
        if len(linhas) <= linhas_max and all(
                d.textlength(l, font=f) <= util for l in linhas):
            return f, linhas, corpo
    f = ImageFont.truetype(caminho, corpo_min)
    return f, [txt], corpo_min


def monta(tag_fonte):
    nome_fonte, caminho_fonte = FONTES[tag_fonte]
    src = Image.open(os.path.join(FOTOS, "f01-kaio-matheus.jpg")).convert("RGB")

    im = Image.new("RGB", (W, H), PRETO)
    im.paste(painel(src, SUJEITOS["esq"]), (0, TOPO_H))
    im.paste(painel(src, SUJEITOS["dir"]), (MEIO, TOPO_H))

    # Dessatura: a camisa do Cruzeiro e azul, e o sistema do canal proibe azul
    # e cor de clube dominando o fundo. A thumb e do canal, nao do time.
    im = ImageEnhance.Color(im).enhance(0.34)
    im = ImageEnhance.Contrast(im).enhance(1.22)

    # Veu embaixo, onde as legendas moram. Sem ele o amarelo some no branco do
    # calcao e no fundo claro da arquibancada.
    veu = Image.new("L", (W, H), 0)
    dv = ImageDraw.Draw(veu)
    ALT_VEU = 290
    for i in range(ALT_VEU):
        dv.rectangle((0, H - ALT_VEU + i, W, H - ALT_VEU + i + 1),
                     fill=int(215 * (i / float(ALT_VEU)) ** 1.4))
    im = Image.composite(Image.new("RGB", (W, H), PRETO), im,
                         veu.filter(ImageFilter.GaussianBlur(10)))

    d = ImageDraw.Draw(im, "RGBA")

    # O FIO, no centro exato.
    d.rectangle((MEIO - 4, TOPO_H, MEIO + 4, H), fill=BRANCO + (230,))

    # faixa superior — a assinatura do canal, inalterada
    d.rectangle((0, 0, W, TOPO_H), fill=VERDE + (255,))
    d.rectangle((0, TOPO_H - 8, W, TOPO_H), fill=AMARELO + (255,))
    texto(d, (W // 2, TOPO_H // 2 - 4), FAIXA_TOPO,
          ImageFont.truetype(FONTE_FAIXA, 104), BRANCO, 5)

    # ── as duas legendas, em amarelo cheio ──────────────────────────────────
    util = MEIO - 56
    fe, le, ce = quebra(d, LEG_ESQ, caminho_fonte, util)
    fd, ld, cd = quebra(d, LEG_DIR, caminho_fonte, util)
    # MESMO CORPO NOS DOIS LADOS: com corpos diferentes, o lado maior parece
    # mais importante, e aqui os dois pesam igual.
    corpo = min(ce, cd)
    fe, le, _ = quebra(d, LEG_ESQ, caminho_fonte, util, corpo, corpo)
    fd, ld, _ = quebra(d, LEG_DIR, caminho_fonte, util, corpo, corpo)

    # MESMO NUMERO DE LINHAS, TAMBEM. A frase da esquerda tem 18 caracteres e a
    # da direita 39: sozinhas, uma fecha em 1 linha e a outra em 2, e o bloco
    # mais alto puxa o olho para um lado so. Quebrar a curta no meio devolve a
    # simetria que uma thumb de confronto pede.
    if len(le) < len(ld):
        pal = LEG_ESQ.split()
        meio_pal = (len(pal) + 1) // 2
        le = [" ".join(pal[:meio_pal]), " ".join(pal[meio_pal:])]

    passo = int(corpo * 1.12)
    base = H - 34
    for lado, linhas, f in ((0, le, fe), (MEIO, ld, fd)):
        y = base - (len(linhas) - 1) * passo
        for l in linhas:
            texto(d, (lado + MEIO // 2, y), l, f, AMARELO, 8)
            y += passo

    saida = os.path.join(AQUI, "thumb-%s.png" % tag_fonte)
    im.save(saida)
    im.resize((168, 94), Image.LANCZOS).save(
        os.path.join(AQUI, "thumb-%s-168.png" % tag_fonte))
    print("  %-3s %-16s corpo %d · %d + %d linhas"
          % (tag_fonte, nome_fonte, corpo, len(le), len(ld)))
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fonte", choices=list(FONTES))
    a = ap.parse_args()
    alvo = [a.fonte] if a.fonte else list(FONTES)
    print("%-3s %-16s" % ("", "FONTE DA LEGENDA"))
    for t in alvo:
        monta(t)
    # A escolhida vira `thumb-final.png`, que e o nome que a publicacao usa.
    import shutil
    shutil.copy(os.path.join(AQUI, "thumb-%s.png" % alvo[0]),
                os.path.join(AQUI, "thumb-final.png"))
    shutil.copy(os.path.join(AQUI, "thumb-%s-168.png" % alvo[0]),
                os.path.join(AQUI, "thumb-168.png"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
