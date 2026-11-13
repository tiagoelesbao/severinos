# -*- coding: utf-8 -*-
"""Rota PRO da narracao: gerar por PARAGRAFO, nao por cue.

A DIFERENCA ENTRE AS DUAS ROTAS
  LITE  o SRT fino (uma frase curta por cue) entra direto no motor. Cada cue e
        uma geracao, e cada emenda vira uma parada. Medido na primeira peca:
        47 pausas acima de 250 ms, 16% do tempo em silencio digital. Da para
        consertar depois com `ajusta_pausas.py`, mas e conserto.
  PRO   o motor recebe um SRT cujos cues sao os PARAGRAFOS. Dentro do
        paragrafo a prosodia e continua porque foi gerada de uma vez — e
        prosodia continua nao se reconstroi depois de cortada.

POR QUE NAO PRECISOU DE WORKFLOW NOVO
  O `UnifiedTTSSRTNode` tem `timing_mode: concatenate`, que IGNORA o timing de
  entrada, emenda o audio natural e devolve um SRT novo com os tempos reais.
  Alimentado com um SRT de paragrafos, ele faz exatamente o que a rota PRO
  pede. O timing que entra so serve como ordem.

O CORTE POR TAMANHO, QUE E OBRIGATORIO
  O bloco mais longo dos roteiros longos tem 100 palavras — perto de 47 s de
  fala. Geracoes muito longas truncam ou degradam no fim. Entao paragrafo
  acima de `LIMITE` e cortado em FRONTEIRA DE FRASE, nunca no meio: cortar no
  meio de uma frase produz a entoacao de ponto final onde nao havia ponto, que
  e o defeito que a rota PRO existe para evitar.

Uso:  python narracao_pro.py <roteiro> [...]      escreve {roteiro}.blocos.srt
      python narracao_pro.py --todos
"""
import glob, io, json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

DIR = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)),
                                    "..", "..", "data", "roteiros", "estoico"))
LIMITE = 55          # palavras por geracao
WPM = {"A": 127.5, "B": 151.1}


def frases(texto):
    """Divide em frases mantendo a pontuacao final colada."""
    partes = re.split(r"(?<=[.!?])\s+", texto.strip())
    return [p for p in partes if p]


def corta(texto, limite=LIMITE):
    """Paragrafo -> lista de pedacos, cada um abaixo do limite quando possivel.

    Uma frase sozinha acima do limite NAO e quebrada. Preferir uma geracao
    longa a uma entoacao errada — o defeito da fala cortada e audivel; o da
    geracao longa, na pior das hipoteses, e uma respiracao mal colocada.
    """
    saida, atual = [], []
    n = 0
    for f in frases(texto):
        p = len(f.split())
        if atual and n + p > limite:
            saida.append(" ".join(atual))
            atual, n = [f], p
        else:
            atual.append(f)
            n += p
    if atual:
        saida.append(" ".join(atual))
    return saida


def hhmmss(ms):
    h, ms = divmod(int(ms), 3600000)
    m, ms = divmod(ms, 60000)
    s, ms = divmod(ms, 1000)
    return "%02d:%02d:%02d,%03d" % (h, m, s, ms)


def gerar(roteiro):
    origem = os.path.join(DIR, roteiro + ".blocos.json")
    if not os.path.isfile(origem):
        print("  sem .blocos.json: %s" % roteiro)
        return None
    d = json.load(io.open(origem, encoding="utf-8"))
    wpm = d.get("wpm") or WPM["A"]

    pedacos = []
    for b in d["blocos"]:
        pedacos.extend(corta(b["texto"]))

    # O tempo aqui e so ORDEM — `concatenate` descarta e devolve o real. Ainda
    # assim precisa ser um SRT valido e monotonico, senao o parser recusa.
    linhas, t = [], 0
    for i, p in enumerate(pedacos, 1):
        dur = max(800, int(len(p.split()) / wpm * 60 * 1000))
        linhas.append("%d\n%s --> %s\n%s\n" % (i, hhmmss(t), hhmmss(t + dur), p))
        t += dur + 120

    saida = os.path.join(DIR, roteiro + ".blocos.srt")
    io.open(saida, "w", encoding="utf-8").write("\n".join(linhas))
    ws = [len(p.split()) for p in pedacos]
    print("  %-18s %3d blocos -> %3d geracoes · maior %d palavras · ~%.0f min"
          % (roteiro, len(d["blocos"]), len(pedacos), max(ws), t / 60000))
    return saida


def main():
    alvos = [a for a in sys.argv[1:] if not a.startswith("--")]
    if "--todos" in sys.argv or not alvos:
        alvos = [os.path.basename(f)[:-len(".blocos.json")]
                 for f in sorted(glob.glob(os.path.join(DIR, "*.blocos.json")))]
    for r in alvos:
        gerar(r)
    return 0


if __name__ == "__main__":
    sys.exit(main())
