# -*- coding: utf-8 -*-
"""Teste de capacidade: uma influenciadora de IA divulgando um produto.

O QUE ESTE TESTE RESPONDE
  Se o que ja esta instalado no ComfyUI do squad da conta de produzir, do zero,
  um video de 15 s de uma pessoa que nao existe falando de um produto. A
  resposta curta esta no fim deste cabecalho; o teste existe para medir cada
  elo, nao so o resultado.

A ESTEIRA, UM ELO POR VEZ
    1 personagem   Flux2-Klein · varias tentativas do MESMO rosto
    2 takes        o mesmo rosto em lugares diferentes
    3 refino       upscale de cada take
    4 voz          ChatterBox com a voz ja validada da casa
    5 movimento    Wan2.2 I2V · cada take vira ~3 s de video
    6 montagem     corte, legenda e CTA pelo motor de curtos

O ELO QUE FALTA — e nao adianta contornar
  **Nao ha lipsync.** Nenhum no instalado anima boca a partir de audio: existe
  um `mouth_movement_analyzer` no TTS-Audio-Suite, mas ele MEDE movimento de
  boca em video existente; nao gera. O Wan2.2 I2V anima a partir da imagem e do
  prompt, sem condicionamento por audio -- a boca mexe, mas nao diz o que a voz
  esta dizendo.

  Entao este teste entrega tudo menos a sincronia labial, e serve para decidir
  se vale instalar o que falta. As opcoes reais estao no `RELATORIO.md` que ele
  escreve no fim.

CONSISTENCIA DE PERSONAGEM SEM IP-ADAPTER
  Nao ha IP-Adapter, InstantID nem PhotoMaker em disco. Sobram duas alavancas,
  e as duas sao usadas aqui:

    FICHA TRAVADA   uma descricao longa e especifica do rosto, repetida
                    palavra por palavra em todos os prompts. O que varia e so
                    a cena, e ela vem DEPOIS da ficha.
    SEMENTE FIXA    a mesma semente para todos os takes. Com o mesmo texto de
                    rosto e a mesma semente, o Flux converge para a mesma
                    pessoa; o que a cena muda e o entorno.

  Isso da semelhanca forte, nao identidade garantida. E o teto do que se
  consegue sem um modelo de identidade.

USO
    python gera_influencer.py --etapa personagem
    python gera_influencer.py --etapa takes
    python gera_influencer.py --todas
"""
import argparse
import io
import json
import os
import shutil
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
SQUAD = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio")
COMFY_DIR = os.path.join(SQUAD, "assets", "comfyui")
sys.path.insert(0, COMFY_DIR)
SAIDA_COMFY = os.path.join(r"C:" + os.sep, "Users", "Pichau", "Desktop",
                           "ComfyUI_windows_portable", "ComfyUI", "output")
# A pasta segue a convencao dos canais (`{canal}/curtos/{slug}`) porque o
# `narra_comfy.py --curto` resolve o caminho assim. Fugir da convencao aqui
# custaria um caso especial la, e caso especial em script compartilhado e o que
# faz a correcao de um canal nao chegar no outro.
CANAL_DIR = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                         "creative-studio", "testes")
SLUG = "influencer-ia"
PACK = os.path.join(CANAL_DIR, "curtos", SLUG)

# ── A PERSONAGEM ────────────────────────────────────────────────────────────
#
# A ficha e longa de proposito. Cada tra�o a mais e uma amarra: sem IP-Adapter,
# o texto E o mecanismo de identidade. Tudo o que nao estiver escrito aqui o
# modelo reinventa a cada imagem.
FICHA = (
    "a 27 year old brazilian woman with warm light-brown skin, oval face, "
    "high cheekbones, straight dark brown shoulder-length hair with a middle "
    "part, thick natural eyebrows, dark brown almond eyes, a small mole on "
    "her left cheek, full lips with a soft natural smile, small gold hoop "
    "earrings, wearing a plain cream ribbed top"
)
QUALIDADE = ("photorealistic portrait photography, natural window light, "
             "shallow depth of field, shot on 50mm, skin texture visible, "
             "no makeup filter, vertical composition")
NEGATIVO = ("text, watermark, logo, cartoon, illustration, 3d render, cgi, "
            "plastic skin, airbrushed, deformed hands, extra fingers, extra "
            "limbs, distorted face, asymmetric eyes, blurry, oversaturated")

# A semente e a segunda amarra. Fixa em todos os takes.
SEMENTE = 776211

# ── OS TAKES ────────────────────────────────────────────────────────────────
#
# O ENQUADRAMENTO MUDA COM A FUNCAO. Plano fechado quando ela fala com a
# camera; plano medio quando mostra o produto. Enquadramento igual em tudo faz
# o video parecer uma foto animada cinco vezes.
TAKES = [
    ("01-abre", "sitting on a light grey sofa in a bright minimal living room, "
                "looking straight at the camera, medium close-up from the "
                "chest up"),
    ("02-banheiro", "standing in a clean modern bathroom with white tiles and "
                    "a large mirror, soft morning light, medium shot"),
    ("03-produto", "holding a small unbranded white cosmetic dropper bottle "
                   "near her face, looking at the camera, close-up"),
    ("04-cozinha", "leaning on a kitchen counter with plants behind her, warm "
                   "afternoon light, medium shot"),
    ("05-fecha", "sitting by a window with soft daylight, looking at the "
                 "camera and smiling, medium close-up"),
]

# ── O QUE ELA DIZ ───────────────────────────────────────────────────────────
#
# Produto FICTICIO e sem marca: o teste e de capacidade, e um pitch com marca
# real viraria peca publicitaria de terceiro sem autorizacao. A garrafinha do
# take 03 e descrita como `unbranded` pelo mesmo motivo.
FALA = (
    "Gente, esse sérum aqui mudou a minha pele em duas semanas. "
    "Eu passo de manhã e de noite, e pronto. "
    "Não pesa, não deixa brilho, e some rápido na pele. "
    "Deixei o link aqui nos comentários pra quem quiser testar."
)

# 640x1136: multiplos de 16 (exigencia do Wan) e perto dos 691k pixels que a
# maquina ja rodou sem paginar. Ver a memoria do squad sobre RAM no Wan.
LARG, ALT = 640, 1136


def _rb():
    import run_batch as rb
    return rb


def _espera(pid):
    rb = _rb()
    while True:
        h = rb.get("/history/%s" % pid)
        if h.get(pid):
            return h[pid]
        time.sleep(3)


def _saidas(hist, chave="images"):
    fora = []
    for no in hist["outputs"].values():
        for im in no.get(chave, []):
            fora.append(os.path.join(SAIDA_COMFY, im.get("subfolder", ""),
                                     im["filename"]))
    return fora


def _wf(nome):
    return json.load(io.open(os.path.join(COMFY_DIR, "workflows", nome),
                             encoding="utf-8"))


def _texto(p, prompt, negativo):
    """Preenche positivo e negativo achando quem e quem pelo guider."""
    guider = next((n for n in p.values()
                   if n.get("class_type") in ("CFGGuider", "KSamplerAdvanced")),
                  None)
    pos = neg = None
    if guider:
        i = guider["inputs"]
        pos = str(i["positive"][0]) if "positive" in i else None
        neg = str(i["negative"][0]) if "negative" in i else None
    for nid, no in p.items():
        if no.get("class_type") != "CLIPTextEncode":
            continue
        if nid == pos or (pos is None and "{{PROMPT_POSITIVO}}"
                          in str(no["inputs"].get("text", ""))):
            no["inputs"]["text"] = prompt
        elif nid == neg or (neg is None and "{{PROMPT_NEGATIVO}}"
                            in str(no["inputs"].get("text", ""))):
            no["inputs"]["text"] = negativo
    return p


# ═══════════════════════════════════════════════════════════════════════════
def etapa_personagem(quantas=4):
    """Varias tentativas do MESMO rosto — a folha de escolha do founder."""
    rb = _rb()
    dst = os.path.join(PACK, "01-personagem")
    os.makedirs(dst, exist_ok=True)
    objinfo = rb.get("/object_info")
    feitas = []
    for i in range(quantas):
        p = rb.para_api(_wf("flux2-klein-t2i.json"), objinfo)
        for no in p.values():
            ct = no.get("class_type")
            if ct in ("EmptyFlux2LatentImage", "Flux2Scheduler"):
                no["inputs"]["width"], no["inputs"]["height"] = LARG, ALT
                if ct == "Flux2Scheduler":
                    no["inputs"]["steps"] = 6
            elif ct == "RandomNoise":
                # sementes VIZINHAS, nao aleatorias: variam o retrato sem
                # trocar a pessoa
                no["inputs"]["noise_seed"] = SEMENTE + i
            elif ct == "SaveImage":
                no["inputs"]["filename_prefix"] = "influencer/personagem"
        _texto(p, "%s, %s" % (FICHA, QUALIDADE), NEGATIVO)
        r = rb.post("/prompt", {"prompt": p})
        arq = _saidas(_espera(r["prompt_id"]))
        if arq:
            alvo = os.path.join(dst, "p%02d.png" % (i + 1))
            shutil.copyfile(arq[0], alvo)
            feitas.append(alvo)
            print("   p%02d.png  (semente %d)" % (i + 1, SEMENTE + i))
    return feitas


def etapa_takes(base_semente=None):
    """O mesmo rosto em cinco lugares. Ficha travada + semente fixa."""
    rb = _rb()
    dst = os.path.join(PACK, "02-takes")
    os.makedirs(dst, exist_ok=True)
    objinfo = rb.get("/object_info")
    sem = base_semente or SEMENTE
    feitos = []
    for nome, cena in TAKES:
        p = rb.para_api(_wf("flux2-klein-t2i.json"), objinfo)
        for no in p.values():
            ct = no.get("class_type")
            if ct in ("EmptyFlux2LatentImage", "Flux2Scheduler"):
                no["inputs"]["width"], no["inputs"]["height"] = LARG, ALT
                if ct == "Flux2Scheduler":
                    no["inputs"]["steps"] = 6
            elif ct == "RandomNoise":
                no["inputs"]["noise_seed"] = sem
            elif ct == "SaveImage":
                no["inputs"]["filename_prefix"] = "influencer/take"
        # A CENA VEM DEPOIS DA FICHA. Invertendo, o modelo ancora no ambiente e
        # o rosto passa a variar com ele.
        _texto(p, "%s, %s, %s" % (FICHA, cena, QUALIDADE), NEGATIVO)
        r = rb.post("/prompt", {"prompt": p})
        arq = _saidas(_espera(r["prompt_id"]))
        if arq:
            alvo = os.path.join(dst, "%s.png" % nome)
            shutil.copyfile(arq[0], alvo)
            feitos.append(alvo)
            print("   %-14s pronto" % nome)
    return feitos


def etapa_refino():
    """Upscale de cada take."""
    rb = _rb()
    src = os.path.join(PACK, "02-takes")
    dst = os.path.join(PACK, "03-refino")
    os.makedirs(dst, exist_ok=True)
    import glob
    objinfo = rb.get("/object_info")
    entrada = os.path.join(os.path.dirname(SAIDA_COMFY), "input")
    feitos = []
    for f in sorted(glob.glob(os.path.join(src, "*.png"))):
        nome = os.path.basename(f)
        shutil.copyfile(f, os.path.join(entrada, "inf_" + nome))
        p = rb.para_api(_wf("imagem-superres-fiel.json"), objinfo)
        for no in p.values():
            if no.get("class_type") == "LoadImage":
                no["inputs"]["image"] = "inf_" + nome
            elif no.get("class_type") == "SaveImage":
                no["inputs"]["filename_prefix"] = "influencer/refino"
        r = rb.post("/prompt", {"prompt": p})
        arq = _saidas(_espera(r["prompt_id"]))
        if arq:
            alvo = os.path.join(dst, nome)
            shutil.copyfile(arq[0], alvo)
            feitos.append(alvo)
            print("   %-14s refinado" % nome)
    return feitos


def etapa_voz():
    """A fala, na voz da casa que ja passou por validacao."""
    dst = os.path.join(PACK, "04-voz")
    os.makedirs(dst, exist_ok=True)
    rot = os.path.join(PACK, "01-roteiro")
    os.makedirs(rot, exist_ok=True)
    io.open(os.path.join(rot, "roteiro.md"), "w", encoding="utf-8").write(
        "# Influencer IA — teste de capacidade\n\n"
        "> Produto ficticio, sem marca. O teste e de capacidade tecnica.\n\n"
        "## ROTEIRO\n\n%s\n" % FALA)
    fut = os.path.join(RAIZ, "apps", "canal-futebol")
    r = subprocess.run(
        [sys.executable, "-X", "utf8", os.path.join(fut, "narra_comfy.py"),
         SLUG, "--curto", "--canal-dir", CANAL_DIR],
        cwd=fut)
    return r.returncode == 0


def etapa_movimento(so=None):
    """Cada take vira ~3 s de video com o Wan2.2 I2V."""
    rb = _rb()
    src = os.path.join(PACK, "03-refino")
    if not os.path.isdir(src) or not os.listdir(src):
        src = os.path.join(PACK, "02-takes")
    dst = os.path.join(PACK, "05-video")
    os.makedirs(dst, exist_ok=True)
    import glob
    objinfo = rb.get("/object_info")
    entrada = os.path.join(os.path.dirname(SAIDA_COMFY), "input")
    # O QUE O PROMPT DE I2V PEDE, E O QUE ELE NAO DEVE PEDIR.
    #
    # Pede gesto e microexpressao -- e o que faz parecer gente. NAO pede
    # movimento de camera: a memoria do squad registra que camera parada e o
    # que evita deformacao no Wan, e um rosto deformando derruba tudo.
    MOV = ("she is talking to the camera, natural subtle head movement, "
           "blinking, small hand gestures while explaining, gentle shoulder "
           "movement, static camera, no zoom, no pan")
    NEG_MOV = ("camera movement, zoom, pan, morphing face, distorted face, "
               "extra fingers, deformed hands, warping background, flicker, "
               "text, watermark")
    feitos = []
    for f in sorted(glob.glob(os.path.join(src, "*.png"))):
        nome = os.path.splitext(os.path.basename(f))[0]
        if so and so not in nome:
            continue
        alvo = os.path.join(dst, nome + ".mp4")
        if os.path.isfile(alvo):
            print("   %-14s ja existe" % nome)
            feitos.append(alvo)
            continue
        shutil.copyfile(f, os.path.join(entrada, "inf_" + nome + ".png"))
        p = rb.para_api(_wf("wan22-i2v-social.json"), objinfo)
        for no in p.values():
            ct = no.get("class_type")
            if ct == "WanImageToVideo":
                no["inputs"]["width"], no["inputs"]["height"] = LARG, ALT
                no["inputs"]["length"] = 49
            elif ct == "LoadImage":
                no["inputs"]["image"] = "inf_" + nome + ".png"
            elif ct == "SaveVideo":
                no["inputs"]["filename_prefix"] = "influencer/%s" % nome
            elif ct == "RIFE VFI":
                # float16: a memoria do squad mede que isso divide o pico de
                # RAM por dois, e a maquina tem 16 GB
                no["inputs"]["dtype"] = "float16"
        _texto(p, MOV, NEG_MOV)
        print("   %-14s gerando..." % nome, flush=True)
        r = rb.post("/prompt", {"prompt": p})
        h = _espera(r["prompt_id"])
        vids = _saidas(h, "images") + _saidas(h, "videos")
        if not vids:
            for no in h["outputs"].values():
                for k in ("gifs", "video", "result"):
                    for v in (no.get(k) or []):
                        if isinstance(v, dict) and v.get("filename"):
                            vids.append(os.path.join(
                                SAIDA_COMFY, v.get("subfolder", ""),
                                v["filename"]))
        if vids:
            shutil.copyfile(vids[0], alvo)
            feitos.append(alvo)
            print("   %-14s %s" % (nome, os.path.basename(alvo)))
        else:
            print("   %-14s SEM SAIDA — ver o log do ComfyUI" % nome)
    return feitos


ETAPAS = ["personagem", "takes", "refino", "voz", "movimento"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--etapa", choices=ETAPAS)
    ap.add_argument("--todas", action="store_true")
    ap.add_argument("--so", help="so este take, na etapa de movimento")
    a = ap.parse_args()
    os.makedirs(PACK, exist_ok=True)
    alvo = ETAPAS if a.todas else ([a.etapa] if a.etapa else [])
    if not alvo:
        ap.error("informe --etapa ou --todas")
    for e in alvo:
        print("\n══ %s" % e, flush=True)
        t0 = time.time()
        if e == "personagem":
            etapa_personagem()
        elif e == "takes":
            etapa_takes()
        elif e == "refino":
            etapa_refino()
        elif e == "voz":
            etapa_voz()
        elif e == "movimento":
            etapa_movimento(a.so)
        print("   (%.1f min)" % ((time.time() - t0) / 60), flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
