# -*- coding: utf-8 -*-
"""Recorta a foto da materia para a coluna da thumb, com o rosto no lugar certo.

POR QUE NAO DA PARA CORTAR NO CHUTE
  Foto de portal e paisagem 3:2 com o tecnico no meio e mais gente ao redor.
  A coluna da thumb e vertical (576x720). Um `object-position: 50% 22%` fixo
  acerta numa foto e decapita a proxima — e o defeito so aparece no PNG, depois
  de pronto.

  Entao o recorte procura o rosto. Achou: enquadra com o rosto na "regra dos
  tercos" alta, que e onde o olho espera encontrar alguem numa thumb. Nao achou:
  cai para o centro-alto, que e o palpite menos ruim, e AVISA — porque recorte
  que erra em silencio e pior que recorte que pede conferencia.

QUAL ROSTO, QUANDO HA VARIOS
  A foto do exemplo tem tres pessoas: o tecnico gesticulando, um jogador ao
  fundo e outro tecnico desfocado na direita. Escolher "o primeiro que apareceu"
  pegaria qualquer um. O criterio e AREA — o rosto maior e o mais proximo da
  camera, e quem esta mais proximo e o assunto da foto.
"""
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

LARGURA, ALTURA = 576, 720          # a coluna esquerda da thumb (45% de 1280)
ALTURA_DO_ROSTO = 0.38              # onde o centro do rosto deve cair, de cima
FOLGA = 2.9                         # quantas alturas de rosto cabem no quadro


def _nitidez(cinza, r):
    """Variancia do laplaciano na regiao — quanto maior, mais em foco.

    E a medida classica de foco: imagem borrada tem pouca variacao de gradiente.
    Aqui ela decide QUEM e o assunto da foto.
    """
    import cv2
    x, y, w, h = r
    recorte = cinza[max(0, y):y + h, max(0, x):x + w]
    if recorte.size == 0:
        return 0.0
    return float(cv2.Laplacian(recorte, cv2.CV_64F).var())


def acha_rosto(caminho):
    """(x, y, w, h) do rosto que E O ASSUNTO da foto, ou None.

    Nao e o maior nem o primeiro: e o de maior `area x nitidez`. Na foto de
    teste, o criterio de area sozinho escolhia o tecnico DESFOCADO da direita,
    que esta mais perto da camera — e o recorte saia com um borrao ocupando a
    coluna inteira da thumb.
    """
    import cv2
    im = cv2.imread(caminho)
    if im is None:
        return None, None
    cinza = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    eq = cv2.equalizeHist(cinza)
    base = cv2.data.haarcascades
    H, W = im.shape[:2]

    candidatos = []
    for arq, escala, viz in (("haarcascade_frontalface_default.xml", 1.06, 6),
                             ("haarcascade_profileface.xml", 1.06, 5),
                             ("haarcascade_frontalface_alt2.xml", 1.04, 4)):
        c = cv2.CascadeClassifier(os.path.join(base, arq))
        if c.empty():
            continue
        for r in c.detectMultiScale(eq, escala, viz, minSize=(int(H * .06),) * 2):
            candidatos.append(tuple(int(v) for v in r))

    if not candidatos:
        return None, (H, W)

    # Dedup: os tres classificadores acham o mesmo rosto com caixas parecidas.
    unicos = []
    for r in sorted(candidatos, key=lambda r: -r[2] * r[3]):
        if not any(abs(r[0] - u[0]) < u[2] * .5 and abs(r[1] - u[1]) < u[3] * .5
                   for u in unicos):
            unicos.append(r)

    melhor, melhor_nota = None, -1.0
    for r in unicos:
        area = r[2] * r[3]
        nit = _nitidez(cinza, r)
        nota = area * (nit ** 0.6)      # a nitidez pesa, mas nao domina
        if nota > melhor_nota:
            melhor, melhor_nota = r, nota
    return melhor, (H, W)


def recorta(origem, destino, largura=LARGURA, altura=ALTURA):
    """Recorta para a coluna da thumb. Devolve (caminho, como_foi_enquadrado)."""
    from PIL import Image
    rosto, dims = acha_rosto(origem)
    im = Image.open(origem).convert("RGB")
    W, H = im.size

    if rosto:
        rx, ry, rw, rh = rosto
        cx, cy = rx + rw / 2.0, ry + rh / 2.0
        # A altura do quadro sai do tamanho do rosto: assim o enquadramento fica
        # igual em foto aberta e em foto fechada.
        # A altura do quadro sai do TAMANHO DO ROSTO: assim o enquadramento
        # fica igual em foto aberta e em foto fechada.
        alvo_h = min(H, max(rh * FOLGA, altura * 0.55))
        alvo_w = alvo_h * (largura / float(altura))
        if alvo_w > W:
            alvo_w = W
            alvo_h = alvo_w * (altura / float(largura))
        topo = cy - alvo_h * ALTURA_DO_ROSTO
        esq = cx - alvo_w / 2.0
        como = "rosto em foco (%dx%d)" % (rw, rh)
    else:
        alvo_h = min(H, W * (altura / float(largura)))
        alvo_w = alvo_h * (largura / float(altura))
        esq, topo = (W - alvo_w) / 2.0, H * 0.06
        como = "SEM ROSTO — centro-alto (confira)"

    esq = max(0, min(esq, W - alvo_w))
    topo = max(0, min(topo, H - alvo_h))
    corte = im.crop((int(esq), int(topo), int(esq + alvo_w), int(topo + alvo_h)))
    corte = corte.resize((largura, altura), Image.LANCZOS)
    os.makedirs(os.path.dirname(os.path.abspath(destino)), exist_ok=True)
    corte.save(destino, quality=92)
    return destino, como


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    origem = sys.argv[1]
    destino = sys.argv[2] if len(sys.argv) > 2 else \
        os.path.splitext(origem)[0] + "-recorte.jpg"
    p, como = recorta(origem, destino)
    print("%s\n  %s" % (p, como))
