# -*- coding: utf-8 -*-
"""Duplica o SHOT 01 em N takes, um por setor da comunidade.

POR QUE UM SCRIPT E NAO O NO DUPLICADOR
  O `MickmumpitzShotDuplicator` faz o trabalho mecanico de copiar o grupo, e
  faz bem. O que ele nao faz e o que interessa aqui: apontar cada copia para um
  setor diferente do panorama e reescrever os dois prompts para falarem daquele
  lugar. Feito a mao, sao seis copias e doze prompts para manter em sincronia
  -- e a primeira vez que alguem mexer num angulo, algum prompt vai ficar para
  tras falando de um lugar que a referencia nao mostra mais.

  Aqui a lista `TAKES` e a unica fonte. Mexer nela reescreve tudo.

O QUE TORNA A COPIA SEGURA
  O grupo SHOT 01 tem 34 nos e 28 links, e NENHUM link atravessa a fronteira do
  grupo: tudo que entra vem de `GetNode`, que resolve por nome em vez de por
  aresta. Entao clonar e copiar os nos, recriar os links internos e trocar os
  nomes dos Get/Set. Nao ha fio solto para reconectar do lado de fora.

O QUE MUDA EM CADA COPIA
  - `SetNode`/`GetNode` OUT_01 -> OUT_02, OUT_03...  (senao os shots se
    sobrescrevem, porque o nome e o endereco)
  - `GetNode` AMB_*            -> o setor daquele take
  - `ShotVideoOutput`          -> o numero do clipe no filme final
  - `SaveImage` / `SaveVideo`  -> prefixo proprio, para nao gravar por cima
  - os dois prompts            -> montados a partir do take e do setor

USO
    python duplica_shots.py
    python duplica_shots.py --takes 4        # so os quatro primeiros
"""
import argparse
import copy
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
from insere_360_no_movie import SETORES, ESTILO, titula   # noqa: E402

RAIZ = os.path.dirname(os.path.dirname(AQUI))
WF = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio", "assets",
                  "comfyui", "workflows")

# ── O ROTEIRO ──────────────────────────────────────────────────────────────
#
# Seis takes de ~5 s, um por setor, na ordem em que a camera anda pela
# comunidade. O percurso e o do panorama -- entra pelo arco, passa pela rua da
# festa, pelas casas, pelo campinho, pelo beco, e fecha na esquina.
#
# SOBRE AS FALAS: elas descrevem o que se VE acontecendo, de proposito. Evitei
# escrever qualquer coisa sobre como a Imperio Premios opera -- "parte de cada
# rifa vira presente", "sorteio mensal" e afins -- porque isso e afirmacao
# sobre o negocio do cliente, e eu nao tenho como conferir. Sao lugares
# marcados: troque pelo que o Bruno de fato faz, ou peca a ele a fala.
#
#   (n, setor, enquadramento da FOTO, movimento de CAMERA, acao, fala, som)
#
# A DIRECAO, QUINTA VERSAO -- o QUANDO da fala
#
# A quarta versao acertou o ritmo (90 wpm, tom, postura) e errou o
# POSICIONAMENTO. Medi o audio do take 1 em janelas de 100 ms:
#
#     0,0 a 2,1 s   silencio
#     2,1 a 5,0 s   fala
#
# Exatamente o inverso do que eu tinha pedido. Eu escrevi "ele diz as duas
# palavras e ENTAO para, e um silencio de dois segundos preenche o resto" --
# e o modelo entregou silencio primeiro, fala no fim.
#
# A licao: o modelo distribui a fala no tempo do plano e nao le "entao" como
# ordem cronologica. Ele conta quanto ha de fala e quanto ha de silencio, e
# escolhe a ordem sozinho. Para mandar, e preciso dar SEGUNDOS: "fala no
# primeiro segundo, os tres seguintes sao silencio". Duracao sem posicao e
# meia instrucao.
#
# E isso quebrava o hook: o corte para o take 2 caia logo depois de ele
# COMECAR a falar, em vez de cair depois do silencio suspenso.
TAKES = [
    (1, "VIELA",
     "Extreme close-up, his face fills the frame, chin slightly raised, jaw "
     "set, eyes looking off to the side with quiet certainty, the brick wall "
     "of the alley soft and close behind him",
     "Almost static camera, a barely perceptible drift forward over five "
     "seconds - the framing should look nearly the same at the start and at "
     "the end",
     "He holds absolutely still, chin up, breathing slow. His eyes shift and "
     "lock forward with certainty. The smallest confident smile forms at one "
     "corner of his mouth. He does not fidget, does not tilt his head",
     "Esse ano...",
     "TIMING: he speaks in the FIRST SECOND of the shot and then stops "
     "completely. The remaining four seconds are pure silence with no speech "
     "at all, and he holds the look through all of it. He speaks very slowly "
     "and low, around 90 words per minute, with the calm of someone who "
     "already decided. No music. Distant city hum, one motorbike far away"),
    (2, "ESCADARIA",
     "Wide shot from below, he climbs the concrete staircase with purpose, "
     "shoulders square, head up, brick houses stacked above him on both sides",
     "Low wide angle, camera rising with him as he climbs the steps",
     "He takes the steps steadily, shoulders back, head high. Halfway up he "
     "turns his face to the lens without breaking stride and holds the look. A "
     "kid runs down past him the other way",
     "...o Dia das Crianças vai ser diferente.",
     "TIMING: half a second of silence, then he speaks from second one to "
     "second four, then silence again to the end. He picks up the sentence he "
     "left hanging. Slow and deliberate, around 100 words per minute, weight "
     "on the word DIFERENTE, which he lands and lets hang. Confident, "
     "announcing - not confiding. Footsteps on concrete, kids further up"),
    (3, "BECO",
     "Medium shot, he knocks on an iron gate in the alley, standing tall, "
     "clothes lines overhead, a woman opening the gate from inside",
     "Handheld over his shoulder, then swinging around to catch her face",
     "He knocks twice, unhurried, and waits without shifting his weight. The "
     "gate opens and a woman looks out, surprised, then smiles. He lifts a "
     "wrapped gift into frame with an easy, certain movement",
     "Bateu porta por porta.",
     "TIMING: one second of ambience first, then he speaks from second one to "
     "second three, then silence. Slowly, around 100 words per minute, with a "
     "short pause after the first PORTA. Affectionate but sure of himself. "
     "Iron gate rattling, a TV inside a house, a dog barking down the alley"),
    (4, "LAJES",
     "Close-up on a small girl holding a wrapped gift against her chest, "
     "rooftops and water tanks behind her, he is out of focus beside her",
     "Tight handheld on the girl, then racking focus to him behind her",
     "The girl hugs the gift and looks up, eyes wide. Focus shifts to him - he "
     "is watching her, steady, and turns to the lens with a level, sure gaze",
     "Não é sorteio... Todo mundo leva.",
     "TIMING: one second of silence, then NAO E SORTEIO, then a full second of "
     "silence, then TODO MUNDO LEVA, then silence to the end. Low and very "
     "slow, around 85 words per minute. Firm, certain, not pleading. A child "
     "breathing, laundry in the wind, distant city"),
    (5, "QUADRA",
     "Wide shot on the concrete court, six kids running with gifts and a ball, "
     "he is among them laughing, wire fence and brick houses behind",
     "Wide handheld that drifts sideways, following the kids across the court",
     "The kids run past him in every direction, shouting. He laughs out loud, "
     "open and unguarded, spins to follow one of them, then plants his feet and "
     "turns back to camera, still smiling but steady",
     "Porque criança não escolhe onde nasce.",
     "TIMING: a second and a half of kids shouting and his laugh first, then he "
     "speaks the line from second two to second four, then the shouting carries "
     "the end. Slow and grounded, around 95 words per minute, landing hard on "
     "NASCE. Kids shouting and laughing, a ball on concrete, echo off walls"),
    (6, "MERCADINHO",
     "Medium shot, he stands by the corner shop at dusk, weight settled, "
     "children crossing the frame in front of the camera carrying gifts",
     "Slow push out from medium to wide, the alley opening up behind him",
     "Kids cross in front of the lens, blurred. He watches them go, then turns "
     "to the camera, completely composed, and gives one slow deliberate nod",
     "Império Prêmios... Dia das Crianças.",
     "TIMING: two seconds of ambience and children while he watches, then he "
     "speaks IMPERIO PREMIOS, a clear pause, then DIA DAS CRIANCAS, ending "
     "around second four and a half. Slow and low, around 85 words per minute. "
     "Calm, closing, the tone of someone stating a fact rather than selling. "
     "Kids running past, corner shop radio, evening birds"),
]

# ── prompts ────────────────────────────────────────────────────────────────
_POR_CHAVE = {s[0]: s for s in SETORES}
# valor padrao; o projeto sobrescreve
ROUPA = ("ONLY the white t-shirt from the reference, with the golden "
         "crown printed on the chest - no jacket, no coat, short sleeves")


def prompt_imagem(setor, enquadramento):
    # NOTA: o `enquadramento` abre na pratica. O IMAGE GEN recebe as
    # referencias FACE e FACEBODY, que sao retratos, e elas puxam o
    # enquadramento para plano medio mesmo quando o texto pede close extremo.
    # Por isso o take 1 diz "his face FILLS THE FRAME" -- descrever o que
    # ocupa o quadro funciona melhor que nomear o tipo de plano.
    """O prompt do frame inicial: pessoa + roupa + LUGAR, os tres da referencia.

    O fundo e nomeado com os elementos do setor para CONCORDAR com o recorte
    que entra em `pixels_2`. Texto generico briga com a referencia e costuma
    ganhar, e ai o recorte vira enfeite.

    O "no jacket" nao e capricho. A nova referencia de corpo e uma foto de
    estudio em que o Bruno usa jaqueta acolchoada preta por cima da camiseta.
    Referencia manda muito na roupa -- e sem dizer o contrario, os seis takes
    sairiam com casaco de inverno numa comunidade em fim de tarde quente. O
    texto precisa contradizer a referencia exatamente no ponto em que ela nao
    serve, e concordar com ela em todo o resto.
    """
    fundo = _POR_CHAVE[setor][4]
    return (
        enquadramento + ". The man from the reference images, in a brazilian "
        "community in the late afternoon, standing with relaxed confidence - "
        "shoulders square, chin level, gaze steady. Behind him, " + fundo +
        ", softly "
        "out of focus but still clearly recognizable. He wears " + ROUPA +
        ". "
        "The last golden sunlight rakes across one side of his face "
        "while the shaded side stays cool - two colliding color temperatures "
        "on his skin. Shot on a 50mm lens, eye level, vertical framing. "
        + ESTILO + ". Mood: sincere, hopeful.")


def prompt_video(camera, acao, fala, som):
    """O prompt do movimento, na estrutura que a aula manda para voz.

    A ordem importa: CAMERA primeiro, acao depois. Modelo de video le a
    primeira clausula como a intencao dominante do plano, e se ela for sobre a
    pessoa, a camera fica parada olhando. Nomear o movimento na abertura e o
    que faz o plano ter deslocamento em vez de so ter gesto.

    `[SOUNDS]` nao e so ambiencia: e onde se dirige o TOM da fala. E por isso
    que a mesma amostra de voz entrega alegre num take e contida no outro.
    """
    # Take mudo leva `[SPEECH]:` VAZIO, nao ausente. O autor faz assim no
    # filme dele -- ha um plano de multidao rindo com o rotulo em branco -- e
    # a diferenca importa: sem o rotulo, o modelo tende a inventar fala para
    # preencher um campo que ele espera encontrar.
    bloco_fala = ('[SPEECH]: "%s"' % fala) if str(fala).strip() else "[SPEECH]:"
    return ("[VISUAL]: %s. %s.\n\n%s\n\n"
            "[SOUNDS]: %s" % (camera, acao, bloco_fala, som))


# ── a copia ────────────────────────────────────────────────────────────────
def clona(w, take, folga_x):
    """Copia o grupo SHOT 01 e aponta a copia para o setor do take."""
    n_take, setor, enq, camera, acao, fala, som = take
    ns = {n["id"]: n for n in w["nodes"]}
    grupo = next(g for g in w["groups"]
                 if (g.get("title") or "").strip() == "SHOT 01")
    bx, by, bw, bh = grupo["bounding"]
    dentro = [n for n in w["nodes"]
              if bx <= n["pos"][0] <= bx + bw and by <= n["pos"][1] <= by + bh]
    ids = {n["id"] for n in dentro}

    prox_no = max(n["id"] for n in w["nodes"]) + 1
    prox_link = max([l[0] for l in w["links"] if isinstance(l, list)] or [0]) + 1
    de_para = {}

    for n in dentro:
        c = copy.deepcopy(n)
        c["id"] = prox_no
        de_para[n["id"]] = prox_no
        prox_no += 1
        c["pos"] = [n["pos"][0] + folga_x, n["pos"][1]]
        # as entradas do clone comecam soltas; os links internos sao refeitos
        for e in c.get("inputs", []) or []:
            e["link"] = None
        for s in c.get("outputs", []) or []:
            s["links"] = []
        troca_widgets(c, n_take, setor, enq, camera, acao, fala, som)
        w["nodes"].append(c)

    # os 28 links internos, agora entre os clones
    novos = 0
    for l in list(w["links"]):
        if not isinstance(l, list):
            continue
        lid, orig, oslot, dest, dslot, tipo = (l + [None])[:6]
        if orig not in ids or dest not in ids:
            continue
        no, nd = de_para[orig], de_para[dest]
        w["links"].append([prox_link, no, oslot, nd, dslot, tipo])
        # o cache que o frontend desenha
        for c in w["nodes"]:
            if c["id"] == nd:
                c["inputs"][dslot]["link"] = prox_link
            if c["id"] == no:
                c["outputs"][oslot].setdefault("links", []).append(prox_link)
        prox_link += 1
        novos += 1

    w["groups"].append({
        "id": max([g.get("id", 0) for g in w["groups"]] or [0]) + 1,
        "title": "SHOT %02d" % n_take,
        "bounding": [bx + folga_x, by, bw, bh],
        "color": grupo.get("color", "#3f789e"),
        "font_size": grupo.get("font_size", 24),
        "flags": {},
    })
    return len(de_para), novos


def troca_widgets(c, n_take, setor, enq, camera, acao, fala, som):
    """O que distingue uma copia da outra."""
    wv = c.get("widgets_values")
    t = c["type"]
    if t in ("SetNode", "GetNode") and wv:
        # OUT_01 e um ENDERECO: duas copias com o mesmo nome se sobrescrevem
        if str(wv[0]).startswith("OUT_"):
            wv[0] = "OUT_%02d" % n_take
        # e cada take olha para o seu pedaco da comunidade
        elif str(wv[0]).startswith("AMB_"):
            wv[0] = "AMB_" + setor
    elif t == "ShotVideoOutput" and wv:
        wv[0] = n_take                      # a posicao no filme final
    elif t == "SaveImage" and wv:
        wv[0] = "startimages/shot%02d" % n_take
    elif t == "SaveVideo" and wv:
        wv[0] = "video/shot%02d" % n_take
    elif t == "PrimitiveStringMultiline" and wv and isinstance(wv[0], str):
        if wv[0].lstrip().startswith("[VISUAL]"):
            wv[0] = prompt_video(camera, acao, fala, som)
        else:
            wv[0] = prompt_imagem(setor, enq)


def main():
    # antes de qualquer uso: `TAKES` aparece no default do argparse
    global TAKES, _POR_CHAVE, ESTILO, ROUPA
    ap = argparse.ArgumentParser()
    ap.add_argument("--arquivo", default="MOVIE-BUILDER-IMPERIO.json")
    ap.add_argument("--saida", default=None)
    ap.add_argument("--projeto", default=None,
                    help="nome do YAML em projetos/ -- manda nos takes")
    ap.add_argument("--takes", type=int, default=len(TAKES))
    a = ap.parse_args()

    # o projeto substitui TAKES, os SETORES de onde sai o `fundo`, o estilo e
    # a descricao da roupa
    if getattr(a, "projeto", None):
        from projeto import carrega
        pr = carrega(a.projeto)
        TAKES = pr.takes
        _POR_CHAVE = {s[0]: s for s in pr.setores}
        ESTILO = pr.estilo
        ROUPA = pr.roupa
        a.takes = min(a.takes, len(TAKES))

    caminho = os.path.join(WF, a.arquivo)
    w = json.load(io.open(caminho, encoding="utf-8"))
    if any((g.get("title") or "").strip() == "SHOT 02" for g in w["groups"]):
        raise SystemExit("ja existe SHOT 02 -- rode o insere_360 antes, para "
                         "partir de um arquivo com um shot so")

    largura = next(g["bounding"][2] for g in w["groups"]
                   if (g.get("title") or "").strip() == "SHOT 01")
    passo = int(largura) + 120

    # o SHOT 01 tambem entra no roteiro: ele e o take 1
    ns = {n["id"]: n for n in w["nodes"]}
    grupo = next(g for g in w["groups"]
                 if (g.get("title") or "").strip() == "SHOT 01")
    bx, by, bw, bh = grupo["bounding"]
    t1 = TAKES[0]
    print("takes:")
    for n in w["nodes"]:
        if bx <= n["pos"][0] <= bx + bw and by <= n["pos"][1] <= by + bh:
            troca_widgets(n, *t1)
    print("   %d · %-9s %s" % (t1[0], t1[1], t1[5]))

    total_nos = total_links = 0
    for take in TAKES[1:a.takes]:
        nn, nl = clona(w, take, passo * (take[0] - 1))
        total_nos += nn
        total_links += nl
        print("   %d · %-9s %s" % (take[0], take[1], take[5]))

    # os titulos dos clones vem do original e nao acompanham a troca de
    # widget -- sem isto, os seis shots mostram `Get_AMB_RUA` apontando para
    # seis lugares diferentes
    titula(w)

    # conferencia: nenhuma entrada solta, nenhum link torto
    porid = {l[0]: l for l in w["links"] if isinstance(l, list)}
    ns = {n["id"]: n for n in w["nodes"]}
    ruins = []
    for n in w["nodes"]:
        for i, e in enumerate(n.get("inputs", []) or []):
            lid = e.get("link")
            if lid is None:
                continue
            l = porid.get(lid)
            if not l or l[3] != n["id"] or l[4] != i:
                ruins.append("#%s entrada '%s' torta" % (n["id"], e["name"]))
    for lid, l in porid.items():
        if l[1] not in ns or l[3] not in ns:
            ruins.append("link %s aponta para no inexistente" % lid)
    if ruins:
        print("\nGRAFO INCONSISTENTE - nao gravei:")
        for r in ruins[:12]:
            print("   " + r)
        return 1

    destino = os.path.join(WF, a.saida or a.arquivo)
    io.open(destino, "w", encoding="utf-8").write(
        json.dumps(w, ensure_ascii=False, indent=2))
    print("\n%d take(s) · +%d nos · +%d links · %d nos no total"
          % (min(a.takes, len(TAKES)), total_nos, total_links, len(w["nodes"])))
    print("→ %s (%.0f KB)" % (destino, os.path.getsize(destino) / 1e3))
    return 0


if __name__ == "__main__":
    sys.exit(main())
