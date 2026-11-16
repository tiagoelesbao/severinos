# -*- coding: utf-8 -*-
"""Fecha a trilha de torcida num loop sem emenda audivel.

O PROBLEMA QUE ISTO RESOLVE
  `<audio loop>` no navegador reinicia o arquivo do zero. Se o fim e o comeco
  nao casarem, ouve-se um clique a cada volta — e numa live de duas horas isso
  acontece cento e sessenta vezes.

  A trilha aprovada nao tem fade (medido: inicio -25,4 dB, meio -26,5 dB, fim
  -26,3 dB), entao o nivel ja casa. O que nao casa e a FASE do ruido. A cura e
  cruzar o fim por cima do comeco: o ultimo trecho vira fade-out sobre um
  fade-in do inicio, e a volta acontece dentro do cruzamento, onde o ouvido nao
  consegue localizar a emenda.

  A peca encurta pela duracao do cruzamento — 45 s viram 42 s. Nao importa:
  quem ouve nao conta voltas, ouve continuidade.

Uso:  python faz_loop_torcida.py
"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
TORCIDA = os.path.join(AQUI, "assets", "torcida")
CRUZAMENTO = 3.0        # segundos de sobreposicao


def duracao(f):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", f], capture_output=True, text=True)
    return float((r.stdout or "0").strip() or 0)


def faz_loop(origem, destino, cruz=CRUZAMENTO):
    """corpo + (cauda esmaecendo sobre o inicio entrando).

    `acrossfade` seria o caminho curto, mas ele exige que a primeira entrada
    seja mais longa que o cruzamento e devolvia arquivo vazio aqui. Montar a
    mao e mais linhas e nenhum misterio: a cauda desce enquanto uma copia do
    inicio sobe, as duas somam no mesmo trecho, e a volta cai dentro dessa soma.
    """
    d = duracao(origem)
    if d <= cruz * 2:
        print("  %s curta demais (%.1fs) para cruzar" % (os.path.basename(origem), d))
        return False
    ini_cauda = d - cruz
    filtro = (
        # tudo menos a cauda, intacto
        "[0:a]atrim=0:%.3f,asetpts=N/SR/TB[corpo];"
        # a cauda, descendo
        "[0:a]atrim=%.3f,asetpts=N/SR/TB,afade=t=out:st=0:d=%.3f[desce];"
        # uma copia do inicio, subindo
        "[0:a]atrim=0:%.3f,asetpts=N/SR/TB,afade=t=in:st=0:d=%.3f[sobe];"
        # as duas no mesmo trecho
        "[desce][sobe]amix=inputs=2:duration=shortest:normalize=0[emenda];"
        "[corpo][emenda]concat=n=2:v=0:a=1[saida]"
        % (ini_cauda, ini_cauda, cruz, cruz, cruz)
    )
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", origem,
                        "-filter_complex", filtro, "-map", "[saida]",
                        "-c:a", "libmp3lame", "-b:a", "192k", destino],
                       capture_output=True, text=True, timeout=180)
    if not (os.path.isfile(destino) and os.path.getsize(destino) > 5000):
        print("  falhou:", (r.stderr or "")[-260:])
        return False
    print("  %s  %.1fs -> %.1fs  (cruzamento de %.1fs)"
          % (os.path.basename(destino), d, duracao(destino), cruz))
    return True


def mede_emenda(f):
    """Quanto o fim difere do comeco, em dB. Perto de zero = volta invisivel."""
    import numpy as np
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "22050",
                        "-f", "f32le", "-"], capture_output=True)
    x = np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)
    n = 22050 // 4
    db = lambda a: 20 * np.log10(np.sqrt((a ** 2).mean()) + 1e-12)
    return abs(db(x[:n]) - db(x[-n:]))


if __name__ == "__main__":
    origem = os.path.join(TORCIDA, "torcida-ambiente.mp3")
    destino = os.path.join(TORCIDA, "torcida-ambiente-LOOP.mp3")
    if not os.path.isfile(origem):
        print("nao achei", origem)
        sys.exit(1)
    print("fechando o loop da torcida ambiente")
    if faz_loop(origem, destino):
        print("\n  degrau na volta: %.2f dB (antes: %.2f dB)"
              % (mede_emenda(destino), mede_emenda(origem)))
        print("\nsaida: assets/torcida/torcida-ambiente-LOOP.mp3")
