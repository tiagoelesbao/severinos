# -*- coding: utf-8 -*-
"""Transforma o `roteiro.md` de um curto no `narracao.srt` que o TTS consome.

POR QUE NAO E FEITO A MAO
  O SRT do LA1-P1 foi digitado. Funcionou para um curto e nao escala para sete:
  cada correcao de texto exige recalcular todas as marcas depois dela, e SRT
  que diverge do roteiro e a fonte classica de legenda fora de sincronia.

  Aqui o roteiro e a unica fonte. O SRT e derivado -- e se o roteiro mudar,
  basta rodar de novo.

O QUE ELE FAZ
  Cada PARAGRAFO da secao `## ROTEIRO` vira um cue. A duracao sai do numero de
  palavras a WPM medido do motor. Entre cues entra uma pausa fixa.

  O SRT e uma REGUA DE ENTRADA, nao a verdade sobre o audio: o motor fala mais
  rapido que a estimativa (medido: 171,6 wpm no male02, contra os 135 do longo).
  Quem precisa de tempo REAL usa `fala-real.json`, transcrito do mp3.

PROSODIA
  As tags `[exag:N]` sao direcao por cue -- 9 de 10 queixas do founder sao de
  entonacao, nao de timbre. O padrao e uma curva: abre alto (o hook), desce na
  citacao historica, sobe de novo no desafio. `prosodia:` no `curto.yaml`
  sobrepoe cue a cue quando a curva padrao nao serve.

USO
    python gera_srt_curto.py LA1-p2-dificil-primeiro-60s
    python gera_srt_curto.py --todos
"""
import argparse
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
RAIZ = os.path.abspath(os.path.join(AQUI, "..", ".."))
CURTOS = os.path.join(RAIZ, "workspaces", "businesses", "virals",
                      "creative-studio", "canais", "canal-estoico", "curtos")

# MEDIDO no motor, nao herdado da referencia. O ritmo de quem modelamos (127 a
# 151 wpm) nao prediz a duracao da nossa peca -- o male02 fala a 171,6.
WPM = 171.6
PAUSA_S = 0.55


def paragrafos(caminho):
    linhas = io.open(caminho, encoding="utf-8").read().splitlines()
    dentro, blocos, atual = False, [], []
    for l in linhas:
        if l.strip().startswith("## "):
            if atual:
                blocos.append(" ".join(atual))
                atual = []
            dentro = l.strip().lower().startswith("## roteiro")
            continue
        if not dentro:
            continue
        t = l.strip()
        if not t or t.startswith(("**[", "---", ">", "|")):
            if atual:
                blocos.append(" ".join(atual))
                atual = []
            continue
        atual.append(re.sub(r"^\*\*|\*\*$", "", t))
    if atual:
        blocos.append(" ".join(atual))
    return [b for b in blocos if b.strip()]


def curva(n):
    """Direcao de prosodia padrao, por posicao no curto.

    Abre no ponto mais alto porque o hook e onde a energia decide se o
    espectador fica. Cai no miolo -- e ali que mora a citacao historica, e
    citacao lida com a mesma energia do hook soa como propaganda. Sobe de novo
    no fim, que e onde esta o desafio.
    """
    if n <= 1:
        return [0.45]
    saida = []
    for i in range(n):
        p = i / (n - 1.0)
        if p < 0.25:
            v = 0.50 - 0.10 * (p / 0.25)
        elif p < 0.75:
            v = 0.40 - 0.10 * ((p - 0.25) / 0.50)
        else:
            v = 0.30 + 0.12 * ((p - 0.75) / 0.25)
        saida.append(round(v, 2))
    return saida


def hms(s):
    ms = int(round(s * 1000))
    h, ms = divmod(ms, 3600000)
    m, ms = divmod(ms, 60000)
    seg, ms = divmod(ms, 1000)
    return "%02d:%02d:%02d,%03d" % (h, m, seg, ms)


def gera(slug, mostrar=True):
    pack = os.path.join(CURTOS, slug)
    rot = os.path.join(pack, "01-roteiro", "roteiro.md")
    if not os.path.isfile(rot):
        print("%-34s sem 01-roteiro/roteiro.md" % slug)
        return None

    blocos = paragrafos(rot)
    exags = curva(len(blocos))

    # sobreposicao opcional vinda do curto.yaml
    yml = os.path.join(pack, "curto.yaml")
    if os.path.isfile(yml):
        try:
            import yaml
            d = yaml.safe_load(io.open(yml, encoding="utf-8").read()) or {}
            pro = (d.get("curto") or {}).get("prosodia") or d.get("prosodia")
            if isinstance(pro, list):
                for i, v in enumerate(pro[:len(exags)]):
                    if v is not None:
                        exags[i] = float(v)
        except Exception:
            pass

    linhas, t, total_pal = [], 0.0, 0
    for i, b in enumerate(blocos):
        n = len(b.split())
        total_pal += n
        d = n / WPM * 60.0
        linhas.append("%d\n%s --> %s\n[exag:%.2f] %s\n"
                      % (i + 1, hms(t), hms(t + d), exags[i], b))
        t += d + PAUSA_S
    t -= PAUSA_S

    saida = os.path.join(pack, "01-roteiro", "narracao.srt")
    io.open(saida, "w", encoding="utf-8").write("\n".join(linhas))
    if mostrar:
        print("%-34s %2d cues · %3d palavras · %4.1fs previstos"
              % (slug, len(blocos), total_pal, t))
    return t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug", nargs="?")
    ap.add_argument("--todos", action="store_true")
    a = ap.parse_args()
    if a.todos:
        for s in sorted(os.listdir(CURTOS)):
            if os.path.isdir(os.path.join(CURTOS, s)):
                gera(s)
        return 0
    if not a.slug:
        ap.error("informe o slug ou use --todos")
    return 0 if gera(a.slug) else 1


if __name__ == "__main__":
    sys.exit(main())
