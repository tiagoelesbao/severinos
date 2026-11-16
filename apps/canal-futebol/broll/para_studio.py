# -*- coding: utf-8 -*-
"""Exporta o episodio como projeto EDITAVEL do video-studio.

POR QUE ISTO EXISTE
  O `monta.py` entrega um mp4 fechado. Bom para publicar, inutil para ajustar:
  trocar um take, mover um texto meio segundo ou cortar um plano exige rodar
  tudo de novo pela linha de comando. O video-studio ja resolve isso — ele so
  precisa receber o projeto.

  E o projeto tem de ser O MESMO que virou o mp4. Por isso o plano de corte sai
  de `monta.planeja()`, a mesma funcao que a renderizacao usa: o que o founder
  abre para editar e exatamente o que ele assistiu, plano por plano.

O QUE ELE ESCREVE
  outputs/bora-de-bola/video-plans/{slug}/
    Materiais Brutos/     todo o material, achatado (o studio serve por nome)
    timeline.json         videoTrack (planos), audioTrack (narracao),
                          extraLayers (leito + camadas de texto), markers (blocos)

O QUE FICA DE FORA, E POR QUE
  A gradacao de cor e a vinheta do `monta.py` NAO viajam: elas sao filtro de
  ffmpeg, e o studio tem o proprio sistema de FX. Reproduzi-las aqui seria
  inventar um segundo lugar onde a cor se decide. No studio, a cor se ajusta no
  studio.

USO
  python -X utf8 broll/para_studio.py 2026-09-04-abel-stjd
"""
import argparse
import json
import os
import random
import shutil
import sys

AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(AQUI)
sys.path.insert(0, APP)
from monta import CANAL, blocos_do_roteiro, dur, material, planeja  # noqa: E402

FPS = 30
CLIENTE = "bora-de-bola"
REPO = os.path.dirname(os.path.dirname(APP))
LEITO = os.path.join(REPO, "squads", "oraclumtech-ai-creative-studio", "data",
                     "trilhas-and-sfx", "02-leitos", "tensao-suspense",
                     "le-tensao-baixa-LOOP.wav")


def quadros(s):
    return max(int(round(s * FPS)), 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--semente", type=int, default=7,
                    help="a mesma do monta.py — senão o projeto difere do mp4")
    a = ap.parse_args()

    random.seed(a.semente)
    pack = os.path.join(CANAL, "episodios", a.slug)
    voz = os.path.join(pack, "03-narracao", "vo.mp3")
    if not os.path.isfile(voz):
        print("não achei a narração: %s" % voz)
        return 1

    ordem = []
    for nome, _ in blocos_do_roteiro(os.path.join(pack, "02-roteiro", "roteiro.md")):
        if nome not in ordem:
            ordem.append(nome)
    base, camadas = material(pack)
    plano = planeja(pack, ordem, base, camadas)

    destino = os.path.join(REPO, "outputs", CLIENTE, "video-plans", a.slug)
    brutos = os.path.join(destino, "Materiais Brutos")
    os.makedirs(brutos, exist_ok=True)

    def leva(src):
        """Copia para Materiais Brutos e devolve o nome — o studio serve por nome.

        Nomes de origens diferentes podem coincidir; prefixo a pasta de origem
        para nao deixar uma peca sobrescrever outra em silencio.
        """
        pai = os.path.basename(os.path.dirname(src))
        nome = ("%s-%s" % (pai, os.path.basename(src))
                if pai in ("acervo", "fotos", "cartelas") else os.path.basename(src))
        alvo = os.path.join(brutos, nome)
        if os.path.isfile(alvo) and os.path.getsize(alvo) == os.path.getsize(src):
            return nome, alvo
        if os.path.isfile(alvo):
            os.remove(alvo)
        # HARDLINK, não cópia: os takes deste episódio somam ~180 MB e existir
        # duas vezes no mesmo disco é desperdício puro — o `Materiais Brutos` é
        # uma segunda porta para os mesmos bytes, não um segundo acervo.
        # Cai para cópia quando o link não é possível (volume diferente, ou
        # sistema de arquivos sem hardlink).
        try:
            os.link(src, alvo)
        except OSError:
            shutil.copy2(src, alvo)
        return nome, alvo

    videoTrack, textos, marcadores = [], [], []
    quadro, visto = 0, None
    for p in plano:
        if p.get("vazio"):
            continue
        if p["bloco"] != visto:
            marcadores.append({"frame": quadro, "label": p["bloco"]})
            visto = p["bloco"]
        nome, alvo = leva(p["arquivo"])
        q = quadros(p["segundos"])
        clip = {
            "file": nome, "absPath": alvo, "role": p["bloco"].lower(),
            "durationSeconds": round(p["segundos"], 3), "durationInFrames": q,
            "nativeDurationInFrames": q, "playbackRate": 1,
            "width": 1920, "height": 1080, "startFrame": quadro,
            "audioEnabled": False, "frameMode": "cover", "gap": False,
        }
        if p["tipo"] == "foto":
            # A camera só existe na foto: vídeo já se move sozinho, e somar zoom
            # a movimento de câmera real embrulha a imagem.
            clip["camera"] = {"tipo": "zoom-%s" % p["sentido"], "peso": "calmo"}
        else:
            # O in-point do videoTrack é `trimStartFrames`, em QUADROS. Com o
            # nome errado ele era ignorado e todo take começava do zero no
            # studio — o mp4 sorteia o ponto de entrada, e os dois divergiam.
            clip["trimStartFrames"] = quadros(p["inicio_fonte"]) if p["inicio_fonte"] else 0
        videoTrack.append(clip)

        if p["camada"]:
            cn, ca = leva(p["camada"])
            textos.append({
                "id": "txt-%03d" % p["n"], "type": "image", "file": cn,
                "label": os.path.basename(p["camada"]),
                "startFrame": quadro, "durationInFrames": q,
                # 50 é o CENTRO, não 0: o `ElementWrap` calcula `translate(x-50%)`.
                # Com x=0/y=0 a camada saía meia tela para cima e para a esquerda
                # — a imagem 1920x1080 aparecia ancorada no canto superior
                # esquerdo, que foi o defeito que o founder viu no studio.
                "x": 50, "y": 50, "scale": 1, "opacity": 1,
                # Os campos são `animateIn`/`animateOut`, e o tipo vem do
                # catálogo (`fxCatalog.AnimacaoId`): "slide" não existe lá e
                # caía em "nenhuma" calado. "sobe" é a entrada do mp4.
                "animateIn": {"type": "sobe", "durationInFrames": 12},
                "animateOut": {"type": "fade", "durationInFrames": 15},
            })
        quadro += q

    dv = dur(voz)
    nome_voz, abs_voz = leva(voz)
    total = max(quadro, quadros(dv))

    # Leito em pedaços do tamanho do loop, como o studio espera; o ducking é
    # dele, não meu — aqui só declaro a intenção.
    camadas_extra = []
    if os.path.isfile(LEITO):
        nl, _ = leva(LEITO)
        dl = quadros(dur(LEITO))
        clips, f, k = [], 0, 1
        while f < total:
            clips.append({
                "type": "media-audio", "id": "leito-%d" % k, "file": nl,
                "label": "le-tensao-baixa (loop)", "volume": 0.22,
                "ducking": True, "startFrame": f,
                "durationInFrames": min(dl, total - f),
                **({"fadeIn": 60} if k == 1 else {}),
            })
            f += dl
            k += 1
        camadas_extra.append({"id": "leito", "kind": "audio",
                              "name": "Leito contínuo", "clips": clips})
    if textos:
        camadas_extra.append({"id": "textos", "kind": "video",
                              "name": "Cartelas", "clips": textos})

    tl = {
        "fps": FPS, "width": 1920, "height": 1080, "durationInFrames": total,
        "videoTrack": videoTrack,
        "audioTrack": {"file": nome_voz, "absPath": abs_voz,
                       "durationSeconds": round(dv, 3),
                       "durationInFrames": quadros(dv), "startFrame": 0,
                       "windowFrames": quadros(dv)},
        "captionTrack": [], "extraLayers": camadas_extra, "markers": marcadores,
        "meta": {"client": CLIENTE, "creative": a.slug,
                 "videoSeconds": round(quadro / FPS, 2),
                 "audioSeconds": round(dv, 2), "rhythmGapSeconds": 0.6,
                 "gaps": [],
                 "origem": "apps/canal-futebol/monta.py:planeja() — mesmo plano do mp4"},
    }
    with open(os.path.join(destino, "timeline.json"), "w", encoding="utf-8") as f:
        json.dump(tl, f, ensure_ascii=False, indent=2)

    # O que o studio LÊ é `studio-edit.json`; `timeline.json` sozinho é ignorado
    # e o editor refaz o ingest do zero — em 1080x1920, que é o alvo padrão dele
    # e não o deste canal. Descobri isso abrindo a API: ela devolveu um timeline
    # vertical com os materiais em ordem alfabética.
    edit = {
        "timeline": tl,
        "fxPlan": {
            "hookRenderer": "hard-cut",
            "captionRenderer": "clean",
            "motionRenderers": [],
            "brand": {
                "displayName": "Bora de Bola",
                "primary": "#FCFCFC",
                "accent": "#FCCC0C",     # o amarelo do canal, o mesmo da thumb
                "fontFamily": "Anton",
            },
            # Sem legenda queimada: o texto deste canal são as CARTELAS, que já
            # estão na camada de imagem. Legenda palavra a palavra por cima
            # delas seria dois textos disputando a mesma tela.
            "captions": [],
            "captionStyle": {"maxWords": 10, "maxLines": 2,
                             "maxCharsPerLine": 38, "maxCueMs": 5000},
            "captionTheme": {"uppercase": True, "boxed": True, "highlight": True,
                             "activeColor": "#FCCC0C", "baseColor": "#FCFCFC",
                             "fontSize": 48, "bottomPct": 0.42},
        },
        "captionSource": "script",
        "savedAt": "",
    }
    with open(os.path.join(destino, "studio-edit.json"), "w", encoding="utf-8") as f:
        json.dump(edit, f, ensure_ascii=False)

    print("cliente   %s" % CLIENTE)
    print("criativo  %s" % a.slug)
    print("planos    %d  (%d s de vídeo para %d s de narração)"
          % (len(videoTrack), quadro // FPS, dv))
    print("cartelas  %d na camada de texto" % len(textos))
    print("blocos    %d marcadores na régua" % len(marcadores))
    print("material  %d arquivos em Materiais Brutos"
          % len(os.listdir(brutos)))
    print("\n%s" % destino)
    return 0


if __name__ == "__main__":
    sys.exit(main())
