# -*- coding: utf-8 -*-
"""Motor de titulos e thumbs pela Regra de 3 — qualquer nicho dark.

COMO ELE PENSA
  Recebe um FATO ja verificado e devolve candidatos de titulo com a thumb
  correspondente, cada um pontuado por `pilares.py`. Ele nao inventa fato: o
  que ele faz e vestir o fato com os tres pilares de varias formas e deixar a
  medicao escolher.

  A geracao aqui e por molde. Ela pode ser substituida por um LLM ou por um
  agente de copy sem mudar mais nada — porque quem julga e o pontuador, e o
  pontuador nao sabe de onde veio a frase. E de proposito: a peneira tem que ser
  a mesma para ideia de molde, de modelo e de gente.

OS TRES PADROES, E A LINHA
  A    afirma o fato verificado                      "STJD da o veredito"
  B1   PERGUNTA sobre o incerto                      "Proibido de vender?!"
  B2   insinua reacao sem citar fala                 "e a reacao nao passou batido"
  B3   inventa fala e atribui a nome real            BLOQUEADO

  A, B1 e B2 sao agressivos e ficam do lado de dentro. B1 e o mais subestimado:
  a interrogacao transforma afirmacao em pergunta, e pergunta nao e assercao —
  e por isso que os canais que operam na margem usam "?!" tanto.

  B3 e a unica linha que este arquivo se recusa a cruzar, e a recusa e mecanica,
  nao editorial: o pontuador marca e o gerador descarta.

A THUMB E COMPLEMENTO, NUNCA ECO
  A aula e explicita (52:29): o que nao coube no titulo vai na thumb. Se a thumb
  repete o titulo, metade do espaco de venda foi jogada fora. O gerador sempre
  monta a thumb com o que o titulo NAO disse.

Uso:
    python gerador.py --exemplo futebol
    python gerador.py --diagnostico "SEU TITULO AQUI" --thumb "TEXTO DA THUMB"
    python gerador.py --json fato.json
"""
import argparse
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import pilares

# ─────────────────────────────────────────────────────────────────────────────
# GATILHOS POR NICHO
#   Nao e enfeite: cada nicho tem um vocabulario de ruptura proprio, e usar o
#   de outro soa falso. "A casa caiu" funciona em noticia e some em estoicismo;
#   "ninguem te conta" funciona em estoicismo e some em plantao de futebol.
# ─────────────────────────────────────────────────────────────────────────────
NICHOS = {
    "futebol": {
        "ruptura": ["A CASA CAIU!", "ACABOU!", "BOMBA!", "PLANTÃO URGENTE!",
                    "AGORA!", "REVIRAVOLTA!", "CONFIRMADO!", "SAIU AGORA!"],
        "tensao": ["não passou batido", "não arrega", "manda recado",
                   "joga no ventilador", "quebra o silêncio", "solta o verbo",
                   "peita", "bate de frente"],
        "resolucao": ["entenda o que muda", "e o que acontece agora",
                      "veja o desfecho", "e a decisão sai hoje"],
    },
    "maromba": {
        "ruptura": ["POLÊMICA PESADA!", "EXPÔS TUDO!", "SAINDO DO CONTROLE!",
                    "DENÚNCIA PESADA!", "AGORA JÁ ERA!", "REVIRAVOLTA!"],
        "tensao": ["joga no ventilador", "expõe tudo", "manda recado",
                   "quebra o silêncio", "responde ao vivo", "detona"],
        "resolucao": ["entenda a situação", "e o que vem agora",
                      "veja como ficou", "e no que isso dá"],
    },
    "estoicismo": {
        "ruptura": ["PARE DE FAZER ISSO", "NINGUÉM TE CONTA ISSO",
                    "COMECE HOJE", "ISSO MUDA TUDO", "É POR ISSO QUE"],
        "tensao": ["que ninguém te ensina", "que escondem de você",
                   "que você faz errado", "que ninguém aplica"],
        "resolucao": ["e sua ansiedade acaba", "e o dia vira",
                      "sem terapia", "em 7 minutos", "de uma vez"],
    },
    "financas": {
        "ruptura": ["MUDOU AGORA!", "ACABOU A FESTA!", "CONFIRMADO!",
                    "NINGUÉM AVISOU!", "CAIU A FICHA!"],
        "tensao": ["que o banco não conta", "que escondem de você",
                   "que ninguém explica", "por trás da decisão"],
        "resolucao": ["e o que fazer com seu dinheiro", "antes que seja tarde",
                      "e como se proteger", "e no que investir agora"],
    },
}
NICHO_PADRAO = "futebol"


# ─────────────────────────────────────────────────────────────────────────────
# MOLDES
#   `{}` sao preenchidos com dado do fato. Nenhum molde inventa conteudo — o
#   que os moldes fazem e escolher a MOLDURA, e a moldura e o que carrega os
#   pilares.
# ─────────────────────────────────────────────────────────────────────────────
#   `{acao}` e a acao inteira; `{curta}` e a versao de poucas palavras. Os
#   moldes curtos usam `{curta}` porque o feed corta em 55 caracteres — um
#   titulo de 95 tem os dois tercos finais invisiveis para quem rola a tela.
MOLDES = {
    "A": [
        "{ruptura} {Sujeito} {curta} — {consequencia}",
        "{Sujeito} {curta}: {consequencia}",
        "{ruptura} {Consequencia} depois que {sujeito} {curta}",
        "{ruptura} {Sujeito} {acao} e {resolucao}",
    ],
    "B1": [
        "{ruptura} {Sujeito} {curta}?! {consequencia}",
        "{Sujeito} {curta}?! {resolucao}",
        "{ruptura} {Sujeito} {curta} mesmo? {resolucao}",
    ],
    "B2": [
        "{ruptura} {Sujeito} {curta} e {alvo} {tensao}",
        "{Sujeito} {curta} — e {alvo} {tensao}",
        "{ruptura} {Alvo} {tensao} depois que {sujeito} {curta}",
    ],
}

# O que vai na thumb: sempre o pedaco do fato que o titulo NAO usou.
THUMB = {
    "A": ["{consequencia}", "E AGORA?", "{resolucao}"],
    "B1": ["É VERDADE?", "{consequencia}", "O QUE SE SABE"],
    "B2": ["{alvo} RESPONDEU", "{consequencia}", "NÃO FICOU CALADO"],
}


def _cap(txt):
    """Primeira letra maiuscula sem estragar o resto — `.capitalize()` do Python
    rebaixa o que vem depois, e nome proprio no meio da frase viraria minusculo."""
    t = (txt or "").strip()
    return (t[0].upper() + t[1:]) if t else t


def _limpa(t):
    """Costura de molde deixa emenda: palavrinha repetida, espaco antes de
    pontuacao, travessao colado num "!". Limpar aqui e mais barato que escrever
    um molde para cada combinacao possivel de gatilho."""
    import re as _re
    t = " ".join((t or "").split())
    t = _re.sub(r"\b(e|de|da|do|a|o|que)\s+\1\b", lambda m: m.group(1), t,
                flags=_re.I)
    t = _re.sub(r"\s+([,.:;!?])", lambda m: m.group(1), t)
    t = _re.sub(r"([!?:])\s*\u2014\s*", lambda m: m.group(1) + " ", t)
    t = _re.sub(r"\s*\u2014\s*$", "", t)
    return t.strip(" \u2014-:")


def _acao_curta(fato):
    """A acao em poucas palavras. Se o fato nao trouxer, corta na primeira
    preposicao — que e onde o complemento comeca em quase toda frase."""
    import re as _re
    if fato.get("acao_curta"):
        return fato["acao_curta"]
    a = fato.get("acao", "")
    m = _re.split(r"\s+(?:de|do|da|dos|das|para|por|com|em|no|na)\s+", a, maxsplit=1)
    return m[0] if m and len(m[0].split()) >= 2 else a


def _curto(txt, n=34):
    """Thumb nao e legenda: acima de ~5 palavras ninguem le num quadradinho."""
    t = (txt or "").strip().rstrip(".")
    if len(t) <= n:
        return t.upper()
    corte = t[:n].rsplit(" ", 1)[0]
    return corte.upper()


def gera(fato, padroes=("A", "B1", "B2"), nicho=None):
    """Candidatos ordenados por nota. Nenhum B3 sai daqui."""
    n = NICHOS.get(nicho or fato.get("nicho") or NICHO_PADRAO, NICHOS[NICHO_PADRAO])
    verificados = fato.get("verificado") or []
    curta = _acao_curta(fato)
    saida = []

    # B2 poe o `alvo` reagindo. Isso so e frase quando o alvo e alguem capaz de
    # reagir — um clube, uma pessoa, uma marca. Em nicho de utilidade o alvo e o
    # proprio espectador, e ele nao "manda recado" sobre a noticia.
    if not fato.get("alvo_reage", True):
        padroes = tuple(p for p in padroes if p != "B2")

    for padrao in padroes:
        for molde in MOLDES.get(padrao, []):
            for ruptura in n["ruptura"]:
                for tensao in (n["tensao"] if "{tensao}" in molde else [""]):
                    for resol in (n["resolucao"] if "{resolucao}" in molde else [""]):
                        try:
                            t = molde.format(
                                ruptura=ruptura, tensao=tensao, resolucao=resol,
                                sujeito=fato.get("sujeito", ""),
                                Sujeito=_cap(fato.get("sujeito", "")),
                                acao=fato.get("acao", ""),
                                curta=curta,
                                alvo=fato.get("alvo", ""),
                                Alvo=_cap(fato.get("alvo", "")),
                                consequencia=fato.get("consequencia", ""),
                                Consequencia=_cap(fato.get("consequencia", "")))
                        except KeyError:
                            continue
                        t = _limpa(t)
                        if len(t) > pilares.MAX_TITULO:
                            continue
                        for molde_h in THUMB[padrao]:
                            try:
                                h = _curto(molde_h.format(
                                    alvo=fato.get("alvo", ""),
                                    resolucao=resol or "",
                                    consequencia=fato.get("consequencia", "")))
                            except KeyError:
                                continue
                            if not h:
                                continue
                            a = pilares.analisa(t, h, verificados)
                            if a["risco"] == "B3":
                                continue          # a linha, em codigo
                            a["padrao"] = padrao
                            a["molde"] = molde
                            saida.append(a)

    # Empate na nota se desfaz pelo MENOR titulo. Entre dois candidatos com os
    # mesmos pilares, o curto ganha sempre: ele cabe inteiro antes do corte do
    # feed, e o longo entrega a metade final para ninguem.
    vistos, unicos = set(), []
    for a in sorted(saida, key=lambda x: (-x["nota"], x["caracteres"])):
        # A chave e o MOLDE, nao o texto. Dez rupturas no mesmo molde sao a
        # mesma ideia gritada de dez jeitos; quem escolhe titulo quer comparar
        # afirmar contra perguntar contra insinuar.
        chave = (a["padrao"], a["molde"])
        if chave in vistos:
            continue
        vistos.add(chave)
        unicos.append(a)
    return unicos


def imprime(cands, quantos=8):
    print("%-4s %-5s %s" % ("NOTA", "PAD", "TÍTULO  ·  THUMB"))
    print("─" * 96)
    for a in cands[:quantos]:
        print("%-4d %-5s %s" % (a["nota"], a["padrao"], a["titulo"]))
        print("%-10s ↳ thumb: %s   (%d caract.)" % ("", a["thumb"], a["caracteres"]))
    if not cands:
        print("  nenhum candidato passou — reveja o fato de entrada")


EXEMPLOS = {
    "futebol": {
        "nicho": "futebol",
        "sujeito": "o STJD",
        "acao": "julgou o caso de apostas de Bruno Henrique",
        "acao_curta": "julga Bruno Henrique",
        "alvo": "o Flamengo",
        "consequencia": "o atacante pode pegar 2 anos de suspensão",
        "verificado": [],
    },
    "maromba": {
        "nicho": "maromba",
        "sujeito": "a Shopee",
        "acao": "tirou o whey do ar",
        "acao_curta": "tira o whey do ar",
        "alvo": "o dono da marca",
        "consequencia": "o lote está sob análise da Anvisa",
        "verificado": [],
    },
    "estoicismo": {
        "nicho": "estoicismo",
        "sujeito": "Marco Aurélio",
        "acao": "escrevia 3 linhas antes de dormir",
        "acao_curta": "escrevia 3 linhas por noite",
        "alvo_reage": False,
        "alvo": "quem sofre de ansiedade",
        "consequencia": "o sono volta em uma semana",
        "verificado": [],
    },
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--exemplo", choices=sorted(EXEMPLOS))
    ap.add_argument("--json", help="arquivo com o fato")
    ap.add_argument("--diagnostico", help="pontua um título já existente")
    ap.add_argument("--thumb", default="", help="texto da thumb, para o diagnóstico")
    ap.add_argument("--padroes", default="A,B1,B2")
    ap.add_argument("--quantos", type=int, default=8)
    a = ap.parse_args()

    if a.diagnostico:
        print(pilares.relatorio(pilares.analisa(a.diagnostico, a.thumb)))
        return 0

    if a.json:
        fato = json.load(open(a.json, encoding="utf-8"))
    elif a.exemplo:
        fato = EXEMPLOS[a.exemplo]
    else:
        ap.print_help()
        print("\nnichos disponíveis: %s" % ", ".join(sorted(NICHOS)))
        return 1

    print("FATO: %s %s\n      consequência: %s\n"
          % (fato.get("sujeito"), fato.get("acao"), fato.get("consequencia")))
    imprime(gera(fato, tuple(a.padroes.split(","))), a.quantos)
    return 0


if __name__ == "__main__":
    sys.exit(main())
