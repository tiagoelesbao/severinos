# -*- coding: utf-8 -*-
"""As camadas que o benchmark tem e o nosso motor nao tinha.

O QUE SAO
  Emoji reativo, botao de LIKE/INSCREVER/COMPARTILHAR e a placa de aviso. Sao
  PNGs com alpha que entram POR CIMA do video, em segundos declarados no
  `curto.yaml` -- do mesmo jeito que as cartelas do canal de futebol.

POR QUE ELAS EXISTEM
  Medido em `docs/METODO-INSERT-ANIMAL.md`: nos videos modelados o emoji entra
  no exato instante da reacao ("Bro, o que essa placa quer dizer?" -> emoji de
  espanto) e o botao aparece na frase que pede a inscricao. Nao e enfeite -- e
  o que faz a locucao ter interlocutor. O piloto de 07/09 saiu sem nada disso e
  o founder resumiu certo: "nao esta nada parecido, nao tem os efeitos".

POR QUE PNG, E NAO `drawtext`
  Emoji do Segoe e fonte COLR/CPAL. O `drawtext` do ffmpeg desenha a camada de
  contorno e joga a cor fora -- sai um glifo preto chapado. O PIL le a tabela
  de cor (`embedded_color=True`), entao o PNG ja vem colorido e o ffmpeg so
  precisa compor.
"""
import os

from PIL import Image, ImageDraw, ImageFont

EMOJI = r"C:\Windows\Fonts\seguiemj.ttf"
IMPACT = r"C:\Windows\Fonts\impact.ttf"
ARIALBD = r"C:\Windows\Fonts\arialbd.ttf"

VERMELHO = (238, 40, 40)
BRANCO = (255, 255, 255)
PRETO = (16, 16, 16)

# ── A PALETA E OS GESTOS DO TIKTOK ──────────────────────────────────────────
#
# Os dois canais novos vao SO para o TikTok ate liberar o Shop. CTA de YouTube
# ali e ruido duplo: pede um gesto que nao existe na tela (nao ha "inscrever",
# ha "seguir") e usa uma marca que o espectador reconhece como de outro app.
#
# Os gestos do TikTok e os icones que os representam:
#   seguir      -> avatar com o "+" vermelho embaixo
#   curtir      -> coracao
#   comentar    -> balao
#   salvar      -> marcador de pagina
#   compartilhar-> seta
TK_ROSA = (254, 44, 85)          # #FE2C55, o vermelho da marca
TK_CIANO = (37, 244, 238)        # #25F4EE
TK_ESCURO = (18, 18, 22)

GESTOS = {
    "seguir": ("SEGUE", "avatar", TK_ROSA),
    "curtir": ("CURTE", "coracao", TK_ROSA),
    "comentar": ("COMENTA", "balao", TK_ESCURO),
    "salvar": ("SALVA", "marcador", TK_ESCURO),
    "compartilhar": ("COMPARTILHA", "seta", TK_ESCURO),
}


def emoji(glifo, px=200):
    """Um ou mais emoji lado a lado, em PNG com alpha."""
    f = ImageFont.truetype(EMOJI, px)
    # margem generosa: o glifo colorido costuma transbordar a caixa metrica
    im = Image.new("RGBA", (int(px * 1.25 * len(glifo)) + px // 2,
                            int(px * 1.6)), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    x = px // 4
    for g in glifo:
        d.text((x, px // 5), g, font=f, embedded_color=True)
        x += int(px * 1.18)
    return im.crop(im.getbbox() or (0, 0, im.width, im.height))


def gesto(nome, px=64):
    """A pilula de um gesto do TikTok, no padrao visual do app.

    O QUE FAZ ELA SER LIDA COMO TIKTOK
      Nao e a cor sozinha: e a ABERRACAO CROMATICA. O mesmo formato desenhado
      tres vezes -- ciano deslocado para cima-esquerda, rosa para baixo-direita
      e preto por cima. E a assinatura grafica do app, e e o que os assets de
      referencia tem em comum entre si e nao tem com botao de YouTube.

      A primeira versao usava pilula vermelha chapada com icone branco. Estava
      com o VERBO certo e o VISUAL errado -- o founder viu na hora e disse que
      "ainda parece de YouTube". Cor de marca sem a linguagem grafica da marca
      nao transfere nada.

      O icone mora numa BOLHA BRANCA a esquerda, como nos assets: e o que separa
      o simbolo do texto sem precisar de espaco morto.
    """
    texto, icone, _cor = GESTOS[nome]
    return _pilula_glitch(texto, icone, px)


def grupo(nomes, px=64, espaco=0.22):
    """Varios gestos empilhados, para o CTA de meio de video.

    O benchmark pede um gesto por vez no comeco e o TRIO junto no bloco
    emocional -- pedir curtir, comentar e compartilhar em tres pilulas seguidas
    le como lista, e lista se cumpre item a item.
    """
    ims = [gesto(n, px) for n in nomes]
    g = int(px * espaco)
    W = max(i.width for i in ims)
    H = sum(i.height for i in ims) + g * (len(ims) - 1)
    fora = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    y = 0
    for i in ims:
        fora.paste(i, ((W - i.width) // 2, y), i)
        y += i.height + g
    return fora


def _pilula_glitch(texto, icone, px):
    S = 3
    f = ImageFont.truetype(ARIALBD, int(px * S * 0.92))
    txt = texto.upper()
    l = int(f.getlength(txt) + px * S * 0.10 * (len(txt) - 1))   # com tracking
    alt = int(px * S * 1.72)
    bolha = int(alt * 0.62)
    pad = int(px * S * 0.34)
    larg = pad + bolha + int(px * S * 0.42) + l + pad
    d_off = int(px * S * 0.15)

    im = Image.new("RGBA", (larg + d_off * 2, alt + d_off * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)

    def pilula(dx, dy, cor):
        d.rounded_rectangle((dx, dy, dx + larg, dy + alt),
                            radius=alt // 2, fill=cor)

    pilula(0, 0, TK_CIANO)                       # ciano acima-esquerda
    pilula(d_off * 2, d_off * 2, TK_ROSA)        # rosa abaixo-direita
    pilula(d_off, d_off, TK_ESCURO)              # o corpo, por cima

    ox, oy = d_off, d_off
    # bolha branca do icone
    bx, by = ox + pad, oy + (alt - bolha) // 2
    d.ellipse((bx, by, bx + bolha, by + bolha), fill=BRANCO)
    des = {"polegar": _polegar, "sino": _sino, "coracao": _coracao,
           "balao": _balao, "marcador": _marcador, "seta": _seta_share,
           "avatar": _mais}
    if icone in des:
        des[icone](d, bx + bolha * 0.20, by + bolha / 2, bolha * 0.62,
                   TK_ESCURO)

    # texto com tracking manual: `getlength` nao aplica espacamento por si
    tx = bx + bolha + int(px * S * 0.42)
    ty = oy + (alt - px * S * 1.10) / 2
    for ch in txt:
        d.text((tx, ty), ch, font=f, fill=BRANCO)
        tx += f.getlength(ch) + px * S * 0.10

    im = im.crop(im.getbbox())
    return im.resize((max(im.width // S, 1), max(im.height // S, 1)),
                     Image.LANCZOS)


def _polegar(d, x, cy, e, cor=BRANCO):
    """Polegar para cima, em silhueta branca.

    Tres blocos e nada mais: punho, mao e o dedo. A primeira versao usava
    proporcoes menores e os tres se fundiam num borrao -- a `_camadas.jpg`
    mostrou "uma bolinha", nao um polegar.
    """
    # punho, separado da mao por uma folga que sobrevive ao downscale
    d.rounded_rectangle((x, cy - e * 0.02, x + e * 0.26, cy + e * 0.66),
                        radius=e * 0.07, fill=cor)
    # mao
    d.rounded_rectangle((x + e * 0.34, cy - e * 0.20,
                         x + e * 1.06, cy + e * 0.66),
                        radius=e * 0.16, fill=cor)
    # dedo, saindo do canto de cima da mao
    d.rounded_rectangle((x + e * 0.40, cy - e * 0.92,
                         x + e * 0.70, cy - e * 0.10),
                        radius=e * 0.15, fill=cor)


def _sino(d, x, cy, e, cor=BRANCO):
    """Sino de notificacao."""
    d.pieslice((x, cy - e * 0.85, x + e, cy + e * 0.35), 180, 360, fill=cor)
    d.rectangle((x, cy - e * 0.25, x + e, cy + e * 0.30), fill=cor)
    d.rounded_rectangle((x - e * 0.10, cy + e * 0.28,
                         x + e * 1.10, cy + e * 0.46),
                        radius=e * 0.09, fill=cor)
    d.ellipse((x + e * 0.36, cy + e * 0.48, x + e * 0.64, cy + e * 0.76),
              fill=cor)
    d.ellipse((x + e * 0.42, cy - e * 1.00, x + e * 0.58, cy - e * 0.84),
              fill=cor)


def _coracao(d, x, cy, e, cor=BRANCO):
    """Coracao cheio — o gesto de curtir do TikTok."""
    r = e * 0.30
    d.ellipse((x, cy - e * 0.42, x + r * 2, cy - e * 0.42 + r * 2), fill=cor)
    d.ellipse((x + e * 0.36, cy - e * 0.42, x + e * 0.36 + r * 2,
               cy - e * 0.42 + r * 2), fill=cor)
    d.polygon([(x - e * 0.01, cy - e * 0.06), (x + e * 0.97, cy - e * 0.06),
               (x + e * 0.48, cy + e * 0.56)], fill=cor)


def _balao(d, x, cy, e, cor=BRANCO):
    """Balao de fala — comentar."""
    d.rounded_rectangle((x, cy - e * 0.46, x + e * 0.96, cy + e * 0.26),
                        radius=e * 0.20, fill=cor)
    d.polygon([(x + e * 0.20, cy + e * 0.20), (x + e * 0.20, cy + e * 0.58),
               (x + e * 0.54, cy + e * 0.22)], fill=cor)


def _marcador(d, x, cy, e, cor=BRANCO):
    """Marcador de pagina — salvar. O recorte em V e o que o identifica."""
    d.polygon([(x + e * 0.16, cy - e * 0.52), (x + e * 0.80, cy - e * 0.52),
               (x + e * 0.80, cy + e * 0.52), (x + e * 0.48, cy + e * 0.18),
               (x + e * 0.16, cy + e * 0.52)], fill=cor)


def _seta_share(d, x, cy, e, cor=BRANCO):
    """Seta de compartilhar."""
    d.polygon([(x + e * 0.96, cy - e * 0.06), (x + e * 0.40, cy - e * 0.52),
               (x + e * 0.40, cy + e * 0.40)], fill=cor)
    d.rounded_rectangle((x + e * 0.02, cy - e * 0.20,
                         x + e * 0.46, cy + e * 0.14),
                        radius=e * 0.08, fill=cor)


def _mais(d, x, cy, e, cor=BRANCO):
    """O "+" do seguir. Nos assets de referencia o simbolo e um mais simples --
    avatar em miniatura vira borrao no tamanho que a bolha permite."""
    g = max(int(e * 0.17), 2)
    r = e * 0.44
    cxx = x + e * 0.42
    d.line([(cxx - r, cy), (cxx + r, cy)], fill=cor, width=g)
    d.line([(cxx, cy - r), (cxx, cy + r)], fill=cor, width=g)


def _avatar_mais(d, x, cy, e, cor=BRANCO):
    """Avatar redondo com o "+" — o botao de seguir do TikTok."""
    r = e * 0.40
    cxx, cyy = x + r, cy - e * 0.10
    d.ellipse((cxx - r, cyy - r, cxx + r, cyy + r), fill=cor)
    # silhueta dentro do avatar, em negativo
    d.ellipse((cxx - r * 0.30, cyy - r * 0.52, cxx + r * 0.30, cyy + r * 0.08),
              fill=(0, 0, 0, 0))
    d.pieslice((cxx - r * 0.52, cyy - r * 0.05, cxx + r * 0.52, cyy + r * 1.05),
               180, 360, fill=(0, 0, 0, 0))
    # o "+" pendurado embaixo
    br = e * 0.20
    bx, by = cxx, cyy + r * 0.96
    d.ellipse((bx - br, by - br, bx + br, by + br), fill=cor)
    d.line([(bx - br * 0.5, by), (bx + br * 0.5, by)], fill=(0, 0, 0, 0),
           width=max(int(br * 0.34), 2))
    d.line([(bx, by - br * 0.5), (bx, by + br * 0.5)], fill=(0, 0, 0, 0),
           width=max(int(br * 0.34), 2))


def salva(im, caminho):
    im.save(caminho)
    return caminho
