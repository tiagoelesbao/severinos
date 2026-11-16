# -*- coding: utf-8 -*-
"""Monta o curto vertical 9:16 no ritmo de rede social curta.

O QUE MUDOU DEPOIS DO PRIMEIRO CORTE (06/09)
  A primeira versao montou quatro planos longos -- um deles de 22 s -- com
  legenda simples e sem trilha. O founder resumiu: "muito lento, parece video
  longo". A diferenca nao e de gosto: no feed vertical a retencao se decide em
  segundos, e plano parado de 22 s e um convite a rolar.

  Quatro mudancas, cada uma atacando um motivo especifico de perder o espectador:

  1. CORTE CURTO (~2,6 s). O olho recebe informacao nova antes de se acomodar.
     Os mesmos quatro takes viram ~23 segmentos.

  2. MOVIMENTO DIFERENTE A CADA SEGMENTO -- zoom que entra, zoom que sai, deriva
     lateral, subida. Repetir o mesmo take com o MESMO movimento e o que denuncia
     o loop; com movimento diferente, a mesma imagem le como outro plano.

  3. VOZ ACELERADA (`atempo`, que preserva o timbre). O ritmo de narracao de
     video longo soa arrastado no vertical.

  4. TRILHA com ducking. Silencio embaixo da voz deixa o corte exposto; a cama
     costura os cortes e segura a atencao entre uma frase e outra.

  5. OVERLAY. Tres elementos, cada um com uma funcao -- nenhum e enfeite:

       PALAVRA EM AMBAR  a palavra que carrega o sentido da frase sai na cor
         quente da identidade. E o recurso mais copiado do feed vertical
         porque funciona: o olho pousa nela e le a frase inteira em volta.
       ROTULO DE ABERTURA  3 s dizendo de que canal isto e. O feed entrega
         para quem nao segue, e sem rotulo o video nao tem dono.
       CHAMADA FINAL  os ultimos 3 s apontam para o video longo -- que e a
         razao de o curto existir.

  6. HOOK PICOTADO. Os tres primeiros cortes saem a 68%% da duracao dos demais.
     A decisao de ficar ou rolar acontece nos primeiros 3 s.

LEGENDA
  Vem do `fala-real.json` -- o tempo REAL de cada palavra, transcrito do mp3.
  Cada grupo termina EXATAMENTE onde o proximo comeca: na primeira versao eu
  somava 0,08 s de respiro no fim, e isso punha dois textos na tela ao mesmo
  tempo em 46 das 52 trocas. Era o "defeito nas trocas de bloco".

DOIS CANAIS, UM MOTOR
  `--canal estoico` (padrao) ou `--canal futebol`. O que muda e identidade --
  cor de realce, trilha, rotulo e chamada. O resto do motor e do formato
  vertical, nao do assunto.

USO
    python monta_curto.py LA1-p1-comece-antes-60s
    python monta_curto.py LA1-p1-comece-antes-60s --rascunho
    python monta_curto.py FUT-c01-briga-penalti-60s --canal futebol
    python monta_curto.py LA1-p1-comece-antes-60s --voz 1.12 --corte 2.2
"""
import argparse
import io
import json
import math
import os
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
_CANAIS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                       "creative-studio", "canais")
_TRILHAS = os.path.join(RAIZ, "squads", "oraclumtech-ai-creative-studio",
                        "data", "trilhas-and-sfx")

# ── OS DOIS CANAIS, E O QUE MUDA ENTRE ELES ─────────────────────────────────
#
# O MOTOR E O MESMO. Corte curto, movimento por segmento, voz acelerada, trilha
# com ducking, karaoke em libass, zona segura -- nada disso e do estoicismo,
# e do formato vertical. O que muda de canal para canal e IDENTIDADE: a cor de
# realce, a trilha, o rotulo e a chamada final.
#
# Separar assim custou vinte linhas e evita a copia do arquivo inteiro, que e
# como o segundo canal costuma nascer -- e como as correcoes deixam de chegar
# nele. As tres correcoes de 06/09 (baseline por libass, zona segura medida,
# fator de corpo da fonte) valem para os dois porque ha um motor so.
CANAIS = {
    "estoico": {
        "curtos": os.path.join(_CANAIS, "canal-estoico", "curtos"),
        "trilha": os.path.join(_TRILHAS, "01-trilhas", "dark-estoicismo",
                               "tr-estoico-solene.mp3"),
        # marmore frio + um unico ambar de recorte
        "realce": "0xE8A83A",
        "realce_ass": "&H003AA8E8",     # o .ass le AABBGGRR, nao RRGGBB
        "rotulo": "Estoicismo prático",
        "cta": "Vídeo completo no canal",
        # o acervo do estoico e claro demais e azulado; a gradacao esfria e
        # dessatura para o ambar do texto ser a unica cor quente
        "grade": ("eq=saturation=0.45:contrast=1.14:brightness=-0.05,"
                  "colorbalance=rs=-0.05:bs=0.08:rm=-0.03:bm=0.05"),
        # atmosfera nao tem vetor: rodar de tras para frente passa despercebido
        "pingpong": True,
    },
    # ── OS DOIS CANAIS DE CURIOSIDADE (pilotos de 07/09) ────────────────────
    # Modelados no benchmark `METODO-INSERT-ANIMAL.md`. O que veio de la e
    # MEDIDO: corte a 0,9 s, locucao a ~233 wpm, legenda com palavra em verde
    # neon. O timbre e a voz da casa -- o que aproxima do som da referencia e o
    # RITMO, nao o timbre (a compressao ja bate: 2,1 dB contra 2,0).
    "curiosidades": {
        "curtos": os.path.join(_CANAIS, "curiosidades-animais", "curtos"),
        "trilha": os.path.join(_TRILHAS, "02-leitos", "tensao-suspense",
                               "le-tensao-baixa-LOOP.wav"),
        "realce": "0x22DD22",           # verde neon, como a referencia
        "realce_ass": "&H0022DD22",
        "rotulo": "Curiosidades Animais",
        "cta": "Segue para mais",
        "grade": "eq=saturation=1.06:contrast=1.08",
        "pingpong": False,              # bicho tem vetor, como jogada
        "corte": 1.1,
        # ── VOZ: 1.0 E 1.0, E POR QUE OS DOIS VOLTARAM A UM ──────────────
        #
        # `voz` e `pitch` foram calibrados quando a narracao saia da voz da
        # CASA (159 Hz, ~196 wpm) e o alvo era chegar perto da referencia. Com
        # a voz CLONADA os dois viraram correcao em cima de correcao:
        #
        #   referencia (video do founder)   130,4 Hz
        #   clone gerado pelo ChatterBox    127,7 Hz   <- ja chegou
        #   depois do pitch 0.88 no video   108,6 Hz   <- 17% abaixo da ref
        #
        # Um quarto abaixo do original nao e a mesma voz, e foi assim que o
        # founder ouviu. O mesmo vale para o ritmo: a referencia fala a 128
        # wpm (155 palavras em 72,6 s) e nao a 239, que era o numero herdado
        # do OUTRO video do benchmark. Acelerar 1,22x um clone e desfazer o
        # clone.
        "voz": 1.0,
        "pitch": 1.0,
    },
    "avisos": {
        "curtos": os.path.join(_CANAIS, "placas-de-aviso", "curtos"),
        "trilha": os.path.join(_TRILHAS, "02-leitos", "tensao-suspense",
                               "le-tensao-baixa-LOOP.wav"),
        "realce": "0x22DD22",
        "realce_ass": "&H0022DD22",
        "rotulo": "Placas de Aviso",
        "cta": "Segue para mais",
        "grade": "eq=saturation=1.06:contrast=1.08",
        "pingpong": False,
        "corte": 0.9,                   # medido na referencia
        # mesmo motivo do canal de curiosidades: a voz e clonada, entao
        # acelerar e transpor por cima e desfazer o que o clone entregou
        "voz": 1.0,
        "pitch": 1.0,
    },
    "futebol": {
        "curtos": os.path.join(_CANAIS, "bora-de-bola", "curtos"),
        # o leito do canal, o mesmo que o `mixa.py` do longo usa -- e leito, nao
        # trilha: existe para o silencio entre frases nao ficar exposto.
        "trilha": os.path.join(_TRILHAS, "02-leitos", "tensao-suspense",
                               "le-tensao-baixa-LOOP.wav"),
        # amarelo do Bora de Bola (`thumb-system.yaml`, realce_primario)
        "realce": "0xFCCC0C",
        "realce_ass": "&H000CCCFC",
        "rotulo": "Bora de Bola",
        "cta": "Vídeo completo no canal",
        # o acervo de futebol e gramado verde e camisa de clube: dessaturar
        # pouco (senao vira preto e branco) e so firmar o contraste.
        "grade": "eq=saturation=0.82:contrast=1.10:brightness=-0.03",
        # FUTEBOL TEM VETOR. A jogada vai para algum lado, e inverter o tempo
        # inverte o sentido: o jogador corre de costas e a bola volta para o pe.
        # O founder pegou isso no primeiro lote, em 07/09.
        "pingpong": False,
    },
}

W, H = 1080, 1920
FPS = 30
FONTE = "Impact"
FONTE_TTF = r"C:\Windows\Fonts\impact.ttf"
FONTE_ROTULO = "C" + chr(92) + ":/Windows/Fonts/seguibl.ttf"

# Preenchidos por `usa_canal()` no comeco do main. Ficam em modulo porque as
# funcoes de desenho os leem de varios lugares; trocar isso por parametro
# atravessaria seis assinaturas para ganhar nada.
CURTOS = CANAIS["estoico"]["curtos"]
TRILHA = CANAIS["estoico"]["trilha"]
AMBAR = CANAIS["estoico"]["realce"]
AMBAR_ASS = CANAIS["estoico"]["realce_ass"]
GRADE_ACERVO = CANAIS["estoico"]["grade"]
BRANCO_ASS = "&H00FFFFFF"


def usa_canal(nome):
    """Aponta o motor para a identidade de um canal."""
    global CURTOS, TRILHA, AMBAR, AMBAR_ASS, GRADE_ACERVO
    c = CANAIS[nome]
    CURTOS, TRILHA = c["curtos"], c["trilha"]
    AMBAR, AMBAR_ASS, GRADE_ACERVO = c["realce"], c["realce_ass"], c["grade"]
    return c


# ── ZONA SEGURA DAS REDES ────────────────────────────────────────────────────
# Numeros do squad de farming (`farm-assemble.js`), MEDIDOS na interface real:
#
#   coluna de botoes a DIREITA          ~180 px em 1080 de largura
#   perfil / legenda / audio na BASE    ~420 px em 1920 de altura
#
# O app desenha por cima do video. Texto que invade essas faixas fica ilegivel
# no feed mesmo estando perfeito no arquivo -- e o arquivo e a unica coisa que
# eu consigo conferir aqui. Por isso a zona vem de numero medido, nao de olho.
#
# A MARGEM NAO E A DO FARMING, E A CONTA E ESTA:
#
#   Copiei os 120 px que o farming usa na legenda de fala e a prova visual
#   (`prova_zona_segura.py`) mostrou o texto entrando na faixa vermelha. Com
#   margem de 120 e texto CENTRADO, a linha cheia vai de 120 a 960 -- e a
#   coluna de botoes comeca em 900.
#
#   Nos 120 funcionam porque a legenda deles tem corpo 56 e raramente enche a
#   linha; a minha tem corpo 92 em caixa-alta e enche sempre. Numero herdado
#   sem refazer a conta e numero errado com aparencia de fundamentado.
#
#   Area livre a esquerda da coluna: 0 a 900. Texto centrado em 540 com 700 de
#   largura ocupa de 190 a 890 -- 10 px de folga.
UI_BASE = 420
UI_LADO = 180
MARGEM_LADO = 190
LARGURA_UTIL = W - 2 * MARGEM_LADO          # 700 px

# 58%% da altura: ponto de leitura natural do vertical, bem acima da faixa de
# 420 px da base. A versao anterior punha a legenda em 1290 (67%%) e a chamada
# final em 1580 (82%%) -- esta ultima DENTRO da faixa da UI.
LEGENDA_YF = 0.58

# O Fontsize do `.ass` NAO e o corpo em pixels, e o fator DEPENDE DA FAMILIA.
#
# O farming mede 0,728 e diz explicitamente que o valor foi calibrado para a
# Montserrat, "outras familias herdam ate serem medidas". Herdei sem medir e a
# legenda saiu 20%% menor do que eu tinha pedido.
#
# MEDIDO AQUI para a Impact, desenhando "HAMBURGEFONSTIV" num quadro preto pelo
# proprio libass e comparando a largura da tinta com a que o PIL da no mesmo
# corpo:
#     Fontsize 100,00 -> 628 px de tinta -> corpo equivalente 81,77
#     Fontsize 137,36 -> 861 px de tinta -> corpo equivalente 112,11
# Os dois pontos dao 0,8177 e 0,8162. O fator da Impact e 0,8168.
FATOR_LIBASS = 0.8168


def _run(cmd, tmp=None):
    r = subprocess.run(cmd, cwd=tmp, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "")[-800:])
    return r


def _dur(p):
    return float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", p], capture_output=True, text=True).stdout.strip())


# Cada segmento recebe um destes. E a variacao entre eles que faz quatro takes
# sustentarem sessenta segundos sem parecer repeticao.
MOVS = ["entra", "sai", "deriva_dir", "sobe", "deriva_esq"]


def _filtro_mov(mov, seg, l, a, sup=2):
    """Expressao de zoompan por tipo de movimento.

    Calculado em `sup`x e reduzido depois: o zoompan arredonda a posicao para
    pixel inteiro e, direto na resolucao final, o movimento anda em degraus
    (medido no canal de futebol: 68%% de variacao contra 28%%).
    """
    n = max(int(seg * FPS), 2)
    centro_x, centro_y = "iw/2-(iw/zoom/2)", "ih/2-(ih/zoom/2)"
    if mov == "entra":
        z, x, y = "1.02+%.8f*on" % (0.15 / n), centro_x, centro_y
    elif mov == "sai":
        z, x, y = "1.17-%.8f*on" % (0.15 / n), centro_x, centro_y
    elif mov == "deriva_dir":
        z, x, y = "1.13", "(iw-iw/zoom)*(on/%d)" % n, centro_y
    elif mov == "deriva_esq":
        z, x, y = "1.13", "(iw-iw/zoom)*(1-on/%d)" % n, centro_y
    else:
        z, x, y = "1.15", centro_x, "(ih-ih/zoom)*(1-on/%d)" % n
    # `force_original_aspect_ratio=increase` + `crop` E OBRIGATORIO, nao enfeite.
    #
    # `scale=L:A` puro DEFORMA quando a proporcao da fonte nao e a do destino.
    # Com o acervo vertical do Pexels isso passava despercebido (ja vem 9:16),
    # mas o acervo do EPISODIO e 1920x1080 -- esticar para 1080x1920 espremeria
    # o estadio inteiro numa coluna. Preenche e corta o excedente: e o mesmo
    # tratamento que o `farm-assemble` do squad de farming usa.
    return ("scale=%d:%d:force_original_aspect_ratio=increase:flags=lanczos,"
            "crop=%d:%d,"
            "zoompan=z='%s':d=1:x='%s':y='%s':s=%dx%d:fps=%d,"
            "scale=%d:%d:flags=lanczos,setsar=1"
            % (l * sup, a * sup, l * sup, a * sup,
               z, x, y, l * sup, a * sup, FPS, l, a))


def segmento(take, seg, mov, saida, rascunho=False, grade="",
             pingpong=True, entrada=0.0):
    """Um corte curto do take, com movimento proprio.

    PINGPONG — E BOM NO ESTOICO E ERRADO NO FUTEBOL
      O pingpong (frente + tras) dobra o ciclo sem corte visivel. Em cena
      atmosferica -- fumaca subindo, agua ondulando -- o retorno passa
      despercebido e resolve o problema do take curto.

      Em futebol ele DENUNCIA na hora: jogador corre de costas, a bola volta
      para o pe, a torcida senta. O founder pegou isso em 07/09, e a razao e do
      material: futebol tem VETOR (a jogada vai para algum lado), atmosfera nao
      tem. Onde ha vetor, inverter o tempo inverte o sentido.

      Por isso e opcao do canal, nao do motor.

    ENTRADA VARIAVEL — o que substitui o pingpong
      Sem pingpong, o take reinicia quando acaba, e um take de 9 s cortado em
      pedacos de 2,7 s mostraria o MESMO trecho varias vezes. Entrando em
      offsets diferentes, cada segmento pega um pedaco diferente do mesmo take.
      Corte seco entre pedacos e a linguagem do esporte -- nao e defeito ali.

    FOTO TAMBEM E TAKE
      Se o arquivo for imagem, entra com `-loop 1` e o mesmo zoompan. O Ken
      Burns sobre foto real e o que o canal ja faz no video longo; aqui ele
      permite que a FOTO DO FATO -- os dois jogadores discutindo de verdade --
      apareca no curto, em vez de so gramado generico.
    """
    l, a = (W // 2, H // 2) if rascunho else (W, H)
    e_foto = take.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    g = (grade + ",") if grade else ""
    mov_f = _filtro_mov(mov, seg, l, a)

    if e_foto:
        entrada_args = ["-loop", "1", "-t", "%.3f" % (seg + 0.5), "-i", take]
        filtro = "[0:v]fps=%d,%s%s[v]" % (FPS, g, mov_f)
    else:
        # `-ss` ANTES do `-i` aqui e de proposito: e busca rapida, e alguns
        # decimos de imprecisao nao importam quando o objetivo e so nao repetir
        # o mesmo trecho.
        entrada_args = (["-ss", "%.2f" % entrada] if entrada > 0.05 else []) \
            + ["-i", take]
        if pingpong:
            filtro = ("[0:v]split=2[fw][bk];[bk]reverse[rv];"
                      "[fw][rv]concat=n=2:v=1:a=0,"
                      "fps=%d,loop=loop=-1:size=32767:start=0,"
                      "trim=duration=%.3f,setpts=N/%d/TB,%s%s[v]"
                      % (FPS, seg, FPS, g, mov_f))
        else:
            filtro = ("[0:v]fps=%d,loop=loop=-1:size=32767:start=0,"
                      "trim=duration=%.3f,setpts=N/%d/TB,%s%s[v]"
                      % (FPS, seg, FPS, g, mov_f))

    _run(["ffmpeg", "-v", "error", "-y"] + entrada_args +
         ["-filter_complex", filtro, "-map", "[v]",
          "-c:v", "libx264", "-preset", "veryfast" if rascunho else "slow",
          "-crf", "24" if rascunho else "19", "-pix_fmt", "yuv420p",
          "-t", "%.3f" % seg, saida])
    return saida


def _dur_segura(caminho):
    """Duracao do arquivo, ou 0 para imagem (que nao tem duracao)."""
    if caminho.lower().endswith((".jpg", ".jpeg", ".png", ".webp")):
        return 0.0
    try:
        return _dur(caminho)
    except Exception:
        return 0.0


def _acha_na_fala(palavras, ancora, t_ini=None, t_fim=None):
    """Segundo em que a locucao chega no trecho `ancora`.

    Portado do `monta.py` do canal de futebol, onde ja pagou duas correcoes:
    casa por CARACTERE (o transcritor parte e come palavras) e restringe a
    busca a uma janela (ratio alto nao garante posicao certa quando a frase se
    repete).
    """
    if not palavras or not ancora:
        return None
    import difflib
    import unicodedata as _u

    # O TRANSCRITOR ESCREVE NUMERO EM DIGITO, O ROTEIRO ESCREVE POR EXTENSO.
    #
    # A ancora "Numero tres o candiru" nunca casava com "Numero 3, o Candiru":
    # `tres` sao quatro caracteres contra um, e num alvo de dezoito isso derruba
    # o ratio abaixo do corte. O botao de inscricao do piloto de 07/09 sumiu
    # exatamente assim -- sem erro, so sem aparecer.
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

    if t_ini is not None:
        palavras = [w for w in palavras
                    if t_ini - 2.0 <= w["t"] <= (t_fim or 1e9) + 2.0]
        if not palavras:
            return None
    alvo = "".join(n(w) for w in ancora.split())
    if len(alvo) < 8:
        return None
    seq = [n(w["p"]) for w in palavras]
    n_pal = len([w for w in ancora.split() if n(w)])
    janela = n_pal + 3

    m = difflib.SequenceMatcher()
    m.set_seq2(alvo)
    aprox = []
    for i in range(len(seq)):
        trecho = "".join(seq[i:i + janela])[:len(alvo) + 12]
        if len(trecho) < len(alvo) * 0.6:
            continue
        m.set_seq1(trecho)
        if m.quick_ratio() >= 0.60:
            aprox.append((m.quick_ratio(), i, trecho))

    melhor, melhor_t = 0.0, None
    for _, i, trecho in sorted(aprox, reverse=True)[:40]:
        # A JANELA E APARADA NO TAMANHO DO ALVO, tambem.
        #
        # A janela tem `n_palavras + 3` palavras, o que sobra de proposito para
        # o transcritor ter partido uma. Mas quando o alvo e CURTO isso dilui o
        # casamento: "numero4ocoala" (13 letras) contra uma janela de 25 da
        # ratio 0,68 e cai fora, mesmo com as 13 letras casando -- foi assim
        # que "Numero quatro o coala" nao achou "Número 4. O koala."
        #
        # Testar tambem o prefixo do tamanho do alvo custa nada e resolve.
        for cand in (trecho, trecho[:len(alvo)]):
            if len(cand) < len(alvo) * 0.6:
                continue
            m.set_seq1(cand)
            r = m.ratio()
            if r > melhor:
                melhor, melhor_t = r, palavras[i]["t"]
    return melhor_t if melhor >= 0.72 else None


def sequencia_ancorada(fontes, ancoras, fala, n_seg, durs, t0_corpo=0.0):
    """Plano de segmentos com cada take no trecho da fala que ele ilustra.

    POR QUE ANCORA, E NAO DISTRIBUICAO UNIFORME
      A distribuicao uniforme serve quando o take e atmosfera -- no estoico
      tanto faz se a vela entra aos 12 ou aos 20 s. Nao serve quando o roteiro
      diz o NOME do que esta na tela.

      No piloto de 07/09 a locucao contava cinco bichos com nome e a tela
      mostrava outros: onca enquanto a fala dizia arraia, piranha enquanto
      dizia formiga. O founder viu de imediato, e com razao -- ali a imagem
      errada nao e ilustracao fraca, e informacao errada.

      Cada take declara em que trecho da fala ele entra. O que nao tem ancora
      preenche o que sobrar, na ordem, sem repetir o vizinho.
    """
    # AGRUPA POR ETIQUETA: varios clipes podem ilustrar o mesmo trecho.
    #
    # Um clipe por ancora resolvia o take ERRADO e deixava o take PARADO -- o
    # trecho da arraia mostrava arraia, mas o mesmo video por sete segundos, e
    # o motor contou 39 repeticoes consecutivas. Com dois ou tres clipes por
    # etiqueta, o trecho continua sendo o bicho certo e volta a ter corte.
    por_etiqueta, livres = {}, []
    for f in fontes:
        e = etiqueta_do_take(f)
        (por_etiqueta.setdefault(e, []).append(f) if e in ancoras
         else livres.append(f))

    marcados = []                      # [(t, [clipes])]
    for e, fs in por_etiqueta.items():
        t = _acha_na_fala(fala, ancoras[e])
        if t is None:
            print("   [ancora] '%s' nao achou '%s' na fala"
                  % (e, ancoras[e][:44]))
            livres.extend(fs)
        else:
            marcados.append((t, fs))
    sequencia_ancorada.casadas = {etiqueta_do_take(fs[0]) for _, fs in marcados}
    marcados.sort(key=lambda x: x[0])

    # O INICIO DE CADA SEGMENTO NO VIDEO, NAO NO CORPO.
    #
    # `t0_corpo` e quanto o hook gerado ocupa antes do primeiro segmento. Sem
    # ele o plano comeca a contar do zero enquanto o video ja anda ha tres
    # segundos, e TODA ancora entra adiantada: a arraia aparecia enquanto a
    # locucao ainda dizia "cinco bichos da Amazonia".
    inicios, acc = [], float(t0_corpo)
    for d in durs:
        inicios.append(acc)
        acc += d

    continuos = getattr(_ancoras_de_take, "continuos", set())
    plano, ultimo, giro = [], None, 0
    rodizio = {}                       # etiqueta -> proximo clipe do grupo
    for i, t0 in enumerate(inicios):
        # o grupo ancorado vale do seu segundo ate o do proximo ancorado
        escolha, continuo = None, False
        for k, (ta, fs) in enumerate(marcados):
            tb = marcados[k + 1][0] if k + 1 < len(marcados) else 1e9
            if ta <= t0 + durs[i] * 0.5 < tb:
                e = etiqueta_do_take(fs[0])
                # TRECHO CONTINUO: um plano so, sem rodizio.
                #
                # No formato modelado o bloco emocional NAO CORTA -- o bicho
                # fica na tela dez segundos seguidos, e e isso que da tempo de
                # olhar para ele. Picotando a cada 0,9 s como o resto do video,
                # o bloco vira colagem e a comocao nao acontece.
                if e in continuos:
                    escolha, continuo = fs[0], True
                    break
                j = rodizio.get(e, 0)
                # dentro do grupo, nunca repete o segmento anterior
                if len(fs) > 1 and fs[j % len(fs)] == ultimo:
                    j += 1
                escolha = fs[j % len(fs)]
                rodizio[e] = j + 1
                break
        if escolha is None and livres:
            cand = [f for f in livres if f != ultimo] or livres
            escolha = cand[giro % len(cand)]
            giro += 1
        if escolha is None:
            todos = [f for f in fontes if f != ultimo] or fontes
            escolha = todos[giro % len(todos)]
            giro += 1

        n = sum(1 for p in plano if p[0] == escolha)
        d = _dur_segura(escolha)
        folga = max(d - durs[i] - 0.2, 0.0)
        entrada = (n * durs[i]) % folga if folga > 0.4 else 0.0
        plano.append((escolha, entrada, continuo))
        ultimo = escolha
    return plano


def sequencia(fontes, n_seg, durs, intercala_foto=True):
    """Qual fonte entra em cada segmento, e em que ponto dela.

    TRES REGRAS, e as tres saem de defeito visto na tela:

      1. NUNCA REPETE A FONTE ANTERIOR. A versao anterior escolhia por faixa
         (`int(i/n_seg * len(takes))`) e trocava so a cada tres segmentos --
         o mesmo take ficava oito segundos no ar em tres pedacos, que e o
         "take repetido em sequencia" que o founder apontou.

      2. INTERCALA VIDEO E FOTO quando ha os dois. A foto e o FATO (os dois
         jogadores discutindo); o video e o ambiente. Alternar da ao curto a
         mesma gramatica do episodio longo, onde foto e acervo se revezam.

      3. ENTRA EM PONTO DIFERENTE A CADA VOLTA. Quando uma fonte volta, ela
         volta em outro trecho -- senao o espectador ve a mesma imagem duas
         vezes e le como travamento.
    """
    videos = [f for f in fontes if not f.lower().endswith(
        (".jpg", ".jpeg", ".png", ".webp"))]
    fotos = [f for f in fontes if f not in videos]
    if not videos and not fotos:
        return []

    plano, ultimo, voltas = [], None, {}
    for i in range(n_seg):
        # a cada segmento, o balde alterna -- mas so se os dois tem material
        balde = fotos if (intercala_foto and fotos and videos and i % 2) \
            else (videos or fotos)
        cand = [f for f in balde if f != ultimo] or balde
        f = cand[voltas.get(id(balde), 0) % len(cand)]
        voltas[id(balde)] = voltas.get(id(balde), 0) + 1

        n = sum(1 for p in plano if p[0] == f)
        d = _dur_segura(f)
        # sobra util do take depois de tirar o pedaco que vai ser usado
        folga = max(d - durs[i] - 0.2, 0.0)
        entrada = (n * durs[i]) % folga if folga > 0.4 else 0.0
        plano.append((f, entrada, False))
        ultimo = f
    return plano


def _vis(t):
    """A string COMO VAI PARECER na tela.

    `_esc` troca o apostrofo reto pelo curvo (o reto fecharia a aspas do
    filtro). Medir a string original e desenhar a trocada daria largura
    errada justamente nas frases com apostrofo -- por isso toda medicao
    passa por aqui antes.
    """
    return (t or "").replace("'", "’")


def _esc(t):
    return (_vis(t).replace("\\", "\\\\").replace(":", "\\:")
                   .replace("%", "\\%"))


def _cabe(txt, tam, util):
    """Largura REAL na fonte. Contar caractere nao serve -- em Impact "MMM" e
    quase o dobro de "III", e a primeira versao cortou legenda na lateral."""
    try:
        from PIL import ImageFont
        f = ImageFont.truetype(r"C:\Windows\Fonts\impact.ttf", tam)
        return f.getbbox(txt)[2] <= util
    except Exception:
        return len(txt) * tam * 0.46 <= util


def _termos_de_foto(pack):
    """(`fotos_termos`, `fotos_blocos`) do `curto.yaml`.

    Fica no YAML e nao no codigo porque muda a cada curto: e a unica coisa que
    liga ESTE curto ao assunto dele dentro das 74 fotos do episodio.
    """
    y = os.path.join(pack, "curto.yaml")
    if not os.path.isfile(y):
        return [], []
    try:
        import yaml
        d = yaml.safe_load(io.open(y, encoding="utf-8").read()) or {}
        v = d.get("visual") or {}
        return v.get("fotos_termos") or [], v.get("fotos_blocos") or []
    except Exception:
        return [], []


def etiqueta_do_take(caminho):
    """`t03-5-arraia.mp4` -> `5-arraia`. O `tNN-` e ordem, nao identidade."""
    n = os.path.splitext(os.path.basename(caminho))[0]
    return re.sub(r"^t\d+-", "", n)


def _ancoras_de_take(pack):
    """{etiqueta: trecho da fala} — de `visual.consultas` do curto.yaml.

    POR QUE POR ETIQUETA, E NAO POR NOME DE ARQUIVO
      A primeira versao mapeava `t02-5-arraia.mp4` -> ancora, o que so funciona
      com um clipe por consulta. Como a consulta agora pede dois ou tres
      (`n:` no curto.yaml), os arquivos da mesma arraia sao `t02-`, `t03-` e
      `t04-5-arraia.mp4`: o indice muda, a etiqueta nao. A etiqueta e o que
      identifica O QUE esta na tela; o numero so diz em que ordem foi baixado.
    """
    y = os.path.join(pack, "curto.yaml")
    if not os.path.isfile(y):
        return {}
    try:
        import yaml
        d = yaml.safe_load(io.open(y, encoding="utf-8").read()) or {}
        cs = (d.get("visual") or {}).get("consultas") or []
    except Exception:
        return {}
    fora, continuos = {}, set()
    for c in cs:
        if not isinstance(c, dict):
            continue
        if c.get("ancora"):
            fora[c["etiqueta"]] = c["ancora"]
        if c.get("continuo"):
            continuos.add(c["etiqueta"])
    _ancoras_de_take.continuos = continuos
    return fora


# ── AS CAMADAS DO FORMATO MODELADO ──────────────────────────────────────────
#
# Emoji reativo, botao de CTA e a placa de aviso. No benchmark elas entram no
# SEGUNDO da frase que as pede -- o emoji de espanto cai em cima do "Bro, o que
# essa placa quer dizer?", nao num tempo fixo. Por isso a camada declara uma
# `ancora` (trecho da fala) e nao um segundo: o mesmo mecanismo que ja coloca o
# take certo na hora certa serve para elas.
#
# Slots em y, todos dentro da zona segura medida em 06/09: o rotulo ocupa 190,
# a legenda esta centrada em 1114 e a UI da base comeca em 1500.
# `topo` era 340 e o emoji encostava no rotulo do canal, no alto do quadro --
# longe do rosto e longe da legenda, que e onde o olho esta. Desceu para 620,
# que fica acima da legenda (centro em 1114) sem competir com ela.
SLOTS = {"topo": 620, "meio": 780, "acima-legenda": 900, "baixo": 1300}


def _camadas_do_curto(pack):
    y = os.path.join(pack, "curto.yaml")
    if not os.path.isfile(y):
        return []
    try:
        import yaml
        d = yaml.safe_load(io.open(y, encoding="utf-8").read()) or {}
        return (d.get("visual") or {}).get("camadas") or []
    except Exception:
        return []


def camadas_filtro(pack, fala, dur, tmp, rascunho=False):
    """(chains, quantas) — as camadas ja como filtergraph, PNGs gravados no tmp.

    Entram por `movie=` e nao por `-i`: o filtro ja roda com o cwd no tmp por
    causa do `.ass`, entao o nome relativo resolve sozinho e nao ha um segundo
    lugar onde a contagem de entradas possa sair de sincronia.
    """
    import camadas_curto as cc

    e = 0.5 if rascunho else 1.0
    itens = _camadas_do_curto(pack)
    chains, n = [], 0
    for k, c in enumerate(itens):
        tipo = c.get("tipo")
        t0 = c.get("t")
        if t0 is None and c.get("ancora"):
            t0 = _acha_na_fala(fala, c["ancora"])
        if t0 is None:
            print("   [camada] %s sem ancora na fala — fora" % tipo)
            continue
        t0 = float(t0) + float(c.get("atraso", 0))
        t1 = min(t0 + float(c.get("dur", 2.2)), dur)
        if t1 <= t0:
            continue

        px = int(float(c.get("px", 190)) * e)
        if tipo == "emoji":
            im = cc.emoji(c["glifo"], px)
        elif tipo == "gesto":
            # CTA do TikTok pelo NOME DO GESTO. O verbo e o icone vem juntos,
            # entao nao ha como pedir "inscreva-se" num video que so vai para
            # o TikTok. `gesto` aceita lista: sai o trio empilhado.
            g = c["gesto"]
            im = (cc.grupo(g, px=max(int(px * 0.34), 12))
                  if isinstance(g, (list, tuple))
                  else cc.gesto(g, px=max(int(px * 0.34), 12)))
        elif tipo == "botao":
            im = cc.botao(c["texto"], px=max(int(px * 0.34), 12),
                          icone=c.get("icone"))
        elif tipo == "placa":
            import placa_aviso
            im = placa_aviso.desenha(c.get("pict", "nao-alimentar"),
                                     largura=int(W * e * float(c.get("larg", 0.62))),
                                     riscado=c.get("riscado", True))
        elif tipo == "seta":
            import placa_aviso
            im = placa_aviso.seta(largura=int(W * e * float(c.get("larg", 0.34))),
                                  ang=float(c.get("ang", -32)))
        else:
            continue

        arq = "cam%02d.png" % k
        im.save(os.path.join(tmp, arq))

        ycen = int(float(SLOTS.get(c.get("pos", "meio"),
                                   c.get("pos", 700) if isinstance(c.get("pos"), int)
                                   else 700)) * e)
        # o x aceita fracao da largura; o default centra
        fx = c.get("x")
        xexp = ("(W-w)/2" if fx is None
                else "%d" % int(float(fx) * W * e))
        # entrada deslizando 24 px: da vida ao elemento sem depender de alpha,
        # que num `movie=` de quadro unico nao anima (o PTS nao anda).
        yexp = "%d-24*max(0,1-(t-%.2f)/0.22)" % (ycen - im.height // 2, t0)
        chains.append("movie=%s[k%d];[V][k%d]overlay=x='%s':y='%s':"
                      "enable='between(t,%.2f,%.2f)'"
                      % (arq, k, k, xexp, yexp, t0, t1))
        n += 1
    return chains, n


def fotos_do_fato(herda, termos, blocos=None):
    """As fotos REAIS do episodio que servem a ESTE curto.

    POR QUE ISTO E DIFERENTE NO FUTEBOL
      No estoico o take e atmosfera: marmore, vela, ceu. Qualquer um serve para
      qualquer curto, porque nenhum afirma nada sobre um fato.

      No futebol o curto fala de um jogo, de dois jogadores, de uma proposta com
      valor. Gramado generico ilustra; a FOTO DO FATO -- os dois discutindo de
      verdade -- e o que o espectador veio ver. O founder resumiu em 07/09:
      "precisa de takes e fotos reais das partidas ou polemicas em questao".

    DUAS ROTAS, E A PRIMEIRA E MELHOR
      `blocos` puxa do `monta.FOTOS_POR_EPISODIO`, que e a lista JA CONFERIDA
      foto a foto contra o titulo da materia de origem quando o episodio foi
      montado. Reaproveitar essa curadoria e de graca.

      `termos` casa por substring no nome do arquivo. E o fallback, e ele erra:
      filtrando "cruzeiro" no primeiro corte veio a arte de divulgacao de
      "Corinthians x Cruzeiro FEMININO" -- que e outro jogo, outro campeonato, e
      estava justamente entre as excluidas do mapa do episodio.
    """
    import glob
    if not herda:
        return []
    dirf = os.path.join(os.path.dirname(herda), "fotos")
    ep = os.path.basename(os.path.dirname(os.path.dirname(herda)))

    if blocos:
        try:
            import importlib.util
            # O `monta.py` do futebol faz `from narra_comfy import CANAL`, e
            # sem a pasta dele no path o import falha com ModuleNotFoundError --
            # que o `except` engolia, derrubando tudo no fallback por substring
            # sem uma linha de aviso. Foi assim que a arte do Brasileirao
            # feminino continuou entrando depois de eu "corrigir".
            dir_fut = os.path.join(RAIZ, "apps", "canal-futebol")
            if dir_fut not in sys.path:
                sys.path.insert(0, dir_fut)
            mp = os.path.join(dir_fut, "monta.py")
            spec = importlib.util.spec_from_file_location("_monta_fut", mp)
            mod = importlib.util.module_from_spec(spec)
            sys.modules["_monta_fut"] = mod
            spec.loader.exec_module(mod)
            mapa = mod.FOTOS_POR_EPISODIO.get(ep, {})
        except Exception:
            mapa = {}
        chaves, vistas = [], set()
        for b in blocos:
            for ch in mapa.get(b, []):
                if ch not in vistas:
                    vistas.add(ch)
                    chaves.append(ch)
        achadas = []
        for ch in chaves:
            if ch.endswith(".jpg") and os.path.isfile(os.path.join(dirf, ch)):
                achadas.append(os.path.join(dirf, ch))
                continue
            for f in sorted(glob.glob(os.path.join(dirf, ch + "*.jpg"))):
                achadas.append(f)
                break
        if achadas:
            return achadas

    if not termos:
        return []
    achadas = []
    for f in sorted(glob.glob(os.path.join(dirf, "*.jpg"))):
        nome = os.path.basename(f).lower()
        if any(t.lower().replace(" ", "") in nome for t in termos):
            achadas.append(f)
    return achadas


def fonte_de_takes(pack, slug, herda=None):
    """(lista de mp4, gradacao a aplicar) -- nesta ordem de preferencia.

      1. `03-takes/*.mp4` no proprio pack        take proprio, ja na paleta
      2. `outputs/curtos/{id}/takes-externos/`   onde estao os do LA1-P1, que
                                                 foram gerados antes de o pack
                                                 ter a pasta 03-takes
      3. `herda`                                 acervo do EPISODIO de origem
      4. `03-takes/acervo/*.mp4`                 banco vertical do curto

    A ordem nao e arbitraria: take proprio custou madrugada de GPU e sempre
    ganha do banco.

    POR QUE O ACERVO DO EPISODIO ENTRA NA FRENTE DO BANCO VERTICAL (futebol)
      O pool vertical de futebol no Pexels e pequeno, e a folha de contato de
      07/09 mostrou o preco: gaivotas passeando dentro do gol, vista aerea de
      cidade como "luz de estadio", e um lineout de RUGBY devolvido para
      "soccer players celebrating goal" -- a mesma armadilha ja registrada em
      `broll/acervo.py`.

      O acervo do EPISODIO ja passou por essa conferencia, e e do mesmo assunto.
      Ele e 1920x1080, entao entra recortado no centro -- o que para estadio,
      torcida e gramado nao custa nada, porque o assunto ocupa o quadro todo.

      Bonus: o curto passa a usar o mesmo material do longo, o que e exatamente
      o que faz alguem reconhecer o canal quando o corte aparece no feed.
    """
    import glob
    proprios = sorted(glob.glob(os.path.join(pack, "03-takes", "*.mp4")))
    if proprios:
        return proprios, ""
    legado = sorted(glob.glob(os.path.join(
        RAIZ, "outputs", "curtos", "-".join(slug.split("-")[:2]).lower(),
        "takes-externos", "*.mp4")))
    if legado:
        return legado, ""
    if herda:
        do_episodio = sorted(glob.glob(os.path.join(herda, "*.mp4")))
        if do_episodio:
            return do_episodio, GRADE_ACERVO
    # `.png` tambem: quando o acervo nao tem a especie, o `acervo_curto.py`
    # gera a imagem em vez de baixar OUTRO bicho (a cobra-coral nao existe no
    # Pexels). O `segmento()` ja anima foto com `-loop 1`.
    acervo = sorted(glob.glob(os.path.join(pack, "03-takes", "acervo", "*.mp4"))
                    + glob.glob(os.path.join(pack, "03-takes", "acervo",
                                             "t*.png")))
    return acervo, GRADE_ACERVO


def _norm(t):
    import re
    import unicodedata
    t = unicodedata.normalize("NFD", (t or "").lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", t)


def texto_do_roteiro(caminho):
    """As palavras COMO FORAM ESCRITAS, na ordem em que sao ditas.

    Le so a secao `## ROTEIRO` e joga fora os marcadores `**[img NN ...]**` --
    eles sao direcao de imagem, nao fala.
    """
    import re
    linhas = io.open(caminho, encoding="utf-8").read().splitlines()
    dentro, corpo = False, []
    for l in linhas:
        if l.strip().startswith("## "):
            dentro = l.strip().lower().startswith("## roteiro")
            continue
        if not dentro:
            continue
        t = l.strip()
        if not t or t.startswith(("**[", "---", ">", "|")):
            continue
        corpo.append(t)
    palavras = []
    for w in " ".join(corpo).split():
        w = re.sub(r"^\*\*|\*\*$", "", w)
        if _norm(w):
            palavras.append(w)
    return palavras


def alinha(roteiro, transcrito):
    """Grafia do ROTEIRO com o tempo do AUDIO.

    POR QUE ESTA FUNCAO EXISTE
      A legenda saia direto do `fala-real.json`, que e transcricao do Whisper --
      e o Whisper erra grafia. No primeiro corte ele ouviu "nao faz" e escreveu
      "nao faco", e o erro de concordancia foi ao ar na terceira palavra do
      video. O roteiro estava certo o tempo todo.

      E a mesma regra ja registrada no canal de futebol, agora do outro lado: o
      audio e a autoridade sobre QUANDO, o roteiro e a autoridade sobre O QUE.
      Nenhum dos dois manda nos dois.

    COMO
      Casa as duas listas por palavra normalizada (`difflib`). Nos trechos
      iguais, o tempo vem direto. Nos trechos em que o Whisper divergiu, os
      tempos sao interpolados entre as ancoras vizinhas -- perde-se precisao de
      decimo de segundo em algumas palavras, e ganha-se a grafia correta em
      todas.
    """
    import difflib
    a = [_norm(w) for w in roteiro]
    b = [_norm(w["p"]) for w in transcrito]
    saida = [None] * len(roteiro)
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b,
                                                      autojunk=False).get_opcodes():
        if op == "equal":
            for k in range(i2 - i1):
                saida[i1 + k] = (transcrito[j1 + k]["t"], transcrito[j1 + k]["f"])
        elif j2 > j1:
            # divergencia com audio correspondente: reparte o intervalo
            ini, fim = transcrito[j1]["t"], transcrito[j2 - 1]["f"]
            n = max(i2 - i1, 1)
            for k in range(i2 - i1):
                saida[i1 + k] = (ini + (fim - ini) * k / n,
                                 ini + (fim - ini) * (k + 1) / n)
    # palavra do roteiro sem nada no audio (o Whisper comeu): encaixa entre os
    # vizinhos ja resolvidos em vez de descartar a palavra
    for i, v in enumerate(saida):
        if v is None:
            ant = next((saida[j][1] for j in range(i - 1, -1, -1) if saida[j]), 0.0)
            pos = next((saida[j][0] for j in range(i + 1, len(saida)) if saida[j]),
                       ant + 0.3)
            saida[i] = (ant, max(pos, ant + 0.05))
    return [{"t": saida[i][0], "f": saida[i][1], "p": roteiro[i]}
            for i in range(len(roteiro))]


def _largura(txt, tam):
    """Avanco REAL do texto na fonte, em pixels.

    Decide onde a linha quebra. Contar caractere nao serve: em Impact "MMM" e
    quase o dobro de "III", e foi assim que a primeira versao cortou legenda na
    lateral. Aqui a medida e do desenho, nao do comprimento da string.
    """
    try:
        from PIL import ImageFont
        return ImageFont.truetype(FONTE_TTF, tam).getlength(txt)
    except Exception:
        return len(txt) * tam * 0.46


def _quebra(palavras, corpo, max_linhas=1):
    """Distribui as palavras em ate `max_linhas` dentro da largura util.

    Devolve None quando nao cabe -- e a forma de o agrupador saber que precisa
    fechar o grupo e comecar outro.

    POR QUE UMA LINHA, E NAO AS DUAS DO FARMING
      O farming usa duas linhas porque a legenda dele e ACOMPANHAMENTO, com
      corpo 56 -- texto pequeno, muita informacao por cue. Aqui a legenda e o
      elemento principal do quadro, em caixa-alta e corpo 100.

      Medido: com duas linhas o mesmo curto passou de 56 para 31 grupos. Cada
      bloco fica mais tempo parado na tela e a leitura deixa de ser um relance.
      Uma linha por vez devolve o ritmo que o formato pede -- a mesma cadencia
      de ~17 caracteres do primeiro corte, agora dentro da margem segura.
    """
    linhas, atual = [], []
    for w in palavras:
        if _largura(w, corpo) > LARGURA_UTIL:
            return None                    # palavra unica que nao cabe
        teste = atual + [w]
        if atual and _largura(" ".join(teste), corpo) > LARGURA_UTIL:
            linhas.append(atual)
            atual = [w]
            if len(linhas) >= max_linhas:
                return None
        else:
            atual = teste
    if atual:
        linhas.append(atual)
    return linhas if len(linhas) <= max_linhas else None


def _ass_esc(t):
    return _vis(t).replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")


def _ass_t(s):
    cs = int(round(max(s, 0) * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    seg, cs = divmod(cs, 100)
    return "%d:%02d:%02d.%02d" % (h, m, seg, cs)


def legendas(fala, rascunho=False):
    """Conteudo do `.ass` -- legenda em libass, com karaoke por palavra.

    POR QUE SAIU DO `drawtext` (06/09, apontado pelo founder)
      A versao anterior desenhava UMA drawtext POR PALAVRA, todas com o mesmo
      `y`. Só que o `y` do drawtext posiciona o TOPO da caixa do texto, e a
      altura da caixa depende dos glifos: "VOCE" com circunflexo tem ascendente
      maior que "SABE", entao a caixa e mais alta e a palavra DESCE.

      Na tela isso apareceu como palavra acentuada sentada mais baixo que as
      vizinhas -- em "VOCE SABE", em "PROPOSITO, ELE VIVIA", em quase toda
      frase, porque quase toda frase em portugues tem acento. Nao era bloco
      quebrado: era alinhamento por caixa brigando com a tipografia da lingua.

      O libass resolve porque desenha a LINHA, nao a palavra. A cor entra como
      tag dentro do texto e o layout -- baseline, espaco, quebra -- e identico
      em todas as janelas do grupo. E o mesmo motor que o squad de farming usa.

    ZONA SEGURA
      Alignment=5 (centro/meio) com `\\pos`: o ponto mira o CENTRO do bloco, o
      que torna a posicao previsivel com uma ou com duas linhas. As margens e o
      58% da altura vem do farming (ver o bloco de constantes).
    """
    # CORPO em px na resolucao FINAL. A escala do rascunho e aplicada UMA vez,
    # aqui: uma versao anterior escalava o corpo e DEPOIS multiplicava o
    # Fontsize pela escala de novo, e a legenda do rascunho saia com metade do
    # tamanho -- o que faz o rascunho deixar de servir para conferir.
    esc = 0.5 if rascunho else 1.0
    corpo = 92
    fs = corpo * esc / FATOR_LIBASS         # Fontsize do .ass
    y = int(H * esc * LEGENDA_YF)
    x = int(W * esc / 2)
    contorno = 4 if rascunho else 7
    sombra = 2 if rascunho else 3

    # O agrupamento mede no corpo FINAL: assim rascunho e final quebram nos
    # mesmos lugares, e o rascunho serve de fato para conferir o resultado.
    grupos, atual = [], []
    for w in fala:
        teste = atual + [w]
        if atual and _quebra([_vis(z["p"]).upper() for z in teste], 92) is None:
            grupos.append(atual)
            atual = [w]
            continue
        atual = teste
        if w["p"].rstrip().endswith((".", "!", "?")):
            grupos.append(atual)
            atual = []
    if atual:
        grupos.append(atual)

    cab = (
        "[Script Info]\n"
        "ScriptType: v4.00+\n"
        "PlayResX: %d\nPlayResY: %d\n"
        "WrapStyle: 2\nScaledBorderAndShadow: yes\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, "
        "OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, "
        "ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        "Style: Default,%s,%.2f,%s,%s,&H00000000,&HB4000000,0,0,0,0,"
        "100,100,0,0,1,%d,%d,5,%d,%d,0,1\n\n"
        "[Events]\n"
        "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, "
        "Effect, Text\n"
        % (int(W * esc), int(H * esc), FONTE, fs, BRANCO_ASS, BRANCO_ASS,
           contorno, sombra, int(MARGEM_LADO * esc), int(MARGEM_LADO * esc)))

    ev, n_pal = [], 0
    for g, grupo in enumerate(grupos):
        pal = [_vis(w["p"]).upper() for w in grupo]
        linhas = _quebra(pal, 92) or [pal]
        t0 = grupo[0]["t"]
        # O FIM E O INICIO DO PROXIMO: somar respiro punha dois textos na tela
        # ao mesmo tempo em 46 das 52 trocas do primeiro corte.
        t1 = (grupos[g + 1][0]["t"] if g + 1 < len(grupos)
              else grupo[-1]["f"] + 0.3)
        t1 = max(t1 - 0.02, t0 + 0.05)

        # UMA JANELA POR PALAVRA: o ambar segue a fala em vez de ficar parado
        # numa palavra escolhida por heuristica, que foi o "destaque travado".
        for k in range(len(grupo)):
            a0 = max(grupo[k]["t"], t0)
            a1 = grupo[k + 1]["t"] if k + 1 < len(grupo) else t1
            a1 = min(max(a1, a0 + 0.05), t1)
            if a0 >= t1:
                continue
            n_pal += 1
            # Remonta a linha inteira marcando SO a palavra ativa. O texto e
            # sempre o mesmo, entao o libass da a cada palavra exatamente a
            # mesma posicao em todas as janelas do grupo -- e por isso nada
            # pula quando o destaque anda.
            idx, partes = 0, []
            for linha in linhas:
                fora = []
                for w_ in linha:
                    if idx == k:
                        fora.append("{\\c%s}%s{\\c%s}"
                                    % (AMBAR_ASS, _ass_esc(w_), BRANCO_ASS))
                    else:
                        fora.append(_ass_esc(w_))
                    idx += 1
                partes.append(" ".join(fora))
            ev.append("Dialogue: 0,%s,%s,Default,,0,0,0,,{\\pos(%d,%d)}%s"
                      % (_ass_t(a0), _ass_t(a1), x, y, "\\N".join(partes)))

    return cab + "\n".join(ev) + "\n", len(grupos), n_pal


def overlays(dur, rotulo, cta, rascunho=False):
    """A camada que nao vem da fala: rotulo, chamada final e vinheta.

    TUDO AQUI FOI REPOSICIONADO PARA A ZONA SEGURA (06/09). A chamada final
    ficava em y=1580 -- DENTRO dos 420 px de base que o app do TikTok cobre com
    perfil, legenda e audio. Ela existia no arquivo e nao existia no feed.
    """
    e = 0.5 if rascunho else 1.0
    largura = int(W * e)
    margem = int(MARGEM_LADO * e)
    partes = []

    # A REGUA DE PROGRESSO FOI REMOVIDA (06/09), e vale registrar por que.
    #
    # A ideia era boa no papel -- quem ve que falta pouco fica. Na tela ela nao
    # funcionou: uma barra de progresso so le como progresso quando esta
    # ENCOSTADA na borda do quadro, que e onde todo player desenha a dele.
    #
    # Só que a borda do quadro e justamente onde a UI do app passa por cima.
    # Tentei y=0, depois y=24, e a prova visual mostrou os dois dentro dos
    # ~130 px de barra de status e abas. Trazendo para dentro da zona segura,
    # a 16 px acima da faixa de base, ela perdeu a referencia de borda: virou
    # um traco amarelo solto no terco inferior. Foi assim que o founder a
    # descreveu -- "barra amarela aleatoria" -- e a descricao esta certa.
    #
    # Nao ha posicao que resolva: ou encosta na borda e some sob a interface,
    # ou fica visivel e nao le como progresso. O elemento nao cabe neste
    # formato. A retencao fica por conta do corte curto e do hook picotado.

    # ROTULO de abertura: 3 s, sumindo em meio segundo. Em y=190 fica abaixo
    # das abas que o TikTok desenha no topo-centro.
    partes.append(
        "drawtext=fontfile='%s':text='%s':fontsize=%d:fontcolor=%s:"
        "borderw=%d:bordercolor=black@0.8:x=(w-text_w)/2:y=%d:"
        "alpha='if(lt(t,2.5),1,max(0,1-(t-2.5)/0.5))':enable='lt(t,3.05)'"
        % (FONTE_ROTULO, _esc(rotulo.upper()), int(46 * e), AMBAR,
           max(int(3 * e), 2), int(190 * e)))

    # CHAMADA FINAL, agora ACIMA da faixa da UI: a tarja vai de 1300 a 1400,
    # com 100 px de folga ate os 1500 onde a interface comeca. Fica logo abaixo
    # da legenda, que esta centrada em 1114 e ocupa no maximo ate ~1240.
    #
    # 3 s de chamada num curto de 60 s e 5%% do tempo; nos mesmos 3 s de um
    # curto de 15 s seriam 20%%, e a tarja passaria mais tempo na tela do que a
    # tese. A chamada acompanha a peca.
    t_cta = max(dur - min(3.0, dur * 0.14), 0.5)
    alt = int(100 * e)
    ycta = int(1300 * e)
    larg_cta = largura - margem * 2
    partes.append("drawbox=x=%d:y=%d:w=%d:h=%d:color=black@0.62:t=fill:"
                  "enable='gte(t,%.2f)'"
                  % (margem, ycta, larg_cta, alt, t_cta))
    partes.append(
        "drawtext=fontfile='%s':text='%s':fontsize=%d:fontcolor=%s:"
        "x=(w-text_w)/2:y=%d:enable='gte(t,%.2f)'"
        % (FONTE_ROTULO, _esc(cta.upper()), int(42 * e), AMBAR,
           ycta + int(alt * 0.30), t_cta))

    # Vinheta discreta: fecha o olhar no centro sem parecer lente, que foi
    # justamente a ressalva do founder nas imagens cruas.
    partes.append("vignette=PI/5.5")
    return partes


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--rascunho", action="store_true")
    ap.add_argument("--voz", type=float)
    ap.add_argument("--corte", type=float)
    ap.add_argument("--canal", choices=sorted(CANAIS), default="estoico")
    ap.add_argument("--rotulo", help="sobrepoe o rotulo do canal")
    ap.add_argument("--cta", help="sobrepoe a chamada final do canal")
    ap.add_argument("--herda-de", help="slug do episodio cujo acervo de video "
                                       "o curto reaproveita")
    a = ap.parse_args()

    cfg = usa_canal(a.canal)
    a.rotulo = a.rotulo or cfg["rotulo"]
    a.cta = a.cta or cfg["cta"]
    # ritmo e velocidade sao do CANAL; a linha de comando so sobrepoe
    a.voz = a.voz or cfg.get("voz", 1.10)
    a.corte = a.corte or cfg.get("corte", 2.6)

    pack = os.path.join(CURTOS, a.slug)
    vo_orig = os.path.join(pack, "02-narracao", "vo.mp3")
    fala = json.load(open(os.path.join(pack, "02-narracao", "fala-real.json"),
                          encoding="utf-8"))["palavras"]

    # GRAFIA DO ROTEIRO, TEMPO DO AUDIO. O `fala-real.json` e transcricao do
    # Whisper e traz os erros de audicao dele junto -- no primeiro corte, "nao
    # faz" virou "nao faco" e foi ao ar na terceira palavra do video.
    rot = os.path.join(pack, "01-roteiro", "roteiro.md")
    if os.path.isfile(rot):
        escrito = texto_do_roteiro(rot)
        if escrito:
            import difflib
            div = sum(n for op, n in
                      ((o[0], o[2] - o[1]) for o in difflib.SequenceMatcher(
                          None, [_norm(w) for w in escrito],
                          [_norm(w["p"]) for w in fala],
                          autojunk=False).get_opcodes())
                      if op != "equal")
            fala = alinha(escrito, fala)
            print("legenda pelo roteiro · %d palavras · %d divergiam da "
                  "transcricao" % (len(fala), div))

    with tempfile.TemporaryDirectory() as tmp:
        vo = os.path.join(tmp, "vo.mp3")
        # PITCH SHIFT SEM MUDAR A DURACAO.
        #
        # `asetrate` desce o pitch e estica o tempo junto; `atempo` inverso
        # devolve a duracao. O `--voz` do canal entra DEPOIS, entao os dois nao
        # brigam. Serve para aproximar o F0 do perfil medido do nicho -- 159 Hz
        # da nossa voz para os ~140 da referencia.
        pit = cfg.get("pitch")
        fa = "atempo=%.3f" % a.voz
        if pit and abs(pit - 1.0) > 0.01:
            # O SAMPLE RATE TEM DE SER O DO ARQUIVO, nao 44100 fixo.
            #
            # `asetrate` reinterpreta a taxa: pedir 44100 num arquivo de 24000
            # nao muda so o pitch, ACELERA 1,84x. Somado ao `atempo` do canal
            # deu 2,22x -- 50 s de fala viraram 22 s de video, e a locucao ficou
            # irreconhecivel. O ChatterBox entrega a 24 kHz.
            sr = int(subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "stream=sample_rate",
                 "-of", "csv=p=0", vo_orig],
                capture_output=True, text=True).stdout.strip() or 44100)
            fa = ("asetrate=%d*%.4f,aresample=%d,atempo=%.4f,%s"
                  % (sr, pit, sr, 1.0 / pit, fa))
        _run(["ffmpeg", "-v", "error", "-y", "-i", vo_orig,
              "-filter:a", fa, "-b:a", "192k", vo])
        dur = _dur(vo)
        # os tempos escalam junto: evita transcrever de novo
        k = 1.0 / a.voz
        fala = [{"t": w["t"] * k, "f": w["f"] * k, "p": w["p"]} for w in fala]
        print("voz %.2fx  ·  %.1fs -> %.1fs" % (a.voz, _dur(vo_orig), dur))

        herda = None
        if a.herda_de:
            herda = os.path.join(os.path.dirname(CURTOS), "episodios",
                                 a.herda_de, "04-takes", "acervo")
        takes, grade = fonte_de_takes(pack, a.slug, herda)
        # GIRO POR SLUG. Seis curtos herdando o MESMO acervo do episodio liam a
        # lista na mesma ordem e sairam visualmente identicos -- a folha de
        # conferencia de 07/09 mostrou os quatro primeiros com os mesmos quatro
        # planos nos mesmos momentos.
        #
        # E o mesmo cuidado que o `acervo_curto.py` ja tinha ao sortear a
        # consulta; faltava aqui, onde o material vem pronto. Girar o ponto de
        # partida nao muda o material, muda o encontro entre material e fala.
        if len(takes) > 1:
            g = sum(ord(c) for c in a.slug) % len(takes)
            takes = takes[g:] + takes[:g]
        if not takes:
            print("sem takes: rode acervo_curto.py ou ponha .mp4 em 03-takes/")
            return 1

        # FOTOS DO FATO, declaradas no `curto.yaml` em `visual.fotos_termos`.
        termos, blocos = _termos_de_foto(pack)
        fotos = fotos_do_fato(herda, termos, blocos)
        fontes = takes + fotos
        print("%d takes%s · %s"
              % (len(takes), (" + %d fotos do fato" % len(fotos)) if fotos else "",
                 "acervo (gradado)" if grade else "proprios"))

        # ── A IMAGEM DO HOOK, SE HOUVER ─────────────────────────────────
        #
        # `03-takes/hook.png` e a cena improvavel gerada pelo `hook_imagem.py`.
        # Quando existe, ela toma os primeiros segundos INTEIROS, parada -- e
        # e assim no benchmark: a onca com o boto fica quase imovel enquanto as
        # palavras do titulo entram.
        #
        # O hook picotado (tres cortes rapidos) e o oposto disso, e existia
        # justamente porque nao havia imagem que segurasse sozinha. Com ela, os
        # dois nao convivem: ou a cena impressiona parada, ou nao era hook.
        hook_img = os.path.join(pack, "03-takes", "hook.png")
        t_hook = float(cfg.get("hook_s", 3.0)) if os.path.isfile(hook_img) else 0.0
        corpo = dur - t_hook

        n_seg = max(int(math.ceil(corpo / a.corte)), 1)
        base = corpo / n_seg
        durs = [base] * n_seg
        if not t_hook:
            # HOOK PICOTADO: os 3 primeiros cortes a 68%%. Sem imagem de hook,
            # a atencao dos primeiros segundos se compra no ritmo.
            n_hook = min(3, n_seg)
            for i in range(n_hook):
                durs[i] = base * 0.68
            sobra = corpo - sum(durs)
            if n_seg > n_hook:
                for i in range(n_hook, n_seg):
                    durs[i] += sobra / (n_seg - n_hook)
            else:
                durs[-1] += sobra

        # ANCORA quando o roteiro nomeia o que esta na tela; distribuicao
        # uniforme quando o take e so atmosfera.
        anc = _ancoras_de_take(pack)
        if anc:
            plano = sequencia_ancorada(fontes, anc, fala, n_seg, durs, t_hook)
            ok = getattr(sequencia_ancorada, "casadas", set())
            casados = sum(1 for f, _, _ in plano
                          if etiqueta_do_take(f) in ok)
            print("%d de %d segmentos com take ancorado na fala"
                  % (casados, n_seg))
        else:
            plano = sequencia(fontes, n_seg, durs)
        partes = []
        if t_hook:
            arq = os.path.join(tmp, "s_hook.mp4")
            # `entra` (push lento) e o unico movimento que uma imagem gerada
            # aguenta: pan revela borda inventada e o quadro CONGELADO le como
            # travamento no feed, nao como pausa dramatica.
            segmento(hook_img, t_hook, "entra", arq, a.rascunho, grade,
                     False, 0.0)
            partes.append(arq)
        # OS TRECHOS CONTINUOS VIRAM UM SEGMENTO SO.
        #
        # Nao basta repetir a mesma fonte em segmentos seguidos: cada segmento
        # recebe seu proprio zoompan, entao o movimento reinicia a cada 0,9 s e
        # a "continuidade" fica com solucos visiveis. Somando as duracoes numa
        # chamada unica, sai um plano de verdade, com um movimento lento so --
        # que e o que o formato modelado faz no bloco emocional.
        blocos, n_cont = [], 0
        for i, (fonte, entrada, cont) in enumerate(plano):
            if (blocos and cont and blocos[-1][3]
                    and blocos[-1][0] == fonte):
                b = blocos[-1]
                blocos[-1] = (b[0], b[1] + durs[i], b[2], True)
                n_cont += 1
            else:
                blocos.append((fonte, durs[i], entrada, cont))
        for i, (fonte, dseg, entrada, cont) in enumerate(blocos):
            arq = os.path.join(tmp, "s%03d.mp4" % i)
            # num plano continuo o movimento e sempre o push lento: pan longo
            # revela a borda e derruba a atencao do bicho para o cenario
            mov = "entra" if cont else MOVS[i % len(MOVS)]
            segmento(fonte, dseg, mov, arq, a.rascunho, grade,
                     cfg.get("pingpong", True) and not cont, entrada)
            partes.append(arq)
        repetidos = sum(1 for k in range(1, len(blocos))
                        if blocos[k][0] == blocos[k - 1][0])
        print("%s%d segmentos · corte a %.1fs · %d repeticoes "
              "consecutivas%s%s"
              % ("hook gerado de %.1fs + " % t_hook if t_hook else "",
                 len(blocos), durs[-1], repetidos,
                 "" if cfg.get("pingpong", True) else " · sem pingpong",
                 " · %d cortes fundidos em plano continuo" % n_cont
                 if n_cont else ""))

        lista = os.path.join(tmp, "l.txt")
        with open(lista, "w", encoding="utf-8") as f:
            for x in partes:
                f.write("file '%s'\n" % x.replace("\\", "/"))
        mudo = os.path.join(tmp, "mudo.mp4")
        _run(["ffmpeg", "-v", "error", "-y", "-f", "concat", "-safe", "0",
              "-i", lista, "-c", "copy", mudo])

        ass, n_leg, n_dest = legendas(fala, a.rascunho)
        io.open(os.path.join(tmp, "leg.ass"), "w", encoding="utf-8").write(ass)
        # A ORDEM IMPORTA: overlay primeiro, legenda POR CIMA. A tarja da
        # chamada final passa perto da legenda, e legenda coberta por tarja
        # seria exatamente o tipo de defeito que o founder ja pegou uma vez.
        #
        # O `.ass` entra por nome RELATIVO com o ffmpeg rodando dentro do tmp:
        # caminho absoluto do Windows dentro de filtro exige escapar os dois
        # pontos e a barra invertida, e cada camada de escape e uma chance de
        # errar em silencio.
        # O GRAFO: base -> camadas -> legenda.
        #
        # A legenda fica por ULTIMO de proposito. Emoji e botao entram grandes
        # e no meio do quadro; se viessem depois, cobririam a palavra em
        # destaque, que e o unico elemento do curto que nao pode ser tapado.
        cams, n_cam = camadas_filtro(pack, fala, dur, tmp, a.rascunho)
        base = ",".join(overlays(dur, a.rotulo, a.cta, a.rascunho))
        if cams:
            trechos = [base + "[V0]"]
            for i, c in enumerate(cams):
                trechos.append(c.replace("[V]", "[V%d]" % i) + "[V%d]" % (i + 1))
            trechos.append("[V%d]ass=leg.ass" % len(cams))
            filtro = ";".join(trechos)
        else:
            filtro = base + ",ass=leg.ass"
        fscript = os.path.join(tmp, "f.txt")
        io.open(fscript, "w", encoding="utf-8").write(filtro)
        com_texto = os.path.join(tmp, "txt.mp4")
        _run(["ffmpeg", "-v", "error", "-y", "-i", mudo,
              "-filter_script:v", "f.txt",
              "-c:v", "libx264", "-preset", "veryfast" if a.rascunho else "slow",
              "-crf", "24" if a.rascunho else "19", "-pix_fmt", "yuv420p",
              "txt.mp4"], tmp)
        print("%d legendas em libass · %d janelas de karaoke · margem %d px, "
              "linha a %d%% da altura"
              % (n_leg, n_dest, MARGEM_LADO, int(LEGENDA_YF * 100)))
        print("overlay: rotulo 3s, chamada final, vinheta — "
              "tudo acima dos %d px de UI da base" % UI_BASE)
        if n_cam:
            print("%d camadas do formato (emoji, botao, placa) ancoradas na fala"
                  % n_cam)

        saida = os.path.join(pack, "04-final", "curto.mp4")
        os.makedirs(os.path.dirname(saida), exist_ok=True)
        if os.path.isfile(TRILHA):
            # sidechain: a trilha recua quando a voz entra e volta na pausa
            mix = ("[1:a]aloop=loop=-1:size=2000000000,atrim=duration=%.3f,"
                   "volume=0.30[m];"
                   "[2:a]asplit=2[voz][key];"
                   "[m][key]sidechaincompress=threshold=0.03:ratio=9:"
                   "attack=8:release=340[duck];"
                   "[voz][duck]amix=inputs=2:duration=first:normalize=0,"
                   "afade=t=out:st=%.2f:d=1.2[a]" % (dur, max(dur - 1.2, 0.1)))
            _run(["ffmpeg", "-v", "error", "-y", "-i", com_texto,
                  "-i", TRILHA, "-i", vo,
                  "-filter_complex", mix, "-map", "0:v", "-map", "[a]",
                  "-c:v", "copy", "-c:a", "aac", "-b:a", "192k",
                  "-shortest", saida])
            print("trilha: %s com ducking" % os.path.basename(TRILHA))
        else:
            _run(["ffmpeg", "-v", "error", "-y", "-i", com_texto, "-i", vo,
                  "-map", "0:v", "-map", "1:a", "-c:v", "copy",
                  "-c:a", "aac", "-b:a", "192k", "-shortest", saida])
            print("[aviso] trilha nao encontrada — saiu so com a voz")

    d = _dur(saida)
    l, alt = (W // 2, H // 2) if a.rascunho else (W, H)
    print("-" * 46)
    print("curto.mp4 · %.1fs · %dx%d · %.1f MB"
          % (d, l, alt, os.path.getsize(saida) / 1e6))
    return 0


if __name__ == "__main__":
    sys.exit(main())
