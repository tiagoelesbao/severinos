# -*- coding: utf-8 -*-
"""Monta o video final — take real correndo por baixo, texto em camada por cima.

O QUE MUDOU DA PRIMEIRA VERSAO, E POR QUE
  A primeira montagem usava a cartela como FUNDO: verde chapado com texto, oito
  segundos por plano. Onze minutos disso nao e video, e apresentacao de slides —
  e foi exatamente o que apareceu na tela.

  Agora a base e imagem real (video de acervo ou foto do fato) e a cartela e
  CAMADA sobre ela. O texto continua o mesmo; mudou o que existe atras dele.

O RITMO
  Plano de ~5 s. O genero corta entre quatro e oito segundos; acima disso o
  espectador de celular tem tempo de sair. Onze minutos viram ~130 planos.

DOIS TIPOS DE BASE, DOIS TRATAMENTOS
  video   ja tem movimento proprio — nao leva zoom nenhum. Entra num ponto
          sorteado do arquivo, para o mesmo take usado tres vezes nao mostrar
          tres vezes o mesmo trecho.
  foto    leva zoom lento. E aqui que estava o "travamento": o `zoompan` do
          ffmpeg arredonda a posicao para pixel inteiro e o movimento anda em
          degraus. MEDIDO: 68% de variacao entre quadros consecutivos, com
          quadros praticamente parados alternando com saltos.

          A correcao e calcular o zoom numa resolucao maior e reduzir depois: o
          passo de 1 px vira sub-pixel e o `scale` interpola. Medido de novo:
          2560x1440 → 28%, 3840x2160 → 19%. Fico com 2560, que ja e liso e custa
          2,2 s por plano contra 5 s do 3200.

GRADACAO
  Todo plano leva o mesmo ajuste leve de contraste e saturacao mais uma vinheta.
  Nao e enfeite: material de quatro origens (Pexels, ge, UOL, arquivo) tem
  exposicao e temperatura diferentes, e sem tratamento comum o corte entre eles
  denuncia a colagem.

USO
  python -X utf8 monta.py 2026-09-04-abel-stjd --rascunho
  python -X utf8 monta.py 2026-09-04-abel-stjd --ate 3   (só os 3 primeiros blocos)
  python -X utf8 monta.py 2026-09-04-abel-stjd
"""
import argparse
import json
import io
import os
import re
import random
import subprocess
import sys

from narra_comfy import CANAL, blocos_do_roteiro

FPS = 30
DUR_PLANO = 5.0       # segundos — o corte do gênero fica entre 4 e 8
ZOOM = 1.06           # amplitude do movimento nas fotos
SUAVE = (2560, 1440)  # resolução em que o zoom é calculado antes de reduzir
COR = "eq=contrast=1.06:brightness=-0.02:saturation=1.06"
VINHETA = "vignette=PI/5"


def dur(p):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries",
                        "format=duration", "-of", "csv=p=0", p],
                       capture_output=True, text=True)
    try:
        return float((r.stdout or "0").strip())
    except ValueError:
        return 0.0


def _enquadra(l, a):
    return ("scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d"
            % (l, a, l, a))


def plano_video(src, inicio, segundos, saida, l, a, camada, tmp, pos="unica"):
    """Plano de video: o material ja se move, entao nao levo zoom nenhum."""
    ent = ["-ss", "%.2f" % inicio, "-t", "%.3f" % segundos, "-i", src]
    filtros = "[0:v]%s,fps=%d,%s,%s,setsar=1" % (_enquadra(l, a), FPS, COR, VINHETA)
    return _renderiza(ent, filtros, segundos, saida, l, a, camada, tmp, pos)


def plano_foto(src, segundos, saida, l, a, sentido, camada, tmp, pos="unica"):
    """Plano de foto: zoom lento, calculado em resolucao maior e reduzido."""
    n = max(int(round(segundos * FPS)), 1)
    if sentido == "in":
        z = "min(1+(%f-1)*on/%d,%f)" % (ZOOM, n, ZOOM)
    else:
        z = "max(%f-(%f-1)*on/%d,1)" % (ZOOM, ZOOM, n)
    sl, sa = SUAVE
    ent = ["-loop", "1", "-t", "%.3f" % segundos, "-i", src]
    filtros = (
        "[0:v]%s,zoompan=z='%s':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':"
        "d=%d:s=%dx%d:fps=%d,scale=%d:%d:flags=bicubic,%s,%s,setsar=1"
        % (_enquadra(int(sl * 1.25), int(sa * 1.25)), z, n, sl, sa, FPS,
           l, a, COR, VINHETA)
    )
    return _renderiza(ent, filtros, segundos, saida, l, a, camada, tmp, pos)


def _renderiza(entrada, filtros, segundos, saida, l, a, camada, tmp, pos="unica"):
    """Fecha a cadeia: aplica a camada de texto, se houver, e codifica.

    O `pos` DIZ ONDE ESTE PLANO ESTA NA VIDA DA CARTELA, e e por causa dele que
    a cartela nao pisca mais:

        unica   fade de entrada e de saida        (cartela que dura 1 plano)
        inicio  fade de ENTRADA apenas            (primeiro plano da sequencia)
        meio    NENHUM fade, opacidade cheia      (plano do meio)
        fim     fade de SAIDA apenas              (ultimo plano)

    POR QUE ISTO EXISTE
      Cada plano e renderizado como um mp4 separado e depois concatenado. Antes,
      TODO plano com camada aplicava fade dos dois lados -- entao uma cartela
      que cobria quatro planos fazia entrar/sair QUATRO VEZES. Na tela ela
      piscava a cada ~5 s enquanto a locucao seguia falando do mesmo assunto.
      Era esse o "surgindo e sumindo toda hora".

      O movimento de subida de 40 px tambem so vale na ENTRADA: repetido a cada
      plano, ele sacode a cartela parada.
    """
    cmd = ["ffmpeg", "-v", "error", "-y"] + entrada
    if camada:
        cmd += ["-loop", "1", "-t", "%.3f" % segundos, "-i", camada]
        fim = max(segundos - 0.5, 0.1)
        entra = pos in ("unica", "inicio")
        sai = pos in ("unica", "fim")
        cad = "format=rgba"
        if entra:
            cad += ",fade=t=in:st=0:d=0.4:alpha=1"
        if sai:
            cad += ",fade=t=out:st=%.2f:d=0.5:alpha=1" % fim
        # a subida de 40 px so na entrada; no meio a cartela fica parada
        y = "'if(lt(t,0.4),(0.4-t)/0.4*40,0)'" if entra else "0"
        filtros += (
            "[base];"
            "[1:v]scale=%d:%d,%s[txt];"
            "[base][txt]overlay=x=0:y=%s:format=auto" % (l, a, cad, y)
        )
    cmd += ["-filter_complex", filtros, "-c:v", "libx264", "-preset", "veryfast",
            "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
            "-t", "%.3f" % segundos, saida]
    r = subprocess.run(cmd, cwd=tmp, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "")[-900:])
    return saida


# ── de onde vem cada imagem ──────────────────────────────────────────────────
# A atribuicao das FOTOS DO FATO a blocos e curadoria: qual rosto entra em que
# momento e decisao de quem escreveu o roteiro, nao do gerador. As chaves sao
# prefixos do arquivo baixado por `fotos_do_fato.py`, ou nome de arquivo local.
# A atribuicao das FOTOS DO FATO a blocos e CURADORIA: qual rosto entra em que
# momento e de quem escreveu o roteiro. Por isso o mapa e por EPISODIO -- as
# chaves "f06", "f13" apontam para fotos diferentes em cada pauta.
FOTOS_POR_EPISODIO = {
    "2026-09-04-abel-stjd": {
        "GANCHO":   ["f06", "f13", "abel-wide.jpg", "f19", "abel-recorte.jpg", "f30"],
        "NÚMEROS":  ["f30", "f07", "j10-stjd.jpg", "f15", "f19", "f20"],
        "ÍNDICE":   ["f10", "f24", "f27", "f33", "f26", "f15"],
        "ABERTURA": [],
        "CTA":      ["f34", "f15", "f20", "f07", "f27"],
        "BLOCO 1":  ["f19", "f35", "f13", "j10-stjd.jpg", "f06", "f30", "f08"],
        "BLOCO 2":  ["f14", "f17", "f18", "f22", "f05", "f16", "f20"],
        "BLOCO 2B": ["f07", "f10", "f20", "f33", "f27", "f15", "f24"],
        "BLOCO 2C": ["f04", "f05", "f16", "f26", "f24", "f10"],
        "BLOCO 3":  ["f06", "f30", "f13", "j10-stjd.jpg", "f19", "f35", "f22"],
        "BLOCO 4":  ["f32", "f15", "f20", "f27", "f07", "f33"],
        "FECHO":    ["abel-recorte.jpg", "f07", "f05", "f13", "f15", "abel-wide.jpg"],
    },
    # Arbitragem Flu x Vasco: o rosto segue o assunto do bloco. Canobbio e o
    # peitado, Adson e o do lance do penalti, Hulk e quem fala.
    # As chaves aqui foram CONFERIDAS uma a uma contra o titulo da materia de
    # origem: so entra foto de materia sobre O JOGO. As de mercado ("Santos
    # anuncia Lima, ex-Fluminense") casavam pelo nome do clube e mostravam outro
    # contexto -- foi o que pos jogador do Santos e do Flamengo no b-roll do
    # classico em 06/09.
    "2026-09-06-arbitragem-flu-vasco": {
        # a peitada e a briga: o confronto que o gancho anuncia
        "GANCHO":   ["f11", "f12", "f39", "f03", "f18", "f34"],
        # o gol e o placar
        "NÚMEROS":  ["f17", "f38", "f09", "f37", "f34", "f21"],
        "ÍNDICE":   ["f34", "f21", "f01", "f39", "f17"],
        "ABERTURA": [],
        "CTA":      ["f34", "f21", "f01"],
        # Hulk falando
        "BLOCO 1":  ["f18", "f11", "f34", "f39", "f21"],
        # o lance: Adson, a analise do PC Oliveira
        "BLOCO 2":  ["f41", "f10", "f17", "f34", "f38", "f09"],
        # o jogo saindo do controle: briga, gramado, cartao
        "BLOCO 3":  ["f39", "f04", "f12", "f11", "f03", "f34"],
        # a repercussao internacional da peitada
        "BLOCO 3B": ["f03", "f12", "f11", "f39", "f34"],
        # o Vasco que jogou mais e perdeu
        "BLOCO 4":  ["f32", "f22", "f10", "f38", "f34", "f17"],
        # Hulk e o passado recente
        "BLOCO 5":  ["f18", "f11", "f34", "f01", "f21"],
        # a tabela
        "BLOCO 6":  ["f01", "f37", "f16", "f09", "f34"],
        "FECHO":    ["f09", "f16", "f38", "f17", "f34", "f01"],
    },
    # Briga pelo penalti no Cruzeiro. Episodio de PLANTAO: o eixo e o Cruzeiro,
    # mas quatro blocos falam de outros clubes. Cada chave foi conferida contra
    # o TITULO da materia de origem, nunca so pelo nome do clube no arquivo.
    #
    # O QUE FICOU DE FORA, e por que -- e a mesma armadilha de 06/09:
    #   f07, f32   "Botafogo-PB" de BASQUETE e de Serie C. Casaram por
    #              "botafogo" e sao de outro clube e de outro esporte.
    #   f73        "programacao do FLAMENGO" indexada em corinthians.
    #   f37        Corinthians x Cruzeiro FEMININO.
    #   f01        Bolasie zoando o Corinthians nas redes -- outro contexto.
    #   f05, f11*, f17*  pre-lista da Selecao. As duas do Cruzeiro entram
    #              apenas como apoio generico do clube, nunca em bloco de fato.
    "2026-09-07-penalti-cruzeiro": {
        # os dois lado a lado, a discussao, a leitura labial
        "GANCHO":   ["f67", "f13", "f04", "f15", "f40", "f36"],
        # o jogo e o placar
        "NÚMEROS":  ["f40", "f36", "f67", "f11", "f15", "f17"],
        "ÍNDICE":   ["f67", "f04", "f13", "f15", "f40"],
        "ABERTURA": [],
        "CTA":      ["f40", "f11", "f17"],
        # o primeiro penalti, o que ele deixou
        "BLOCO 1":  ["f40", "f36", "f11", "f67", "f17"],
        # quem pega a bola: a cena central
        "BLOCO 2":  ["f67", "f13", "f04", "f36", "f15", "f40"],
        # a leitura labial
        "BLOCO 3":  ["f13", "f15", "f67", "f04", "f36"],
        # o vestiario e os relatos
        "BLOCO 4":  ["f04", "f67", "f11", "f36", "f17", "f13"],
        # as redes sociais
        "BLOCO 5":  ["f67", "f04", "f13", "f15", "f36", "f11"],
        # a crise do Corinthians
        "BLOCO 6":  ["f69", "f21", "f61", "f28", "f58", "f50",
                     "f26", "f56", "f55", "f48", "f22"],
        # o mercado do Botafogo
        "BLOCO 7":  ["f68", "f06", "f09", "f64", "f72", "f27"],
        # os vermelhos, o Barboza e o Abel
        "BLOCO 8":  ["f14", "f62", "f29", "f25", "f65", "f34",
                     "f70", "f16", "f49", "f30"],
        "FECHO":    ["f67", "f40", "f34", "f16", "f69", "f68"],
    },
}


def material(pack, slug=None):
    """Junta acervo, fotos do fato e camadas, indexados por bloco.

    Video e foto entram INTERCALADOS na lista de cada bloco, e nao um grupo
    depois do outro: o ciclo da montagem consome a lista em ordem, entao a
    intercalacao aqui e o que faz o video alternar movimento e foto na tela.
    """
    takes = os.path.join(pack, "04-takes")
    videos, fotos = {}, {}

    ac = os.path.join(takes, "acervo", "acervo.json")
    if os.path.isfile(ac):
        for v in json.load(open(ac, encoding="utf-8")):
            p = os.path.join(takes, "acervo", v["arquivo"])
            if not os.path.isfile(p):
                continue
            for b in v["blocos"]:
                videos.setdefault(b, []).append(("video", p, v["duracao"]))

    dirfotos = os.path.join(takes, "fotos")
    disponiveis = os.listdir(dirfotos) if os.path.isdir(dirfotos) else []
    slug = slug or os.path.basename(os.path.normpath(pack))
    mapa = FOTOS_POR_EPISODIO.get(slug, {})
    if not mapa:
        print("  [aviso] sem mapa de fotos para %s — todas as fotos viram pool" % slug)
    for bloco, chaves in mapa.items():
        for ch in chaves:
            if ch.endswith(".jpg") and os.path.isfile(os.path.join(takes, ch)):
                fotos.setdefault(bloco, []).append(
                    ("foto", os.path.join(takes, ch), 0))
                continue
            achado = next((f for f in disponiveis if f.startswith(ch)), None)
            if achado:
                fotos.setdefault(bloco, []).append(
                    ("foto", os.path.join(dirfotos, achado), 0))

    base = {}
    for b in set(list(videos) + list(fotos)):
        v, f, junto = videos.get(b, []), fotos.get(b, []), []
        for k in range(max(len(v), len(f))):
            if k < len(v):
                junto.append(v[k])
            if k < len(f):
                junto.append(f[k])
        base[b] = junto

    # ── POOL DE RESERVA ──────────────────────────────────────────────────────
    # Bloco declarado no roteiro que nao aparece no mapa saia como "SEM
    # MATERIAL", e o video ficava mais CURTO que o audio -- em 06/09 foram 162 s
    # de buraco, porque o roteiro ganhou tres blocos novos (3B, 5, 6) e o mapa
    # ainda era o do episodio anterior. O pool nao substitui a curadoria: ele
    # impede que a falta dela quebre a entrega.
    # o pool NAO pode pegar foto de mercado: e dela que veio jogador do Santos
    # no b-roll do classico. O `fotos.json` guarda o titulo da materia.
    MERCADO = ("anuncia", "negocia", "contrata", "reforco", "sonda", "assina",
               "onde assistir", "ex-flamengo", "ex-fluminense", "estreia")
    titulos = {}
    fj = os.path.join(dirfotos, "fotos.json")
    if os.path.isfile(fj):
        try:
            for it in json.load(open(fj, encoding="utf-8")):
                titulos[it.get("arquivo", "")] = (it.get("titulo", "") or "").lower()
        except Exception:
            pass
    todas_fotos, todos_videos = [], []
    for f in sorted(disponiveis):
        if not f.lower().endswith((".jpg", ".jpeg", ".png")):
            continue
        if any(k in titulos.get(f, "") for k in MERCADO):
            continue
        todas_fotos.append(("foto", os.path.join(dirfotos, f), 0))
    for lst in videos.values():
        for item in lst:
            if item not in todos_videos:
                todos_videos.append(item)
    pool = []
    for k in range(max(len(todos_videos), len(todas_fotos))):
        if k < len(todos_videos):
            pool.append(todos_videos[k])
        if k < len(todas_fotos):
            pool.append(todas_fotos[k])
    base["_POOL_"] = pool

    camadas = {}
    ci = os.path.join(takes, "cartelas", "cartelas.json")
    if os.path.isfile(ci):
        for c in json.load(open(ci, encoding="utf-8")):
            p = os.path.join(takes, "cartelas", c["arquivo"])
            if os.path.isfile(p):
                # guarda (caminho, ancora): o caminho vai para o ffmpeg, a
                # ancora decide EM QUE PLANO a camada entra
                camadas.setdefault(c["bloco"], []).append((p, c.get("ancora", "")))
    return base, camadas


def _fala_real(pack):
    """Carrega o mapa de QUANDO cada palavra e dita. Gerado por `fala_real.py`."""
    p = os.path.join(pack, "03-narracao", "fala-real.json")
    if not os.path.isfile(p):
        return None
    try:
        return json.load(open(p, encoding="utf-8"))["palavras"]
    except Exception:
        return None


def _acha_na_fala(palavras, ancora, t_ini=None, t_fim=None):
    """Segundo ABSOLUTO em que a locucao chega no trecho `ancora`.

    POR QUE CONTRA O AUDIO, E NAO CONTRA O ROTEIRO
      O roteiro e a intencao; o mp3 e o fato. Ancorar no `roteiro.blocos.srt`
      (estimado a 135 wpm, motor a ~196) punha a cartela no lugar errado -- foi
      o defeito que o founder viu em 06/09.

    POR QUE POR CARACTERE, E NAO POR PALAVRA
      A primeira versao casava PALAVRA a PALAVRA, exigindo 70%% de acerto numa
      janela do mesmo tamanho da ancora. Em 07/09 duas das 26 cartelas nao
      resolveram, e as duas por defeito do TRANSCRITOR, nao da ancora:

        ancora  "Cruzeiro 3 Athletico Paranaense 1"
        fala    "cruzeiro 3 atletico para naense 1"
                            ^ sem o H      ^ partida em duas palavras

        ancora  "O Corinthians teve 62 por cento de posse de bola"
        fala    "o corinthians teve 62 de posse de bola"
                                      ^ "por cento" simplesmente sumiu

      Palavra partida ("para naense") destroi qualquer casamento por token, e
      palavra que some desalinha a janela inteira dali para a frente. Nao ha
      ajuste de tolerancia por palavra que resolva os dois.

      Concatenando os caracteres, os dois casos viram diferenca pequena:
      "paranaense" e "para naense" ficam IDENTICOS quando o espaco cai, e
      "athletico" difere de "atletico" em um caractere de nove.

      Cartela que nao resolve a ancora cai no espalhamento uniforme do bloco --
      e foi assim que a mesma cartela apareceu tres vezes no BLOCO 6,
      intercalada com outra. Na tela isso le como piscada.

    POR QUE A BUSCA E RESTRITA AO BLOCO
      Ratio alto NAO garante posicao certa, e isso so apareceu ao medir. No
      episodio de 06/09 a ancora "se inscreve no canal" casou com ratio 0,850 --
      alto -- aos 605 s, no FECHO, quando a cartela e do CTA aos 120 s. A frase
      existe nos dois lugares, e procurando no episodio inteiro a busca pegou a
      ocorrencia errada.

      A cartela declara o BLOCO a que pertence, e o bloco tem inicio e fim
      conhecidos. Procurar fora dele nunca foi util -- era so superficie para
      errar. Restringindo, da para baixar o corte de similaridade sem aumentar
      o risco de casamento falso.

    CUSTO
      `quick_ratio` filtra (barato, so conta caracteres em comum) e `ratio` mede
      as melhores candidatas. Dentro de um bloco sao algumas centenas de
      posicoes, imperceptivel.
    """
    if not palavras or not ancora:
        return None
    if t_ini is not None:
        # folga de 2 s nas pontas: a fronteira do bloco no plano de montagem e
        # a soma das duracoes, e ela derrapa alguns decimos contra o audio.
        palavras = [w for w in palavras
                    if t_ini - 2.0 <= w["t"] <= (t_fim if t_fim else 1e9) + 2.0]
        if not palavras:
            return None
    import difflib
    import unicodedata as _u

    # NUMERO POR EXTENSO NA ANCORA, DIGITO NA TRANSCRICAO.
    #
    # Defeito visto no piloto de curtos de 07/09 e que vale aqui igual: a
    # cartela ancorada em "dois a zero" nunca casa com "2 a 0". Nao da erro --
    # a camada simplesmente nao entra.
    NUM = {"zero": "0", "um": "1", "uma": "1", "dois": "2", "duas": "2",
           "tres": "3", "quatro": "4", "cinco": "5", "seis": "6", "sete": "7",
           "oito": "8", "nove": "9", "dez": "10", "onze": "11", "doze": "12",
           "treze": "13", "quatorze": "14", "catorze": "14", "quinze": "15",
           "dezesseis": "16", "dezessete": "17", "dezoito": "18",
           "dezenove": "19", "vinte": "20", "trinta": "30", "cem": "100"}

    def n(t):
        t = _u.normalize("NFD", (t or "").lower())
        t = "".join(c for c in t if _u.category(c) != "Mn")
        t = re.sub(r"[^a-z0-9]", "", t)
        return NUM.get(t, t)

    alvo = "".join(n(w) for w in ancora.split())
    if len(alvo) < 8:
        return None
    seq = [w["p"] for w in palavras]
    n_pal = len([w for w in ancora.split() if n(w)])
    # A janela leva algumas palavras a mais: o transcritor pode ter PARTIDO
    # palavras, e ai o mesmo trecho ocupa mais tokens do que a ancora tem.
    janela = n_pal + 3

    m = difflib.SequenceMatcher()
    m.set_seq2(alvo)
    aprox = []
    for i in range(len(seq)):
        trecho = "".join(seq[i:i + janela])[:len(alvo) + 12]
        if len(trecho) < len(alvo) * 0.6:
            continue
        m.set_seq1(trecho)
        if m.quick_ratio() >= 0.72:
            aprox.append((m.quick_ratio(), i, trecho))

    melhor, melhor_t = 0.0, None
    for _, i, trecho in sorted(aprox, reverse=True)[:40]:
        m.set_seq1(trecho)
        r = m.ratio()
        if r > melhor:
            melhor, melhor_t = r, palavras[i]["t"]
    # 0,72 medido: dentro do bloco, as ancoras boas ficaram entre 0,738 e 0,941
    # nos dois episodios. Abaixo de 0,72 e a ancora que esta escrita diferente
    # do que foi falado -- e ai a cartela vai para o espalhamento uniforme, que
    # e o comportamento correto para quem nao sabe onde entrar.
    return melhor_t if melhor >= 0.72 else None


# Quanto tempo uma cartela pode ficar na tela. O minimo evita piscada; o maximo
# evita que ela vire papel de parede quando o assunto seguinte demora a chegar.
CARTELA_MIN_S = 7.0
CARTELA_MAX_S = 26.0


def planeja(pack, ordem, base, camadas):
    """Decide QUEM aparece em cada plano, e por quanto tempo.

    Separado da renderizacao de proposito: o mesmo plano alimenta o `video.mp4`
    e o projeto editavel do video-studio. Se as duas coisas decidissem por conta
    propria, o que o founder abre para editar nao seria o que ele assistiu.
    """
    brutos = os.path.join(pack, "03-narracao", "_blocos")
    fala = _fala_real(pack)
    if fala is None:
        print("  [aviso] sem fala-real.json — rode `fala_real.py {slug}`. "
              "As cartelas caem no espalhamento, sem sincronia com a voz.")
    plano, ultimo, desloca, i = [], None, 0, 0
    t_bloco = 0.0            # onde este bloco comeca na linha do tempo do video
    for b, nome in enumerate(ordem, 1):
        d = dur(os.path.join(brutos, "%02d.mp3" % b)) + (0.6 if b < len(ordem) else 0)
        fontes = base.get(nome) or []
        if not fontes:
            # rotaciona o pool para blocos consecutivos nao repetirem material
            pool = base.get("_POOL_") or []
            if pool:
                corte = (sum(ord(c) for c in nome) * 7) % len(pool)
                fontes = pool[corte:] + pool[:corte]
                print("  [pool] %s sem mapa — usando acervo geral" % nome)
        if not fontes:
            plano.append({"bloco": nome, "vazio": True, "segundos": d})
            t_bloco += d
            continue

        n = max(int(round(d / DUR_PLANO)), 1)
        cada = d / n
        # Texto em cerca de metade dos planos, alternado: entra, respira, entra.
        # Duas camadas seguidas cansam; uma a cada dois planos mantem o ritmo
        # sem transformar o video em legenda continua.
        # ── CAMADAS: ancoradas no AUDIO e PERSISTENTES ───────────────────
        # Dois defeitos corrigidos aqui, os dois apontados pelo founder:
        #
        # 1. A ancora era resolvida contra o ROTEIRO (SRT estimado a 135 wpm,
        #    motor a ~196). Agora e contra `fala-real.json`, que traz o segundo
        #    em que cada palavra e DITA.
        #
        # 2. A cartela durava UM PLANO (~5 s) e sumia enquanto o assunto ainda
        #    estava sendo falado. Agora ela tem INICIO e FIM: cobre todos os
        #    planos do trecho que ilustra, ate a proxima cartela do bloco.
        cams = camadas.get(nome) or []
        onde = {}
        if cams:
            marcados = []          # (t_ini_abs, caminho)
            livres = []
            for c in cams:
                caminho, ancora = c if isinstance(c, tuple) else (c, "")
                t = (_acha_na_fala(fala, ancora, t_bloco, t_bloco + d)
                     if fala else None)
                if t is None:
                    livres.append(caminho)
                else:
                    marcados.append((t, caminho))
            marcados.sort()

            # o fim de cada cartela e o inicio da proxima, dentro dos limites
            fim_bloco = t_bloco + d
            for k, (t0, caminho) in enumerate(marcados):
                t1 = marcados[k + 1][0] if k + 1 < len(marcados) else fim_bloco
                t1 = min(t1, t0 + CARTELA_MAX_S, fim_bloco)
                t1 = max(t1, t0 + CARTELA_MIN_S)
                # marca TODOS os planos cujo centro cai no intervalo
                for j in range(n):
                    centro = t_bloco + (j + 0.5) * cada
                    if t0 <= centro < t1:
                        onde[j] = caminho

            # cartela sem ancora: espalhamento antigo, so nos planos que sobraram
            k = 0
            for j in range(0 if n <= 2 else 1, n, 2):
                if not livres:
                    break
                if j not in onde:
                    onde[j] = livres[k % len(livres)]
                    k += 1

        # Cada bloco entra na lista dele num ponto diferente: blocos que
        # compartilham etiqueta (`campo` serve ABERTURA e CTA) mostrariam a
        # mesma peca a poucos segundos de distancia.
        desloca += 1
        for j in range(n):
            i += 1
            tipo, src, dsrc = fontes[(j + desloca) % len(fontes)]
            # Um take nao pode abrir um bloco tendo fechado o anterior: sao dois
            # planos seguidos do mesmo material com um corte no meio.
            if j == 0 and src == ultimo and len(fontes) > 1:
                desloca += 1
                tipo, src, dsrc = fontes[(j + desloca) % len(fontes)]
            ultimo = src
            margem = max(dsrc - cada - 0.3, 0) if tipo == "video" else 0
            # POSICAO NA SEQUENCIA DA CARTELA. Sem isto, cada plano aplicava
            # fade dos dois lados e a cartela piscava a cada plano.
            cam = onde.get(j)
            if cam is None:
                pos = "unica"
            else:
                antes = onde.get(j - 1) == cam if j > 0 else False
                depois = onde.get(j + 1) == cam if j + 1 < n else False
                pos = ("meio" if antes and depois else
                       "inicio" if depois else
                       "fim" if antes else "unica")
            plano.append({
                "n": i, "bloco": nome, "tipo": tipo, "arquivo": src,
                "segundos": cada, "camada": cam, "camada_pos": pos,
                "inicio_fonte": random.uniform(0, margem) if margem else 0.0,
                "sentido": "in" if i % 2 else "out",
            })
        t_bloco += d          # fecha o bloco na linha do tempo
    return plano


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--rascunho", action="store_true", help="854x480, rápido")
    ap.add_argument("--ate", type=int, help="para depois deste bloco")
    ap.add_argument("--semente", type=int, default=7,
                    help="sorteio dos trechos de vídeo — mesma semente, mesmo corte")
    a = ap.parse_args()

    random.seed(a.semente)   # montagem reprodutível: rodar de novo dá o mesmo vídeo
    l, alt = (854, 480) if a.rascunho else (1920, 1080)
    pack = os.path.join(CANAL, "episodios", a.slug)
    som = os.path.join(pack, "05-audio", "mix.wav")
    if not os.path.isfile(som):
        print("não achei a mixagem: %s  (rode mixa.py antes)" % som)
        return 1

    ordem = []
    for nome, _ in blocos_do_roteiro(os.path.join(pack, "02-roteiro", "roteiro.md")):
        if nome not in ordem:
            ordem.append(nome)
    if a.ate:
        ordem = ordem[:a.ate]

    brutos = os.path.join(pack, "03-narracao", "_blocos")
    fala = _fala_real(pack)
    if fala is None:
        print("  [aviso] sem fala-real.json — rode `fala_real.py {slug}`. "
              "As cartelas caem no espalhamento, sem sincronia com a voz.")
    base, camadas = material(pack, a.slug)
    saida = os.path.join(pack, "06-final")
    tmp = os.path.join(saida, "_planos")
    os.makedirs(tmp, exist_ok=True)

    print("%-3s %-12s %7s %7s %6s %6s  %s"
          % ("#", "BLOCO", "SEG", "PLANOS", "VÍDEO", "FOTO", "CAMADAS"))
    print("─" * 74)

    plano = planeja(pack, ordem, base, camadas)
    planos, total = [], 0.0
    porbloco = {}
    for p in plano:
        porbloco.setdefault(p["bloco"], []).append(p)
    for nome in ordem:
        ps = porbloco.get(nome) or []
        if not ps or ps[0].get("vazio"):
            print("%-3d %-12s %7.1f   ← SEM MATERIAL"
                  % (ordem.index(nome) + 1, nome[:12],
                     ps[0]["segundos"] if ps else 0))
            total += ps[0]["segundos"] if ps else 0
            continue
        nv = nf = ncam = 0
        for p in ps:
            arq = os.path.join(tmp, "p%03d.mp4" % p["n"])
            if p["tipo"] == "video":
                plano_video(p["arquivo"], p["inicio_fonte"], p["segundos"], arq,
                            l, alt, p["camada"], tmp, p.get("camada_pos", "unica"))
                nv += 1
            else:
                plano_foto(p["arquivo"], p["segundos"], arq, l, alt,
                           p["sentido"], p["camada"], tmp,
                           p.get("camada_pos", "unica"))
                nf += 1
            ncam += 1 if p["camada"] else 0
            planos.append(arq)
            total += p["segundos"]
        print("%-3d %-12s %7.1f %7d %6d %6d  %d de %d"
              % (ordem.index(nome) + 1, nome[:12], sum(p["segundos"] for p in ps),
                 len(ps), nv, nf, ncam, len(camadas.get(nome) or [])))

    if not planos:
        print("\nnenhum plano gerado")
        return 1

    lista = os.path.join(tmp, "_lista.txt")
    with open(lista, "w", encoding="utf-8") as f:
        for p in planos:
            f.write("file '%s'\n" % p.replace("\\", "/"))
    mudo = os.path.join(tmp, "_mudo.mp4")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
                    "-i", lista, "-c", "copy", mudo], check=True)

    alvo = total if a.ate else dur(som)
    final = os.path.join(saida, "trecho.mp4" if a.ate else "video.mp4")
    dv = dur(mudo)
    pad = max(alvo - dv, 0)
    vf = "tpad=stop_mode=clone:stop_duration=%.3f," % pad if pad > 0.04 else ""
    vf += "fade=t=in:st=0:d=0.8,fade=t=out:st=%.2f:d=1.2" % max(alvo - 1.2, 0)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", mudo, "-i", som,
                    "-vf", vf, "-c:v", "libx264", "-preset", "medium",
                    "-crf", "20", "-pix_fmt", "yuv420p", "-r", str(FPS),
                    "-c:a", "aac", "-b:a", "192k", "-t", "%.3f" % alvo,
                    "-movflags", "+faststart", final], check=True)

    df = dur(final)
    print("─" * 74)
    print("%d planos · %.1fs de vídeo para %.1fs de áudio" % (len(planos), dv, alvo))
    print("\n%s · %d min %02d s · %dx%d · %.1f MB"
          % (os.path.basename(final), df // 60, df % 60, l, alt,
             os.path.getsize(final) / 1048576))
    if not a.ate and abs(df - alvo) > 0.5:
        print("\n  ERRO: o vídeo tem %.1fs e o áudio %.1fs. A fala foi cortada."
              % (df, alvo))
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
