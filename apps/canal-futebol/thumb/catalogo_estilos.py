# -*- coding: utf-8 -*-
"""Catalogo de estilos de thumb — a MESMA copy em 9 desenhos.

POR QUE A COPY FICA TRAVADA
  Comparar estilo com copy diferente nao compara estilo, compara copy. Aqui o
  titulo e o texto da thumb sao os aprovados, iguais nos nove; o que varia e
  so o desenho. Assim a escolha e sobre desenho de verdade.

O QUE FOI APRENDIDO OLHANDO OS CANAIS QUE PERFORMAM
  Noticias Maromba (850 mil inscritos) e BTB Sports (941 mil) nao usam fundo de
  marca com foto recortada ao lado. Eles usam:

    · a FOTO ocupando o quadro inteiro, ou duas fotos em paineis
    · texto em FAIXAS de largura total, no rodape (sempre) e no topo (as vezes)
    · a faixa do rodape em AMARELO SOLIDO com texto preto — o elemento mais
      constante de todos, e o que faz a thumb ser reconhecida de longe
    · etiqueta pequena de canto: "POLEMICA PESADA!", "DENUNCIA PESADA"
    · citacao entre aspas no alto: "QUEREM SABER A VERDADE?"
    · marcadores vermelhos: X sobre a pessoa, circulo, seta curva
    · emoji no fim do texto (😱😭) — sim, eles usam, e funciona

  A vinheta da marca por cima resolve um problema que so aparece no volume:
  cada foto vem de um fotografo diferente, com temperatura de cor diferente. Sem
  a vinheta, quarenta thumbs no canal parecem de quarenta canais.

Uso:
    python catalogo_estilos.py
    python catalogo_estilos.py --so E3
"""
import argparse
import base64
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
JOB = os.path.abspath(os.path.join(AQUI, "..", "_imagens"))
CANAL = os.path.abspath(os.path.join(
    AQUI, "..", "..", "..", "workspaces", "businesses", "virals",
    "creative-studio", "canais", "bora-de-bola", "assets"))

def _f(p):
    return "file:///" + os.path.abspath(p).replace("\\", "/")

FOTO = _f(os.path.join(JOB, "abel-wide.jpg"))
FOTO2 = _f(os.path.join(JOB, "abel2-wide.jpg"))
SELO = _f(os.path.join(CANAL, "selo.png"))
ESCUDO = "https://a.espncdn.com/i/teamlogos/soccer/500/2029.png"

# ─────────────────────────────────────────────────────────────────────────────
# A COPY TRAVADA — aprovada pelo dono do canal
# ─────────────────────────────────────────────────────────────────────────────
TITULO = "AGORA! Abel fora, e o Palmeiras não aceita o veredito"
L1 = "ABSOLVIÇÃO VIROU {CONDENAÇÃO}"
L2 = "O PALMEIRAS NÃO ACEITOU"

BASE = {"foto": FOTO, "selo": SELO}

ESTILOS = [
    # ── E1 ───────────────────────────────────────────────────────────────
    ("E1", "Faixa amarela no rodapé",
     "O padrão mais usado do nicho. Foto no quadro inteiro, faixa amarela sólida "
     "embaixo com o texto em preto. Lê de longe e identifica o canal.",
     dict(BASE, rodape1=L1, rodape2=L2, rodape_estilo="solida")),

    # ── E2 ───────────────────────────────────────────────────────────────
    ("E2", "Dupla faixa — topo e rodapé",
     "A frase se parte em duas: a tensão em cima, a resolução embaixo. É o "
     "desenho do BTB Sports, e dá duas chances de o olho pegar a promessa.",
     dict(BASE, topo1="ABSOLVIÇÃO VIROU", topo_estilo="escura",
          rodape1="{CONDENAÇÃO}", rodape2=L2, rodape_estilo="solida")),

    # ── E3 ───────────────────────────────────────────────────────────────
    ("E3", "Etiqueta de canto + faixa",
     "A etiqueta vermelha dá o gênero da notícia antes de qualquer palavra. "
     "É a leitura mais rápida de todas — a cor chega antes do texto.",
     dict(BASE, etiqueta="POLÊMICA PESADA!", etiqueta_estilo="caixa",
          rodape1=L1, rodape2=L2, rodape_estilo="solida")),

    # ── E4 ───────────────────────────────────────────────────────────────
    ("E4", "Citação entre aspas",
     "As aspas fazem o espectador supor que há uma fala. Cuidado de uso: só "
     "entra frase que EXISTE na fonte, senão vira B3 e o motor barra.",
     dict(BASE, aspas="ELE NÃO PODE FICAR DE FORA",
          rodape1=L1, rodape_estilo="solida")),

    # ── E5 ───────────────────────────────────────────────────────────────
    ("E5", "Marcação — X sobre a pessoa",
     "O X marca a negação: fora, cortado, suspenso. Direto e brutal, e por "
     "isso mesmo gasta rápido se usado todo dia.",
     dict(BASE, marcador="xis", marcador_x="18%", marcador_y="24%",
          rodape1=L1, rodape2=L2, rodape_estilo="solida")),

    # ── E6 ───────────────────────────────────────────────────────────────
    ("E6", "Marcação — círculo e seta",
     "O círculo dirige o olho para o rosto e a seta cria movimento. Menos "
     "agressivo que o X, serve para pauta que não é de negação.",
     dict(BASE, marcador="circulo", marcador_x="12%", marcador_y="18%",
          etiqueta="URGENTE", etiqueta_estilo="amarela",
          rodape1=L1, rodape2=L2, rodape_estilo="solida")),

    # ── E7 ───────────────────────────────────────────────────────────────
    ("E7", "Dois painéis",
     "Duas fotos com divisória branca. É como o nicho mostra confronto — e "
     "aqui mostra o antes e o depois do mesmo personagem.",
     dict(BASE, foto_b=FOTO2, foto_b_pos="50% 30%", rodape1=L1, rodape2=L2,
          rodape_estilo="solida", etiqueta="O QUE MUDOU", etiqueta_estilo="amarela")),

    # ── E8 ───────────────────────────────────────────────────────────────
    ("E8", "Faixa diagonal",
     "A mesma faixa, inclinada. Quebra a horizontalidade da fileira de "
     "sugeridos, onde toda thumb concorrente é reta.",
     dict(BASE, rodape1=L1, rodape2=L2, rodape_estilo="solida", diagonal=True)),

    # ── E9 ───────────────────────────────────────────────────────────────
    ("E9", "Moldura da marca + emoji",
     "A moldura amarela é a assinatura do canal: mesmo cortada no feed, o olho "
     "reconhece. O emoji é o que o nicho usa para dizer o tom sem gastar palavra.",
     dict(BASE, moldura=True, emoji="😱", emoji_x="66%", emoji_y="16%",
          rodape1=L1, rodape2=L2, rodape_estilo="solida", selo_baixo=True)),

    # ── E10 ──────────────────────────────────────────────────────────────
    ("E10", "Texto gigante no topo inteiro",
     "Sem faixa: o texto ocupa o topo inteiro com contorno grosso sobre a foto. "
     "É o que mais aproveita a área, e o que mais depende de a foto ter céu.",
     dict(BASE, topo1=L1, topo2=L2, topo_estilo="escura",
          foto_pos="50% 58%", selo_baixo=True)),
]


def _b64(d):
    return base64.b64encode(json.dumps(d, ensure_ascii=False).encode()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so")
    ap.add_argument("--saida", default=os.path.join(AQUI, "..", "estilos"))
    a = ap.parse_args()

    from playwright.sync_api import sync_playwright
    saida = os.path.abspath(a.saida)
    os.makedirs(saida, exist_ok=True)
    alvo = [e for e in ESTILOS if not a.so or e[0] == a.so]
    tpl = os.path.join(AQUI, "estilos.html").replace("\\", "/")

    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        pg = nav.new_page(viewport={"width": 1280, "height": 720})
        for cod, nome, _, d in alvo:
            pg.goto("file:///%s?d=%s" % (tpl, _b64(d)))
            pg.wait_for_timeout(1400)
            try:
                pg.wait_for_function("[...document.images].every(i=>i.complete)", timeout=8000)
            except Exception:
                pass
            pg.locator("#alvo").screenshot(path=os.path.join(saida, "%s.png" % cod))
            print("  %-4s %s" % (cod, nome))
        nav.close()

    _folha(alvo, saida)
    print("\n%d estilos em %s" % (len(alvo), saida))
    return 0


def _folha(estilos, saida):
    cards = []
    for cod, nome, porque, d in estilos:
        cards.append("""
<article class="e">
  <div class="cab"><span class="cod">%s</span><h2>%s</h2></div>
  <div class="par">
    <img class="big" src="%s.png" alt="">
    <div class="mini"><img src="%s.png" alt="">
      <div class="tt">AGORA! Abel fora, e o Palmeiras não aceita o…</div>
      <div class="mt">Bora de Bola · 12 mil visualizações</div>
    </div>
  </div>
  <p class="pq">%s</p>
</article>""" % (cod, nome, cod, cod, porque))

    html = """<meta charset="utf-8"><title>Estilos de thumb — Bora de Bola</title>
<style>
 :root{--fundo:#0C240C;--prof:#080f08;--am:#FCCC0C;--tinta:#eef3ee;--fraca:#93a893;--linha:#1d3a1d}
 *{margin:0;padding:0;box-sizing:border-box}
 body{background:var(--prof);color:var(--tinta);font:400 15px/1.65 "Segoe UI",system-ui,sans-serif;padding:38px}
 h1{font-size:31px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
 .sub{color:var(--fraca);max-width:78ch;margin-bottom:14px}
 .copy{border-left:3px solid var(--am);padding:10px 16px;margin-bottom:30px;
       background:rgba(252,204,12,.06);max-width:78ch}
 .copy b{color:var(--am)}
 .e{border:1px solid var(--linha);border-radius:14px;background:var(--fundo);padding:20px;margin-bottom:22px}
 .cab{display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
 .cod{font:800 12px/1 ui-monospace,monospace;letter-spacing:.12em;color:var(--am);
      border:1px solid #4a4110;padding:6px 9px;border-radius:5px}
 h2{font-size:19px;font-weight:700;letter-spacing:-.01em}
 .par{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
 .big{width:600px;border-radius:8px;display:block}
 .mini{width:168px}
 .mini img{width:168px;height:94px;object-fit:cover;border-radius:6px;display:block}
 .mini .tt{font:600 13px/1.3 "Segoe UI",sans-serif;margin-top:6px;color:#fff}
 .mini .mt{color:var(--fraca);font-size:11px;margin-top:3px}
 .pq{color:var(--fraca);margin-top:14px;max-width:88ch;font-size:14.5px}
</style>
<h1>Estilos de thumb</h1>
<p class="sub">A mesma copy nos dez desenhos. Comparar estilo com copy diferente
não compara estilo — compara copy. Cada um aparece grande e a <b>168&nbsp;px</b>,
que é o tamanho do feed.</p>
<div class="copy"><b>Título:</b> AGORA! Abel fora, e o Palmeiras não aceita o veredito<br>
<b>Thumb:</b> ABSOLVIÇÃO VIROU CONDENAÇÃO · O PALMEIRAS NÃO ACEITOU</div>
%s""" % "".join(cards)
    with open(os.path.join(saida, "ESTILOS.html"), "w", encoding="utf-8") as f:
        f.write(html)


if __name__ == "__main__":
    sys.exit(main())
