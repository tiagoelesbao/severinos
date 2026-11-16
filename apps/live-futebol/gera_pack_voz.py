# -*- coding: utf-8 -*-
"""Gera o pack de voz — offline, antes do jogo. Depois é só tocar.

    python gera_pack_voz.py --fixo                  # 146 falas, uma vez só
    python gera_pack_voz.py --partida <id> --liga bra.1
    python gera_pack_voz.py --fixo --voz piper
    python gera_pack_voz.py --ouvir gol-a           # toca uma fala do pack

POR QUE ISTO MUDA A ARQUITETURA
  Com o pack pronto, a narração ao vivo deixa de sintetizar nada. A latência
  cai a zero e o motor de voz pode ser o mais lento e melhor — a geração
  acontece com o jogo ainda por começar.

  E, o que importa mais: dá para OUVIR o pack antes do ar. Uma frase que saiu
  com entonação errada é refeita; ao vivo, ela iria ao ar do jeito que saísse.
"""
import argparse
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

import banco_falas
import voz as mvoz

PACK = os.path.join(AQUI, "_pack")


def _gera(itens, subpasta, preferido, refazer=False):
    destino = os.path.join(PACK, subpasta)
    os.makedirs(destino, exist_ok=True)
    nome_motor, fn, ext = mvoz.motor_disponivel(preferido)
    if not fn:
        print("nenhum motor de voz disponível")
        return 0, 0
    print("motor: %s   destino: _pack/%s" % (nome_motor, subpasta))
    feitos = pulados = falhas = 0
    t0 = time.time()
    for i, (ident, texto) in enumerate(itens, 1):
        arq = os.path.join(destino, ident + ext)
        if os.path.isfile(arq) and os.path.getsize(arq) > 1000 and not refazer:
            pulados += 1
            continue
        try:
            ok = fn(texto, arq)
        except Exception as e:
            print("  [%s] erro: %s" % (ident, str(e)[:70]))
            ok = False
        if ok:
            feitos += 1
        else:
            falhas += 1
        if i % 25 == 0 or i == len(itens):
            print("  %3d/%d  (%.0fs)" % (i, len(itens), time.time() - t0), flush=True)
    print("  feitos %d · já existiam %d · falharam %d · %.0fs total"
          % (feitos, pulados, falhas, time.time() - t0))
    return feitos, falhas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fixo", action="store_true")
    ap.add_argument("--partida")
    ap.add_argument("--liga", default="bra.1")
    ap.add_argument("--voz")
    ap.add_argument("--refazer", action="store_true")
    ap.add_argument("--ouvir")
    a = ap.parse_args()

    if a.ouvir:
        for sub in ("fixo", "partida"):
            for ext in (".wav", ".mp3"):
                p = os.path.join(PACK, sub, a.ouvir + ext)
                if os.path.isfile(p):
                    print("tocando %s" % p)
                    subprocess.run(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", p])
                    return 0
        print("não achei '%s' no pack" % a.ouvir)
        return 1

    if a.fixo:
        itens = banco_falas.bloco_fixo()
        print("BLOCO FIXO — %d falas\n" % len(itens))
        _gera(itens, "fixo", a.voz, a.refazer)

    if a.partida:
        # A escalação já está na API horas antes do apito. É isso que permite
        # gerar os nomes próprios com o jogo ainda por começar.
        import importlib.util as u
        spec = u.spec_from_file_location("srv", os.path.join(AQUI, "servidor.py"))
        m = u.module_from_spec(spec)
        argv, sys.argv = sys.argv, ["x"]
        spec.loader.exec_module(m)
        sys.argv = argv
        d = m.monta(a.liga, a.partida)
        itens = banco_falas.bloco_da_partida(d)
        print("\nBLOCO DA PARTIDA — %s x %s — %d falas\n"
              % (d["casa"]["sigla"], d["fora"]["sigla"], len(itens)))
        if not itens:
            print("  escalação ainda não publicada — rode mais perto do jogo")
            return 1
        _gera(itens, "partida", a.voz, a.refazer)

    if not (a.fixo or a.partida):
        ap.print_help()
    return 0


if __name__ == "__main__":
    sys.exit(main())
