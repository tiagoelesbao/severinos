# -*- coding: utf-8 -*-
"""Gera os packs do lote dos dois canais dark do TikTok.

O QUE ESTE ARQUIVO E
  A ESPECIFICACAO do lote e o gerador que a transforma em pack. Cada peca e
  descrita aqui em poucas linhas -- titulo, itens da contagem (ou blocos da
  placa), consultas de acervo com o que cada uma exige, e as camadas. O script
  escreve `01-roteiro/roteiro.md` e `curto.yaml` no formato que o motor come.

POR QUE UM GERADOR, E NAO QUINZE YAML A MAO
  Quinze pecas com sete a doze consultas cada da mais de cem linhas de YAML em
  que um `exige` esquecido volta como take errado na tela. Pior: o formato e o
  mesmo em todas, entao a mao repetiria cem vezes a mesma estrutura e erraria
  em duas. Aqui a estrutura mora no gerador e a peca declara so o que muda.

A FORMA VEM DO BENCHMARK, O CONTEUDO E NOSSO
  Ver `docs/MODELAGEM-LOTE-08-09.md`: a decomposicao dos 15 videos modelados. A
  gramatica (contagem regressiva, seis blocos da placa, ritmo) e de nicho; os
  assuntos e as frases abaixo sao nossos, e os fatos sao de historia natural
  amplamente documentada. Onde nao havia certeza do numero, escrevemos a faixa.

USO
    python lote_dark.py --lista
    python lote_dark.py CUR-l02
    python lote_dark.py --todos --canal curiosidades
"""
import argparse
import io
import os
import re
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RAIZ = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
CANAIS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                      "creative-studio", "canais")
PASTA = {"curiosidades": "curiosidades-animais", "avisos": "placas-de-aviso"}


def _sem_acento(t):
    t = unicodedata.normalize("NFD", t)
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


# ═══════════════════════════════════════════════════════════════════════════
# CANAL DE CURIOSIDADES — a contagem regressiva
# ═══════════════════════════════════════════════════════════════════════════
#
# `itens` vai do MAIOR numero para o 1, como no modelo. Cada item traz:
#   nome     o que a locucao diz depois de "Numero N"
#   texto    as duas frases de explicacao
#   q        consulta de acervo
#   exige    o que a descricao do Pexels tem de citar. SO O SUJEITO, NUNCA O
#            CENARIO -- `[shrimp, mantis, reef]` aceitou "coral-reef",
#            "reef-shark" e "seahorse-in-reef" no bloco do camarao-louva-a-deus.
#            A palavra de cena e a que o banco tem aos milhares, entao ela e a
#            que passa. Mesma familia do veto largo que comia `street-dog`.
#   imagem   (opcional) prompt de geracao, quando o banco nao tem a especie
CUR = {
    "CUR-l02-enxergam-40s": {
        "titulo": "Animais que enxergam o que a gente não vê",
        "hook": ("photorealistic extreme macro of a mantis shrimp on a coral "
                 "reef, iridescent shell, stalked compound eyes turned toward "
                 "the camera, vivid blue water, natural light, wildlife "
                 "documentary still, vertical composition"),
        "itens": [
            ("Quatro", "o camarão-louva-a-deus",
             "Ele tem um dos olhos mais complexos que se conhece. Enquanto "
             "a gente enxerga com três tipos de célula de cor, ele usa mais "
             "de dez.",
             "mantis shrimp reef close up", ["mantis"],
             "photorealistic macro photograph of a peacock mantis shrimp on a "
             "coral reef, bright green and orange shell, stalked eyes, clear "
             "blue water, wildlife documentary still, vertical composition"),
            ("Três", "a abelha",
             "A abelha enxerga ultravioleta. As flores têm marcas invisíveis "
             "para nós que funcionam como uma pista de pouso para ela.",
             "bee on flower macro", ["bee", "bees"], None),
            ("Dois", "a cobra da família dos crotalíneos",
             "Entre o olho e a narina ela tem uma fosseta que sente calor. "
             "Ela caça no escuro enxergando o corpo quente da presa.",
             "pit viper snake close up", ["viper", "rattlesnake"],
             "photorealistic macro photograph of a pit viper coiled on forest "
             "floor leaves at night, heat-sensing pit visible between eye and "
             "nostril, keeled scales, dark background, wildlife documentary "
             "still, vertical composition"),
            ("Um", "a coruja",
             "O olho dela é tão grande que quase não gira na órbita. Por isso "
             "ela vira a cabeça inteira, e enxerga com pouquíssima luz.",
             "owl at night close up", ["owl"], None),
        ],
        "fecho": "Comenta aí qual desses tu queria ter por um dia.",
        "fecho_q": ("night forest sky stars", ["forest", "night", "sky"]),
    },
    "CUR-l03-venenosos-40s": {
        "titulo": "Os animais mais venenosos do mundo",
        "hook": ("photorealistic macro of a translucent box jellyfish "
                 "drifting in dark blue ocean water, long trailing "
                 "tentacles, shafts of light from above, wildlife "
                 "documentary still, vertical composition"),
        "itens": [
            ("Quatro", "o polvo-de-anéis-azuis",
             "Ele cabe na palma da mão e os anéis só brilham quando ele está "
             "ameaçado. O veneno dele não tem antídoto conhecido.",
             "blue ringed octopus", ["octopus"],
             "photorealistic macro photograph of a blue-ringed octopus on "
             "sand underwater, vivid electric blue rings glowing on yellow "
             "skin, shallow tropical water, wildlife documentary still, "
             "vertical composition"),
            ("Três", "o peixe-pedra",
             "Ele passa a vida imóvel no fundo, igualzinho a uma pedra. "
             "Quem pisa em cima acerta treze espinhos de veneno.",
             "stonefish underwater reef", ["stonefish"],
             "photorealistic underwater photograph of a stonefish camouflaged "
             "among rocks on the seabed, mottled brown skin, dorsal spines "
             "raised, tropical reef, wildlife documentary still, vertical "
             "composition"),
            ("Dois", "a rã-dourada",
             "Ela tem uns cinco centímetros e a pele carrega veneno "
             "suficiente para matar vários adultos. Ela nem precisa morder.",
             "golden poison dart frog", ["frog", "poison"],
             "photorealistic macro photograph of a golden poison dart frog on "
             "a wet leaf in the rainforest, brilliant yellow skin, shallow "
             "depth of field, wildlife documentary still, vertical "
             "composition"),
            ("Um", "a vespa-do-mar",
             "É uma água-viva quase transparente do Pacífico. O veneno dela "
             "ataca coração e sistema nervoso em minutos.",
             "box jellyfish swimming", ["jellyfish"], None),
        ],
        "fecho": "Comenta aí se tu já viu algum desses de perto.",
        "fecho_q": ("deep ocean blue water", ["ocean", "water", "underwater"]),
    },
    "CUR-l04-cem-anos-40s": {
        "titulo": "Animais que vivem mais de cem anos",
        "hook": ("photorealistic close-up portrait of a giant Galapagos "
                 "tortoise, deeply wrinkled ancient skin, old shell, dry "
                 "grass background, warm late afternoon light, wildlife "
                 "documentary still, vertical composition"),
        "itens": [
            ("Quatro", "a tartaruga-gigante",
             "Ela passa dos cem anos com folga. Algumas registradas em "
             "cativeiro chegaram perto dos duzentos.",
             "giant tortoise walking", ["tortoise", "turtle"], None),
            ("Três", "a baleia-da-groenlândia",
             "É o mamífero que mais vive de que se tem registro. Estimativas "
             "colocam alguns indivíduos acima dos duzentos anos.",
             "whale swimming arctic ocean", ["whale"], None),
            ("Dois", "o tubarão-da-groenlândia",
             "Ele cresce cerca de um centímetro por ano. Só isso já indica "
             "uma vida de séculos, e ele amadurece perto dos cento e "
             "cinquenta.",
             "shark swimming deep cold water", ["shark"], None),
            ("Um", "a esponja-do-mar",
             "Parece pedra, mas é bicho. Algumas colônias de águas frias "
             "passam de mil anos.",
             "sea sponge underwater reef", ["sponge"],
             "photorealistic underwater photograph of a large barrel sponge on "
             "a deep cold rocky seabed, coarse porous surface, dim blue-green "
             "light, wildlife documentary still, vertical composition"),
        ],
        "fecho": "Comenta aí qual desses tu achou mais absurdo.",
        "fecho_q": ("underwater rocks cold sea", ["underwater", "sea", "rock"]),
    },
    "CUR-l05-defesa-40s": {
        "titulo": "Bichos que se defendem de um jeito absurdo",
        "hook": ("photorealistic macro photograph of a horned lizard on hot "
                 "desert sand, spiky scaled body, defensive posture, harsh "
                 "midday light, wildlife documentary still, vertical "
                 "composition"),
        "itens": [
            ("Quatro", "o besouro-bombardeiro",
             "Ele mistura duas substâncias dentro do próprio corpo e dispara "
             "um jato quente na cara do predador. O barulho dá para ouvir.",
             "beetle macro close up", ["beetle", "insect"], None),
            ("Três", "o lagarto-cornudo",
             "Quando as outras defesas falham, ele aumenta a pressão nos "
             "vasos perto do olho até esguichar sangue. O gosto espanta "
             "canídeos.",
             "horned lizard desert", ["lizard"],
             "photorealistic macro photograph of a horned lizard on hot "
             "desert sand, spiky scaled body, flat wide posture, harsh midday "
             "light, wildlife documentary still, vertical composition"),
            ("Dois", "o pepino-do-mar",
             "Ameaçado, ele expulsa parte das próprias vísceras, que "
             "enrolam o predador. Depois ele regenera o que perdeu.",
             "sea cucumber underwater", ["cucumber"],
             "photorealistic underwater photograph of a sea cucumber on the "
             "sandy seabed, dark warty body, tube feet visible, clear shallow "
             "water, wildlife documentary still, vertical composition"),
            ("Um", "a lagartixa de cauda destacável",
             "A cauda se solta e continua se mexendo sozinha por minutos. "
             "Enquanto o predador olha para ela, a lagartixa sumiu.",
             "gecko lizard on wall", ["gecko", "lizard"],
             "photorealistic macro photograph of a gecko on a rough stone "
             "wall, detached tail lying nearby on the ground, warm evening "
             "light, wildlife documentary still, vertical composition"),
        ],
        "fecho": "Comenta aí qual defesa tu acha mais bizarra.",
        "fecho_q": ("desert rocks dry landscape", ["desert", "rock", "sand"]),
    },
    "CUR-l06-predadores-rio-40s": {
        "titulo": "Os maiores predadores dos rios",
        "hook": ("photorealistic wildlife photograph of a huge black caiman "
                 "surfacing in a muddy amazon river at dusk, only eyes and "
                 "snout above the water, dense jungle bank behind, "
                 "documentary still, vertical composition"),
        "itens": [
            ("Quatro", "a piraíba",
             "É um bagre gigante da Amazônia que passa dos dois metros. "
             "Ele engole peixes inteiros do tamanho de um braço.",
             "large catfish underwater river", ["catfish"],
             "photorealistic underwater photograph of a giant catfish in a "
             "murky amazon river, long barbels, broad flat head, greenish "
             "water, wildlife documentary still, vertical composition"),
            ("Três", "o peixe-tigre-golias",
             "Vive no rio Congo e tem dentes que parecem de tubarão. "
             "Chega perto de um metro e meio.",
             "tiger fish river africa", ["tigerfish"],
             "photorealistic underwater photograph of a goliath tigerfish in "
             "a dark african river, large interlocking teeth visible, silver "
             "scales, murky green water, wildlife documentary still, vertical "
             "composition"),
            ("Dois", "o jacaré-açu",
             "É o maior predador dos rios amazônicos e passa dos cinco "
             "metros. Ele caça praticamente qualquer coisa que entre na água.",
             "caiman alligator in river", ["caiman", "alligator", "crocodile"],
             None),
            ("Um", "a sucuri",
             "É a serpente mais pesada do mundo. Ela não morde para matar: "
             "enrola e aperta cada vez que a presa solta o ar.",
             "anaconda large snake water", ["anaconda"],
             "photorealistic wildlife photograph of a huge green anaconda "
             "partially submerged in a muddy amazon river, thick coils above "
             "the water surface, dense vegetation on the bank, overcast "
             "daylight, telephoto documentary still, vertical composition"),
        ],
        "fecho": "Comenta aí qual desses tu não queria encontrar.",
        "fecho_q": ("amazon river aerial jungle", ["river", "jungle",
                                                   "rainforest", "forest"]),
    },
    "CUR-l07-mudam-cor-40s": {
        "titulo": "Animais que mudam de cor",
        "hook": ("photorealistic macro photograph of a chameleon on a branch "
                 "with vivid turquoise and orange skin, textured scales, "
                 "eye turned to camera, blurred green jungle behind, "
                 "wildlife documentary still, vertical composition"),
        "itens": [
            ("Quatro", "o camaleão",
             "Ele não muda de cor para se esconder, como muita gente pensa. "
             "Muda para regular temperatura e para se comunicar.",
             "chameleon on branch close up", ["chameleon"], None),
            ("Três", "o linguado",
             "Ele copia o fundo em segundos, inclusive padrões de xadrez em "
             "teste de laboratório. E enterra as bordas na areia.",
             "flatfish camouflage sand seabed", ["flounder", "flatfish"],
             "photorealistic underwater photograph of a flounder lying "
             "camouflaged on a sandy seabed, both eyes on the upper side, "
             "body edges buried in sand, clear water, wildlife documentary "
             "still, vertical composition"),
            ("Dois", "a lebre-do-ártico",
             "No verão ela é marrom e no inverno fica branca. A troca é "
             "disparada pela duração do dia, não pela neve.",
             "arctic hare snow", ["hare", "rabbit"],
             "photorealistic wildlife photograph of an arctic hare with pure "
             "white winter coat sitting on snow, black ear tips, soft overcast "
             "polar light, wildlife documentary still, vertical composition"),
            ("Um", "o polvo",
             "Ele muda cor e textura da pele ao mesmo tempo, em menos de um "
             "segundo. E faz isso sendo daltônico.",
             "octopus camouflage reef", ["octopus"],
             "photorealistic underwater photograph of an octopus on a coral "
             "reef changing skin colour and texture, mottled red and white "
             "pattern, arms spread over rock, clear water, wildlife "
             "documentary still, vertical composition"),
        ],
        "fecho": "Comenta aí qual troca de cor te impressiona mais.",
        "fecho_q": ("coral reef underwater colorful", ["reef", "coral",
                                                       "underwater"]),
    },
    "CUR-l08-barulhentos-40s": {
        "titulo": "Os bichos mais barulhentos do planeta",
        "hook": ("photorealistic wildlife photograph of a howler monkey "
                 "roaring on a branch, mouth wide open, throat inflated, "
                 "dense rainforest canopy behind, early morning light, "
                 "documentary still, vertical composition"),
        "itens": [
            ("Quatro", "o bugio",
             "O grito dele viaja mais de três quilômetros pela mata. O "
             "segredo é um osso oco na garganta que funciona como caixa de "
             "som.",
             "howler monkey rainforest", ["howler", "monkey"],
             None),
            ("Três", "a cigarra",
             "Ela não canta pela boca: vibra membranas na lateral do corpo. "
             "Um coro de cigarras passa do barulho de uma moto.",
             "cicada insect macro tree", ["cicada", "insect"],
             "photorealistic extreme macro photograph of a cicada clinging to "
             "tree bark, transparent veined wings, large red eyes, dappled "
             "forest light, shallow depth of field, wildlife documentary "
             "still, vertical composition"),
            ("Dois", "o camarão-pistola",
             "Ele fecha a garra tão rápido que cria uma bolha que estoura. "
             "O estalo é um dos sons mais altos do oceano.",
             "pistol shrimp reef underwater", ["shrimp"],
             "photorealistic macro photograph of a pistol shrimp at its "
             "burrow on a coral reef, one oversized claw raised, sandy "
             "seabed, clear water, wildlife documentary still, vertical "
             "composition"),
            ("Um", "o cachalote",
             "O clique de ecolocalização dele é o som mais alto já medido "
             "num animal. Ele usa isso para caçar lula no escuro absoluto.",
             "sperm whale deep ocean", ["whale"], None),
        ],
        "fecho": "Comenta aí qual desses tu já ouviu ao vivo.",
        "fecho_q": ("rainforest canopy trees", ["rainforest", "forest",
                                                "jungle"]),
    },
    "CUR-l09-sem-agua-40s": {
        "titulo": "Animais que quase não precisam beber água",
        "hook": ("photorealistic wildlife photograph of a kangaroo rat on hot "
                 "desert sand at dusk, large eyes and ears, sparse dry "
                 "shrubs, warm low light, macro documentary still, vertical "
                 "composition"),
        "itens": [
            ("Quatro", "o coala",
             "Ele tira quase toda a água das folhas de eucalipto. O nome "
             "dele, em uma língua aborígene, é ligado a isso.",
             "koala eucalyptus tree", ["koala"], None),
            ("Três", "o camelo",
             "A corcova é gordura, não água. O truque dele é aguentar perder "
             "muito líquido do corpo sem passar mal.",
             "camel desert walking", ["camel"], None),
            ("Dois", "o besouro-do-deserto-da-namíbia",
             "Ele sobe a duna de madrugada e vira o corpo contra a neblina. "
             "A água condensa nas costas e escorre até a boca.",
             "beetle desert sand dune", ["beetle"],
             "photorealistic macro photograph of a darkling beetle standing "
             "head-down on a namib sand dune at dawn, fog droplets on its "
             "back, rippled sand, wildlife documentary still, vertical "
             "composition"),
            ("Um", "o rato-canguru",
             "Ele passa a vida inteira sem beber. Toda a água que precisa "
             "sai da digestão das sementes que come.",
             "kangaroo rat desert night", ["rat", "rodent"],
             "photorealistic macro photograph of a kangaroo rat on desert "
             "sand at night, large dark eyes, long tail, sparse dry "
             "vegetation, wildlife documentary still, vertical composition"),
        ],
        "fecho": "Comenta aí quantos dias tu aguentaria.",
        "fecho_q": ("desert dunes sunset", ["desert", "dune", "sand"]),
    },
}


# ═══════════════════════════════════════════════════════════════════════════
# CANAL DE PLACAS — os seis blocos
# ═══════════════════════════════════════════════════════════════════════════
#
# A ordem e a funcao de cada bloco vem de `docs/MODELAGEM-LOTE-08-09.md`:
# placa+ordem, reacao, isca+CTA, insert emocional, pedido de coracao, payoff.
#
# `rima` e o nosso desvio do modelo: o insert emocional tem a MESMA condicao do
# assunto da placa. Nos videos medidos essa rima existe, e e o que faz o insert
# nao parecer enxerto.
AVI = {
    "AVI-l02-canguru-40s": {
        "placa": "travessia de cangurus",
        "pict": "cuidado-bicho",
        "onde": "numa estrada da Austrália",
        "leitura": "Bro, tem bicho pulando na placa?",
        "hook": ("photorealistic photograph of an empty straight outback road "
                 "cutting through red desert scrub at dawn, no signs, no "
                 "people, no vehicles, wide empty sky filling the upper half, "
                 "documentary landscape photography, vertical composition, "
                 "uncluttered"),
        "rima": "bicho que atravessa a estrada no escuro",
        "payoff": [
            "A placa é real e existe às centenas na Austrália.",
            "Canguru enxerga mal contra farol e congela no meio da pista. "
            "É por isso que o aviso é de reduzir, não de desviar.",
            "Desviar em alta velocidade mata mais gente do que o próprio "
            "impacto.",
        ],
        "consultas": [
            ("empty outback road australia", "cenario-estrada", 3,
             ["road", "highway", "outback", "desert"]),
            ("kangaroo in the wild", "reativo", 3, ["kangaroo", "wallaby"]),
            ("kangaroo grass field", "fofo", 2, ["kangaroo", "wallaby"]),
            ("banco:inserts-emocionais", "dependente", 1, ["banco"]),
            ("car driving on outback road", "payoff", 2,
             ["car", "road", "driving"]),
        ],
    },
    "AVI-l03-pinguim-40s": {
        "placa": "cuidado com os pinguins",
        "pict": "cuidado-bicho",
        "onde": "numa rua perto da praia",
        "leitura": "Bro, pinguim atravessando rua?",
        "hook": ("photorealistic photograph of an empty coastal road beside a "
                 "sandy beach at sunrise, no signs, no people, no vehicles, "
                 "calm sea and open sky in the upper half, documentary "
                 "landscape photography, vertical composition, uncluttered"),
        "rima": "bicho que perdeu o medo de rua movimentada",
        "payoff": [
            "A placa é real, e existe em cidades costeiras da África do Sul "
            "e da Nova Zelândia.",
            "Colônias inteiras de pinguim vivem coladas em bairro humano e "
            "atravessam a rua todo dia para chegar ao mar.",
            "O aviso não é piada: atropelamento é a principal causa de morte "
            "dessas colônias urbanas.",
        ],
        "consultas": [
            ("coastal road beach empty", "cenario-estrada", 3,
             ["road", "coast", "beach"]),
            ("penguin colony beach", "reativo", 3, ["penguin"]),
            ("penguin walking sand", "fofo", 2, ["penguin"]),
            ("banco:inserts-emocionais", "dependente", 1, ["banco"]),
            ("ocean waves rocks coast", "payoff", 2,
             ["ocean", "sea", "wave", "coast"]),
        ],
    },
    "AVI-l04-coco-40s": {
        "placa": "cuidado com a queda de cocos",
        "pict": "nao-toque",
        "onde": "numa praia de coqueiro",
        "leitura": "Bro, coco caindo é aviso de placa mesmo?",
        "hook": ("photorealistic photograph of an empty tropical beach with "
                 "tall coconut palms, white sand, calm turquoise sea, no "
                 "people, no signs, open bright sky in the upper half, "
                 "documentary travel photography, vertical composition, "
                 "uncluttered"),
        "rima": "bicho que dorme embaixo da árvore errada",
        "payoff": [
            "A placa é real e está em resort e praia pública do mundo "
            "inteiro.",
            "Um coco maduro pesa perto de dois quilos e cai de mais de vinte "
            "metros. A conta de energia no impacto é séria.",
            "É por isso que muita prefeitura poda os cachos antes da "
            "temporada, em vez de só avisar.",
        ],
        "consultas": [
            ("tropical beach coconut palm trees", "cenario-estrada", 3,
             ["beach", "palm", "coconut", "tropical"]),
            ("dog sleeping under tree shade", "reativo", 3,
             ["dog", "puppy"]),
            ("cat sleeping beach sand", "fofo", 2, ["cat", "kitten"]),
            ("banco:inserts-emocionais", "dependente", 1, ["banco"]),
            ("coconut palm tree top wind", "payoff", 2,
             ["palm", "coconut", "tree"]),
        ],
    },
    "AVI-l05-bisao-40s": {
        "placa": "não chegue perto do bisão",
        "pict": "pessoa-bracos",
        "onde": "na entrada de um parque nacional",
        "leitura": "Bro, essa placa mostra gente sendo jogada pro alto?",
        "hook": ("photorealistic photograph of an empty gravel road entering a "
                 "wide open national park meadow at sunrise, distant tree "
                 "line, no signs, no people, no animals, big empty sky in the "
                 "upper half, documentary landscape photography, vertical "
                 "composition, uncluttered"),
        "rima": "bicho que perde o medo de gente e paga por isso",
        "payoff": [
            "A placa é real e está em Yellowstone, com o desenho de um bisão "
            "jogando uma pessoa para o alto.",
            "O bisão pesa quase uma tonelada e corre a mais de cinquenta por "
            "hora. Ele parece lento porque está pastando.",
            "Quase todo acidente ali começa igual: alguém se aproximando "
            "para tirar foto.",
        ],
        "consultas": [
            ("national park meadow road", "cenario-estrada", 3,
             ["park", "meadow", "road", "field"]),
            ("bison grazing field", "reativo", 3, ["bison", "buffalo"]),
            ("bison herd walking", "fofo", 2, ["bison", "buffalo"]),
            ("banco:inserts-emocionais", "dependente", 1, ["banco"]),
            ("open plains grass wind", "payoff", 2,
             ["plain", "grass", "field", "meadow"]),
        ],
    },
    "AVI-l06-patos-40s": {
        "placa": "atenção: patos atravessando",
        "pict": "cuidado-bicho",
        "onde": "numa estrada de campo",
        "leitura": "Bro, pato tem placa própria?",
        "hook": ("photorealistic photograph of an empty narrow country road "
                 "beside a calm pond at dawn, soft mist over the water, no "
                 "signs, no people, no vehicles, pale open sky in the upper "
                 "half, documentary landscape photography, vertical "
                 "composition, uncluttered"),
        "rima": "bicho pequeno que atravessa em fila e não vê o carro",
        "payoff": [
            "A placa é real e existe em qualquer estrada que passe perto de "
            "lago ou açude.",
            "A pata atravessa com a ninhada em fila e não desvia por nada. "
            "Ela não enxerga o carro como perigo.",
            "O aviso não é sobre o pato: é sobre o motorista que freia de "
            "uma vez e é atingido por trás.",
        ],
        "consultas": [
            ("country road pond countryside", "cenario-estrada", 3,
             ["road", "country", "pond", "lake"]),
            ("ducks walking in a row", "reativo", 3, ["duck", "ducks"]),
            ("ducklings following mother", "fofo", 2,
             ["duckling", "duck", "ducks"]),
            ("banco:inserts-emocionais", "dependente", 1, ["banco"]),
            ("calm lake water morning", "payoff", 2,
             ["lake", "pond", "water"]),
        ],
    },
    "AVI-l07-tsunami-40s": {
        "placa": "rota de fuga de tsunami",
        "pict": "pessoa-bracos",
        "onde": "numa cidade de praia",
        "leitura": "Bro, essa placa mostra uma onda em cima de gente correndo?",
        "hook": ("photorealistic photograph of an empty seaside street at "
                 "dawn, low buildings on both sides, the sea visible at the "
                 "end of the street, no signs, no people, no vehicles, pale "
                 "empty sky in the upper half, documentary photography, "
                 "vertical composition, uncluttered"),
        "rima": "bicho que sente o que a gente ainda não sentiu",
        "payoff": [
            "A placa é real e existe em toda a costa do Pacífico.",
            "Ela não avisa que vem tsunami: ela mostra por onde subir, e "
            "para onde correr, quando o chão tremer.",
            "A regra que ela representa é simples: sentiu terremoto perto do "
            "mar, sobe. Não espera sirene.",
        ],
        "consultas": [
            ("empty seaside street town", "cenario-estrada", 3,
             ["street", "coast", "town", "seaside"]),
            ("dog looking at the sea", "reativo", 3, ["dog", "puppy"]),
            ("birds flying away from shore", "fofo", 2,
             ["bird", "birds", "seagull"]),
            ("banco:inserts-emocionais", "dependente", 1, ["banco"]),
            ("ocean waves crashing coast", "payoff", 2,
             ["wave", "ocean", "sea"]),
        ],
    },
    "AVI-l08-hipopotamo-40s": {
        "placa": "cuidado com hipopótamos",
        "pict": "cuidado-bicho",
        "onde": "na beira de um rio africano",
        "leitura": "Bro, hipopótamo é perigoso mesmo?",
        "hook": ("photorealistic photograph of a calm wide african river at "
                 "dusk, muddy banks and reeds, no animals, no people, no "
                 "signs, warm empty sky filling the upper half, documentary "
                 "landscape photography, vertical composition, uncluttered"),
        "rima": "bicho que parece manso e não é",
        "payoff": [
            "A placa é real e está em rio e lago de vários países africanos.",
            "O hipopótamo é herbívoro, mas é territorial, corre mais que "
            "gente em terra firme e mata mais pessoas por ano do que leão.",
            "O aviso é sobre a margem: o perigo não é entrar na água, é "
            "ficar entre ele e ela.",
        ],
        "consultas": [
            ("african river bank reeds", "cenario-estrada", 3,
             ["river", "bank", "africa", "water"]),
            ("hippo in the water", "reativo", 3, ["hippo",
                                                  "hippopotamus"]),
            ("hippo yawning open mouth", "fofo", 2,
             ["hippo", "hippopotamus"]),
            ("banco:inserts-emocionais", "dependente", 1, ["banco"]),
            ("african river sunset water", "payoff", 2,
             ["river", "water", "sunset"]),
        ],
    },
}


# ═══════════════════════════════════════════════════════════════════════════
def _yaml_consulta(q, etiqueta, n, exige, ancora=None, imagem=None,
                   continuo=False):
    p = ['q: "%s"' % q, 'etiqueta: "%s"' % etiqueta, "n: %d" % n,
         "exige: [%s]" % ", ".join(exige)]
    if continuo:
        p.append("continuo: true")
    if ancora:
        p.append('ancora: "%s"' % _sem_acento(ancora))
    linha = "    - {%s}" % ", ".join(p)
    if imagem:
        linha = ("    - {%s,\n       imagem: \"%s\"}"
                 % (", ".join(p), imagem))
    return linha


def gera_curiosidades(slug, spec):
    """Roteiro + curto.yaml de uma peca da contagem regressiva."""
    t = spec["titulo"]
    falas = ["%s." % t]
    # O HOOK NAO ENTRA COMO CONSULTA. Ele e imagem gerada (`03-takes/hook.png`)
    # e o motor o usa como segmento 0. Botar uma consulta para ele so faria o
    # Pexels responder a um termo em portugues e devolver qualquer coisa.
    consultas = []

    for num, nome, texto, q, exige, imagem in spec["itens"]:
        # minuscula na fala: "Número quatro", nao "Número Quatro". A chave do
        # dicionario continua capitalizada porque e o rotulo da spec.
        falas.append("Número %s: %s." % (num.lower(), nome))
        falas.append(texto)
        # ETIQUETA SEM ACENTO: ela vira nome de arquivo (`tNN-{etiqueta}.mp4`)
        # e chave de ancora. Acento em nome de arquivo no Windows sobrevive,
        # mas viaja mal entre o glob, o filtro do ffmpeg e o YAML.
        et = "%s-%s" % (_sem_acento(num).lower(),
                        re.sub(r"[^a-z]", "",
                               _sem_acento(nome).lower())[:10])
        consultas.append(_yaml_consulta(
            q, et, 3, exige, "Numero %s %s" % (num, _sem_acento(nome)),
            imagem))

    falas.append(spec["fecho"])
    fq, fe = spec["fecho_q"]
    consultas.append(_yaml_consulta(fq, "fecho", 2, fe, spec["fecho"]))

    n_ult = spec["itens"][-1][0]
    n_meio = spec["itens"][len(spec["itens"]) // 2][0]
    nome_meio = spec["itens"][len(spec["itens"]) // 2][1]

    roteiro = """# %s — %s

> **Peça do lote de 08/09.** Forma modelada em `docs/MODELAGEM-LOTE-08-09.md`;
> conteúdo nosso. Os fatos são de história natural amplamente documentada e,
> onde não havia certeza do número, está escrita a faixa em vez de precisão
> inventada.

## ROTEIRO

%s
""" % (slug.split("-")[0] + "-" + slug.split("-")[1], t,
       "\n\n".join(falas))

    yaml = """# ═══════════════════════════════════════════════════════════════════════
# %s · %s
# ═══════════════════════════════════════════════════════════════════════
curto:
  slug: %s
  canal: curiosidades-animais
  criado_em: '2026-09-08'
  status: rascunho

visual:
  # Um take por bicho citado, na ordem da contagem. `exige` e o que a descricao
  # do Pexels tem de citar; `imagem` gera quando o banco nao tem a especie.
  consultas:
%s

  # CTA do TikTok: SEGUE no meio, trio no fecho. Ver docs/CANAIS-TIKTOK-DARK.md
  camadas:
    - {tipo: emoji, glifo: "\U0001F631", px: 220, pos: topo, dur: 1.8,
       ancora: "%s"}
    - {tipo: gesto, gesto: seguir, px: 250, pos: baixo, dur: 2.8,
       ancora: "Numero %s %s"}
    - {tipo: gesto, gesto: [curtir, comentar, compartilhar], px: 185,
       pos: 700, dur: 3.4, ancora: "%s"}
""" % (slug, t, slug, "\n".join(consultas), _sem_acento(falas[0]),
       n_meio, _sem_acento(nome_meio), _sem_acento(spec["fecho"]))
    return roteiro, yaml


def gera_avisos(slug, spec):
    """Roteiro + curto.yaml de uma peca do canal de placas."""
    f_hook = ("Se você ver essa placa %s, não é decoração." % spec["onde"])
    f_erro = "Ela existe porque alguém já errou aqui antes."
    f_react = spec["leitura"]
    f_cta = "Eu te conto, mas antes: se você gosta de bicho, me segue aqui."
    # DUAS FRASES, nao uma. Colando a rima no meio de "o tipo de ... que essa
    # placa tenta evitar" a oracao quebra quando a rima ja e uma oracao --
    # saiu "o tipo de bicho que perde o medo de gente e paga por isso que essa
    # placa tenta evitar".
    f_ins1 = ("E olha só esse aqui. É exatamente o que essa placa tenta "
              "evitar: %s." % spec["rima"])
    f_ins2 = "Ninguém avisou ele. A placa é para a gente."
    f_cor = "Se você acha isso triste, deixa um coração nos comentários."
    falas = [f_hook, f_erro, f_react, f_cta, f_ins1, f_ins2, f_cor]
    falas += spec["payoff"]

    consultas = []
    ancoras = {"cenario-estrada": f_hook, "reativo": f_react,
               "fofo": f_cta, "dependente": f_ins1,
               "payoff": spec["payoff"][0]}
    for c in spec["consultas"]:
        # o 5o elemento e opcional: prompt de geracao para quando o banco nao
        # tiver a cena. Sem ele, um bloco vazio derruba o insert emocional --
        # que e justamente o que paga o pedido de comentario.
        q, et, n, exige = c[:4]
        imagem = c[4] if len(c) > 4 else None
        # o bloco emocional e PLANO CONTINUO: um clipe so, sem corte. Ver
        # `sequencia_ancorada` -- picotado, o insert vira colagem.
        consultas.append(_yaml_consulta(q, et, n, exige,
                                        ancoras.get(et), imagem,
                                        continuo=(et == "dependente")))

    roteiro = """# %s — a placa de %s

> **Peça do lote de 08/09.** Estrutura em seis blocos medida em
> `docs/MODELAGEM-LOTE-08-09.md`. Conteúdo nosso; a placa é real e o payoff é
> honesto — o gancho é o estranhamento, não a mentira.
>
> **A rima do insert:** %s. Nos vídeos medidos o animal do bloco emocional tem
> a mesma condição do assunto, e é o que faz o insert não parecer enxerto.

## ROTEIRO

%s
""" % (slug.split("-")[0] + "-" + slug.split("-")[1], spec["placa"],
       spec["rima"], "\n\n".join(falas))

    yaml = """# ═══════════════════════════════════════════════════════════════════════
# %s · placa de %s
# ═══════════════════════════════════════════════════════════════════════
curto:
  slug: %s
  canal: placas-de-aviso
  criado_em: '2026-09-08'
  status: rascunho

visual:
  consultas:
%s

  # A placa e a assinatura do canal: entra nos primeiros segundos e VOLTA antes
  # do payoff. A seta aponta PARA ela (angulo positivo, ver placa_aviso.py).
  camadas:
    - {tipo: placa, pict: %s, larg: 0.60, pos: meio, dur: 4.2,
       ancora: "%s"}
    # a seta sobe para 880: em 1010 ela encostava na legenda (centrada em 1114)
    # e as duas brigavam pelo mesmo pedaco de quadro
    - {tipo: seta, larg: 0.30, ang: 34, pos: 880, x: 0.08, dur: 3.4,
       atraso: 0.6, ancora: "%s"}
    - {tipo: emoji, glifo: "⁉️", px: 230, pos: topo, dur: 2.0,
       ancora: "%s"}
    - {tipo: gesto, gesto: seguir, px: 260, pos: baixo, dur: 2.8,
       ancora: "%s"}
    - {tipo: emoji, glifo: "\U0001F622", px: 200, pos: topo, dur: 2.2,
       ancora: "%s"}
    - {tipo: emoji, glifo: "❤️❤️❤️", px: 150,
       pos: acima-legenda, dur: 2.6, ancora: "%s"}
    - {tipo: gesto, gesto: comentar, px: 250, pos: baixo, dur: 2.6,
       atraso: 0.5, ancora: "%s"}
    - {tipo: placa, pict: %s, larg: 0.46, pos: meio, dur: 2.4,
       ancora: "%s"}
""" % (slug, spec["placa"], slug, "\n".join(consultas), spec["pict"],
       _sem_acento(f_hook), _sem_acento(f_hook), _sem_acento(f_react),
       _sem_acento(f_cta), _sem_acento(f_ins2), _sem_acento(f_cor),
       _sem_acento(f_cor), spec["pict"], _sem_acento(spec["payoff"][0]))
    return roteiro, yaml


def escreve(slug, canal):
    spec = (CUR if canal == "curiosidades" else AVI)[slug]
    roteiro, yaml = ((gera_curiosidades if canal == "curiosidades"
                      else gera_avisos)(slug, spec))
    pack = os.path.join(CANAIS, PASTA[canal], "curtos", slug)
    os.makedirs(os.path.join(pack, "01-roteiro"), exist_ok=True)
    io.open(os.path.join(pack, "01-roteiro", "roteiro.md"), "w",
            encoding="utf-8").write(roteiro)
    io.open(os.path.join(pack, "curto.yaml"), "w",
            encoding="utf-8").write(yaml)
    # o prompt do hook viaja no pack: o runner le daqui e passa ao
    # `hook_imagem.py --prompt`, sem repetir texto em dois lugares
    io.open(os.path.join(pack, "01-roteiro", "hook.txt"), "w",
            encoding="utf-8").write(spec["hook"])
    n_pal = len(re.findall(r"\w+", roteiro.split("## ROTEIRO")[1]))
    print("%-26s %3d palavras · ~%.0fs de fala" % (slug, n_pal,
                                                   n_pal / 170.0 * 60))
    return pack


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--canal", choices=("curiosidades", "avisos"))
    ap.add_argument("--todos", action="store_true")
    ap.add_argument("--lista", action="store_true")
    a = ap.parse_args()

    if a.lista:
        for k, v in CUR.items():
            print("curiosidades  %-26s %s" % (k, v["titulo"]))
        for k, v in AVI.items():
            print("avisos        %-26s placa de %s" % (k, v["placa"]))
        return 0

    if a.todos:
        canais = [a.canal] if a.canal else ["curiosidades", "avisos"]
        for c in canais:
            for k in (CUR if c == "curiosidades" else AVI):
                escreve(k, c)
        return 0

    if not a.slug:
        ap.error("informe o slug, ou --todos, ou --lista")
    canal = a.canal or ("curiosidades" if a.slug in CUR else "avisos")
    escreve(a.slug, canal)
    return 0


if __name__ == "__main__":
    sys.exit(main())
