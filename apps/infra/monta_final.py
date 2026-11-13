# -*- coding: utf-8 -*-
"""Monta a peca final: hook -> retrospectiva 2025 -> expectativa 2026.

A ESTRUTURA
    1. HOOK           o material gerado, colorido, com a voz e o SFX
    2. FLASH          um quadro claro, que e o corte de memoria
    3. 2025           material real, preto e branco, audio abafado
    4. 2026           cartela de expectativa
    5. LOGO           fecho da marca

POR QUE PRETO E BRANCO NA RETROSPECTIVA
  Nao e so estetica: e o que permite misturar dois materiais de qualidades
  muito diferentes. O hook e 1440x2518 gerado; o video de 2025 e 360x640 de
  celular. Lado a lado, em cor, a diferenca de resolucao gritaria. Em P&B com
  grao e vinheta, a baixa resolucao deixa de ser defeito e vira ARQUIVO --
  o olho le como gravacao antiga, que e exatamente a leitura que se quer.

O AUDIO DA RETROSPECTIVA
  Passa-baixa em 1,2 kHz mais volume reduzido. Som abafado nao e som baixo:
  e som com os agudos cortados, que e como a memoria soa no cinema. Baixar o
  volume so deixa distante; cortar agudo deixa PASSADO.

AS CARTELAS
  Sao o unico lugar da peca que afirma fato. "12 DE OUTUBRO" e a data do Dia
  das Criancas no Brasil -- verificavel. Nao ha promessa de acao nessa data:
  a cartela diz o que se espera, nao o que esta contratado.

USO
    python monta_final.py --conferir
    python monta_final.py --saida peca-final.mp4
"""
import argparse
import io
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DOWN = r"C:\Users\Pichau\Downloads"
HOOK = os.path.join(DOWN, "hook-grade.mp4")
V2025 = os.path.join(DOWN, "video (1).mp4")
# A COROA vem do PNG limpo, nao do jpg original.
#
# O jpg tem 800x250 com o desenho so na esquerda (x 4..291). Centrado por
# `overlay`, ele cai 136 px a esquerda do centro num quadro de 1080 -- e foi
# o que aconteceu: a coroa saiu visivelmente torta em relacao ao texto. E o
# `colorkey` no branco furava as estrelas de dentro da coroa junto com o
# fundo. `limpa_logo.py` resolve os dois.
LOGO = os.path.join(DOWN, "imperio-coroa.png")
LOGO_ORIG = os.path.join(DOWN, "239b4086-7002-4d46-afc2-947fa9de515a.jpg")
FLARE = os.path.join(DOWN, "flare.png")
SFX = os.path.join(DOWN, "transicao-flare.wav")
SFX_PICO = 1.0          # o instante, dentro do wav, em que o impacto cai
FONTE = "C\\:/Windows/Fonts/impact.ttf"

# formato de saida: 9:16 limpo. O hook e 1440x2518 (nao e 9:16 exato) e o
# material de 2025 e 360x640 -- os dois precisam ir para a mesma grade.
LARG, ALT, FPS = 1080, 1920, 30

# OS MOMENTOS DA RETROSPECTIVA
#
# Escolhidos vendo, nao so medindo. A analise de movimento apontava 40-44 s
# como o pico -- mas ali e o Bruno andando, que ja e o fecho. Os picos
# EMOCIONAIS sao outros: a massa de criancas correndo, a comida sendo
# servida, a comunidade vista de cima com a estrutura montada.
#
#   (inicio, duracao, o que e)
MOMENTOS = [
    (9.4, 2.2, "as criancas correndo em massa pela rua"),
    (17.6, 2.0, "a comida sendo servida"),
    (25.6, 2.0, "a comunidade de cima, com tudo montado"),
    (29.6, 2.2, "a multidao de criancas na rua"),
    # 38.4 e nao 40.4: o video tem 40,77 s, entao comecar em 40,4 deixava
    # so 0,37 s de material. O ffmpeg nao reclama -- ele entrega o que ha, e
    # a peca sai 1,9 s mais curta sem dizer por que.
    (38.4, 2.2, "o Bruno e a marca -- fecho da retrospectiva"),
]


def dur(caminho):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", caminho],
                       capture_output=True, text=True)
    return float((r.stdout or "0").strip() or 0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default="peca-final.mp4")
    ap.add_argument("--conferir", action="store_true")
    ap.add_argument("--grao", type=int, default=10)
    a = ap.parse_args()

    for rot, p in (("hook", HOOK), ("video 2025", V2025), ("logo", LOGO)):
        if not os.path.isfile(p):
            raise SystemExit("falta %s: %s" % (rot, p))

    d_hook = dur(HOOK)
    d_fonte = dur(V2025)
    for t0, d, oque in MOMENTOS:
        if t0 + d > d_fonte:
            raise SystemExit(
                "o momento em %.1f s + %.1f s passa do fim do video (%.2f s). "
                "O ffmpeg entregaria o que ha e a peca sairia mais curta sem "
                "avisar -- por isso paro aqui." % (t0, d, d_fonte))
    d_retro = sum(m[1] for m in MOMENTOS)
    print("hook           %.2f s" % d_hook)
    print("retrospectiva  %.2f s  (%d momentos)" % (d_retro, len(MOMENTOS)))
    for t, d, oque in MOMENTOS:
        print("   %5.1f s  +%.1f  %s" % (t, d, oque))
    print("cartela 2026   3.20 s")
    print("total          %.2f s" % (d_hook + d_retro + 3.2))
    if a.conferir:
        return 0

    esc = ("scale=%d:%d:force_original_aspect_ratio=increase,"
           "crop=%d:%d,setsar=1,fps=%d" % (LARG, ALT, LARG, ALT, FPS))

    ent, fil, vs, as_ = [], [], [], []

    # ── 1 · HOOK ───────────────────────────────────────────────────────────
    ent += ["-i", HOOK]
    fil.append("[0:v]%s[vh]" % esc)
    fil.append("[0:a]aformat=sample_fmts=fltp:sample_rates=48000:"
               "channel_layouts=stereo[ah]")
    vs.append("[vh]"); as_.append("[ah]")

    # ── 2 · os trechos de 2025, em P&B ─────────────────────────────────────
    #
    # `hue=s=0` tira a cor; a curva levanta o preto e segura a alta luz, que e
    # o que faz P&B parecer pelicula e nao foto dessaturada. O grao vem por
    # ultimo, pelo mesmo motivo de sempre: aplicado antes, o contraste o
    # transforma em ruido.
    # A ORDEM: `hue=s=0` vem DEPOIS do `noise`, e nao antes.
    #
    # Medido: com o hue primeiro, a retrospectiva saia com saturacao 30-38 em
    # vez de zero. A causa e que o `noise` sorteia valor independente para os
    # tres canais -- ou seja, ele PINTA. Ruido colorido sobre imagem ja
    # dessaturada devolve cor ao quadro, e o P&B deixa de ser P&B.
    pb = ("curves=all='0/0.06 0.25/0.24 0.5/0.52 0.75/0.80 1/0.94',"
          "eq=contrast=1.12:brightness=0.02,"
          "noise=alls=%d:allf=t+u,"
          "hue=s=0,"
          "vignette=angle=PI/4.2:mode=forward" % a.grao)

    for i, (t0, d, _) in enumerate(MOMENTOS):
        idx = i + 1
        ent += ["-ss", "%.2f" % t0, "-t", "%.2f" % d, "-i", V2025]
        rot = "[v%d]" % idx
        extra = ""
        if i == 0:
            # a cartela 2025 so no primeiro trecho, entrando e saindo suave
            extra = (",drawtext=fontfile='%s':text='2025':fontcolor=white@0.92:"
                     "fontsize=150:x=(w-text_w)/2:y=h*0.40:"
                     "alpha='if(lt(t,0.25),t/0.25,if(lt(t,1.5),1,"
                     "max(0,1-(t-1.5)/0.5)))'" % FONTE)
        fil.append("[%d:v]%s,%s%s%s" % (idx, esc, pb, extra, rot))
        # audio: passa-baixa + volume. Abafado, nao baixo.
        fil.append("[%d:a]aformat=sample_fmts=fltp:sample_rates=48000:"
                   "channel_layouts=stereo,lowpass=f=1200,volume=0.45[a%d]"
                   % (idx, idx))
        vs.append(rot); as_.append("[a%d]" % idx)

    # ── 3 · cartela 2026 ───────────────────────────────────────────────────
    #
    # A cartela e gerada como ARQUIVO, nao como ramo do filter_complex.
    #
    # Tentei primeiro dentro do grafo e o resultado foi silencioso e errado: a
    # peca saia com a duracao certa, o texto aparecia -- mas sobre o ULTIMO
    # trecho da retrospectiva, e nao sobre o preto. Isolada, a mesma cadeia de
    # filtros funciona (testei). O que quebra e a mistura de fontes `lavfi`
    # infinitas e imagem estatica de um frame dentro de um `concat` com seis
    # pares de stream: o `color` e o `LOGO` nao tem duracao propria, e o
    # concat resolve isso de um jeito que nao e o esperado.
    #
    # Gerar em dois passos custa um arquivo temporario e devolve algo que da
    # para abrir e conferir sozinho -- que e o que faltava para enxergar o bug.
    cart = os.path.join(DOWN, "_cartela-2026.mp4")
    nf = int(3.2 * FPS)

    # o nome da marca vai para arquivo, em UTF-8, por causa dos acentos
    arq_marca = os.path.join(DOWN, "_marca.txt")
    io.open(arq_marca, "w", encoding="utf-8").write(u"IMPÉRIO PRÊMIOS")
    # no filtergraph do ffmpeg, `:` e `\` sao separadores -- o caminho do
    # Windows precisa ser escapado antes de entrar como valor de opcao
    arq_marca_ff = arq_marca.replace("\\", "/").replace(":", "\\:")
    cmd_c = ["ffmpeg", "-v", "error", "-y",
             "-f", "lavfi", "-i", "color=c=black:s=%dx%d:r=%d" % (LARG, ALT, FPS),
             "-i", LOGO,
             # O AUDIO DA CARTELA NAO E SILENCIO.
             #
             # Medido na primeira versao: a retrospectiva termina em -26,4 dB
             # e a cartela entrava com -91 dB -- silencio digital. Sessenta e
             # cinco decibeis de queda num unico quadro nao e fecho, e falha
             # de arquivo: o ouvido le como se o video tivesse acabado antes
             # da imagem.
             #
             # O que fecha e a CAUDA: a mesma ambiencia de 2025, cortada mais
             # fundo no grave (700 Hz contra os 1200 da retrospectiva) e
             # decaindo ao longo dos 3,2 s. O riso das criancas continua sob
             # o preto e some -- que e o que a peca esta dizendo.
             "-ss", "35.0", "-t", "3.2", "-i", V2025,
             "-filter_complex",
             "[2:a]aformat=sample_fmts=fltp:sample_rates=48000:"
             "channel_layouts=stereo,lowpass=f=700,volume=0.22,"
             "afade=t=in:st=0:d=0.3,afade=t=out:st=0.7:d=2.4[ac];"
             # o PNG ja tem alpha: nao ha colorkey aqui, e por isso as
             # estrelas brancas de dentro da coroa continuam brancas
             "[1:v]scale=330:-1[logo];"
             "[0:v]drawtext=fontfile='%s':text='2026':fontcolor=white:"
             "fontsize=170:x=(w-text_w)/2:y=h*0.30:alpha='min(1,t/0.4)',"
             "drawtext=fontfile='%s':text='12 DE OUTUBRO':fontcolor=0x2BB3F0:"
             "fontsize=74:x=(w-text_w)/2:y=h*0.30+210:"
             "alpha='max(0,min(1,(t-0.5)/0.4))'[c1];"
             "[c1][logo]overlay=(W-w)/2:H*0.54:enable='gte(t,1.0)':"
             "alpha=straight[v2];"
             # ACENTO NO drawtext PRECISA DE ARQUIVO.
             #
             # Passar "IMPERIO PREMIOS" com E e E acentuados direto no
             # argumento depende de como o console, o Python e o ffmpeg
             # concordam sobre codificacao -- no Windows eles nao concordam,
             # e o acento vira lixo ou some. `textfile` le um arquivo em
             # UTF-8 e tira a negociacao do caminho. A versao anterior saiu
             # sem acento exatamente por nao ter feito isso.
             "[v2]drawtext=fontfile='%s':textfile='%s':fontcolor=white:"
             "fontsize=62:x=(w-text_w)/2:y=h*0.68:"
             "alpha='max(0,min(1,(t-1.3)/0.4))'[vf]"
             % (FONTE, FONTE, FONTE, arq_marca_ff),
             "-map", "[vf]", "-map", "[ac]", "-frames:v", str(nf),
             "-c:v", "libx264", "-crf", "18", "-pix_fmt", "yuv420p",
             "-c:a", "aac", "-b:a", "192k", "-shortest", cart]
    rc = subprocess.run(cmd_c, capture_output=True, text=True, errors="replace")
    if rc.returncode:
        print((rc.stderr or "")[-700:])
        return 1
    print("cartela: %.2f s" % dur(cart))

    idx_c = len(MOMENTOS) + 1
    ent += ["-i", cart]
    fil.append("[%d:v]%s[vc2026]" % (idx_c, esc))
    fil.append("[%d:a]aformat=sample_fmts=fltp:sample_rates=48000:"
               "channel_layouts=stereo[ac2026]" % idx_c)
    vs.append("[vc2026]"); as_.append("[ac2026]")

    # ── 4 · emenda, com o FLASH entre hook e retrospectiva ─────────────────
    fil.append("%sconcat=n=%d:v=1:a=1[vc][ac]"
               % ("".join(v + a for v, a in zip(vs, as_)), len(vs)))
    # O FLASH.
    #
    # A primeira versao usava `fade=t=in:st=X:color=white`, e o resultado foi
    # um video inteiro branco (brilho medio 253 de 255). O motivo: `fade=t=in`
    # pinta com a cor TUDO que vem ANTES do instante de inicio -- ele nao e um
    # clarao local, e a abertura do filme. Usado no meio da linha do tempo,
    # apaga tudo que veio antes.
    #
    # `drawbox` com `enable` e o que faz clarao local: pinta so na janela
    # pedida. Dois quadros a 30 fps -- o flare abaixo e que carrega o brilho
    # agora, entao o retangulo branco pode (e deve) ser mais discreto do que
    # era: sozinho ele parecia uma falha de arquivo, nao um corte.
    fil.append("[vc]drawbox=x=0:y=0:w=iw:h=ih:color=white@0.45:t=fill:"
               "enable='between(t,%.3f,%.3f)'[vff]"
               % (d_hook - 0.034, d_hook + 0.034))

    # ── 5 · o FLARE ────────────────────────────────────────────────────────
    #
    # Desenhado uma vez por `flare.py` e sobreposto como imagem. A animacao
    # e so no ALPHA: `fade` com `alpha=1` acende em 60 ms e apaga em 420 ms.
    #
    # Aqui `fade=t=in` NAO e a armadilha que foi no video: em alpha, "tudo
    # que vem antes fica em zero" e exatamente o comportamento desejado --
    # transparente antes de acender. O mesmo filtro, na mesma posicao, certo
    # num canal e errado no outro.
    idx_f = idx_c + 1
    ent += ["-loop", "1", "-t", "%.2f" % (d_hook + d_retro + 3.2), "-i", FLARE]
    fil.append("[%d:v]format=rgba,scale=%d:%d,setsar=1,"
               "fade=t=in:st=%.3f:d=0.06:alpha=1,"
               "fade=t=out:st=%.3f:d=0.42:alpha=1[fl]"
               % (idx_f, LARG, ALT, d_hook - 0.06, d_hook))
    fil.append("[vff][fl]overlay=0:0:format=auto[vfl]")

    fil.append("[vfl]fade=t=out:st=%.2f:d=0.6[vout]"
               % (d_hook + d_retro + 3.2 - 0.6))

    # ── 6 · o SFX, com o pico no quadro do corte ───────────────────────────
    #
    # O wav nasce com o impacto em SFX_PICO segundos. Atrasar por
    # (corte - pico) poe o impacto EM CIMA da emenda -- o riser fica antes,
    # a cauda depois. `normalize=0` no amix porque o padrao divide tudo pelo
    # numero de entradas e derrubaria a peca inteira em 6 dB para acomodar
    # um efeito de 2,4 s.
    tem_sfx = os.path.isfile(SFX)
    if tem_sfx:
        idx_s = idx_f + 1
        atraso = int(max(0.0, d_hook - SFX_PICO) * 1000)
        ent += ["-i", SFX]
        fil.append("[%d:a]aformat=sample_fmts=fltp:sample_rates=48000:"
                   "channel_layouts=stereo,adelay=%d|%d,volume=0.85[sfx]"
                   % (idx_s, atraso, atraso))
        fil.append("[ac][sfx]amix=inputs=2:normalize=0:"
                   "dropout_transition=0[amx]")
        fil.append("[amx]afade=t=out:st=%.2f:d=0.6[aout]"
                   % (d_hook + d_retro + 3.2 - 0.6))
        print("sfx: pico em %.2f s (atraso de %d ms)" % (d_hook, atraso))
    else:
        fil.append("[ac]afade=t=out:st=%.2f:d=0.6[aout]"
                   % (d_hook + d_retro + 3.2 - 0.6))
        print("sfx: %s nao existe -- monta sem" % os.path.basename(SFX))

    saida = a.saida if os.path.isabs(a.saida) else os.path.join(DOWN, a.saida)
    cmd = (["ffmpeg", "-v", "error", "-stats", "-y"] + ent +
           ["-filter_complex", ";".join(fil),
            "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-crf", "18", "-preset", "medium",
            "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", saida])
    print("\n%d entradas · %d filtros. montando..."
          % (sum(1 for x in ent if x == "-i"), len(fil)))
    r = subprocess.run(cmd, capture_output=True, text=True, errors="replace")
    if r.returncode:
        print((r.stderr or "")[-1400:])
        return 1
    print("→ %s (%.1f MB · %.2f s)"
          % (saida, os.path.getsize(saida) / 1e6, dur(saida)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
