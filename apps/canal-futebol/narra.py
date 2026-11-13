# -*- coding: utf-8 -*-
"""Gera a locucao de um episodio a partir do roteiro, no perfil `vod`.

O QUE ESTE ARQUIVO FAZ DE DIFERENTE DA LIVE
  Mesma voz, outro tratamento. A live pede pressa e parede de som porque disputa
  com cama de torcida; o video longo nao disputa com nada, e compressao demais
  ali cansa em doze minutos. Os dois perfis estao travados em `voice-lock.yaml`:

      live   length_scale 0.92  cadeia `padrao`  ~171 p/min
      vod    length_scale 1.35  cadeia `leve`     135 p/min (medido)

POR QUE SINTETIZAR EM BLOCOS, E NAO O ROTEIRO INTEIRO
  Um roteiro de mil e setecentas palavras num unico `synthesize_wav` da um WAV de
  treze minutos que, se sair com um erro de leitura no minuto onze, tem de ser
  refeito inteiro. Em blocos, refaz-se o bloco.

  E os blocos tem outro uso: eles viram a marcacao de b-roll. Cada bloco do
  roteiro ja tem um tempo de entrada previsto; sintetizando separado, o tempo
  REAL de cada um fica conhecido antes da montagem.

O QUE O ROTEIRO PRECISA TER
  O texto do roteiro E a entrada do TTS — numeros por extenso, siglas escritas.
  Este arquivo NAO conserta texto: ele tira a marcacao de markdown e as ancoras
  `[F1]`, e o que sobra vai como esta. Se a leitura sair errada, o conserto e no
  roteiro, onde ele fica registrado.

Uso:
    python narra.py 2026-09-04-abel-stjd
    python narra.py 2026-09-04-abel-stjd --bloco 3      # refaz um bloco so
"""
import argparse
import os
import re
import subprocess
import sys
import time
import wave

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
sys.path.insert(0, os.path.join(RAIZ, "apps", "live-futebol"))
CANAL = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                     "creative-studio", "canais", "bora-de-bola")
MODELO = os.path.join(RAIZ, "apps", "live-futebol", "_vozes",
                      "pt_BR-cadu-medium.onnx")

# Do voice-lock.yaml, perfil `vod`. Medido: 135,4 p/min.
ESCALA, FIRMEZA, CADEIA = 1.35, 0.65, "leve"


def le_blocos(roteiro):
    """[(tempo, titulo, texto)] — um por cabecalho `## mm:ss — NOME`."""
    txt = open(roteiro, encoding="utf-8").read()
    partes = re.split(r"^## ", txt, flags=re.M)[1:]
    blocos = []
    for p in partes:
        cab, _, corpo = p.partition("\n")
        if cab.startswith("Marcação"):
            break
        m = re.match(r"([\d:]+)\s*—\s*(.+)", cab)
        tempo = m.group(1) if m else ""
        nome = (m.group(2) if m else cab).split("·")[0].strip()
        falado = []
        for l in corpo.split("\n"):
            l = l.strip()
            if not l or l.startswith((">", "|", "#", "---")):
                continue
            l = re.sub(r"`\[F\d+\]`", "", l)      # âncoras não são faladas
            l = re.sub(r"\*\*|\*|`", "", l)       # markdown não é falado
            falado.append(l.strip())
        texto = " ".join(x for x in falado if x)
        if texto:
            blocos.append((tempo, nome, texto))
    return blocos


def sintetiza(voz, texto, destino):
    from piper import SynthesisConfig
    cfg = SynthesisConfig(length_scale=ESCALA, noise_w_scale=FIRMEZA)
    with wave.open(destino, "wb") as w:
        voz.synthesize_wav(texto, w, syn_config=cfg)
    with wave.open(destino) as w:
        return w.getnframes() / float(w.getframerate())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--bloco", type=int)
    a = ap.parse_args()

    pack = os.path.join(CANAL, "episodios", a.slug)
    roteiro = os.path.join(pack, "02-roteiro", "roteiro.md")
    saida = os.path.join(pack, "03-narracao")
    brutos = os.path.join(saida, "_blocos")
    os.makedirs(brutos, exist_ok=True)
    if not os.path.isfile(roteiro):
        print("não achei o roteiro: %s" % roteiro)
        return 1

    blocos = le_blocos(roteiro)
    print("%d blocos · perfil vod (escala %.2f, cadeia %s)\n" % (len(blocos), ESCALA, CADEIA))

    from piper import PiperVoice
    t0 = time.time()
    voz = PiperVoice.load(MODELO)
    print("modelo carregado em %.1fs\n" % (time.time() - t0))

    import radio
    print("%-3s %-9s %-30s %8s %8s %8s" % ("#", "PREVISTO", "BLOCO", "PALAVRAS", "REAL", "P/MIN"))
    print("─" * 76)
    total = 0.0
    partes = []
    for i, (tempo, nome, texto) in enumerate(blocos, 1):
        wav = os.path.join(brutos, "%02d.wav" % i)
        mp3 = os.path.join(brutos, "%02d.mp3" % i)
        if a.bloco and i != a.bloco and os.path.isfile(mp3):
            with wave.open(wav) if os.path.isfile(wav) else open(os.devnull) as _:
                pass
        if not a.bloco or i == a.bloco or not os.path.isfile(mp3):
            dur = sintetiza(voz, texto, wav)
            if not radio.processa(wav, mp3, CADEIA):
                print("  [radio] falhou no bloco %d" % i)
            os.remove(wav)
        dur = float(subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration",
             "-of", "csv=p=0", mp3], capture_output=True, text=True).stdout.strip() or 0)
        n = len(texto.split())
        ppm = n / (dur / 60.0) if dur else 0
        total += dur
        partes.append(mp3)
        print("%-3d %-9s %-30s %8d %7.1fs %8.1f"
              % (i, tempo, nome[:30], n, dur, ppm))

    # ── junta com respiro entre blocos ──────────────────────────────────────
    # 0,6 s entre blocos: e a pausa que um locutor faz ao mudar de assunto. Sem
    # ela, a montagem emenda o CTA no primeiro bloco sem nenhum sinal de troca.
    lista = os.path.join(brutos, "_lista.txt")
    silencio = os.path.join(brutos, "_silencio.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "lavfi",
                    "-i", "anullsrc=r=44100:cl=mono", "-t", "0.6",
                    "-c:a", "libmp3lame", "-b:a", "192k", silencio], timeout=60)
    with open(lista, "w", encoding="utf-8") as f:
        for i, p in enumerate(partes):
            f.write("file '%s'\n" % p.replace("\\", "/"))
            if i < len(partes) - 1:
                f.write("file '%s'\n" % silencio.replace("\\", "/"))
    final = os.path.join(saida, "vo.mp3")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", lista, "-c", "copy", final], timeout=300)

    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", final], capture_output=True, text=True).stdout.strip() or 0)
    palavras = sum(len(t.split()) for _, _, t in blocos)
    print("─" * 76)
    print("%-44s %8d %7.1fs %8.1f" % ("TOTAL", palavras, dur, palavras / (dur / 60.0)))
    print("\nvo.mp3 · %d min %02d s · alvo do canal 134 p/min"
          % (int(dur // 60), int(dur % 60)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
