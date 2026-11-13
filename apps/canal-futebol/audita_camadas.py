# -*- coding: utf-8 -*-
"""Confere, NO VIDEO PRONTO, se as cartelas aparecem e ficam.

POR QUE ESTA GUARDA EXISTE
  As guardas que ja existiam comparam AUDIO com AUDIO: a narracao nao foi
  cortada, o mix nao encurtou, o video nao acaba antes da fala. Nenhuma delas
  olha a IMAGEM -- e foi por isso que quatro defeitos seguidos chegaram ao
  founder em 06/09:

    - 6 de 20 cartelas saiam 100%% transparentes (o "+" do base64 virando
      espaco na query string). O video montava, as guardas passavam, e a
      cartela simplesmente nao existia.
    - a cartela durava um plano (~5 s) e sumia com o assunto ainda no ar.
    - cada plano aplicava fade proprio, entao a mesma cartela repetida em
      quatro planos PISCAVA quatro vezes.
    - o b-roll trazia foto de outro contexto.

  Cartela gerada nao e cartela visivel. Esta guarda mede o arquivo final.

O QUE ELA MEDE
  Amostra o video a cada segundo dentro do intervalo em que cada cartela
  deveria estar no ar (pelo plano de montagem) e verifica:

    1. PRESENCA   a cartela aparece de fato?
    2. CONTINUIDADE  ela fica, ou pisca? Uma interrupcao dentro do proprio
       intervalo e o defeito do fade por plano voltando.

USO
    python audita_camadas.py 2026-09-06-arbitragem-flu-vasco
"""
import argparse
import json
import os
import subprocess
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
CANAL = os.path.join(AQUI, "..", "..", "workspaces", "businesses", "virals",
                     "creative-studio", "canais", "bora-de-bola")


# O AMARELO DO CANAL. Toda cartela do Bora de Bola carrega ele em algum lugar:
# na etiqueta do rotulo, no numero gigante, na regua da lista ou no selo do
# rodape. E a assinatura mais confiavel que existe -- e uma cor que praticamente
# nao aparece em foto de futebol noturno.
AMARELO = (252, 204, 12)


# CALIBRADO, nao chutado. Medido em frames deste episodio, a 320 px de largura:
#   com cartela   992 a 1.921 pixels amarelos  (1,7%% a 3,3%% do quadro)
#   sem cartela   4 a 7 pixels                 (0,01%%)
# O corte em 300 fica no vazio entre as duas populacoes, com folga dos dois lados.
LIMIAR = 300


def _presenca(img, minimo=LIMIAR):
    """Ha cartela neste quadro?

    A PRIMEIRA VERSAO DESTA FUNCAO REPROVOU QUATRO CARTELAS BOAS. Ela procurava
    duas assinaturas: texto claro no rodape (modo faixa) ou veu escuro com centro
    contrastado (modo painel). Isso cobre a cartela de FRASE e mais nada -- o
    numero gigante, a lista e a etiqueta pequena nao escurecem o quadro nem
    enchem o rodape, e foram dadas como invisiveis estando na tela.

    Guarda que reprova trabalho bom e pior que guarda nenhuma: ensina a ignorar
    o alarme. Agora a deteccao e pela COR DO CANAL, que todas as cartelas tem.
    """
    from PIL import Image
    im = Image.open(img).convert("RGB")
    n = 0
    for r, g, b in im.getdata():
        # tolerancia folgada de proposito: o JPEG e a gradacao do video puxam a
        # cor. Apertar aqui foi o que fez a versao anterior nao achar NADA.
        if (r > 170 and abs(r - AMARELO[0]) < 60
                and abs(g - AMARELO[1]) < 70 and b < 110):
            n += 1
            if n >= minimo:
                return True
    return False


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    a = ap.parse_args()

    import monta
    from narra_comfy import blocos_do_roteiro

    pack = os.path.join(CANAL, "episodios", a.slug)
    video = os.path.join(pack, "06-final", "video.mp4")
    if not os.path.isfile(video):
        print("sem 06-final/video.mp4 — monte antes")
        return 1

    base, camadas = monta.material(pack, a.slug)
    ordem = []
    for b, _ in blocos_do_roteiro(os.path.join(pack, "02-roteiro", "roteiro.md")):
        if b not in ordem:
            ordem.append(b)
    plano = monta.planeja(pack, ordem, base, camadas)

    # intervalos em que cada cartela deveria estar no ar
    t, trechos, atual = 0.0, [], None
    for p in plano:
        if p.get("vazio"):
            t += p["segundos"]
            continue
        cam = p.get("camada")
        if cam != (atual or {}).get("cam"):
            if atual:
                trechos.append(atual)
            atual = {"cam": cam, "ini": t, "fim": t + p["segundos"]} if cam else None
        elif atual:
            atual["fim"] = t + p["segundos"]
        t += p["segundos"]
    if atual:
        trechos.append(atual)

    print("%-22s %8s %8s  %s" % ("CARTELA", "INICIO", "DUR", "PRESENCA"))
    print("-" * 62)
    problemas = []
    with tempfile.TemporaryDirectory() as tmp:
        for tr in trechos:
            d = tr["fim"] - tr["ini"]
            # amostra a cada segundo, evitando os 0,6 s de fade das pontas
            amostras = []
            s = tr["ini"] + 0.8
            while s < tr["fim"] - 0.8:
                f = os.path.join(tmp, "a.jpg")
                subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.2f" % s,
                                "-i", video, "-frames:v", "1",
                                "-vf", "scale=320:-1", f, "-y"],
                               capture_output=True)
                if os.path.isfile(f):
                    amostras.append(_presenca(f))
                    os.remove(f)
                s += 1.0
            if not amostras:
                continue
            vis = sum(amostras)
            pct = 100.0 * vis / len(amostras)
            # buraco no meio = a cartela sumiu e voltou: o fade por plano
            buracos = sum(1 for i in range(1, len(amostras) - 1)
                          if not amostras[i] and amostras[i - 1] and amostras[i + 1])
            nome = os.path.basename(tr["cam"])
            marca = "OK"
            if pct < 70:
                marca = "NAO APARECE (%.0f%%)" % pct
                problemas.append(nome + ": invisivel")
            elif buracos:
                marca = "PISCA (%d interrupcoes)" % buracos
                problemas.append(nome + ": pisca")
            print("%-22s %7.1fs %7.1fs  %s" % (nome[:22], tr["ini"], d, marca))

    print("-" * 62)
    if problemas:
        print("REPROVADO — %d cartela(s) com defeito:" % len(problemas))
        for p in problemas:
            print("   " + p)
        return 1
    print("APROVADO — %d cartelas aparecem e permanecem" % len(trechos))
    return 0


if __name__ == "__main__":
    sys.exit(main())
