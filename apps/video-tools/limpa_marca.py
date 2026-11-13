# -*- coding: utf-8 -*-
"""Acha e remove marca d'agua, selo ou legenda queimada em video.

POR QUE ESTA FERRAMENTA EXISTE
  Todo gerador externo de video carimba a saida. O BytePlus/Seedance escreve
  "AI generated" no canto inferior direito e ainda deixa uma faixa preta embaixo;
  outros poem logo, watermark diagonal ou legenda queimada. O material chega
  bom e inutilizavel ao mesmo tempo -- e o problema volta a cada ferramenta nova
  que a operacao adotar.

COMO ACHAR A MARCA — e o que NAO funciona
  O caminho confiavel e `--mapa`: ele grava um quadro do video com uma GRADE de
  coordenadas por cima. Voce olha, le o x/y da marca, e passa em `--delogo`.
  Leva vinte segundos e nunca erra.

  Ha duas deteccoes automaticas, e as duas tem limite conhecido:

  `--detectar` procura a regiao que fica PARADA enquanto o resto se move. Falha
  em video de plano fixo -- e em 06/09 falhou exatamente assim: os takes eram de
  estatua imovel de proposito, entao ela apontou as COLUNAS DE MARMORE (paradas,
  mas parte da cena) e ignorou o carimbo no canto.

  `--comparar` procura o que e IDENTICO entre videos diferentes da mesma
  ferramenta. Falha quando a marca e SEMI-TRANSPARENTE: o fundo aparece atraves
  dela, entao a regiao nao e igual entre takes de cenas diferentes. Foi o que
  aconteceu com o "AI generated" do Seedance.

  As duas servem para marca opaca sobre video com movimento. Fora disso, use
  `--mapa` e o olho.

AS TRES ROTAS DE REMOCAO — e qual escolher, com resultado MEDIDO

  crop     Corta fora a regiao e reescala. NAO deixa vestigio nenhum.
           **E a melhor rota quando a marca esta na BORDA**, que e quase sempre.
           Custo: perde area. Nos takes do Seedance (496x864 com "AI generated"
           no rodape) o corte tirou 9%% da largura e 7%% da altura, e o resultado
           ficou limpo.

  delogo   Interpola a regiao a partir das bordas. Nao perde area, mas TESTADO
           em 06/09 nos mesmos takes: **deixou um borrao claro retangular, pior
           que a marca**. Marca de 240px sobre mármore texturizado e grande
           demais para interpolar. Sirva-se dela so em marca PEQUENA sobre fundo
           LISO -- e confira o quadro depois, sempre.

  cobrir   Preenche com preto solido. Honesto e feio; serve quando a marca cai
           numa zona que a montagem vai cobrir de qualquer jeito, como o rodape
           onde a legenda entra.

  REGRA PRATICA: marca na borda -> crop. Marca no miolo e pequena -> delogo, e
  olhe o resultado. Marca grande no miolo -> nao ha rota boa; troque o material.

USO
    python limpa_marca.py entrada.mp4 --detectar
    python limpa_marca.py entrada.mp4 -o saida.mp4 --delogo 340:790:150:40
    python limpa_marca.py entrada.mp4 -o saida.mp4 --crop-baixo 60 --alvo 1080x1920
    python limpa_marca.py PASTA/ -o SAIDA/ --crop-baixo 60 --alvo 1080x1920

NOTA DE USO
  Remover a marca de um video NAO cria direito sobre ele. Isto serve para
  limpar material que voce gerou ou licenciou, nao para apagar credito alheio.
"""
import argparse
import glob
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")


def _dim(v):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v",
                        "-show_entries", "stream=width,height", "-of", "csv=p=0", v],
                       capture_output=True, text=True).stdout.strip()
    w, h = r.split(",")[:2]
    return int(w), int(h)


def _dur(v):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "csv=p=0", v], capture_output=True, text=True).stdout.strip()
    try:
        return float(r)
    except ValueError:
        return 0.0


def detectar(video, amostras=6, celula=40):
    """Regioes que ficam PARADAS enquanto o resto do quadro muda.

    Devolve uma lista de (x, y, w, h, imobilidade), da mais suspeita para a
    menos. `imobilidade` vai de 0 a 1: 1 significa que a regiao nao mudou nada
    entre os quadros amostrados.
    """
    try:
        from PIL import Image, ImageChops, ImageStat
    except ImportError:
        print("precisa do Pillow: pip install pillow")
        return []

    import tempfile
    w, h = _dim(video)
    d = _dur(video)
    if d <= 0:
        return []

    quadros = []
    with tempfile.TemporaryDirectory() as tmp:
        for i in range(amostras):
            t = d * (i + 0.5) / amostras
            f = os.path.join(tmp, "q%d.png" % i)
            subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.2f" % t, "-i", video,
                            "-frames:v", "1", f, "-y"], capture_output=True)
            if os.path.isfile(f):
                quadros.append(Image.open(f).convert("L").copy())
    if len(quadros) < 2:
        return []

    # diferenca media entre quadros consecutivos, por celula
    cols, linhas = w // celula, h // celula
    mapa = []
    for cy in range(linhas):
        for cx in range(cols):
            cx0, cy0 = cx * celula, cy * celula
            caixa = (cx0, cy0, cx0 + celula, cy0 + celula)
            difs = []
            for k in range(len(quadros) - 1):
                a = quadros[k].crop(caixa)
                b = quadros[k + 1].crop(caixa)
                difs.append(ImageStat.Stat(ImageChops.difference(a, b)).mean[0])
            # brilho medio: regiao preta constante nao e marca, e letterbox
            brilho = ImageStat.Stat(quadros[0].crop(caixa)).mean[0]
            mapa.append((cx0, cy0, sum(difs) / len(difs), brilho))

    movimento_medio = sum(m[2] for m in mapa) / len(mapa)
    if movimento_medio <= 0.01:
        print("  [aviso] o video inteiro esta praticamente parado — a deteccao")
        print("          por imobilidade nao distingue marca de plano fixo.")
        return []

    achados = []
    for cx0, cy0, dif, brilho in mapa:
        if dif > movimento_medio * 0.25:      # essa regiao se mexe: nao e marca
            continue
        if brilho < 8:                         # preto absoluto: letterbox
            continue
        # marca mora em canto ou faixa; o miolo raramente
        borda_x = cx0 < w * 0.22 or cx0 > w * 0.62
        borda_y = cy0 < h * 0.14 or cy0 > h * 0.80
        if not (borda_x or borda_y):
            continue
        achados.append((cx0, cy0, celula, celula,
                        1.0 - min(dif / max(movimento_medio, 0.001), 1.0)))
    achados.sort(key=lambda a: -a[4])
    return achados


def comparar(videos, celula=24, limite=6.0):
    """Acha o que e IGUAL entre videos DIFERENTES da mesma ferramenta.

    E o sinal mais forte que existe para marca d'agua, e resolve o caso em que a
    deteccao por imobilidade falha: video de plano fixo, onde a cena inteira
    esta parada e "o que nao se mexe" nao distingue nada.

    Dois videos com conteudo diferente nao tem nenhuma regiao identica -- exceto
    o carimbo que a ferramenta poe em todos. Quanto mais videos, mais certeiro.

    Foi o que aconteceu em 06/09: quatro takes de estatua imovel: a deteccao por
    movimento apontou as colunas de marmore (paradas, mas parte da cena) e
    ignorou o "AI generated" no canto. Comparando os quatro, a marca aparece
    sozinha.
    """
    try:
        from PIL import Image, ImageChops, ImageStat
    except ImportError:
        print("precisa do Pillow: pip install pillow")
        return []
    import tempfile

    if len(videos) < 2:
        print("  --comparar precisa de 2 ou mais videos da MESMA ferramenta")
        return []

    quadros = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, v in enumerate(videos):
            d = _dur(v)
            f = os.path.join(tmp, "v%d.png" % i)
            subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.2f" % (d * 0.5),
                            "-i", v, "-frames:v", "1", f, "-y"], capture_output=True)
            if os.path.isfile(f):
                quadros.append(Image.open(f).convert("L").copy())
    if len(quadros) < 2:
        return []

    w, h = quadros[0].size
    if any(q.size != (w, h) for q in quadros):
        print("  [aviso] os videos tem tamanhos diferentes; comparo o menor comum")
        w = min(q.size[0] for q in quadros)
        h = min(q.size[1] for q in quadros)
        quadros = [q.crop((0, 0, w, h)) for q in quadros]

    achados = []
    for cy in range(h // celula):
        for cx in range(w // celula):
            caixa = (cx * celula, cy * celula,
                     cx * celula + celula, cy * celula + celula)
            recortes = [q.crop(caixa) for q in quadros]
            difs = []
            for k in range(len(recortes) - 1):
                difs.append(ImageStat.Stat(
                    ImageChops.difference(recortes[k], recortes[k + 1])).mean[0])
            media = sum(difs) / len(difs)
            brilho = ImageStat.Stat(recortes[0]).mean[0]
            # identico entre videos diferentes + nao e preto puro (letterbox)
            if media < limite and brilho > 10:
                achados.append((cx * celula, cy * celula, celula, celula,
                                1.0 - media / limite))
    achados.sort(key=lambda a: -a[4])
    return achados


def grade(video, saida, passo=None):
    """Grava um quadro do video com grade de coordenadas por cima.

    E a rota que sempre funciona: em vez de adivinhar onde esta a marca, voce
    OLHA e le o x/y direto na imagem. O passo se ajusta ao tamanho do quadro
    para a grade nao virar tela de mosquito.
    """
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        print("precisa do Pillow: pip install pillow")
        return None
    import tempfile

    w, h = _dim(video)
    d = _dur(video)
    passo = passo or (50 if max(w, h) < 1200 else 100)
    with tempfile.TemporaryDirectory() as tmp:
        f = os.path.join(tmp, "q.png")
        subprocess.run(["ffmpeg", "-v", "error", "-ss", "%.2f" % (d * 0.6),
                        "-i", video, "-frames:v", "1", f, "-y"],
                       capture_output=True)
        if not os.path.isfile(f):
            return None
        im = Image.open(f).convert("RGB").copy()

    d_ = ImageDraw.Draw(im)
    for x in range(0, w, passo):
        forte = (x % (passo * 2) == 0)
        d_.line([(x, 0), (x, h)], fill=(255, 60, 60) if forte else (120, 120, 120),
                width=2 if forte else 1)
        if forte:
            d_.text((x + 3, 3), str(x), fill=(255, 220, 60))
    for y in range(0, h, passo):
        forte = (y % (passo * 2) == 0)
        d_.line([(0, y), (w, y)], fill=(255, 60, 60) if forte else (120, 120, 120),
                width=2 if forte else 1)
        if forte:
            d_.text((3, y + 3), str(y), fill=(255, 220, 60))
    im.save(saida)
    return saida


def _juntar(achados, celula=40, folga=8):
    """Agrupa celulas vizinhas numa caixa so."""
    if not achados:
        return []
    caixas = []
    for x, y, w, h, s in achados:
        for c in caixas:
            if (x <= c[2] + celula and x + w >= c[0] - celula
                    and y <= c[3] + celula and y + h >= c[1] - celula):
                c[0], c[1] = min(c[0], x), min(c[1], y)
                c[2], c[3] = max(c[2], x + w), max(c[3], y + h)
                c[4] = max(c[4], s)
                break
        else:
            caixas.append([x, y, x + w, y + h, s])
    return [(c[0] - folga, c[1] - folga, c[2] - c[0] + 2 * folga,
             c[3] - c[1] + 2 * folga, c[4]) for c in caixas]


def limpar(entrada, saida, delogo=None, crop_baixo=0, crop_topo=0,
           cobrir=None, alvo=None, crf=18):
    w, h = _dim(entrada)
    filtros = []

    if crop_baixo or crop_topo:
        nh = h - crop_baixo - crop_topo
        if alvo:
            aw, ah = (int(x) for x in alvo.lower().split("x"))
            nw = min(w, int(nh * aw / ah))     # mantem a proporcao alvo
        else:
            nw = w
        ox = (w - nw) // 2
        filtros.append("crop=%d:%d:%d:%d" % (nw, nh, ox, crop_topo))

    if delogo:
        x, y, dw, dh = (int(v) for v in delogo.split(":"))
        # `delogo` interpola a regiao a partir da borda dela
        filtros.append("delogo=x=%d:y=%d:w=%d:h=%d:show=0" % (x, y, dw, dh))

    if cobrir:
        x, y, cw, ch = (int(v) for v in cobrir.split(":"))
        filtros.append("drawbox=x=%d:y=%d:w=%d:h=%d:color=black@1:t=fill"
                       % (x, y, cw, ch))

    if alvo:
        filtros.append("scale=%s:flags=lanczos" % alvo.lower().replace("x", ":"))

    if not filtros:
        print("nada a fazer — passe --delogo, --crop-baixo, --cobrir ou --alvo")
        return 1

    cmd = ["ffmpeg", "-v", "error", "-i", entrada, "-vf", ",".join(filtros),
           "-c:v", "libx264", "-preset", "slow", "-crf", str(crf),
           "-pix_fmt", "yuv420p"]
    # preserva o audio se houver
    tem_audio = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries",
         "stream=index", "-of", "csv=p=0", entrada],
        capture_output=True, text=True).stdout.strip()
    cmd += ["-c:a", "copy"] if tem_audio else ["-an"]
    cmd += [saida, "-y"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print("FALHOU:", (r.stderr or "")[-400:])
        return 1
    nw, nh = _dim(saida)
    print("  %-34s %dx%d -> %dx%d" % (os.path.basename(saida), w, h, nw, nh))
    return 0


def main():
    ap = argparse.ArgumentParser(description="remove marca d'agua/legenda de video")
    ap.add_argument("entrada", help="arquivo .mp4 ou pasta")
    ap.add_argument("-o", "--saida", help="arquivo ou pasta de saida")
    ap.add_argument("--detectar", action="store_true",
                    help="so aponta as regioes suspeitas, nao altera nada")
    ap.add_argument("--mapa", action="store_true",
                    help="grava um quadro com GRADE de coordenadas — a rota que "
                         "sempre funciona: olhe e leia o x/y da marca")
    ap.add_argument("--comparar", action="store_true",
                    help="acha o que e IGUAL entre varios videos da mesma "
                         "ferramenta — e o sinal mais confiavel de marca d'agua")
    ap.add_argument("--delogo", help="x:y:w:h — interpola a regiao (nao perde area)")
    ap.add_argument("--cobrir", help="x:y:w:h — preenche de preto")
    ap.add_argument("--crop-baixo", type=int, default=0, help="px a cortar embaixo")
    ap.add_argument("--crop-topo", type=int, default=0, help="px a cortar em cima")
    ap.add_argument("--alvo", help="resolucao final, ex 1080x1920")
    ap.add_argument("--crf", type=int, default=18)
    a = ap.parse_args()

    if os.path.isdir(a.entrada):
        arquivos = sorted(glob.glob(os.path.join(a.entrada, "*.mp4")))
    else:
        arquivos = [a.entrada]
    if not arquivos:
        print("nenhum .mp4 em", a.entrada)
        return 1

    if a.mapa:
        for f in arquivos:
            alvo = os.path.splitext(f)[0] + "_GRADE.png"
            r = grade(f, alvo)
            if r:
                w, h = _dim(f)
                print("  %s  (%dx%d)" % (os.path.basename(r), w, h))
        print()
        print("  Abra a imagem, veja onde esta a marca, e passe as coordenadas:")
        print("     --delogo X:Y:LARGURA:ALTURA")
        return 0

    if a.comparar:
        if len(arquivos) < 2:
            print("--comparar precisa de uma PASTA com 2+ videos da mesma ferramenta")
            return 1
        print("comparando %d videos — o que for identico entre eles e carimbo:"
              % len(arquivos))
        caixas = _juntar(comparar(arquivos), celula=24, folga=6)
        if not caixas:
            print("  nada identico encontrado — provavelmente nao ha marca fixa")
            return 0
        w, h = _dim(arquivos[0])
        for x, y, cw, ch, s_ in caixas[:6]:
            canto = "inferior" if y > h * 0.6 else "superior"
            lado = "direito" if x > w * 0.5 else "esquerdo"
            print("  %s %s   --delogo %d:%d:%d:%d   (identico em %.0f%%)"
                  % (canto, lado, max(x, 0), max(y, 0), cw, ch, 100 * s_))
        return 0

    if a.detectar:
        for f in arquivos:
            w, h = _dim(f)
            print("\n%s  (%dx%d)" % (os.path.basename(f), w, h))
            caixas = _juntar(detectar(f))
            if not caixas:
                print("  nada parado nas bordas — ou nao ha marca, ou o plano e fixo")
                continue
            for x, y, cw, ch, s in caixas[:5]:
                canto = ("inferior" if y > h * 0.6 else "superior")
                lado = ("direito" if x > w * 0.5 else "esquerdo")
                print("  %s %s   --delogo %d:%d:%d:%d   (imobilidade %.0f%%)"
                      % (canto, lado, max(x, 0), max(y, 0), cw, ch, 100 * s))
            print("  para conferir: extraia um quadro e olhe a regiao antes de remover")
        return 0

    if not a.saida:
        print("informe -o (arquivo ou pasta)")
        return 1

    if len(arquivos) > 1 or os.path.isdir(a.entrada):
        os.makedirs(a.saida, exist_ok=True)
        for f in arquivos:
            limpar(f, os.path.join(a.saida, os.path.basename(f)),
                   a.delogo, a.crop_baixo, a.crop_topo, a.cobrir, a.alvo, a.crf)
    else:
        limpar(arquivos[0], a.saida, a.delogo, a.crop_baixo, a.crop_topo,
               a.cobrir, a.alvo, a.crf)
    return 0


if __name__ == "__main__":
    sys.exit(main())
