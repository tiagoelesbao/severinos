# -*- coding: utf-8 -*-
"""Adapta o CCC 4.01 para um personagem nosso e acrescenta upscale + face detailer.

O QUE ELE FAZ
  1. troca identidade (nome/trigger word, estilo, roupa, imagem de entrada)
  2. reescreve os 24 prompts de pose
  3. acrescenta as duas etapas que na aula sao da versao paga, ligadas entre o
     `ImageCollectUnpack` (o dataset inteiro, ja montado) e o `Set_FINAL`:

       UPSCALE        ImageUpscaleWithModel com RealESRGAN_x2plus -> 1024 vira 2048
       FACE DETAILER  CCC_FaceAreaBatchSplitter separa as imagens em que o rosto
                      e pequeno; so essas passam pelo FaceDetailer; o Merger
                      recoloca tudo na ordem original

POR QUE UM SCRIPT, E NAO EDITAR O JSON A MAO
  O grafo tem 451 nos, 408 links e 24 subgrafos. Cada no novo exige id unico,
  entrada e saida com o `link` certo dos DOIS lados, e o link registrado no
  array global. A mao isso quebra em silencio -- o ComfyUI abre o arquivo e so
  na hora de rodar diz que falta conexao. Aqui a insercao e programatica e o
  resultado e conferido antes de gravar.

DE ONDE VEM CADA NUMERO
  Os `widgets_values` do FaceDetailer nao foram inventados: sao os mesmos do
  nosso `flux2-klein-pro-refino-upscale.json`, que ja roda com este modelo
  (8 passos, cfg 1.0, euler/simple, denoise 0.35). Flux2 Klein e destilado --
  cfg 8 do padrao do Impact-Pack queimaria a imagem.

  O modelo do detailer e o `model clean` (UNETLoader puro), NAO o `model`. O
  `model` passa por `IdentityGuidance`, que e guia de EDICAO com imagem de
  referencia; o detailer faz inpaint comum e nao tem referencia para dar a ele.

  `area_threshold 0.15`: manda para o detailer a imagem cujo maior rosto ocupa
  menos de 15% da area. Um corpo inteiro em T-pose fica em 3-5% (entra); um
  close fica em 40-60% (passa direto, e nao deve ser mexido mesmo).

O QUE MUDA EM RELACAO A AULA
  Ele usa SeedVR2 (upscaler de video 7B) que nao temos. Trocado por
  `ImageUpscaleWithModel` com `RealESRGAN_x2plus` -- 2x, que e o que leva o
  dataset de 1024 para 2048, o alvo que ele cita. O `4x-UltraSharp` passaria de
  4K e so gastaria disco.

O QUE NAO SE ADAPTA, E POR QUE
  Os prompts estruturais -- T-pose, perfil, costas, closes frontais, expressoes
  -- ficam NEUTROS, com fundo branco. Eles nao sao cena da peca: sao o que
  ensina o modelo a saber o rosto de todos os angulos. Transformando todos os
  24 em cena do comercial, a LoRA aprenderia que o personagem so existe em rua
  de comunidade ao entardecer (regra 2 da aula).

USO
    python adapta_ccc.py --saida CCC_4-01_BRUNO.json
    python adapta_ccc.py --sem-etapas      # so os prompts, grafo original
"""
import argparse
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.dirname(os.path.dirname(AQUI))
WF = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio", "assets",
                  "comfyui", "workflows")
ORIGEM = os.path.join(WF, "260720_MICKMUMPITZ_CCC_4-01_SMPL .json")

# ── IDENTIDADE ──────────────────────────────────────────────────────────────
#
# O trigger word e uma palavra INVENTADA. Se fosse so "bruno", o modelo ja tem
# um monte de bruno; o treino teria de brigar com o que ele ja sabe. Numero e
# grafia fora do comum isolam o conceito.
NOME = "Brun0_R1fa"

# O estilo entra em TODOS os prompts. Aqui ele carrega a decisao do founder:
# cinematografico quente. E carrega tambem o que a peca precisa -- homem
# brasileiro, 30 e poucos, para o modelo nao derivar para outro tipo.
ESTILO = ("A brazilian man in his mid thirties, cinematic warm color grading, "
          "golden hour light, soft film grain, shallow depth of field, "
          "photographed on a 35mm lens, natural skin texture")

# A camiseta da marca FICA (e o que o founder quer que grude no personagem); a
# jaqueta SAI -- ela cobre o logo nos dois lados e e roupa de inverno numa peca
# de outubro em comunidade.
#
# A COROA esta descrita, o WORDMARK nao. Isso e deliberado: difusao reproduz
# FORMA com fidelidade razoavel e TEXTO nao reproduz nunca. Na propria foto de
# referencia a tarja amarela ja esta ilegivel; pedir "IMPERIO PREMIOS" faria o
# modelo inventar 24 grafias diferentes, e a LoRA aprenderia "rabisco" como
# parte do Brun0_R1fa. O wordmark entra depois, como camada, onde ele fica
# legivel de verdade.
#
# Cuidado de vocabulario: este campo alimenta o PROMPT DE GERACAO do CCC (o que
# as 24 imagens vao MOSTRAR). Nao e a legenda do dataset -- e a legenda, la no
# DATASET-TAGGER, que decide o que da para trocar depois (regra 4 da aula).
ROUPA = ("wearing a white crew-neck t-shirt with a golden crown printed on the "
         "chest, black jogger pants and black sneakers")

IMAGEM_ENTRADA = "bruno-ref.png"

# ── NOS E MODELOS DAS ETAPAS NOVAS ──────────────────────────────────────────
UPSCALER = "RealESRGAN_x2plus.pth"      # D:\ComfyUI_Models\upscale_models

# O recorte de rosto pede OUTRO upscaler, e o motivo e aritmetico. O
# `AutoCropFaces` nao recorta 3x o lado: recorta 3x a AREA. Com o rosto do Bruno
# em 164x215, `sqrt(164*215*3)` da ~318 px -- nao os ~550 que se estima de olho.
#
#   com x2:  318 -> 636  -> o resize para 1024 AINDA e ampliacao (1,6x de lanczos)
#   com x4:  318 -> 1272 -> o resize para 1024 vira REDUCAO, que e supersampling
#
# So no segundo caso o lanczos deixa de inventar pixel. Por isso 4x aqui e 2x no
# dataset: la a imagem ja nasce em 1024 e 2x leva exatamente aos 2048 da aula.
UPSCALER_ROSTO = "4x-UltraSharp.pth"
DETECTOR = "bbox/face_yolov8m.pt"       # D:\ComfyUI_Models\ultralytics\bbox
LIMIAR_AREA = 0.15                      # rosto abaixo disso vai para o detailer

POS_ROSTO = ("close-up portrait of the face of " + NOME + ", " + ESTILO +
             ", sharp focus on the eyes, detailed skin pores, natural skin "
             "texture, photorealistic")
NEG_ROSTO = ("blurry, out of focus, deformed face, asymmetric eyes, plastic "
             "skin, waxy skin, cartoon, illustration, painting, low quality, "
             "jpeg artifacts, text, watermark")

# Valores do flux2-klein-pro-refino-upscale.json, que ja roda -- MENOS o
# denoise, que caiu de 0.35 para 0.20 depois da medicao da primeira rodada do
# Bruno.
#
# O QUE A MEDICAO MOSTROU
#   27 imagens auditadas nas duas pastas, casadas por conteudo. O detailer
#   virou 5 aprovacoes em rejeicoes e nao salvou NENHUMA rejeicao. Cinco a
#   zero, todas na mesma direcao: o rosto saiu mais magro, maxilar mais
#   definido, bochecha cheia perdida. Ele puxa para o rosto MEDIO do modelo.
#
# POR QUE ACONTECE
#   Todos os nos de geracao recebem a IMAGEM de referencia do rosto. O
#   FaceDetailer nao recebe imagem nenhuma -- so o prompt de texto. E a trigger
#   word do personagem nao significa nada para o modelo base enquanto a LoRA
#   nao existe. Ou seja: ele regenera 35% de um rosto generico por cima de um
#   rosto especifico.
#
#   Depois da LoRA treinada o sinal se inverte (a trigger word passa a valer) e
#   0.35 volta a fazer sentido. Antes dela, nao.
#
# A CORRECAO DE VERDADE, quando houver tempo de medir: `ApplyPuLIDFlux2` entre
# o `model clean` e o detailer, alimentado pelo INPUT_FACE. Ai o detailer passa
# a ter identidade, como todo o resto do grafo ja tem. Os nos estao instalados.
FD_WIDGETS = [512, True, 1024, 0, "fixed", 8, 1.0, "euler", "simple", 0.20,
              24, True, True, 0.5, 10, 3.0, "center-1", 0, 0.93, 0, 0.7,
              "False", 10, "", 1, False, 20, False, False]

# ── OS 24 PROMPTS ───────────────────────────────────────────────────────────
#
# `E` marca os ESTRUTURAIS: ficam neutros, fundo branco, e existem para o
# modelo aprender o rosto e o corpo. `C` marca os de CENA: viram os contextos
# da peca de Dia das Criancas.
FIM = ("Keep the exact same face, skin tone, hairstyle and facial structure as "
       "the reference. Do not change the character's identity.")

# O logo ligado em `image_1` vaza para quem mais estiver no quadro: numa das
# primeiras rodadas ele apareceu nas COSTAS da camiseta do menino. Referencia
# nao sabe a quem pertence -- quem diz isso e o prompt. Entao toda cena com
# outra pessoa carrega esta frase.
SO_ELE = (" Only the main character wears the branded white t-shirt. Everyone "
          "else in the frame wears plain clothes with no printed logo of any "
          "kind.")

PROMPTS = {
    # ── ESTRUTURAIS (E) — o que ensina o rosto ─────────────────────────────
    2827: ("E", "T-POSE",
           "Show this exact character in a full body pose in front of a neutral "
           "white background. The character is standing full body in a frontal "
           "A-pose, looking into the camera with a neutral expression and closed "
           "mouth. A full body view from head to feet. Force the character into "
           "an A-pose.\n\nCamera full body shot. " + FIM),
    2849: ("E", "SIDE-WALK",
           "Show this character walking relaxed from the right side of the image "
           "to the left side in a white studio, medium shot.\n\n"
           "FULL BODY PORTRAIT SIDE VIEW. " + FIM),
    2772: ("E", "CLOSE-FRONT",
           "Extreme close-up of the character's frontal face against a plain "
           "white background, neutral expression, frontal view. The head fills "
           "the entire frame, face visible in detail. No hands visible. Relaxed "
           "pose. Symmetrical. " + FIM),
    2773: ("E", "CLOSE-PROFILE",
           "Extreme close-up, side profile portrait of the character against a "
           "plain white background. Neutral relaxed pose. The head and shoulders "
           "fill the entire frame. The character faces left in a 90-degree "
           "profile, so only one side of the face is visible.\n\n"
           "The character's arms hang loosely at their sides. " + FIM),
    2826: ("E", "BACK-VIEW",
           "Turn the character around to create a back view. Relaxed pose, arms "
           "hanging down. Show this exact character in a full body pose from the "
           "back.\n\nThe background is neutral white.\n\n"
           "FULL BODY BACK VIEW OF THE CHARACTER"),
    2750: ("E", "CLOSE-SMILE",
           "A close-up in front of a white background: make the character smile "
           "warmly with an open mouth, a genuine unposed smile with visible eye "
           "crinkles. " + FIM),
    2749: ("E", "CLOSE-MOVED",
           "A close-up of the character against a plain neutral background with a "
           "moved, emotional expression — eyes slightly glassy, lips pressed "
           "together, holding back emotion. Not crying. " + FIM),
    2770: ("E", "CLOSE-FOCUSED",
           "A close-up in front of a white background: the character with a "
           "serious, focused and determined expression, mouth closed, looking "
           "straight into the camera. " + FIM),

    # ── CENA (C) — os contextos da peca ────────────────────────────────────
    2769: ("C", "MAOS-PRESENTE",
           "Close up of the character's hands holding a wrapped gift box with a "
           "ribbon. The hands and the box fill the image. The character's upper "
           "body fills the background, out of focus. Warm late afternoon light."),
    2785: ("C", "CARREGANDO",
           "A medium shot of the character carrying a large cardboard box full of "
           "wrapped gifts, walking up a narrow street in a brazilian favela "
           "community in the late afternoon. Simple brick houses on both sides. "
           "He is looking ahead, focused, slightly out of breath.\n\n"
           "Show this exact character. Match style, skin, hairstyle and face. " + FIM),
    2767: ("C", "AGACHADO",
           "A medium shot of the character crouching down to a child's height on "
           "a community street, handing over a wrapped gift with both hands. His "
           "face is at the same level as the child's. Warm golden hour light. "
           "The child is seen from behind, out of focus in the foreground. The "
           "child wears a plain t-shirt with no print on it." + SO_ELE),
    2782: ("C", "ENTREGANDO",
           "A medium shot of the character handing a wrapped gift forward, his "
           "arm extended toward the camera and partially out of frame. He is "
           "smiling gently. Behind him, a blurred community street with people. "
           "Warm evening light. Match style, skin, hairstyle and clothes "
           "exactly." + SO_ELE),
    2788: ("C", "COSTAS-RUA",
           "A wide shot of the character seen from behind, standing still and "
           "looking down a crowded community street full of children and "
           "families. His shoulders are relaxed. Golden hour backlight creates a "
           "rim of light around him. We do not see his face. The back of his "
           "t-shirt is plain white with no print." + SO_ELE),
    3014: ("C", "MULTIDAO",
           "A wide shot of the character standing in the middle of a crowd of "
           "children and adults on a community street during a gift handout. He "
           "is one figure among many, not centered. Late afternoon warm light. "
           "Documentary style, unposed." + SO_ELE),
    2704: ("C", "CARRO-CARREGADO",
           "A medium shot of the character standing at the open trunk of a car "
           "completely filled with wrapped gifts, at dawn on a quiet street. He "
           "is reaching in to pick one up. Cool early morning light with a warm "
           "highlight on his face."),
    2766: ("C", "MEIO-FIO",
           "A wide shot of the character sitting on a street curb in a community, "
           "surrounded by children sitting beside him. He is talking and "
           "gesturing with one hand. Everyone is relaxed. Warm late afternoon "
           "light, long shadows on the ground." + SO_ELE),
    2768: ("E", "ESCRITORIO",
           "The character is sitting at a simple desk in a small home office, "
           "working on a laptop with a paper notebook and a pen beside it. The "
           "laptop is seen from behind, its screen turned away from the camera "
           "and not visible. Medium shot. Daylight from a window on the left. "
           + FIM),
    2764: ("C", "CONTRALUZ",
           "A medium close-up of the character with strong backlight. Hard golden "
           "sunlight shines from behind, leaving part of his face in warm shadow. "
           "He is looking off camera with a calm, serious expression."),
    2775: ("C", "OLHANDO-RUA",
           "A medium shot of the character leaning against a wall on a community "
           "street at the end of the day, arms crossed, looking at something off "
           "camera. Tired but content. The warm light is almost gone."),
    2765: ("C", "CRIANCA-COLO",
           "A medium shot of the character holding a small child in his arms, "
           "both laughing, on a community street. Other children around them, out "
           "of focus. Warm golden hour light. Unposed documentary moment."
           + SO_ELE),
    2780: ("E", "CONTRA-PLONGEE",
           "A full body wide shot of the character from a low angle, looking up. "
           "The sky fills the background. Hands on the hips. Dramatic warm "
           "lighting. Completely change the perspective.\n\nFULL BODY. " + FIM),
    2781: ("E", "PLONGEE",
           "A high angle wide shot of the character looking up toward the camera "
           "with a surprised, happy expression. Completely change the "
           "perspective. " + FIM),
    2789: ("C", "NOITE-CARRO",
           "A wide shot of the character leaning against a car at night on a "
           "quiet street, the trunk still half full of gifts. Warm street lamp "
           "light. He is looking down at his phone, relaxed."),
    3026: ("C", "BRACOS-ERGUIDOS",
           "A back view of the character raising both arms above his head in "
           "celebration, facing a crowded community street full of people. Golden "
           "hour. Arms raised above the head. The back of his t-shirt is plain "
           "white with no print." + SO_ELE),
}

NOTA = """## ETAPAS EXTRAS — upscale + face detailer

O que na aula e a versao paga, refeito com o que ja temos instalado.

**Onde entram:** entre o `ImageCollectUnpack` (dataset inteiro montado) e o
`Set_FINAL`. Tudo o que for salvo passa por aqui.

**1 · UPSCALE** — `RealESRGAN_x2plus`, 2x. O dataset de 1024 vira 2048, que e o
alvo que ele cita na aula. O `4x-UltraSharp` passaria de 4K e so gastaria disco.

**2 · SPLITTER** — `area_threshold 0.15`. So vai para o detailer a imagem em que
o maior rosto ocupa menos de 15% da area: corpo inteiro em T-pose fica em 3-5%
(entra), close fica em 40-60% (passa direto — e nao deve ser mexido mesmo).
O `preview (rostos pequenos)` mostra exatamente o que foi separado. Se vier
close ali dentro, o limiar esta alto demais.

**3 · FACE DETAILER** — 8 passos, cfg 1.0, euler/simple, denoise 0.35. Mesmos
valores do nosso `flux2-klein-pro-refino-upscale.json`. Flux2 Klein e destilado:
cfg 8 (o padrao do Impact-Pack) queimaria a imagem.

O modelo e o **`model clean`** (UNETLoader puro), nao o `model` — este ultimo
passa por `IdentityGuidance`, que e guia de EDICAO com imagem de referencia, e o
detailer faz inpaint comum.

**4 · MERGER** — recoloca as detalhadas na posicao original do lote.
"""


def carrega():
    return json.load(io.open(ORIGEM, encoding="utf-8"))


def troca_textos(w):
    ns = {n["id"]: n for n in w["nodes"]}
    trocados = 0
    for nid, (tipo, rotulo, texto) in PROMPTS.items():
        n = ns.get(nid)
        if not n:
            print("   [aviso] no %s nao existe" % nid)
            continue
        n["widgets_values"][0] = texto
        n["title"] = "PROMPT · %s" % rotulo
        trocados += 1
    # identidade
    for nid, valor, rotulo in ((2905, NOME, "NAME"), (547, ESTILO, "STYLE"),
                               (549, ROUPA, "CLOTHES")):
        n = ns.get(nid)
        if n:
            n["widgets_values"][0] = valor
            trocados += 1
    # imagem de entrada
    n = ns.get(535)
    if n:
        n["widgets_values"][0] = IMAGEM_ENTRADA
        trocados += 1
    return trocados


# ── construcao de grafo ─────────────────────────────────────────────────────
#
# Tres primitivas, e so elas tocam em id e link. Todo o resto do codigo abaixo
# monta a topologia sem saber numero nenhum -- que e o que impede o erro que a
# edicao manual comete: link que existe de um lado e nao do outro.

class Grafo(object):
    def __init__(self, w):
        self.w = w
        self.ns = {n["id"]: n for n in w["nodes"]}
        self.prox_no = int(w.get("last_node_id", 0))
        self.prox_lk = int(w.get("last_link_id", 0))
        self.novos = []

    def no(self, tipo, pos, size, wv=None, entradas=(), saidas=(),
           titulo=None, cor=None):
        self.prox_no += 1
        nid = self.prox_no
        n = {
            "id": nid, "type": tipo, "pos": list(pos), "size": list(size),
            "flags": {}, "order": 0, "mode": 0,
            "inputs": [dict(e) for e in entradas],
            "outputs": [dict(s) for s in saidas],
            "properties": {"Node name for S&R": tipo},
        }
        if wv is not None:
            n["widgets_values"] = wv
        if titulo:
            n["title"] = titulo
        if cor:
            n["color"], n["bgcolor"] = cor
        self.w["nodes"].append(n)
        self.ns[nid] = n
        self.novos.append(nid)
        return nid

    def liga(self, orig, slot_o, dest, slot_d, tipo):
        self.prox_lk += 1
        lid = self.prox_lk
        self.w["links"].append([lid, orig, slot_o, dest, slot_d, tipo])
        o = self.ns[orig]["outputs"][slot_o]
        o["links"] = list(o.get("links") or []) + [lid]
        self.ns[dest]["inputs"][slot_d]["link"] = lid
        return lid

    def grupo(self, titulo, caixa, cor="#3f789e"):
        ids = [g.get("id", 0) for g in self.w.get("groups", [])]
        self.w.setdefault("groups", []).append({
            "id": (max(ids) if ids else 0) + 1, "title": titulo,
            "bounding": list(caixa), "color": cor, "flags": {}})

    def fecha(self):
        self.w["last_node_id"] = self.prox_no
        self.w["last_link_id"] = self.prox_lk


def _e(nome, tipo, widget=None):
    """Entrada. `widget` marca a entrada que no painel era um campo de texto."""
    d = {"name": nome, "type": tipo, "link": None}
    if widget:
        d["widget"] = {"name": widget}
    return d


def _s(nome, tipo):
    return {"name": nome, "type": tipo, "links": []}


# -- O LOGO COMO TERCEIRA REFERENCIA -----------------------------------------
#
# A tecnica e a do colar, na aula: quando um detalhe do personagem muda entre as
# imagens, voce carrega esse detalhe como uma referencia A PARTE e cria grupos
# so dele. Cada grupo de geracao aceita ate quatro referencias; o CCC usa duas
# (corpo inteiro + rosto) e deixa `image_1` e `image_2` livres. O logo entra em
# `image_1`.
#
# Duas armadilhas da aula, as duas respeitadas aqui:
#
#   1. A referencia solta nao basta. Ele nao carrega so o recorte do colar --
#      carrega o recorte E mantem a foto original como referencia principal. Por
#      isso o `prepara_ref_logo.py` estampa o logo no peito da foto: sem isso o
#      modelo recebe uma arte flutuando e nao sabe onde nem em que tamanho ela
#      mora.
#
#   2. "It is trying to generate shoes, and that is because they are in the
#      general prompt." Nos grupos de close do logo o texto NAO passa pelo
#      JoinStringMulti (estilo + prompt + roupa): vai direto do prompt manual.
#      Senao o grupo do logo tenta desenhar o personagem inteiro.
#
# Onde o logo NAO entra: closes de rosto (nao tem peito no quadro) e vistas de
# costas (o logo e no peito). Pendurar referencia que o quadro nao comporta faz
# o modelo tentar encaixa-la a forca.
ARQUIVO_LOGO = "imperio-logo.png"
SEM_LOGO = {"CLOSE-FRONT", "CLOSE-PROFILE", "CLOSE-SMILE", "CLOSE-MOVED",
            "CLOSE-FOCUSED", "BACK-VIEW", "COSTAS-RUA", "BRACOS-ERGUIDOS"}

MARCA = ("the golden crown with five golden stars arched above it and the dark "
         "IMPERIO PREMIOS wordmark printed below it, on a plain white cotton "
         "t-shirt")

# Os tres grupos extras de close do logo. A aula: "close-up shots of that
# necklace ... a single shot with different lighting conditions, side view,
# extreme close-up". Mesma receita, outro objeto.
GRUPOS_LOGO = [
    ("LOGO-CLOSE",
     "Extreme close-up of the chest print of the character's t-shirt. " + MARCA +
     ". The print fills the entire frame. Soft natural fabric folds crossing "
     "the artwork, visible cotton weave, even soft studio light, plain white "
     "background behind. No face, no head, no hands in the frame."),
    ("LOGO-ANGLE",
     "Close-up of the chest print seen from a three-quarter angle, the fabric "
     "curving away from the camera so the artwork is slightly foreshortened. " +
     MARCA + ". Soft studio light from the left. No face in the frame."),
    ("LOGO-LIGHT",
     "Close-up of the chest print under warm golden hour sunlight, a soft "
     "shadow falling diagonally across the artwork. " + MARCA + ". Outdoors, "
     "the blurred street behind is out of focus. No face in the frame."),
]


def _gen_por_rotulo(w):
    """{rotulo do prompt: id do no de geracao que o consome}.

    Pelos ids nao da: os nos de geracao sao subgrafos com UUID e nada no nome
    diz que pose sao. O que amarra e a cadeia do texto -- prompt ->
    JoinStringMulti -> no de geracao. Derivar disso sobrevive a qualquer
    renumeracao do grafo.
    """
    ns = {n["id"]: n for n in w["nodes"]}
    lk = {l[0]: l for l in w["links"]}
    rotulo_de = {nid: r for nid, (_, r, _) in PROMPTS.items()}
    fora = {}
    for n in w["nodes"]:
        if len(n["type"]) != 36 or "-" not in n["type"]:
            continue
        for e in n.get("inputs", []):
            if e["name"] != "text" or not e.get("link"):
                continue
            j = ns[lk[e["link"]][1]]
            for e2 in j.get("inputs", []):
                if not e2.get("link"):
                    continue
                o = ns[lk[e2["link"]][1]]
                if o["type"] == "StringConstantMultiline" and o["id"] in rotulo_de:
                    fora[rotulo_de[o["id"]]] = n["id"]
    return fora


def insere_logo(g):
    """Liga o logo como terceira referencia e cria os grupos de close dele."""
    import copy
    import uuid
    w, ns = g.w, g.ns

    y0 = max(n.get("pos", [0, 0])[1] for n in w["nodes"]) + 420
    x0 = 2600

    def clona(base, pos=None, titulo=None):
        n = copy.deepcopy(ns[base])
        g.prox_no += 1
        n["id"] = g.prox_no
        n["order"] = 0
        for e in n.get("inputs", []):
            e["link"] = None
        for o in n.get("outputs", []):
            o["links"] = []
        if pos:
            n["pos"] = list(pos)
        if titulo:
            n["title"] = titulo
        w["nodes"].append(n)
        ns[n["id"]] = n
        g.novos.append(n["id"])
        return n["id"]

    def entrada(nid, nome):
        for i, e in enumerate(ns[nid]["inputs"]):
            if e["name"] == nome:
                return i
        raise SystemExit("no %s nao tem entrada %r" % (nid, nome))

    # -- 1 . o logo entra no grafo -------------------------------------------
    n_ld = clona(535, (x0 - 760, y0 + 700), "LOGO da marca (terceira referencia)")
    ns[n_ld]["widgets_values"][0] = ARQUIVO_LOGO
    n_set = clona(539, (x0 - 340, y0 + 700), "Set_LOGO")
    ns[n_set]["widgets_values"] = ["LOGO"]
    ns[n_set]["properties"]["previousName"] = "LOGO"
    g.liga(n_ld, 0, n_set, 0, "IMAGE")

    # -- 2 . `image_1` das poses em que o peito aparece ----------------------
    mapa = _gen_por_rotulo(w)
    faltando = [r for _, r, _ in PROMPTS.values() if r not in mapa]
    if faltando:
        print("   [aviso] sem no de geracao: %s" % ", ".join(faltando))
    ligados = 0
    for rotulo, gid in sorted(mapa.items()):
        if rotulo in SEM_LOGO:
            continue
        gt = clona(828, (ns[gid]["pos"][0] - 240, ns[gid]["pos"][1] + 40),
                   "Get_LOGO")
        ns[gt]["widgets_values"] = ["LOGO"]
        ns[gt]["outputs"][0]["name"] = "IMAGE"
        ns[gt]["outputs"][0]["type"] = "IMAGE"
        g.liga(gt, 0, gid, entrada(gid, "image_1"), "IMAGE")
        ligados += 1

    # -- 3 . os grupos de close do logo --------------------------------------
    modelo_gen = mapa.get("CLOSE-FRONT")
    if modelo_gen is None:
        raise SystemExit("nao achei o no de geracao do CLOSE-FRONT para clonar")
    for k, (rotulo, texto) in enumerate(GRUPOS_LOGO):
        bx, by = x0 + 2500 + k * 1600, y0
        # cada grupo ganha a PROPRIA definicao de subgrafo, como o frontend faz
        # ao copiar: instancias do mesmo tipo dividem os widgets internos
        d = copy.deepcopy(next(s for s in w["definitions"]["subgraphs"]
                               if s["id"] == ns[modelo_gen]["type"]))
        d["id"] = str(uuid.uuid4())
        w["definitions"]["subgraphs"].append(d)

        gen = clona(modelo_gen, (bx + 700, by + 300), "GERA . %s" % rotulo)
        ns[gen]["type"] = d["id"]
        prompt = clona(2772, (bx + 340, by + 300), "PROMPT . %s" % rotulo)
        ns[prompt]["widgets_values"][0] = texto
        col = clona(2653, (bx + 1120, by + 760), None)
        st = clona(2654, (bx + 1120, by + 820), "Set_%s" % rotulo)
        ns[st]["widgets_values"] = [rotulo]
        ns[st]["properties"]["previousName"] = rotulo
        sv = clona(2799, (bx + 340, by - 240), "SALVA . %s" % rotulo)
        gcache = clona(2830, (bx + 340, by - 290), "Get_cache_loc")

        # o texto vai DIRETO do prompt -- sem estilo, sem roupa (armadilha 2)
        g.liga(prompt, 0, gen, entrada(gen, "text"), "STRING")
        refs = (("pixels", "INPUT_IMAGE", "IMAGE"), ("image", "LOGO", "IMAGE"),
                ("width", "width", "INT"), ("height", "height", "INT"),
                ("model", "model", "MODEL"), ("vae", "vae", "VAE"),
                ("clip", "clip", "CLIP"))
        for i, (nome, chave, tipo) in enumerate(refs):
            gt = clona(828, (bx + 340, by + 620 + i * 46), "Get_%s" % chave)
            ns[gt]["widgets_values"] = [chave]
            ns[gt]["outputs"][0]["name"] = tipo
            ns[gt]["outputs"][0]["type"] = tipo
            g.liga(gt, 0, gen, entrada(gen, nome), tipo)
        g.liga(gen, 0, col, 0, "IMAGE")
        g.liga(col, 0, st, 0, "IMAGE")
        g.liga(gen, 0, sv, entrada(sv, "images"), "IMAGE")
        g.liga(gcache, 0, sv, entrada(sv, "filename_prefix"), "STRING")
        g.grupo("LOGO . %s" % rotulo, [bx + 280, by - 340, 1300, 1240],
                "#3D6A8A")

    return ligados, len(GRUPOS_LOGO)


# -- REFERENCIAS MULTI-ANGULO ------------------------------------------------
#
# O 45 graus e o perfil saem errados por um motivo simples: o modelo recebe duas
# referencias e as duas sao frontais. Para um perfil ele nao tem informacao
# nenhuma sobre o lado daquele rosto -- esta inventando a partir do que sabe de
# rostos em geral.
#
# Cada no de geracao aceita QUATRO referencias e o CCC usa duas. Sobra `image_1`
# (ocupada pelo logo em 16 poses, quando ha logo) e `image_2` (livre em todas).
# Aqui essas sobras recebem as vistas extras, alocadas por pose: nao adianta dar
# a vista de costas para um close frontal.
#
# ATIVACAO POR PRESENCA DE ARQUIVO. Nada e ligado se o arquivo nao existir em
# ComfyUI/input. Assim o modelo continua abrindo e rodando para quem tem so uma
# foto, e passa a usar as vistas no instante em que elas aparecem -- sem flag,
# sem editar o script.
#
# A CONDICAO QUE DECIDE TUDO: as fotos tem de ser da MESMA SESSAO. Mesma roupa,
# mesma luz, mesmo dia, mesmo corte. O que VARIA entre as referencias o modelo
# entende como variavel; o que se REPETE ele entende como identidade. Um 45 com
# outro cabelo ensina que o cabelo e opcional.
#
#   (nao confundir com a regra 2 da aula -- "varie o que quer generalizar".
#    Aquela vale para o dataset GERADO. Referencia de entrada quer o oposto:
#    constancia maxima, a mesma pessoa vista de varios angulos.)
ENTRADA_COMFY = r"C:\Users\Pichau\Desktop\ComfyUI_windows_portable\ComfyUI\input"

VISTAS = [("REF_45", "ref-45.png", "45 graus"),
          ("REF_COSTAS", "ref-costas.png", "costas"),
          ("REF_PERFIL", "ref-perfil.png", "perfil 90 graus")]

# Que vista serve cada pose, em ordem de preferencia. O que sobra de slot recebe
# a proxima da lista; o que nao tem slot livre nao recebe nada.
VISTA_POR_POSE = {
    "BACK-VIEW": ("REF_COSTAS", "REF_45"),
    "COSTAS-RUA": ("REF_COSTAS", "REF_45"),
    "BRACOS-ERGUIDOS": ("REF_COSTAS", "REF_45"),
    "CLOSE-PROFILE": ("REF_PERFIL", "REF_45"),
    "SIDE-WALK": ("REF_PERFIL", "REF_45"),
    "CLOSE-FRONT": ("REF_45", "REF_PERFIL"),
    "CLOSE-SMILE": ("REF_45", "REF_PERFIL"),
    "CLOSE-MOVED": ("REF_45", "REF_PERFIL"),
    "CLOSE-FOCUSED": ("REF_45", "REF_PERFIL"),
}
VISTA_PADRAO = ("REF_45",)


def insere_vistas(g):
    """Liga as vistas extras nos slots que sobraram, pose a pose."""
    ns = g.ns
    disponiveis = [(chave, arq, rot) for chave, arq, rot in VISTAS
                   if os.path.isfile(os.path.join(ENTRADA_COMFY, arq))]
    if not disponiveis:
        return 0, 0

    y0 = max(n.get("pos", [0, 0])[1] for n in g.w["nodes"]) + 420
    guardado = {}
    for i, (chave, arq, rot) in enumerate(disponiveis):
        ld = g.no("LoadImage", (200, y0 + i * 460), (380, 400), [arq, "image"],
                  saidas=[_s("IMAGE", "IMAGE"), _s("MASK", "MASK")],
                  titulo="VISTA · %s" % rot)
        ld_n = ns[ld]
        ld_n["properties"]["Node name for S&R"] = "LoadImage"
        st = g.no("SetNode", (640, y0 + i * 460), (225, 58), [chave],
                  entradas=[_e("IMAGE", "IMAGE")], saidas=[_s("IMAGE", "IMAGE")],
                  titulo="Set_%s" % chave)
        ns[st]["properties"]["aux_id"] = "kijai/ComfyUI-KJNodes"
        ns[st]["properties"]["previousName"] = chave
        g.liga(ld, 0, st, 0, "IMAGE")
        guardado[chave] = True

    mapa = _gen_por_rotulo(g.w)
    ligados = 0
    for rotulo, gid in sorted(mapa.items()):
        # so os slots que ninguem ocupou -- o logo chega antes e tem prioridade
        livres = [i for i, e in enumerate(ns[gid]["inputs"])
                  if e["name"] in ("image_1", "image_2") and not e.get("link")]
        if not livres:
            continue
        querido = [c for c in VISTA_POR_POSE.get(rotulo, VISTA_PADRAO)
                   if c in guardado]
        for slot, chave in zip(livres, querido):
            gt = g.no("GetNode", (ns[gid]["pos"][0] - 240,
                                  ns[gid]["pos"][1] + 90 + slot * 44),
                      (220, 34), [chave], saidas=[_s("IMAGE", "IMAGE")],
                      titulo="Get_%s" % chave)
            ns[gt]["flags"] = {"collapsed": True}
            ns[gt]["properties"]["aux_id"] = "kijai/ComfyUI-KJNodes"
            g.liga(gt, 0, gid, slot, "IMAGE")
            ligados += 1
    return len(disponiveis), ligados


def solta_face_da_resolucao(g, lado=1024):
    """Faz a referencia de rosto parar de seguir o seletor de resolucao.

    O `ResolutionSelector` governa DUAS coisas ao mesmo tempo no grafo do autor:
    o tamanho da geracao e o resize da referencia de rosto. Enquanto a geracao
    e 1:1 isso passa despercebido. Escolhendo 9:16 para ter dataset vertical, o
    resize da referencia vira 768x1368 com `keep_proportion: pad` -- o recorte
    quadrado do rosto entra com 768 px de lado e mais da metade da tela vira
    barra morta. Ou seja: pedir vertical ENCOLHE a referencia de 1024 para 768.

    Sao necessidades diferentes. A geracao precisa do formato de entrega; a
    referencia de rosto precisa de resolucao e nada mais -- ela nao e enquadrada
    por ninguem, so lida. Entao ela fica quadrada e fixa, e o seletor continua
    mandando na geracao.
    """
    ns = g.ns
    RESIZE = 562
    if RESIZE not in ns:
        raise SystemExit("no %s (resize da referencia de rosto) sumiu" % RESIZE)
    n = ns[RESIZE]
    mortos = [e["link"] for e in n["inputs"]
              if e["name"] in ("width", "height") and e.get("link")]
    for e in n["inputs"]:
        if e["name"] in ("width", "height"):
            e["link"] = None
    for lid in mortos:
        l = next(x for x in g.w["links"] if x[0] == lid)
        o = ns[l[1]]["outputs"][l[2]]
        o["links"] = [x for x in (o.get("links") or []) if x != lid]
        g.w["links"].remove(l)
    n["widgets_values"][0] = lado
    n["widgets_values"][1] = lado
    n["title"] = ("referencia de rosto · %dx%d FIXO (nao segue o seletor)"
                  % (lado, lado))
    return len(mortos)


def melhora_face_ref(g):
    """Upscala o recorte do rosto ANTES do resize que a aula faz.

    O problema, medido na referencia do Bruno (1184x2096): o rosto ocupa
    165x218 px -- 1,45% da area. O `AutoCropFaces` recorta 3x em volta, o que
    da ~550 px, e o `ImageResizeKJv2` seguinte estica isso ate `width`x`height`
    do seletor de resolucao com lanczos puro. Lanczos nao inventa detalhe: ele
    borra o que ja estava la.

    E esse recorte e lido por 23 dos 24 nos de geracao. Ou seja, o defeito nao
    aparece numa imagem -- aparece em todas.

    A correcao e um upscaler no meio: 550 -> 1100 com RealESRGAN, e ai o resize
    da aula vira REDUCAO, que e supersampling e sai limpo.

    O preview do autor tambem e remanejado para depois do upscale -- senao ele
    continua mostrando a versao mole e a pessoa conclui que nada mudou.
    """
    ns = g.ns
    CROP = 537                      # AutoCropFaces do rosto, saida `face`
    if CROP not in ns:
        raise SystemExit("no %s (AutoCropFaces do rosto) nao existe" % CROP)

    px, py = ns[CROP]["pos"][0], ns[CROP]["pos"][1]
    n_ld = g.no("UpscaleModelLoader", (px - 420, py + 300), (330, 60),
                [UPSCALER_ROSTO], saidas=[_s("UPSCALE_MODEL", "UPSCALE_MODEL")],
                titulo="0 · upscaler da referencia")
    n_up = g.no("ImageUpscaleWithModel", (px - 420, py + 400), (330, 60), [],
                entradas=[_e("upscale_model", "UPSCALE_MODEL"),
                          _e("image", "IMAGE")],
                saidas=[_s("IMAGE", "IMAGE")],
                titulo="0 · UPSCALE do recorte do rosto (4x · 318 → 1272)")

    # todo mundo que lia o recorte cru passa a ler o recorte upscalado
    consumidores = [l for l in g.w["links"] if l[1] == CROP and l[2] == 0]
    ns[CROP]["outputs"][0]["links"] = []
    g.liga(CROP, 0, n_up, 1, "IMAGE")
    g.liga(n_ld, 0, n_up, 0, "UPSCALE_MODEL")
    for l in consumidores:
        l[1], l[2] = n_up, 0
        ns[n_up]["outputs"][0]["links"].append(l[0])
    if 536 in ns:
        ns[536]["title"] = "Preview do rosto JA UPSCALADO (o que os 23 nos leem)"

    g.grupo("EXTRA · upscale da referencia de rosto",
            [px - 480, py + 230, 420, 300], "#8A4F3D")
    return 2, len(consumidores)


def acrescenta_etapas(w, com_logo=True):
    g = Grafo(w)
    ns = g.ns

    # o dataset inteiro sai daqui e hoje vai direto para o Set_FINAL
    UNPACK, FINAL = 1560, 1940
    for nid in (UNPACK, FINAL):
        if nid not in ns:
            raise SystemExit("no %s nao existe -- o grafo mudou" % nid)
    ponte = [l for l in w["links"] if l[1] == UNPACK and l[3] == FINAL]
    if not ponte:
        raise SystemExit("nao achei o link ImageCollectUnpack -> Set_FINAL")
    ponte = ponte[0]

    # area vazia embaixo de tudo, para o grafo abrir sem nada sobreposto
    y0 = max(n.get("pos", [0, 0])[1] for n in w["nodes"]) + 420
    x0 = 2600

    # ── 1 · UPSCALE ────────────────────────────────────────────────────────
    n_ups_ld = g.no("UpscaleModelLoader", (x0, y0), (330, 60), [UPSCALER],
                    saidas=[_s("UPSCALE_MODEL", "UPSCALE_MODEL")],
                    titulo="1 · upscaler (%s)" % UPSCALER)
    n_ups = g.no("ImageUpscaleWithModel", (x0 + 380, y0), (300, 60), [],
                 entradas=[_e("upscale_model", "UPSCALE_MODEL"),
                           _e("image", "IMAGE")],
                 saidas=[_s("IMAGE", "IMAGE")],
                 titulo="1 · UPSCALE do dataset (2x → 2048)")

    # ── 2 · SPLITTER ───────────────────────────────────────────────────────
    n_det = g.no("UltralyticsDetectorProvider", (x0, y0 + 140), (330, 80),
                 [DETECTOR],
                 saidas=[_s("BBOX_DETECTOR", "BBOX_DETECTOR"),
                         _s("SEGM_DETECTOR", "SEGM_DETECTOR")],
                 titulo="2 · detector de rosto (YOLO)")
    n_spl = g.no("CCC_FaceAreaBatchSplitter", (x0 + 380, y0 + 140), (360, 180),
                 [LIMIAR_AREA, 0.5, "passthrough", "face_yolov8m.pt", 0],
                 entradas=[_e("images", "IMAGE"),
                           _e("bbox_detector", "BBOX_DETECTOR")],
                 saidas=[_s("images_to_detail", "IMAGE"),
                         _s("images_passthrough", "IMAGE"),
                         _s("detail_indices", "STRING"),
                         _s("total_count", "INT"),
                         _s("face_masks", "MASK")],
                 titulo="2 · SPLITTER — rosto < %d%% da area vai detalhar"
                        % int(LIMIAR_AREA * 100))
    n_prev = g.no("PreviewImage", (x0 + 380, y0 + 360), (300, 250), [],
                  entradas=[_e("images", "IMAGE")],
                  titulo="preview (rostos pequenos — o que vai ser detalhado)")

    # ── 3 · FACE DETAILER ──────────────────────────────────────────────────
    n_gm = g.no("GetNode", (x0 + 800, y0 + 140), (220, 34), ["model clean"],
                saidas=[_s("MODEL", "MODEL")], titulo="Get_model clean")
    n_gc = g.no("GetNode", (x0 + 800, y0 + 190), (220, 34), ["clip"],
                saidas=[_s("CLIP", "CLIP")], titulo="Get_clip")
    n_gv = g.no("GetNode", (x0 + 800, y0 + 240), (220, 34), ["vae"],
                saidas=[_s("VAE", "VAE")], titulo="Get_vae")
    for nid in (n_gm, n_gc, n_gv):
        ns[nid]["flags"] = {"collapsed": True}
        ns[nid]["properties"]["aux_id"] = "kijai/ComfyUI-KJNodes"

    n_pos = g.no("CLIPTextEncode", (x0 + 800, y0 + 300), (400, 130),
                 [POS_ROSTO], entradas=[_e("clip", "CLIP")],
                 saidas=[_s("CONDITIONING", "CONDITIONING")],
                 titulo="3 · prompt do ROSTO (positivo)")
    n_neg = g.no("CLIPTextEncode", (x0 + 800, y0 + 460), (400, 130),
                 [NEG_ROSTO], entradas=[_e("clip", "CLIP")],
                 saidas=[_s("CONDITIONING", "CONDITIONING")],
                 titulo="3 · negativo")

    n_fd = g.no("FaceDetailer", (x0 + 1260, y0 + 140), (420, 720), FD_WIDGETS,
                entradas=[_e("image", "IMAGE"), _e("model", "MODEL"),
                          _e("clip", "CLIP"), _e("vae", "VAE"),
                          _e("positive", "CONDITIONING"),
                          _e("negative", "CONDITIONING"),
                          _e("bbox_detector", "BBOX_DETECTOR"),
                          _e("sam_model_opt", "SAM_MODEL"),
                          _e("segm_detector_opt", "SEGM_DETECTOR"),
                          _e("detailer_hook", "DETAILER_HOOK"),
                          _e("scheduler_func_opt", "SCHEDULER_FUNC")],
                saidas=[_s("image", "IMAGE"), _s("cropped_refined", "IMAGE"),
                        _s("cropped_enhanced_alpha", "IMAGE"),
                        _s("mask", "MASK"), _s("detailer_pipe", "DETAILER_PIPE"),
                        _s("cnet_images", "IMAGE")],
                titulo="3 · FACE DETAILER (so nos rostos pequenos)")

    # ── 4 · MERGER ─────────────────────────────────────────────────────────
    n_mrg = g.no("CCC_FaceAreaBatchMerger", (x0 + 1740, y0 + 140), (340, 140),
                 ["", 0],
                 entradas=[_e("images_to_detail", "IMAGE"),
                           _e("images_passthrough", "IMAGE"),
                           _e("detail_indices", "STRING", "detail_indices"),
                           _e("total_count", "INT", "total_count")],
                 saidas=[_s("images", "IMAGE")],
                 titulo="4 · MERGER — volta para a ordem do lote")

    nota = g.no("MarkdownNote", (x0 - 760, y0), (700, 620), [NOTA])
    ns[nota]["color"], ns[nota]["bgcolor"] = "#432", "#653"
    ns[nota]["properties"] = {}

    # ── ligacoes ───────────────────────────────────────────────────────────
    # o Unpack ainda traz o link antigo pendurado na saida: limpa antes, senao
    # fica apontando para um destino que nao e mais dele
    ns[UNPACK]["outputs"][0]["links"] = []
    g.liga(UNPACK, 0, n_ups, 1, "IMAGE")
    g.liga(n_ups_ld, 0, n_ups, 0, "UPSCALE_MODEL")

    g.liga(n_ups, 0, n_spl, 0, "IMAGE")
    g.liga(n_det, 0, n_spl, 1, "BBOX_DETECTOR")

    g.liga(n_spl, 0, n_prev, 0, "IMAGE")
    g.liga(n_spl, 0, n_fd, 0, "IMAGE")
    g.liga(n_gm, 0, n_fd, 1, "MODEL")
    g.liga(n_gc, 0, n_fd, 2, "CLIP")
    g.liga(n_gv, 0, n_fd, 3, "VAE")
    g.liga(n_pos, 0, n_fd, 4, "CONDITIONING")
    g.liga(n_neg, 0, n_fd, 5, "CONDITIONING")
    g.liga(n_det, 0, n_fd, 6, "BBOX_DETECTOR")
    g.liga(n_gc, 0, n_pos, 0, "CLIP")
    g.liga(n_gc, 0, n_neg, 0, "CLIP")

    g.liga(n_fd, 0, n_mrg, 0, "IMAGE")
    g.liga(n_spl, 1, n_mrg, 1, "IMAGE")
    g.liga(n_spl, 2, n_mrg, 2, "STRING")
    g.liga(n_spl, 3, n_mrg, 3, "INT")

    # a ponte antiga vira saida do merger: o Set_FINAL nao sabe que mudou nada
    ponte[1], ponte[2] = n_mrg, 0
    ns[n_mrg]["outputs"][0]["links"] = [ponte[0]]

    g.grupo("EXTRA · UPSCALE + FACE DETAILER  (versao paga, refeita)",
            [x0 - 60, y0 - 90, 2240, 1000], "#8A4F3D")
    melhora_face_ref(g)
    solta_face_da_resolucao(g)
    if com_logo:
        lig, grp = insere_logo(g)
        print("logo: %d pose(s) com image_1 ligado . %d grupo(s) de close"
              % (lig, grp))
    vistas, slots = insere_vistas(g)
    if vistas:
        print("vistas extras: %d arquivo(s) · %d slot(s) ligados" % (vistas, slots))
    else:
        print("vistas extras: nenhuma (ponha ref-45/ref-costas/ref-perfil.png "
              "em ComfyUI/input para ativar)")
    print("%d comparador(es) A/B" % acrescenta_comparadores(g))

    g.fecha()
    return len(g.novos)


def acrescenta_comparadores(g):
    """Poe o no `ImageCompare` (o da regua deslizante) nas tres etapas.

    Sem isto nao da para saber se uma etapa fez alguma coisa -- o que aconteceu
    aqui: o preview mostrava 636x636 e parecia que o upscale nao tinha rodado,
    quando na verdade ele tinha (318 -> 636). O comparador transforma "parece
    igual" em "e igual", que e uma afirmacao que se pode conferir.

    Os nos sao localizados pela ESTRUTURA, nao pelo titulo: titulo qualquer um
    edita no frontend e o script para de achar.
    """
    ns = g.ns
    lk = {l[0]: l for l in g.w["links"]}

    def de_onde(nid, slot=0):
        for e in ns[nid].get("inputs", []):
            if e["name"] in (slot if isinstance(slot, tuple) else (slot,)) \
                    and e.get("link"):
                return lk[e["link"]][1]
        return None

    ups = [n for n in g.w["nodes"] if n["type"] == "ImageUpscaleWithModel"]
    spl = next((n for n in g.w["nodes"]
                if n["type"] == "CCC_FaceAreaBatchSplitter"), None)
    fd = next((n for n in g.w["nodes"] if n["type"] == "FaceDetailer"), None)
    ups_rosto = next((n for n in ups if de_onde(n["id"], "image") == 537), None)
    ups_dados = next((n for n in ups if de_onde(n["id"], "image") == 1560), None)
    if not (spl and fd and ups_rosto and ups_dados):
        raise SystemExit("nao achei as etapas para comparar")

    def comparador(pos, titulo, a_no, a_slot, b_no, b_slot):
        c = g.no("ImageCompare", pos, (460, 480), None,
                 entradas=[_e("image_a", "IMAGE"), _e("image_b", "IMAGE")],
                 saidas=[], titulo=titulo)
        for e in ns[c]["inputs"]:
            e["shape"] = 7
        g.liga(a_no, a_slot, c, 0, "IMAGE")
        g.liga(b_no, b_slot, c, 1, "IMAGE")
        return c

    px, py = ups_rosto["pos"]
    comparador((px - 520, py + 120), "A/B · referencia de rosto (cru → 4x)",
               537, 0, ups_rosto["id"], 0)

    px, py = ups_dados["pos"]
    comparador((px, py + 620), "A/B · dataset (cru → upscale 2x)",
               1560, 0, ups_dados["id"], 0)

    px, py = fd["pos"]
    comparador((px + 480, py + 780), "A/B · rosto (antes → depois do detailer)",
               spl["id"], 0, fd["id"], 0)
    return 3


# -- O MODELO AGNOSTICO ------------------------------------------------------
#
# O mesmo grafo, com as nossas quatro etapas, mas SEM cliente: serve de ponto de
# partida para qualquer personagem, peca ou filme.
#
# O que fica de fora, e por que:
#   os 24 prompts -- o autor os escreveu genericos de proposito ("I just try to
#   keep them like really general so they work with any kind of character"), e
#   eles ja sao o melhor default possivel. Adaptar prompt e trabalho de peca.
#
#   o logo/objeto -- depende de um asset que so existe quando ha cliente. O
#   mecanismo esta em `insere_logo` e se liga com `--logo`, nao no modelo.
#
# O que muda em relacao ao arquivo do autor: a identidade vira marcador, a
# imagem de entrada vira um nome que NAO existe (para falhar alto se alguem
# esquecer de trocar), e o Save Dataset volta para 2 = preview, que e a ordem
# que a aula manda -- conferir antes de gravar.
BASE_IDENTIDADE = {
    2905: ("TR1GGER_W0RD",
           "IDENTIDADE · TRIGGER WORD — EDITE (palavra inventada, com numero)"),
    547: ("photorealistic, natural skin texture, soft cinematic lighting, "
          "shot on a 35mm lens",
          "IDENTIDADE · ESTILO — EDITE (tipo fisico + acabamento fotografico)"),
    549: ("", "IDENTIDADE · ROUPA — opcional (vazio = copia da referencia)"),
}


def vira_modelo(w):
    """Tira o personagem do autor e deixa marcadores no lugar."""
    ns = {n["id"]: n for n in w["nodes"]}
    for nid, (valor, titulo) in BASE_IDENTIDADE.items():
        if nid in ns:
            ns[nid]["widgets_values"][0] = valor
            ns[nid]["title"] = titulo
    if 535 in ns:
        ns[535]["widgets_values"][0] = "COLOQUE-SUA-REFERENCIA.png"
        ns[535]["title"] = ("ENTRADA · corpo inteiro, alta resolucao — "
                            "troque por sua referencia")
    if 2922 in ns:                      # Save Dataset: 1 = grava, 2 = preview
        ns[2922]["widgets_values"][0] = 2
    return len(BASE_IDENTIDADE) + 2


def confere(w):
    """Toda ligacao existe dos dois lados? Erro aqui e erro silencioso no Comfy."""
    ns = {n["id"]: n for n in w["nodes"]}
    porid = {}
    problemas = []
    for l in w["links"]:
        porid[l[0]] = l
        if l[1] not in ns:
            problemas.append("link %s sai de no inexistente %s" % (l[0], l[1]))
        if l[3] not in ns:
            problemas.append("link %s entra em no inexistente %s" % (l[0], l[3]))
    for n in w["nodes"]:
        for i, ent in enumerate(n.get("inputs", [])):
            lid = ent.get("link")
            if lid is None:
                continue
            l = porid.get(lid)
            if not l:
                problemas.append("no %s entrada '%s' aponta para link %s que nao "
                                 "existe" % (n["id"], ent["name"], lid))
            elif l[3] != n["id"] or l[4] != i:
                problemas.append("no %s entrada '%s': link %s diz que vai para "
                                 "%s slot %s" % (n["id"], ent["name"], lid,
                                                 l[3], l[4]))
        for j, sai in enumerate(n.get("outputs", [])):
            for lid in (sai.get("links") or []):
                l = porid.get(lid)
                if not l:
                    problemas.append("no %s saida '%s' lista link %s inexistente"
                                     % (n["id"], sai["name"], lid))
                elif l[1] != n["id"] or l[2] != j:
                    problemas.append("no %s saida '%s': link %s diz que sai de "
                                     "%s slot %s" % (n["id"], sai["name"], lid,
                                                     l[1], l[2]))
    return problemas


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--saida", default="CCC_4-01_BRUNO.json")
    ap.add_argument("--sem-etapas", action="store_true",
                    help="so troca os prompts, nao acrescenta upscale/detailer")
    ap.add_argument("--modelo", action="store_true",
                    help="grava o MODELO agnostico: as etapas novas, sem "
                         "personagem, prompts de cena nem logo")
    a = ap.parse_args()

    w = carrega()
    if a.modelo:
        print("%d campo(s) de identidade viraram marcador" % vira_modelo(w))
        novos = acrescenta_etapas(w, com_logo=False)
        print("%d no(s) novo(s): upscale + face detailer + comparadores"
              % novos)
        if a.saida == "CCC_4-01_BRUNO.json":
            a.saida = "CCC-4.01-AIOX-BASE.json"
    else:
        n = troca_textos(w)
        print("%d campo(s) de texto trocado(s)" % n)
        e = sum(1 for t, _, _ in PROMPTS.values() if t == "E")
        print("   %d prompts estruturais (neutros) · %d de cena"
              % (e, len(PROMPTS) - e))
        if not a.sem_etapas:
            novos = acrescenta_etapas(w)
            print("%d no(s) novo(s): upscale %s + face detailer (limiar %.2f)"
                  % (novos, UPSCALER, LIMIAR_AREA))

    ruins = confere(w)
    if ruins:
        print("\nGRAFO INCONSISTENTE — nao gravei:")
        for p in ruins[:20]:
            print("   " + p)
        return 1
    print("grafo conferido · %d nos · %d links · 0 ligacao orfa"
          % (len(w["nodes"]), len(w["links"])))

    destino = os.path.join(WF, a.saida)
    io.open(destino, "w", encoding="utf-8").write(
        json.dumps(w, ensure_ascii=False, indent=2))
    print("→ %s (%.1f MB)" % (destino, os.path.getsize(destino) / 1e6))
    return 0


if __name__ == "__main__":
    sys.exit(main())
