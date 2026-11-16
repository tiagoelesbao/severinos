# -*- coding: utf-8 -*-
"""Cadeia de rádio — o que separa locução esportiva de leitura de texto.

O NÚMERO QUE EXPLICA A FALTA DE EMOÇÃO
  Medindo dois narradores de futebol reais contra a saída crua do Piper:

      narrador 1     faixa dinâmica na fala  13,9 dB
      narrador 2                             15,0 dB
      piper (cru)                            26,1 dB   ← quase o dobro

  Faixa dinâmica larga não é "mais expressivo" — é o contrário. Significa que
  as sílabas fracas caem muito abaixo das fortes e somem. Locução de rádio é
  COMPRIMIDA: tudo empurrado para cima, sem vales, presença constante. É por
  isso que ela parece próxima e cheia de energia mesmo quando o locutor não
  está gritando.

  Nenhuma troca de voz resolve isso, porque não é o timbre — é a dinâmica. E
  ela se corrige no processamento, com qualquer motor.

A CADEIA, E POR QUE NESTA ORDEM
  1. corte grave (90 Hz)  tira sopro e ruído que a compressão amplificaria
  2. compressor 5:1       fecha a distância entre sílaba forte e fraca
  3. presença (+3 dB)     2,8 kHz é onde mora a inteligibilidade da consoante
  4. corpo (+2 dB)        180 Hz devolve o peito que a compressão achata
  5. limitador            segura o pico sem cortar
  6. normalização         nível previsível para a mesa do OBS

Uso:  python radio.py entrada.mp3 saida.mp3
      python radio.py entrada.mp3 saida.mp3 --forte
"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# `threshold` mais baixo e `ratio` mais alto = mais compressão = menos dinâmica.
# O perfil "forte" é para o momento do gol, onde se quer parede de som.
PERFIS = {
    "padrao": {"th": 0.05, "ratio": 5, "presenca": 3, "corpo": 2, "lufs": -14},
    "forte":  {"th": 0.03, "ratio": 8, "presenca": 4.5, "corpo": 2.5, "lufs": -12},
    # `leve` e o perfil do VIDEO LONGO. A live disputa com cama de torcida e pede
    # parede de som; o VOD nao disputa com nada, e compressao demais ali achata a
    # locucao e cansa o ouvido em doze minutos. Mesma presenca (2,8 kHz continua
    # sendo onde mora a consoante), metade da compressao, e -16 LUFS, que e o
    # alvo do YouTube — acima disso a plataforma abaixa sozinha.
    "leve":   {"th": 0.10, "ratio": 3, "presenca": 2.5, "corpo": 1.5, "lufs": -16},
}


def cadeia(perfil="padrao"):
    p = PERFIS[perfil]
    return ",".join([
        "highpass=f=90",
        # attack curto pega o transiente da consoante; release médio evita
        # o "bombeamento" audível entre palavras
        "acompressor=threshold=%s:ratio=%d:attack=5:release=140:makeup=2"
        % (p["th"], p["ratio"]),
        "equalizer=f=2800:width_type=o:width=1.4:g=%s" % p["presenca"],
        "equalizer=f=180:width_type=o:width=1.0:g=%s" % p["corpo"],
        "alimiter=limit=0.95",
        "loudnorm=I=%d:TP=-1.5:LRA=7" % p["lufs"],
    ])


def processa(entrada, saida, perfil="padrao"):
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", entrada,
                        "-af", cadeia(perfil), "-c:a", "libmp3lame", "-b:a", "192k",
                        saida], capture_output=True, text=True, timeout=120)
    if not os.path.isfile(saida):
        print("falhou:", (r.stderr or "")[-200:])
        return False
    return True


def mede(f):
    """(faixa dinâmica na fala, variação) — as duas medidas que importam aqui."""
    import numpy as np
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "1", "-ar", "22050",
                        "-f", "f32le", "-"], capture_output=True)
    x = np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)
    if not len(x):
        return None, None
    h = int(0.03 * 22050)
    env = np.array([np.sqrt((x[i * h:(i + 1) * h] ** 2).mean() + 1e-12)
                    for i in range(len(x) // h)])
    db = 20 * np.log10(env + 1e-12)
    voz = db[db > db.max() - 35]
    return np.percentile(voz, 95) - np.percentile(voz, 5), voz.std()


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) < 2:
        print(__doc__)
        sys.exit(1)
    perfil = "forte" if "--forte" in sys.argv else "padrao"
    if processa(args[0], args[1], perfil):
        a_din, a_var = mede(args[0])
        d_din, d_var = mede(args[1])
        print("perfil: %s" % perfil)
        print("  antes  faixa dinâmica %.1f dB · variação %.1f dB" % (a_din, a_var))
        print("  depois faixa dinâmica %.1f dB · variação %.1f dB" % (d_din, d_var))
        print("  alvo (narradores reais): 14 a 15 dB")
