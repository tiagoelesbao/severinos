# -*- coding: utf-8 -*-
"""Desenha a interface das redes por cima do curto pronto — para CONFERIR.

POR QUE ESTA PROVA EXISTE
  O arquivo e a unica coisa que eu consigo olhar aqui. O que o espectador ve e
  o arquivo COM O APP DESENHADO POR CIMA: coluna de botoes a direita, perfil e
  legenda na base, barra de progresso do player embaixo.

  Um curto pode estar perfeito no arquivo e ilegivel no feed. Foi o risco que o
  founder levantou em 06/09 -- e ele estava certo: a chamada final ficava em
  y=1580, dentro dos 420 px que o TikTok cobre.

  Nao da para "testar publicando". O que da e desenhar as faixas na medida
  certa e olhar. Esta prova custa dez segundos e substitui um palpite.

AS MEDIDAS
  Vem do squad de farming (`farm-assemble.js`), medidas na interface real:
  coluna direita ~180 px e base ~420 px, em 1080x1920.

USO
    python prova_zona_segura.py LA1-p1-comece-antes-60s
    python prova_zona_segura.py --todos
"""
import argparse
import os
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
_CANAIS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                       "creative-studio", "canais")
CURTOS = os.path.join(_CANAIS, "canal-estoico", "curtos")

UI_BASE = 420
UI_LADO = 180
UI_TOPO = 130          # status + abas "Seguindo / Para voce"


def _frames(video, n=3):
    d = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", video], capture_output=True, text=True).stdout)
    saidas = []
    tmp = tempfile.mkdtemp()
    for i, frac in enumerate([0.10, 0.50, 0.96]):
        j = os.path.join(tmp, "%d.png" % i)
        # `-ss` DEPOIS do `-i`: com ele antes, o ffmpeg salta por keyframe e ja
        # me fez concluir que faltava legenda onde nao faltava.
        subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-ss",
                        "%.2f" % (d * frac), "-frames:v", "1", j, "-y"],
                       capture_output=True)
        if os.path.isfile(j):
            saidas.append(j)
    return saidas[:n]


def prova(slug):
    from PIL import Image, ImageDraw
    pack = os.path.join(CURTOS, slug)
    v = os.path.join(pack, "04-final", "curto.mp4")
    if not os.path.isfile(v):
        print("%-34s sem 04-final/curto.mp4" % slug)
        return None

    fs = _frames(v)
    if not fs:
        return None
    ims = []
    for f in fs:
        im = Image.open(f).convert("RGB")
        W, H = im.size
        veu = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(veu)
        e = W / 1080.0
        # As tres faixas que o app cobre, em vermelho translucido.
        d.rectangle([0, H - UI_BASE * e, W, H], fill=(220, 40, 40, 90))
        d.rectangle([W - UI_LADO * e, 0, W, H - UI_BASE * e],
                    fill=(220, 40, 40, 90))
        d.rectangle([0, 0, W, UI_TOPO * e], fill=(220, 40, 40, 70))
        im = Image.alpha_composite(im.convert("RGBA"), veu).convert("RGB")
        im.thumbnail((300, 540))
        ims.append(im)

    L, A = ims[0].size
    folha = Image.new("RGB", (L * len(ims), A + 18), (12, 12, 12))
    dd = ImageDraw.Draw(folha)
    dd.text((4, 3), slug, fill=(250, 200, 60))
    for i, im in enumerate(ims):
        folha.paste(im, (i * L, 18))
    alvo = os.path.join(pack, "04-final", "_ZONA-SEGURA.jpg")
    folha.save(alvo, quality=88)
    for f in fs:
        try:
            os.remove(f)
        except OSError:
            pass
    return alvo


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--canal", choices=("estoico", "futebol"), default="estoico")
    a = ap.parse_args()

    global CURTOS
    if a.canal == "futebol":
        CURTOS = os.path.join(_CANAIS, "bora-de-bola", "curtos")
    alvos = ([s for s in sorted(os.listdir(CURTOS))
              if os.path.isdir(os.path.join(CURTOS, s))]
             if a.todos else [a.slug])
    if not alvos or alvos == [None]:
        ap.error("informe o slug ou use --todos")
    print("faixas: base %d px · lateral direita %d px · topo %d px"
          % (UI_BASE, UI_LADO, UI_TOPO))
    for s in alvos:
        p = prova(s)
        if p:
            print("%-34s %s" % (s, p))
    return 0


if __name__ == "__main__":
    sys.exit(main())
