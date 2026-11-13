# -*- coding: utf-8 -*-
"""Transcricao de referencia — para MODELAR roteiro, nao para copiar texto.

O QUE SE PROCURA NUMA TRANSCRICAO DE REFERENCIA
  Nao e o texto. E a ESTRUTURA: onde entra o gancho, quanto tempo ele segura,
  quando o titulo e finalmente respondido, com que frequencia a promessa e
  renovada, quantas palavras por minuto, onde entra o CTA. Isso e o que se
  modela; a redacao a gente escreve.

  Por isso a saida sai com CARIMBO DE TEMPO em toda linha. Sem o tempo, uma
  transcricao de video de doze minutos e so um texto comprido.

Uso:
    python transcreve.py <arquivo.mp4>
    python transcreve.py <arquivo.mp4> --modelo small
"""
import os
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
AQUI = os.path.dirname(os.path.abspath(__file__))
SAIDA = os.path.join(AQUI, "transcricoes")


def _audio(video, destino):
    """16 kHz mono — o que o modelo quer, e 1/50 do tamanho do mp4."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video,
                    "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le",
                    destino], timeout=1800)
    return os.path.isfile(destino)


FATIA_S = 480          # 8 minutos por fatia


def _fatia(wav, inicio, dur, destino):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(inicio), "-t", str(dur),
                    "-i", wav, "-c", "copy", destino], timeout=300)
    return os.path.isfile(destino) and os.path.getsize(destino) > 1000


def transcreve(video, modelo="small", fatia_s=FATIA_S):
    """Transcreve em FATIAS, e nao de uma vez.

    O VAD do faster-whisper monta uma FFT do audio inteiro: num video de duas
    horas isso pediu 228 MiB de uma so vez numa maquina com 1,8 GB livres, e
    quebrou. Fatiando em oito minutos, o pico passa a ser o de uma fatia — o
    consumo deixa de depender da duracao do video, que e o que permite
    transcrever uma aula de duas horas na mesma maquina que roda a live.

    Os carimbos de tempo de cada fatia sao somados ao deslocamento dela, entao
    a saida final tem a linha do tempo do video inteiro.
    """
    from faster_whisper import WhisperModel
    os.makedirs(SAIDA, exist_ok=True)
    base = os.path.splitext(os.path.basename(video))[0][:70]
    tmp = os.path.join(SAIDA, "_tmp_%d" % abs(hash(base)))
    wav = tmp + ".wav"
    txt = os.path.join(SAIDA, base + ".txt")

    print("extraindo audio...", flush=True)
    if not _audio(video, wav):
        print("falhou ao extrair audio")
        return None
    total = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", wav], capture_output=True, text=True).stdout.strip() or 0)

    print("carregando modelo %s (cpu/int8)..." % modelo, flush=True)
    m = WhisperModel(modelo, device="cpu", compute_type="int8")

    t0 = time.time()
    linhas, palavras = [], 0
    n = int(total // fatia_s) + 1
    for i in range(n):
        ini = i * fatia_s
        dur = min(fatia_s, total - ini)
        if dur < 1:
            break
        pedaco = tmp + "_%02d.wav" % i
        if not _fatia(wav, ini, dur, pedaco):
            continue
        segs, _ = m.transcribe(pedaco, language="pt", vad_filter=True,
                               vad_parameters={"min_silence_duration_ms": 400})
        for s_ in segs:
            mm, ss = divmod(int(ini + s_.start), 60)
            linhas.append("[%02d:%02d] %s" % (mm, ss, s_.text.strip()))
            palavras += len(s_.text.split())
        try:
            os.remove(pedaco)
        except OSError:
            pass
        print("  fatia %d/%d  ·  %d linhas  ·  %.0fs" % (i + 1, n, len(linhas),
                                                         time.time() - t0), flush=True)

    dur_min = max(total / 60.0, 0.01)
    cab = [
        "# %s" % base,
        "duracao: %d:%02d  ·  palavras: %d  ·  ritmo: %.1f palavras/min"
        % (total // 60, total % 60, palavras, palavras / dur_min),
        "", ]
    with open(txt, "w", encoding="utf-8") as f:
        f.write("\n".join(cab + linhas))
    try:
        os.remove(wav)
    except OSError:
        pass
    print("\n%d linhas · %d palavras · %.1f p/min · %.0fs de processamento"
          % (len(linhas), palavras, palavras / dur_min, time.time() - t0))
    print("saida: transcricoes/%s.txt" % base)
    return txt


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if not args:
        print(__doc__)
        sys.exit(1)
    modelo = "small"
    if "--modelo" in sys.argv:
        modelo = sys.argv[sys.argv.index("--modelo") + 1]
    transcreve(args[0], modelo)
