# -*- coding: utf-8 -*-
"""As duas frentes numa lista só — a etapa 1 do pipeline do canal de futebol.

    python descobrir.py                        as duas frentes, 18 h
    python descobrir.py --horas 6 --so rss
    python descobrir.py --salvar pautas.json   fatos prontos para o packaging

O QUE ESTE COMANDO ENTREGA
  Uma lista ranqueada de PAUTAS — o que merece virar video hoje, com o motivo de
  cada uma ter subido. Nao entrega titulo: titulo e do estagio `packaging`, que
  le o `fato` que sai daqui.

DUAS FRENTES, DOIS TIPOS DE PAUTA
  jogo   o que ACONTECEU em campo, pela API — expulsao, virada, goleada, penalti.
         Chega antes de qualquer portal publicar, e um jogo rende varios angulos.
  radar  o que se FALOU, por RSS — coletiva, processo, negociacao, treta.
         E onde mora a polemica, que a API nunca vai saber.

  As notas das duas frentes sao normalizadas para a mesma escala de 0 a 100, para
  que a lista final possa ser comparada de ponta a ponta. Sem isso, escolher
  entre "peso 0,88" e "nota 76" seria comparar unidade com unidade diferente.
"""
import argparse
import json
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fonte_api
import pauta as p_rss


def _do_jogo(a):
    return {
        "frente": "jogo",
        "nota": min(100, round(a["peso"] * 72)),   # 1.10 (o teto observado) ≈ 79
        "titulo": "%s %s" % (a["fato"]["sujeito"], a["fato"]["acao"]),
        "contexto": "%s · %s" % (a["jogo"], a["gatilho"]),
        "fonte": "ESPN",
        "link": "https://www.espn.com.br/futebol/partida/_/jogoId/%s" % a["jogo_id"],
        "fato": a["fato"],
        "gatilhos": [a["gatilho"]],
    }


def _do_rss(av):
    it = av["item"]
    f = p_rss._fato(av)
    return {
        "frente": "radar",
        "nota": av["nota"],
        "titulo": it["titulo"],
        "contexto": "%s · %s" % (av["tipo"], (av["clube"] or "—")),
        "fonte": it["fonte"],
        "link": it["link"],
        "fato": f,
        "gatilhos": av["gatilhos"][:4],
    }


def descobre(horas=18, so=None, minimo=45):
    tudo, avisos = [], []
    if so != "rss":
        try:
            angs, n = fonte_api.pautas_de_jogo(horas=max(horas, 36))
            tudo += [_do_jogo(a) for a in angs]
            avisos.append("%d partidas varridas" % n)
        except Exception as e:
            avisos.append("frente de jogo falhou: %s" % str(e)[:60])
    if so != "jogo":
        try:
            ps, falhas, brutas = p_rss.pautas(horas=horas, minimo=minimo, quantas=40)
            tudo += [_do_rss(a) for a in ps]
            avisos.append("%d matérias lidas" % brutas)
            if falhas:
                avisos.append("fontes fora: " + ", ".join(n for n, _ in falhas))
        except Exception as e:
            avisos.append("frente de radar falhou: %s" % str(e)[:60])
    tudo.sort(key=lambda x: -x["nota"])
    return tudo, avisos


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--horas", type=int, default=18)
    ap.add_argument("--so", choices=["jogo", "rss"])
    ap.add_argument("--minimo", type=int, default=45)
    ap.add_argument("--quantas", type=int, default=15)
    ap.add_argument("--salvar")
    a = ap.parse_args()

    t0 = time.time()
    ps, avisos = descobre(a.horas, a.so, a.minimo)
    print("%d pautas · %.1fs  (%s)\n" % (len(ps), time.time() - t0, " · ".join(avisos)))
    print("%-4s %-6s %-26s %s" % ("NOTA", "FRENTE", "CONTEXTO", "PAUTA"))
    print("─" * 112)
    for i, x in enumerate(ps[:a.quantas], 1):
        print("%-4d %-6s %-26s %s" % (x["nota"], x["frente"], x["contexto"][:26],
                                      x["titulo"][:58]))
        print("     %-6s %-26s %s" % ("", "", " · ".join(x["gatilhos"]) or "—"))

    if a.salvar:
        with open(a.salvar, "w", encoding="utf-8") as f:
            json.dump(ps[:a.quantas], f, ensure_ascii=False, indent=1)
        print("\n%d pautas em %s" % (min(len(ps), a.quantas), a.salvar))
        print("próximo passo:  /packaging  com o fato da pauta escolhida")
    return 0


if __name__ == "__main__":
    sys.exit(main())
