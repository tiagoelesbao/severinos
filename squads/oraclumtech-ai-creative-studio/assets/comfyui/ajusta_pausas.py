# -*- coding: utf-8 -*-
"""Roda LITE da narracao: conserta a continuidade de um audio gerado cue a cue.

O PROBLEMA, MEDIDO
  O motor gera UM ARQUIVO POR CUE e concatena. Cada emenda vira uma parada, e o
  intervalo entre elas e SILENCIO DIGITAL — piso de -120 dB. Medido na primeira
  peca: 47 pausas acima de 250 ms, mediana 0,98 s, 16% do tempo em silencio.
  A referencia tem 16 pausas em 42 minutos, mediana 0,72 s.

  E o silencio digital e o que causa a sensacao de "ligando e desligando": o ruido
  de sala da voz some por completo e volta no cue seguinte.

O QUE ESTE SCRIPT FAZ — e o que ele NAO faz
  Ele NAO remove todo silencio. Pausa e prosodia; apagar todas deixa a fala
  atropelada. Ele APARA a pausa longa ate o alvo e PREENCHE o que sobrou com o
  ruido de sala da propria voz, extraido do trecho mais quieto do arquivo.

  1. mede o envelope em janelas de 10 ms
  2. acha as corridas de silencio acima de LIMITE_S
  3. apara cada uma para ALVO_S, com crossfade curto nas emendas
  4. cobre a peca inteira com uma cama de ruido de sala em -52 dB, para o piso
     nunca cair para o digital

QUANDO USAR
  LITE — geracao por cue, rapida, corrigida aqui. Boa para rascunho e teste.
  PRO  — geracao por BLOCO (`.blocos.json`), sem emenda dentro do paragrafo.
         E o padrao, porque a prosodia contInua nao se reconstroi depois.

Uso:  python ajusta_pausas.py <arquivo.wav|mp3> [saida.wav]
"""
import os, subprocess, sys
import numpy as np

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

SR = 44100
JANELA_S = 0.010
LIMITE_S = 0.75          # acima disto e pausa longa demais
ALVO_S = 0.55            # para onde ela e aparada (dentro da faixa util medida)
CROSSFADE_S = 0.030      # emenda sem clique
PISO_DB = -52.0          # nivel da cama de ruido de sala


def ler(f):
    r = subprocess.run(["ffmpeg", "-v", "error", "-i", f, "-ac", "2", "-ar", str(SR),
                        "-f", "f32le", "-"], capture_output=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64).reshape(-1, 2)


def gravar(x, f):
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR),
                          "-ac", "2", "-i", "-", "-c:a", "pcm_s16le", f],
                         stdin=subprocess.PIPE)
    p.communicate(np.clip(x, -1, 1).astype(np.float32).tobytes())
    return p.returncode == 0


def envelope(x):
    h = int(JANELA_S * SR)
    m = x.mean(1)
    n = len(m) // h
    rms = np.sqrt(np.array([(m[i * h:(i + 1) * h] ** 2).mean() for i in range(n)]) + 1e-12)
    return 20 * np.log10(rms), h


def corridas_de_silencio(db, limiar):
    sil = db < limiar
    out, ini = [], None
    for i, v in enumerate(sil):
        if v and ini is None:
            ini = i
        elif not v and ini is not None:
            out.append((ini, i))
            ini = None
    if ini is not None:
        out.append((ini, len(sil)))
    return out


def cama_de_ruido(x, db, h, dur_amostras):
    """Cama de ruido de sala, para o piso nunca cair para o silencio DIGITAL.

    PRIMEIRA TENTATIVA: amostrar a propria gravacao. So vale se o trecho quieto
    tiver mesmo sinal — e a medicao mostrou que muitas vezes NAO tem. A voz
    `male02` sai do motor com silencio digital puro entre os fonemas: o trecho
    mais quieto que achei era 68% de zeros exatos. Nao ha sala para amostrar.

    SEGUNDA: sintetizar. Ruido rosa suave, passa-baixa, em nivel muito baixo.
    Isso NAO e fingir gravacao — e uma decisao de mixagem, a mesma que qualquer
    editor toma ao por um leito de sala sob uma locucao limpa. O que se resolve e
    concreto: sem piso, a entrada e a saida de cada frase soam como um microfone
    ligando e desligando.
    """
    janelas = int(0.5 / JANELA_S)
    melhor = None
    for i in range(0, max(1, len(db) - janelas), janelas):
        trecho = x[i * h:(i + janelas) * h]
        if len(trecho) < h:
            continue
        zeros = float((trecho.mean(1) == 0).mean())
        rms = float(np.sqrt((trecho ** 2).mean()))
        # sala de verdade: quase nenhum zero exato, e nivel baixo
        if zeros < 0.02 and 1e-6 < rms < 10 ** (-40 / 20):
            if melhor is None or rms < melhor[0]:
                melhor = (rms, trecho)

    alvo = 10 ** (PISO_DB / 20)
    if melhor is not None:
        trecho = melhor[1]
        voltas = -(-dur_amostras // len(trecho))
        cama = np.tile(trecho, (voltas, 1))[:dur_amostras]
        origem = "amostrada da propria voz"
    else:
        r = np.random.RandomState(7)
        branco = r.normal(0, 1, (dur_amostras, 2))
        # passa-baixa de 1a ordem: tira o chiado agudo e deixa so o "ar" da sala
        a = 0.02
        cama = np.empty_like(branco)
        cama[0] = branco[0]
        for c in range(2):
            acc = 0.0
            col = branco[:, c]
            saida = np.empty(dur_amostras)
            for i in range(dur_amostras):
                acc += a * (col[i] - acc)
                saida[i] = acc
            cama[:, c] = saida
        origem = "sintetizada (a voz nao tem sala)"

    atual = float(np.sqrt((cama ** 2).mean())) + 1e-12
    print("    cama de sala: %s, em %.0f dB" % (origem, PISO_DB))
    return cama * (alvo / atual)


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        return 1
    ent = sys.argv[1]
    sai = sys.argv[2] if len(sys.argv) > 2 else os.path.splitext(ent)[0] + "-lite.wav"

    x = ler(ent)
    db, h = envelope(x)
    piso = np.percentile(db, 5)
    limiar = max(piso + 6, -70)
    corr = corridas_de_silencio(db, limiar)

    lim_j = int(LIMITE_S / JANELA_S)
    alvo_j = int(ALVO_S / JANELA_S)
    longos = [(a, b) for a, b in corr if b - a > lim_j]

    total_antes = len(x) / SR
    print("  %s" % os.path.basename(ent))
    print("    %.1f s · %d pausas acima de %.2f s" % (total_antes, len(longos), LIMITE_S))

    if not longos:
        print("    nada a aparar")
        return 0

    # monta o audio aparado
    cf = int(CROSSFADE_S * SR)
    pedacos, cursor = [], 0
    for a, b in longos:
        fim_manter = a * h + alvo_j * h
        pedacos.append(x[cursor:min(fim_manter, b * h)])
        cursor = b * h
    pedacos.append(x[cursor:])

    saida = pedacos[0]
    for p in pedacos[1:]:
        if len(saida) >= cf and len(p) >= cf:
            rampa = np.linspace(0, 1, cf)[:, None]
            saida[-cf:] = saida[-cf:] * (1 - rampa) + p[:cf] * rampa
            saida = np.concatenate([saida, p[cf:]])
        else:
            saida = np.concatenate([saida, p])

    # cama de ruido: o piso nunca volta a ser digital
    saida = saida + cama_de_ruido(x, db, h, len(saida))

    gravar(saida, sai)
    db2, _ = envelope(saida)
    piso2 = np.percentile(db2, 5)
    novos = [c for c in corridas_de_silencio(db2, max(piso2 + 6, -70))
             if c[1] - c[0] > lim_j]
    print("    -> %.1f s (%.1f s a menos) · %d pausas longas · piso %.0f dB -> %.0f dB"
          % (len(saida) / SR, total_antes - len(saida) / SR, len(novos), piso, piso2))
    print("    escrito: %s" % sai)
    return 0


if __name__ == "__main__":
    sys.exit(main())
