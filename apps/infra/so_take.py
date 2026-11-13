# -*- coding: utf-8 -*-
"""Deixa ATIVO so o que voce quer gerar. O resto entra em bypass.

POR QUE ISTO EXISTE
  O ComfyUI nao executa "o no em que voce clicou". Ele monta a arvore a partir
  de TODOS os nos de saida ativos -- `SaveImage`, `SaveVideo`, `ShotVideoOutput`
  -- e roda tudo que alimenta qualquer um deles. Com seis takes no grafo, pedir
  uma imagem pede os seis videos junto.

  Foi o que aconteceu na noite de 12 para 13/09: um clique virou 6h37 de
  geracao, das 23:38 as 06:15, a ~1h20 por take.

  Nao ha ajuste de interface que mude isso. O que muda e desativar as saidas
  que voce nao quer -- e e isso que este script faz, em bloco, sem depender de
  clicar em 30 nos na tela.

O QUE E BYPASS
  `mode = 4` faz o no ser ignorado na execucao sem sair do grafo. Nada e
  apagado; reverter e rodar o script de novo com outro alvo.

USO
    python so_take.py --imagens          # so os 6 frames iniciais, nenhum video
    python so_take.py --take 1           # so o SHOT 01, imagem e video
    python so_take.py --take 1 --imagem  # so a imagem do SHOT 01
    python so_take.py --panorama         # so o ambiente 360 e os recortes
    python so_take.py --tudo             # religa tudo
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

# os tipos que o ComfyUI trata como SAIDA -- sao eles que puxam a execucao
SAIDAS = ("SaveImage", "SaveVideo", "ShotVideoOutput", "PreviewImage",
          "PreviewAudio", "ShotAssembler")
# estes sao baratos e uteis de deixar sempre visiveis
LEVES = ("PreviewImage", "PreviewAudio")


def grupo_de(w, node):
    """Em qual grupo o no cai, pela caixa."""
    for g in w.get("groups", []):
        bx, by, bw, bh = g["bounding"]
        if bx <= node["pos"][0] <= bx + bw and by <= node["pos"][1] <= by + bh:
            return (g.get("title") or "").strip()
    return ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default="MOVIE-BUILDER-IMPERIO.json")
    ap.add_argument("--take", type=int, default=None,
                    help="numero do SHOT a manter ativo")
    ap.add_argument("--imagem", action="store_true",
                    help="com --take, gera so a imagem (sem o video)")
    ap.add_argument("--imagens", action="store_true",
                    help="so os frames iniciais dos seis takes")
    ap.add_argument("--panorama", action="store_true",
                    help="so o ambiente 360 e os recortes de setor")
    ap.add_argument("--tudo", action="store_true", help="religa todas as saidas")
    a = ap.parse_args()

    caminho = os.path.join(WF, a.arquivo)
    w = json.load(io.open(caminho, encoding="utf-8"))

    def quero(n):
        """Esta saida deve ficar ativa?"""
        if a.tudo:
            return True
        g = grupo_de(w, n)
        t = n["type"]
        eh_shot = g.startswith("SHOT")
        num = int(g.split()[-1]) if eh_shot and g.split()[-1].isdigit() else None

        if a.panorama:
            # o panorama e os recortes vivem fora dos grupos SHOT
            return not eh_shot and t in LEVES + ("SaveImage",)
        if a.imagens:
            return eh_shot and t == "SaveImage"
        if a.take is not None:
            if not eh_shot:
                return t in LEVES
            if num != a.take:
                return False
            return t == "SaveImage" if a.imagem else True
        return True

    ligados = desligados = 0
    resumo = {}
    for n in w["nodes"]:
        if n["type"] not in SAIDAS:
            continue
        ativo = quero(n)
        n["mode"] = 0 if ativo else 4
        g = grupo_de(w, n) or "(fora de grupo)"
        resumo.setdefault(g, [0, 0])
        resumo[g][0 if ativo else 1] += 1
        if ativo:
            ligados += 1
        else:
            desligados += 1

    print("saidas por grupo:")
    for g in sorted(resumo):
        on, off = resumo[g]
        print("   %-26s ativas %d   em bypass %d" % (g[:26], on, off))

    io.open(caminho, "w", encoding="utf-8").write(
        json.dumps(w, ensure_ascii=False, indent=2))
    print("\n%d saida(s) ativa(s), %d em bypass" % (ligados, desligados))
    if not ligados:
        print("ATENCAO: nenhuma saida ativa -- o Executar nao vai fazer nada")
    print("→ %s" % caminho)
    return 0


if __name__ == "__main__":
    sys.exit(main())
