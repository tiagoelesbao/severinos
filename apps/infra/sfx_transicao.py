# -*- coding: utf-8 -*-
"""Constroi o SFX da transicao de corte: riser -> whoosh -> impacto.

POR QUE SINTETIZAR EM VEZ DE BAIXAR
  Um whoosh de banco vem com duracao propria e com o pico onde o autor
  colocou. Aqui o pico precisa cair EXATAMENTE no quadro do corte -- e o
  corte muda toda vez que o hook e reeditado. Sintetizado, o arquivo nasce
  com o pico no instante pedido e com a cauda que cabe no que vem depois.

AS TRES CAMADAS, E O QUE CADA UMA FAZ NO OUVIDO
  RISER    um chirp que sobe de 180 Hz a ~1,7 kHz ao longo de 0,9 s. E o que
           cria EXPECTATIVA: o ouvido reconhece frequencia subindo como algo
           prestes a acontecer e comeca a esperar o corte antes de ele vir.
  WHOOSH   ruido em banda media com envelope de sino centrado no corte. E o
           movimento -- a sensacao de que alguma coisa PASSOU pela tela.
  IMPACTO  seno grave em 55 Hz com decaimento rapido, mais o segundo
           harmonico. E o peso. Sem ele o corte soa fino; e o grave que faz
           o corpo sentir o corte, nao so o ouvido.

  As tres juntas somam mais de 0 dBFS se forem misturadas cruas. O `amix`
  com `normalize=0` mantem os niveis relativos que foram pensados, e um
  limitador no fim segura o pico -- normalizar aqui achataria o impacto,
  que e justamente o que precisa estourar.

O INSTANTE DO CORTE
  O arquivo nasce com o corte em `--corte` segundos a partir do inicio (1,0
  por padrao). Antes disso e antecipacao; depois, cauda. Quem monta alinha
  esse instante com o quadro do corte -- no AE, com o marcador que o
  `monta_after.py` ja escreve na camada.

USO
    python sfx_transicao.py --saida transicao-flare.wav
    python sfx_transicao.py --saida t.wav --corte 1.0 --cauda 1.4
"""
import argparse
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DOWN = r"C:\Users\Pichau\Downloads"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default="transicao-flare.wav")
    ap.add_argument("--corte", type=float, default=1.0,
                    help="segundo em que o pico cai (= o quadro do corte)")
    ap.add_argument("--cauda", type=float, default=1.4,
                    help="quanto de som sobra depois do corte")
    ap.add_argument("--riser", type=float, default=0.9,
                    help="duracao da subida antes do corte")
    a = ap.parse_args()

    c = a.corte
    total = c + a.cauda

    # ── RISER ──────────────────────────────────────────────────────────────
    # chirp linear: a fase e a integral da frequencia, entao uma frequencia
    # que cresce em linha reta vira um termo em t^2 dentro do seno. O
    # envelope (t/dur)^2 faz a intensidade subir junto com a altura -- as
    # duas coisas crescendo e o que vende a expectativa.
    ini_r = max(0.0, c - a.riser)
    riser = ("aevalsrc='0.30*sin(2*PI*(180*(t-%.3f)+820*(t-%.3f)*(t-%.3f)))"
             "*between(t,%.3f,%.3f)*pow(max(0,(t-%.3f)/%.3f),2)'"
             ":d=%.3f:s=48000"
             % (ini_r, ini_r, ini_r, ini_r, c, ini_r, a.riser, total))

    # ── WHOOSH ─────────────────────────────────────────────────────────────
    # ruido branco filtrado para a faixa media (onde o ouvido enxerga
    # movimento) com envelope gaussiano centrado no corte. Gaussiano e nao
    # triangular porque o ataque precisa ser suave nos dois lados: whoosh
    # com quina soa como clique.
    whoosh = ("anoisesrc=c=white:d=%.3f:r=48000,"
              "highpass=f=700,lowpass=f=7000,"
              "volume='0.55*exp(-pow((t-%.3f)/0.17,2))':eval=frame"
              % (total, c))

    # ── IMPACTO ────────────────────────────────────────────────────────────
    # 55 Hz e o grave que o alto-falante de celular NAO reproduz -- mas o de
    # fone e o de caixa reproduzem, e e onde mora o peso. O segundo harmonico
    # em 110 Hz e o que garante que sobre alguma coisa no celular.
    impacto = ("aevalsrc='(0.85*sin(2*PI*55*(t-%.3f))*exp(-6*(t-%.3f))"
               "+0.40*sin(2*PI*110*(t-%.3f))*exp(-10*(t-%.3f)))"
               "*gte(t,%.3f)':d=%.3f:s=48000"
               % (c, c, c, c, c, total))

    # ── TRANSIENTE ─────────────────────────────────────────────────────────
    # 25 ms de ruido agudo no exato quadro do corte. E o "tec" que da a
    # sensacao de FILME -- a emenda mecanica, nao a eletronica.
    trans = ("anoisesrc=c=white:d=%.3f:r=48000,"
             "highpass=f=3000,"
             "volume='0.45*exp(-pow((t-%.3f)/0.012,2))':eval=frame"
             % (total, c))

    saida = a.saida if os.path.isabs(a.saida) else os.path.join(DOWN, a.saida)
    cmd = ["ffmpeg", "-v", "error", "-y",
           "-f", "lavfi", "-i", riser,
           "-f", "lavfi", "-i", whoosh,
           "-f", "lavfi", "-i", impacto,
           "-f", "lavfi", "-i", trans,
           "-filter_complex",
           # normalize=0: manter a proporcao pensada entre as camadas. Com
           # normalize=1 o amix divide tudo pelo numero de entradas e o
           # impacto, que precisa dominar, vira mais um.
           "[0][1][2][3]amix=inputs=4:normalize=0[m];"
           "[m]alimiter=limit=0.92:attack=1:release=40,"
           "aformat=sample_fmts=s16:sample_rates=48000:"
           "channel_layouts=stereo[out]",
           "-map", "[out]", "-t", "%.3f" % total, saida]
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if r.returncode:
        print((r.stderr or "")[-900:])
        return 1

    print("→ %s" % saida)
    print("   %.2f s  ·  o corte cai em %.2f s  ·  cauda de %.2f s"
          % (total, c, a.cauda))

    # ── CONFERENCIA: o pico caiu onde foi pedido? ──────────────────────────
    #
    # A primeira versao usava `astats=reset=1` e imprimia -76 dB para um
    # arquivo cujo pico real e -3 dB. O motivo: com `reset`, o astats emite
    # um bloco por janela e o que sobra no stderr e a ULTIMA -- que aqui e a
    # cauda, justamente o trecho mais silencioso. O numero estava certo para
    # a janela errada.
    #
    # Envelope em janelas diz a coisa certa: onde o som ESTA, nao quanto ele
    # mede no fim.
    print("")
    print("   envelope (pico por 100 ms):")
    try:
        import wave
        import numpy as np
        w = wave.open(saida, "rb")
        x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
        sr, ch = w.getframerate(), w.getnchannels()
        w.close()
        x = x.astype(np.float32) / 32768.0
        if ch > 1:
            x = x.reshape(-1, ch).mean(axis=1)
        passo = int(0.1 * sr)
        topo, t_topo = -99.0, 0.0
        for i in range(0, len(x) - passo, passo):
            db = 20 * float(np.log10(float(np.max(np.abs(x[i:i + passo]))) + 1e-9))
            if db > topo:
                topo, t_topo = db, i / float(sr)
            print("   %5.2f s  %6.1f dB  %s"
                  % (i / float(sr), db, "#" * int(max(0, (db + 60) / 60 * 36))))
        print("   pico em %.2f s (%.1f dB) -- pedido: %.2f s" % (t_topo, topo, c))
        if abs(t_topo - c) > 0.15:
            print("   ATENCAO: o pico nao caiu onde foi pedido")
    except Exception as e:
        print("   nao consegui medir: %s" % e)
    return 0


if __name__ == "__main__":
    sys.exit(main())
