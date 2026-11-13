# -*- coding: utf-8 -*-
"""Gera `fontes.css` com as fontes EMBUTIDAS em base64.

POR QUE EMBUTIR, E NAO APONTAR PARA O ARQUIVO
  O template abre por `file://` dentro do Playwright. Com `@font-face` apontando
  para um caminho relativo, o Chromium as vezes tira o screenshot ANTES de a
  fonte terminar de carregar — e o PNG sai com a fonte de fallback. O defeito
  nao aparece no navegador (que repinta), so no arquivo. Com `data:`, a fonte ja
  esta no documento quando ele e parseado, e nao ha corrida.

  Foi a mesma pedra do video-studio: "delayRender de fonte" nunca foi fonte, era
  recarga de aba. Aqui a solucao e a mesma — tirar a fonte da rede.

Fonte dos arquivos: `apps/video-studio/public/fonts/` — as mesmas seis ja
self-hosted no estudio, para o canal nao ter uma tipografia no video e outra na
capa.

Uso:
    python fontes.py          # regenera fontes.css
"""
import base64
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
ORIGEM = os.path.join(RAIZ, "apps", "video-studio", "public", "fonts")

# `peso` e a FAIXA quando a fonte e variavel. Playfair vai de 400 a 900 num
# arquivo so; declarar a faixa e o que permite pedir 900 sem ter um segundo
# arquivo. Anton e estatica — 400 nominal, desenho ja pesadissimo.
FAMILIAS = [
    ("Anton", "anton.woff2", "400"),
    ("Playfair Display", "playfair.woff2", "400 900"),
    ("Montserrat", "montserrat.woff2", "100 900"),
]


def gera(destino=None):
    destino = destino or os.path.join(AQUI, "fontes.css")
    blocos = []
    for nome, arquivo, peso in FAMILIAS:
        caminho = os.path.join(ORIGEM, arquivo)
        if not os.path.isfile(caminho):
            print("  AUSENTE: %s — a família %s vai cair no fallback" % (caminho, nome))
            continue
        b64 = base64.b64encode(open(caminho, "rb").read()).decode()
        blocos.append(
            "@font-face{font-family:'%s';font-style:normal;font-weight:%s;"
            "font-display:block;src:url(data:font/woff2;base64,%s) format('woff2')}"
            % (nome, peso, b64))
        print("  %-18s %s (%d KB)" % (nome, arquivo, len(b64) // 1024))
    cabecalho = ("/* GERADO por fontes.py — nao editar a mao.\n"
                 "   Fontes embutidas em base64 para o screenshot nao correr\n"
                 "   contra o carregamento. Regenerar: python fontes.py */\n")
    with open(destino, "w", encoding="utf-8") as f:
        f.write(cabecalho + "\n".join(blocos) + "\n")
    return destino


if __name__ == "__main__":
    print("gerado: %s" % gera())
