# -*- coding: utf-8 -*-
"""Extrai os TAKES REAIS das pecas de referencia e descobre onde elas se repetem.

POR QUE
  Modelar um video validado exige saber o que ele mostra, quantas imagens distintas
  ele de fato usa, e a partir de que ponto ele passa a reciclar. Sem isso a gente
  chuta o tamanho do pack visual — e chutar tamanho de pack e chutar custo.

COMO
  1. amostragem UNIFORME, um frame a cada PASSO_S segundos
  2. dHash perceptual de cada amostra -> agrupa as que sao a MESMA imagem
     (o video faz zoom lento sobre a foto parada; o hash tem que tolerar isso)
  3. corrida contigua de amostras = UMA aparicao. Amostra isolada e quadro de
     dissolvencia, nao take, e e descartada
  4. relatorio: takes unicos, quantas vezes cada um aparece, tempo em tela, e o
     instante em que a peca comeca a reciclar

POR QUE NAO DETECCAO DE CORTE
  A primeira versao usava `select=gt(scene,...)` e devolveu ZERO cortes na v1.
  A peca nao corta — ela DISSOLVE, com flare entre takes. Dissolvencia lenta nunca
  cruza o limiar de cena, entao o detector nao ve nada onde um humano ve troca.

SAIDA
  docs/referencias/estoico/{slug}/takes/
    frames/          as amostras
    unicos/          um jpg por take unico, o representante do grupo
    takes.json       o mapa completo
    contato.jpg      folha de contato dos unicos, ordenada por tempo em tela

Uso:  python extrai_takes_referencia.py [passo_s]      passo padrao 2.0
"""
import json, os, re, shutil, subprocess, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DOWNLOADS = r"C:\Users\Pichau\Desktop\Sistemas\SaAS\Bot_youtube\downloads"
DEST = (r"C:\Users\Pichau\Desktop\Sistemas\Virals\severinos\squads"
        r"\oraclumtech-ai-creative-studio\docs\referencias\estoico")

REFERENCIAS = [
    ("v1-praticas",
     "10 PRÁTICAS ESTOICAS PARA COLOCAR SUA VIDA NOS EIXOS ｜ LIÇÕES DE ESTOICISMO 🏛.mp4"),
    ("v2-reflexoes",
     "10 REFLEXÕES ESTOICAS QUE VOCÊ PRECISA ESCUTAR TODAS AS MANHÃS ｜ Estoicismo.mp4"),
]

PASSO_S = float(sys.argv[1]) if len(sys.argv) > 1 else 2.0
LARGURA_TRABALHO = 640
# Distancia de Hamming abaixo da qual dois frames sao considerados a MESMA imagem.
# O video faz zoom lento sobre a foto parada, entao o hash muda um pouco sem que a
# imagem mude. 10 em 64 bits tolera o zoom e ainda separa fotos diferentes.
LIMITE_HASH = 12
# Salto entre amostras CONSECUTIVAS que caracteriza troca de imagem. Abaixo disso e
# o zoom lento sobre a mesma foto.
SALTO_DE_CORTE = 16
DURACAO_MINIMA_S = 4.0            # segmento mais curto que isto e dissolvencia


def extrai_frames(mp4, dest_frames):
    """Amostragem UNIFORME, um frame a cada PASSO_S segundos.

    Por que nao deteccao de corte: a primeira versao usava `select=gt(scene,...)` e
    devolveu ZERO cortes na v1. A peca nao corta — ela DISSOLVE, com flare entre
    takes. Dissolvencia lenta nunca cruza o limiar de cena, entao o detector nao ve
    nada onde um humano ve troca de imagem. Amostragem uniforme nao tem esse problema:
    o agrupamento por hash e que decide onde a imagem mudou.
    """
    os.makedirs(dest_frames, exist_ok=True)
    if any(f.endswith(".jpg") for f in os.listdir(dest_frames)):
        return
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-loglevel", "error", "-i", mp4,
         "-vf", "fps=1/%g,scale=%d:-2" % (PASSO_S, LARGURA_TRABALHO),
         "-q:v", "4", os.path.join(dest_frames, "f%05d.jpg")],
        capture_output=True)
    # o indice do arquivo ja E o tempo: frame n comeca em (n-1) * PASSO_S
    print("       %d frames amostrados a cada %gs"
          % (len([f for f in os.listdir(dest_frames) if f.endswith(".jpg")]), PASSO_S))


def dhash(caminho, lado=8):
    im = Image.open(caminho).convert("L").resize((lado + 1, lado), Image.LANCZOS)
    a = np.asarray(im, dtype=int)
    return (a[:, 1:] > a[:, :-1]).flatten()


def hamming(a, b):
    return int(np.count_nonzero(a != b))


def segmenta(frames):
    """Corta a linha do tempo comparando amostras CONSECUTIVAS.

    A primeira versao comparava cada amostra com a PRIMEIRA do grupo, e isso quebrou:
    o video faz zoom lento sobre a foto parada, o hash DERIVA ao longo dos 20 s de
    movimento, e a mesma imagem acabava dividida em varios "takes" — 230 numa peca
    que a olho tem algumas dezenas. Comparar com a amostra ANTERIOR nao acumula
    deriva: so um salto real de imagem passa do limiar.
    """
    hs = [dhash(f) for f in frames]
    segs, inicio = [], 0
    for i in range(1, len(frames)):
        if hamming(hs[i], hs[i - 1]) > SALTO_DE_CORTE:
            segs.append((inicio, i - 1))
            inicio = i
    segs.append((inicio, len(frames) - 1))
    return segs, hs


def agrupa_segmentos(frames, segs, hs):
    """Agrupa segmentos que mostram a MESMA imagem — e assim acha a reciclagem.

    O representante e o quadro do MEIO do segmento: as pontas costumam estar no meio
    da dissolvencia e sao a mistura de duas imagens.
    """
    reps = []
    for a, b in segs:
        m = (a + b) // 2
        reps.append({"ini": a, "fim": b, "meio": m, "hash": hs[m], "arquivo": frames[m]})

    grupos = []
    for r in reps:
        for g in grupos:
            if hamming(r["hash"], g["hash"]) <= LIMITE_HASH:
                g["segmentos"].append(r)
                break
        else:
            grupos.append({"hash": r["hash"], "arquivo": r["arquivo"], "segmentos": [r]})
    return grupos


def tempo_de(caminho):
    m = re.search(r"f(\d+)\.jpg$", os.path.basename(caminho))
    return (int(m.group(1)) - 1) * PASSO_S if m else 0.0


def fonte(t):
    try:
        return ImageFont.truetype("segoeui.ttf", t)
    except OSError:
        return ImageFont.load_default()


def folha_de_contato(takes, destino, titulo):
    COLS, CW, CH, PAD, TOP = 5, 372, 210, 12, 76
    linhas = (len(takes) + COLS - 1) // COLS
    W = COLS * CW + (COLS + 1) * PAD
    H = TOP + linhas * (CH + 40) + PAD
    f = Image.new("RGB", (W, H), (18, 18, 20))
    d = ImageDraw.Draw(f)
    F_T, F_M, F_P = fonte(23), fonte(14), fonte(12)
    d.text((PAD, 12), titulo, font=F_T, fill=(240, 240, 240))
    d.text((PAD, 44),
           "Ordenados por TEMPO EM TELA. O numero de aparicoes revela onde a peca "
           "recicla — e e ele que define o tamanho real do pack visual.",
           font=F_P, fill=(150, 150, 160))
    for i, t in enumerate(takes):
        col, lin = i % COLS, i // COLS
        px, py = PAD + col * (CW + PAD), TOP + lin * (CH + 40)
        f.paste(Image.open(t["arquivo"]).convert("RGB").resize((CW, CH), Image.LANCZOS),
                (px, py))
        d.text((px + 4, py + CH + 4), "T%02d" % t["id"], font=F_M, fill=(150, 200, 255))
        d.text((px + 46, py + CH + 6),
               "%dx · %ds em tela · 1a em %s" %
               (t["aparicoes"], round(t["tempo_em_tela_s"]), t["primeira_aparicao"]),
               font=F_P, fill=(150, 150, 160))
    f.save(destino, quality=88)


def hhmm(s):
    return "%d:%02d" % (s // 60, s % 60)


def processa(slug, arquivo):
    mp4 = os.path.join(DOWNLOADS, arquivo)
    if not os.path.isfile(mp4):
        print("[takes] AUSENTE: %s" % arquivo)
        return
    base = os.path.join(DEST, slug, "takes")
    dfr = os.path.join(base, "frames")
    dun = os.path.join(base, "unicos")
    os.makedirs(dun, exist_ok=True)

    print("[takes] %s — amostrando..." % slug)
    extrai_frames(mp4, dfr)
    frames = sorted(os.path.join(dfr, f) for f in os.listdir(dfr) if f.endswith(".jpg"))
    print("[takes] %s — %d amostras" % (slug, len(frames)))

    segs, hs = segmenta(frames)
    grupos = agrupa_segmentos(frames, segs, hs)
    dur_total = tempo_de(frames[-1]) if frames else 0.0

    takes, transicoes = [], 0
    for g in grupos:
        uteis = [sg for sg in g["segmentos"]
                 if (sg["fim"] - sg["ini"] + 1) * PASSO_S >= DURACAO_MINIMA_S]
        transicoes += len(g["segmentos"]) - len(uteis)
        if not uteis:
            continue
        uteis.sort(key=lambda sg: sg["ini"])
        em_tela = sum((sg["fim"] - sg["ini"] + 1) * PASSO_S for sg in uteis)
        takes.append({
            "arquivo": g["arquivo"],
            "aparicoes": len(uteis),
            "tempo_em_tela_s": round(em_tela, 1),
            "duracao_media_s": round(em_tela / len(uteis), 1),
            "primeira_aparicao_s": tempo_de(frames[uteis[0]["ini"]]),
            "primeira_aparicao": hhmm(tempo_de(frames[uteis[0]["ini"]])),
            "aparicoes_em": [hhmm(tempo_de(frames[sg["ini"]])) for sg in uteis],
        })

    takes.sort(key=lambda t: -t["tempo_em_tela_s"])
    for i, t in enumerate(takes, 1):
        t["id"] = i
        alvo = os.path.join(dun, "T%02d_%s" % (i, os.path.basename(t["arquivo"])))
        shutil.copy2(t["arquivo"], alvo)
        t["unico"] = alvo

    # o instante em que a peca comeca a reciclar
    reaparicoes = [t["primeira_aparicao_s"] for t in takes if t["aparicoes"] > 1]
    reaparicoes = [tempo_de(frames[sg["ini"]])
                   for g in grupos
                   for sg in sorted(g["segmentos"], key=lambda x: x["ini"])[1:]
                   if len(g["segmentos"]) > 1]
    primeira_repeticao = hhmm(min(reaparicoes)) if reaparicoes else None

    resumo = {
        "referencia": arquivo,
        "passo_de_amostragem_s": PASSO_S,
        "segmentos_de_transicao_descartados": transicoes,
        "duracao_s": round(dur_total, 1),
        "amostras": len(frames),
        "takes_unicos": len(takes),
        "tempo_medio_em_tela_s": round(sum(t["tempo_em_tela_s"] for t in takes) / max(1, len(takes)), 1),
        "takes_que_repetem": sum(1 for t in takes if t["aparicoes"] > 1),
        "primeira_repeticao_em": primeira_repeticao,
        "takes": [{k: v for k, v in t.items() if k != "arquivo"} for t in takes],
    }
    json.dump(resumo, open(os.path.join(base, "takes.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)

    folha_de_contato(takes, os.path.join(base, "contato.jpg"),
                     "%s — %d takes unicos, amostrado a cada %gs"
                     % (slug, len(takes), PASSO_S))

    print("[takes] %s: %d takes unicos · %d deles repetem · media de %.0fs em tela · "
          "1a repeticao em %s · %d quadros de transicao descartados" %
          (slug, len(takes), resumo["takes_que_repetem"],
           resumo["tempo_medio_em_tela_s"], primeira_repeticao or "nunca",
           transicoes))


def main():
    for slug, arquivo in REFERENCIAS:
        processa(slug, arquivo)
    print("[takes] concluido")


if __name__ == "__main__":
    main()
