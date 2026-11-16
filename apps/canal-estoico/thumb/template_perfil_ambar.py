# -*- coding: utf-8 -*-
"""Template de thumb do canal estoico — PERFIL + ÂMBAR.

Aprovado pelo founder em 2026-09-06, a partir da thumb do LB1. Vira template
porque o desenho é reutilizável: o que muda entre episódios é a imagem do pack
e as duas linhas de texto; a estrutura fica.

O DESENHO
    metade esquerda   véu escuro + duas linhas de texto + régua de bronze
    metade direita    o perfil da estátua, com o brilho original preservado

POR QUE ELE FUNCIONA AOS 168 PX (que é o único teste que importa)
  1. DUAS ESCALAS, não duas frases. A linha 1 é ~55% da linha 2. Aos 168 px a
     linha 2 continua legível sozinha, e é ela que carrega a ideia — a linha 1
     vira contexto que o olho pega depois, se pegar.
  2. UMA COR QUENTE SÓ. A imagem é dessaturada de propósito (Color 0.88) para
     que o âmbar do texto seja a única coisa quente do quadro. Duas cores
     quentes competindo viram mancha na miniatura.
  3. O VÉU PARA ANTES DO ROSTO. O gradiente termina em 62% da largura: o texto
     ganha fundo escuro e a face mantém o brilho. Escurecer o quadro inteiro
     mata o que faz alguém clicar.
  4. CONTORNO GROSSO. Aos 168 px é o contorno, não a cor, que separa a letra do
     fundo.

USO
    from template_perfil_ambar import render
    render(imagem="...\\08-perfil-entre-colunas-quentes_00001_.png",
           linha1="ISSO NÃO É", linha2="DESISTIR",
           saida="...\\thumb-final.png")

    python template_perfil_ambar.py IMAGEM "LINHA 1" "LINHA 2" SAIDA

REGRA DO CANAL QUE ESTE TEMPLATE RESPEITA
  A tipografia entra por cima, com fonte real. O canal nunca aceita texto
  desenhado por IA dentro do quadro — é a única anomalia que o espectador
  consegue LER.
"""
import os
import sys

from PIL import Image, ImageDraw, ImageEnhance, ImageFont

W, H = 1280, 720

# Paleta travada do canal — mármore frio + âmbar de recorte
CREME = (242, 237, 228)
AMBAR = (232, 168, 58)
SOMBRA = (6, 10, 12)

FONTE = r"C:\Windows\Fonts\seguibl.ttf"     # Segoe UI Black
TAM_L1, TAM_L2 = 86, 156                    # a razão ~55% é o que faz o 168 px


def _base(caminho):
    im = Image.open(caminho).convert("RGB")
    w, h = im.size
    alvo = w * 9 / 16
    topo = int((h - alvo) / 2)
    im = im.crop((0, topo, w, topo + int(alvo))).resize((W, H), Image.LANCZOS)
    # Contraste para o perfil separar do fundo aos 168 px; saturação para baixo
    # para o âmbar do texto ser a única cor quente saliente.
    im = ImageEnhance.Contrast(im).enhance(1.16)
    return ImageEnhance.Color(im).enhance(0.88)


def _scrim(im):
    """Véu escuro só na metade esquerda, onde o texto mora."""
    veu = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(veu)
    fim = int(W * 0.62)
    for x in range(fim):
        a = 1.0 - (x / float(fim))
        d.line([(x, 0), (x, H)], fill=int(214 * (a ** 1.35)))
    return Image.composite(Image.new("RGB", (W, H), SOMBRA), im, veu)


# Ate onde o texto pode ir sem encostar no sujeito. O perfil da estatua comeca
# por volta de 55% da largura; parar em 50% deixa uma folga que sobrevive a
# troca de imagem do pack.
ZONA_TEXTO = 0.50


def _cabe(d, txt, tam, limite):
    """Maior corpo <= `tam` em que `txt` ainda cabe dentro do limite."""
    while tam > 40:
        f = ImageFont.truetype(FONTE, tam)
        if d.textbbox((0, 0), txt, font=f)[2] <= limite:
            return f
        tam -= 4
    return ImageFont.truetype(FONTE, 40)


def _escreve(im, linha1, linha2):
    d = ImageDraw.Draw(im)
    # AUTO-AJUSTE: a copy muda a cada episodio e uma linha longa invade o rosto.
    # Com "DEPENDE APENAS / DE VOCE" a primeira linha cruzava os olhos; com
    # "DE VOCE" a 156 px a segunda encostava na ponta do nariz. Em vez de acertar
    # o corpo na mao a cada troca de texto, o template reduz sozinho ate caber na
    # zona -- o sujeito nunca fica coberto, seja qual for a frase.
    limite = int(W * ZONA_TEXTO) - 64
    f1 = _cabe(d, linha1, TAM_L1, limite)
    f2 = _cabe(d, linha2, TAM_L2, limite)

    x = 64
    b1 = d.textbbox((0, 0), linha1, font=f1)
    b2 = d.textbbox((0, 0), linha2, font=f2)
    alt = (b1[3] - b1[1]) + 26 + (b2[3] - b2[1])
    y = (H - alt) // 2 - 10

    def com_sombra(pos, txt, font, cor):
        px, py = pos
        for dx in range(-6, 7, 2):
            for dy in range(-6, 7, 2):
                if dx or dy:
                    d.text((px + dx, py + dy), txt, font=font, fill=SOMBRA)
        d.text((px, py), txt, font=font, fill=cor)

    com_sombra((x, y - b1[1]), linha1, f1, CREME)
    y2 = y + (b1[3] - b1[1]) + 26
    com_sombra((x, y2 - b2[1]), linha2, f2, AMBAR)

    # régua de bronze — fecha o bloco e dá base para a linha 2
    ry = y2 + (b2[3] - b2[1]) + 26
    d.rectangle([x, ry, x + (b2[2] - b2[0]), ry + 9], fill=AMBAR)
    return im


def render(imagem, linha1, linha2, saida):
    """Gera a thumb e a versão de 168 px ao lado dela."""
    im = _escreve(_scrim(_base(imagem)), linha1, linha2)
    im.save(saida)
    p168 = os.path.join(os.path.dirname(saida),
                        os.path.basename(saida).replace(".png", "") + "-168.png")
    im.resize((168, 94), Image.LANCZOS).save(p168)
    return saida, p168


def main():
    if len(sys.argv) < 5:
        print(__doc__)
        return 2
    a, b = render(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4])
    print("thumb:", a)
    print("168px:", b, " <- e este e o que decide")
    return 0


if __name__ == "__main__":
    sys.exit(main())
