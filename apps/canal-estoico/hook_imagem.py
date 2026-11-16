# -*- coding: utf-8 -*-
"""Gera a IMAGEM ESTATICA do hook — o primeiro frame que segura o dedo.

O QUE O BENCHMARK FAZ, E QUE O NOSSO MOTOR NAO FAZIA
  No video modelado (`OS MAIS PERIGOSOS DA AMAZONIA`) o primeiro plano e uma
  onca subindo a ribanceira com um boto-cor-de-rosa na boca. Fica quase parado
  por tres segundos enquanto as palavras do titulo entram uma a uma.

  Ela nao ilustra o roteiro: ela e a APOSTA. E uma cena improvavel o bastante
  para o dedo parar antes de o cerebro decidir se e verdade.

  O nosso hook usava o primeiro clipe do acervo, que e so mais um take. Take
  bom nao e hook -- hook precisa ser a imagem mais estranha do lote, e imagem
  estranha nao se acha em banco de acervo: se gera.

POR QUE ESTATICA
  A imagem gerada nao aguenta movimento -- I2V em cena impossivel deforma, e
  deformacao denuncia. O motor ja sabe animar foto com zoom lento (`segmento`
  com `-loop 1`), que e exatamente o que o original faz.

USO
    python hook_imagem.py CUR-p01-cobra-amazonia-45s --canal curiosidades \
        --prompt "..." 
    python hook_imagem.py --lista        # os prompts ja escritos
"""
import argparse
import io
import json
import os
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SQUAD = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio")
COMFY_DIR = os.path.join(SQUAD, "assets", "comfyui")
sys.path.insert(0, COMFY_DIR)
SAIDA_COMFY = os.path.join(r"C:" + os.sep, "Users", "Pichau", "Desktop",
                           "ComfyUI_windows_portable", "ComfyUI", "output")
CANAIS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                      "creative-studio", "canais")
PASTA = {"curiosidades": "curiosidades-animais", "avisos": "placas-de-aviso",
         "estoico": "canal-estoico", "futebol": "bora-de-bola"}

# O negativo carrega o que denuncia imagem gerada em video de nicho: texto,
# marca d'agua, membro a mais e o acabamento de ilustracao.
NEGATIVO = ("text, watermark, logo, subtitles, caption, signature, cartoon, "
            "illustration, painting, 3d render, cgi, plastic, deformed, extra "
            "limbs, extra heads, fused animals, malformed anatomy, duplicate "
            "body, blurry, low quality, oversaturated, collage, frame, border")

# Prompts prontos, por curto. Escritos para o mesmo lugar do original: um
# encontro improvavel entre dois bichos, em luz de fim de tarde, na margem.
PROMPTS = {
    "CUR-p01-cobra-amazonia-45s": (
        "photorealistic wildlife photograph, a giant green anaconda coiled "
        "around a large black caiman at the muddy edge of an Amazon river, "
        "the caiman's jaws open, water dripping, dense green jungle wall "
        "behind, late afternoon light, shot on telephoto lens, shallow depth "
        "of field, National Geographic documentary still, vertical composition"
    ),
    # ESTE HOOK E PLACA, E PLACA PRECISA DE PAREDE.
    #
    # A primeira versao era um veado no meio da estrada com placas de transito
    # reais nas duas margens: a nossa placa entrava por cima e brigava com as
    # do fundo, e o bicho ficava atras dela. O hook virou dois assuntos
    # disputando o mesmo quadro.
    #
    # O fundo de um hook com camada nao pode ser interessante -- ele tem de ser
    # LIMPO no terco superior, que e onde a placa se planta. Estrada vazia
    # entrando na neblina resolve: profundidade embaixo, vazio em cima.
    "AVI-p01-agua-parada-40s": (
        "photorealistic photograph of an empty asphalt road curving into a "
        "misty pine forest at dawn, no signs, no people, no cars, no animals, "
        "soft fog filling the upper half of the frame, wet asphalt reflecting "
        "the pale sky, low camera angle on the road surface, calm documentary "
        "landscape photography, vertical composition, uncluttered"
    ),
}


def gera(slug, canal, prompt, largura=1080, altura=1920, passos=6,
         destino=None):
    import run_batch as rb

    wf = json.load(io.open(os.path.join(COMFY_DIR, "workflows",
                                        "flux2-klein-t2i.json"),
                           encoding="utf-8"))
    objinfo = rb.get("/object_info")
    p = rb.para_api(wf, objinfo)

    # o vertical nasce vertical: gerar quadrado e recortar joga fora metade do
    # enquadramento, e e justamente o enquadramento que faz a cena impressionar
    for nid, no in p.items():
        ct = no.get("class_type")
        if ct == "EmptyFlux2LatentImage":
            no["inputs"]["width"], no["inputs"]["height"] = largura, altura
        elif ct == "Flux2Scheduler":
            no["inputs"]["width"], no["inputs"]["height"] = largura, altura
            no["inputs"]["steps"] = passos
        elif ct == "RandomNoise":
            no["inputs"]["noise_seed"] = int(time.time()) % 2**31
        elif ct == "SaveImage":
            no["inputs"]["filename_prefix"] = "hook/%s" % slug

    # positivo e negativo: o workflow tem dois CLIPTextEncode, e a ordem no
    # dicionario nao e garantia. O CFGGuider diz qual e qual.
    guider = next((n for n in p.values()
                   if n.get("class_type") == "CFGGuider"), None)
    pos = str(guider["inputs"]["positive"][0]) if guider else None
    neg = str(guider["inputs"]["negative"][0]) if guider else None
    for nid, no in p.items():
        if no.get("class_type") != "CLIPTextEncode":
            continue
        no["inputs"]["text"] = prompt if nid == pos else (
            NEGATIVO if nid == neg else no["inputs"].get("text", ""))

    r = rb.post("/prompt", {"prompt": p})
    pid = r["prompt_id"]
    print("   fila: %s" % pid[:8])
    while True:
        h = rb.get("/history/%s" % pid)
        if h.get(pid):
            break
        time.sleep(2)
    saidas = []
    for no in h[pid]["outputs"].values():
        for im in no.get("images", []):
            saidas.append(os.path.join(SAIDA_COMFY, im.get("subfolder", ""),
                                       im["filename"]))
    if not saidas:
        print("   [erro] o ComfyUI nao devolveu imagem")
        return None

    destino = destino or os.path.join(CANAIS, PASTA[canal], "curtos", slug,
                                      "03-takes", "hook.png")
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    import shutil
    shutil.copyfile(saidas[0], destino)
    return destino


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--canal", choices=sorted(PASTA), default="curiosidades")
    ap.add_argument("--prompt")
    ap.add_argument("--passos", type=int, default=6)
    ap.add_argument("--saida", help="grava neste caminho em vez do hook do pack")
    ap.add_argument("--lista", action="store_true")
    a = ap.parse_args()
    if a.lista:
        for k, v in PROMPTS.items():
            print("%s\n   %s\n" % (k, v))
        return 0
    if not a.slug and not a.saida:
        ap.error("informe o slug ou --saida")
    prompt = a.prompt or PROMPTS.get(a.slug)
    if not prompt:
        ap.error("sem prompt para %s — passe --prompt" % a.slug)
    print("%s · %s" % (a.slug or os.path.basename(a.saida), prompt[:70]))
    d = gera(a.slug or "avulso", a.canal, prompt, passos=a.passos,
             destino=a.saida)
    if d:
        from PIL import Image
        print("   %s · %s" % (os.path.basename(d), Image.open(d).size))
    return 0


if __name__ == "__main__":
    sys.exit(main())
