# -*- coding: utf-8 -*-
"""Poe o ambiente 360 DENTRO do Movie Builder, do jeito que o autor faz.

O QUE MUDA EM RELACAO AO QUE EU TINHA FEITO
  Eu havia construido o 360 como workflow separado, usando os nos
  `Mickmumpitz/Panorama` -- warp perspectiva->equirretangular, mascara dos
  polos, Poisson. Vendo os prints da aula, o metodo dele e OUTRO, e mais
  simples:

      placa 2:1  ->  ImagePadForOutpaint (200 px de cada lado)
                 ->  KSampler com a LoRA 360, 4 passos, cfg 1.0
                 ->  panorama

  Sem projecao, sem carta de grade, sem tres passadas. Ele simplesmente
  ESTICA uma imagem que ja e 2:1 e diz ao modelo, em texto, que o resultado
  tem de ser um equirretangular costurado. A LoRA faz o resto.

  Isso funciona porque a placa ja nasce 2:1. No meu desenho a placa era uma
  foto normal de 70 graus, e sobravam 92,8% da esfera para inventar. Aqui
  sobram os 200 px das bordas. Muito menos risco de deriva.

POR QUE DENTRO DO JSON PRINCIPAL
  Porque a finalidade do 360 e ser REFERENCIA DE PLANO. Em arquivo separado,
  o recorte teria de ser exportado e reimportado a cada plano -- e o ponto da
  coisa e manter o MESMO lugar entre tomadas. Dentro do grafo, o panorama vira
  um `SetNode` e cada plano puxa o pedaco que fica atras da sua camera.

  O autor ja deixou meio caminho: a `flux-2-klein-9B-360-erp-outpaint-lora`
  esta carregada e guardada em `SetNode flux_model_360`. O que faltava era o
  grupo que consome. Era essa a parte paga.

ONDE O RECORTE ENTRA
  O `IMAGE GEN` de cada plano tem QUATRO entradas de referencia --
  `pixels_1..4`. A 1 e o rosto; a 2, 3 e 4 estao livres. O recorte do ambiente
  vai na `pixels_2`.

A EMENDA
  Ele usa um `TextEncodeQwenImageEditPlus` (Qwen Image Edit) para apagar a
  emenda central. Nao temos esse modelo. Aqui a emenda e tratada com
  `MickmumpitzPanoSeamRoll`, que rola meia largura para trazer a juncao ao
  centro, repinta com o MESMO Klein e desenrola. E geometrico em vez de
  pedir por texto -- e nao exige baixar outro modelo de 20 GB.

USO
    python insere_360_no_movie.py
    python insere_360_no_movie.py --sem-emenda      # so o outpaint
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

# A GEOMETRIA, que era o erro.
#
# O alvo e uma FAIXA EQUATORIAL de equirretangular: 4096x1024 cobre os 360
# horizontais por ~90 verticais, que e o suficiente para camera no nivel do
# horizonte. Isso NAO e 2:1 -- e 4:1 de proposito.
#
# O que estava errado: a placa nascia em PERSPECTIVA (2048x1024, ponto de fuga,
# lente normal) e depois era esticada para ocupar metade dos 4096. Ou seja, o
# grafo declarava que uma foto de ~80 graus de campo cobria 180 graus, e pedia
# a LoRA para inventar os outros 180 numa passada so. Geometria incoerente na
# entrada: nenhum modelo conserta isso depois.
#
# O que vale agora: a placa nasce JA em projecao esferica, na MESMA proporcao
# 4:1 do alvo, usando a propria LoRA ERP. A resolucao baixa (2048x512, 1 MP) e
# onde o modelo compoe bem; a nitidez vem do refino, que so redesenha textura
# sem reinventar a geometria.
LARG_ERP, ALT_ERP = 4096, 1024   # o alvo: 360 graus x ~90, faixa equatorial
LARG, ALT = 2048, 512            # a placa: mesma proporcao, metade da escala
PAD = 1024                       # so na rota antiga (--outpaint)
PASSOS, CFG = 4, 1.0             # medidos no print da aula
# O QUE SE APAGA DE UMA FOTO DE LUGAR
#
# Uma foto real do lugar do cliente quase nunca serve como esta: tem gente, e
# gente num panorama de fundo e ruim por dois motivos. Primeiro porque o
# panorama e recortado em seis direcoes e a mesma pessoa reapareceria em
# planos diferentes, congelada na mesma pose. Segundo porque o IMAGE GEN vai
# colocar o protagonista por cima -- e aí sao duas pessoas disputando a cena.
#
# O `CLIPSeg Masking` segmenta por TEXTO, entao a lista abaixo e literalmente
# o que sera apagado. Carro e moto entram porque datam a imagem e porque um
# carro cortado pela emenda vira sucata impossivel.
APAGAR = "person, people, man, woman, child, face, car, motorcycle"
CRESCE_MASCARA = 12       # px: sombra e contorno ficam FORA da mascara crua
DENOISE_LIMPEZA = 1.0     # apagar e repintar do zero, nao suavizar
LARG_CORTE = 576                 # 576x1024 = 9:16, a proporcao dos planos
PASSOS_REFINO = 8                # denoise parcial precisa de mais passos
DENOISE_REFINO = 0.40            # textura sim, geometria nao

# A placa pode NASCER de texto, e essa e a lacuna que faltava: sem isto, todo
# ambiente novo exigia arrumar uma foto 2:1 do lugar por fora do grafo. Com o
# prompt aqui dentro, a cadeia inteira -- texto -> placa -> panorama -> recorte
# -> plano -- vive num arquivo so.
#
# Convencao do switch, copiada da dele: TRUE = usa a foto carregada,
# FALSE = usa a gerada. O padrao e FALSE, porque gerar e o caminho comum.
# A ULTIMA LINHA e o que faz diferenca, e foi copiada do prompt dele: a placa
# ja e pedida como EQUIRRETANGULAR, nao como foto normal. Assim o outpaint
# apenas ESTENDE uma projecao que ja esta certa, em vez de ter de converter
# perspectiva em esfera no meio do caminho.
# O SET E A COMUNIDADE INTEIRA, NAO UM BECO
#
# Um panorama nao e um fundo: e um LUGAR. Se ele contem a vila toda, cada plano
# da peca vira uma camera apontada para um setor -- e dois planos que olham para
# o mesmo setor mostram o mesmo canto, com o mesmo muro e o mesmo varal. E isso
# que faz a peca parecer rodada num lugar so, em vez de em seis lugares
# parecidos.
#
# Esta lista governa DUAS coisas ao mesmo tempo: o texto que descreve cada
# direcao para o modelo, e o x do recorte que serve cada plano. Mante-las
# juntas e o que impede o defeito classico -- prometer no prompt um campinho
# que o recorte nunca encontra, porque ninguem recalculou o angulo depois de
# mexer no texto.
#
#   (chave, angulo, rotulo em portugues, o que existe nessa direcao em ingles)
#
# Os angulos sao o rumo da camera, 0 a 360, e cobrem a volta inteira.
# O quinto campo -- `fundo` -- e o MESMO lugar dito de outro jeito: nao mais
# como uma direcao dentro do panorama, mas como o que aparece ATRAS de uma
# pessoa num plano fechado. E dele que o prompt de cada take e montado.
#
# Ter os dois textos lado a lado e o que impede o descasamento que existia: o
# panorama prometia bandeirinhas e cadeiras na RUA, e o prompt do plano falava
# de "uma rua estreita com casas de tijolo". O modelo recebia a referencia de
# um lugar e a descricao de outro -- e nesse empate quem costuma ganhar e o
# texto, que e mais especifico. A referencia virava enfeite.
# OS ANGULOS COMECAM EM 30, NAO EM 0 -- e isso tem motivo.
#
# Num equirretangular, 0 grau E a emenda: o ponto onde a borda direita encosta
# na esquerda. Com ENTRADA em 0, o recorte daquele setor caia exatamente em
# cima da costura, e era ali que apareciam a cadeira deformada e a esquina da
# lojinha sumindo. Nao era defeito do setor -- era o recorte pedindo justamente
# o pedaco que o modelo teve de inventar duas vezes.
#
# Deslocando tudo 30 graus, o setor mais proximo da emenda fica a 30, e o
# recorte cobre ~51 graus (25,5 para cada lado). Sobram ~4,5 graus de folga
# antes da costura. A emenda continua existindo -- ela e inerente a projecao --
# mas nenhum plano da peca aponta a camera para ela.
SETORES = [
    ("VIELA",      30,  "viela de cimento",
     "a narrow concrete alley between tall bare brick walls, thick tangled "
     "power cables crossing low overhead, a few concrete steps, graffiti tags "
     "on the wall",
     "the narrow concrete alley, bare brick walls close on both sides, tangled "
     "power cables low overhead"),
    ("ESCADARIA",  90,  "escadaria da comunidade",
     "a long concrete staircase climbing between stacked brick houses, a "
     "painted metal handrail, plants in paint cans on the steps, blue plastic "
     "water tanks on the roofs above",
     "the long concrete staircase climbing between the houses behind him, a "
     "painted metal handrail, blue water tanks on the roofs"),
    ("LAJES",      150, "as lajes e a vista",
     "stacked unfinished brick houses piled on top of each other, exposed "
     "rebar, blue water tanks, laundry on the rooftops, and far in the "
     "distance the sao paulo skyline of grey towers under haze",
     "the stacked brick houses and rooftop water tanks behind him, with the "
     "distant sao paulo skyline hazy on the horizon"),
    ("QUADRA",     210, "quadra de cimento",
     "a small concrete sports court with faded painted lines, metal goals, a "
     "tall wire fence around it, brick houses rising right behind the fence",
     "the small concrete court with its metal goal and tall wire fence, brick "
     "houses rising behind"),
    ("BECO",       270, "beco dos varais",
     "a tight alley with clothes lines strung across between windows, iron "
     "gates, bicycles and a motorbike parked against the wall, satellite "
     "dishes bolted to the bricks",
     "the tight alley with clothes lines strung overhead, iron gates and a "
     "motorbike parked against the wall"),
    ("MERCADINHO", 330, "mercadinho da esquina",
     "a small corner shop with a metal security grille, a hand painted sign, "
     "crates of fruit and crates of drinks stacked outside, plastic stools on "
     "the pavement",
     "the small corner shop with its metal grille and hand painted sign, "
     "crates stacked outside"),
]


# a mesma linha de estilo que o adapta_movie_builder usa -- e ela a ancora
# visual que faz planos diferentes parecerem o mesmo filme
ESTILO = ("Style: warm brazilian documentary realism, golden hour, muted "
          "warm palette, subtle film grain")


def prompt_do_plano(chave):
    """O prompt do take, com o lugar vindo do MESMO setor que alimenta a
    referencia de ambiente.

    Tres decisoes aqui valem explicacao:

    1. O fundo e nomeado, nao generico. Um prompt que diz so "uma rua" deixa o
       modelo inventar a rua dele, e a referencia de ambiente vira decoracao.
       Nomeando o arco, as bandeirinhas ou a escadaria, o texto CONCORDA com a
       imagem e os dois empurram para o mesmo lado.

    2. O fundo fica desfocado, mas RECONHECIVEL. O prompt antigo pedia
       "blurred", e borrao nao tem lugar: dois planos com o fundo apagado
       poderiam ter sido rodados em cidades diferentes. A continuidade entre
       tomadas -- que e a razao de existir do panorama -- mora justamente no
       que ainda da para reconhecer atras da pessoa.

    3. A camiseta e descrita com o que sobrevive. A coroa dourada aguenta a
       geracao; o texto do wordmark quase nunca aguenta, em nenhum modelo. Pedir
       o que nao se sustenta so gera rabisco no peito.
    """
    d = {s[0]: s for s in SETORES}
    if chave not in d:
        raise SystemExit("setor %s nao existe; use um de: %s"
                         % (chave, ", ".join(s[0] for s in SETORES)))
    fundo = d[chave][4]
    return (
        "Medium close-up, vertical framing. The man from the reference images "
        "stands in a brazilian community in the late afternoon, looking "
        "straight into the camera with a calm, warm expression. Behind him, "
        + fundo + ", softly out of focus but still clearly recognizable. "
        "He wears the same white t-shirt as in the reference, with a golden "
        "crown printed on the chest. The last golden sunlight rakes across one "
        "side of his face while the shaded side stays cool - two colliding "
        "color temperatures on his skin. Shot on a 50mm lens, tight medium "
        "framing, eye level. " + ESTILO + ". Mood: sincere, hopeful.")


def _volta():
    """Descreve a volta inteira a partir dos SETORES, na ordem dos angulos."""
    partes = []
    for i, (_, ang, _, oque, _fundo) in enumerate(SETORES):
        abre = "Straight ahead at 0 degrees" if i == 0 else "At %d degrees" % ang
        partes.append("%s, %s." % (abre, oque))
    return " ".join(partes)


# "favela" sozinho puxa o imaginario de comunidade rural: casas baixas, chao
# de terra, morro verde ao fundo. Foi o que saiu no primeiro panorama. O que a
# peca pede e favela de SAO PAULO -- densa, vertical, de cimento e tijolo
# aparente, com caixa d'agua azul, emaranhado de fios e a cidade ao longe. Sao
# esses substantivos que mudam o lugar, nao o adjetivo.
PROMPT_PLACA = (
    "A 360 degree view from the middle of a dense urban favela in Sao Paulo, "
    "Brazil, at golden hour. Bare brick houses stacked steeply on top of each "
    "other, concrete alleys, blue plastic water tanks on the roofs, thick "
    "tangled power cables overhead, concrete underfoot - no dirt roads, no "
    "open countryside. " + _volta() +
    " Warm late afternoon sunlight raking low between the buildings, long "
    "shadows on concrete. Completely empty of people. Camera at eye height, "
    "level horizon. "
    "Style: documentary photography, natural colors, 35mm film grain. "
    "Mood: warm, hopeful, end of the day. "
    "Seamless equirectangular 360 degree spherical panorama, ERP projection, "
    "level horizon across the middle, straight lines curving near the edges.")
NEG_PLACA = ("people, person, crowd, cars, text, watermark, logo, tilted "
             "horizon, fisheye, distorted, blurry")

PROMPT_360 = (
    "Fill the grey areas according to the image. Outpaint as a seamless 360 "
    "equirectangular panorama (2:1). Keep the horizon level. Match left and "
    "right edges so they wrap without a seam. Same place, same light, same "
    "time of day as the source image.")
PROMPT_EMENDA = (
    "Remove the visible vertical seam in the middle of the image. Keep the "
    "rest of the image exactly the same. Seamless equirectangular panorama.")
NEGATIVO = "people, person, text, watermark, logo, black bars, blurry, distorted"

# A placa e uma imagem 2:1 DO LUGAR -- e dela que o panorama nasce. O autor
# carrega uma foto (no exemplo dele, stone_cottage.png 2048x1024); aqui o
# padrao e um recorte 2:1 de uma cena aprovada do CCC, so para a cadeia rodar.
#
# O QUE FAZ UMA PLACA BOA, e a nossa nao e:
#   SEM PESSOAS.  O outpaint repete o que ve ao dar a volta na esfera -- gente
#   na placa vira gente clonada nos 360 graus. Placa ideal e a rua vazia.
#   HORIZONTE RETO. O modelo mantem a linha que voce der; torta na placa,
#   torta no panorama inteiro.
#   LUZ DEFINIDA. E a luz que vai valer em todos os planos daquele lugar.
PLACA = "placa-rua.png"   # so usado se voce passar --foto


def _e(nome, tipo, widget=None, opcional=False):
    d = {"name": nome, "type": tipo, "link": None}
    if widget:
        d["widget"] = {"name": widget}
    if opcional:
        d["shape"] = 7
    return d


def _s(nome, tipo):
    return {"name": nome, "type": tipo, "links": []}


class G(object):
    def __init__(self, w):
        self.w = w
        self.ns = {n["id"]: n for n in w["nodes"]}
        self.ni = int(w.get("last_node_id", 0))
        self.li = int(w.get("last_link_id", 0))
        self.novos = []

    def no(self, tipo, pos, size, wv=None, ent=(), sai=(), titulo=None):
        self.ni += 1
        n = {"id": self.ni, "type": tipo, "pos": list(pos), "size": list(size),
             "flags": {}, "order": 0, "mode": 0,
             "inputs": [dict(x) for x in ent], "outputs": [dict(x) for x in sai],
             "properties": {"Node name for S&R": tipo}}
        if wv is not None:
            n["widgets_values"] = wv
        if titulo:
            n["title"] = titulo
        self.w["nodes"].append(n)
        self.ns[self.ni] = n
        self.novos.append(self.ni)
        return self.ni

    def get(self, nome, tipo, pos, titulo=None):
        g = self.no("GetNode", pos, (230, 34), [nome],
                    sai=[_s(tipo, tipo)], titulo=titulo or ("Get_" + nome))
        self.ns[g]["flags"] = {"collapsed": True}
        self.ns[g]["properties"]["aux_id"] = "kijai/ComfyUI-KJNodes"
        return g

    def setn(self, nome, tipo, pos):
        s = self.no("SetNode", pos, (230, 58), [nome],
                    ent=[_e(tipo, tipo)], sai=[_s(tipo, tipo)],
                    titulo="Set_" + nome)
        self.ns[s]["properties"]["aux_id"] = "kijai/ComfyUI-KJNodes"
        self.ns[s]["properties"]["previousName"] = nome
        return s

    def liga(self, o, so, d, sd, tipo):
        self.li += 1
        self.w["links"].append([self.li, o, so, d, sd, tipo])
        s = self.ns[o]["outputs"][so]
        s["links"] = list(s.get("links") or []) + [self.li]
        self.ns[d]["inputs"][sd]["link"] = self.li
        return self.li

    def grupo(self, titulo, caixa, cor="#3f789e"):
        ids = [x.get("id", 0) for x in self.w.get("groups", [])]
        self.w["groups"].append({"id": (max(ids) if ids else 0) + 1,
                                 "title": titulo, "bounding": list(caixa),
                                 "color": cor, "flags": {}})

    def fecha(self):
        self.w["last_node_id"] = self.ni
        self.w["last_link_id"] = self.li


def entrada(ns, nid, nome):
    for i, e in enumerate(ns[nid]["inputs"]):
        if e["name"] == nome:
            return i
    raise SystemExit("no %s nao tem entrada %r" % (nid, nome))


def titula(w):
    """Faz o titulo de cada Get/Set dizer o nome que ele realmente usa.

    O titulo de um `GetNode` e escrito uma vez, quando o no nasce, e depois
    congela. Trocar o widget -- que e o que de fato decide de onde o valor vem
    -- nao mexe nele. O resultado e um grafo que MENTE: seis copias exibindo
    `Get_AMB_RUA` enquanto apontam para seis setores diferentes.
    Funcionava e era ilegivel, o que na pratica e um defeito: ninguem confere
    um grafo lendo JSON.
    """
    n = 0
    for no in w["nodes"]:
        if no["type"] not in ("GetNode", "SetNode"):
            continue
        v = (no.get("widgets_values") or [None])[0]
        if not isinstance(v, str):
            continue
        certo = ("Get_" if no["type"] == "GetNode" else "Set_") + v
        if no.get("title") != certo:
            no["title"] = certo
            n += 1
    if n:
        print("   %d titulo(s) de Get/Set corrigido(s)" % n)
    return n


def main():
    # a declaracao vem antes de tudo: `SETORES` e usado no default do
    # argparse, e o Python recusa `global` depois do primeiro uso
    global SETORES, PROMPT_PLACA, ESTILO
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default="MOVIE-BUILDER-IMPERIO.json")
    ap.add_argument("--sem-emenda", action="store_true")
    ap.add_argument("--saida", default=None)
    ap.add_argument("--projeto", default=None,
                    help="nome do YAML em projetos/ -- manda nos setores")
    ap.add_argument("--upscale-ambiente", dest="upscale_ambiente",
                    default="4x-UltraSharp.pth",
                    help="modelo ESRGAN para dar nitidez aos recortes de "
                         "ambiente; vazio desliga")
    ap.add_argument("--modo", default="texto", choices=["texto", "foto"],
                    help="de onde vem o ambiente: do prompt (texto) ou de "
                         "uma foto do lugar (foto). Panorama ja pronto e "
                         "com o congela_360.py")
    ap.add_argument("--foto", default=None, metavar="ARQUIVO",
                    help="usa uma foto de input/ como placa em vez de gerar "
                         "por texto -- tem de ser equirretangular de verdade")
    # o default nao pode ser um nome solto: quando os SETORES mudam de nome --
    # e mudaram, ao trocar a comunidade do interior pela de Sao Paulo -- um
    # default fixo aponta para um setor que nao existe mais e o script para.
    # Amarrar ao primeiro da lista faz o default acompanhar a lista sozinho.
    ap.add_argument("--setor-shot01", default=SETORES[0][0],
                    help="qual setor da comunidade serve de fundo ao SHOT 01")
    ap.add_argument("--outpaint", action="store_true",
                    help="rota antiga: estica as bordas e manda a LoRA inventar "
                         "o resto (era o desenho que nao fechava a esfera)")
    a = ap.parse_args()

    # o projeto substitui SETORES, o contexto do panorama e o estilo
    if getattr(a, "projeto", None):
        from projeto import carrega
        pr = carrega(a.projeto)
        SETORES = pr.setores
        a.upscale_ambiente = pr.upscale_ambiente
        ESTILO = pr.estilo
        PROMPT_PLACA = (pr.contexto + " " + _volta() +
                        " Warm late afternoon sunlight raking low between the "
                        "buildings, long shadows. Completely empty of people. "
                        "Camera at eye height, level horizon. " + pr.estilo +
                        ". Seamless equirectangular 360 degree spherical "
                        "panorama, ERP projection, level horizon across the "
                        "middle, straight lines curving near the edges.")
        if not a.setor_shot01 or a.setor_shot01 not in [s[0] for s in SETORES]:
            a.setor_shot01 = SETORES[0][0]

    caminho = os.path.join(WF, a.arquivo)
    w = json.load(io.open(caminho, encoding="utf-8"))
    g = G(w)
    ns = g.ns

    # o modelo com a LoRA 360 ja existe no grafo, guardado pelo autor
    if not any(n["type"] == "SetNode" and (n.get("widgets_values") or [""])[0]
               == "flux_model_360" for n in w["nodes"]):
        raise SystemExit("nao achei o Set_flux_model_360 -- o grafo mudou")

    # area livre abaixo de tudo
    Y = max(n.get("pos", [0, 0])[1] for n in w["nodes"]) + 500
    X = 840

    # ── 0 · DE ONDE VEM O AMBIENTE ─────────────────────────────────────────
    #
    # Tres rotas, e a escolha e do projeto, nao do grafo:
    #
    #   texto  o lugar nasce do prompt. Serve quando nao existe lugar real --
    #          uma comunidade generica, um set inventado.
    #   foto   o lugar vem de uma FOTO do cliente. Serve quando existe lugar
    #          real e a peca precisa ser naquele lugar. A foto e limpa (gente,
    #          carro), normalizada e esticada para equirretangular.
    #   pronto um panorama ERP ja aprovado entra intocado. E o `congela_360.py`,
    #          que age sobre o JSON depois -- fica fora daqui de proposito,
    #          porque congelar e uma decisao posterior a gerar.
    #
    # As tres terminam no mesmo lugar: um `SetNode AMBIENTE_360`. Daqui para
    # a frente o grafo nao sabe -- nem precisa saber -- qual rota produziu a
    # imagem. E isso que deixa este JSON servir de modelo base.
    # OS DOIS BLOCOS EXISTEM SEMPRE
    #
    # Antes o `--modo` decidia qual bloco seria CONSTRUIDO, e o outro nem
    # chegava ao arquivo. Isso torna o JSON um resultado, nao um modelo: para
    # trocar de rota era preciso ter o script, o Python e a linha de comando --
    # e quem abre o grafo depois nao ve que existia outra opcao.
    #
    # Agora os dois nascem juntos e o modo so decide qual alimenta o resize. O
    # outro fica em bypass, visivel, com o `LoadImage` esperando uma foto. Quem
    # abrir o grafo ve as duas rotas e entende a escolha sem ler documentacao.
    #
    # Bypass em vez de switch por um motivo medido: `easy imageSwitch` e
    # sincrono e executaria os DOIS ramos a cada rodada -- inclusive um sampler
    # inteiro de limpeza que ninguem pediu.
    foto_arquivo = a.foto or PLACA
    if True:
        gvp = g.get("flux_vae", "VAE", (X, Y - 100))
        gmp = g.get("flux_model", "MODEL", (X, Y - 200),
                    "Get_flux_model (Klein puro)")
        gcp = g.get("flux_clip", "CLIP", (X, Y - 150))

        ld0 = g.no("LoadImage", (X, Y), (420, 460),
                   [foto_arquivo, "image"],
                   sai=[_s("IMAGE", "IMAGE"), _s("MASK", "MASK")],
                   titulo="0 · FOTO DO LUGAR — troque aqui e ative o grupo")
        seg = g.no("CLIPSeg Masking", (X + 460, Y), (360, 106), [APAGAR],
                   ent=[_e("image", "IMAGE")],
                   sai=[_s("MASK", "MASK"), _s("IMAGE", "MASK_IMAGE")],
                   titulo="0 · acha o que apagar: %s" % APAGAR[:34])
        g.liga(ld0, 0, seg, 0, "IMAGE")
        cre = g.no("GrowMask", (X + 460, Y + 140), (300, 82),
                   [CRESCE_MASCARA, True], ent=[_e("mask", "MASK")],
                   sai=[_s("MASK", "MASK")],
                   titulo="0 · cresce %d px (pega sombra e contorno)"
                          % CRESCE_MASCARA)
        g.liga(seg, 0, cre, 0, "MASK")
        pvm = g.no("PreviewImage", (X + 460, Y + 250), (330, 220), [],
                   ent=[_e("images", "IMAGE")],
                   titulo="0 · confira a mascara antes de confiar nela")
        g.liga(seg, 1, pvm, 0, "IMAGE")

        pl = g.no("CLIPTextEncode", (X + 860, Y), (420, 110),
                  ["empty street, ground, wall, sky, no people, no cars"],
                  ent=[_e("clip", "CLIP")],
                  sai=[_s("CONDITIONING", "CONDITIONING")],
                  titulo="0 · o que entra no lugar do que saiu")
        nl = g.no("CLIPTextEncode", (X + 860, Y + 140), (420, 100),
                  ["person, people, car, text, watermark, blurry, distorted"],
                  ent=[_e("clip", "CLIP")],
                  sai=[_s("CONDITIONING", "CONDITIONING")], titulo="negativo")
        g.liga(gcp, 0, pl, 0, "CLIP")
        g.liga(gcp, 0, nl, 0, "CLIP")

        enc0 = g.no("VAEEncode", (X + 860, Y + 270), (210, 46), [],
                    ent=[_e("pixels", "IMAGE"), _e("vae", "VAE")],
                    sai=[_s("LATENT", "LATENT")])
        g.liga(ld0, 0, enc0, 0, "IMAGE")
        g.liga(gvp, 0, enc0, 1, "VAE")
        msk0 = g.no("SetLatentNoiseMask", (X + 860, Y + 340), (260, 46), [],
                    ent=[_e("samples", "LATENT"), _e("mask", "MASK")],
                    sai=[_s("LATENT", "LATENT")])
        g.liga(enc0, 0, msk0, 0, "LATENT")
        g.liga(cre, 0, msk0, 1, "MASK")
        ks0 = g.no("KSampler", (X + 860, Y + 410), (320, 262),
                   [77002, "fixed", PASSOS_REFINO, CFG, "euler", "simple",
                    DENOISE_LIMPEZA],
                   ent=[_e("model", "MODEL"), _e("positive", "CONDITIONING"),
                        _e("negative", "CONDITIONING"),
                        _e("latent_image", "LATENT")],
                   sai=[_s("LATENT", "LATENT")],
                   titulo="0 · apaga e repinta o que estava por baixo")
        g.liga(gmp, 0, ks0, 0, "MODEL")
        g.liga(pl, 0, ks0, 1, "CONDITIONING")
        g.liga(nl, 0, ks0, 2, "CONDITIONING")
        g.liga(msk0, 0, ks0, 3, "LATENT")
        dcp = g.no("VAEDecode", (X + 860, Y + 700), (210, 46), [],
                   ent=[_e("samples", "LATENT"), _e("vae", "VAE")],
                   sai=[_s("IMAGE", "IMAGE")], titulo="0 · a cena limpa")
        g.liga(ks0, 0, dcp, 0, "LATENT")
        g.liga(gvp, 0, dcp, 1, "VAE")
        pvl = g.no("PreviewImage", (X + 1120, Y + 700), (330, 220), [],
                   ent=[_e("images", "IMAGE")], titulo="0 · cena limpa")
        g.liga(dcp, 0, pvl, 0, "IMAGE")
        g.grupo("Generate Set · DA FOTO", [X - 60, Y - 260, 1560, 1240], "#353")
        dcp_foto = dcp
    # ── a rota de TEXTO, que tambem existe sempre ──────────────────────────
    if True:
        # ── 0 · a placa NASCE de texto ─────────────────────────────────────────
        # AQUI estava a raiz: era `flux_model`, o Klein PURO. O prompt pedia
        # equirretangular e o modelo base nao sabe o que e isso -- devolvia foto de
        # beco com ponto de fuga. Quem sabe e a `flux-2-klein-9B-360-erp-outpaint`,
        # que ja esta carregada em `flux_model_360`.
        gmp = g.get("flux_model_360", "MODEL", (X, Y - 200),
                    "Get_flux_model_360 (LoRA ERP)")
        gcp = g.get("flux_clip", "CLIP", (X, Y - 150))
        gvp = g.get("flux_vae", "VAE", (X, Y - 100))
        gst = g.get("steps", "INT", (X + 240, Y - 200))
        gcf = g.get("cfg", "FLOAT", (X + 240, Y - 150))

        pp = g.no("PrimitiveStringMultiline", (X, Y - 40), (420, 220),
                  [PROMPT_PLACA, True], sai=[_s("STRING", "STRING")],
                  titulo="0 · PROMPT DO LUGAR — escreva o cenario aqui")
        pe = g.no("CLIPTextEncode", (X, Y + 200), (420, 90), [""],
                  ent=[_e("clip", "CLIP"), _e("text", "STRING", "text")],
                  sai=[_s("CONDITIONING", "CONDITIONING")],
                  titulo="0 · positivo da placa")
        ne = g.no("CLIPTextEncode", (X, Y + 310), (420, 100), [NEG_PLACA],
                  ent=[_e("clip", "CLIP")],
                  sai=[_s("CONDITIONING", "CONDITIONING")],
                  titulo="0 · negativo da placa")
        lat = g.no("EmptyFlux2LatentImage", (X, Y + 430), (300, 106),
                   [LARG, ALT, 1], sai=[_s("LATENT", "LATENT")],
                   titulo="0 · tela %dx%d (4:1, proporcao do alvo)" % (LARG, ALT))
        ksp = g.no("KSampler", (X, Y + 560), (320, 262),
                   [77001, "fixed", PASSOS, CFG, "euler", "simple", 1.0],
                   ent=[_e("model", "MODEL"), _e("positive", "CONDITIONING"),
                        _e("negative", "CONDITIONING"), _e("latent_image", "LATENT"),
                        _e("steps", "INT", "steps"), _e("cfg", "FLOAT", "cfg")],
                   sai=[_s("LATENT", "LATENT")], titulo="0 · gera a placa")
        dcp = g.no("VAEDecode", (X, Y + 850), (210, 46), [],
                   ent=[_e("samples", "LATENT"), _e("vae", "VAE")],
                   sai=[_s("IMAGE", "IMAGE")])
        g.liga(gcp, 0, pe, 0, "CLIP")
        g.liga(pp, 0, pe, 1, "STRING")
        g.liga(gcp, 0, ne, 0, "CLIP")
        g.liga(gmp, 0, ksp, 0, "MODEL")
        g.liga(pe, 0, ksp, 1, "CONDITIONING")
        g.liga(ne, 0, ksp, 2, "CONDITIONING")
        g.liga(lat, 0, ksp, 3, "LATENT")
        g.liga(gst, 0, ksp, 4, "INT")
        g.liga(gcf, 0, ksp, 5, "FLOAT")
        g.liga(ksp, 0, dcp, 0, "LATENT")
        g.liga(gvp, 0, dcp, 1, "VAE")

        pvp = g.no("PreviewImage", (X + 260, Y + 850), (330, 200), [],
                   ent=[_e("images", "IMAGE")], titulo="0 · a placa gerada")
        g.liga(dcp, 0, pvp, 0, "IMAGE")
        dcp_texto = dcp
    # ── 1 · a foto e EXCECAO, nao regra ────────────────────────────────────
    #
    # Antes havia SEMPRE um `LoadImage` + switch aqui, e estava errado por dois
    # motivos.
    #
    # O primeiro e pratico: o `easy imageSwitch` e sincrono -- as DUAS entradas
    # sao obrigatorias. Nao da para rodar so com uma nem para desconectar a que
    # nao se quer. Quem so quer gerar fica preso a arrumar uma foto.
    #
    # O segundo e de conteudo, e foi o que quebrou de verdade: a foto ali era
    # uma foto de campanha, com gente, em perspectiva -- nao um
    # equirretangular. Entrar por esse caminho estica pessoas pelo panorama
    # inteiro, e o proprio negativo do 360 pede "no people". Foto so serve
    # aqui quando JA E um ERP, o que e raro.
    #
    # Agora o padrao e um fio so: gerou, segue. `--foto ARQUIVO` traz o switch
    # de volta para quem tiver uma placa ERP pronta.
    # o modo escolhe a FONTE; o bloco perdedor fica no grafo, em bypass
    origem = dcp_foto if a.modo == "foto" else dcp_texto
    slot_origem = 0
    if a.foto:
        ld = g.no("LoadImage", (X + 620, Y + 430), (380, 400), [a.foto, "image"],
                  sai=[_s("IMAGE", "IMAGE"), _s("MASK", "MASK")],
                  titulo="1 · foto ERP do lugar (--foto)")
        sw = g.no("easy imageSwitch", (X + 620, Y + 860), (360, 106), [True],
                  ent=[_e("image_a", "IMAGE"), _e("image_b", "IMAGE")],
                  sai=[_s("IMAGE", "IMAGE")],
                  titulo="1 · TRUE = a FOTO · FALSE = a GERADA")
        g.liga(ld, 0, sw, 0, "IMAGE")
        g.liga(dcp, 0, sw, 1, "IMAGE")
        origem, slot_origem = sw, 0

    # sobe direto para o alvo. Lanczos aqui e so escala -- a nitidez vem da
    # etapa 2, e a geometria ja veio certa da etapa 0.
    rs = g.no("ImageResizeKJv2", (X + 1040, Y + 430), (330, 240),
              [LARG_ERP, ALT_ERP, "lanczos", "crop", "0, 0, 0", "center", 2, "cpu"],
              ent=[_e("image", "IMAGE"), _e("mask", "MASK", opcional=True)],
              sai=[_s("IMAGE", "IMAGE"), _s("INT", "width"),
                   _s("INT", "height"), _s("MASK", "mask")],
              titulo="1 · sobe para %dx%d (4:1, o alvo)" % (LARG_ERP, ALT_ERP))
    g.liga(origem, slot_origem, rs, 0, "IMAGE")

    # ── 2 · estica as bordas ───────────────────────────────────────────────
    pad = None
    if a.outpaint or a.modo == "foto":
        pad = g.no("ImagePadForOutpaint", (X + 1420, Y + 430), (320, 180),
                   [PAD, 0, PAD, 0, 40],
                   ent=[_e("image", "IMAGE")],
                   sai=[_s("IMAGE", "IMAGE"), _s("MASK", "MASK")],
                   titulo="2 · estica %d px de cada lado -> %dx%d (4:1)"
                         % (PAD, LARG + 2 * PAD, ALT))
        g.liga(rs, 0, pad, 0, "IMAGE")

    # ── 3 · o outpaint com a LoRA 360 ──────────────────────────────────────
    gm = g.get("flux_model_360", "MODEL", (X + 1800, Y + 370))
    gc = g.get("flux_clip", "CLIP", (X + 1800, Y + 420))
    gv = g.get("flux_vae", "VAE", (X + 1800, Y + 470))

    pos = g.no("CLIPTextEncode", (X + 1800, Y + 530), (420, 150), [PROMPT_360],
               ent=[_e("clip", "CLIP")], sai=[_s("CONDITIONING", "CONDITIONING")],
               titulo="3 · prompt do 360")
    neg = g.no("CLIPTextEncode", (X + 1800, Y + 710), (420, 110), [NEGATIVO],
               ent=[_e("clip", "CLIP")], sai=[_s("CONDITIONING", "CONDITIONING")],
               titulo="negativo")
    g.liga(gc, 0, pos, 0, "CLIP")
    g.liga(gc, 0, neg, 0, "CLIP")

    def passada(x, y, img_no, img_slot, msk_no, msk_slot, cond, semente, rotulo,
                passos=PASSOS, denoise=1.0):
        """Uma passada de sampler sobre uma imagem.

        `msk_no=None` dispensa o `SetLatentNoiseMask`: sem mascara, o denoise
        parcial atua na imagem inteira -- que e o que um REFINO quer. Com
        mascara e denoise 1.0, e um outpaint.
        """
        enc = g.no("VAEEncode", (x, y), (210, 46), [],
                   ent=[_e("pixels", "IMAGE"), _e("vae", "VAE")],
                   sai=[_s("LATENT", "LATENT")])
        entra_no_ks, entra_slot = enc, 0
        if msk_no is not None:
            msk = g.no("SetLatentNoiseMask", (x, y + 70), (260, 46), [],
                       ent=[_e("samples", "LATENT"), _e("mask", "MASK")],
                       sai=[_s("LATENT", "LATENT")])
            g.liga(enc, 0, msk, 0, "LATENT")
            g.liga(msk_no, msk_slot, msk, 1, "MASK")
            entra_no_ks, entra_slot = msk, 0
        ks = g.no("KSampler", (x, y + 140), (320, 262),
                  [semente, "fixed", passos, CFG, "euler", "simple", denoise],
                  ent=[_e("model", "MODEL"), _e("positive", "CONDITIONING"),
                       _e("negative", "CONDITIONING"), _e("latent_image", "LATENT")],
                  sai=[_s("LATENT", "LATENT")], titulo=rotulo)
        dec = g.no("VAEDecode", (x, y + 430), (210, 46), [],
                   ent=[_e("samples", "LATENT"), _e("vae", "VAE")],
                   sai=[_s("IMAGE", "IMAGE")])
        g.liga(img_no, img_slot, enc, 0, "IMAGE")
        g.liga(gv, 0, enc, 1, "VAE")
        g.liga(gm, 0, ks, 0, "MODEL")
        g.liga(cond, 0, ks, 1, "CONDITIONING")
        g.liga(neg, 0, ks, 2, "CONDITIONING")
        g.liga(entra_no_ks, entra_slot, ks, 3, "LATENT")
        g.liga(ks, 0, dec, 0, "LATENT")
        g.liga(gv, 0, dec, 1, "VAE")
        return dec

    if a.outpaint:
        # rota antiga, mantida para comparacao: estica as bordas e manda a LoRA
        # inventar o que falta. Foi o que nao funcionou -- a entrada era
        # perspectiva. Com a placa ja em ERP ela volta a fazer sentido se um dia
        # a placa precisar cobrir menos de 360.
        d1 = passada(X + 2280, Y + 430, pad, 0, pad, 1, pos, 3601,
                     "3 · OUTPAINT 360 (%d passos)" % PASSOS)
    else:
        # REFINO, nao outpaint. A geometria ja veio certa da etapa 0; o que
        # falta e textura, porque a placa nasceu em metade da escala. Denoise
        # parcial redesenha o tijolo e o asfalto SEM mexer em onde as coisas
        # estao -- e e por isso que nao ha mascara aqui.
        d1 = passada(X + 2280, Y + 430, rs, 0, None, 0, pos, 3601,
                     "2 · REFINO ERP (denoise %.2f, %d passos)"
                     % (DENOISE_REFINO, PASSOS_REFINO),
                     passos=PASSOS_REFINO, denoise=DENOISE_REFINO)
    final = d1

    # ── 4 · a emenda das bordas ────────────────────────────────────────────
    if not a.sem_emenda:
        peme = g.no("CLIPTextEncode", (X + 2700, Y + 250), (420, 110),
                  [PROMPT_EMENDA], ent=[_e("clip", "CLIP")],
                  sai=[_s("CONDITIONING", "CONDITIONING")],
                  titulo="4 · prompt da emenda")
        g.liga(gc, 0, peme, 0, "CLIP")
        roll = g.no("MickmumpitzPanoSeamRoll", (X + 2700, Y + 390), (330, 106),
                    [0.06, 24], ent=[_e("image", "IMAGE")],
                    sai=[_s("IMAGE", "rolled_image"), _s("MASK", "seam_mask")],
                    titulo="4 · rola meia largura (emenda vai ao centro)")
        g.liga(d1, 0, roll, 0, "IMAGE")
        d2 = passada(X + 2700, Y + 520, roll, 0, roll, 1, peme, 3602,
                     "4 · repinta a emenda")
        volta = g.no("MickmumpitzPanoRollHorizontal", (X + 2700, Y + 1010),
                     (330, 58), [0.5], ent=[_e("image", "IMAGE")],
                     sai=[_s("IMAGE", "image")], titulo="4 · desenrola")
        g.liga(d2, 0, volta, 0, "IMAGE")
        final = volta

    # ── 5 · o panorama vira referencia do grafo ────────────────────────────
    st = g.setn("AMBIENTE_360", "IMAGE", (X + 3120, Y + 430))
    g.liga(final, 0, st, 0, "IMAGE")
    pv = g.no("SaveImage", (X + 3120, Y + 520), (520, 320),
              ["ambiente-360/pano"], ent=[_e("images", "IMAGE")],
              titulo="5 · PANORAMA (confira a emenda aqui)")
    g.liga(final, 0, pv, 0, "IMAGE")
    # Os nomes sao os DELE, nao invencao nossa -- assim o grafo e a aula falam
    # a mesma lingua quando voce voltar no video para conferir alguma coisa.
    if a.modo == "texto":
        g.grupo("Generate Set", [X - 60, Y - 260, 1060, 1420], "#353")
    g.grupo("360 ENVIRONMENT", [X + 1380, Y + 370, 1240, 1000], "#535")
    if not a.sem_emenda:
        g.grupo("SEAM KILLER", [X + 2660, Y + 190, 1000, 1180], "#553")

    # ── 6 · um recorte por SETOR da comunidade ─────────────────────────────
    #
    # O autor usa um `Olm Drag Crop`, que deixa arrastar a caixa no preview.
    # Nao temos esse pacote -- e aqui o enquadramento ser CALCULADO acaba sendo
    # melhor para repetir: o mesmo setor devolve sempre o mesmo pedaco, take
    # depois de take.
    #
    # A conta, com o panorama cobrindo 360 graus na largura:
    #     px por grau     = LARG_ERP / 360
    #     centro do setor = angulo x (px por grau)
    #
    # Recortar direto nesse x quebra quando o setor cai perto da borda: o
    # pedaco atravessaria a emenda e sairia cortado ao meio. Por isso cada
    # setor primeiro ROLA o panorama para trazer seu angulo ao centro, e so
    # entao recorta no meio. Rolar um equirretangular e legitimo -- e apenas
    # girar a camera, nada se deforma.
    #
    # A largura do recorte segue a proporcao dos planos da peca (9:16), o que
    # da um campo perto do de uma 50mm em retrato.
    YR = Y + 1560
    px_por_grau = LARG_ERP / 360.0
    corte_x = (LARG_ERP - LARG_CORTE) // 2
    fov = LARG_CORTE / px_por_grau
    crop = None

    ga = g.get("AMBIENTE_360", "IMAGE", (X, YR))
    carrega_up = None
    if a.upscale_ambiente:
        # um loader so para os seis setores -- o modelo e o mesmo
        carrega_up = g.no("UpscaleModelLoader", (X, YR - 90), (330, 58),
                          [a.upscale_ambiente],
                          sai=[_s("UPSCALE_MODEL", "UPSCALE_MODEL")],
                          titulo="nitidez dos recortes de ambiente")
    print("recortes (panorama %dx%d - %.2f px/grau - recorte %dx%d = %.0f graus):"
          % (LARG_ERP, ALT_ERP, px_por_grau, LARG_CORTE, ALT_ERP, fov))

    for k, (chave, ang, rotulo, _, _fundo) in enumerate(SETORES):
        yk = YR + k * 340
        # a fracao que leva o angulo do setor ao centro do quadro
        fr = ((180.0 - ang) / 360.0) % 1.0
        rolo = g.no("MickmumpitzPanoRollHorizontal", (X + 300, yk), (330, 58),
                    [round(fr, 4)], ent=[_e("image", "IMAGE")],
                    sai=[_s("IMAGE", "image")],
                    titulo="%s - gira %d graus para o centro" % (chave, ang))
        g.liga(ga, 0, rolo, 0, "IMAGE")
        cr = g.no("ImageCrop", (X + 680, yk), (300, 130),
                  [LARG_CORTE, ALT_ERP, corte_x, 0],
                  ent=[_e("image", "IMAGE")], sai=[_s("IMAGE", "IMAGE")],
                  titulo="%s - %s" % (chave, rotulo))
        g.liga(rolo, 0, cr, 0, "IMAGE")
        # O recorte sai com 576x1024 -- e e ele que o IMAGE GEN recebe como
        # referencia de ambiente. Subir com ESRGAN antes de entregar da mais
        # textura de tijolo, fio e concreto ao fundo do plano.
        #
        # ESRGAN em VIDEO causa cintilacao (cada frame nitidificado por
        # conta propria, os detalhes dancam). Aqui nao ha esse risco: e um
        # frame unico, parado, usado como referencia.
        #
        # E `4x-UltraSharp`, nao `RealESRGAN`: medindo as saidas do CCC, o
        # RealESRGAN dobrou o tamanho e derrubou a nitidez de ~490 para ~58.
        # Grande e liso nao ajuda um modelo que precisa de detalhe.
        saida_do_setor, slot_setor = cr, 0
        if a.upscale_ambiente:
            up = g.no("ImageUpscaleWithModel", (X + 1000, yk), (280, 46), [],
                      ent=[_e("upscale_model", "UPSCALE_MODEL"),
                           _e("image", "IMAGE")],
                      sai=[_s("IMAGE", "IMAGE")],
                      titulo="%s · nitidez (%s)" % (chave, a.upscale_ambiente))
            g.liga(carrega_up, 0, up, 0, "UPSCALE_MODEL")
            g.liga(cr, 0, up, 1, "IMAGE")
            saida_do_setor, slot_setor = up, 0
        sc = g.setn("AMB_" + chave, "IMAGE", (X + 1320, yk))
        g.liga(saida_do_setor, slot_setor, sc, 0, "IMAGE")
        pvc = g.no("PreviewImage", (X + 1620, yk), (260, 300), [],
                   ent=[_e("images", "IMAGE")], titulo="AMB_%s" % chave)
        g.liga(saida_do_setor, slot_setor, pvc, 0, "IMAGE")
        g.grupo("SETOR %s - %d graus - %s" % (chave, ang, rotulo),
                [X - 60, yk - 90, 1980, 310], "#357")
        print("   %-22s %3d  centro %4.0f px  giro %.4f  ->  Get_AMB_%s"
              % (rotulo, ang, ang * px_por_grau, fr, chave))
        if chave == a.setor_shot01:
            crop = cr

    if crop is None:
        raise SystemExit("--setor-shot01 %s nao existe; use um de: %s"
                         % (a.setor_shot01, ", ".join(s[0] for s in SETORES)))

    # ── 7 · liga no SHOT 01 ────────────────────────────────────────────────
    GEN = 13394
    if GEN not in ns:
        raise SystemExit("o IMAGE GEN #%d do SHOT 01 sumiu" % GEN)
    slot = entrada(ns, GEN, "pixels_2")
    if ns[GEN]["inputs"][slot].get("link"):
        print("   [aviso] pixels_2 do SHOT 01 ja estava ocupado — nao mexi")
    else:
        # o plano puxa o SETOR, nao um "AMB_SHOT_01" generico. Trocar de
        # locacao passa a ser trocar o nome deste Get -- e o plano muda de
        # lugar na comunidade sem que nada mais no grafo precise mudar.
        nome = "AMB_" + a.setor_shot01
        gsc = g.get(nome, "IMAGE",
                    (ns[GEN]["pos"][0] - 260, ns[GEN]["pos"][1] + 120))
        g.liga(gsc, 0, GEN, slot, "IMAGE")
        print("   SHOT 01 · pixels_2 <- %s" % nome)

    # o CORPO estava solto no grafo do autor: `Get_FACEBODY` existia e nao ia
    # a lugar nenhum -- so o rosto entrava. Isso deixa a camiseta, e a coroa que
    # e a marca do cliente, por conta do texto: exatamente onde ela mais se
    # perde. `pixels_3` estava livre, e e ali que ela volta.
    slot3 = entrada(ns, GEN, "pixels_3")
    if ns[GEN]["inputs"][slot3].get("link"):
        print("   [aviso] pixels_3 ja ocupado - nao mexi")
    else:
        # O autor JA deixou um `Get_FACEBODY` no grupo, apenas sem destino.
        # Criar um segundo do lado dele funciona e fica horrivel: duas caixas
        # com o mesmo nome, uma ligada e outra nao, e quem abre o grafo tem de
        # adivinhar qual vale. Reaproveitar o que existe e mais limpo e ainda
        # explica por que ele estava ali.
        usados = {l[1] for l in w["links"] if isinstance(l, list)}
        gfb = next((n["id"] for n in w["nodes"]
                    if n["type"] == "GetNode"
                    and (n.get("widgets_values") or [""])[0] == "FACEBODY"
                    and n["id"] not in usados), None)
        if gfb is None:
            gfb = g.get("FACEBODY", "IMAGE",
                        (ns[GEN]["pos"][0] - 260, ns[GEN]["pos"][1] + 200))
            print("   SHOT 01 - pixels_3 <- FACEBODY (no novo)")
        else:
            print("   SHOT 01 - pixels_3 <- FACEBODY (o que estava solto)")
        g.liga(gfb, 0, GEN, slot3, "IMAGE")

    # e o prompt passa a falar do MESMO lugar que a referencia mostra
    TXT = 13383
    if TXT in ns:
        ns[TXT]["widgets_values"][0] = prompt_do_plano(a.setor_shot01)
        print("   SHOT 01 - prompt reescrito para o setor %s" % a.setor_shot01)

    # ── 8 · a VOZ do plano ────────────────────────────────────────────────
    #
    # Mesmo caso do FACEBODY: o autor deixou um `Get_audio_ref_01` dentro do
    # grupo e nao ligou em nada. O `reference_audio` do VIDEO GEN ficava nulo.
    #
    # Isso nao quebra a execucao -- o LTX gera audio de qualquer jeito. So que
    # inventa a voz. Sem a amostra, cada take sai com um timbre diferente, e
    # seis planos do mesmo homem falam com seis vozes. E o tipo de defeito que
    # so aparece na montagem, quando os clipes ficam lado a lado.
    VID = 13392
    if VID in ns:
        slot_a = entrada(ns, VID, "reference_audio")
        if ns[VID]["inputs"][slot_a].get("link"):
            print("   [aviso] reference_audio ja ocupado - nao mexi")
        else:
            usados = {l[1] for l in w["links"] if isinstance(l, list)}
            ga = next((n["id"] for n in w["nodes"]
                       if n["type"] == "GetNode"
                       and (n.get("widgets_values") or [""])[0] == "audio_ref_01"
                       and n["id"] not in usados), None)
            if ga is None:
                ga = g.get("audio_ref_01", "AUDIO",
                           (ns[VID]["pos"][0] - 260, ns[VID]["pos"][1] + 260))
            g.liga(ga, 0, VID, slot_a, "AUDIO")
            print("   SHOT 01 - reference_audio <- audio_ref_01 (a voz)")

    # O segundo bloco de audio do autor publica sob o nome `audio_ref_0`, com o
    # `2` faltando. Nenhum Get procura por esse nome, entao o grupo AUDIO
    # REFERENCE 02 inteiro nao serve para nada -- carrega, corta e guarda num
    # endereco que ninguem le. Um caractere.
    for n in w["nodes"]:
        if n["type"] == "SetNode" and (n.get("widgets_values") or [""])[0] == "audio_ref_0":
            n["widgets_values"][0] = "audio_ref_02"
            print("   Set_audio_ref_0 -> Set_audio_ref_02 (faltava o 2)")

    titula(w)
    g.fecha()

    # conferencia
    porid = {l[0]: l for l in w["links"]}
    ruins = []
    for n in w["nodes"]:
        for i, e in enumerate(n.get("inputs", [])):
            lid = e.get("link")
            if lid is None:
                continue
            l = porid.get(lid)
            if not l or l[3] != n["id"] or l[4] != i:
                ruins.append("no %s entrada '%s' torta" % (n["id"], e["name"]))
    for n in w["nodes"]:
        if n["id"] in g.novos:
            for e in n.get("inputs", []):
                if e.get("link") is None and not e.get("shape"):
                    ruins.append("no NOVO %s (%s) entrada '%s' solta"
                                 % (n["id"], n["type"], e["name"]))
    if ruins:
        print("GRAFO INCONSISTENTE — nao gravei:")
        for r in ruins[:15]:
            print("   " + r)
        return 1

    destino = os.path.join(WF, a.saida or a.arquivo)
    io.open(destino, "w", encoding="utf-8").write(
        json.dumps(w, ensure_ascii=False, indent=2))
    print("\n%d no(s) novo(s) · %d nos · %d links · 0 solta"
          % (len(g.novos), len(w["nodes"]), len(w["links"])))
    print("placa %dx%d (ERP) -> refino %dx%d · %d setores · recorte %dx%d (%.0f°)"
          % (LARG, ALT, LARG_ERP, ALT_ERP, len(SETORES), LARG_CORTE, ALT_ERP,
             LARG_CORTE / (LARG_ERP / 360.0)))
    print("→ %s (%.0f KB)" % (destino, os.path.getsize(destino) / 1e3))
    return 0


if __name__ == "__main__":
    sys.exit(main())
