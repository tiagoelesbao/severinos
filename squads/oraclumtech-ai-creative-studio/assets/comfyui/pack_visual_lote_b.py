# -*- coding: utf-8 -*-
"""Catalogo visual do LOTE B longo — 3 pecas, identidade `estoico-bronze-carmesim`.

NAO REESCREVE OS PROMPTS. Importa a coluna FIEL de `modelagem_takes_v2.py`, que
e exatamente o que o founder viu no storyboard e escolheu. Reescrever aqui
criaria uma segunda versao do mesmo prompt, e as duas divergiriam na primeira
correcao que alguem fizesse em so uma delas.

O QUE MUDA EM RELACAO AO LOTE A
  material   bronze quase preto e pedra azul-acinzentada com ORNAMENTO DOURADO,
             no lugar do marmore creme
  luz        recorte quente forte contra entorno muito escuro
  ambiente   ruina com ARCO e portico, e planos DIURNOS largos com ceu azul
  paleta     ouro quente + teal profundo, com acento CARMESIM
  legenda    caixa alta, destaque carmesim (`--destaque` do gera_timeline_dark)

AS TRES PECAS DIVIDEM O CATALOGO, NAO O QUADRO
  Mesma logica do lote A: um catalogo, tres sementes. Mesma direcao de arte,
  quadros diferentes em cada peca.
"""
import sys, os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from modelagem_takes_v2 import (TAKES as _TAKES_V2, ACABAMENTO, NEG, MATERIA,
                                MATERIAL, TAKES_FIGURA)

# As tres pecas do lote. A ordem define a semente.
PECAS = ["LB1-aceitar", "LB2-paz-interior", "LB3-primeiros-minutos"]

# (n, slug, prompt FIEL ja montado) — a mesma composicao que `variacoes()` faz,
# so que sem gerar as outras duas colunas.
MARCADORES = []
for _tid, _slug, _desc, _fiel, _inter, _autoral in _TAKES_V2:
    _extra = (", " + MATERIA + ", " + MATERIAL[_tid]) if _tid in TAKES_FIGURA else ""
    MARCADORES.append((_tid, _slug, _fiel + _extra + ", " + ACABAMENTO))


# O INTERMEZZO precisa de imagem propria — e um bloco de TOM, nao de conteudo.
# Se dividisse quadro com a reflexao ao lado, leria como erro de montagem. Nao
# existe na v2 porque a referencia nao tem intermezzo: ela emenda as dez
# reflexoes direto. E acrescimo nosso, escrito no vocabulario dela.
MARCADORES.append((
    11, "colunata-contraluz-dourada",
    "Wide cinematic horizontal composition. A corridor of tall stone columns seen "
    "head on and receding into the distance, a single bright shaft of warm golden "
    "light breaking through the far opening and flooding down the centre, the "
    "columns reduced to dark silhouettes on both sides against a deep teal "
    "darkness, heavy volumetric haze, no figure present, deep blacks at the edges, "
    + ACABAMENTO))


def prompt_de(corpo):
    """Ja vem montado do catalogo v2 — existe so para espelhar a API do lote A."""
    return corpo


def semente(peca, n):
    """Base 9400/9500/9600 conforme a posicao em PECAS.

    Fora da faixa do lote A (9100-9300) de proposito: sementes iguais em packs
    diferentes produziriam quadros parecidos entre os dois lotes, que e
    justamente o que a separacao de identidade quer evitar.
    """
    return 9400 + 100 * PECAS.index(peca) + n
