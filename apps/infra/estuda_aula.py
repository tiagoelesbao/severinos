# -*- coding: utf-8 -*-
"""Transcreve a videoaula e tira screenshot dos momentos que importam.

PARA QUE SERVE
  Uma aula de fluxo no ComfyUI tem duas camadas de informacao que se perdem se
  a gente so assiste: o que o autor DIZ (a razao de cada escolha) e o que ele
  MOSTRA (o grafo, os parametros, a ordem dos nos). Transcricao sem imagem
  perde a segunda; screenshot sem transcricao perde a primeira.

  Este script produz as duas e as CASA pelo tempo, para virar documento de
  pipeline -- que e o que fica depois que a aula sai do ar.

COMO ELE ESCOLHE OS QUADROS
  Nao e a cada N segundos. Duas regras, e as duas vem de como aula de tutorial
  se comporta:

    TROCA DE TELA   o autor alterna entre o grafo, o browser e o resultado. A
                    diferenca entre quadros consecutivos dispara nessas trocas
                    e fica baixa enquanto ele fala sobre a mesma tela. Cada
                    pico e uma tela nova -- e tela nova e o que vale guardar.

    FRASE-CHAVE     quando a fala contem "download", "model", "settings",
                    "you need", "make sure", o que esta na tela naquele
                    segundo costuma ser o parametro ou o link. Esses quadros
                    entram mesmo sem troca de tela.

USO
    python estuda_aula.py "C:\\...\\aula.mp4" --saida nome-curto
"""
import argparse
import io
import json
import os
import subprocess
import sys
import unicodedata
import re

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
DEST = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio",
                    "docs", "aulas")

# Palavras que, ditas em voz alta, quase sempre acompanham algo na tela que
# precisa ser lido: um link, um numero, um nome de arquivo.
CHAVES = ["download", "hugging", "model", "checkpoint", "lora", "vae",
          "settings", "resolution", "steps", "cfg", "sampler", "seed",
          "you need", "make sure", "important", "folder", "install",
          "node", "workflow", "prompt", "batch", "upscale"]


def _slug(t):
    t = unicodedata.normalize("NFD", t)
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^A-Za-z0-9]+", "-", t).strip("-").lower()[:44]


def transcreve(video, modelo="small"):
    from faster_whisper import WhisperModel
    tmp = os.environ.get("TEMP", ".")
    w = os.path.join(tmp, "_aula_%d.wav" % os.getpid())
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vn",
                    "-ac", "1", "-ar", "16000", w], check=True)
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(w, language="en", vad_filter=False)
    fora = [(s.start, s.end, (s.text or "").strip()) for s in segs]
    try:
        os.remove(w)
    except OSError:
        pass
    return fora


def trocas_de_tela(video, limiar=0.22, passo=2.0):
    """Segundos em que a tela mudou de verdade."""
    import numpy as np
    from PIL import Image
    tmp = os.environ.get("TEMP", ".")
    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", video], capture_output=True, text=True
    ).stdout.strip() or 0)
    ant, picos = None, []
    t = 0.0
    while t < dur:
        f = os.path.join(tmp, "_q%d.png" % os.getpid())
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.2f" % t,
                            "-i", video, "-frames:v", "1", "-vf",
                            "scale=160:-1", f], capture_output=True)
        if r.returncode == 0 and os.path.isfile(f):
            a = np.asarray(Image.open(f).convert("L"), dtype=np.float32)
            if ant is not None and ant.shape == a.shape:
                d = np.abs(a - ant).mean() / 255.0
                if d > limiar:
                    picos.append(t)
            ant = a
        t += passo
    return picos, dur


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--saida", help="nome da pasta de saida")
    ap.add_argument("--modelo", default="small")
    ap.add_argument("--max-quadros", type=int, default=40)
    a = ap.parse_args()

    nome = a.saida or _slug(os.path.splitext(os.path.basename(a.video))[0])
    pasta = os.path.join(DEST, nome)
    os.makedirs(os.path.join(pasta, "telas"), exist_ok=True)
    print("→ %s" % pasta)

    print("transcrevendo...", flush=True)
    segs = transcreve(a.video, a.modelo)
    io.open(os.path.join(pasta, "transcricao.txt"), "w",
            encoding="utf-8").write(
        "\n".join("%7.2f %7.2f  %s" % s for s in segs))
    print("   %d segmentos" % len(segs))

    print("procurando trocas de tela...", flush=True)
    picos, dur = trocas_de_tela(a.video)
    print("   %d trocas em %.0f s" % (len(picos), dur))

    # os segundos em que a fala cita algo que costuma estar escrito na tela
    chave_t = [s[0] for s in segs
               if any(k in s[2].lower() for k in CHAVES)]

    # uniao das duas listas, sem quadros colados (< 6 s um do outro)
    todos = sorted(set([round(x, 1) for x in picos + chave_t]))
    escolhidos, ultimo = [], -99
    for t in todos:
        if t - ultimo >= 6.0:
            escolhidos.append(t)
            ultimo = t
    # se sobrar muito, fica o que esta espalhado pela aula inteira
    if len(escolhidos) > a.max_quadros:
        passo = len(escolhidos) / float(a.max_quadros)
        escolhidos = [escolhidos[int(i * passo)] for i in range(a.max_quadros)]

    print("gravando %d telas..." % len(escolhidos), flush=True)
    indice = []
    for i, t in enumerate(escolhidos, 1):
        f = os.path.join(pasta, "telas", "%03d_%06.1fs.png" % (i, t))
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.2f" % t,
                        "-i", a.video, "-frames:v", "1", f], check=False)
        # a fala daquele momento, para a tela nao ficar orfa
        fala = " ".join(s[2] for s in segs if t - 4 <= s[0] <= t + 8)[:220]
        indice.append({"arquivo": os.path.basename(f), "segundo": t,
                       "fala": fala})
    io.open(os.path.join(pasta, "telas", "_indice.json"), "w",
            encoding="utf-8").write(json.dumps(
                {"video": os.path.basename(a.video), "duracao": dur,
                 "telas": indice}, ensure_ascii=False, indent=2))
    print("pronto · %d telas + transcricao" % len(indice))
    return 0


if __name__ == "__main__":
    sys.exit(main())
