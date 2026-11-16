# -*- coding: utf-8 -*-
"""Catalogo de estilos de thumb do canal estoico — a MESMA copy em 5 desenhos.

POR QUE A COPY FICA TRAVADA
  Comparar estilo com copy diferente nao compara estilo, compara copy. Aqui o
  titulo, o texto da thumb E A FOTO sao os mesmos nos cinco; o que varia e so o
  desenho. A foto tambem entra na trava — trocar de imagem entre estilos faria a
  escolha ser sobre qual busto ficou mais bonito.

POR QUE ISSO E DIFERENTE DO CATALOGO DE FUTEBOL
  Nao e o mesmo desenho com outra cor. Os cinco prints do nicho estoico nao tem
  faixa chapada, nem X, nem etiqueta, nem emoji — tem marmore, dourado e
  silencio. As regras derivadas dos prints estao em `../PADRAO-VISUAL.md`.

O QUE A FOLHA DE VALIDACAO MOSTRA, E POR QUE
  Cada candidato aparece grande (para conferir o desenho) e a 168px ao lado do
  titulo cortado no caractere 55 (para conferir o que a pessoa VAI ver). Aprovar
  thumb olhando ela grande foi como o canal foi ao ar com 50% de repeticao entre
  titulo e thumb e CTR de 2,4%.

Uso:
    python catalogo_estilos.py
    python catalogo_estilos.py --so E2
"""
import argparse
import base64
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "apps", "regra-de-3"))
import pilares  # noqa: E402

# A imagem vem do proprio pack do episodio (img 08 do LA3). Nao ha download de
# fonte externa: a capa usa o mesmo marmore que o video, que e o que faz capa e
# conteudo parecerem a mesma peca.
FOTO_REL = os.path.join(
    RAIZ, "outputs", "canal-estoico", "video-plans", "LA3-tempo",
    "Materiais Brutos", "08-busto-frontal-sombra-dura_00001_.png")


def _f(p):
    return "file:///" + os.path.abspath(p).replace("\\", "/")


# ─────────────────────────────────────────────────────────────────────────────
# A COPY TRAVADA
#   Titulo escolhido pelo pontuador (100/100, risco A, tres pilares antes do
#   caractere 55). A thumb diz o que o titulo NAO disse: o titulo vende o prazo
#   e o ganho; a thumb mata a objecao — "nenhuma delas e acordar cedo".
#   Repeticao medida: 0%.
# ─────────────────────────────────────────────────────────────────────────────
TITULO = ("EM 7 DIAS VOCÊ RECUPERA HORAS QUE NINGUÉM TE DEVOLVE "
          "| 6 práticas estoicas sobre o tempo")
L_APOIO = "_NENHUMA DELAS É"
L_CHAVE = "{ACORDAR CEDO}"
THUMB_TXT = "NENHUMA DELAS É ACORDAR CEDO"
ASSINATURA = "MODERN ESTOICISM"

# Os candidatos que disputaram o titulo. Eles vao para a folha porque quem
# aprova precisa ver o que PERDEU e por que — aprovar o vencedor sozinho e
# aprovar sem alternativa. A nota nao esta escrita aqui: e calculada na hora
# pelo pontuador, para o documento nunca divergir do codigo.
CANDIDATOS = [
    ("C1", "EM 7 DIAS VOCÊ RECUPERA HORAS QUE NINGUÉM TE DEVOLVE "
           "| 6 práticas estoicas sobre o tempo", "recomendado"),
    ("C2", "QUANTO DO SEU DIA NÃO É SEU? em 7 dias você recupera horas "
           "| práticas estoicas sobre o tempo", "B1 — pergunta; o nicho pergunta pouco"),
    ("C3", "O QUE SÊNECA FAZIA TODO DIA PARA NÃO PERDER TEMPO "
           "— 6 práticas estoicas sobre o tempo",
           "nota cheia, mas afirma rotina de Sêneca que o roteiro não sustenta"),
    ("C4", "EM 7 DIAS: 6 práticas estoicas para o tempo que ninguém te ensina",
           "curto e limpo; não traz a frase-alvo inteira"),
    ("C5", "COMECE HOJE: 6 práticas estoicas para não perder mais o seu tempo",
           "idem C4, com imperativo no lugar do prazo"),
    ("C6", "EM 7 DIAS VOCÊ RECUPERA O TEMPO QUE NINGUÉM TE DEVOLVE",
           "cabe INTEIRO antes do corte; zero palavra de SEO — candidato a A/B"),
    ("C7", "EM 7 DIAS VOCÊ VÊ O QUE ROUBA AS SUAS HORAS "
           "— e recupera o que dá para recuperar", "perde um pilar depois do corte"),
    ("C8", "PARE DE PERDER O SEU DIA: em 7 dias você recupera horas "
           "que ninguém devolve", "perde um pilar depois do corte"),
    ("—", "6 RITUAIS SECRETOS QUE OS ESTÓICOS USAVAM PARA LIDAR COM A ANSIEDADE "
          "(EFEITO IMEDIATO)",
          "PUBLICADO — a régua aplicada ao que já está no ar (CTR 2,4%)"),
]

FRASE_ALVO = "práticas estoicas sobre o tempo"
DESCRICAO_150 = ("6 práticas estoicas sobre o tempo, cada uma com um desafio de "
                 "7 dias. Nenhuma delas é acordar mais cedo: todas são sobre "
                 "parar de perder o tempo que você já tem.")
TAGS = ("práticas estoicas sobre o tempo, estoicismo sobre o tempo, sêneca sobre "
        "o tempo, como não perder tempo estoicismo, sêneca a brevidade da vida, "
        "marco aurélio tempo, filosofia estoica tempo, como organizar o tempo "
        "estoicismo, parar de procrastinar estoicismo, adiamento sêneca, "
        "reflexões estoicas, práticas estoicas, hábitos estoicos, estoicismo "
        "diário, cartas a lucílio, sêneca, marco aurélio, epicteto, estoicismo")

# ENQUADRAMENTO — os numeros nao sao gosto, sao conta.
#   A imagem e 1344x768 e o busto tem o centro em ~49% da largura. Com
#   `foto_escala=132`, a imagem renderizada tem 1663px de largura sobre um
#   quadro de 1280 — sobram ~383px para deslocar.
#     figura a ESQUERDA (30% do quadro):  left = 384 - 815  = -431px = -34%
#     figura a DIREITA, espelhada (70%):  left = 896 - 848  =  +48px =  +4%
#   Espelhar inverte em torno do centro da IMAGEM, entao o segundo numero e
#   calculado sobre a posicao ja invertida (1663 - 815 = 848). Sem refazer essa
#   conta, o busto espelhado fica no mesmo lugar.
ESQ = dict(foto_escala=132, foto_x="-34%", foto_y="-13%")
DIR = dict(foto_escala=132, foto_x="4%",  foto_y="-13%", espelha=True)
FUNDO = dict(foto_escala=118, foto_x="-7%", foto_y="-9%")

BASE = dict(foto=_f(FOTO_REL), assinatura=ASSINATURA)

ESTILOS = [
    # ── E1 ───────────────────────────────────────────────────────────────
    ("E1", "Sans monumental · figura à esquerda",
     "O desenho mais comum do nicho (print 91). Anton pesado, texto encostado "
     "à esquerda do bloco direito, uma linha dourada e nada mais. É o que menos "
     "depende da foto — funciona com qualquer busto.",
     dict(BASE, **ESQ, lado="esq", familia="sans", linhas=[L_APOIO, L_CHAVE])),

    # ── E2 ───────────────────────────────────────────────────────────────
    ("E2", "Serifada clássica · figura à direita",
     "O registro de The Stoic Mode (prints 94/95): Playfair 900, figura à "
     "direita olhando para o texto. A serifada envelhece a peça de propósito — "
     "é a diferença entre 'dica' e 'doutrina'.",
     dict(BASE, **DIR, lado="dir", familia="serifada", linhas=[L_APOIO, L_CHAVE])),

    # ── E3 ───────────────────────────────────────────────────────────────
    ("E3", "Sans com filete dourado",
     "O E1 com o risco dourado sob a linha-chave, como o print 92. O filete dá "
     "chão para o texto que flutua sobre o mármore e reforça o dourado sem "
     "gastar uma segunda palavra nele.",
     dict(BASE, **ESQ, lado="esq", familia="sans", filete=True,
          linhas=[L_APOIO, L_CHAVE])),

    # ── E4 ───────────────────────────────────────────────────────────────
    ("E4", "Serifada em três linhas · palavra dourada isolada",
     "Quebra a chave em duas para a palavra dourada ficar sozinha na linha — é "
     "o desenho do print 93 ('VIDA / SIMPLE'). A palavra isolada é a que mais "
     "sobrevive à redução a 168px.",
     dict(BASE, **DIR, lado="dir", familia="serifada",
          linhas=["_NENHUMA DELAS", "É ACORDAR#g2", "{CEDO}#g0"])),

    # ── E5 ───────────────────────────────────────────────────────────────
    ("E5", "Centralizada · figura ao fundo",
     "Sem divisão de lados: o mármore vira fundo velado e o texto ocupa o "
     "centro. É a mais legível aos 168px e a que menos mostra a imagem — serve "
     "de controle para saber quanto a figura de fato contribui.",
     dict(BASE, **FUNDO, lado="fundo", familia="serifada",
          linhas=[L_APOIO, L_CHAVE])),
]


def _b64(d):
    return base64.b64encode(json.dumps(d, ensure_ascii=False).encode()).decode()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--so", help="renderiza só um código (E1, E2, …)")
    ap.add_argument("--saida", default=os.path.join(AQUI, "..", "estilos"))
    a = ap.parse_args()

    if not os.path.isfile(FOTO_REL):
        print("ERRO: a imagem de fundo não existe — %s" % FOTO_REL)
        return 2
    # Sem `fontes.css` o Chromium cai no fallback e a peça sai com outra
    # tipografia; regenerar é barato e evita aprovar uma fonte que não é a nossa.
    if not os.path.isfile(os.path.join(AQUI, "fontes.css")):
        import fontes
        print("fontes.css ausente — gerando")
        fontes.gera()

    from playwright.sync_api import sync_playwright
    saida = os.path.abspath(a.saida)
    os.makedirs(saida, exist_ok=True)
    alvo = [e for e in ESTILOS if not a.so or e[0] == a.so]
    tpl = os.path.join(AQUI, "estilos.html").replace("\\", "/")

    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        pg = nav.new_page(viewport={"width": 1280, "height": 720},
                          device_scale_factor=1)
        for cod, nome, _, d in alvo:
            pg.goto("file:///%s?d=%s" % (tpl, _b64(d)))
            # Duas esperas diferentes: a imagem é um <img> (document.images) e a
            # fonte é base64 no CSS (document.fonts). Esperar só a imagem já
            # produziu PNG com fonte de fallback.
            try:
                pg.wait_for_function(
                    "document.fonts.status==='loaded' && "
                    "[...document.images].every(i=>i.complete && i.naturalWidth>0)",
                    timeout=10000)
            except Exception:
                print("  aviso: %s — espera de fonte/imagem estourou" % cod)
            pg.wait_for_timeout(250)
            pg.locator("#alvo").screenshot(path=os.path.join(saida, "%s.png" % cod))
            print("  %-4s %s" % (cod, nome))
        nav.close()

    p = _folha(alvo, saida)
    print("\n%d estilos em %s" % (len(alvo), saida))
    print("folha de validação: %s" % p)
    return 0


def _folha(estilos, saida):
    """Tamanho real + 168px ao lado do título cortado + o relatório do pontuador."""
    a = pilares.analisa(TITULO, THUMB_TXT)
    corte = TITULO[:pilares.CORTE_FEED]
    rel = pilares.relatorio(a)

    # Tabela de candidatos — pontuada AGORA, não copiada de um documento. Nota
    # transcrita à mão envelhece na primeira mudança do léxico e ninguém percebe.
    linhas_c = []
    for cod, txt, obs in CANDIDATOS:
        d = pilares.analisa(txt, THUMB_TXT)
        vis = d["pilares_antes_do_corte"]
        alerta = "" if vis == 3 else " class='mau'"
        linhas_c.append(
            "<tr%s><td class='cod2'>%s</td><td class='tit'>%s<span class='corte'>"
            "%s</span></td><td>%d</td><td>%d/100</td><td>%s</td><td>%d/3</td>"
            "<td class='obs'>%s</td></tr>"
            % (alerta, cod, txt[:pilares.CORTE_FEED],
               txt[pilares.CORTE_FEED:], d["caracteres"], d["nota"], d["risco"],
               vis, obs))
    tabela = "".join(linhas_c)

    seo = """
<h2 class="sec">Pacote de SEO</h2>
<p class="sub">Sem dado de volume de busca — não há ferramenta de SEO configurada
neste repositório. As palavras vêm da <b>observação dos títulos dos canais de
referência</b>, não de medição.</p>
<table class="seo">
 <tr><th>Frase-alvo</th><td><code>%s</code><br>
   <span class="obs">tem de aparecer no título, nos primeiros 150 caracteres da
   descrição e na primeira tag — está nos três.</span></td></tr>
 <tr><th>Descrição<br><span class="obs">primeiros 150</span></th>
   <td><code>%s</code><br><span class="obs">%d caracteres; o corte da busca cai
   dentro da segunda frase.</span></td></tr>
 <tr><th>Tags</th><td><code>%s</code><br>
   <span class="obs">%d tags · %d caracteres · da mais específica para a mais
   genérica.</span></td></tr>
</table>
<p class="sub">Descrição completa, capítulos e fontes:
<code>apps/canal-estoico/EMBALAGEM-LA3-tempo.md</code></p>
""" % (FRASE_ALVO, DESCRICAO_150, len(DESCRICAO_150), TAGS,
       TAGS.count(",") + 1, len(TAGS))

    cards = []
    for cod, nome, porque, _ in estilos:
        cards.append("""
<article class="e">
  <div class="cab"><span class="cod">%s</span><h2>%s</h2></div>
  <div class="par">
    <img class="big" src="%s.png" alt="">
    <div class="feed">
      <div class="fake"><img src="%s.png" alt="">
        <div class="tt">%s…</div>
        <div class="mt">Modern Estoicism · 12 mil visualizações · há 2 dias</div>
      </div>
      <p class="nota">168&nbsp;px — o tamanho real no feed do celular.<br>
      Se a linha dourada não se lê aqui, ela não existe.</p>
    </div>
  </div>
  <p class="pq">%s</p>
</article>""" % (cod, nome, cod, cod, corte, porque))

    html = """<meta charset="utf-8"><title>Estilos de thumb — canal estoico</title>
<style>
 :root{--prof:#0A0908;--fundo:#12100D;--ouro:#E3B04B;--tinta:#F4EFE6;
       --fraca:#9a9086;--linha:#2a241c}
 *{margin:0;padding:0;box-sizing:border-box}
 body{background:var(--prof);color:var(--tinta);
      font:400 15px/1.65 "Segoe UI",system-ui,sans-serif;padding:38px}
 h1{font-size:31px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
 .sub{color:var(--fraca);max-width:80ch;margin-bottom:16px}
 .copy{border-left:3px solid var(--ouro);padding:12px 16px;margin-bottom:14px;
       background:rgba(227,176,75,.06);max-width:80ch}
 .copy b{color:var(--ouro)}
 pre.rel{background:#080706;border:1px solid var(--linha);border-radius:10px;
     padding:16px 18px;margin-bottom:30px;max-width:80ch;overflow-x:auto;
     font:400 13px/1.6 ui-monospace,Consolas,monospace;color:#cfc6b8}
 .e{border:1px solid var(--linha);border-radius:14px;background:var(--fundo);
    padding:20px;margin-bottom:22px}
 .cab{display:flex;align-items:baseline;gap:12px;margin-bottom:14px}
 .cod{font:800 12px/1 ui-monospace,monospace;letter-spacing:.12em;color:var(--ouro);
      border:1px solid #4a3d1e;padding:6px 9px;border-radius:5px}
 h2{font-size:19px;font-weight:700;letter-spacing:-.01em}
 .par{display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap}
 .big{width:620px;border-radius:8px;display:block}
 .feed{width:200px}
 .fake{width:168px}
 .fake img{width:168px;height:94px;object-fit:cover;border-radius:6px;display:block}
 .fake .tt{font:600 13px/1.3 "Segoe UI",sans-serif;margin-top:6px;color:#fff}
 .fake .mt{color:var(--fraca);font-size:11px;margin-top:3px}
 .nota{color:var(--fraca);font-size:12px;margin-top:14px;line-height:1.5}
 .pq{color:var(--fraca);margin-top:16px;max-width:92ch;font-size:14.5px}
 .sec{font-size:23px;margin:38px 0 8px;border-top:1px solid var(--linha);padding-top:26px}
 table{border-collapse:collapse;width:100%%;margin-bottom:26px;font-size:13.5px}
 th,td{text-align:left;padding:9px 11px;border-bottom:1px solid var(--linha);
       vertical-align:top}
 th{color:var(--fraca);font-weight:600;font-size:12px;text-transform:uppercase;
    letter-spacing:.06em}
 .cod2{font:800 12px ui-monospace,monospace;color:var(--ouro)}
 .tit{max-width:46ch}
 /* O trecho DEPOIS do caractere 55 aparece apagado: é o que o feed não mostra.
    Ver o corte é mais convincente que ler que ele existe. */
 .corte{color:#5d564d}
 tr.mau td{background:rgba(180,60,40,.10)}
 .obs{color:var(--fraca);font-size:12.5px}
 table.seo th{width:170px}
 code{font:400 13px/1.55 ui-monospace,Consolas,monospace;color:#e6dccb;
      background:#080706;border:1px solid var(--linha);border-radius:6px;
      padding:8px 10px;display:block;white-space:pre-wrap}
</style>
<h1>Embalagem — LA3 · "O tempo que ainda sobra"</h1>
<p class="sub">Canal Modern Estoicism. Título, thumb e SEO na mesma folha, porque
são a mesma decisão. O gate é a coluna <b>pilares antes do corte</b>: pilar
depois do caractere 55 existe no analytics e não existe para quem rola a tela.</p>
<div class="copy"><b>Título:</b> %s<br><b>Thumb:</b> %s</div>
<pre class="rel">%s</pre>

<h2 class="sec">Candidatos de título</h2>
<p class="sub">Pontuados na hora por <code style="display:inline;padding:2px 6px">
apps/regra-de-3/pilares.py</code>. A parte apagada do título é o que o feed corta.</p>
<table>
 <tr><th></th><th>Título</th><th>Car.</th><th>Nota</th><th>Risco</th>
     <th>Pilares<br>antes do corte</th><th>Observação</th></tr>
 %s
</table>
%s

<h2 class="sec">Estilos de thumb</h2>
<p class="sub">A mesma copy <b>e a mesma foto</b> nos cinco desenhos. Comparar
estilo com copy diferente não compara estilo — compara copy. Cada um aparece
grande e a <b>168&nbsp;px</b>, que é o tamanho do feed.</p>
%s""" % (TITULO, THUMB_TXT, rel, tabela, seo, "".join(cards))

    caminho = os.path.join(saida, "FOLHA-DE-VALIDACAO.html")
    with open(caminho, "w", encoding="utf-8") as f:
        f.write(html)
    return caminho


if __name__ == "__main__":
    sys.exit(main())
