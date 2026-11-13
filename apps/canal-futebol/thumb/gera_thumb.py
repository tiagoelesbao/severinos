# -*- coding: utf-8 -*-
"""Gera a thumb e a FOLHA DE VALIDACAO — o que o founder aprova antes do roteiro.

O QUE E UM "OUTPUT VALIDADOR"
  Nao e a thumb bonita em 1280x720. E a thumb do jeito que ela vai ser VISTA:
  numa fileira de sugeridos, com 168px de largura, ao lado do titulo cortado no
  caractere 55. Aprovar thumb olhando ela grande e aprovar uma coisa que ninguem
  vai ver — foi assim que o canal estoico foi ao ar com 50% de repeticao entre
  titulo e thumb e CTR de 2,4%.

  Entao a folha traz, para cada candidato:
    · a thumb em tamanho real, para conferir o desenho
    · a MESMA thumb a 168px, ao lado do titulo cortado, como no feed
    · o relatorio do pontuador: pilares, corte, repeticao, risco

  E traz os candidatos LADO A LADO, porque escolher embalagem e comparar, nao
  contemplar.

Uso:
    python gera_thumb.py candidatos.json
    python gera_thumb.py candidatos.json --saida ./saida
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

TEMPLATE = os.path.join(AQUI, "template.html")
CANAL = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                     "creative-studio", "canais", "bora-de-bola")


def _b64(d):
    return base64.b64encode(json.dumps(d, ensure_ascii=False).encode("utf-8")).decode()


def _absolutiza(d, base):
    """Caminho local vira file:// absoluto.

    O JSON traz caminhos relativos a ELE, mas a pagina abre por file:// a partir
    da pasta do template — o navegador resolvia contra o template e o selo saia
    como imagem quebrada. Resolver aqui, onde se sabe de onde o JSON veio.
    """
    for k, v in list(d.items()):
        if not isinstance(v, str) or v.startswith(("http://", "https://", "data:")):
            continue
        if not any(v.lower().endswith(e) for e in (".png", ".jpg", ".jpeg", ".webp", ".svg")):
            continue
        caminho = os.path.abspath(os.path.join(base, v))
        if os.path.isfile(caminho):
            d[k] = "file:///" + caminho.replace("\\", "/")
        else:
            print("  aviso: imagem não encontrada — %s" % v)
            d[k] = ""
    return d


def renderiza(cands, saida, base_json="."):
    """Uma PNG por candidato, 1280x720, pelo mesmo caminho do render service."""
    from playwright.sync_api import sync_playwright
    os.makedirs(saida, exist_ok=True)
    for c in cands:
        _absolutiza(c["thumb"], base_json)
    feitas = []
    with sync_playwright() as pw:
        nav = pw.chromium.launch()
        pg = nav.new_page(viewport={"width": 1280, "height": 720},
                          device_scale_factor=1)
        for i, c in enumerate(cands, 1):
            url = "file:///%s?d=%s" % (TEMPLATE.replace("\\", "/"), _b64(c["thumb"]))
            pg.goto(url)
            # As imagens vêm de CDN; sem esperar, a thumb sai com o quadro vazio
            # onde deveria estar o escudo — e o defeito só aparece no PNG.
            pg.wait_for_timeout(1800)
            try:
                pg.wait_for_function(
                    "[...document.images].every(i => i.complete)", timeout=8000)
            except Exception:
                pass
            arq = os.path.join(saida, "thumb-%02d.png" % i)
            pg.locator("#alvo").screenshot(path=arq)
            c["_png"] = os.path.basename(arq)
            feitas.append(arq)
        nav.close()
    return feitas


def folha(cands, saida):
    """A folha de validação: tamanho real + como aparece no feed + o relatório."""
    linhas = []
    for i, c in enumerate(cands, 1):
        a = pilares.analisa(c["titulo"], c["thumb_texto"], c.get("verificado") or [])
        c["_analise"] = a
        cortado = c["titulo"][:pilares.CORTE_FEED]
        sobrou = c["titulo"][pilares.CORTE_FEED:]
        pil = []
        for rot, ch in (("imediatismo", "imediatismo"), ("curiosidade", "curiosidade"),
                        ("resolução", "resolucao")):
            tem, ach = a[ch]
            visivel = pilares._acha(cortado, getattr(pilares, ch.upper()))[0]
            estado = "ok" if (tem and visivel) else ("corte" if tem else "falta")
            pil.append('<span class="p %s">%s</span>' % (estado, rot))
        risco_cls = "bom" if a["risco"] in ("A", "B1", "B2") else "ruim"
        avisos = "".join('<li>%s</li>' % m for m in a["motivos_de_risco"])
        rep = a["repeticao_thumb"]
        rep_txt = ("%.0f%%" % (rep * 100)) if rep is not None else "—"
        rep_cls = "ok" if (rep is not None and rep < 0.35) else "falta"

        linhas.append("""
<article class="cand">
  <header>
    <span class="n">%d</span>
    <span class="nota %s">%d</span>
    <span class="risco %s">risco %s</span>
    <span class="car">%d caracteres</span>
  </header>

  <div class="par">
    <figure class="real">
      <img src="%s" alt="">
      <figcaption>1280 × 720 — o desenho</figcaption>
    </figure>

    <figure class="feed">
      <div class="fake">
        <img src="%s" alt="">
        <div class="tt">%s<span class="cut">%s</span></div>
        <div class="meta">Bora de Bola · 12 mil visualizações · há 2 horas</div>
      </div>
      <figcaption>168 px — como aparece no feed</figcaption>
    </figure>
  </div>

  <div class="dados">
    <div class="tit">%s</div>
    <div class="thb">thumb: <b>%s</b></div>
    <div class="pilares">%s</div>
    <div class="linhas">
      <span>repetição da thumb <b class="%s">%s</b></span>
      <span>pilares antes do corte <b>%d de %d</b></span>
    </div>
    %s
  </div>
</article>""" % (
            i, "bom" if a["nota"] >= 70 else "ruim", a["nota"],
            risco_cls, a["risco"], a["caracteres"],
            c["_png"], c["_png"],
            cortado, ("…" if sobrou else ""),
            c["titulo"], c["thumb_texto"],
            "".join(pil), rep_cls, rep_txt,
            a["pilares_antes_do_corte"], a["pilares"],
            ('<ul class="avisos">%s</ul>' % avisos) if avisos else ""))

    html = """<meta charset="utf-8">
<title>Validação de embalagem — Bora de Bola</title>
<style>
  :root {
    --fundo:#0C240C; --prof:#080f08; --amarelo:#FCCC0C; --tinta:#eef3ee;
    --fraca:#93a893; --linha:#1d3a1d; --ok:#5fd35f; --ruim:#e05a5a;
  }
  *{margin:0;padding:0;box-sizing:border-box}
  body{background:var(--prof);color:var(--tinta);
       font:400 15px/1.6 "Segoe UI",system-ui,sans-serif;padding:38px}
  h1{font-size:30px;font-weight:800;letter-spacing:-.02em;margin-bottom:6px}
  .sub{color:var(--fraca);max-width:74ch;margin-bottom:30px}
  .cand{border:1px solid var(--linha);border-radius:14px;background:var(--fundo);
        padding:22px;margin-bottom:26px}
  header{display:flex;align-items:center;gap:14px;margin-bottom:18px}
  .n{width:28px;height:28px;border-radius:50%%;background:#122b12;
     display:grid;place-items:center;font-weight:700;font-size:13px}
  .nota{font:800 22px/1 ui-monospace,monospace}
  .nota.bom{color:var(--ok)} .nota.ruim{color:var(--ruim)}
  .risco{font:700 11px/1 ui-monospace,monospace;letter-spacing:.12em;
         text-transform:uppercase;padding:5px 10px;border-radius:20px;
         border:1px solid var(--linha)}
  .risco.bom{color:var(--ok)} .risco.ruim{color:var(--ruim);border-color:var(--ruim)}
  .car{color:var(--fraca);font-size:13px;margin-left:auto;
       font-variant-numeric:tabular-nums}
  .par{display:flex;gap:26px;align-items:flex-start;flex-wrap:wrap}
  figure{display:flex;flex-direction:column;gap:8px}
  figcaption{color:var(--fraca);font-size:12px;letter-spacing:.04em}
  .real img{width:560px;border-radius:8px;display:block}
  .fake{width:168px}
  .fake img{width:168px;height:94px;object-fit:cover;border-radius:6px;display:block}
  .fake .tt{font:600 13px/1.3 "Segoe UI",sans-serif;margin-top:6px;
            color:#fff;letter-spacing:-.01em}
  .fake .cut{color:var(--fraca)}
  .fake .meta{color:var(--fraca);font-size:11px;margin-top:3px}
  .dados{margin-top:18px;padding-top:16px;border-top:1px solid var(--linha)}
  .tit{font-size:17px;font-weight:600;margin-bottom:4px}
  .thb{color:var(--fraca);font-size:14px;margin-bottom:12px}
  .thb b{color:var(--amarelo)}
  .pilares{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px}
  .p{font:700 10.5px/1 ui-monospace,monospace;letter-spacing:.1em;
     text-transform:uppercase;padding:6px 11px;border-radius:5px;
     border:1px solid var(--linha)}
  .p.ok{color:var(--ok);border-color:#255025}
  .p.corte{color:var(--amarelo);border-color:#4a4110}
  .p.falta{color:var(--ruim);border-color:#4a1a1a;text-decoration:line-through}
  .linhas{display:flex;gap:22px;color:var(--fraca);font-size:13px}
  .linhas b.ok{color:var(--ok)} .linhas b.falta{color:var(--ruim)}
  .avisos{margin-top:12px;padding-left:18px;color:var(--amarelo);font-size:13px}
</style>
<h1>Validação de embalagem</h1>
<p class="sub">Cada candidato aparece duas vezes: em tamanho real, para conferir o
desenho, e a <b>168&nbsp;px</b> ao lado do título cortado no caractere 55 — que é
como ele chega a quem rola o feed. Aprovar olhando só a versão grande é aprovar
uma coisa que ninguém vai ver.</p>
%s
""" % "".join(linhas)

    p = os.path.join(saida, "VALIDACAO.html")
    with open(p, "w", encoding="utf-8") as f:
        f.write(html)
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("candidatos")
    ap.add_argument("--saida", default=None)
    a = ap.parse_args()

    cands = json.load(open(a.candidatos, encoding="utf-8"))
    saida = a.saida or os.path.join(os.path.dirname(os.path.abspath(a.candidatos)),
                                    "validacao")
    print("renderizando %d candidatos..." % len(cands), flush=True)
    renderiza(cands, saida, os.path.dirname(os.path.abspath(a.candidatos)))
    p = folha(cands, saida)
    print("\n%-4s %-6s %-6s %s" % ("NOTA", "RISCO", "CARAC", "TÍTULO"))
    print("─" * 96)
    for c in cands:
        a_ = c["_analise"]
        print("%-4d %-6s %-6d %s" % (a_["nota"], a_["risco"], a_["caracteres"],
                                     c["titulo"][:62]))
    print("\nfolha de validação: %s" % p)
    return 0


if __name__ == "__main__":
    sys.exit(main())
