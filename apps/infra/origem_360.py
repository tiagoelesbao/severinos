# -*- coding: utf-8 -*-
"""Escolhe DE ONDE vem o ambiente 360, sem regerar o grafo.

AS TRES ROTAS
    texto    o lugar nasce do prompt         `Generate Set`
    foto     o lugar vem de uma foto real    `Generate Set · DA FOTO`
    pronto   um panorama ERP ja aprovado     um LoadImage ligado direto no Set

  As tres terminam no mesmo `SetNode AMBIENTE_360`. Depois dele, o grafo nao
  sabe -- nem precisa saber -- qual rota produziu a imagem: os seis recortes
  de setor, os seis takes e a montagem final sao identicos nos tres casos.
  E isso que permite usar este JSON como modelo base e trocar so a origem.

POR QUE BYPASS E NAO UM SWITCH NO GRAFO
  Um `easy imageSwitch` e sincrono: as duas entradas sao obrigatorias e os
  dois ramos executam a cada rodada. Com um sampler de limpeza de um lado e um
  sampler de geracao do outro, isso e pagar duas vezes para usar uma. Bypass
  (`mode 4`) tira o ramo perdedor da execucao sem tirar do grafo.

O QUE E PRESERVADO SEMPRE
  O `Set_AMBIENTE_360` e o `LoadImage` do panorama pronto nunca entram em
  bypass. Grupo no ComfyUI e um retangulo desenhado, nao uma relacao entre
  nos -- e o Set cai dentro da caixa de um dos grupos por posicao. Bypassar
  por grupo o derrubaria junto, e um Set em bypass nao publica nada: os seis
  recortes ficariam sem fonte e o grafo quebraria sem dizer por que.

USO
    python origem_360.py --texto
    python origem_360.py --foto                       (usa a foto ja no no)
    python origem_360.py --pronto pano-sp-aprovado.png
    python origem_360.py --ver                         so mostra o estado
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

G_TEXTO = "Generate Set"
G_FOTO = "Generate Set · DA FOTO"
G_360 = "360 ENVIRONMENT"
G_SEAM = "SEAM KILLER"
TITULO_LOAD = "PANORAMA APROVADO (congelado)"


def grupo_de(w, n):
    """Qual grupo contem este no. Mais especifico primeiro: as caixas se
    sobrepoem, e `Generate Set · DA FOTO` fica dentro da area do `Generate
    Set` -- casar pelo nome mais longo evita trocar um pelo outro."""
    achados = []
    for g in w.get("groups", []):
        bx, by, bw, bh = g["bounding"]
        if bx <= n["pos"][0] <= bx + bw and by <= n["pos"][1] <= by + bh:
            achados.append((g.get("title") or "").strip())
    return max(achados, key=len) if achados else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default="MOVIE-BUILDER-IMPERIO.json")
    ap.add_argument("--texto", action="store_true")
    ap.add_argument("--foto", action="store_true")
    ap.add_argument("--pronto", default=None, metavar="ARQUIVO.png")
    ap.add_argument("--ver", action="store_true")
    a = ap.parse_args()

    caminho = os.path.join(WF, a.arquivo)
    w = json.load(io.open(caminho, encoding="utf-8"))
    ns = {n["id"]: n for n in w["nodes"]}
    links = {l[0]: l for l in w["links"] if isinstance(l, list)}

    setn = next((n for n in w["nodes"] if n["type"] == "SetNode"
                 and (n.get("widgets_values") or [""])[0] == "AMBIENTE_360"), None)
    if setn is None:
        raise SystemExit("nao achei o Set_AMBIENTE_360 -- rode o insere_360 antes")
    load = next((n for n in w["nodes"] if n["type"] == "LoadImage"
                 and TITULO_LOAD in (n.get("title") or "")), None)

    if a.ver or not (a.texto or a.foto or a.pronto):
        l = links.get(setn["inputs"][0].get("link"))
        f = ns.get(l[1]) if l else None
        print("Set_AMBIENTE_360 <- %s %s"
              % (f["type"] if f else "(nada)",
                 str(f.get("widgets_values"))[:40] if f else ""))
        cont = {}
        for n in w["nodes"]:
            gg = grupo_de(w, n)
            if gg in (G_TEXTO, G_FOTO, G_360, G_SEAM):
                k = (gg, "bypass" if n.get("mode") == 4 else "ATIVO")
                cont[k] = cont.get(k, 0) + 1
        for k in sorted(cont):
            print("   %-24s %-7s %d" % (k[0][:24], k[1], cont[k]))
        for n in w["nodes"]:
            if n["type"] == "LoadImage" and "FOTO DO LUGAR" in (n.get("title") or ""):
                print("   foto no no: %s" % n["widgets_values"][0])
        return 0

    # quais grupos ficam ativos em cada rota
    if a.pronto:
        if not os.path.isfile(os.path.join(ENTRADA, a.pronto)):
            raise SystemExit("nao achei %s em %s" % (a.pronto, ENTRADA))
        ativos = set()
    elif a.foto:
        ativos = {G_FOTO, G_360, G_SEAM}
    else:
        ativos = {G_TEXTO, G_360, G_SEAM}

    # o LoadImage do panorama pronto, criado sob demanda
    if a.pronto:
        if load is None:
            nid = max(n["id"] for n in w["nodes"]) + 1
            load = {"id": nid, "type": "LoadImage",
                    "pos": [setn["pos"][0] - 520, setn["pos"][1] - 40],
                    "size": [420, 460], "flags": {}, "order": 0, "mode": 0,
                    "inputs": [],
                    "outputs": [{"name": "IMAGE", "type": "IMAGE", "links": []},
                                {"name": "MASK", "type": "MASK", "links": []}],
                    "title": TITULO_LOAD,
                    "properties": {"Node name for S&R": "LoadImage"},
                    "widgets_values": [a.pronto, "image"]}
            w["nodes"].append(load)
            ns[nid] = load
        else:
            load["widgets_values"][0] = a.pronto
        load["mode"] = 0
        fonte, slot = load, 0
    else:
        # a ponta da cadeia escolhida: quem alimenta o SEAM ou o refino
        alvo_grupo = G_FOTO if a.foto else G_TEXTO
        # o ultimo VAEDecode do grupo escolhido e a saida daquela rota
        cands = [n for n in w["nodes"]
                 if n["type"] == "VAEDecode" and grupo_de(w, n) == alvo_grupo]
        if not cands:
            raise SystemExit("nao achei a saida do grupo %r -- regere o grafo "
                             "com o insere_360 atualizado" % alvo_grupo)
        fonte, slot = max(cands, key=lambda n: n["pos"][1]), 0

    # religa o Set apenas no caso `pronto`; nas outras rotas a cadeia ja liga
    if a.pronto:
        e = setn["inputs"][0]
        velho = e.get("link")
        if velho is not None and velho in links:
            o = ns.get(links[velho][1])
            if o:
                for s in o.get("outputs", []) or []:
                    if s.get("links"):
                        s["links"] = [x for x in s["links"] if x != velho]
            w["links"] = [x for x in w["links"]
                          if not (isinstance(x, list) and x[0] == velho)]
        novo = max([x[0] for x in w["links"] if isinstance(x, list)] or [0]) + 1
        w["links"].append([novo, load["id"], 0, setn["id"], 0, "IMAGE"])
        e["link"] = novo
        load["outputs"][0]["links"] = [novo]

    # Os PreviewImage/PreviewAudio da cadeia desligada ficam sem fonte e o
    # ComfyUI reclama na validacao ("Required input is missing: images").
    # Nao quebra -- ele ignora a saida -- mas enche o painel de erro vermelho
    # e esconde o erro de verdade quando houver um. Entram no bypass junto.
    protegidos = {setn["id"]} | ({load["id"]} if load else set())
    n_on = n_off = 0
    for n in w["nodes"]:
        gg = grupo_de(w, n)
        if gg not in (G_TEXTO, G_FOTO, G_360, G_SEAM):
            continue
        if n["id"] in protegidos:
            n["mode"] = 0
            continue
        if gg in ativos:
            n["mode"] = 0
            n_on += 1
        else:
            n["mode"] = 4
            n_off += 1

    rota = "pronto (%s)" % a.pronto if a.pronto else ("foto" if a.foto else "texto")
    print("origem do ambiente: %s" % rota)
    print("   %d no(s) ativo(s), %d em bypass" % (n_on, n_off))

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
    if setn.get("mode") == 4:
        print("   Set_AMBIENTE_360 em bypass")
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
