# -*- coding: utf-8 -*-
"""Escolhe o melhor trecho de voz de uma gravacao para virar referencia.

PARA QUE SERVE
  O Movie Builder recebe a voz do personagem como uma amostra curta -- no filme
  de exemplo do autor sao 4 segundos (`TrimAudioDuration [0, 4]`). Escolher
  esses 4 segundos a ouvido, numa gravacao de 3 minutos, e trabalho chato e
  facil de errar: pega-se um trecho com respiracao, corte de palavra ou ruido
  de fundo, e todo o filme herda isso.

  Aqui a escolha e medida.

O QUE DECIDE UM BOM TRECHO
  fala continua     o trecho tem de ser FALA do comeco ao fim. Comecar em meio
                    silencio gasta 25% da amostra com nada.
  silencio limpo    a diferenca entre o pico da fala e o vale entre as palavras
                    e o que mede ruido de fundo. Vale alto = chiado.
  nivel estavel     trecho que comeca alto e termina baixo ensina uma voz que
                    perde forca.
  sem corte         nao pode comecar nem terminar no meio de uma palavra -- por
                    isso a transcricao entra na conta, nao so a energia.

O QUE ELE NAO RESOLVE, E NAO PRECISA
  A ENTONACAO da amostra nao manda na entonacao do resultado. No fluxo do autor
  a amostra da o TIMBRE e a direcao vem do prompt -- ele escreve literalmente
  `[SOUNDS]: She speaks in a badass and slow tone`. Entao uma gravacao de assunto
  pesado serve de referencia para uma peca alegre; o que se escolhe aqui e a
  voz, nao o humor.

  Ainda assim o script prefere trechos de nivel estavel e sem extremo emocional
  (medido pela variacao de energia), porque tom muito carregado vaza um pouco.

USO
    python prepara_voz_ref.py "C:\\...\\gravacao.mp4"
    python prepara_voz_ref.py video.mp4 --segundos 6 --quantos 5
"""
import argparse
import io
import json
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
ENTRADA_COMFY = (r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable"
                 r"\ComfyUI\input")


def extrai(video, saida, sr=48000):
    """Mono, 48k, sem normalizar -- normalizar aqui esconderia o ruido."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video, "-vn",
                    "-ac", "1", "-ar", str(sr), saida], check=True)
    return saida


def transcreve(wav, modelo="small", idioma="pt"):
    from faster_whisper import WhisperModel
    m = WhisperModel(modelo, device="cpu", compute_type="int8")
    segs, _ = m.transcribe(wav, language=idioma, vad_filter=True,
                           word_timestamps=True)
    fora = []
    for s in segs:
        palavras = [(w.start, w.end, w.word) for w in (s.words or [])]
        fora.append({"ini": s.start, "fim": s.end,
                     "texto": (s.text or "").strip(), "palavras": palavras})
    return fora


def _nota(x, sr, ini, dur):
    """Pontua uma janela: fala cheia, silencio limpo, nivel estavel."""
    import numpy as np
    a = x[int(ini * sr):int((ini + dur) * sr)]
    if len(a) < int(dur * sr * 0.98):
        return None
    # envelope em blocos de 20 ms
    n = int(sr * 0.02)
    blocos = a[:len(a) // n * n].reshape(-1, n)
    rms = np.sqrt((blocos.astype(np.float64) ** 2).mean(axis=1)) + 1e-9
    db = 20 * np.log10(rms)
    pico = float(np.percentile(db, 95))
    vale = float(np.percentile(db, 10))
    cheio = float((db > pico - 25).mean())          # quanto do trecho e fala
    limpo = pico - vale                              # distancia fala/silencio
    metade = len(db) // 2
    deriva = abs(float(db[:metade].mean() - db[metade:].mean()))
    if float(np.abs(a).max()) >= 0.999:              # clipado
        return None
    nota = cheio * 55 + min(limpo, 45) * 0.9 - deriva * 2.2
    return {"nota": nota, "cheio": cheio, "limpo": limpo, "deriva": deriva,
            "pico": pico}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("video")
    ap.add_argument("--segundos", type=float, default=4.0,
                    help="duracao da amostra (o autor usa 4)")
    ap.add_argument("--quantos", type=int, default=4)
    ap.add_argument("--nome", default="voz-ref")
    ap.add_argument("--modelo", default="small")
    a = ap.parse_args()

    import numpy as np
    import soundfile as sf

    tmp = os.environ.get("TEMP", ".")
    wav = os.path.join(tmp, "_voz_%d.wav" % os.getpid())
    print("extraindo audio...", flush=True)
    extrai(a.video, wav)
    x, sr = sf.read(wav, dtype="float32")
    print("   %.1f s @ %d Hz" % (len(x) / sr, sr))

    print("transcrevendo...", flush=True)
    segs = transcreve(wav, a.modelo)
    print("   %d segmentos de fala" % len(segs))

    # candidatos: janelas que COMECAM no inicio de uma palavra e terminam no
    # fim de outra -- e o que evita cortar no meio de silaba
    inicios = []
    for s in segs:
        for (ini, fim, pal) in s["palavras"]:
            inicios.append(ini)
    vistos, cand = set(), []
    for ini in inicios:
        chave = round(ini, 1)
        if chave in vistos:
            continue
        vistos.add(chave)
        n = _nota(x, sr, ini, a.segundos)
        if n:
            n["ini"] = ini
            n["texto"] = " ".join(
                p for s in segs for (i2, f2, p) in s["palavras"]
                if ini <= i2 < ini + a.segundos).strip()
            cand.append(n)
    cand.sort(key=lambda c: -c["nota"])

    # nao devolver quatro versoes do mesmo trecho
    escolhidos = []
    for c in cand:
        if all(abs(c["ini"] - e["ini"]) > a.segundos for e in escolhidos):
            escolhidos.append(c)
        if len(escolhidos) >= a.quantos:
            break

    os.makedirs(ENTRADA_COMFY, exist_ok=True)
    print("\n%-3s %-8s %-6s %-7s %-7s %-7s %s"
          % ("#", "inicio", "nota", "fala%", "limpo", "deriva", "texto"))
    saidas = []
    for i, c in enumerate(escolhidos, 1):
        d = os.path.join(ENTRADA_COMFY, "%s-%02d.wav" % (a.nome, i))
        sf.write(d, x[int(c["ini"] * sr):int((c["ini"] + a.segundos) * sr)], sr)
        saidas.append(d)
        print("%-3d %-8.2f %-6.1f %-7.0f %-7.1f %-7.1f %s"
              % (i, c["ini"], c["nota"], c["cheio"] * 100, c["limpo"],
                 c["deriva"], c["texto"][:58]))
    io.open(os.path.join(tmp, "voz_ref_transcricao.txt"), "w",
            encoding="utf-8").write(
        "\n".join("%7.2f %7.2f  %s" % (s["ini"], s["fim"], s["texto"])
                  for s in segs))
    print("\ntranscricao completa: %s" % os.path.join(tmp, "voz_ref_transcricao.txt"))
    for d in saidas:
        print("→ %s" % d)
    try:
        os.remove(wav)
    except OSError:
        pass
    return 0


if __name__ == "__main__":
    sys.exit(main())
