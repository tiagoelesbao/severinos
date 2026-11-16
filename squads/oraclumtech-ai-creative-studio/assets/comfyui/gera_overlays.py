# -*- coding: utf-8 -*-
"""Gera os OVERLAYS DE ATMOSFERA em video, para mesclagem na composicao.

POR QUE GERAR EM VEZ DE BAIXAR
  Pacote de overlay pronto e facil de achar e dificil de licenciar: quase nenhum
  diz com clareza se pode ir em peca de CLIENTE monetizada, e "gratuito para uso
  pessoal" e a pegadinha mais comum. Peca de hospedagem publicada com asset de
  procedencia incerta transfere um risco nosso para o dono do imovel.

  Estes aqui sao sinteticos: particula, grao, risco e vazamento de luz sao
  fenomenos simples de descrever matematicamente. Sao 100% nossos, sao
  parametrizaveis, e repetem em loop sem costura porque o movimento e periodico
  por construcao.

COMO SE USA NA COMPOSICAO
  Todos saem sobre PRETO, para mesclagem por `screen` ou `add` — o preto some e so
  o brilho fica. A excecao e `textura-de-papel`, que sai em cinza medio e pede
  `overlay` ou `soft-light`.

  No `video-studio`, isso e uma camada acima da faixa de video, com opacidade entre
  0,15 e 0,40. Acima de 0,5 o overlay deixa de ser atmosfera e vira assunto.

ESTATICO x DINAMICO — os dois, e nao um ou outro
  O grao embutido na IMAGEM da profundidade ao quadro parado; o overlay em VIDEO da
  vida a linha do tempo. Sao camadas diferentes fazendo trabalhos diferentes, e
  usar as duas junto e o que a referencia faz.

Uso:  python gera_overlays.py [duracao_s]      padrao 10
"""
import os, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DEST = os.path.normpath(os.path.join(
    os.path.dirname(os.path.abspath(__file__)), "..", "overlays"))

W, H, FPS = 1920, 1080, 30
DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 10.0
N = int(DUR * FPS)


def escreve(nome, gerador, nota, crf=16):
    """crf padrao 16 (quase sem perda). Overlay feito de RUIDO aceita crf muito
    mais alto sem que ninguem note — e precisa, porque ruido nao comprime: o
    `vhs` saiu com 98 MB em crf 16 e o preview do navegador nao aguenta isso."""
    os.makedirs(DEST, exist_ok=True)
    saida = os.path.join(DEST, nome + ".mp4")
    p = subprocess.Popen(
        ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", "%dx%d" % (W, H), "-r", str(FPS), "-i", "-",
         "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
         "-pix_fmt", "yuv420p", saida],
        stdin=subprocess.PIPE)
    for i in range(N):
        p.stdin.write(gerador(i / N).astype(np.uint8).tobytes())
    p.stdin.close()
    p.wait()
    mb = os.path.getsize(saida) / 1e6
    print("  %-22s %4.1fs  %4.1f MB   %s" % (nome, DUR, mb, nota))


# ── particulas ──────────────────────────────────────────────────────────────
def _campo_de_particulas(qtd, semente, tam_min, tam_max, brilho, deriva):
    """Particulas com movimento PERIODICO — no fim do clipe voltam ao inicio."""
    r = np.random.RandomState(semente)
    px = r.rand(qtd)
    py = r.rand(qtd)
    tam = r.uniform(tam_min, tam_max, qtd)
    fase = r.rand(qtd)
    amp = r.uniform(0.3, 1.0, qtd) * deriva
    br = r.uniform(0.4, 1.0, qtd) * brilho

    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    def quadro(t):
        img = np.zeros((H, W), np.float32)
        # deslocamento periodico: volta ao ponto de partida em t=1
        dy = np.sin(2 * np.pi * (t + fase)) * amp
        dx = np.cos(2 * np.pi * (t + fase)) * amp * 0.4
        cx = ((px + dx) % 1.0) * W
        cy = ((py + dy) % 1.0) * H
        cintila = 0.6 + 0.4 * np.sin(2 * np.pi * (3 * t + fase * 7))
        for k in range(qtd):
            s = tam[k]
            x0, x1 = int(cx[k] - s * 3), int(cx[k] + s * 3)
            y0, y1 = int(cy[k] - s * 3), int(cy[k] + s * 3)
            x0, y0 = max(0, x0), max(0, y0)
            x1, y1 = min(W, x1), min(H, y1)
            if x1 <= x0 or y1 <= y0:
                continue
            d2 = ((xx[y0:y1, x0:x1] - cx[k]) ** 2 +
                  (yy[y0:y1, x0:x1] - cy[k]) ** 2) / (s * s)
            img[y0:y1, x0:x1] += np.exp(-d2) * br[k] * cintila[k]
        v = np.clip(img, 0, 1) * 255
        return np.dstack([v, v, v])

    return quadro


# ── grao de pelicula ────────────────────────────────────────────────────────
def _grao(intensidade, semente):
    r = np.random.RandomState(semente)
    # um banco de quadros de ruido, percorrido em ciclo: loop perfeito
    banco = [r.normal(0, intensidade, (H // 2, W // 2)).astype(np.float32)
             for _ in range(12)]

    def quadro(t):
        g = banco[int(t * len(banco)) % len(banco)]
        g = np.repeat(np.repeat(g, 2, 0), 2, 1)[:H, :W]
        v = np.clip(g + 8, 0, 255)
        return np.dstack([v, v, v])

    return quadro


# ── riscos de pelicula ──────────────────────────────────────────────────────
def _riscos(semente):
    r = np.random.RandomState(semente)
    qtd = 14
    col = r.rand(qtd)
    nasce = r.rand(qtd)
    vida = r.uniform(0.04, 0.16, qtd)
    larg = r.randint(1, 4, qtd)
    br = r.uniform(0.25, 0.8, qtd)

    def quadro(t):
        img = np.zeros((H, W), np.float32)
        for k in range(qtd):
            f = (t - nasce[k]) % 1.0
            if f > vida[k]:
                continue
            a = np.sin(np.pi * f / vida[k]) * br[k]          # entra e sai suave
            x = int((col[k] + 0.02 * np.sin(2 * np.pi * (t + k))) * W) % W
            y0 = int(r.rand() * 0)                            # risco de topo a base
            img[:, max(0, x):min(W, x + larg[k])] += a
        v = np.clip(img, 0, 1) * 255
        return np.dstack([v, v, v])

    return quadro


# ── vazamento de luz ────────────────────────────────────────────────────────
def _vazamento(cor, borda, semente):
    r = np.random.RandomState(semente)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    fase = r.rand()

    def quadro(t):
        pulso = 0.35 + 0.65 * (0.5 + 0.5 * np.sin(2 * np.pi * (t + fase)))
        if borda == "esquerda":
            d = xx / W
        elif borda == "direita":
            d = 1 - xx / W
        else:
            d = yy / H
        desloc = 0.12 * np.sin(2 * np.pi * (t + fase))
        m = np.clip(1.0 - (d + desloc) * 3.2, 0, 1) ** 2 * pulso
        return np.dstack([m * cor[0], m * cor[1], m * cor[2]])

    return quadro


# ── textura de papel ────────────────────────────────────────────────────────
def _papel(semente):
    r = np.random.RandomState(semente)
    base = r.normal(0, 1, (H // 3, W // 3)).astype(np.float32)
    # fibra: ruido alongado na horizontal
    fibra = np.cumsum(base, axis=1)
    fibra -= fibra.mean()
    fibra /= (np.abs(fibra).max() + 1e-6)
    fibra = np.repeat(np.repeat(fibra, 3, 0), 3, 1)[:H, :W]

    def quadro(t):
        # deriva periodica de 1 px, so para o papel nao ficar morto
        dx = int(round(2 * np.sin(2 * np.pi * t)))
        f = np.roll(fibra, dx, axis=1)
        v = np.clip(128 + f * 26, 0, 255)
        return np.dstack([v, v * 0.99, v * 0.96])

    return quadro


# ── nevoa ───────────────────────────────────────────────────────────────────
def _nevoa(semente):
    """Bruma lenta: ruido de baixa frequencia deslizando na horizontal.

    Nao e particula. Particula tem contorno e cintila; nevoa e uma mancha macia
    que empurra o fundo para tras. Por isso o campo e gerado em resolucao BAIXA
    e ampliado por interpolacao — que e o jeito barato de obter algo parecido
    com ruido de Perlin sem trazer uma dependencia so para isto.
    """
    r = np.random.RandomState(semente)
    pw, ph = 24, 14
    campo = r.rand(ph, pw * 2)          # duas larguras: a segunda emenda na primeira

    def quadro(t):
        desl = t * pw                    # uma largura por ciclo -> loop perfeito
        col = np.arange(W) / W * pw + desl
        lin = np.arange(H) / H * (ph - 1)
        ci = np.clip(col.astype(int), 0, pw * 2 - 2)
        cf = (col - ci)[None, :]
        li = np.clip(lin.astype(int), 0, ph - 2)
        lf = (lin - li)[:, None]
        a = campo[li][:, ci]
        b = campo[li][:, ci + 1]
        c = campo[li + 1][:, ci]
        d = campo[li + 1][:, ci + 1]
        v = (a * (1 - cf) + b * cf) * (1 - lf) + (c * (1 - cf) + d * cf) * lf
        v = np.clip((v - 0.42) * 2.1, 0, 1) * 150
        return np.dstack([v, v * 1.02, v * 1.08])

    return quadro


# ── bolhas ──────────────────────────────────────────────────────────────────
def _bolhas(qtd, semente):
    """Esferas subindo devagar, com anel claro na borda.

    Fora do vocabulario do canal dark — entra no catalogo porque o founder pediu
    que o ecossistema servisse a outros nichos.
    """
    r = np.random.RandomState(semente)
    x0 = r.rand(qtd) * W
    fase = r.rand(qtd)
    raio = 6 + r.rand(qtd) * 26
    vel = 0.6 + r.rand(qtd) * 0.8
    bal = r.rand(qtd) * 30

    def quadro(t):
        img = np.zeros((H, W, 3), np.float32)
        for i in range(qtd):
            # sobe e reentra por baixo: o ciclo fecha em t=1
            y = H * (1 - ((fase[i] + t * vel[i]) % 1.0))
            x = (x0[i] + bal[i] * np.sin((fase[i] + t) * 2 * np.pi)) % W
            R = int(raio[i])
            x1, x2 = max(0, int(x) - R), min(W, int(x) + R)
            y1, y2 = max(0, int(y) - R), min(H, int(y) + R)
            if x2 <= x1 or y2 <= y1:
                continue
            gx = np.arange(x1, x2) - x
            gy = (np.arange(y1, y2) - y)[:, None]
            d = np.sqrt(gx ** 2 + gy ** 2) / R
            # anel: claro na borda, quase vazio no centro
            v = np.clip(1 - np.abs(d - 0.86) * 9, 0, 1) * 120
            v += np.clip(1 - d, 0, 1) * 12
            img[y1:y2, x1:x2, 0] += v * 0.8
            img[y1:y2, x1:x2, 1] += v * 0.95
            img[y1:y2, x1:x2, 2] += v
        return np.clip(img, 0, 255)

    return quadro


# ── VHS ─────────────────────────────────────────────────────────────────────
def _vhs(semente):
    """Fita gasta: sangramento de cor, faixa de rolagem e ruido em linha.

    O que denuncia VHS nao e o ruido — e o DESLOCAMENTO HORIZONTAL por linha,
    diferente em cada canal de cor. Um ruido cinza uniforme le como grao digital.
    """
    r = np.random.RandomState(semente)
    # RUIDO EM BLOCO, e nao por pixel. Duas razoes, e as duas importam:
    # 1. fidelidade — fita nao tem resolucao de pixel; o ruido dela e grosso;
    # 2. tamanho — ruido por pixel e incompressivel. A primeira versao saiu com
    #    123 MB para 10 s, o que o preview do navegador nao aguenta. Em blocos
    #    de 4x2 o mesmo overlay cai para poucos MB.
    ruido = np.repeat(np.repeat(r.rand(H // 2, W // 4).astype(np.float32), 2, 0), 4, 1)
    ruido = ruido[:H, :W]

    def quadro(t):
        img = np.zeros((H, W, 3), np.float32)
        # deslocamento por linha, com uma banda que rola de baixo para cima
        banda = ((np.arange(H) / H + t) % 1.0)
        peso = np.clip(1 - np.abs(banda - 0.5) * 7, 0, 1)
        desl = (np.sin(np.arange(H) * 0.7 + t * 6 * np.pi) * 3 + peso * 14).astype(int)
        base = np.clip(ruido * 70, 0, 255)
        # VETORIZADO de proposito: a versao com `np.roll` por linha fazia
        # 1080 x 3 chamadas POR QUADRO — 3,2 milhoes num overlay de 10 s. Aqui
        # o deslocamento vira um indice de colunas e o numpy resolve de uma vez.
        ys = np.arange(H)[:, None]
        cols = np.arange(W)[None, :]
        for canal, extra in ((0, 3), (1, 0), (2, -3)):
            idx = (cols - (desl[:, None] + extra)) % W
            img[:, :, canal] = base[ys, idx]
        # linha de varredura clara acompanhando a banda
        y_lin = int((1 - ((t * 1.0) % 1.0)) * (H - 1))
        img[max(0, y_lin - 2):y_lin + 2] += 40
        return np.clip(img, 0, 255)

    return quadro


# ── linhas de TV ────────────────────────────────────────────────────────────
def _scanlines(semente):
    """Varredura de tubo: linhas horizontais finas, com uma onda percorrendo.

    Mesclar em `overlay` e nao em `screen` — em screen as linhas claream a
    imagem inteira em vez de sulca-la.
    """
    _ = np.random.RandomState(semente)
    linhas = ((np.arange(H) % 3) == 0).astype(np.float32)

    def quadro(t):
        onda = 1 + 0.35 * np.sin(np.arange(H) * 0.02 + t * 2 * np.pi)
        v = (linhas * 92 * onda)[:, None] * np.ones((1, W), np.float32)
        return np.dstack([v * 0.92, v, v * 0.96])

    return quadro


# (nome, fabrica, nota[, crf])
OVERLAYS = [
    ("particulas-lentas", lambda: _campo_de_particulas(70, 11, 1.6, 4.0, 0.55, 0.05),
     "poeira suspensa, quase parada — o padrao do dark"),
    ("particulas-densas", lambda: _campo_de_particulas(220, 23, 1.0, 2.6, 0.45, 0.14),
     "mais densa e mais rapida, para virada de bloco"),
    ("grao-de-pelicula", lambda: _grao(9.0, 31),
     "grao animado, mesclar em `screen` com opacidade baixa", 28),
    ("riscos-de-pelicula", lambda: _riscos(41),
     "riscos verticais que nascem e somem"),
    ("vazamento-quente-esq", lambda: _vazamento((255, 176, 92), "esquerda", 53),
     "vazamento ambar pela esquerda, pulsando"),
    ("vazamento-frio-dir", lambda: _vazamento((120, 178, 255), "direita", 59),
     "vazamento azul pela direita"),
    ("textura-de-papel", lambda: _papel(67),
     "fibra de papel — mesclar em `overlay` ou `soft-light`, NAO em `screen`"),
    ("nevoa", lambda: _nevoa(71),
     "bruma lenta que empurra o fundo para tras"),
    ("bolhas", lambda: _bolhas(34, 73),
     "esferas subindo — fora do dark, para outros nichos"),
    ("vhs", lambda: _vhs(79),
     "fita gasta: sangramento de cor e banda rolando", 30),
    ("linhas-de-tv", lambda: _scanlines(83),
     "varredura de tubo — mesclar em `overlay`, nunca em `screen`"),
]


def main():
    print("gerando overlays em %s  (%dx%d, %g s, %d fps)" % (DEST, W, H, DUR, FPS))
    for item in OVERLAYS:
        nome, fab, nota = item[0], item[1], item[2]
        escreve(nome, fab(), nota, item[3] if len(item) > 3 else 16)
    print("\n  %d overlays. Todos em loop perfeito: o movimento e periodico e o "
          "ultimo quadro encosta no primeiro." % len(OVERLAYS))


if __name__ == "__main__":
    main()
