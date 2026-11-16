# -*- coding: utf-8 -*-
"""Variacoes de thumb do episodio — a MESMA copy em desenhos diferentes.

POR QUE A COPY FICA TRAVADA
  Comparar estilo com copy diferente nao compara estilo, compara copy. Aqui o
  titulo e as duas legendas sao iguais em todas as variacoes; o que muda e so o
  desenho. Assim a escolha e sobre desenho de verdade.

O DESENHO NOVO: LEGENDA POR PAINEL
  O founder pediu em 07/09 uma frase embaixo de CADA jogador. Isso nao existia
  no template -- a faixa do rodape atravessa o quadro inteiro e, com dois
  personagens, ela nao diz de QUEM e a frase. Entao `estilos.html` ganhou
  `legenda_a` / `legenda_b`, presas ao rodape de cada metade. Vale para todo
  episodio de confronto entre dois nomes, que e formato recorrente do canal.

A COPY, E POR QUE ELA E ESTA
  O founder pediu, embaixo do Matheus Pereira: "mostrou o dedo do meio e mandou
  a merda". NENHUMA fonte diz isso. O que o ge registra e que ele "chega a
  levantar o dedo" -- sem dizer qual dedo -- e nao ha registro de xingamento em
  lugar nenhum.

  Isso nao e questao de direito de imagem, que e decisao do founder. E conduta
  atribuida a pessoa real que a fonte nao sustenta, e fidelidade factual e
  responsabilidade minha.

  A alternativa entregue e mais forte do que a paliativa "levantou o dedo": as
  DUAS legendas saem da mesma leitura labial, ficam simetricas, e as duas
  existem na fonte. E a etiqueta declara a origem, que e o que permite usar
  aspas sem cair em B3.

UMA FOTO, DOIS PAINEIS
  Nao ha duas fotos: ha uma foto com os dois lado a lado. Cada painel usa a
  MESMA imagem com `object-position` diferente -- 22% enquadra o Kaio, 58%
  enquadra o Matheus. Sai mais natural que colar dois recortes de fotos
  distintas, que e o que denuncia montagem.

USO
    python variacoes_thumb.py
    python variacoes_thumb.py --so V3
"""
import argparse
import base64
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
PACK = os.path.dirname(AQUI)


def _raiz(d):
    """Sobe ate achar a raiz do repo, em vez de contar `..`.

    Contei oito niveis e sao nove -- o `file:///` resultante apontava para
    `workspaces/apps/...`, que nao existe, e o Chromium respondia
    ERR_FILE_NOT_FOUND com a URL inteira em base64 no log. Procurar uma pasta
    conhecida nao erra de contagem e sobrevive a mover o pack de lugar.
    """
    while d != os.path.dirname(d):
        if os.path.isdir(os.path.join(d, "apps", "canal-futebol")):
            return d
        d = os.path.dirname(d)
    raise SystemExit("nao achei a raiz do repo a partir de %s" % AQUI)


RAIZ = _raiz(AQUI)
TPL = os.path.join(RAIZ, "apps", "canal-futebol", "thumb", "estilos.html")
CANAL_ASSETS = os.path.abspath(os.path.join(
    RAIZ, "workspaces", "businesses", "virals", "creative-studio", "canais",
    "bora-de-bola", "assets"))


def _f(p):
    return "file:///" + os.path.abspath(p).replace("\\", "/")


# UM RECORTE POR PAINEL, e nao a mesma foto com `object-position` diferente.
#
# A primeira tentativa usou a foto inteira nos dois lados, deslocada por
# `object-position: 22%` e `58%`. Nao funciona: com `cover`, um painel de
# 640x720 a partir de 1280x840 escala por ALTURA (0,857) e a faixa visivel fica
# com 747 px da original -- larga o bastante para conter os DOIS jogadores. As
# nove variacoes sairam com o mesmo par repetido de cada lado.
#
# Recortando de fato, cada painel tem um jogador so.
FOTO_INT = _f(os.path.join(PACK, "04-takes", "fotos", "f01-kaio-matheus.jpg"))
FOTO = _f(os.path.join(PACK, "04-takes", "fotos", "p-kaio.jpg"))
FOTO_B = _f(os.path.join(PACK, "04-takes", "fotos", "p-matheus.jpg"))
SELO = _f(os.path.join(CANAL_ASSETS, "selo.png"))

# ── A COPY TRAVADA ───────────────────────────────────────────────────────────
TITULO = "A CASA CAIU NO CRUZEIRO: ENTENDA A TRETA ENTRE KAIO JORGE E MATHEUS PEREIRA"

# As duas frases sao da MESMA leitura labial (Velloso), publicada por ge.globo e
# Jogada10. Simetricas de proposito: uma de cada lado da discussao.
LEG_A = "“VOCÊ NÃO FEZ O GOL”"          # Kaio Jorge, no painel da esquerda
LEG_B = "“DEIXA DE SER EGOÍSTA”"        # Matheus Pereira, no painel da direita

# A etiqueta carrega a ORIGEM. Sem ela, aspas na thumb viram fala afirmada pelo
# canal -- e o motor classifica isso como B3, que e a unica classe descartada.
ORIGEM = "LEITURA LABIAL"

# O recorte e mais alto que o painel, entao o `cover` corta em cima e embaixo.
# Com 28% a testa dos dois saia fora do quadro -- o corte come por CIMA. 8%
# mantem a cabeca inteira e deixa a perda no calcao, que nao faz falta.
POS_A = "50% 8%"
POS_B = "50% 8%"

BASE = {"foto": FOTO, "foto_pos": POS_A, "foto_b": FOTO_B, "foto_b_pos": POS_B,
        "selo": SELO, "legenda_a": LEG_A, "legenda_b": LEG_B,
        # 60 px e o maior corpo em que "DEIXA DE SER EGOISTA" (20 caracteres)
        # ainda cabe em uma linha dentro de meio quadro: 20 x 0,46 x 60 = 552 px
        # de 604 uteis.
        #
        # E AINDA ASSIM ela nao se le aos 168 px do feed -- 60 px viram 7,9 px
        # de altura de letra. Isso e limite do desenho, nao ajuste que faltou:
        # meio quadro nao comporta texto grande. Por isso as variacoes com FAIXA
        # (V2, V8) sao as unicas que entregam leitura no feed; nelas a faixa faz
        # o trabalho de longe e a legenda recompensa quem abre grande.
        "legenda_corpo": "60px"}

VARIACOES = [
    ("V1", "Dois painéis + legenda por jogador",
     "O desenho pedido, no osso: uma frase embaixo de cada um, divisória branca "
     "no meio e nada mais. É o que menos disputa atenção com as próprias falas.",
     dict(BASE)),

    ("V2", "Legenda + faixa amarela no rodapé",
     "O padrão mais usado do nicho somado às legendas. A faixa identifica o "
     "canal de longe; as legendas dizem quem falou o quê.",
     dict(BASE, rodape1="A CASA CAIU NO {CRUZEIRO}", rodape_estilo="solida")),

    ("V3", "Legenda + etiqueta de origem",
     "A etiqueta vermelha declara que as falas vêm de leitura labial. É a única "
     "variação em que a ressalva está DENTRO da thumb, e não só no vídeo.",
     dict(BASE, etiqueta=ORIGEM, etiqueta_estilo="caixa")),

    ("V4", "Legenda + faixa no topo",
     "A tensão em cima, as falas embaixo: o olho pega a promessa antes de ler "
     "as citações. Dá duas chances de o espectador entender o vídeo.",
     dict(BASE, topo1="BRIGA PELO {PÊNALTI}", topo_estilo="escura")),

    ("V5", "Legenda + amarelo no Kaio",
     "Uma das duas frases em âmbar. A regra do amarelo diz uma coisa por thumb "
     "— aqui ela aponta quem tomou a bola, que é o sujeito do título.",
     dict(BASE, legenda_destaque="a", etiqueta=ORIGEM,
          etiqueta_estilo="amarela")),

    ("V6", "Legenda + moldura da marca",
     "A moldura amarela é a assinatura do canal: mesmo cortada no feed, o olho "
     "reconhece de quem é a thumb antes de ler qualquer palavra.",
     dict(BASE, moldura=True, selo_baixo=True)),

    ("V7", "Legenda + círculo no dedo",
     "O círculo dirige o olho para o gesto, que é o que o título promete. "
     "Menos agressivo que o X, e aqui não há nada a negar.",
     dict(BASE, marcador="circulo", marcador_x="62%", marcador_y="52%",
          etiqueta=ORIGEM, etiqueta_estilo="caixa")),

    ("V8", "Legenda + faixa diagonal",
     "A mesma faixa, inclinada. Quebra a horizontalidade da fileira de "
     "sugeridos, onde toda thumb concorrente é reta.",
     dict(BASE, rodape1="A CASA CAIU NO {CRUZEIRO}", rodape_estilo="solida",
          diagonal=True)),

    ("V9", "Sem legenda — o desenho aprovado em 06/09",
     "A referência: faixa verde no topo, copy única embaixo. Está aqui para "
     "comparar o desenho novo com o que já foi aprovado.",
     {"foto": FOTO_INT, "foto_pos": "40% 30%", "selo": SELO,
      "topo1": "BRIGA PELO {PÊNALTI}", "topo_estilo": "escura",
      "rodape1": "E O DEDO {SUBIU}", "rodape_estilo": "solida"}),
]


def _b64(d):
    return base64.urlsafe_b64encode(
        json.dumps(d, ensure_ascii=False).encode("utf-8")).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so")
    a = ap.parse_args()

    from playwright.sync_api import sync_playwright
    saida = os.path.join(AQUI, "variacoes")
    os.makedirs(saida, exist_ok=True)
    alvo = [v for v in VARIACOES if not a.so or v[0] == a.so]

    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        pg = nav.new_page(viewport={"width": 1280, "height": 720})
        for cod, nome, _, d in alvo:
            pg.goto("file:///%s?d=%s" % (TPL.replace("\\", "/"), _b64(d)))
            pg.wait_for_timeout(1200)
            try:
                pg.wait_for_function(
                    "[...document.images].every(i=>i.complete)", timeout=8000)
            except Exception:
                pass
            pg.locator("#alvo").screenshot(path=os.path.join(saida, "%s.png" % cod))
            print("  %-4s %s" % (cod, nome))
        nav.close()

    _folha(alvo, saida)
    print("\n%d variações em 01-embalagem/variacoes/" % len(alvo))
    return 0


def _folha(vars_, saida):
    """A folha de validacao: cada variacao em tamanho real E aos 168 px, com o
    titulo cortado no caractere 55, que e como o feed do celular mostra."""
    corte = TITULO[:55] + "…"
    cards = []
    for cod, nome, porque, _ in vars_:
        cards.append("""
<article class="e">
  <div class="cab"><span class="cod">%s</span><h2>%s</h2></div>
  <div class="par">
    <img class="big" src="%s.png" alt="">
    <div class="mini"><img src="%s.png" alt="">
      <div class="tt">%s</div>
      <div class="mt">Bora de Bola · 12 mil visualizações</div>
    </div>
  </div>
  <p class="pq">%s</p>
</article>""" % (cod, nome, cod, cod, corte, porque))

    html = """<meta charset="utf-8"><title>Variações de thumb — 07/09</title>
<style>
 :root{--fundo:#0C240C;--prof:#080f08;--am:#FCCC0C;--tinta:#eef3ee;--fraca:#93a893;--linha:#1d3a1d}
 *{margin:0;padding:0;box-sizing:border-box}
 body{background:var(--prof);color:var(--tinta);font:400 15px/1.65 "Segoe UI",system-ui,sans-serif;padding:38px}
 h1{font-size:31px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
 .sub{color:var(--fraca);max-width:80ch;margin-bottom:14px}
 .copy{border-left:3px solid var(--am);padding:10px 16px;margin-bottom:14px;
       background:rgba(252,204,12,.06);max-width:80ch}
 .copy b{color:var(--am)}
 .aviso{border-left:3px solid #E02020;padding:10px 16px;margin-bottom:30px;
        background:rgba(224,32,32,.08);max-width:80ch}
 .e{border:1px solid var(--linha);border-radius:14px;background:var(--fundo);padding:20px;margin-bottom:22px}
 .cab{display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
 .cod{font:800 12px/1 ui-monospace,monospace;letter-spacing:.12em;color:var(--am);
      border:1px solid #4a4110;padding:6px 9px;border-radius:5px}
 h2{font-size:19px;font-weight:700}
 .par{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
 .big{width:600px;border-radius:8px;display:block}
 .mini{width:168px}
 .mini img{width:168px;height:94px;object-fit:cover;border-radius:6px;display:block}
 .mini .tt{font:600 13px/1.3 "Segoe UI",sans-serif;margin-top:6px;color:#fff}
 .mini .mt{color:var(--fraca);font-size:11px;margin-top:3px}
 .pq{color:var(--fraca);margin-top:14px;max-width:90ch;font-size:14.5px}
</style>
<h1>Variações de thumb — 07/09, a treta do pênalti</h1>
<p class="sub">A copy é a mesma nas nove. O que muda é o desenho — comparar
estilo com copy diferente compara copy, não estilo. A miniatura ao lado é
168&nbsp;px, o tamanho real no feed do celular, com o título cortado no 55.</p>
<div class="copy"><b>Título:</b> %s<br><b>Kaio Jorge:</b> %s &nbsp;·&nbsp;
<b>Matheus Pereira:</b> %s</div>
<div class="aviso"><b>Sobre a copy do Matheus.</b> Você pediu “mostrou o dedo do
meio e mandou a merda”. Nenhuma fonte sustenta isso: o ge registra que ele
“chega a levantar o dedo”, sem dizer qual, e não há registro de xingamento.
Troquei pela fala da mesma leitura labial que o título já promete — fica
simétrica com a do Kaio e as duas existem na fonte.</div>
%s""" % (TITULO, LEG_A, LEG_B, "\n".join(cards))
    with open(os.path.join(saida, "VARIACOES.html"), "w", encoding="utf-8") as f:
        f.write(html)


if __name__ == "__main__":
    sys.exit(main())
