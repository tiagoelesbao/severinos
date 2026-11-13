# -*- coding: utf-8 -*-
"""Ouvir a live antes de abrir o OBS: voz + cama de torcida + rugido de gol.

POR QUE ESTA PROVA EXISTE
  As tres pecas ja foram aprovadas separadas — a voz, a torcida ambiente e o
  rugido. Separadas nao dizem nada sobre a unica coisa que importa no ar: se a
  fala continua inteligivel com a torcida por baixo. Uma cama de torcida no
  volume errado nao "atrapalha um pouco", ela come as consoantes e transforma
  a narracao em ruido com entonacao.

  Este arquivo monta o mesmo balanco que o overlay executa — mesmo volume,
  mesma queda durante a fala, mesma subida depois — num MP3 que se ouve no
  fone. Se estiver bom aqui, esta bom no ar.

Uso:  python prova_mixagem.py            gera assets/PROVA-MIXAGEM.mp3
      python prova_mixagem.py --ouvir    gera e toca
"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)

TORCIDA = os.path.join(AQUI, "assets", "torcida")
SAIDA = os.path.join(AQUI, "assets", "PROVA-MIXAGEM.mp3")

# Os mesmos numeros do overlay. Se um mudar la, muda aqui.
VOL_CAMA, DUCK, RAMPA = 0.22, 0.38, 0.38
VOL_GOL = min(1.0, VOL_CAMA * 2.6)

# (segundo de entrada, texto). Espacados para dar tempo de ouvir a cama subir
# de volta entre uma fala e outra — que e onde a mixagem costuma falhar.
ROTEIRO = [
    (3.0, "Bola rolando aqui no Maracanã! Começa a partida!"),
    (11.0, "Se você está gostando da transmissão, deixa o like e se inscreve no canal."),
    (21.0, "Gooool do Flamengo! Samuel Lino, com assistência de Jorginho, aos treze minutos."),
]
GOL_EM = 21.0          # o rugido entra junto com a fala do gol
TOTAL = 34.0


def dur(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", f], capture_output=True, text=True)
    return float((r.stdout or "0").strip() or 0)


def trapezio(t0, t1):
    """Expressao de volume que desce, segura e sobe — a mesma rampa do overlay.

    Escrita como MIN de duas subidas: uma que sobe entrando e outra que sobe
    saindo ao contrario. Sem `if`, sem descontinuidade, sem clique."""
    e = lambda x: x.replace(",", r"\,")
    sobe = e("min(max((t-%.3f)/%.2f,0),1)" % (t0, RAMPA))
    desce = e("min(max((%.3f-t)/%.2f,0),1)" % (t1, RAMPA))
    return "min(%s,%s)" % (sobe, desce)


def main():
    import voz as mvoz
    cama = os.path.join(TORCIDA, "torcida-ambiente-LOOP.mp3")
    gol = os.path.join(TORCIDA, "torcida-gol.mp3")
    for f in (cama, gol):
        if not os.path.isfile(f):
            print("falta", f)
            return 1

    print("sintetizando as falas com a voz de producao")
    mvoz.aquece()
    falas = []
    for i, (quando, txt) in enumerate(ROTEIRO):
        p = mvoz.sintetiza(txt, "prova_mix_%d" % i)
        if not p:
            print("  falhou:", txt[:50])
            return 1
        arq = os.path.join(AQUI, "_falas", os.path.basename(p))
        d = dur(arq)
        falas.append((quando, d, arq, txt))
        print("  %5.1fs  %4.1fs  %s" % (quando, d, txt[:56]))

    # A cama perde volume enquanto QUALQUER fala esta no ar. Somando os
    # trapezios e limitando em 1, duas falas proximas nao fazem a cama subir
    # entre elas — que e o defeito de automatizar fala a fala.
    soma = "+".join(trapezio(q, q + d) for q, d, _, _ in falas)
    expr_cama = ("%.3f*(1-%.3f*min(%s" + r"\," + "1))") % (VOL_CAMA, 1 - DUCK, soma)

    entradas, partes, rotulos = ["-stream_loop", "-1", "-i", cama], [], []
    partes.append("[0:a]atrim=0:%.2f,asetpts=N/SR/TB,"
                  "volume=eval=frame:volume='%s'[cama]" % (TOTAL, expr_cama))
    rotulos.append("[cama]")

    entradas += ["-i", gol]
    partes.append("[1:a]adelay=%d|%d,volume=%.3f[rugido]"
                  % (int(GOL_EM * 1000), int(GOL_EM * 1000), VOL_GOL))
    rotulos.append("[rugido]")

    for i, (quando, d, arq, _) in enumerate(falas):
        entradas += ["-i", arq]
        partes.append("[%d:a]adelay=%d|%d[v%d]"
                      % (i + 2, int(quando * 1000), int(quando * 1000), i))
        rotulos.append("[v%d]" % i)

    partes.append("%samix=inputs=%d:duration=first:normalize=0,"
                  "alimiter=limit=0.97[mix]" % ("".join(rotulos), len(rotulos)))
    filtro = ";".join(partes)

    r = subprocess.run(["ffmpeg", "-v", "error", "-y"] + entradas +
                       ["-filter_complex", filtro, "-map", "[mix]", "-t", str(TOTAL),
                        "-c:a", "libmp3lame", "-b:a", "192k", SAIDA],
                       capture_output=True, text=True, timeout=240)
    if not os.path.isfile(SAIDA):
        print("falhou:", (r.stderr or "")[-400:])
        return 1
    print("\n%.0fs de prova em assets/PROVA-MIXAGEM.mp3" % dur(SAIDA))
    print("  cama em %.2f, caindo para %.3f enquanto a voz fala"
          % (VOL_CAMA, VOL_CAMA * DUCK))
    if "--ouvir" in sys.argv:
        subprocess.run(["ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", SAIDA])
    return 0


if __name__ == "__main__":
    sys.exit(main())
