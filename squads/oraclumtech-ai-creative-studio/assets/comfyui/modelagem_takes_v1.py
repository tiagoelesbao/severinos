# -*- coding: utf-8 -*-
"""Modelagem dos 10 takes de maior tempo em tela da referencia v1.  rev.3

O QUE MUDOU NA rev.3 — e por que a rev.2 nao ficou parecida com o original
  Escrevi os prompts "fiel" a partir de uma descricao CURTA do frame. O founder
  reparou que fiel e intermediaria nao pareciam o modelo, e ele estava certo.
  Fui olhar os frames em detalhe e achei cinco coisas que meus prompts nao diziam:

  1. ENQUADRAMENTO. Quase nenhum take e figura inteira e centralizada. T01 poe a
     figura no terco esquerdo e corta na coxa; T04 e T10 ficam a direita; T09 corta
     no quadril; T07 corta no joelho. Eu pedia corpo completo, centralizado.
  2. PROFUNDIDADE DE CAMPO. O fundo do T07 esta claramente DESFOCADO. Nenhum prompt
     meu pedia isso, e e o que mais separa a nossa versao da referencia naquele take.
  3. PARTICULAS E ARRANHOES. A referencia tem faisca branca dispersa e risco de
     pelicula em quase todo take. Eu tinha tirado tudo por causa da queixa de "ruido
     ao redor do rosto" — mas aquela queixa era sobre close em fundo preto. Em plano
     aberto, a particula E o acabamento do genero.
  4. PALETA POR TAKE. Nao existe uma paleta so. T02 e SEPIA. T05 e teal contra fogo
     laranja. T09 e ambar quente. T10 e quase preto com pedra cor de mel. Meu bloco
     "desaturated, cool grey marble" estava ATIVAMENTE errado em metade deles.
  5. VINHETA PESADA e leve CONTRA-PLONGEE — canto esmagado no preto, camera um
     pouco abaixo da figura.

AS TRES VARIACOES
  FIEL           descricao densa do frame real, com a paleta DAQUELE take
  INTERMEDIARIA  mesmo sujeito e ambiente, variando UMA variavel de cinema por take
                 (angulo, lente, hora do dia) — e o "brinca nas variaveis"
  AUTORAL        reinterpretacao livre; foi a preferida do founder na rev.2
"""

# Acabamento comum. Vale para as tres variacoes, porque e assinatura do genero.
ACABAMENTO = ("scattered fine white light particles drifting in the air, faint film "
              "scratches, heavy vignette crushing the corners to black, subtle film "
              "grain, photoreal digital painting, 16:9")

NEG = ("text, letters, words, subtitles, caption, watermark, signature, logo, "
       "extra limbs, third leg, duplicated leg, extra arm, extra foot, malformed "
       "anatomy, extra fingers, fused fingers, deformed hands, "
       "human skin, flesh, real person, photograph of a person, "
       "flat lighting, evenly lit, washed out, low contrast, "
       "modern clothing, modern objects, oversaturated, neon colors, "
       "cartoon, anime, 3d render, plastic, low quality, blurry, jpeg artifacts")

# (id, slug, o que o frame REAL mostra, prompt FIEL, prompt INTERMEDIARIA, prompt AUTORAL)
TAKES = [
    (1, "figura-entre-colunas",
     "Figura na TERCO ESQUERDO, cortada na coxa; colunas creme ocupam os dois tercos "
     "direitos; fundo teal escuro; particulas e riscos",
     "A pale marble statue of a bearded man in a toga positioned in the LEFT THIRD of "
     "the frame and cropped at mid-thigh, his bare chest and right arm exposed, cloth "
     "draped across the waist, three tall warm cream fluted columns filling the right "
     "two thirds of the frame and receding into a dark teal void, soft frontal light "
     "from the left, low camera angle looking slightly up at him",
     "The same bearded marble statue and the same warm cream colonnade, but seen from "
     "a low three-quarter angle from his right side, the columns now converging in "
     "perspective toward the left, a shaft of cold light entering from behind the "
     "columns, dark teal depth",
     "A muscular bearded marble statue standing between two tall marble columns inside "
     "an ancient temple, draped toga over one shoulder, warm amber light entering from "
     "the left and grazing the torso, the hall behind him falling into cold blue "
     "darkness, rich cinematic chiaroscuro"),

    (2, "silhueta-contra-o-disco",
     "SEPIA. Estatua pequena, centrada, sobre pedestal de pedra numa planicie vazia "
     "e rachada; disco de eclipse preto com anel de coroa; nuvens marrons",
     "A robed statue standing on a stone pedestal in the middle of a vast empty "
     "cracked plain, small in the frame and centred, silhouetted against a black "
     "eclipse disc with a thin bright corona ring directly behind its head, warm "
     "SEPIA and brown sky with heavy clouds, long radiating shadows across the ground, "
     "faint stars in the dark upper corners, desaturated brown palette",
     "The same statue and the same eclipse behind it, but the camera is now LOW and "
     "CLOSE to the ground looking up, the pedestal filling the lower frame and the "
     "corona ring crowning the figure, same sepia and brown sky",
     "A seated classical statue on a wide stepped stone platform, silhouetted against "
     "an enormous glowing solar disc low on the horizon over a calm sea, dramatic "
     "layered clouds, a bright rim of light along its edge, epic scale"),

    (3, "bronze-frontal-no-templo",
     "Figura em bronze quase preto, frontal, ombros enormes, sentada; colunata creme "
     "SIMETRICA dos dois lados; fundo teal; degraus",
     "A near-black bronze statue of a powerfully built bearded man seated frontally, "
     "massive shoulders and bare chest, drapery over one shoulder and across the lap, "
     "an ancient temple interior behind him with warm cream columns receding "
     "SYMMETRICALLY on both left and right, stone steps below, the space behind "
     "falling into dark teal, the figure almost in silhouette with only a little warm "
     "light catching the bronze",
     "The same near-black bronze seated figure and the same symmetrical cream "
     "colonnade, but framed TIGHTER — head and torso only — and lit from a hard low "
     "source in front of him that rakes upward across the chest, dark teal depth",
     "A dark bronze statue of a bearded man seated on a stone throne at the top of "
     "temple steps, two marble columns framing him, warm amber rim light along the "
     "shoulders, the interior swallowed by darkness, symmetrical composition"),

    (4, "pensador-sob-estrelas",
     "Marmore claro, inclinado para frente, cotovelo no joelho, cabeca baixa; ocupa a "
     "METADE DIREITA; fundo verde-petroleo quase liso com particulas",
     "A pale marble statue of a bearded philosopher seated and leaning forward with "
     "one elbow on his knee and the head lowered, positioned in the RIGHT HALF of the "
     "frame with the left half almost empty, heavy toga draped over the shoulder and "
     "across the legs, exactly two legs, a nearly flat dark teal-green background with "
     "no architecture at all, cold soft light from the upper left, scattered white "
     "particles",
     "The same leaning philosopher on the same flat dark teal ground, but shot from "
     "BEHIND AND TO THE SIDE at shoulder height, so the curve of the back and the "
     "lowered head read first, the face barely visible",
     "A pale marble statue of a bearded philosopher seated leaning forward, elbow on "
     "knee and chin on hand, exactly two legs, a faint field of stars in the deep blue "
     "darkness behind him, cold moonlight from above and a soft warm bounce below"),

    (5, "leitura-na-colunata-noturna",
     "Pedra verde-acinzentada lendo tabua, sentado em bloco; colunas TERRACOTA "
     "iluminadas por FOGO real; ceu crepuscular teal; ciprestes",
     "A green-grey stone statue of a robed man seated on a stone block reading an open "
     "tablet held in both hands, positioned centre-right, a ruined courtyard around "
     "him with warm TERRACOTTA columns lit from below by real burning braziers with "
     "visible orange flames at the left foreground and right, cypress trees and a deep "
     "TEAL TWILIGHT SKY behind, the complementary split between cold sky and orange "
     "fire is the whole image",
     "The same reading statue in the same fire-lit courtyard, but the camera has moved "
     "BEHIND one of the terracotta columns so it frames him through the gap, the "
     "nearest column dark and out of focus in the foreground, teal sky and orange "
     "flame beyond",
     "A marble statue of a robed man seated reading a scroll inside a night colonnade, "
     "braziers glowing orange deep between the columns, the foreground lit cold blue "
     "by moonlight, mist along the stone floor"),

    (6, "torso-frontal-estrelado",
     "Busto e torso de marmore claro CENTRADO, cortado abaixo do peito; fundo com "
     "BRILHO RADIAL azul-acinzentado e muitas particulas brancas",
     "The head and bare muscular torso of a pale marble bearded figure facing the "
     "viewer, CENTRED and cropped just below the chest, cloth draped over his right "
     "shoulder and gathered in his hand, the background a soft RADIAL BLUE-GREY GLOW "
     "brightest right behind him and darkening to the edges, many small white star "
     "particles suspended in the air, even soft light on the stone, no architecture",
     "The same marble torso against the same radial blue-grey glow, but turned to a "
     "sharp PROFILE and pushed to the left of frame, the glow now behind his back "
     "outlining the silhouette",
     "A pale marble bust and bare muscular torso of a bearded man facing the viewer, "
     "cloth over the left shoulder, a cold blue starfield behind him, a warm light "
     "raking across the chest from the right, deep shadow opposite"),

    (7, "interior-iluminado",
     "Figura musculosa sentada na METADE ESQUERDA, cortada no joelho, inclinada, mao "
     "perto do queixo; fundo DESFOCADO de templo com vao claro; paleta creme quente",
     "A muscular bearded marble figure seated and leaning forward with one forearm on "
     "his knee and the hand near his chin, occupying the LEFT HALF of the frame and "
     "cropped at the knees, bare chest with cloth over one shoulder and across the "
     "lap, exactly two legs and two arms, behind him a warm cream temple interior with "
     "columns and a bright rectangular opening slightly right of centre, the entire "
     "background clearly OUT OF FOCUS with soft bokeh, shallow depth of field, warm "
     "beige palette",
     "The same seated leaning figure and the same warm blurred temple, but the camera "
     "is now at FLOOR LEVEL looking up along his forearm, the bright opening high in "
     "the frame behind his shoulder, background still out of focus",
     "A muscular bearded marble figure seated close to the camera inside a sunlit "
     "temple hall, exactly two legs and two arms and no additional limbs, filling most "
     "of the frame, tall columns receding behind him, a bright doorway far away "
     "throwing warm light and rimming his shoulders"),

    (8, "estatua-no-pedestal-esculpido",
     "Marmore cinza sobre pedestal ESCULPIDO, sentado, quase monocromatico; fundo "
     "QUASE PRETO com particulas; luz dura pela direita",
     "A grey marble statue of a robed bearded figure seated on top of a CARVED stone "
     "pedestal with relief ornament, positioned centre-right and cropped at the base "
     "of the pedestal, against an almost BLACK background with scattered white "
     "particles and no architecture, hard directional light from the right leaving the "
     "left side in deep shadow, nearly monochrome grey palette, very high contrast",
     "The same seated figure on the same carved pedestal against black, but seen from "
     "a LOW WIDE angle that makes the pedestal tall and the figure small at the top of "
     "the frame, the same hard light from the right",
     "A grey marble statue of a robed seated figure on a tall carved stone pedestal, "
     "isolated against a very dark blue night sky with faint stars, cold even light "
     "with a subtle warm edge, wide framing with the pedestal fully visible"),

    (9, "musculatura-ambar",
     "Torso musculoso cortado no QUADRIL, levemente a esquerda, visto DE BAIXO; fundo "
     "interior AMBAR QUENTE com coluna pálida nas bordas e velas ao fundo",
     "A muscular bearded marble figure cropped at the HIPS, positioned slightly left "
     "of centre and seen from a LOW ANGLE looking up, bare torso with the toga slipping "
     "off the shoulder and gathered at the waist, behind him a warm AMBER interior wall "
     "with a pale column at the left edge and another at the right, small candle flames "
     "glowing low on the right, dominant warm amber palette against the cool grey stone",
     "The same amber-lit muscular figure, same interior, but framed as a TIGHT "
     "close-up on the shoulder and jaw from a high angle looking down, the amber wall "
     "reduced to a soft glow behind",
     "A powerfully built bearded man carved in pale stone, seated with forearms on his "
     "knees, strong amber light from the left sculpting the muscles, marble columns "
     "barely visible in the warm gloom behind, heavy chiaroscuro"),

    (10, "perfil-quente",
     "Cabeca e ombro em tres quartos na METADE DIREITA, pedra cor de MEL, luz quente "
     "pela direita; fundo quase preto com textura de parede",
     "The head and shoulder of a bearded stone figure in three-quarter view, positioned "
     "in the RIGHT HALF of the frame and cropped at the chest, the stone a warm HONEY "
     "BRONZE tone rather than white, heavy drapery over the shoulder, warm light "
     "entering from the right and grazing the brow, nose and beard while the eyes stay "
     "in shadow, the background an almost BLACK interior with only the faint texture of "
     "a wall and the suggestion of a column at the far right",
     "The same honey-toned bearded figure and the same near-black interior, but in "
     "FULL PROFILE facing left, lit from behind so a thin warm rim traces the forehead, "
     "nose and beard against the darkness",
     "Close profile of a bearded man carved in pale stone, warm amber light from the "
     "right grazing the brow and beard, cloth over the shoulder, the background an "
     "almost unlit temple interior with the faintest suggestion of a column"),
]


def variacoes(take):
    """As tres variacoes de um take, na ordem em que sao mostradas."""
    _tid, _slug, _desc, fiel, inter, autoral = take
    return [
        ("fiel", fiel + ", " + ACABAMENTO),
        ("intermediaria", inter + ", " + ACABAMENTO),
        ("autoral", autoral + ", " + ACABAMENTO),
    ]
