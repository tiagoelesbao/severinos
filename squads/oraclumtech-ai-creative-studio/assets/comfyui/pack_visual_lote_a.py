# -*- coding: utf-8 -*-
"""Catalogo visual do LOTE A longo — 11 marcadores, 3 pecas, 33 imagens.

POR QUE UM CATALOGO NOVO E NAO O `pack_visual_estoico`
  Aquele pack foi escrito para FUNDO PRETO ABSOLUTO, que o playbook descrevia
  como "o padrao dominante" da referencia. A extracao de takes das duas pecas
  inteiras desmentiu isso: fundo preto e MINORIA. O vocabulario real da v1 e
  colunata creme contra vazio teal, corte descentrado, particula no ar e
  vinheta pesada — que e o que o founder aprovou na coluna FIEL do storyboard.

  Manter o pack antigo e gerar por cima seria misturar duas gramaticas visuais
  no mesmo canal.

AS TRES PECAS DIVIDEM OS MESMOS 11 MARCADORES
  Os roteiros LA1, LA2 e LA3 usam a mesma lista de imagens de proposito — e a
  identidade do canal que se constroi por repeticao. O que NAO se repete e a
  imagem: cada peca gera a sua com semente propria. Mesma direcao, quadros
  diferentes.

TEMPLATE — todo prompt carrega, nesta ordem:
  1. enquadramento horizontal e POSICAO no quadro (a referencia quase nunca
     centraliza; T01 poe a figura no terco esquerdo e corta na coxa)
  2. o assunto, com CONTAGEM explicita — numero nao dito e numero errado
  3. fundo, com profundidade declarada
  4. luz, que e o que carrega o genero
  5. ACABAMENTO comum: particula, risco de pelicula, vinheta

NUNCA pedir superficie escrita. Pergaminho entra SEMPRE em branco — o modelo
inventa glifos ilegiveis e o olho pega na hora.
"""

# Assinatura do genero, identica a que foi validada na modelagem v1.
ACABAMENTO = ("scattered fine white light particles drifting in the air, faint film "
              "scratches, heavy vignette crushing the corners to black, subtle film "
              "grain, low camera angle looking slightly up, photoreal digital "
              "painting, 16:9")

NEG = ("text, letters, words, subtitles, caption, watermark, signature, logo, "
       "extra limbs, third leg, duplicated leg, extra arm, extra foot, malformed "
       "anatomy, extra fingers, fused fingers, deformed hands, "
       "human skin, skin pores, flesh, real person, photograph of a person, hands, fingers, "
       "flat lighting, evenly lit, washed out, low contrast, "
       "modern clothing, modern objects, oversaturated, neon colors, "
       "cartoon, anime, 3d render, plastic, low quality, blurry, jpeg artifacts")

# As tres pecas do lote. A ordem importa: e ela que define a semente.
PECAS = ["LA1-disciplina", "LA2-ansiedade", "LA3-tempo"]

# (n, slug, corpo do prompt) — os 11 marcadores [img NN] dos roteiros longos.
MARCADORES = [
    (1, "filosofo-sentado",
     "Wide cinematic horizontal composition. A pale cream marble statue of a bearded "
     "philosopher seated on a plain rectangular plinth in the LEFT THIRD of the frame, "
     "head lowered in thought, toga draped across the waist, exactly two legs with "
     "both bare feet flat on the plinth, complete anatomically correct body, behind "
     "him a dark teal void with two tall fluted columns barely readable on the right, "
     "soft high light falling from above and in front"),

    # SEM MAOS, de proposito. Este marcador ja saiu com PELE HUMANA em tres
    # rodadas seguidas — no pack curto (o founder reportou "maos de pele em img
    # 02 e 05") e de novo aqui, mesmo com "carved from marble, not flesh" no
    # positivo e "human skin, flesh" no negativo. Pedir marmore e mais fraco que
    # o prior de "duas maos segurando algo", que e sempre fotografia de gente.
    # A correcao que funciona nao e adjetivo: e tirar as maos da cena.
    (2, "pergaminho-sobre-marmore",
     "Wide cinematic horizontal composition. An open papyrus scroll unrolled flat on a "
     "polished marble ledge, its surface completely blank unmarked aged papyrus with "
     "no writing of any kind, turned wooden rods at each end, a plain bronze stylus "
     "resting beside it, no hands and no people anywhere in frame, the scroll set to "
     "the right of centre, warm raking light from the left, the background a dark "
     "blurred colonnade with shallow depth of field"),

    (3, "busto-perfil-rasante",
     "Wide cinematic horizontal composition. A cream marble bust of a bearded stoic in "
     "three-quarter profile occupying the RIGHT half of the frame and facing left, "
     "carved curls and beard, resting on a solid rectangular pedestal, a single hard "
     "warm rim light grazing the brow, nose and beard from the left while the far side "
     "falls into deep shadow, behind him a dark teal hall with one column silhouetted "
     "close to camera"),

    (4, "templo-colunata-noite",
     "Wide cinematic horizontal composition. An ancient Greek temple colonnade at "
     "night, two symmetrical rows of complete weathered marble columns receding into "
     "darkness, every column standing on its own base and reaching the entablature "
     "above, a heavy overcast sky with a single break of pale light, cold moonlight "
     "grazing the stone, thick atmospheric haze, deep blacks"),

    (5, "rolos-empilhados",
     "Wide cinematic horizontal composition. A small stack of closed papyrus scrolls "
     "resting on a marble ledge in the LOWER LEFT of the frame, wooden rods visible at "
     "the ends, no writing anywhere, behind and above them a dark stone wall in "
     "shadow, a single low warm light entering from the left, most of the frame in "
     "deep shadow, shallow depth of field"),

    (6, "estatua-braco-estendido",
     "Wide cinematic horizontal composition. A cream marble statue of a standing draped "
     "figure with one arm extended forward in a restraining gesture, palm open and "
     "facing outward, complete anatomically correct body cropped at mid-thigh, placed "
     "to the LEFT of centre, behind him a warm hazy colonnade receding to the right, a "
     "single hard side light from the left with the far half of the body in darkness"),

    (7, "togado-entre-colunas",
     "Wide cinematic horizontal composition. A cream marble statue of a robed figure "
     "standing between two tall fluted columns inside an ancient temple, seen from the "
     "front and cropped at the knees, warm amber light pouring in from a doorway "
     "behind him and outlining his shoulders, the hall around him falling into cold "
     "teal shadow, volumetric haze between the columns"),

    (8, "busto-frontal-sombra-dura",
     "Wide cinematic horizontal composition. A cream marble bust of a bearded stoic "
     "facing the camera directly, centred, a hard-edged shadow cutting diagonally "
     "across the face so that one half is lit and the other is black, behind him a "
     "dark stone wall with a faint warm glow at the far right, very high contrast"),

    (9, "ceu-noturno-sobre-ruina",
     "Wide cinematic horizontal composition. A vast night sky full of faint stars "
     "occupying the upper two thirds of the frame, along the bottom a distant horizon "
     "of ancient marble ruins in silhouette with a broken colonnade and an arch, two "
     "small warm braziers burning far in the background, cold blue-grey moonlight on "
     "the fallen stone in the foreground"),

    (10, "estatua-caida",
     "Wide cinematic horizontal composition. A toppled carved head and shoulder "
     "fragment of a colossal marble statue lying large in the LOWER LEFT of the frame "
     "among fallen blocks of stone, broken columns standing at different heights in "
     "the background, low raking warm light crossing the broken surfaces from the "
     "left, dust hanging in the air, muted honey-grey palette"),

    (11, "colunata-contraluz",
     "Wide cinematic horizontal composition. A corridor of tall marble columns seen "
     "head on and receding into the distance, a single bright shaft of warm light "
     "breaking through the far opening and flooding down the centre of the corridor, "
     "the columns reduced to dark silhouettes on both sides, heavy volumetric haze, "
     "no figure present, deep blacks at the edges"),
]


def prompt_de(corpo):
    return corpo + ", " + ACABAMENTO


def semente(peca, n):
    """Semente por PECA. As tres dividem o catalogo mas nao o quadro.

    Base 9100/9200/9300 conforme a posicao em PECAS — assim o mesmo marcador
    sai diferente nas tres, e regerar uma peca nao mexe nas outras.
    """
    return 9100 + 100 * PECAS.index(peca) + n
