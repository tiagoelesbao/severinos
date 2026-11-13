# -*- coding: utf-8 -*-
"""Storyboard de validacao — frame REAL x as tres variacoes, take a take.

E o documento que o founder le para decidir. Formato pedido por ele:
"validar com um documento de storyboard ja com os takes para eu apontar correcoes
necessarias em cada um antes de prosseguir com a etapa de composicao".

Sai:
  assets/fidelidade-v1/comparativo.jpg   uma folha, todos os takes
  assets/fidelidade-v1/STORYBOARD.md     um bloco por take, com as caixas de escolha

Uso:  python monta_storyboard.py
"""
import glob, json, io, os, sys
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Qual referencia: v1 (praticas) ou v2 (reflexoes). O mesmo storyboard serve as
# duas — muda o catalogo, a pasta dos frames reais e a pasta das geradas.
REF = sys.argv[1] if len(sys.argv) > 1 else "v1"
if REF == "v2":
    from modelagem_takes_v2 import TAKES
    PASTA_REF = "v2-reflexoes"
    TITULO = "v2 (10 reflexoes matinais)"
else:
    from modelagem_takes_v1 import TAKES
    PASTA_REF = "v1-praticas"
    TITULO = "v1 (10 praticas estoicas)"

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

RAIZ = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
REAL = os.path.join(RAIZ, "docs", "referencias", "estoico", PASTA_REF, "takes")
GER = os.path.join("C:" + os.sep, "Users", "Pichau", "Desktop",
                   "ComfyUI_windows_portable", "ComfyUI", "output",
                   "fidelidade-" + REF)
DEST = os.path.join(RAIZ, "assets", "fidelidade-" + REF)

NIVEIS = ["fiel", "intermediaria", "autoral"]
CW, CH, PAD, TOP, LEFT = 400, 225, 12, 92, 160


def fonte(t):
    try:
        return ImageFont.truetype("segoeui.ttf", t)
    except OSError:
        return ImageFont.load_default()


F_T, F_M, F_P = fonte(25), fonte(15), fonte(12)


def real_de(tid):
    p = glob.glob(os.path.join(REAL, "unicos", "T%02d_*" % tid))
    return p[0] if p else None


def gerado(tid, slug, nivel):
    # O ComfyUI NAO sobrescreve: uma regeracao vira `_00002_` ao lado do `_00001_`.
    # Pegar `p[0]` mostrava a rodada ANTIGA na folha — exatamente a que se acabou
    # de corrigir. A folha tem que mostrar sempre a ULTIMA.
    p = glob.glob(os.path.join(GER, "T%02d-%s-%s_*.png" % (tid, slug, nivel)))
    return max(p, key=os.path.getmtime) if p else None


def quebra(txt, n):
    palavras, linhas, atual = txt.split(), [], ""
    for w in palavras:
        if len(atual) + len(w) + 1 <= n:
            atual = (atual + " " + w).strip()
        else:
            linhas.append(atual)
            atual = w
    if atual:
        linhas.append(atual)
    return linhas


def folha():
    W = LEFT + 4 * CW + 5 * PAD
    H = TOP + len(TAKES) * (CH + 30) + PAD
    f = Image.new("RGB", (W, H), (18, 18, 20))
    d = ImageDraw.Draw(f)
    d.text((PAD, 12), "STORYBOARD DE MODELAGEM — %s · 3 variacoes cada" % TITULO,
           font=F_T, fill=(240, 240, 240))
    d.text((PAD, 46),
           "Semente FIXA entre as tres variacoes: a diferenca vem do PROMPT, nao do "
           "acaso. Escolha uma por linha no STORYBOARD.md.",
           font=F_P, fill=(150, 150, 160))
    rot = ["REAL — frame do video", "FIEL — o mais proximo",
           "INTERMEDIARIA", "AUTORAL — reinterpretada"]
    cor = [(230, 170, 120), (150, 200, 255), (170, 200, 190), (200, 170, 220)]
    for c in range(4):
        d.text((LEFT + PAD + c * (CW + PAD), TOP - 22), rot[c], font=F_M, fill=cor[c])

    faltando = []
    for i, t in enumerate(TAKES):
        tid, slug, desc = t[0], t[1], t[2]
        y = TOP + i * (CH + 30)
        d.text((PAD, y + 4), "T%02d" % tid, font=F_M, fill=(240, 240, 240))
        for w, linha in enumerate(quebra(desc, 22)[:5]):
            d.text((PAD, y + 26 + w * 15), linha, font=F_P, fill=(140, 140, 150))
        caminhos = [real_de(tid)] + [gerado(tid, slug, n) for n in NIVEIS]
        for c, p in enumerate(caminhos):
            px = LEFT + PAD + c * (CW + PAD)
            if p:
                f.paste(Image.open(p).convert("RGB").resize((CW, CH), Image.LANCZOS),
                        (px, y))
            else:
                faltando.append("T%02d/%s" % (tid, (["real"] + NIVEIS)[c]))
                d.rectangle([px, y, px + CW, y + CH], outline=(90, 60, 60))

    os.makedirs(DEST, exist_ok=True)
    saida = os.path.join(DEST, "comparativo.jpg")
    f.save(saida, quality=88)
    print("escrito:", saida, f.size)
    if faltando:
        print("  FALTANDO:", ", ".join(faltando))


def markdown():
    tk = {}
    p = os.path.join(REAL, "takes.json")
    if os.path.isfile(p):
        d = json.load(io.open(p, encoding="utf-8"))
        tk = {t["id"]: t for t in d["takes"]}

    L = []
    A = L.append
    A("# Storyboard de modelagem — referência %s" % TITULO)
    A("")
    A("> Abra `comparativo.jpg`. Quatro colunas por linha: **frame real**, e as três")
    A("> variações — **fiel**, **intermediária**, **autoral**.")
    A(">")
    A("> **Escolha UMA variação por take.** Só a escolhida segue para acabamento e")
    A("> composição. A semente é a mesma nas três, então a diferença que você vê vem")
    A("> do prompt e não do acaso.")
    A("")
    A("**Como preencher:** troque `[ ]` por `[x]`.")
    A("")
    A("---")
    A("")
    A("## Os três níveis")
    A("")
    A("| Nível | O que é |")
    A("|---|---|")
    # A definicao dos tres niveis e a MESMA para v1 e v2 — o que muda e a
    # identidade citada logo abaixo. O texto anterior descrevia rodadas de
    # geracao ("corrige o desvio da primeira rodada"), que e historia de
    # producao e nao criterio de escolha.
    A("| **Fiel** | Reproduz o frame real: mesmo sujeito, material, enquadramento e luz. É a coluna para quem quer o vídeo indistinguível da referência. |")
    A("| **Intermediária** | Mesmo sujeito e ambiente, variando UMA variável de cinema — ângulo, distância ou direção da luz. Dá repertório sem sair da referência. |")
    A("| **Autoral** | Mesma ideia, luz e cor recompostas com liberdade. É por onde o canal ganha assinatura própria. |")
    A("")
    A("Definidos em `data/identidades-visuais.yaml` → `niveis_de_modelagem`.")
    A("O look vem da identidade `%s`." % ("estoico-bronze-carmesim" if REF == "v2" else "estoico-marmore-templo"))
    A("")
    A("---")
    A("")

    for t in TAKES:
        tid, slug, desc = t[0], t[1], t[2]
        m = tk.get(tid, {})
        A("## T%02d · %s" % (tid, slug.replace("-", " ")))
        A("")
        if m:
            A("**Na referência:** %ds em tela · %d aparição(ões) · 1ª em %s"
              % (m.get("tempo_em_tela_s", 0), m.get("aparicoes", 0),
                 m.get("primeira_aparicao", "?")))
            A("")
        A("**O frame real mostra:** %s" % desc)
        A("")
        A("- [ ] Fiel")
        A("- [ ] Intermediária")
        A("- [ ] Autoral")
        A("- [ ] Nenhuma serve — refazer")
        A("")
        A("**Correção a aplicar:**")
        A("```")
        A("")
        A("```")
        A("")

    A("---")
    A("")
    A("## Decisão de conjunto")
    A("")
    A("**Se um nível servir para o pack inteiro, diga aqui e ignore as marcações acima:**")
    A("")
    A("- [ ] Fiel em tudo")
    A("- [ ] Intermediária em tudo")
    A("- [ ] Autoral em tudo")
    A("- [ ] Escolha take a take, como marcado acima")
    A("")
    A("**Identidade visual do canal** — o nível escolhido vira o padrão em")
    A("`data/identidades-visuais.yaml`:")
    A("```")
    A("")
    A("```")
    A("")
    A("**Cor de destaque da legenda** (a referência usa violeta; a v2 usa carmesim):")
    A("```")
    A("")
    A("```")

    saida = os.path.join(DEST, "STORYBOARD.md")
    io.open(saida, "w", encoding="utf-8").write("\n".join(L) + "\n")
    print("escrito:", saida)


if __name__ == "__main__":
    folha()
    markdown()
