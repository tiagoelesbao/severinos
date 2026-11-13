# -*- coding: utf-8 -*-
"""Remove LEGENDA QUEIMADA e cabecalho de canal do video original.

PARA QUE SERVE
  Republicar o material de um canal modelado exige tirar o que e DELE: a
  legenda queimada e a assinatura no topo. O que fica e a imagem, que a gente
  renarra e relegenda. Isto entrega o video limpo ao lado do nosso corte final,
  na mesma pasta do lote.

COMO ACHA AS FAIXAS
  Legenda queimada tem uma assinatura que fundo natural nao tem: PIXEL CLARO OU
  SATURADO COM VIZINHO ESCURO A TRES PIXELS. E o contorno preto que todo editor
  de curto poe atras do texto para ele sobreviver a qualquer fundo. Neblina,
  agua e ceu sao claros mas nao tem essa borda dura.

  Duas passadas, porque as duas cores existem:
    - texto BRANCO com contorno (o cabecalho "mundo animal curioso")
    - texto COLORIDO saturado com contorno (a palavra em destaque da legenda)

  As faixas saem por linha: onde a densidade dessa assinatura passa do limiar
  em varios quadros, ha texto. Um quadro so nao decide -- fundo pode ter um
  galho claro contra sombra; texto se repete no MESMO y o video inteiro.

QUAL ROTA, E POR QUE ESTA
  MEDIDO em 08/09 no video de referencia, quatro rotas lado a lado:

    delogo    limpou as duas faixas sem deixar rastro           <- escolhida
    borrao    deixou fantasma verde legivel e emenda dura
    crop      tirou o cabecalho mas nao a legenda, e reenquadrou
    cobrir    tarja preta; honesto e feio

  O `limpa_marca.py` avisa que delogo borra -- e verdade quando a marca esta
  sobre textura. Aqui nao esta: este formato e um 16:9 encaixado no 9:16 com
  preenchimento BORRADO em cima e embaixo, e a legenda mora justamente nessa
  faixa lisa. Interpolar sobre borrao devolve borrao, que e o que ja havia ali.

  Por isso a rota nao e regra geral: e a leitura DESTE material. O `--rota`
  continua aberto para quando o material mudar.

VERIFICA DEPOIS
  Remover sem conferir e como aprovar cartela sem contar quantas entraram. O
  script roda o mesmo detector na SAIDA e diz se sobrou texto.

USO
    python limpa_legenda.py entrada.mp4                      # so detecta
    python limpa_legenda.py entrada.mp4 -o limpo.mp4
    python limpa_legenda.py PASTA/ -o SAIDA/
"""
import argparse
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def _quadros(video, n=40, tmp=None):
    """`n` quadros espalhados pela duracao, como arrays RGB."""
    import numpy as np
    from PIL import Image
    tmp = tmp or os.environ.get("TEMP", ".")
    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", video], capture_output=True, text=True
    ).stdout.strip() or 0)
    fora = []
    for i in range(n):
        t = dur * (i + 0.5) / n
        # NOME UNICO POR EXECUCAO. Com nome fixo, duas limpezas rodando ao
        # mesmo tempo escrevem por cima dos quadros uma da outra: uma delas le
        # os quadros da outra e conclui "nenhuma faixa de texto encontrada",
        # sem erro nenhum. Aconteceu em 08/09 com dois jobs em paralelo.
        f = os.path.join(tmp, "_lq%d_%03d.png" % (os.getpid(), i))
        r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.2f" % t,
                            "-i", video, "-frames:v", "1", f],
                           capture_output=True)
        if r.returncode == 0 and os.path.isfile(f):
            # int32, NAO int16: `r*299` da formula de luminancia estoura 32767
            # e o valor da a volta. O detector de texto CLARO parava de
            # funcionar em silencio -- so a via de cor saturada, que nao
            # multiplica, continuava respondendo, e o cabecalho branco ficava
            # invisivel para a guarda.
            fora.append(np.asarray(Image.open(f).convert("RGB"),
                                   dtype=np.int32))
    return fora


def _mapa_texto(quadros):
    """Por linha: em QUE FRACAO DOS QUADROS ha estrutura de texto ali.

    POR QUE FRACAO DE QUADROS, E NAO DENSIDADE MEDIA
      A media confunde faixa clara com texto. Neste formato o video e um 16:9
      encaixado no 9:16 com preenchimento BORRADO em cima e embaixo -- e o
      borrao de uma cena clara tem densidade tao alta quanto a legenda. Medindo
      a media, o rodape borrado entrava como texto e o cabecalho ficava de fora.

      O que separa os dois e a PERSISTENCIA. O borrao muda de cena para cena; a
      legenda esta na mesma linha do primeiro ao ultimo quadro. Uma linha que
      acusa texto em nove de dez quadros e texto; uma que acusa em tres e cena.
    """
    import numpy as np
    acc = None
    for a in quadros:
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        L = (r * 299 + g * 587 + b * 114) // 1000
        mx, mn = a.max(2), a.min(2)
        claro = L > 228
        # saturacao ALTA: legenda de curto usa neon (verde, amarelo, ciano).
        # Limiar frouxo pega folha verde e agua azul.
        saturado = (mx > 185) & ((mx - mn) > 120)
        esc = np.zeros(L.shape, dtype=bool)
        for dy, dx in ((0, 3), (0, -3), (3, 0), (-3, 0)):
            esc |= np.roll(L, (dy, dx), (0, 1)) < 75
        m = ((claro | saturado) & esc)
        # a linha "tem texto" neste quadro se pelo menos 0,8%% dela e contorno.
        # A 1,5%% o cabecalho serifado de 360 px de largura ficava de fora: a
        # fonte e fina e cobre pouca coluna, mesmo estando ali o video inteiro.
        tem = (m.sum(1) / m.shape[1]) > 0.008
        acc = tem.astype(np.float32) if acc is None else acc + tem
    return acc / max(len(quadros), 1)


def _mapa_fixo(quadros, tol=6.0):
    """Por linha: fracao de colunas que NAO MUDAM entre quadros de cenas
    diferentes.

    POR QUE UM SEGUNDO DETECTOR
      O primeiro procura CONTORNO -- o traco preto atras do texto. Funciona para
      a legenda, que e feita para sobreviver a qualquer fundo. Nao funciona para
      a assinatura do canal: `mundo animal curioso` e serifada fina, e a 360 px
      de largura o contorno some no antialias. Medido: 0,10 de persistencia,
      contra 0,63 da legenda.

      O que a assinatura tem e outra coisa: ela e IDENTICA do primeiro ao ultimo
      quadro enquanto a cena inteira troca. Variancia perto de zero numa faixa
      onde tudo o mais varia so acontece com carimbo.
    """
    import numpy as np
    p = np.stack([q.astype(np.float32).mean(2) for q in quadros])
    dp = p.std(0)
    fixo = dp < tol
    # cena parada tambem tem variancia baixa; so conta onde a MEDIA da linha
    # varia bastante, isto e, onde houve troca de cena de verdade
    vivo = dp.mean(1) > tol * 2.5
    fr = fixo.mean(1)
    return np.where(vivo, fr, 0.0)


def _mapa_cadencia(quadros, lim=205, rmin=2, rmax=26, nmin=5):
    """Por linha: fracao de quadros com CADENCIA DE LETRA — varios trechos
    claros curtos e separados, na mesma linha.

    O TERCEIRO SINAL, E POR QUE PRECISOU EXISTIR
      Os dois primeiros procuram contorno duro e carimbo imovel. O canal em
      ingles do benchmark nao tem nem um nem outro: a legenda e branca com
      sombra suave, sem traco preto atras. Medido, o detector de contorno dava
      0,15 na faixa da legenda -- o mesmo que dava no fundo.

      O que sobra e a FORMA do texto: uma linha de letras e uma sequencia de
      manchas claras de dois a vinte e seis pixels, separadas, cinco ou mais na
      mesma linha. Nuvem, reflexo e pelo claro dao mancha grande e continua, nao
      cadencia. Na medicao isolou y416-464 e nada mais no quadro inteiro.
    """
    import numpy as np
    acc = None
    for a in quadros:
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        L = (r * 299 + g * 587 + b * 114) // 1000
        m = (L > lim)
        # bordas de cada trecho claro, por linha, de uma vez
        pad = np.zeros((m.shape[0], 1), dtype=bool)
        mm = np.hstack([pad, m, pad])
        d = np.diff(mm.astype(np.int8), axis=1)
        ys, xs = np.nonzero(d == 1)
        ye, xe = np.nonzero(d == -1)
        comp = xe - xs                       # as bordas casam uma a uma por linha
        bom = (comp >= rmin) & (comp <= rmax)
        conta = np.bincount(ys[bom], minlength=m.shape[0])
        acc = (conta >= nmin).astype(np.float32) if acc is None             else acc + (conta >= nmin)
    return acc / max(len(quadros), 1)


def faixas(video, limiar=0.45, folga=12, tmp=None):
    """[(y, altura)] das faixas com texto queimado."""
    import numpy as np
    qs = _quadros(video, tmp=tmp)
    if not qs:
        return [], (0, 0)
    # OS DOIS DETECTORES SOMAM, NAO ESCOLHEM: legenda e carimbo sao sinais
    # diferentes, e um video costuma ter os dois.
    lin = _mapa_texto(qs)                # contorno duro, persistente
    fix = _mapa_fixo(qs)                 # carimbo que nao muda de cena
    cad = _mapa_cadencia(qs)             # forma de letra, sem depender de contorno
    h = len(lin)
    w = qs[0].shape[1]
    # legenda: presente em pelo menos 55%% dos quadros (ela pisca entre blocos)
    # carimbo: pelo menos 30%% da linha imovel enquanto a cena troca
    # 0,45 com a luminancia corrigida: cabecalho 0,86, legenda 0,58, fundo
    # 0,08 a 0,14. A separacao e de quatro vezes, entao o corte no meio nao e
    # ajuste fino -- e o vale entre os dois grupos.
    dentro = (lin > max(limiar, 0.45)) | (fix > 0.30) | (cad > 0.30)
    fora, y = [], 0
    while y < h:
        if not dentro[y]:
            y += 1
            continue
        y0 = y
        while y < h and dentro[y]:
            y += 1
        # 5 px: a legenda em caixa alta a 360 px de largura tem so o miolo da
        # letra acima do corte -- exigindo 8 px ela era descartada por altura,
        # depois de ter sido detectada certo. O `folga` devolve o contorno.
        if y - y0 >= 5:
            fora.append((max(y0 - folga, 1), min(y - y0 + folga * 2, h - y0)))
    # junta faixas coladas: duas linhas de legenda sao uma faixa so
    juntas = []
    for y0, alt in fora:
        if juntas and y0 - (juntas[-1][0] + juntas[-1][1]) < 24:
            a0, aa = juntas[-1]
            juntas[-1] = (a0, y0 + alt - a0)
        else:
            juntas.append((y0, alt))
    return juntas, (w, h)


def rastro_do_delogo(video, y0, alt, largura, tmp=None):
    """0 a 1: quanto detalhe VERTICAL sobra dentro da faixa depois do delogo,
    comparado com as linhas de fora. Baixo = a faixa virou rastro liso.

    POR QUE MEDIR O ARTEFATO, E NAO UM PROXY
      A primeira versao decidia pela textura do fundo em volta, supondo que
      fundo liso -> delogo invisivel. O numero inverteu os dois casos reais: o
      material EN, que borrou feio, media 3,4 (liso) e o cabecalho PT, que saiu
      perfeito, media 4,1 (texturado). Proxy plausivel nao e medida.

      O que denuncia o delogo e o RASTRO: ele copia a borda para dentro, entao
      as linhas da faixa ficam quase iguais entre si. Se o detalhe vertical
      dentro cai muito abaixo do detalhe vertical fora, o olho ve uma tarja
      listrada. Isso se mede rodando o filtro e olhando o resultado -- que e o
      unico jeito de saber.
    """
    import numpy as np
    from PIL import Image
    tmp = tmp or os.environ.get("TEMP", ".")
    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "csv=p=0", video], capture_output=True, text=True
    ).stdout.strip() or 0)
    razoes = []
    for i in range(8):
        t = dur * (i + 0.5) / 8
        f = os.path.join(tmp, "_rd%d_%02d.png" % (os.getpid(), i))
        r = subprocess.run(
            ["ffmpeg", "-v", "error", "-y", "-ss", "%.2f" % t, "-i", video,
             "-frames:v", "1",
             # `w` do delogo e inteiro, NAO expressao: `w=iw-2` faz o ffmpeg
             # recusar o filtro e devolver o quadro CRU. A medicao entao
             # comparava o video com ele mesmo e dava 1,00 sempre -- guarda que
             # sempre aprova e guarda que nao existe.
             "-vf", "delogo=x=1:y=%d:w=%d:h=%d" % (y0, largura - 2, alt),
             f], capture_output=True)
        if r.returncode != 0 or not os.path.isfile(f):
            continue
        L = np.asarray(Image.open(f).convert("L"), dtype=np.float32)
        h = L.shape[0]
        dentro = np.abs(np.diff(L[y0 + 2:y0 + alt - 2], axis=0)).mean()
        a0, a1 = max(y0 - alt - 4, 0), max(y0 - 4, 1)
        b0, b1 = min(y0 + alt + 4, h - 1), min(y0 + 2 * alt + 4, h)
        fora = []
        if a1 - a0 > 3:
            fora.append(np.abs(np.diff(L[a0:a1], axis=0)).mean())
        if b1 - b0 > 3:
            fora.append(np.abs(np.diff(L[b0:b1], axis=0)).mean())
        if fora and sum(fora):
            razoes.append(float(dentro) / (sum(fora) / len(fora)))
    return sum(razoes) / len(razoes) if razoes else 1.0


def caixa_da_legenda(banda, min_lin=0.55, min_col=0.70):
    """A CAIXA em que a legenda vive — uma so, para o video inteiro.

    POR QUE CAIXA FIXA, E NAO MASCARA POR PIXEL
      Tentei mascara por pixel de quatro jeitos e nenhum sobreviveu ao
      material, porque todo criterio local confunde legenda com cena:

        brilho                -> a espuma do mar deu 93%% da faixa como texto
        brilho + traco fino   -> o pelo branco do cachorro entrou junto
        cercado por contorno  -> so pegou pedacos de letra a 360 px
        parado na janela      -> plano estatico tambem fica parado

      Com meia mascara o LaMa tirava o glifo e deixava o halo verde, que
      denuncia igual. O que funciona e o contrario: nao recortar a letra, e sim
      reconstruir o BLOCO onde ela mora -- letra, contorno e brilho de uma vez.
      E o tipo de buraco para o qual o LaMa foi treinado.

    POR QUE UMA CAIXA, E NAO UMA POR QUADRO
      Caixa por quadro respira: cresce na frase longa, encolhe na curta, e a
      textura reconstruida muda de tamanho a cada segundo -- pisca. Legenda de
      curto mora sempre no mesmo lugar; medir uma vez no video inteiro da
      estabilidade de graca.
    """
    import numpy as np
    T, H, W, _ = banda.shape
    acc_lin = np.zeros(H)
    acc_col = np.zeros(W)
    for t in range(T):
        a = banda[t].astype(np.int32)
        L = (a[..., 0] * 299 + a[..., 1] * 587 + a[..., 2] * 114) // 1000
        mx, mn = a.max(2), a.min(2)
        claro = ((L > 195) | ((mx > 165) & ((mx - mn) > 105))).astype(np.uint8)
        pad = np.zeros((H, 1), np.uint8)
        d = np.diff(np.hstack([pad, claro, pad]).astype(np.int8), axis=1)
        ys, xs = np.nonzero(d == 1)
        _, xe = np.nonzero(d == -1)
        comp = xe - xs
        bom = (comp >= 2) & (comp <= 26)
        n = np.bincount(ys[bom], minlength=H)
        lin = n >= 5
        acc_lin += lin
        if lin.any():
            acc_col += claro[lin].sum(0) > 0
    acc_lin /= T
    acc_col /= T
    # OS CORTES SAEM DO PERFIL DESTE VIDEO, nao de um numero fixo.
    #
    # Medido no video EN: as linhas da legenda ficam entre 0,55 e 0,90 e o
    # fundo entre 0,15 e 0,30. Fixar 0,50 funcionou ali e falhou no video PT,
    # onde a legenda entra palavra a palavra e nenhuma linha passa de 0,35 --
    # o bloco simplesmente nao era encontrado. Relativo ao pico do proprio
    # perfil, os dois casos caem no mesmo lugar.
    corte_l = max(acc_lin.max() * min_lin, 0.10)
    corte_c = max(acc_col.max() * min_col, 0.15)
    r = np.nonzero(acc_lin >= corte_l)[0]
    c = np.nonzero(acc_col >= corte_c)[0]
    if len(r) < 4 or len(c) < 10:
        return None
    # 26 px de folga em volta do bloco: o LaMa reconstroi olhando a BORDA da
    # mascara, e se a borda ainda esta tingida pelo brilho verde ele devolve
    # verde. Empurrar a borda para fora do brilho e o que faz a reconstrucao
    # ler o fundo de verdade.
    y1, y2 = max(int(r.min()) - 26, 0), min(int(r.max()) + 27, H)
    # LEGENDA DE CURTO E CENTRALIZADA: espelhar a caixa em torno do centro
    # garante que a frase mais larga do video caiba, mesmo que o corte de
    # coluna tenha ficado apertado numa borda.
    meio = W / 2.0
    raio = max(abs(int(c.min()) - meio), abs(int(c.max()) - meio)) + 30
    x1, x2 = max(int(meio - raio), 0), min(int(meio + raio), W)
    return y1, y2, x1, x2


def refaz_por_inpaint(banda, cx, aviso=True):
    """Reconstroi o bloco da legenda com LaMa, quadro a quadro.

    POR QUE NAO DEU PARA FAZER PELO TEMPO
      A primeira tentativa buscava o mesmo pixel no quadro mais proximo em que
      ele nao estivesse coberto -- informacao real, em vez de palpite. Duas
      coisas derrubaram a ideia, e as duas apareceram na tela:

        1. O doador tambem tinha texto ali. A mascara pegava o miolo do glifo,
           nao o brilho em volta, entao o quadro "livre" trazia a aura da frase
           anterior: legenda trocada por legenda.
        2. O doador era de OUTRA CENA. Estes videos cortam a cada dois ou tres
           segundos; o pixel descoberto quarenta quadros depois pertence a
           outro plano. Saiu pelagem de onca no meio do rio.

      Restringir a doadores do mesmo plano e a poucos quadros nao sobra quase
      nada, porque a legenda quase nao sai da tela. A informacao nao esta no
      arquivo: o que resta e reconstruir.

    POR QUE LaMa, E NAO `cv2.inpaint`
      O `inpaint` classico propaga cor das bordas: num bloco de 300x70 sobre
      asfalto e pelo devolve borrao, que e o que ja se tinha com `cobrir`. O
      LaMa completa textura e continua linha reta -- faixa de pedestre, grama,
      agua. Roda a 0,30 s por quadro nesta maquina (CPU, faixa de 360 px).
    """
    import numpy as np
    from PIL import Image
    from simple_lama_inpainting import SimpleLama

    y1, y2, x1, x2 = cx
    lama = SimpleLama()
    T, H, W, _ = banda.shape
    m = np.zeros((H, W), np.uint8)
    m[y1:y2, x1:x2] = 255
    mi = Image.fromarray(m)
    fora = banda.copy()
    for t in range(T):
        r = np.asarray(lama(Image.fromarray(banda[t]), mi).convert("RGB"))
        fora[t, y1:y2, x1:x2] = r[y1:y2, x1:x2]
        if aviso and (t + 1) % 150 == 0:
            print("      %d de %d quadros" % (t + 1, T), flush=True)
    return fora, T


def _refazer_faixa(video, saida, banda_yx, largura, altura, tmp=None):
    """Rota `refazer`: le a faixa, troca o texto pelo fundo real, devolve."""
    import numpy as np
    tmp = tmp or os.environ.get("TEMP", ".")
    fps = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v",
         "-show_entries", "stream=r_frame_rate", "-of", "csv=p=0", video],
        capture_output=True, text=True).stdout.strip() or "30/1"
    num, den = (fps.split("/") + ["1"])[:2]
    fps_f = float(num) / float(den or 1)

    # UMA FAIXA POR VEZ. Fundir todas numa so era mais simples, mas no video PT
    # o cabecalho esta em y32 e a legenda em y492: a uniao vira o quadro
    # inteiro, e o bloco medido nela nao e nem um nem outro.
    y0, altb = banda_yx
    y1 = y0 + altb
    # FOLGA DE 66 px: 26 da margem da caixa + 40 de contexto para o LaMa ler.
    #
    # Duas razoes, as duas vistas na tela:
    #   - o brilho em volta da legenda se espalha alem das linhas em que o
    #     detector acusa texto; com folga curta o glifo saia e a auréola ficava
    #     logo abaixo do recorte, denunciando o que havia ali;
    #   - com folga de 26 px, o cabecalho (faixa de 33 px) virava uma banda de
    #     85 px em que a CAIXA ocupava tudo. Sem pixel limpo em volta o LaMa
    #     nao tem de onde tirar textura e devolve um quadriculado.
    #
    # Proporcional a altura da faixa nao serve: numa faixa de 122 px daria
    # folga de 244 e a banda tomaria o quadro inteiro. O que o LaMa precisa e
    # uma quantidade FIXA de contexto limpo, nao uma fracao.
    folga = 66
    ny0 = max(y0 - folga, 0)
    ny1 = min(y1 + folga, altura)
    # FAIXA COLADA NA BORDA: o cabecalho fica a 32 px do topo, entao os 66 px
    # de contexto de cima nao cabem e a caixa passa a ocupar a banda inteira --
    # sem pixel limpo em volta o LaMa devolve quadriculado. O que faltou de um
    # lado se compensa do outro.
    if ny0 == 0:
        ny1 = min(ny1 + (folga - (y0 - ny0)), altura)
    if ny1 == altura:
        ny0 = max(ny0 - (folga - (ny1 - y1)), 0)
    y0, y1 = ny0, ny1
    alt = y1 - y0

    cru = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", video,
         "-filter:v", "crop=%d:%d:0:%d" % (largura, alt, y0),
         "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True).stdout
    T = len(cru) // (largura * alt * 3)
    if T < 4:
        return False, 1.0
    banda = np.frombuffer(cru[:T * largura * alt * 3],
                          dtype=np.uint8).reshape(T, alt, largura, 3)
    cx = caixa_da_legenda(banda)
    if not cx:
        print("      faixa y%d+%d · nao consegui delimitar o bloco" % (y0, alt))
        return False, 1.0
    # a caixa nao pode virar a faixa inteira: quando isso acontece o detector
    # esta lendo a CENA (espuma, pelo claro) e nao a legenda, e reconstruir
    # tudo apagaria o plano
    if (cx[1] - cx[0]) > alt * 0.92 and (cx[3] - cx[2]) > largura * 0.96:
        print("      faixa y%d+%d · bloco tomou a faixa toda — e cena, nao "
              "legenda" % (y0, alt))
        return False, 1.0
    print("      faixa y%d+%d · %d quadros · bloco y%d-%d x%d-%d (%.0f%% da "
          "faixa)" % (y0, alt, T, cx[0], cx[1], cx[2], cx[3],
                      100.0 * (cx[1] - cx[0]) * (cx[3] - cx[2]) /
                      (alt * largura)), flush=True)
    nova, _ = refaz_por_inpaint(banda, cx)
    resto = 0.0

    braw = os.path.join(tmp, "_banda%d_%d.raw" % (os.getpid(), y0))
    with open(braw, "wb") as f:
        f.write(nova.tobytes())
    os.makedirs(os.path.dirname(os.path.abspath(saida)) or ".", exist_ok=True)
    r = subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-i", video,
         "-f", "rawvideo", "-pix_fmt", "rgb24",
         "-s", "%dx%d" % (largura, alt), "-r", "%.6f" % fps_f, "-i", braw,
         "-filter_complex", "[0:v][1:v]overlay=0:%d" % y0,
         "-map", "0:a?", "-c:v", "libx264", "-preset", "slow", "-crf", "18",
         "-pix_fmt", "yuv420p", "-c:a", "copy", saida],
        capture_output=True, text=True)
    try:
        os.remove(braw)
    except OSError:
        pass
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "")[-600:])
    return True, resto


def limpa(video, saida, bandas, largura, altura, rota="auto"):
    """Aplica a rota por faixa e grava. Grafo ROTULADO, uma faixa por elo.

    Encadear por virgula nao serve quando alguma faixa usa `cobrir`: aquela
    rota tem `split`, e uma cadeia com split precisa de rotulo de entrada e de
    saida. Misturar virgula com ponto-e-virgula devolve grafo invalido, ou --
    pior -- grafo valido em que a segunda faixa le a ENTRADA original e desfaz
    a primeira.
    """
    elos, ent, n = [], "0:v", 0
    for y0, alt in bandas:
        y0 = max(int(y0), 1)
        alt = min(int(alt), altura - y0 - 1)
        if alt < 4:
            continue
        r = rota
        if r == "auto":
            q = rastro_do_delogo(video, y0, alt, largura)
            r = "delogo" if q >= 0.35 else "cobrir"
            print("   y%d+%d · detalhe restante %.2f -> %s" % (y0, alt, q, r))
        sai = "v%d" % n
        if r == "delogo":
            # 1 px de moldura dentro do quadro: o delogo interpola A PARTIR da
            # borda, entao caixa colada no limite do quadro e recusada
            elos.append("[%s]delogo=x=1:y=%d:w=%d:h=%d[%s]"
                        % (ent, y0, largura - 2, alt, sai))
        else:
            # Nao e tarja preta chapada: e o proprio quadro BORRADO e escurecido
            # ali. Sobre imagem real a tarja denuncia censura; o borrao le como
            # profundidade de campo -- e e onde a NOSSA legenda entra depois.
            elos.append("[%s]split=2[a%d][b%d];"
                        "[b%d]crop=%d:%d:0:%d,gblur=sigma=%d,"
                        "eq=brightness=-0.12[c%d];"
                        "[a%d][c%d]overlay=0:%d[%s]"
                        % (ent, n, n, n, largura, alt, y0,
                           max(alt // 2, 12), n, n, n, y0, sai))
        ent, n = sai, n + 1
    if not elos:
        return False
    os.makedirs(os.path.dirname(os.path.abspath(saida)) or ".", exist_ok=True)
    graf = ";".join(elos)
    r = subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", video,
                        "-filter_complex", graf, "-map", "[%s]" % ent,
                        "-map", "0:a?", "-c:v", "libx264", "-preset", "slow",
                        "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "copy",
                        saida], capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or "")[-600:])
    return True


def _refazer(video, saida, bandas, largura, altura, tmp=None):
    """Roda o refazer faixa a faixa, encadeando as saidas."""
    tmp = tmp or os.environ.get("TEMP", ".")
    ent = video
    inter = []
    ok_algum = False
    for i, b in enumerate(bandas):
        alvo = (saida if i == len(bandas) - 1
                else os.path.join(tmp, "_rf%d_%d.mp4" % (os.getpid(), i)))
        ok, _ = _refazer_faixa(ent, alvo, b, largura, altura, tmp)
        if ok:
            ok_algum = True
            if ent != video:
                inter.append(ent)
            ent = alvo
        elif i == len(bandas) - 1 and ent != video:
            # a ultima faixa nao deu; o que ja foi feito tem de chegar na saida
            import shutil
            shutil.copyfile(ent, saida)
    for f in inter:
        try:
            os.remove(f)
        except OSError:
            pass
    if not ok_algum:
        return False, 1.0
    if not os.path.isfile(saida) and ent != saida:
        import shutil
        shutil.copyfile(ent, saida)
    return True, 0.0


def um(video, saida, rota, limiar):
    nome = os.path.basename(video)
    bandas, (w, h) = faixas(video, limiar)
    if not bandas:
        print("%-46s nenhuma faixa de texto encontrada" % nome[:46])
        return 0
    print("%-46s %dx%d · %s" % (nome[:46], w, h,
          " ".join("y%d+%d" % b for b in bandas)))
    if not saida:
        return 0
    if rota in ("auto", "refazer"):
        # REFAZER PRIMEIRO, SEMPRE. As outras duas rotas nao removem: uma
        # estica a borda por cima e a outra tapa. So esta vai buscar o fundo
        # que estava atras do texto.
        ok, _ = _refazer(video, saida, bandas, w, h)
        if ok:
            print("   fundo reconstruido por inpaint (LaMa)")
        elif rota == "auto":
            limpa(video, saida, bandas, w, h, "auto")
    else:
        limpa(video, saida, bandas, w, h, rota)

    # A CONFERENCIA: o mesmo detector na saida. Sem isto, "removi" e opiniao.
    sobra, _ = faixas(saida, limiar)
    if sobra and rota in ("auto", "refazer"):
        # SEGUNDA PASSADA, SO NO QUE SOBROU.
        #
        # O tempo resolve legenda, que troca de frase; nao resolve CARIMBO, que
        # esta na mesma posicao do primeiro ao ultimo quadro -- ali nao existe
        # quadro descoberto de onde copiar, e nenhuma busca acha o que nao foi
        # gravado. Para essa faixa vale o paliativo medido, aplicado so nela.
        print("   sobrou %s — segunda passada"
              % " ".join("y%d+%d" % b for b in sobra))
        tmp2 = saida + ".p2.mp4"
        os.replace(saida, tmp2)
        try:
            limpa(tmp2, saida, sobra, w, h, "auto")
            sobra, _ = faixas(saida, limiar)
        finally:
            if os.path.isfile(tmp2):
                os.remove(tmp2)

    if sobra:
        print("   [aviso] ainda ha texto em %s — confira o quadro"
              % " ".join("y%d+%d" % b for b in sobra))
    else:
        print("   limpo · %s (%.1f MB)"
              % (os.path.basename(saida), os.path.getsize(saida) / 1e6))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("entrada", help="arquivo ou pasta")
    ap.add_argument("-o", "--saida")
    ap.add_argument("--rota",
                choices=("auto", "refazer", "delogo", "cobrir"),
                default="auto",
                help="auto = refazer pelo tempo; delogo/cobrir sao os "
                     "paliativos de quando nao ha quadro descoberto")
    ap.add_argument("--limiar", type=float, default=0.45,
                help="fracao minima de quadros com texto na linha")
    a = ap.parse_args()

    if os.path.isdir(a.entrada):
        vs = [os.path.join(a.entrada, f) for f in sorted(os.listdir(a.entrada))
              if f.lower().endswith((".mp4", ".mov", ".mkv", ".webm"))]
        for v in vs:
            s = (os.path.join(a.saida, os.path.splitext(os.path.basename(v))[0]
                              + "-limpo.mp4") if a.saida else None)
            um(v, s, a.rota, a.limiar)
        return 0
    return um(a.entrada, a.saida, a.rota, a.limiar)


if __name__ == "__main__":
    sys.exit(main())
