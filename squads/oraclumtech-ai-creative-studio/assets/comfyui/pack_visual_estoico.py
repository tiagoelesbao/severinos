# -*- coding: utf-8 -*-
"""Catalogo visual das 6 pecas do canal dark de estoicismo — 39 imagens.

Cada entrada corresponde a um marcador [img NN] num roteiro de
data/roteiros/estoico/. Mudar o roteiro obriga a mudar aqui, e vice-versa.

TEMPLATE — todo prompt carrega, nesta ordem:
  1. enquadramento horizontal declarado ("wide cinematic horizontal composition")
  2. o assunto, com CONTAGEM explicita e APOIO nomeado
     (objeto nao nomeado e objeto inventado; numero nao dito e numero errado)
  3. fundo
  4. luz — e ela que carrega o genero
  5. "clean air" — o v1 tinha "floating dust motes" no prompt e o founder
     reportou aquilo como ruido. O ar limpo agora e pedido de proposito.
  6. textura, chiaroscuro, monocromatico, alto detalhe

NUNCA pedir superficie escrita. Pergaminho entra SEMPRE em branco.
"""

BASE = "Wide cinematic horizontal composition. "
FIM = ("clean air with no floating particles, sharp marble texture, "
       "cinematic chiaroscuro, monochromatic, high detail")

# (peca, n, slug, corpo do prompt)
PACK = [
    # ── A1 · A ordem que muda tudo ──────────────────────────────────────────
    ("A1", 1, "filosofo-sentado",
     "A classical white marble statue of a bearded philosopher seated on a plain "
     "rectangular marble plinth, head lowered in thought, draped toga, exactly two "
     "legs with both bare feet resting flat on the plinth, complete anatomically "
     "correct body, isolated on a pure black background, single dramatic side light"),
    ("A1", 2, "maos-pergaminho-branco",
     "Close-up of two hands carved from white marble, clearly polished stone and not "
     "flesh, holding an open papyrus scroll unrolled flat between them, its surface "
     "completely blank unmarked aged papyrus with no writing of any kind, wooden "
     "scroll rods at each end, isolated on a pure black background, soft raking light"),
    ("A1", 3, "busto-perfil-rasante",
     "A classical white marble bust of a stoic Roman in three-quarter profile, carved "
     "curls and beard, resting on a simple solid rectangular marble pedestal fully "
     "visible and squarely supporting it, isolated on a pure black background, single "
     "hard rim light grazing the face from the left, deep shadow on the right"),
    ("A1", 4, "templo-colunata-noite",
     "Ancient Greek temple colonnade at night, two symmetrical rows of complete "
     "weathered marble columns receding into darkness, every column standing on its "
     "own base and reaching the entablature above, faint starfield, cold moonlight "
     "grazing the stone, heavy atmospheric haze, deep blacks, desaturated"),
    ("A1", 5, "rolos-empilhados",
     "A small stack of closed papyrus scrolls resting on a marble ledge, wooden rods "
     "visible at the ends, no writing anywhere, isolated on a pure black background, "
     "single low warm light from the left, most of the frame in deep shadow"),
    ("A1", 6, "estatua-braco-estendido",
     "A classical white marble statue of a standing draped figure with one arm "
     "extended forward in a restraining gesture, palm open and facing outward, "
     "complete anatomically correct body, isolated on a pure black background, "
     "single dramatic side light, the far half of the body in darkness"),
    # rev.2 — o founder viu "faixa de elemento preto na parte inferior". A cornija
    # reta virou uma barra dura. Trocada por horizonte de ruinas, que integra.
    ("A1", 7, "ceu-sobre-marmore",
     "Wide night sky full of faint stars occupying most of the frame, along the "
     "bottom a distant horizon of ancient marble ruins in silhouette with an "
     "irregular broken skyline, no straight horizontal band anywhere, cold "
     "moonlight, heavy atmospheric haze, deep blacks, desaturated"),

    # ── A2 · O que não depende de você ──────────────────────────────────────
    ("A2", 1, "busto-olhar-baixo",
     "A classical white marble bust of a bearded man with the gaze cast downward, "
     "resting on a simple solid rectangular marble pedestal fully visible and "
     "squarely supporting it, isolated on a pure black background, single soft light "
     "from above, deep shadow beneath the brow"),
    # rev.2 — sairam maos de PELE. "not flesh" no fim do prompt nao segurou; o
    # material precisa vir junto do substantivo e ser repetido.
    ("A2", 2, "duas-maos-aberta-fechada",
     "A marble sculpture of two hands, carved solid white marble with visible stone "
     "veining and chisel marks, matte carved stone surface, exactly two hands, the "
     "left one open with the palm facing up and the right one closed into a fist, "
     "both hands are part of the same stone sculpture, isolated on a pure black "
     "background, single directional light from the left"),
    ("A2", 3, "corrente-quebrada",
     "The lower part of a classical white marble statue, draped legs and bare feet "
     "on a plain plinth, a heavy broken iron chain lying loose on the plinth beside "
     "the feet, isolated on a pure black background, single low light raking across "
     "the stone and the metal"),
    # rev.2 — o founder viu "papiro pequeno e tudo preto em volta". O assunto tem
    # que OCUPAR o quadro; fundo preto nao e composicao, e sobra.
    ("A2", 4, "pergaminho-dividido-pela-luz",
     "Overhead close-up of an open papyrus scroll filling almost the entire frame, "
     "its face completely blank unmarked aged papyrus with no writing of any kind, "
     "resting on a marble surface that fills the remaining edges, a hard diagonal "
     "beam of light crossing the sheet and splitting it into a lit half and a "
     "shadowed half, tight framing with no empty background"),
    # rev.2 — mesma correcao de material do img 02
    ("A2", 5, "maos-soltando",
     "A marble sculpture of two hands, carved solid white marble with visible stone "
     "veining and chisel marks, matte carved stone surface, the hands opening "
     "downward as if releasing something, fingers spread, palms facing the floor, "
     "isolated on a pure black background, single directional light from above"),
    ("A2", 6, "estatua-passo-firme",
     "A classical white marble statue of a draped figure caught mid-stride walking "
     "forward, exactly two legs, complete anatomically correct body, isolated on a "
     "pure black background, single hard light from the left leaving the entire right "
     "half of the body in darkness"),
    ("A2", 7, "colunata-ao-longe",
     "A distant ancient Greek colonnade seen far away at night, complete columns "
     "each standing on its own base and reaching the entablature, small in the frame, "
     "wide empty starfield above, cold moonlight, heavy haze, deep blacks, desaturated"),

    # ── A3 · A morte como conselheira ───────────────────────────────────────
    ("A3", 1, "busto-meia-face",
     "A classical white marble bust of a bearded man lit so that exactly half of the "
     "face is illuminated and the other half falls into complete darkness, resting on "
     "a simple solid rectangular marble pedestal fully visible, isolated on a pure "
     "black background, single hard side light"),
    ("A3", 2, "ampulheta-de-pedra",
     "A stone hourglass standing upright on a marble surface, carved stone frame, "
     "sand visible inside the glass, isolated on a pure black background, single warm "
     "light from the side, the rest of the frame in deep shadow"),
    ("A3", 3, "estatua-olhando-longe",
     "A classical white marble statue of a draped figure in profile looking far into "
     "the distance, chin slightly raised, complete anatomically correct body, "
     "isolated on a pure black background, single cold light from behind creating a "
     "thin rim along the profile"),
    ("A3", 4, "maos-sobre-o-peito",
     "Two hands carved from white marble resting crossed over the chest of a draped "
     "figure, fingers relaxed, clearly polished stone and not flesh, isolated on a "
     "pure black background, soft light from above, deep shadow below"),
    ("A3", 5, "duas-figuras-uma-de-costas",
     "Two classical white marble statues standing apart against a pure black "
     "background, exactly two figures, one facing the viewer and the other turned "
     "away showing its back, both complete and anatomically correct, single cold "
     "light from the left"),
    ("A3", 6, "pergaminho-a-luz-de-vela",
     "An open papyrus scroll lying on a rough stone table, its surface completely "
     "blank unmarked aged papyrus with no writing of any kind, a single lit candle "
     "beside it casting warm light, everything else in deep darkness"),
    ("A3", 7, "uma-coluna-de-pe",
     "A single complete marble column standing alone under a wide night sky, the "
     "column resting on its own base and topped by a capital, faint starfield above, "
     "cold moonlight, empty horizon, heavy haze, deep blacks, desaturated"),

    # ── B1 · Três reflexões para escutar toda manhã ─────────────────────────
    # rev.2 — "muito abstrato". Faltava ASSUNTO: um plano de cor nao sustenta 20 s.
    ("B1", 1, "alvorada-no-marmore",
     "A classical white marble bust of a bearded man catching the first warm light "
     "of dawn on one side of the face, resting on a simple solid rectangular marble "
     "pedestal fully visible, deep blue pre-dawn darkness all around, the amber light "
     "touching only the edge of the stone, wide shot with the bust clearly the subject"),
    ("B1", 2, "busto-olhos-fechados",
     "A classical white marble bust of a serene bearded man with the eyes closed, "
     "resting on a simple solid rectangular marble pedestal fully visible, isolated "
     "on a pure black background, soft warm light from the left, gentle shadow"),
    ("B1", 3, "rosto-sereno-meia-luz",
     "Close-up of the face of a classical white marble statue with calm relaxed "
     "features, softly lit from one side with the other side falling into shadow, "
     "isolated on a pure black background, smooth polished stone"),
    ("B1", 4, "palmas-para-cima",
     "Two hands carved from white marble held open with both palms facing upward in "
     "a receiving gesture, exactly two hands, clearly polished stone and not flesh, "
     "isolated on a pure black background, soft warm light from above"),
    ("B1", 5, "colunata-amanhecer",
     "Ancient Greek colonnade at dawn, complete marble columns each on its own base "
     "reaching the entablature, low warm sunlight entering from the left between the "
     "columns, low mist along the ground, cool blue shadows, wide shot"),
    # rev.2 — mesmo problema: ceu sozinho nao e take, e fundo.
    ("B1", 6, "ceu-clareando",
     "A brightening dawn sky behind an ancient Greek colonnade seen in silhouette, "
     "complete marble columns each on its own base reaching the entablature, the sky "
     "graduating from deep blue to pale gold between the columns, a few remaining "
     "stars, low mist at the base, wide shot"),

    # ── B2 · Três reflexões para os dias difíceis ───────────────────────────
    # rev.2 — "pilar misturado com estatua, meio confuso". "fragment" convidou o
    # modelo a fundir duas coisas. Agora e UMA estatua inteira, e so ela.
    ("B2", 1, "marmore-sob-ceu-carregado",
     "One single complete classical white marble statue of a standing draped figure "
     "under a heavy overcast sky, only one statue in the frame and no columns or "
     "architecture of any kind, dark storm clouds filling the upper half, cold "
     "diffused light with no direct sun, the pale stone standing out against the "
     "darkness, wide shot, desaturated"),
    ("B2", 2, "rosto-parcialmente-na-sombra",
     "Close-up of the face of a classical white marble statue with roughly two thirds "
     "of the face swallowed by shadow and only a narrow strip lit, isolated on a pure "
     "black background, single hard light from the far left"),
    ("B2", 3, "pedra-bruta-e-coluna",
     "A rough unworked block of stone resting on the ground beside a finished "
     "polished marble column, both complete, the contrast between raw and carved "
     "clearly visible, isolated on a pure black background, single side light"),
    ("B2", 4, "pedestal-vazio",
     "An empty rectangular marble pedestal with nothing standing on it, the flat top "
     "clearly visible, isolated on a pure black background, single hard light from "
     "above casting a sharp shadow, most of the frame empty and dark"),
    ("B2", 5, "marmore-marcado-pelo-tempo",
     "Close-up of aged weathered white marble showing natural veining, worn edges and "
     "the patina of centuries, no damage or cracks, isolated on a pure black "
     "background, raking light revealing the surface relief"),
    ("B2", 6, "luz-voltando-na-colunata",
     "Ancient Greek colonnade as light returns after a storm, complete marble columns "
     "each on its own base reaching the entablature, a break in the dark clouds "
     "letting one shaft of light down onto the stone floor, wet reflections, wide shot"),

    # ── B3 · Três reflexões para antes de dormir ────────────────────────────
    ("B3", 1, "marmore-sob-a-lua",
     "A white marble statue lit only by moonlight under a clear night sky, cold blue "
     "light along the top surfaces, deep shadow everywhere else, faint stars above, "
     "wide shot, desaturated"),
    ("B3", 2, "busto-em-penumbra",
     "A classical white marble bust barely emerging from darkness, resting on a "
     "simple solid rectangular marble pedestal, isolated on a pure black background, "
     "a single very low light source revealing only the edge of the face"),
    ("B3", 3, "pergaminho-vela",
     "An open papyrus scroll on a stone table lit by one candle, its surface "
     "completely blank unmarked aged papyrus with no writing of any kind, warm "
     "flickering light close to the sheet, the rest of the frame in complete darkness"),
    ("B3", 4, "maos-soltando-no-escuro",
     "Two hands carved from white marble opening and letting go, fingers relaxed and "
     "spread, clearly polished stone and not flesh, isolated on a pure black "
     "background, single dim light from below, deep shadow above"),
    ("B3", 5, "colunata-sob-estrelas",
     "Ancient Greek colonnade under a full starfield at night, complete marble "
     "columns each on its own base reaching the entablature, the milky way visible "
     "above, cold starlight on the stone, heavy haze, deep blacks, wide shot"),
    ("B3", 6, "ponto-de-luz-no-escuro",
     "A white marble surface almost entirely in darkness with one small point of warm "
     "light touching it, the rest of the frame completely black, minimal composition, "
     "the single highlight is the only detail"),
]


def prompt_de(corpo):
    return BASE + corpo + ", " + FIM
