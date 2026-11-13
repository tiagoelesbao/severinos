# -*- coding: utf-8 -*-
"""Modelagem dos 10 takes de maior tempo em tela da referencia v2 (reflexoes).

A V2 NAO E A V1 COM OUTRA COR — e outro vocabulario
  material   bronze escuro / basalto / pedra azul-acinzentada, com ORNAMENTO
             DOURADO (ombreira, fivela, colar). A v1 e marmore branco liso.
  luz        recorte quente FORTE contra entorno muito escuro. A v1 e mais chapada.
  ambiente   ruina com ARCO e portico, e — o que a v1 nao tem — planos DIURNOS
             largos, com ceu azul, arvores e ate pessoas na praca.
  paleta     ouro quente + teal profundo, com acento CARMESIM
  enquadra   mais fechado e mais heroico: busto e torso ocupam o quadro
  legenda    caixa alta, destaque CARMESIM sobre a palavra-chave

AS TRES VARIACOES — mesma regra da v1
  FIEL           descricao densa do frame real, com a paleta DAQUELE take
  INTERMEDIARIA  mesmo sujeito e ambiente, variando UMA variavel de cinema
  AUTORAL        reinterpretacao livre de luz, cor e enquadramento

  Cada variacao repete o SUJEITO e o MATERIAL por extenso. Escrever "the same
  figure" nao carrega nada — o modelo nao tem memoria do prompt anterior, e na
  rev.2 da v1 isso fez sair gente de carne no lugar de estatua.
"""

ACABAMENTO = ("scattered fine light particles drifting in the air, faint film "
              "scratches, heavy vignette crushing the corners to black, subtle film "
              "grain, photoreal digital painting, 16:9")

NEG = ("text, letters, words, subtitles, caption, watermark, signature, logo, "
       # ANTI-CARNE — a correcao da rev.1 da v2. Sem estes termos, todo close de
       # busto virava RETRATO DE HOMEM VIVO: T02, T03, T08 e T09 sairam com pele,
       # poro e barba real no lugar de bronze. O prompt positivo ja dizia "bronze";
       # nao bastou, porque o prior do modelo para "bearded bust facing camera" e
       # fotografia de pessoa. A negacao e que fecha a porta.
       "human skin, skin pores, living person, real man, portrait photograph, "
       "flesh, body hair, sweat, glossy skin, fashion model, "
       "extra limbs, third leg, duplicated leg, extra arm, extra foot, malformed "
       "anatomy, extra fingers, fused fingers, deformed hands, "
       "modern clothing, modern objects, plastic, cartoon, anime, 3d render, "
       "flat lighting, evenly lit, washed out, low contrast, oversaturated, "
       "neon colors, low quality, blurry, jpeg artifacts")

# Reforco POSITIVO de materialidade, para os takes cujo sujeito e uma ESCULTURA.
# Anda junto com a negacao acima: uma fecha a porta, a outra diz o que entra.
#
# CUIDADO COM A COR — a rev.2 escrevia "hard STONE surface, matte MINERAL texture"
# e isso resolveu a carne mas branqueou tudo: o bronze quase preto do T02 e do T09
# saiu como marmore claro, e o bronze e justamente o que separa a v2 da v1. O
# reforco tem que falar de SUPERFICIE, nunca de material — a cor vem do dicionario
# abaixo, take a take.
MATERIA = ("carved sculpture, not a living person, chisel marks and micro-chipping "
           "across the surface, matte inorganic finish, no skin pores, no body hair")

# A cor/material de cada figura, reafirmada DEPOIS do reforco de superficie para
# ser a ultima palavra do prompt sobre o assunto.
MATERIAL = {
    2: "cast in dark bronze with a near-black patina, not white marble",
    3: "carved in dark bronze with a near-black patina, not white marble",
    4: "carved in cool blue-grey stone with gilded ornament, not white marble",
    6: "cast in dark bronze under gilded armour, not white marble",
    8: "carved in cool blue-grey stone, not white marble",
    9: "cast in dark bronze with a near-black patina, not white marble",
}

# Takes cujo sujeito e figura esculpida. Os planos de arquitetura (T01, T05, T07,
# T10) nao levam o reforco — la nao ha rosto para o modelo confundir.
TAKES_FIGURA = set(MATERIAL)

# (id, slug, o que o frame REAL mostra, FIEL, INTERMEDIARIA, AUTORAL)
TAKES = [
    (1, "patio-do-templo-de-dia",
     "Panoramica DIURNA de patio de templo: colunata dos dois lados, estatua branca "
     "sobre pedestal ao centro-esquerda, arvore grande no alto a direita, figuras "
     "togadas sentadas no chao, sombra rendilhada",
     "Wide daylight view of an ancient Greek temple courtyard, a colonnade of pale "
     "stone columns receding along both sides, a white marble statue on a pedestal "
     "standing centre-left, a large leafy tree overhanging from the upper right, "
     "several robed figures seated on the sunlit stone floor as if in a school, "
     "dappled shade across the ground, warm midday light, desaturated warm palette",
     "The same ancient temple courtyard with its side colonnades, central white "
     "statue on a pedestal and seated robed figures, but seen from a LOW ANGLE at "
     "floor level looking down the colonnade, the columns towering and converging, "
     "late afternoon light coming in almost horizontally",
     "An ancient Greek temple courtyard opening into golden light, colonnade "
     "receding on both sides, a white marble statue catching the sun on its pedestal, "
     "robed figures small in the distance, long dramatic shadows, warm amber haze "
     "between the columns"),

    (2, "figura-de-bronze-no-arco",
     "Figura musculosa em BRONZE quase preto sentada dentro de um ARCO, simetrica, "
     "luz dourada forte vindo por tras pelo vao, colunas em ruina dos dois lados",
     "A powerfully built bearded figure cast in near-black bronze seated frontally "
     "inside a large stone ARCH, drapery across the lap and the bare chest catching "
     "a warm golden glow that pours through the opening behind him, ruined columns "
     "flanking the arch symmetrically on both sides, everything else falling into "
     "deep shadow, strong warm rim against black",
     "The same near-black bronze bearded figure seated inside the same stone arch "
     "with the golden glow behind him, but framed as a TIGHT close-up on the chest "
     "and lowered head, the arch reduced to a bright sliver at the edges of frame",
     "A monumental bronze figure of a bearded man seated inside a ruined arch, "
     "shafts of golden light breaking through behind him and around his shoulders, "
     "columns dissolving into darkness, volumetric haze, epic scale"),

    (3, "busto-bronze-recorte-quente",
     "Busto barbado em bronze escuro, tres quartos virado a direita, RECORTE QUENTE "
     "forte pela direita no rosto, fundo de colunas escuras com feixes de luz",
     "Close bust of a bearded man carved in dark bronze, turned three-quarter to the "
     "right, a strong warm rim light entering from the right and running along the "
     "brow, cheekbone and beard while the rest of the face stays in shadow, behind "
     "him dark stone columns with faint warm light shafts between them, sparse "
     "particles in the air, very high contrast",
     "The same dark bronze bearded bust and the same shafted columns behind, but "
     "turned to face the CAMERA directly and lit from BELOW, the light climbing the "
     "underside of the jaw and brow, columns barely readable behind",
     "Close bust of a bearded bronze figure with a blazing warm rim tracing the "
     "profile, deep teal darkness behind, embers of light suspended in the air, "
     "dramatic chiaroscuro"),

    (4, "figura-com-ornamento-dourado",
     "Figura barbada em pedra AZUL-ACINZENTADA com fivela e ombreira DOURADAS "
     "ornamentadas, tres quartos, fundo de colunas claras em neblina quente",
     "A bearded figure carved in cool BLUE-GREY stone, distinctly not white marble, wearing an ornate GOLDEN shoulder "
     "clasp and a heavy draped mantle, seen in three-quarter view from the chest up, "
     "behind him pale stone columns dissolving into a warm hazy glow, soft light "
     "from the front left modelling the face, the cool blue stone reading against "
     "the warm background",
     "The same blue-grey stone figure with the golden shoulder clasp and draped "
     "mantle, same warm hazy colonnade behind, but seen from BEHIND over the "
     "shoulder, the face turned just enough to catch the light on the cheek",
     "A bearded figure in blue-grey stone with gilded ornament at the shoulder, "
     "standing in a hall filled with warm volumetric light, the cool stone and the "
     "golden air in strong complementary contrast"),

    (5, "fachada-do-templo-de-dia",
     "Fachada de templo grego em pleno DIA, colunas claras, ciprestes e oliveiras "
     "emoldurando, pessoas caminhando na praca, ceu azul com nuvens",
     "Wide daylight shot of a classical Greek temple facade with tall pale columns "
     "and a triangular pediment, cypress and olive branches framing the left and "
     "right edges of the frame, a few small robed figures walking across the stone "
     "plaza in front, bright blue sky with soft clouds, warm sunlight, gentle "
     "desaturation",
     "The same Greek temple facade with its pediment and pale columns, the same "
     "olive and cypress framing, but at GOLDEN HOUR with the sun low behind the "
     "building, the facade in near-silhouette and the sky burning warm",
     "A classical Greek temple rising above a sunlit plaza, olive trees swaying at "
     "the edges of frame, warm light raking across the columns, long shadows "
     "stretching toward the camera"),

    (6, "guerreiro-sob-ceu-tempestuoso",
     "Busto barbado em bronze com ARMADURA DOURADA ornamentada, tres quartos a "
     "direita, recorte quente forte, fundo de muro em ruina sob ceu carregado",
     "Close bust of a bearded warrior figure in dark bronze wearing ornate golden "
     "armour over the shoulder, turned three-quarter to the right, a hard warm rim "
     "light along the brow, nose and beard, behind him a ruined stone wall under a "
     "heavy stormy sky with a break of pale light, deep shadow filling the lower "
     "frame",
     "The same bronze warrior with the ornate golden shoulder armour and the same "
     "ruined wall under a stormy sky, but pulled back to a MEDIUM WIDE that shows "
     "the whole torso and the ruin around him, the figure small against the sky",
     "A bronze warrior figure with gilded armour standing against a violent stormy "
     "sky, warm light breaking through the clouds onto his shoulder, the ruin behind "
     "him lost in rain haze, cinematic scale"),

    (7, "ruina-noturna-com-portico",
     "Ruina NOTURNA: estatua togada de pe a esquerda, portico de pedra ao centro, "
     "ceu estrelado, pequenos braseiros quentes ao fundo a direita",
     "A night scene in an ancient ruin, a robed marble statue standing on the left "
     "of frame, a carved stone gateway with two columns and a lintel at the centre, "
     "a clear starfield filling the sky above, two small warm braziers burning far "
     "in the background on the right, cold blue-grey moonlight on the stone and "
     "fallen blocks in the foreground",
     "The same night ruin with the robed statue, the stone gateway and the distant "
     "braziers, but the camera is now placed BEYOND the gateway looking back through "
     "it, the opening framing the statue, starfield above",
     "An ancient ruin under a vast starfield, a robed statue standing among fallen "
     "stone, a carved gateway opening onto the night, braziers glowing warm deep in "
     "the background, cold moonlight and mist across the ground"),

    (8, "perfil-entre-colunas-quentes",
     "Perfil fechado de figura barbada em pedra azul-acinzentada a DIREITA, virado "
     "a esquerda, luz quente pela esquerda, colunas claras em neblina quente atras",
     "Tight profile of a bearded figure carved in blue-grey stone occupying the "
     "RIGHT half of the frame and facing left, warm light entering from the left and "
     "grazing the brow, nose and beard, behind him pale stone columns standing in a "
     "warm hazy glow with one dark column silhouetted close to camera on the left",
     "The same blue-grey stone bearded figure and the same warm hazy colonnade, but "
     "in FULL FRONT view centred in frame, the columns receding symmetrically behind "
     "on both sides",
     "Tight profile of a bearded stone figure against a hall of warm light, the "
     "columns behind him glowing in volumetric haze, a thin bright rim tracing the "
     "profile out of the darkness"),

    (9, "torso-em-contraluz",
     "Torso barbado de bronze em CONTRALUZ, silhueta com recorte quente nos ombros, "
     "fundo de colunata escura com feixe central",
     "The bare muscular torso and lowered head of a bearded bronze figure seen "
     "against the light, the body reading almost as silhouette with a hot warm rim "
     "along the shoulders and forearms, behind him a dark colonnade with a single "
     "bright shaft of light down the centre, drapery gathered at the waist, deep "
     "black filling most of the frame",
     "The same bronze bearded torso in the same dark colonnade with the central "
     "shaft of light, but the camera is now BEHIND him at shoulder height, the light "
     "hitting his back and the shaft opening ahead of him",
     "A bronze figure standing in contre-jour before a corridor of light, the body "
     "reduced to a warm-edged silhouette, dust and embers rising through the beam"),

    (10, "estatua-caida-na-ruina",
     "Bloco de pedra e fragmento de estatua caidos numa ruina, luz baixa rasante, "
     "colunas quebradas ao fundo, atmosfera de tempo passado",
     "A toppled carved head and shoulder fragment of a colossal classical statue "
     "lying large in the foreground among fallen blocks of stone, low raking light crossing the broken surfaces from the "
     "left, broken columns standing at different heights in the background, dust "
     "hanging in the air, muted warm grey palette, wide framing with the fragment in "
     "the lower left",
     "The same fallen statue fragment and broken columns in the same ruin, but shot "
     "from DIRECTLY ABOVE looking straight down at the stone on the ground, the "
     "raking light now crossing the frame diagonally",
     "The fallen head of a colossal stone figure half buried in the ruins, warm "
     "light breaking across the face, broken columns rising behind, dust suspended "
     "in the beams, elegiac and monumental"),
]


def variacoes(take):
    tid, _slug, _desc, fiel, inter, autoral = take
    extra = (", " + MATERIA + ", " + MATERIAL[tid]) if tid in TAKES_FIGURA else ""
    return [
        ("fiel", fiel + extra + ", " + ACABAMENTO),
        ("intermediaria", inter + extra + ", " + ACABAMENTO),
        ("autoral", autoral + extra + ", " + ACABAMENTO),
    ]
