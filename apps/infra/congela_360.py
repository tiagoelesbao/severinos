# -*- coding: utf-8 -*-
"""Troca a GERACAO do panorama por um arquivo ja aprovado.

POR QUE CONGELAR
  Depois que um panorama e aprovado, gerar de novo nao e so desperdicio -- e
  risco. A semente e fixa, mas qualquer mexida no prompt, nos angulos dos
  setores ou nos passos devolve OUTRO lugar. E ai os seis takes deixam de ser
  o mesmo lugar da rodada anterior, que e exatamente o que o panorama existe
  para garantir.

  Congelado, testar um take passa a custar so o IMAGE GEN.

POR QUE UM SCRIPT A PARTE, E NAO UMA FLAG NO GERADOR
  O `insere_360_no_movie.py` funciona e monta uma cadeia longa (texto -> placa
  -> refino -> emenda). Enfiar um desvio no meio dele significa reescrever a
  funcao que produz tudo isso. Este script age DEPOIS, sobre o JSON pronto:
  acrescenta um `LoadImage`, reaponta o `SetNode AMBIENTE_360` para ele, e poe
  a cadeia velha em bypass. Nada e apagado e `--descongelar` volta atras.

O QUE ELE NAO FAZ, DE PROPOSITO
  Nao redimensiona e nao refina. O `--foto` do gerador passa a imagem por um
  resize e por um sampler com denoise 0,40 -- o que serve para uma placa crua
  e nao serve para uma imagem aprovada: 0,40 de denoise redesenha textura, e
  textura redesenhada e outra imagem. Congelado quer dizer congelado.

USO
    python congela_360.py --imagem pano-sp-aprovado.png
    python congela_360.py --descongelar
"""
import argparse
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
WF = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio", "assets",
                  "comfyui", "workflows")
ENTRADA = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\input"

# os grupos que produzem o panorama -- sao estes que saem de cena
GRUPOS_GERACAO = ("Generate Set", "360 ENVIRONMENT", "SEAM KILLER",
                  "360 CONGELADO")
TITULO_LOAD = "PANORAMA APROVADO (congelado)"


def grupo_de(w, n):
    for g in w.get("groups", []):
        bx, by, bw, bh = g["bounding"]
        if bx <= n["pos"][0] <= bx + bw and by <= n["pos"][1] <= by + bh:
            return (g.get("title") or "").strip()
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default="MOVIE-BUILDER-IMPERIO.json")
    ap.add_argument("--imagem", default=None,
                    help="nome do PNG em ComfyUI/input com o panorama aprovado")
    ap.add_argument("--descongelar", action="store_true")
    a = ap.parse_args()

    caminho = os.path.join(WF, a.arquivo)
    w = json.load(io.open(caminho, encoding="utf-8"))
    ns = {n["id"]: n for n in w["nodes"]}
    links = {l[0]: l for l in w["links"] if isinstance(l, list)}

    # o Set que publica o panorama para os seis recortes
    setn = next((n for n in w["nodes"]
                 if n["type"] == "SetNode"
                 and (n.get("widgets_values") or [""])[0] == "AMBIENTE_360"), None)
    if setn is None:
        raise SystemExit("nao achei o Set_AMBIENTE_360 -- rode o insere_360 antes")

    antigo = next((n for n in w["nodes"]
                   if n["type"] == "LoadImage"
                   and TITULO_LOAD in (n.get("title") or "")), None)

    if a.descongelar:
        if antigo is None:
            print("nao estava congelado")
            return 0
        for n in w["nodes"]:
            if grupo_de(w, n) in GRUPOS_GERACAO and n["id"] != antigo["id"]:
                n["mode"] = 0
        print("cadeia de geracao religada -- o LoadImage continua no grafo, "
              "so deixou de alimentar o Set")
    else:
        if not a.imagem:
            raise SystemExit("informe --imagem NOME.png (o arquivo deve estar "
                             "em ComfyUI/input)")
        if not os.path.isfile(os.path.join(ENTRADA, a.imagem)):
            raise SystemExit("nao achei %s em %s" % (a.imagem, ENTRADA))

        if antigo is None:
            novo_id = max(n["id"] for n in w["nodes"]) + 1
            antigo = {
                "id": novo_id, "type": "LoadImage",
                "pos": [setn["pos"][0] - 520, setn["pos"][1] - 40],
                "size": [420, 460], "flags": {}, "order": 0, "mode": 0,
                "inputs": [],
                "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": []},
                            {"name": "MASK", "type": "MASK", "links": []}],
                "title": TITULO_LOAD,
                "properties": {"Node name for S&R": "LoadImage"},
                "widgets_values": [a.imagem, "image"],
            }
            w["nodes"].append(antigo)
            ns[novo_id] = antigo
            print("LoadImage criado (#%d)" % novo_id)
        else:
            antigo["widgets_values"][0] = a.imagem
            antigo["mode"] = 0
            print("LoadImage existente reaproveitado (#%d)" % antigo["id"])

        # reaponta a entrada do Set para o arquivo
        e = setn["inputs"][0]
        velho_link = e.get("link")
        if velho_link is not None and velho_link in links:
            l = links[velho_link]
            fonte = ns.get(l[1])
            if fonte:
                for s in fonte.get("outputs", []) or []:
                    if s.get("links"):
                        s["links"] = [x for x in s["links"] if x != velho_link]
            w["links"] = [x for x in w["links"]
                          if not (isinstance(x, list) and x[0] == velho_link)]
        novo_link = max([x[0] for x in w["links"] if isinstance(x, list)] or [0]) + 1
        w["links"].append([novo_link, antigo["id"], 0, setn["id"], 0, "IMAGE"])
        e["link"] = novo_link
        antigo["outputs"][0]["links"] = [novo_link]

        # a cadeia velha sai da execucao
        # O `Set_AMBIENTE_360` cai DENTRO da caixa de um dos grupos de geracao,
        # por posicao -- e grupo no ComfyUI e so um retangulo desenhado, nao
        # uma relacao real entre nos. Bypassar por grupo derruba ele junto, e
        # um Set em bypass nao publica nada: os seis recortes ficam sem fonte
        # e o grafo quebra sem dizer por que. Ele e o proprio ponto de entrega
        # da imagem congelada, entao e o unico que nunca pode sair.
        protegidos = {antigo["id"], setn["id"]}
        n_bypass = 0
        for n in w["nodes"]:
            if n["id"] in protegidos:
                n["mode"] = 0
                continue
            if grupo_de(w, n) in GRUPOS_GERACAO:
                n["mode"] = 4
                n_bypass += 1
        print("Set_AMBIENTE_360 <- %s" % a.imagem)
        print("%d no(s) da cadeia de geracao em bypass" % n_bypass)

    # conferencia
    links = {l[0]: l for l in w["links"] if isinstance(l, list)}
    ns = {n["id"]: n for n in w["nodes"]}
    ruins = 0
    for n in w["nodes"]:
        for i, e in enumerate(n.get("inputs", []) or []):
            lid = e.get("link")
            if lid is None:
                continue
            l = links.get(lid)
            if not l or l[3] != n["id"] or l[4] != i:
                print("   entrada torta em #%s.%s" % (n["id"], e["name"]))
                ruins += 1
    for lid, l in links.items():
        if l[1] not in ns or l[3] not in ns:
            print("   link %s fora do grafo" % lid)
            ruins += 1
    if ruins:
        print("GRAFO INCONSISTENTE - nao gravei")
        return 1

    io.open(caminho, "w", encoding="utf-8").write(
        json.dumps(w, ensure_ascii=False, indent=2))
    print("\n%d nos · %d links · 0 problema" % (len(w["nodes"]), len(w["links"])))
    print("→ %s" % caminho)
    return 0


if __name__ == "__main__":
    sys.exit(main())
