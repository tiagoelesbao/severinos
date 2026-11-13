# -*- coding: utf-8 -*-
"""Gera a PLACA DE AVISO e a SETA — a assinatura do canal `placas-de-aviso`.

O QUE ESTA CAMADA E
  Um losango amarelo com borda vermelha e pictograma preto, montado num poste,
  mais um circulo vermelho fino em volta e uma seta grossa apontando. Ela entra
  POR CIMA do video de fundo, como as cartelas do canal de futebol -- nao e
  fundo, e camada.

POR QUE ELA E O CANAL INTEIRO
  Medido em tres videos do benchmark (`docs/METODO-INSERT-ANIMAL.md`): a placa
  ocupa os primeiros cinco segundos, some, e VOLTA antes do desfecho. Ela e a
  pergunta que o video promete responder. Sem ela nao ha gancho -- o resto do
  video e acervo solto.

O PICTOGRAMA E DESENHADO, NAO GERADO
  Placa de transito e desenho vetorial simples: silhueta preta, sem gradiente,
  sem textura. Pedir isso a um gerador de imagem devolve algo "quase" -- com
  sombra, perspectiva ou dedo a mais -- e o "quase" e o que denuncia. Aqui as
  formas sao primitivas do PIL, entao saem exatas e reprodutiveis.

USO
    python placa_aviso.py --pict nao-alimentar --saida placa.png
    python placa_aviso.py --lista
"""
import argparse
import math
import os
import sys

from PIL import Image, ImageDraw

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# Cores de placa de transito, nao da paleta de um canal: e o que faz o objeto
# ser lido como AVISO antes de qualquer texto.
AMARELO = (252, 200, 20)
VERMELHO = (222, 28, 28)
PRETO = (18, 18, 18)
POSTE = (176, 176, 180)


def _losango(d, cx, cy, r):
    return [(cx, cy - r), (cx + r, cy), (cx, cy + r), (cx - r, cy)]


def _bonequinho(d, cx, cy, e, bracos="cima"):
    """Silhueta humana no estilo de placa. `e` e a altura total."""
    cab = e * 0.17
    d.ellipse((cx - cab, cy - e / 2, cx + cab, cy - e / 2 + 2 * cab), fill=PRETO)
    tronco_topo = cy - e / 2 + 2 * cab
    tronco_base = cy + e * 0.10
    lg = e * 0.10
    d.rounded_rectangle((cx - lg, tronco_topo, cx + lg, tronco_base),
                        radius=lg * 0.6, fill=PRETO)
    # pernas
    for s in (-1, 1):
        d.line([(cx, tronco_base), (cx + s * e * 0.17, cy + e / 2)],
               fill=PRETO, width=int(e * 0.11))
    # bracos
    if bracos == "cima":
        for s in (-1, 1):
            d.line([(cx, tronco_topo + e * 0.06),
                    (cx + s * e * 0.24, cy - e * 0.40)],
                   fill=PRETO, width=int(e * 0.10))
    else:  # estendido, oferecendo algo
        d.line([(cx, tronco_topo + e * 0.08), (cx + e * 0.30, cy - e * 0.06)],
               fill=PRETO, width=int(e * 0.10))


def _bicho(d, cx, cy, e):
    """Quadrupede simplificado — corpo, cabeca, quatro patas, cauda."""
    cw, ch = e * 0.40, e * 0.24
    d.rounded_rectangle((cx - cw, cy - ch / 2, cx + cw * 0.5, cy + ch / 2),
                        radius=ch * 0.4, fill=PRETO)
    d.ellipse((cx + cw * 0.30, cy - ch * 0.95, cx + cw * 1.05, cy - ch * 0.10),
              fill=PRETO)
    d.polygon([(cx + cw * 0.45, cy - ch * 0.90), (cx + cw * 0.42, cy - ch * 1.45),
               (cx + cw * 0.72, cy - ch * 0.95)], fill=PRETO)
    for dx in (-0.75, -0.35, 0.05, 0.35):
        d.line([(cx + cw * dx, cy + ch * 0.4), (cx + cw * dx, cy + e * 0.34)],
               fill=PRETO, width=int(e * 0.07))
    d.line([(cx - cw, cy - ch * 0.2), (cx - cw * 1.5, cy - ch * 1.1)],
           fill=PRETO, width=int(e * 0.06))


def _mao(d, cx, cy, e):
    """Mao aberta, o pictograma de 'nao toque'."""
    pw = e * 0.09
    d.rounded_rectangle((cx - e * 0.20, cy - e * 0.05,
                         cx + e * 0.20, cy + e * 0.34),
                        radius=e * 0.09, fill=PRETO)
    for i, dx in enumerate((-0.155, -0.052, 0.052, 0.155)):
        alt = e * (0.46 if i in (1, 2) else 0.38)
        d.rounded_rectangle((cx + e * dx - pw / 2, cy - alt / 2 - e * 0.06,
                             cx + e * dx + pw / 2, cy + e * 0.06),
                            radius=pw / 2, fill=PRETO)
    d.rounded_rectangle((cx - e * 0.34, cy + e * 0.02,
                         cx - e * 0.16, cy + e * 0.16),
                        radius=pw / 2, fill=PRETO)


# PENDENTE: `pessoa-bracos` sai torto -- os bracos nascem de um ponto alto
# demais no tronco e a massa preta se funde com a cabeca. Os outros tres estao
# limpos. Nao foi usado no piloto de 07/09; corrigir antes de precisar dele.
PICTOGRAMAS = {
    "nao-alimentar": ("pessoa estendendo a mao para um bicho", "alimentar"),
    "nao-toque": ("mão aberta", "mao"),
    "cuidado-bicho": ("quadrupede atravessando", "bicho"),
    "pessoa-bracos": ("pessoa com os braços para cima", "pessoa"),
}


def desenha(pict, largura=1080, riscado=True):
    """Placa em PNG com alpha, no tamanho do quadro do curto."""
    S = 4                                   # supersampling: borda limpa
    W = largura * S
    im = Image.new("RGBA", (W, int(W * 1.35)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    cx = W // 2
    lado = int(W * 0.40)
    cy = int(W * 0.44)

    # poste primeiro: a placa se apoia nele
    pw = int(W * 0.022)
    d.rectangle((cx - pw, cy, cx + pw, im.height), fill=POSTE)

    d.polygon(_losango(d, cx, cy, lado + int(W * 0.020)), fill=VERMELHO)
    d.polygon(_losango(d, cx, cy, lado), fill=AMARELO)

    e = lado * 0.95
    tipo = PICTOGRAMAS.get(pict, PICTOGRAMAS["nao-toque"])[1]
    if tipo == "mao":
        _mao(d, cx, cy, e)
    elif tipo == "bicho":
        _bicho(d, cx, cy, e)
    elif tipo == "pessoa":
        _bonequinho(d, cx, cy, e, "cima")
    else:                                    # alimentar: pessoa + bicho
        _bonequinho(d, cx - e * 0.26, cy, e * 0.82, "lado")
        _bicho(d, cx + e * 0.30, cy + e * 0.10, e * 0.62)

    if riscado:
        r = lado * 0.86
        d.ellipse((cx - r, cy - r, cx + r, cy + r),
                  outline=VERMELHO, width=int(W * 0.020))
        a = math.radians(45)
        d.line([(cx - r * math.cos(a), cy - r * math.sin(a)),
                (cx + r * math.cos(a), cy + r * math.sin(a))],
               fill=VERMELHO, width=int(W * 0.020))

    return im.resize((largura, int(largura * 1.35)), Image.LANCZOS)


def seta(largura=1080, ang=32):
    """Seta vermelha grossa, o elemento que dirige o olho para a placa.

    O ANGULO E ANTI-HORARIO, porque o `Image.rotate` do PIL e anti-horario.
    A seta nasce apontando para a DIREITA; para apontar para cima-e-direita
    (que e onde a placa fica, acima e a direita de onde a seta nasce) o angulo
    tem de ser POSITIVO. Com -32 ela apontava para baixo-direita, para a
    estrada vazia -- foi assim que saiu no piloto, e a leitura fica errada: a
    seta e uma instrucao de para onde olhar, e ela estava mandando olhar o
    lugar sem nada.
    """
    S = 4
    W = largura * S
    im = Image.new("RGBA", (W, int(W * 0.55)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    h = im.height // 2
    corpo = int(W * 0.11)
    d.rounded_rectangle((int(W * 0.06), h - corpo // 2,
                         int(W * 0.66), h + corpo // 2),
                        radius=corpo * 0.3, fill=VERMELHO)
    d.polygon([(W - int(W * 0.04), h),
               (int(W * 0.62), h - int(W * 0.20)),
               (int(W * 0.62), h + int(W * 0.20))], fill=VERMELHO)
    im = im.rotate(ang, expand=True, resample=Image.BICUBIC)
    return im.resize((im.width // S, im.height // S), Image.LANCZOS)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pict", default="nao-alimentar")
    ap.add_argument("--saida", default="placa.png")
    ap.add_argument("--sem-risco", action="store_true")
    ap.add_argument("--lista", action="store_true")
    a = ap.parse_args()
    if a.lista:
        for k, (desc, _) in PICTOGRAMAS.items():
            print("%-16s %s" % (k, desc))
        return 0
    desenha(a.pict, riscado=not a.sem_risco).save(a.saida)
    base = os.path.splitext(a.saida)[0]
    seta().save(base + "-seta.png")
    print("%s · %s-seta.png" % (a.saida, base))
    return 0


if __name__ == "__main__":
    sys.exit(main())
