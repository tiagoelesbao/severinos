#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
gen_sfx_library.py — Kit inicial de SFX/trilhas para o media bin do Video Studio.

Sintetiza áudio 100% original (sem direitos autorais) e o grava em
apps/video-studio/public/library/{sfx,music}/ com nomes que casam com as
CATEGORIAS do sound_design do plano (whoosh/impact/riser/…) e com os MOODS de
trilha (tense/uplifting/lo-fi/chill). Assim a pré-montagem F4.3 deixa de ser
placeholder e toca de verdade. Reproduzível: rode de novo para regenerar.

Uso: python squads/virals-marketing-squad/tools/gen_sfx_library.py
"""

import os
import sys
import math
import wave
import struct
import random

for _s in (sys.stdout, sys.stderr):
    try:
        _s.reconfigure(encoding="utf-8")
    except Exception:
        pass

SR = 44100

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
OUT = os.path.join(REPO, "apps", "video-studio", "public", "library")


# ── Helpers de síntese ──────────────────────────────────────────────────────
def write_wav(path, samples, peak=0.8):
    """Normaliza ao pico e grava WAV mono 16-bit."""
    m = max((abs(s) for s in samples), default=1.0) or 1.0
    g = peak / m
    with wave.open(path, "w") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(b"".join(
            struct.pack("<h", int(max(-1.0, min(1.0, s * g)) * 32767)) for s in samples
        ))


def env_exp(n, decay=6.0):
    return [math.exp(-decay * i / n) for i in range(n)]


def env_ar(n, attack=0.02, release=0.2):
    """Envelope linear de ataque/release (frações de n)."""
    a = max(1, int(n * attack))
    r = max(1, int(n * release))
    out = [1.0] * n
    for i in range(a):
        out[i] = i / a
    for i in range(r):
        out[n - 1 - i] = i / r
    return out


def sine(freq, n, phase0=0.0):
    return [math.sin(2 * math.pi * freq * i / SR + phase0) for i in range(n)]


def noise(n, seed=0):
    rnd = random.Random(seed)
    return [rnd.uniform(-1, 1) for _ in range(n)]


def lowpass(x, a=0.05):
    """Filtro one-pole (a menor = mais grave)."""
    y = [0.0] * len(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc += a * (v - acc)
        y[i] = acc
    return y


def svf_bandpass(x, fc, Q=3.0):
    """Filtro state-variable (Chamberlin) — saída band-pass ressonante.

    `fc` pode ser um número (fixo) ou uma lista (cutoff varrido por amostra).
    Transforma ruído em som TONAL com movimento (whoosh/swoosh) — não chiado.
    """
    low = band = 0.0
    damp = 1.0 / Q
    out = [0.0] * len(x)
    swept = isinstance(fc, list)
    for i, xs in enumerate(x):
        c = min((fc[i] if swept else fc), SR * 0.45)
        f = 2.0 * math.sin(math.pi * c / SR)
        low += f * band
        high = xs - low - damp * band
        band += f * high
        out[i] = band
    return out


def expsweep_arr(f0, f1, n):
    """Array de cutoffs com varredura exponencial f0→f1 (p/ o band-pass)."""
    return [f0 * (f1 / f0) ** (i / max(1, n - 1)) for i in range(n)]


def sweep(f0, f1, n, env=None):
    out = [0.0] * n
    phase = 0.0
    for i in range(n):
        t = i / max(1, n - 1)
        f = f0 * (f1 / f0) ** t
        phase += 2 * math.pi * f / SR
        out[i] = math.sin(phase) * (env[i] if env else 1.0)
    return out


def mix(*tracks):
    n = max((len(t) for t in tracks), default=0)
    out = [0.0] * n
    for t in tracks:
        for i, v in enumerate(t):
            out[i] += v
    return out


def secs(d):
    return int(SR * d)


# ── SFX ─────────────────────────────────────────────────────────────────────
def sfx_whoosh():
    n = secs(0.6)
    swell = [math.sin(math.pi * i / n) ** 1.4 for i in range(n)]  # entra e sai
    bp = svf_bandpass(noise(n, 1), expsweep_arr(280, 3200, n), Q=4.5)  # sobe
    return [bp[i] * swell[i] for i in range(n)]


def sfx_swoosh():
    n = secs(0.35)
    swell = [math.sin(math.pi * i / n) ** 1.3 for i in range(n)]
    bp = svf_bandpass(noise(n, 2), expsweep_arr(3000, 500, n), Q=4.5)  # desce
    return [bp[i] * swell[i] for i in range(n)]


def sfx_impact():
    n = secs(0.5)
    boom = [s * e for s, e in zip(sine(70, n), env_exp(n, 9))]
    click = [s * e for s, e in zip(noise(n, 3), env_exp(n, 60))]
    return mix(boom, [c * 0.5 for c in click])


def sfx_boom():
    n = secs(0.9)
    return [s * e for s, e in zip(sine(46, n), env_exp(n, 5))]


def sfx_riser():
    n = secs(1.2)
    e = [(i / n) ** 1.5 for i in range(n)]
    tonal = sweep(180, 1600, n, e)
    air = svf_bandpass(noise(n, 4), expsweep_arr(600, 4000, n), Q=3.0)
    air = [air[i] * e[i] for i in range(n)]
    return mix([t * 0.7 for t in tonal], [a * 0.35 for a in air])


def sfx_pop():
    n = secs(0.12)
    return [s * e for s, e in zip(sine(720, n), env_exp(n, 30))]


def sfx_click():
    n = secs(0.03)
    return [s * e for s, e in zip(noise(n, 5), env_exp(n, 80))]


def sfx_notification():
    n = secs(0.18)
    a = [s * e for s, e in zip(sine(880, n), env_exp(n, 10))]
    b = [s * e for s, e in zip(sine(1320, n), env_exp(n, 10))]
    return a + b  # dois toques em sequência (ding-dong)


def sfx_ambient():
    # Drone grave suave (não chiado): A + D + LFO lento.
    n = secs(3.0)
    e = env_ar(n, 0.25, 0.25)
    a = sine(110.0, n)
    b = sine(146.83, n)
    lfo = [0.8 + 0.2 * math.sin(2 * math.pi * 0.3 * i / SR) for i in range(n)]
    return [(a[i] + b[i]) / 2 * lfo[i] * e[i] for i in range(n)]


def sfx_transition():
    # Whoosh curto subindo + batida no fim (corte com energia).
    n = secs(0.45)
    swell = [math.sin(math.pi * i / n) ** 1.3 for i in range(n)]
    sw = svf_bandpass(noise(n, 7), expsweep_arr(400, 2600, n), Q=4.0)
    sw = [sw[i] * swell[i] for i in range(n)]
    hit = sfx_pop()
    return mix(sw, [h * 0.5 for h in hit])


# ── Trilhas (pads ~6s, looping-friendly) ────────────────────────────────────
def _arp(freqs, n, rate=2.0, octave=2.0):
    """Arpejo: toca as notas do acorde em sequência (oitava acima), com pluck.

    Dá MOVIMENTO/ritmo ao pad — sem isso a trilha soa como drone "vazio".
    """
    out = [0.0] * n
    step = max(1, int(SR / rate))
    idx = 0
    for k in range(0, n, step):
        f = freqs[idx % len(freqs)] * octave
        idx += 1
        m = min(step, n - k)
        env = env_exp(m, 5.0)
        for i in range(m):
            out[k + i] += env[i] * math.sin(2 * math.pi * f * i / SR)
    return out


def _pad(freqs, dur=6.0, trem=3.0, seed=10, vinyl=0.0, arp_rate=2.0):
    """Pad = acorde sustentado (com brilho de oitava) + arpejo rítmico + tremolo."""
    n = secs(dur)
    e = env_ar(n, 0.06, 0.06)
    base = [0.0] * n
    for k, f in enumerate(freqs):
        det = 1.0 + 0.002 * (k - len(freqs) / 2)  # leve desafinação p/ calor
        for i in range(n):
            t = i / SR
            base[i] += math.sin(2 * math.pi * f * det * t)
            base[i] += 0.3 * math.sin(2 * math.pi * f * 2 * t)  # brilho (oitava)
    base = [b / (len(freqs) * 1.3) for b in base]
    lfo = [0.82 + 0.18 * math.sin(2 * math.pi * trem * i / SR) for i in range(n)]
    arp = _arp(freqs, n, rate=arp_rate)
    out = [(base[i] * lfo[i] * 0.7 + arp[i] * 0.45) * e[i] for i in range(n)]
    if vinyl:
        ns = [v * e[i] for i, v in enumerate(lowpass(noise(n, seed), 0.04))]
        out = mix(out, [v * vinyl for v in ns])
    return out


def music_tense():
    # menor + 2ª menor (dissonância) — A, C, E, Bb · arpejo rápido (tensão)
    return _pad([110, 130.81, 164.81, 116.54], dur=6.0, trem=5.0, seed=11, arp_rate=3.0)


def music_uplifting():
    # maior — C, E, G, C · arpejo médio (energia)
    return _pad([130.81, 164.81, 196.00, 261.63], dur=6.0, trem=3.0, seed=12, arp_rate=2.5)


def music_lofi():
    # maior 7 mais grave + "vinil" — F, A, C, E · arpejo lento (mellow)
    return _pad([87.31, 110.00, 130.81, 164.81], dur=6.0, trem=2.0, seed=13, vinyl=0.18, arp_rate=1.5)


def music_chill():
    # sus2 suave — D, E, A · arpejo bem lento
    return _pad([146.83, 164.81, 220.00], dur=6.0, trem=1.5, seed=14, arp_rate=1.2)


SFX = {
    "whoosh": sfx_whoosh, "swoosh": sfx_swoosh, "impact": sfx_impact, "boom": sfx_boom,
    "riser": sfx_riser, "pop": sfx_pop, "click": sfx_click,
    "notification": sfx_notification, "ambient": sfx_ambient, "transition": sfx_transition,
}
MUSIC = {
    "tense": music_tense, "uplifting": music_uplifting,
    "lo-fi": music_lofi, "chill": music_chill,
}


def main():
    sfx_dir = os.path.join(OUT, "sfx")
    music_dir = os.path.join(OUT, "music")
    os.makedirs(sfx_dir, exist_ok=True)
    os.makedirs(music_dir, exist_ok=True)

    print(f"Biblioteca: {OUT}")
    for name, fn in SFX.items():
        p = os.path.join(sfx_dir, f"{name}.wav")
        write_wav(p, fn(), peak=0.85)
        print(f"  ♪ sfx/{name}.wav")
    for name, fn in MUSIC.items():
        p = os.path.join(music_dir, f"{name}.wav")
        write_wav(p, fn(), peak=0.7)  # bed audível; o ducking na timeline o coloca sob a fala
        print(f"  ♬ music/{name}.wav")
    print(f"OK — {len(SFX)} SFX + {len(MUSIC)} trilhas.")


if __name__ == "__main__":
    sys.exit(main())
