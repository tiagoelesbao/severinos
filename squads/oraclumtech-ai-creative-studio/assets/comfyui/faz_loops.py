# -*- coding: utf-8 -*-
"""Gera a versao LOOP dos leitos e ambiencias.

POR QUE ISTO EXISTE
  O Stable Audio Open recebe a duracao no condicionamento e compoe uma PECA com
  arco: entra, sustenta e DESVANECE. Medido no pack v1: tres dos quatro leitos
  caem 20 a 35 dB nos ultimos 15 segundos. Isso e otimo para um efeito e inutil
  para uma cama que precisa sustentar 10 minutos de narracao.

O QUE ESTE SCRIPT FAZ
  1. Acha a maior janela ESTAVEL (RMS dentro de +/-3 dB da mediana)
  2. Corta so ela
  3. Emenda o fim no comeco com crossfade — o resultado repete sem costura

Uso:  python faz_loops.py
"""
import glob, os, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BANK = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\squads"
        r"\oraclumtech-ai-creative-studio\data\trilhas-and-sfx")

SEGMENTOS_COM_LOOP = ("02-leitos", "03-ambiencias")
SR = 44100
CROSSFADE_S = 2.0
JANELA_S = 0.5           # resolucao da analise de estabilidade
# Leito precisa ser CONSTANTE. Ambiencia natural (chuva, onda, grilo) flutua por
# natureza — exigir dela a mesma constancia rejeitaria material bom.
TOLERANCIA_DB = {"02-leitos": 3.0, "03-ambiencias": 5.0}
MIN_UTIL_S = 10.0        # abaixo disso nao da para emendar com 2 s de crossfade


def ler(f):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "2", "-ar", str(SR),
                        "-f", "f32le", "-"], capture_output=True)
    x = np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)
    return x.reshape(-1, 2)


def gravar(x, f):
    """Loop sai em WAV, e nao em MP3, DE PROPOSITO.

    MP3 carrega atraso de codificador e preenchimento nas bordas do arquivo. Isso
    insere um buraco na volta do loop na maioria dos reprodutores — e, de quebra,
    torna impossivel MEDIR a emenda, porque as amostras das pontas nao sao as que
    voce escreveu. WAV nao tem nenhum dos dois problemas, e e o que o Premiere e o
    After Effects querem receber.
    """
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR),
                          "-ac", "2", "-i", "-", "-c:a", "pcm_s16le", f],
                         stdin=subprocess.PIPE)
    p.communicate(x.astype(np.float32).tobytes())
    return p.returncode == 0


def janela_estavel(x, tolerancia):
    """Maior trecho contiguo cujo RMS fica dentro de +/-tolerancia da mediana.

    A curva e SUAVIZADA antes de decidir. Sem isso, a flutuacao natural de chuva,
    onda e grilo fragmenta a janela e o script rejeita material perfeitamente usavel.
    """
    h = int(JANELA_S * SR)
    mono = x.mean(1)
    n = len(mono) // h
    db = np.array([20 * np.log10(np.sqrt((mono[i * h:(i + 1) * h] ** 2).mean()) + 1e-12)
                   for i in range(n)])
    k = max(1, int(2.0 / JANELA_S))                      # media movel de ~2 s
    suave = np.convolve(db, np.ones(k) / k, mode="same")
    # Duas referencias, e fica a que render a janela maior:
    #   · mediana   — funciona quando a peca e constante do inicio ao fim
    #   · percentil 75 — funciona quando ha desvanecimento no fim, que puxa a mediana
    #     para baixo e faz o trecho sustentado parecer "alto demais"
    # Nenhuma das duas serve para todos os casos; testei. Ficar com a maior e mais
    # simples e mais robusto do que escolher a heuristica "certa".
    melhor, ref = (0, 0), None
    for candidata in (float(np.median(suave)), float(np.percentile(suave, 75))):
        ok = np.abs(suave - candidata) <= tolerancia
        i = 0
        while i < n:
            if ok[i]:
                j = i
                while j < n and ok[j]:
                    j += 1
                if j - i > melhor[1] - melhor[0]:
                    melhor, ref = (i, j), candidata
                i = j
            else:
                i += 1
    return melhor[0] * h, melhor[1] * h, db, (ref if ref is not None else 0.0)


def emendar(x):
    """Sobrepoe o inicio no fim com crossfade — o arquivo passa a repetir sem costura."""
    cf = int(CROSSFADE_S * SR)
    if len(x) <= 2 * cf:
        return x
    cabeca, cauda = x[:cf], x[-cf:]
    corpo = x[:-cf].copy()
    rampa = np.linspace(0.0, 1.0, cf)[:, None]
    corpo[:cf] = cauda * (1 - rampa) + cabeca * rampa
    return corpo


def main():
    feitos, pulados = 0, []
    for seg in SEGMENTOS_COM_LOOP:
        for f in sorted(glob.glob(os.path.join(BANK, seg, "*", "*.mp3"))):
            if f.endswith("-LOOP.mp3"):
                continue
            x = ler(f)
            a, b, db, med = janela_estavel(x, TOLERANCIA_DB[seg])
            util = (b - a) / SR
            nome = os.path.basename(f)[:-4]
            if util < MIN_UTIL_S:
                pulados.append("%s (so %.1fs estaveis)" % (nome, util))
                continue
            loop = emendar(x[a:b])
            dst = f[:-4] + "-LOOP.wav"
            gravar(loop, dst)
            queda = db[-1] - med
            print("  %-30s estavel %5.1f-%5.1fs -> loop de %5.1fs   (fim caia %+.0f dB)"
                  % (nome, a / SR, b / SR, len(loop) / SR, queda))
            feitos += 1
    print("\n  %d loops gerados" % feitos)
    for p in pulados:
        print("  PULADO: %s" % p)


if __name__ == "__main__":
    main()
