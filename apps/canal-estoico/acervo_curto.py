# -*- coding: utf-8 -*-
"""Baixa takes VERTICAIS de acervo (Pexels) para um curto do canal estoico.

POR QUE ESTA ROTA EXISTE
  O I2V proprio e o item mais caro do estudio: os quatro takes do LA1-P1
  custaram duas madrugadas e tres timeouts. Para SEIS curtos isso seria a
  semana inteira de maquina, e o founder decidiu em 06/09 que os demais saem de
  acervo. Movimento comprado a custo zero de GPU.

  Nao substitui o I2V no take do HOOK -- ali o movimento proprio ainda paga.
  Substitui nos takes de apoio, que sao a maioria.

O QUE MUDA EM RELACAO AO ACERVO DO FUTEBOL
  Tres coisas, e as tres importam:

  1. ORIENTACAO. Pede `portrait` na API. Take horizontal recortado para 9:16
     perde 56%% da largura, e o assunto quase nunca esta no terco central.
  2. O ASSUNTO NAO E FACTUAL. No futebol, take errado e ERRO -- o arbitro tem
     que ser o daquele jogo. Aqui o take e ATMOSFERA: marmore, coluna, ceu,
     penumbra. Isso amplia muito o que serve e reduz o risco de contrassenso.
  3. A ARMADILHA E OUTRA. La era "football" trazendo futebol americano; aqui e
     "statue" trazendo estatua da liberdade e monumento moderno, e "meditation"
     trazendo aula de ioga em estudio branco. Por isso as consultas evitam a
     palavra generica e descrevem MATERIAL e LUZ.

A FOLHA DE CONTATO CONTINUA OBRIGATORIA
  Pelo mesmo motivo do futebol: a consulta nao garante o assunto, e nao ha como
  automatizar esse julgamento. O que da para automatizar e produzir a folha,
  para que olhar custe dez segundos. Sai em `_CONFERIR.jpg`.

USO
    python acervo_curto.py LA1-p3-privacao-30s
    python acervo_curto.py --todos
    python acervo_curto.py LA1-p3-privacao-30s --listar
"""
import argparse
import io
import json
import os
import subprocess
import sys
import urllib.parse
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
_CANAIS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                       "creative-studio", "canais")
CURTOS = os.path.join(_CANAIS, "canal-estoico", "curtos")

API = "https://api.pexels.com/videos"
CAB = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

# Um take precisa durar mais que o corte para o pingpong ter material; abaixo de
# 6 s ele repete dentro do proprio segmento e repeticao curta le como
# travamento. Acima de 40 s o download nao paga -- so o comeco vai ao ar.
MIN_S, MAX_S = 6, 40
ALT_MIN = 1080

# O BANCO DE ATMOSFERA DO CANAL.
#
# Descrevem MATERIAL, LUZ e ESPACO -- nunca o conceito. "Disciplina" e
# "estoicismo" como consulta devolvem foto de academia e de livro de
# autoajuda; "marble column dim light" devolve o que a identidade pede.
#
# A etiqueta e o que aparece no nome do arquivo e na folha de contato -- e o que
# permite escolher a olho depois.
# DUAS RODADAS DE ACERVO, E O QUE ELAS ENSINARAM
#
#   Rodada 1 (consulta neutra)  marmore ROSA, colunata turistica sob ceu azul
#     com palmeira, floresta verde, nuvem branca. 4 de 6 fora da identidade.
#   Rodada 2 (consulta escura)  o tom melhorou e o ASSUNTO piorou: uma MAO
#     humana moderna sobre o marmore, estatuas em vitrine de museu com luz
#     roxa, templo iluminado por refletor azul-e-dourado de turismo noturno,
#     bosque com POSTE DE RUA. Anacronismo em quatro dos seis.
#
# A conclusao e do material, nao de gosto: acervo de banco NAO entrega figura
# antiga em registro estoico. O que ele entrega com consistencia e TEXTURA
# ABSTRATA -- fumaca, poeira, chuva, brasa, tinta, pedra em macro. Nenhuma
# delas pode ser anacronica, porque nao ha objeto a datar.
#
# Entao a rota de acervo assume esse registro de proposito. A assinatura do
# canal nesses curtos nao vem da imagem: vem da tipografia em ambar, da regua,
# do rotulo e da gradacao -- que estao em todo quadro. Figura antiga continua
# saindo do I2V proprio, que e onde ela sai certa.
# O BANCO E UMA LISTA FECHADA E CONFERIDA, nao um sorteio a cada rodada.
#
# Tres rodadas de sorteio produziram, alem das boas: mao humana sobre marmore,
# mao segurando uma gota, tinta VERDE NEON, tecido VERMELHO, bokeh azul de
# protetor de tela, panfleto em ingles pregado no tijolo, para-brisa de carro,
# poste de rua num bosque. Cada rodada custava download e uma folha de contato
# para descobrir a mesma coisa.
#
# Estas sete foram vistas e aprovadas. A variacao entre curtos nao vem de
# sortear material novo -- vem da ORDEM, do movimento de cada segmento e da
# gradacao. E assim que o LA1-P1 sustenta 55 s com quatro takes.
TEXTURAS_ESTOICO = [
    ("dark stone surface macro", "pedra"),
    ("water surface ripples dark", "agua"),
    ("candle flame dark background", "vela"),
    ("storm clouds dark sky", "ceu"),
    ("night sky stars time lapse", "estrelas"),
    ("sand falling black background", "areia"),
    ("smoke black background slow motion", "fumaca"),
]

# ── O BANCO DO FUTEBOL ──────────────────────────────────────────────────────
#
# ATENCAO A UMA COISA QUE NAO E OBVIA: aqui NAO vale a licao do estoico.
#
# No estoico o acervo so entrega textura abstrata, porque figura antiga em
# registro estoico nao existe em banco. No futebol o assunto E contemporaneo:
# estadio, torcida, gramado, arbitro, chuteira -- tudo isso o acervo tem aos
# milhares, e nao ha anacronismo possivel. Importar a regra do outro canal
# entregaria fumaca e areia num video sobre penalti.
#
# A armadilha do futebol e OUTRA, e ja esta paga em `broll/acervo.py`:
#   "football"      em ingles americano e FUTEBOL AMERICANO
#   "crowd raising hands"   trouxe pessoas em CULTO, e um crucifixo
#   "referee running on pitch"   trouxe RUGBY
# Toda consulta carrega uma palavra que ancora o assunto: soccer, pitch,
# stadium. E "vertical"/"portrait" nao entram na consulta -- a orientacao vai no
# parametro da API, e escrever no texto so polui o casamento.
TEXTURAS_FUTEBOL = [
    ("soccer stadium crowd cheering vertical", "torcida"),
    ("soccer player close up on pitch", "jogador"),
    ("soccer ball on grass close up", "bola"),
    ("soccer stadium floodlights night", "estadio"),
    ("soccer penalty kick", "penalti"),
    ("soccer referee showing card", "arbitro"),
    ("soccer players celebrating goal", "gol"),
    ("empty soccer stadium seats", "arquibancada"),
    ("soccer boots close up grass", "chuteira"),
    ("soccer goal net close up", "rede"),
    ("soccer training session players", "treino"),
    ("stadium lights night sky", "luz"),
]

# ── OS DOIS CANAIS DE CURIOSIDADE ───────────────────────────────────────────
# Bicho e assunto contemporaneo e concreto: o acervo tem aos milhares e nao ha
# anacronismo possivel -- vale a mesma logica do futebol, nao a do estoico.
#
# A armadilha aqui e a de sempre com nome de bicho em ingles: "sloth" traz
# tanto o bicho quanto a personagem de desenho, e nome cientifico traz
# ilustracao de livro. Por isso as consultas usam o nome comum + o habitat.
TEXTURAS_ANIMAIS = [
    ("snake in the jungle close up", "cobra"),
    ("amazon rainforest river aerial", "floresta"),
    ("jaguar walking in forest", "onca"),
    ("piranha fish underwater", "peixe"),
    ("tarantula spider close up", "aranha"),
    ("frog on leaf macro", "sapo"),
    ("caiman alligator in river", "jacare"),
    ("ants marching on branch", "formiga"),
    ("stingray swimming underwater", "arraia"),
    ("dense jungle canopy fog", "mata"),
]

# O canal de PLACAS precisa de duas famílias: o cenario onde a placa se planta
# (estrada, trilha, praia) e os inserts de animal, que sao o motor do formato.
TEXTURAS_AVISOS = [
    ("empty forest road trees", "estrada"),
    ("hiking trail in forest", "trilha"),
    ("park entrance nature path", "parque"),
    ("dog looking at camera close up", "cachorro"),
    ("cat looking at camera close up", "gato"),
    ("stray dog on the street", "cao-rua"),
    ("puppy playing close up", "filhote"),
    ("wild animal near road", "bicho-estrada"),
    ("forest path sunlight trees", "mata"),
    ("roadside grass countryside", "acostamento"),
]

BANCOS = {"estoico": TEXTURAS_ESTOICO, "futebol": TEXTURAS_FUTEBOL,
          "curiosidades": TEXTURAS_ANIMAIS, "avisos": TEXTURAS_AVISOS}

# A guarda de tom e DO ESTOICO. O canal de futebol e claro de proposito --
# gramado verde sob refletor, camisa colorida --, e aplicar `luma <= 110` ali
# reprovaria o acervo inteiro. Guarda calibrada num canal nao se herda para
# outro sem recalibrar; e o mesmo erro do fator de fonte do libass.
TOM_POR_CANAL = {"estoico": True, "futebol": False,
                 "curiosidades": False, "avisos": False}

# CONSULTAS CORTADAS, e por que -- para nao voltarem por engano:
#
#   "old paper texture dark"          PANFLETO moderno em parede de tijolo,
#     escrito "take what you need" em ingles. Texto em ingles na tela de um
#     curto em portugues nao e questao de tom, e erro.
#   "fire embers black background"    brasa vermelha saturada; continua
#     vermelha depois da gradacao. A paleta do canal tem UMA cor quente, e ela
#     e do texto.
#   "rain on window at night"         para-brisa de CARRO com lanterna vermelha.
#   "black marble texture macro"      MAO humana sobre a pedra.
#   "water drops slow motion dark"    MAO segurando a gota.
#   "ink drop in water black bg"      tinta VERDE NEON.
#   "dark fabric folds slow"          tecido VERMELHO.
#   "black background particles..."   bokeh azul, cara de protetor de tela.
#   "light beam dust particles..."    borrao branco estourado, sem leitura.
#
# A licao que fica: no acervo, consulta que nomeia um OBJETO ("paper", "window",
# "marble") traz o objeto no mundo de hoje, com mao e tudo. Consulta que nomeia
# FENOMENO ("sand falling", "storm clouds", "stars time lapse") traz o fenomeno,
# que nao tem epoca nem dono.


# O CANAL E ESCURO E DESSATURADO. O template de thumb ja registra a regra --
# "a imagem e dessaturada de proposito, para o ambar do texto ser a unica cor
# quente saliente".
#
# A consulta nao garante o TOM. Na primeira rodada, com as mesmas etiquetas,
# vieram: marmore ROSA, colunata turistica sob ceu azul com palmeira, floresta
# verde ensolarada e nuvem branca em ceu claro. Quatro de seis fora da
# identidade -- e todos tecnicamente corretos em relacao a consulta.
#
# Diferente do julgamento "isto e rugby ou futebol?", que nao da para
# automatizar, "isto esta claro e colorido demais para este canal?" E MEDIVEL.
# A medicao roda na miniatura que a propria API ja devolve, antes de baixar o
# video -- entao um take reprovado nao custa download nenhum.
#
# CALIBRADO, nao chutado. Medido nos 13 takes distintos da primeira rodada
# (frame aos 2 s, reduzido a 160 px), com o julgamento vindo da folha de
# contato:
#
#   DENTRO da identidade    vela 8,9/0,018 · chuva 26,2/0,054 · fumaca 30,5/0,041
#                           poeira 46,0/0,044 · corredor 55,6/0,039
#                           estatua 61,8/0,027 · ruina 97,8/0,114
#   FORA                    marmore rosa 93,0/0,260 · colunata ensolarada 116,6/0,202
#                           ceu azul 144,4/0,222 · pergaminho claro 156,0/0,278
#
# luma <= 110 E saturacao <= 0.18 separa as duas listas -- rejeita os quatro
# reprovados e mantem os sete aprovados, com folga nos dois lados.
#
# ONDE ELA NAO ALCANCA, e vale saber: a floresta verde ensolarada media 88,2 /
# 0,131 -- indistinguivel da ruina enevoada (97,8 / 0,114), que e boa. Cor e
# brilho nao dizem se o assunto e ESTE canal. Por isso a folha de contato
# continua obrigatoria: a guarda barra o obvio, o olho barra o resto.
LUMA_MAX = 110
SAT_MAX = 0.18


def tom(url_miniatura):
    """(luma media, saturacao media) da miniatura, em 0-255 e 0-1.

    Roda na thumbnail que a propria API devolve em `image` -- alguns KB. Medir
    aqui e o que torna a guarda barata: take reprovado nao chega a ser baixado.
    """
    try:
        from PIL import Image
        r = urllib.request.Request(url_miniatura, headers=CAB)
        with urllib.request.urlopen(r, timeout=25) as f:
            dados = f.read()
        im = Image.open(io.BytesIO(dados)).convert("RGB")
        im.thumbnail((160, 160))
        px = list(im.getdata())
        n = float(len(px))
        luma = sum(0.299 * r_ + 0.587 * g + 0.114 * b for r_, g, b in px) / n
        sat = sum((max(p) - min(p)) / 255.0 for p in px) / n
        return luma, sat
    except Exception:
        # sem medicao nao da para reprovar: deixa passar e a folha de contato
        # continua sendo a segunda linha de defesa
        return None, None


def busca(caminho, chave, **q):
    url = "%s/%s?%s" % (API, caminho, urllib.parse.urlencode(q))
    r = urllib.request.Request(url, headers=dict(CAB, Authorization=chave))
    with urllib.request.urlopen(r, timeout=40) as f:
        return json.load(f)


def escolhe_arquivo(v):
    """O menor arquivo que ainda entrega altura de 1080 -- baixar 4K para
    exibir em 1920 de altura e minuto de download por nenhum pixel util."""
    fs = [f for f in v.get("video_files", [])
          if (f.get("height") or 0) >= ALT_MIN and f.get("link")]
    if not fs:
        return None
    return sorted(fs, key=lambda f: f["height"])[0]


def baixa(url, destino):
    r = urllib.request.Request(url, headers=CAB)
    with urllib.request.urlopen(r, timeout=180) as f, open(destino, "wb") as g:
        while True:
            b = f.read(262144)
            if not b:
                break
            g.write(b)
    return os.path.getsize(destino)


def folha_de_contato(pasta):
    """Um frame de cada take, lado a lado, em `_CONFERIR.jpg`."""
    import glob
    import shutil
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return None
    mp4 = sorted(glob.glob(os.path.join(pasta, "*.mp4")))
    if not mp4:
        return None
    tmp = os.path.join(pasta, "_frames")
    os.makedirs(tmp, exist_ok=True)
    ims = []
    for f in mp4:
        n = os.path.splitext(os.path.basename(f))[0]
        j = os.path.join(tmp, n + ".jpg")
        subprocess.run(["ffmpeg", "-v", "error", "-ss", "2", "-i", f,
                        "-frames:v", "1", "-vf", "scale=-1:300", j, "-y"],
                       capture_output=True)
        if os.path.isfile(j):
            ims.append((n, Image.open(j)))
    if not ims:
        return None
    L, A = 170, 300
    C = 6
    linhas = (len(ims) + C - 1) // C
    folha = Image.new("RGB", (C * L, linhas * (A + 18)), (18, 18, 18))
    d = ImageDraw.Draw(folha)
    for i, (n, im) in enumerate(ims):
        x, y = (i % C) * L, (i // C) * (A + 18)
        folha.paste(im.resize((L, A)), (x, y + 18))
        d.text((x + 3, y + 3), n[:24], fill=(240, 240, 240))
    alvo = os.path.join(pasta, "_CONFERIR.jpg")
    folha.save(alvo, quality=88)
    for _, im in ims:
        im.close()
    shutil.rmtree(tmp, ignore_errors=True)
    return alvo


def quantos_takes(pack):
    """Um take por marcador `[take NN ...]` do roteiro, com piso de 4.

    Menos de quatro fontes num curto de 30 s faz a mesma imagem voltar tres
    vezes -- e e a repeticao, nao a duracao, que denuncia o material barato.
    """
    rot = os.path.join(pack, "01-roteiro", "roteiro.md")
    n = 0
    if os.path.isfile(rot):
        import re
        n = len(re.findall(r"\[take\s+\d+", io.open(rot, encoding="utf-8").read()))
    return max(n, 4)


# ── A GUARDA DE CONTEUDO: A BUSCA DEVOLVE "PARECIDO", NAO "O QUE FOI PEDIDO" ──
#
# O piloto de 07/09 tinha, no acervo aprovado: uma MODELO de estudio com uma
# piton no pescoco entrando como cobra-coral, uma mulher nadando num rio como
# sucuri, hipopotamos como sucuri, cascalho como formiga e um por-do-sol como
# cobra. Cinco erros em vinte e nove -- e nenhum deu erro, porque o filtro
# olhava so duracao, orientacao e tom.
#
# O sinal que faltava ja vinha no payload: a URL do Pexels carrega uma DESCRICAO
# escrita por gente (`/video/elegant-model-with-snake-in-studio-shoot-28879317/`).
# Duas regras em cima dela resolvem a maioria:
#
#   exige  -- a descricao tem de citar o assunto (declarado no curto.yaml, ou
#             derivado das palavras da consulta)
#   veta   -- gente, estudio e moda nunca sao take de bicho selvagem
#
# Nao e classificador de imagem; e leitura da etiqueta que o proprio banco
# escreveu. Barrar demais e melhor que aprovar errado: take a menos so encurta
# o rodizio, take errado e informacao errada na tela.
# Casa por TOKEN (a slug e separada por hifen), nao por trecho: a primeira
# versao barrava `crocodile-swimming-in-mangrove-waters` porque "mangrove"
# contem "man". Guarda que barra o certo custa mais caro que a que deixa passar
# o errado, porque some com material bom sem dizer.
VETO_PESSOA = {"model", "models", "studio", "portrait", "fashion", "woman",
               "women", "man", "men", "person", "persons", "people", "human",
               "girl", "boy", "lady", "couple", "selfie", "influencer",
               "her", "his", "hand", "hands"}

# Contexto ENCENADO ou CATIVO. O bicho e o certo e a cena e falsa: a busca por
# sucuri devolveu um encantador de serpentes na rua com uma naja no cesto, que
# passa por "cobra" e destroi a credibilidade de um video que diz estar na
# Amazonia. Mesma logica do veto de estudio.
# "street" e "market" sairam da lista: cachorro de rua e justamente o assunto
# do canal de placas, e o veto sumia com o material certo sem dizer. Guarda
# larga demais custa mais que guarda ausente, porque ninguem procura o que ela
# comeu.
# `enclosed` e `straw` entraram depois: `white-rodent-exploring-in-straw-
# enclosed-area` passou por "rat/rodent" e virou o rato-canguru do deserto --
# um roedor de estimacao numa caixa de serragem. O veto casa por token, entao
# "enclosure" nao pega "enclosed".
VETO_CENA = {"charmer", "performer", "performance", "zoo", "circus",
             "captivity", "captive", "terrarium", "aquarium", "cage",
             "enclosure", "enclosed", "tire", "basket", "handler",
             "straw", "pet", "tank", "aviary", "farm", "petting"}

# palavras que existem em quase toda descricao e nao identificam nada
VAZIAS = {"close", "shot", "view", "macro", "video", "detail", "natural",
          "beautiful", "background", "scene", "footage", "clip", "over",
          "with", "and", "the", "from", "into", "under", "small", "large",
          "big", "little", "wild", "wildlife", "animal", "nature"}


def _slug(url):
    """A parte descritiva da URL do Pexels, sem o id numerico."""
    import re
    m = re.search(r"/video/([a-z0-9-]+?)-\d+/?$", (url or "").lower())
    return m.group(1) if m else ""


def _passa_conteudo(url, consulta, exige, veta=None):
    """(ok, motivo) — a descricao do banco confere com o que foi pedido?"""
    sl = _slug(url)
    if not sl:
        return True, ""                     # sem descricao, nao ha o que julgar
    fichas = set(sl.split("-"))
    if fichas & VETO_PESSOA:
        return False, "gente/estudio (%s)" % sl[:40]
    if fichas & VETO_CENA:
        return False, "cena encenada/cativa (%s)" % sl[:40]
    if veta and fichas & {v.lower() for v in veta}:
        return False, "vetado pelo curto (%s)" % sl[:40]
    termos = exige or [w for w in consulta.lower().split()
                       if len(w) >= 4 and w not in VAZIAS]
    if not termos:
        return True, ""
    # Casa por RADICAL: `puppy` tem de achar `puppies`, senao a guarda barra o
    # take certo por diferenca de plural -- foi o que aconteceu com
    # `puppies-playing-on-the-grass` numa consulta que pedia exatamente isso.
    for t in termos:
        t = t.lower()
        if t in sl:
            return True, ""
        raiz = t[:max(len(t) - 2, 4)]
        if len(raiz) >= 4 and any(f.startswith(raiz) for f in fichas):
            return True, ""
    return False, "fora do assunto (%s)" % sl[:40]


def _consultas_do_curto(pack):
    """[(consulta, etiqueta, quantos)] de `visual.consultas` do curto.yaml.

    POR QUE `quantos` E NAO UM TAKE POR CONSULTA
      A primeira versao baixava um video por consulta. Com sete consultas e
      quarenta e seis segmentos, cada take ancorado ficava sete segundos no ar
      em pedacos seguidos -- e o motor contou 39 repeticoes consecutivas. A
      ancora resolveu o take ERRADO; sobrou o take PARADO.

      Pedindo dois ou tres clipes do mesmo bicho, o trecho ancorado alterna
      entre eles: continua sendo a arraia enquanto a locucao fala da arraia,
      mas com corte de verdade a cada segundo.
    """
    y = os.path.join(pack, "curto.yaml")
    if not os.path.isfile(y):
        return []
    try:
        import yaml
        d = yaml.safe_load(io.open(y, encoding="utf-8").read()) or {}
        cs = (d.get("visual") or {}).get("consultas") or []
    except Exception:
        return []
    fora = []
    for c in cs:
        if isinstance(c, dict):
            ex = c.get("exige")
            ex = [ex] if isinstance(ex, str) else (ex or None)
            vt = c.get("veta")
            vt = [vt] if isinstance(vt, str) else (vt or None)
            fora.append((c["q"], c["etiqueta"], int(c.get("n", 1)), ex,
                         c.get("imagem"), vt))
        else:
            t = tuple(c)
            fora.append((t[0], t[1], int(t[2]) if len(t) > 2 else 1,
                         None, None, None))
    return fora


def _gera_imagem(saida, indice, etiqueta, prompt, q):
    """Gera uma imagem fiel para a etiqueta e devolve o registro do acervo.

    QUANDO GERAR, E POR QUE COBRIR A DIFERENCA E NAO SO O VAZIO
      A primeira versao so gerava quando NENHUM candidato passava -- o caso da
      cobra-coral, que nao existe no Pexels. Mas o caso comum e outro: passa
      UM. Um clipe so para um trecho de sete segundos volta a ser take parado,
      que e o defeito que o `n:` existe para resolver.

      Medido no lote de 08/09: quatro blocos ficaram com um clipe (polvo-de-
      aneis-azuis, cigarra, lagarto-cornudo, lagartixa). Gerando a diferenca,
      o rodizio dentro do grupo volta a funcionar.
    """
    png = os.path.join(saida, "t%02d-%s.png" % (indice, etiqueta))
    subprocess.run(
        [sys.executable, "-X", "utf8",
         os.path.join(os.path.dirname(os.path.abspath(__file__)),
                      "hook_imagem.py"),
         "--saida", png, "--prompt", prompt], check=True)
    return {
        "arquivo": os.path.basename(png), "etiqueta": etiqueta,
        "consulta": q, "origem": "flux2-klein (gerada)",
        "motivo": "o acervo nao entregou clipe fiel suficiente",
        "licenca": "geracao propria",
    }


BANCOS_LOCAIS = os.path.join(
    RAIZ, "squads", "oraclumtech-ai-creative-studio", "data")


def _do_banco_local(nome, saida, indice, etiqueta, quantos, slug):
    """Copia `quantos` clipes de um banco local para o acervo do curto.

    POR QUE UM BANCO LOCAL EXISTE
      O bloco emocional das placas pede bicho abandonado, magro ou doente. O
      Pexels nao tem isso -- tem cachorro de rua bonito em dia de sol -- e a
      consulta devolvia take aleatorio bem onde a locucao diz "olha so esse
      aqui" e pede comocao. Sem o bicho, o bloco nao existe.

      `data/inserts-emocionais/` guarda os trechos extraidos dos proprios
      videos modelados pelo `banco_insert.py`. Aqui eles entram como take.

      O GIRO E POR SLUG: sete pecas dividindo sete inserts sem que duas
      vizinhas peguem o mesmo. Sorteio daria colisao; o slug e estavel e
      espalha.
    """
    import glob
    import shutil
    orig = os.path.join(BANCOS_LOCAIS, nome)
    vs = sorted(glob.glob(os.path.join(orig, "*.mp4")))
    if not vs:
        return []
    g = sum(ord(c) for c in slug) % len(vs)
    vs = vs[g:] + vs[:g]
    fora = []
    for k in range(min(quantos, len(vs))):
        alvo = os.path.join(saida, "t%02d-%s.mp4" % (indice + k, etiqueta))
        if not os.path.isfile(alvo):
            shutil.copyfile(vs[k], alvo)
        fora.append({
            "arquivo": os.path.basename(alvo), "etiqueta": etiqueta,
            "consulta": "banco:" + nome, "origem": os.path.basename(vs[k]),
            "licenca": "material modelado — decisao de direitos do founder",
        })
    return fora


def para_curto(slug, chave, listar=False, canal="estoico"):
    pack = os.path.join(CURTOS, slug)
    if not os.path.isdir(pack):
        print("%-34s pack inexistente" % slug)
        return 0
    saida = os.path.join(pack, "03-takes", "acervo")
    os.makedirs(saida, exist_ok=True)

    proprias = _consultas_do_curto(pack)
    alvo = max(quantos_takes(pack), sum(n for _, _, n, _, _, _ in proprias))
    # O ponto de partida gira com o slug: dois curtos do mesmo lote pedindo as
    # mesmas consultas na mesma ordem receberiam os mesmos videos, e o feed
    # mostraria os dois no mesmo dia com o mesmo material.
    #
    # Mas a assinatura vem ANTES da atmosfera na ordem, e nao so no sorteio:
    # como a busca para assim que junta `alvo` takes, o que fica no fim da fila
    # pode nao ser baixado. Deixar a pedra no fim seria a mesma coisa que nao
    # ter pedra.
    # CONSULTAS DO PROPRIO CURTO vem antes do banco do canal.
    #
    # O banco e generico por design -- serve a qualquer curto do canal. Mas
    # quando a narracao cita CINCO bichos com nome, take generico e defeito: o
    # piloto de 07/09 falava de arraia, coral, candiru, sucuri e formiga, e a
    # tela mostrava onca e piranha. O founder viu na hora.
    #
    # `visual.consultas` no `curto.yaml` deixa o roteiro pedir o que ele cita.
    banco = BANCOS[canal]
    g = sum(ord(c) for c in slug) % len(banco)
    ordem = proprias + [(q, e, 1, None, None, None)
                        for q, e in banco[g:] + banco[:g]]

    baixados, usados, falhas = [], set(), []
    for q, etiqueta, quantos, exige, imagem_prompt, veta in ordem:
        if len(baixados) >= alvo:
            break
        # `banco:nome` nao consulta o Pexels — vem de material nosso em disco
        if q.startswith("banco:") and not listar:
            regs = _do_banco_local(q[6:], saida, len(baixados) + 1,
                                   etiqueta, quantos, slug)
            if regs:
                baixados.extend(regs)
                print("   %-32s %-11s %d do banco local"
                      % (q[:32], etiqueta, len(regs)))
            else:
                falhas.append("%s (banco vazio)" % etiqueta)
                print("   %-32s %-11s BANCO VAZIO" % (q[:32], etiqueta))
            continue
        try:
            d = busca("search", chave, query=q, per_page=25,
                      orientation="portrait", size="medium")
        except Exception as e:
            print("   %-32s falhou: %s" % (q[:32], e))
            continue
        # Ate `quantos` clipes DISTINTOS da mesma consulta: e o que faz o
        # trecho ancorado ter corte em vez de ficar parado no mesmo video.
        escolhidos, barrados, fora_do_tema = [], 0, []
        for cand in d.get("videos", []):
            if len(escolhidos) >= quantos:
                break
            if cand["id"] in usados or not (MIN_S <= cand.get("duration", 0) <= MAX_S):
                continue
            f = escolhe_arquivo(cand)
            if not f or f["height"] <= f["width"]:  # a API as vezes ignora o filtro
                continue
            ok, motivo = _passa_conteudo(cand.get("url", ""), q, exige, veta)
            if not ok:
                fora_do_tema.append(motivo)
                continue
            luma, sat = tom(cand.get("image") or "") if TOM_POR_CANAL[canal]                 else (None, None)
            if luma is not None and (luma > LUMA_MAX or sat > SAT_MAX):
                barrados += 1
                continue
            usados.add(cand["id"])
            escolhidos.append((cand, f, (luma, sat)))
        if fora_do_tema:
            print("   %-32s %d barrado(s) pelo conteudo: %s"
                  % (q[:32], len(fora_do_tema), "; ".join(fora_do_tema[:2])))
        if not escolhidos:
            print("   %-32s SEM CANDIDATO (%d pelo tom, %d pelo conteudo)"
                  % (q[:32], barrados, len(fora_do_tema)))
            # NAO da `continue` aqui: o bloco de geracao la embaixo cobre
            # tanto o vazio total quanto a falta parcial. Saltando, o caso
            # "nenhum candidato" -- que e justamente o que mais precisa de
            # geracao -- era o unico que nao gerava.
            falta = quantos
        falta = quantos - len(escolhidos)
        if falta > 0:
            print("   %-32s so %d de %d pedidos passaram na guarda"
                  % (q[:32], len(escolhidos), quantos))

        for v, arq, v_tom in escolhidos:
            if len(baixados) >= alvo:
                break
            nome = "t%02d-%s.mp4" % (len(baixados) + 1, etiqueta)
            destino = os.path.join(saida, nome)
            tam = 0
            if not listar:
                if os.path.isfile(destino) and os.path.getsize(destino) > 10240:
                    tam = os.path.getsize(destino)
                else:
                    try:
                        tam = baixa(arq["link"], destino)
                    except Exception as e:
                        print("   %-32s download falhou: %s" % (q[:32], e))
                        continue
            print("   %-32s %-11s %3ds %8s  luma %5.1f sat %.3f  %s"
                  % (q[:32], etiqueta, v["duration"],
                     "%.1f MB" % (tam / 1048576) if tam else "—",
                     v_tom[0] if v_tom[0] is not None else -1,
                     v_tom[1] if v_tom[1] is not None else -1, nome))
            baixados.append({
                "arquivo": nome, "etiqueta": etiqueta, "consulta": q,
                "duracao": v["duration"], "largura": arq["width"],
                "altura": arq["height"], "origem": "pexels", "pexels_id": v["id"],
                "autor": (v.get("user") or {}).get("name", ""),
                "url": v.get("url", ""),
                "luma": round(v_tom[0], 1) if v_tom[0] is not None else None,
                "saturacao": round(v_tom[1], 3) if v_tom[1] is not None else None,
                "licenca": "Pexels License — uso comercial livre, atribuição não obrigatória",
            })

        # COBRE A FALTA COM GERACAO — vazio total ou parcial, mesma rota
        if falta > 0 and imagem_prompt and not listar:
            for _ in range(falta):
                if len(baixados) >= alvo:
                    break
                try:
                    reg = _gera_imagem(saida, len(baixados) + 1, etiqueta,
                                       imagem_prompt, q)
                    baixados.append(reg)
                    print("   %-32s %-11s GERADA  %s"
                          % (q[:32], etiqueta, reg["arquivo"]))
                except Exception as e:
                    # NAO ENGOLIR. Quando o ComfyUI esta fora do ar, todas as
                    # geracoes falham e o script terminava dizendo "14 takes",
                    # como se o pack estivesse pronto -- com os blocos que
                    # dependiam de geracao VAZIOS. Um pack incompleto que se
                    # anuncia completo custa mais caro que um erro.
                    falhas.append("%s (%s)" % (etiqueta, str(e)[:60]))
                    print("   %-32s %-11s GERACAO FALHOU" % (q[:32], etiqueta))
                    break
        elif falta > 0 and not imagem_prompt:
            print("   %-32s %-11s sem `imagem:` para cobrir a falta"
                  % (q[:32], etiqueta))

    if falhas:
        print("   [ERRO] %d bloco(s) sem material: %s"
              % (len(falhas), "; ".join(falhas)))
        print("   [ERRO] o ComfyUI esta no ar? o pack NAO esta pronto.")

    if baixados and not listar:
        io.open(os.path.join(saida, "acervo.json"), "w", encoding="utf-8").write(
            json.dumps({"slug": slug, "takes": baixados},
                       ensure_ascii=False, indent=2))
        f = folha_de_contato(saida)
        if f:
            print("   folha de contato: %s" % os.path.basename(f))
    return -1 if falhas else len(baixados)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--todos", action="store_true",
                    help="todos os curtos que ainda nao tem acervo")
    ap.add_argument("--listar", action="store_true", help="mostra sem baixar")
    ap.add_argument("--canal", choices=sorted(BANCOS), default="estoico")
    a = ap.parse_args()

    global CURTOS
    PASTA = {"futebol": "bora-de-bola", "curiosidades": "curiosidades-animais",
             "avisos": "placas-de-aviso"}
    if a.canal in PASTA:
        CURTOS = os.path.join(_CANAIS, PASTA[a.canal], "curtos")

    from dotenv import load_dotenv
    load_dotenv(os.path.join(RAIZ, ".env"))
    chave = os.getenv("PEXELS_API_KEY", "").strip()
    if not chave:
        print("PEXELS_API_KEY ausente no .env")
        return 1

    alvos = []
    if a.todos:
        for s in sorted(os.listdir(CURTOS)):
            p = os.path.join(CURTOS, s)
            if not os.path.isdir(p):
                continue
            ja = os.path.join(p, "03-takes", "acervo", "acervo.json")
            if not os.path.isfile(ja):
                alvos.append(s)
    elif a.slug:
        alvos = [a.slug]
    else:
        ap.error("informe o slug ou use --todos")

    ruim = 0
    for s in alvos:
        print("\n%s" % s)
        n = para_curto(s, chave, a.listar, a.canal)
        if n < 0:
            ruim += 1
        else:
            print("   %d takes" % n)
    # saida != 0 para o runner PARAR em vez de montar um pack furado
    return 1 if ruim else 0


if __name__ == "__main__":
    sys.exit(main())
