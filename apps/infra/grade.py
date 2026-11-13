# -*- coding: utf-8 -*-
"""Color grading da peca: normaliza os cortes e aplica um look unico.

O QUE ELE RESOLVE
  Cada take saiu de uma geracao diferente, e isso aparece: no `hook.mp4` o
  primeiro corte tem brilho 141,5 e temperatura +48,8; o ultimo, 130,5 e
  +36,1. Onze pontos de brilho e treze de temperatura entre planos que
  deveriam ser o mesmo lugar, na mesma hora.

  Olho nao le numero absoluto -- le DIFERENCA. Por isso a normalizacao vem
  antes do look: de nada adianta um grade bonito por cima de planos que nao
  casam entre si.

A ORDEM DOS FILTROS IMPORTA
  1. normalizar    cada segmento puxado para o alvo comum
  2. pele          tirar o excesso de laranja que o golden hour deixa
  3. contraste     curva em S suave, sem estourar
  4. textura       grao fino, que devolve pele e disfarca banding
  5. vinheta       fecha o olhar no centro

  Grao DEPOIS do contraste: aplicado antes, a curva o amplifica e vira ruido.

MEDIDO, NAO CHUTADO
  Os alvos saem da propria imagem (`--medir` mostra). O script nao tem numero
  fixo de "look bonito": ele leva cada trecho para a mediana do material.

USO
    python grade.py --entrada hook.mp4 --medir
    python grade.py --entrada hook.mp4 --saida hook-grade.mp4
    python grade.py --entrada hook.mp4 --saida h.mp4 --forca 0.7
"""
import argparse
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def mede(caminho, n=12):
    """Brilho, saturacao e temperatura ao longo do video."""
    import cv2
    import numpy as np
    cap = cv2.VideoCapture(caminho)
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    tot = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    linhas = []
    for i in range(0, tot, max(1, tot // n)):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ok, fr = cap.read()
        if not ok:
            continue
        b, g, r = np.mean(fr, axis=(0, 1))
        sat = float(np.mean(cv2.cvtColor(fr, cv2.COLOR_BGR2HSV)[:, :, 1]))
        clip = float(np.mean(np.max(fr, axis=2) >= 250)) * 100
        linhas.append((i / fps, r, g, b, (r + g + b) / 3, sat, r - b, clip))
    cap.release()
    return fps, tot, linhas


def blocos(linhas, salto_brilho=3.0, salto_temp=3.0):
    """Agrupa o video em trechos de cor parecida -- e onde estao os cortes.

    Um corte de camera aparece como salto brusco de brilho ou temperatura
    entre dois instantes vizinhos. Detectar assim evita ter de informar onde
    cada take comeca: o proprio material diz.
    """
    if not linhas:
        return []
    grupos, atual = [], [linhas[0]]
    for ant, at in zip(linhas, linhas[1:]):
        if abs(at[4] - ant[4]) > salto_brilho or abs(at[6] - ant[6]) > salto_temp:
            grupos.append(atual)
            atual = []
        atual.append(at)
    grupos.append(atual)
    saida = []
    for g in grupos:
        if not g:
            continue
        bri = sum(x[4] for x in g) / len(g)
        sat = sum(x[5] for x in g) / len(g)
        tmp = sum(x[6] for x in g) / len(g)
        saida.append((g[0][0], g[-1][0], bri, sat, tmp, len(g)))
    return saida


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--entrada", required=True)
    ap.add_argument("--saida", default=None)
    ap.add_argument("--medir", action="store_true")
    ap.add_argument("--forca", type=float, default=1.0,
                    help="0 a 1: quanto do look aplicar (1 = cheio)")
    ap.add_argument("--grao", type=float, default=4.0)
    ap.add_argument("--sem-vinheta", action="store_true")
    a = ap.parse_args()

    ent = a.entrada
    if not os.path.isfile(ent):
        ent2 = os.path.join(r"C:\Users\Pichau\Downloads", a.entrada)
        if os.path.isfile(ent2):
            ent = ent2
        else:
            raise SystemExit("nao achei %s" % a.entrada)

    fps, tot, linhas = mede(ent)
    grupos = blocos(linhas)
    bri_alvo = sorted(g[2] for g in grupos)[len(grupos) // 2]
    tmp_alvo = sorted(g[4] for g in grupos)[len(grupos) // 2]

    print("%s  %d frames  %.2f s\n" % (os.path.basename(ent), tot, tot / fps))
    print("trechos detectados (por salto de cor):")
    for i, (t0, t1, bri, sat, tmp, n) in enumerate(grupos, 1):
        print("   %d) %.2f a %.2f s   brilho %.1f  satur %.1f  temp %+.1f"
              % (i, t0, t1, bri, sat, tmp))
    print("\nalvo (mediana): brilho %.1f  temp %+.1f" % (bri_alvo, tmp_alvo))
    for i, (t0, t1, bri, sat, tmp, n) in enumerate(grupos, 1):
        print("   %d) corrigir brilho %+.1f   temperatura %+.1f"
              % (i, bri_alvo - bri, tmp_alvo - tmp))
    if a.medir:
        return 0
    if not a.saida:
        raise SystemExit("informe --saida ou use --medir")

    # ── a cadeia de filtros ────────────────────────────────────────────────
    #
    # A ORDEM MUDOU depois de medir. Na primeira versao a normalizacao vinha
    # ANTES do look, e o resultado foi contraditorio: o brilho casou (15,3 ->
    # 2,4 de dispersao) e a temperatura PIOROU (13,9 -> 14,5).
    #
    # O motivo e a curva em S. Ela estica os extremos, e esticar extremos
    # amplia a distancia entre os canais R e B -- ou seja, amplifica a
    # temperatura que ja existe. O trecho mais quente ficava proporcionalmente
    # ainda mais quente, e a correcao aplicada antes era engolida.
    #
    # Agora o look vem primeiro e a normalizacao por trecho fecha a conta em
    # cima do que o look de fato produziu.
    f = []

    # ── LOOK (igual para todos os trechos) ─────────────────────────────────

    # PELE -- o golden hour empurra o laranja longe demais e a pele perde o
    # rosa que a faz parecer pele. Tirar vermelho dos meios-tons devolve isso
    # sem esfriar a cena inteira.
    f.append("colorbalance=rm=%.3f:gm=%.3f:bm=%.3f"
             % (-0.045 * a.forca, 0.010 * a.forca, 0.030 * a.forca))

    # contraste em S suave: levanta o preto (look de filme, nao de video) e
    # segura a alta luz para nao queimar o ceu
    f.append("curves=all='0/0.015 0.25/0.22 0.5/0.5 0.75/0.79 1/0.985'")
    # a curva ja adiciona saturacao aparente; sem compensar, a pele satura.
    # Medido: sem esta linha a saturacao subia de 83 para 95.
    f.append("eq=saturation=%.3f:contrast=%.3f"
             % (1 - 0.06 * a.forca, 1 + 0.02 * a.forca))

    # ── NORMALIZACAO POR TRECHO (depois do look) ───────────────────────────
    for i, (t0, t1, bri, sat, tmp) in enumerate(
            [(g[0], g[1], g[2], g[3], g[4]) for g in grupos]):
        dbri = (bri_alvo - bri) / 255.0 * a.forca
        dtmp = (tmp_alvo - tmp) / 255.0 * a.forca
        ini = 0 if i == 0 else t0 - 0.02
        fim = (tot / fps) + 1 if i == len(grupos) - 1 else t1 + 0.02
        if abs(dbri) > 0.002:
            f.append("eq=brightness=%.4f:enable='between(t,%.2f,%.2f)'"
                     % (dbri, ini, fim))
        if abs(dtmp) > 0.002:
            # GANHO de 6x, e nao e arbitrario: `colorbalance` trabalha numa
            # escala em que 0,01 quase nao move o pixel. A diferenca R-B
            # medida, convertida direto para fracao de 255, dava ajustes de
            # 0,01 -- imperceptiveis. O 6 foi obtido medindo a saida: e o
            # fator que faz o deslocamento pedido acontecer de fato.
            g = dtmp * 6.0
            f.append("colorbalance=rm=%.4f:bm=%.4f:rs=%.4f:bs=%.4f"
                     ":enable='between(t,%.2f,%.2f)'"
                     % (g / 2, -g / 2, g / 3, -g / 3, ini, fim))

    # 4. GRAO depois do contraste. Antes, a curva o amplificaria e viraria
    #    ruido; depois, ele devolve textura de pele e quebra o banding que
    #    aparece em ceu liso gerado por IA.
    if a.grao > 0:
        f.append("noise=alls=%d:allf=t+u" % int(a.grao))

    # 5. vinheta discreta: fecha o olhar no rosto sem anunciar que existe
    if not a.sem_vinheta:
        f.append("vignette=angle=PI/5:mode=forward")

    saida = a.saida
    if not os.path.isabs(saida):
        saida = os.path.join(os.path.dirname(ent), saida)

    cmd = ["ffmpeg", "-v", "error", "-stats", "-y", "-i", ent,
           "-vf", ",".join(f),
           "-c:v", "libx264", "-crf", "16", "-preset", "slow",
           "-pix_fmt", "yuv420p", "-c:a", "copy", saida]
    print("\n%d filtro(s). gerando..." % len(f))
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if r.returncode:
        print((r.stderr or "")[-700:])
        return 1
    print("→ %s (%.1f MB)" % (saida, os.path.getsize(saida) / 1e6))

    _, _, novas = mede(saida)
    gn = blocos(novas)
    print("\ndepois do grade:")
    for i, (t0, t1, bri, sat, tmp, n) in enumerate(gn, 1):
        print("   %d) %.2f a %.2f s   brilho %.1f  satur %.1f  temp %+.1f"
              % (i, t0, t1, bri, sat, tmp))
    if len(gn) > 1:
        print("   dispersao: brilho %.1f  temp %.1f  (antes: %.1f e %.1f)"
              % (max(g[2] for g in gn) - min(g[2] for g in gn),
                 max(g[4] for g in gn) - min(g[4] for g in gn),
                 max(g[2] for g in grupos) - min(g[2] for g in grupos),
                 max(g[4] for g in grupos) - min(g[4] for g in grupos)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
