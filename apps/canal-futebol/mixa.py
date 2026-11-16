# -*- coding: utf-8 -*-
"""Mixa a narracao com o leito de fundo — a camada 05-audio do pack.

POR QUE UM LEITO, JA QUE E VIDEO DE NOTICIA
  Onze minutos de voz seca num fundo estatico soam a arquivo, nao a plantao. O
  leito nao existe para ser ouvido: existe para o silencio entre frases nao
  parecer erro de gravacao. Se o espectador reparar na musica, ela esta alta.

A CADEIA, E O PORQUE DE CADA ELO
  voz    → loudnorm -16 LUFS         alvo de fala do YouTube; abaixo disso a
                                     plataforma nao mexe, acima ela comprime
  leito  → loop + loudnorm -30 LUFS  catorze dB abaixo da voz. E o ponto em que
                                     ele preenche sem disputar
  leito  → sidechaincompress(voz)    DUCKING: o leito recua quando a voz entra e
                                     volta na pausa. Sem isso, ou a musica
                                     atrapalha a fala, ou some do video inteiro
  soma   → loudnorm -16 LUFS         a mixagem final volta ao alvo de entrega

  O ducking e o que separa "musica de fundo" de "musica por baixo". Ele e a
  razao de o leito poder estar audivel na pausa e sumir na frase.

O LEITO E DE GERACAO PROPRIA
  `squads/oraclumtech-ai-creative-studio/data/trilhas-and-sfx/` — Stable Audio
  Open, nenhum sample de terceiro. Nao ha pendencia de licenca, o que num canal
  dark importa mais que a qualidade da peca: reclamacao de direito autoral em
  audio e automatica e desmonetiza antes de qualquer analise.

  Uso o LOOP, nao o arquivo cheio: as pecas do Stable Audio desvanecem no fim
  (elas compoem uma peca, nao uma cama), e onze minutos de leito montados a
  partir do arquivo cheio teriam um sumico a cada quarenta e cinco segundos.

USO
  python -X utf8 mixa.py 2026-09-04-abel-stjd
  python -X utf8 mixa.py 2026-09-04-abel-stjd --leito le-tensao-alta-LOOP.wav
  python -X utf8 mixa.py 2026-09-04-abel-stjd --so-voz     (sem leito nenhum)
"""
import argparse
import os
import subprocess
import sys

from narra_comfy import CANAL

AQUI = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(AQUI))
LEITOS = os.path.join(REPO, "squads", "oraclumtech-ai-creative-studio", "data",
                      "trilhas-and-sfx", "02-leitos", "tensao-suspense")
PADRAO = "le-tensao-baixa-LOOP.wav"


def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", p],
                       capture_output=True, text=True)
    return float((r.stdout or "0").strip() or 0)


def lufs(p):
    """Mede o volume integrado do arquivo — a conferencia de que a cadeia rodou."""
    r = subprocess.run(["ffmpeg", "-v", "info", "-i", p, "-af",
                        "loudnorm=I=-16:print_format=summary", "-f", "null", "-"],
                       capture_output=True, text=True)
    for lin in (r.stderr or "").splitlines():
        if "Input Integrated" in lin:
            return lin.split(":")[1].strip()
    return "?"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--leito", default=PADRAO)
    ap.add_argument("--so-voz", action="store_true",
                    help="entrega só a voz normalizada, sem leito")
    a = ap.parse_args()

    pack = os.path.join(CANAL, "episodios", a.slug)
    voz = os.path.join(pack, "03-narracao", "vo.mp3")
    saida = os.path.join(pack, "05-audio")
    os.makedirs(saida, exist_ok=True)
    if not os.path.isfile(voz):
        print("não achei a narração: %s" % voz)
        return 1

    d = dur(voz)
    print("narração  %d min %02d s   %s" % (d // 60, d % 60, lufs(voz)))

    final = os.path.join(saida, "mix.wav")
    if a.so_voz:
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voz, "-af",
                        "aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11",
                        "-ar", "48000", final], check=True)
        print("mix.wav  ·  só voz  ·  %s" % lufs(final))
        return 0

    leito = os.path.join(LEITOS, a.leito)
    if not os.path.isfile(leito):
        print("não achei o leito: %s" % leito)
        return 1
    print("leito     %s   %.1fs de loop" % (a.leito, dur(leito)))

    # `-stream_loop -1` repete o leito indefinidamente; `-t` corta na duração da
    # voz. O corte é no fim, onde o fade da mixagem já cobre a emenda.
    cad = (
        "[0:a]aresample=48000,loudnorm=I=-16:TP=-1.5:LRA=11[voz];"
        "[1:a]aresample=48000,loudnorm=I=-30:TP=-9:LRA=7[cama];"
        # O ducking: a voz é a chave, o leito é o que abaixa.
        #   threshold baixo  → qualquer fala já aciona
        #   ratio 8          → recuo firme, não sutil
        #   attack 20 ms     → entra antes da sílaba ser entendida
        #   release 900 ms   → volta devagar, senão pulsa entre as palavras
        "[cama][voz]sidechaincompress=threshold=0.03:ratio=8:attack=20:"
        "release=900:makeup=1[duck];"
        "[voz][duck]amix=inputs=2:duration=first:dropout_transition=0:"
        "normalize=0[som];"
        "[som]loudnorm=I=-16:TP=-1.5:LRA=11,"
        # Dois segundos de entrada e três de saída: o leito não pode começar
        # nem terminar em corte seco, que é o que denuncia montagem.
        "afade=t=in:st=0:d=2,afade=t=out:st=%.2f:d=3[fim]" % max(d - 3, 0)
    )
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", voz,
                    "-stream_loop", "-1", "-i", leito, "-t", "%.3f" % d,
                    "-filter_complex", cad, "-map", "[fim]",
                    "-ar", "48000", "-ac", "2", final], check=True)

    print("\nmix.wav   %d min %02d s   %s" % (dur(final) // 60, dur(final) % 60,
                                              lufs(final)))
    print("  voz a -16 LUFS · leito a -30 com ducking · fade 2s/3s")
    return 0


if __name__ == "__main__":
    sys.exit(main())
