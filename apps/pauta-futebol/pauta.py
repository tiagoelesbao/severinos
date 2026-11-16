# -*- coding: utf-8 -*-
"""Da materia crua a PAUTA — o que merece virar video, e por que.

O PROBLEMA QUE ESTE ARQUIVO RESOLVE
  A leitura crua devolve ~300 materias em 12 horas. A maioria nao vira video: o
  feed do ge.globo e de TODOS os esportes (volei, ciclismo, karate), e mesmo
  dentro do futebol a maior parte e escalacao, tabela e nota de rodape.

  Aqui as ~300 viram ~20 pautas ranqueadas, cada uma ja com o motivo pelo qual
  subiu. O ranque nao e opiniao: e soma de sinais medidos.

OS SINAIS, E POR QUE CADA UM
  clube grande   audiencia de futebol nao e distribuida — Flamengo e Corinthians
                 movem ordens de grandeza mais busca que a media da serie A
  polemica       o nicho paga por tensao; nota de escalacao nao rende video
  mercado        contratacao e o insumo mais previsivel do plantao diario
  eco            a mesma materia em varios veiculos = assunto ja em circulacao
  frescor        pauta de futebol azeda rapido; 6 h ja e velho
  peso da fonte  veiculo grande da credibilidade ao claim

O QUE ELE NAO FAZ
  Nao escreve titulo. A pauta sai daqui com o FATO estruturado — sujeito, acao,
  consequencia — que e exatamente a entrada de `apps/regra-de-3`. Quem embala e o
  estagio `packaging`, e ele so pode prometer o que a pauta sustenta.
"""
import json
import os
import re
import sys
import time
import unicodedata

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import fonte_rss

# ─────────────────────────────────────────────────────────────────────────────
# CLUBES — o peso e de AUDIENCIA, nao de tabela.
#   Um vice-campeao com torcida pequena rende menos video que um time no meio da
#   tabela com dez milhoes de torcedores. O ranque aqui e de busca, nao de titulo.
# ─────────────────────────────────────────────────────────────────────────────
CLUBES = {
    "flamengo": 1.00, "corinthians": 1.00, "palmeiras": 0.95, "sao paulo": 0.90,
    "vasco": 0.90, "cruzeiro": 0.85, "gremio": 0.80, "internacional": 0.80,
    "santos": 0.85, "atletico-mg": 0.75, "atletico mineiro": 0.75, "galo": 0.75,
    "fluminense": 0.75, "botafogo": 0.75, "bahia": 0.65, "sport": 0.60,
    "vitoria": 0.55, "fortaleza": 0.55, "ceara": 0.55, "athletico": 0.55,
    "bragantino": 0.45, "juventude": 0.40, "mirassol": 0.40, "goias": 0.45,
    "cruz maltino": 0.90, "verdao": 0.95, "timao": 1.00, "mengao": 1.00,
    "selecao brasileira": 0.85, "neymar": 0.95, "vini jr": 0.80,
}

# ─────────────────────────────────────────────────────────────────────────────
# GATILHOS — o que faz uma materia virar video
# ─────────────────────────────────────────────────────────────────────────────
POLEMICA = [
    "polemica", "expulso", "expulsao", "confusao", "briga", "barraco", "treta",
    "cobra", "detona", "critica", "revolta", "vaia", "vaiado", "processo",
    "denuncia", "vazou", "vazado", "bastidores", "crise", "demitido", "demissao",
    "pressao", "ultimato", "surto", "desabafo", "desabafa", "cutuca", "alfineta",
    "arbitragem", "var ", "penalti", "erro de arbitragem", "roubo", "escandalo",
    "punicao", "punido", "suspenso", "stjd", "tribunal", "julgamento", "acusa",
    "rompimento", "climao", "insatisfeito", "reclamou", "explodiu", "ironiza",
    "provocacao", "xingou", "discussao", "atrito", "manda recado",
    "quebra o silencio", "detonou", "rebate", "responde a", "nao aceita",
]
# Gatilhos fracos: contam, mas valem menos. `bastidores` aparece no resumo de
# metade das materias e sozinho nao indica tensao nenhuma.
POLEMICA_FRACA = ["bastidores", "briga", "provoca", "acusa", "alvo de", "pressao"]
MERCADO = [
    "acerta", "acertado", "fechado", "contrata", "contratacao", "reforco",
    "proposta", "negocia", "negociacao", "assina", "assinou", "renova",
    "renovacao", "milhoes", "transferencia", "sondagem", "interesse",
    "encaminhado", "anuncia", "oficializa", "rescisao", "acordo",
    "emprestimo", "salario", "multa rescisoria", "bid", "medicos",
]
# Ruido: outros esportes e materia de servico que nunca vira video de canal.
RUIDO = [
    "volei", "basquete", "ciclismo", "karate", "natacao", "atletismo", "judo",
    "surfe", "handebol", "futsal feminino", "formula 1", "automobilismo", "nba",
    "nfl", "tenis", "ginastica", "skate", "mma", "ufc", "paralimpic",
    "escalacao:", "escalacao do", "onde assistir", "provaveis escalacoes",
    "veja os destaques", "videos:", "globo esporte", "confira a tabela",
    "ao vivo - globoesporte", "- ao vivo", "assembleia", "seletiva",
    "campeonato feminino", "sub-17", "sub-20", "serie c", "serie d",
]
FUTEBOL = [
    "futebol", "gol", "jogador", "tecnico", "clube", "time", "torcida",
    "brasileirao", "libertadores", "copa do brasil", "sul-americana",
    "elenco", "zagueiro", "atacante", "meia", "goleiro", "lateral", "volante",
    "treinador", "diretoria", "contrato", "estadio", "partida", "rodada",
]


def _norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _bate(txt, lista):
    t = " %s " % _norm(txt)
    # A borda de palavra importa: sem ela, "var " casa dentro de "varzea" e
    # "briga" dentro de "brigadeiro".
    return [p for p in lista if (" %s" % p) in t or t.startswith(p)]


def _forca(titulo, resumo, lista, fracos=()):
    """Quantos gatilhos distintos, ponderados por ONDE aparecem.

    O que o veiculo poe no TITULO e o que ele considera a noticia; o resumo e
    contexto. Gatilho no titulo vale 1, no resumo vale 0,5, e os da lista fraca
    valem metade disso — `bastidores` sozinho nao e tensao.
    """
    no_tit = set(_bate(titulo, lista))
    no_res = set(_bate(resumo, lista)) - no_tit
    peso = 0.0
    achados = []
    for p in no_tit:
        peso += 0.5 if p in fracos else 1.0
        achados.append(p)
    for p in no_res:
        peso += 0.25 if p in fracos else 0.5
        achados.append(p)
    return peso, achados


def _clube(titulo, resumo=""):
    """So o TITULO decide o clube da pauta.

    Materia sobre o Coritiba cita o Corinthians no corpo, e casar pelo corpo
    trocava o dono da pauta — o que muda a nota, porque o peso e de audiencia.
    """
    t = " %s " % _norm(titulo)
    achados = [(c, p) for c, p in CLUBES.items() if (" %s" % c) in t]
    if not achados:
        return None, 0.0
    c, p = max(achados, key=lambda x: x[1])
    return c, p


def avalia(item, agora=None):
    """Pontua uma matéria e explica a nota. Devolve None para o que é ruído."""
    agora = agora or time.time()
    txt = "%s %s" % (item.get("titulo", ""), item.get("resumo", ""))

    ruido = _bate(item.get("titulo", ""), RUIDO)
    if ruido:
        return None
    if not _bate(txt, FUTEBOL) and not _clube(item.get("titulo", ""))[0]:
        return None

    titulo, resumo = item.get("titulo", ""), item.get("resumo", "")
    clube, peso_clube = _clube(titulo, resumo)
    f_pol, pol = _forca(titulo, resumo, POLEMICA, POLEMICA_FRACA)
    f_mer, mer = _forca(titulo, resumo, MERCADO)
    # Sinal fraco isolado (só "bastidores" no resumo) não sustenta uma pauta.
    if f_pol + f_mer < 1.0:
        return None

    # frescor: 1.0 até 3h, decaindo até 0 em 24h
    if item.get("quando"):
        h = max(0.0, (agora - item["quando"]) / 3600.0)
        frescor = 1.0 if h <= 3 else max(0.0, 1.0 - (h - 3) / 21.0)
    else:
        frescor = 0.5          # sem data: nem premia nem descarta

    eco = min(1.0, len(item.get("tambem_em") or []) / 3.0)

    # Cada bloco tem teto: uma matéria com seis gatilhos de mercado não vale
    # o dobro de uma com três — a partir de certo ponto o sinal satura.
    nota = (
        30 * peso_clube +
        26 * min(1.0, f_pol / 2.5) +
        18 * min(1.0, f_mer / 2.0) +
        16 * frescor +
        5 * eco +
        5 * item.get("peso_fonte", 0.5)
    )
    return {
        "nota": round(nota),
        "clube": clube,
        # O tipo é de quem tem mais força, não de quem apareceu primeiro.
        "tipo": "polêmica" if f_pol >= f_mer else "mercado",
        "forca": (round(f_pol, 1), round(f_mer, 1)),
        "gatilhos": (pol + mer)[:4],
        "frescor": round(frescor, 2),
        "eco": len(item.get("tambem_em") or []),
        "item": item,
    }


def _fato(av):
    """Esqueleto do fato para `apps/regra-de-3`. Os campos vazios são o trabalho
    humano que sobra — e deixá-los explicitamente vazios é melhor que preenchê-los
    com adivinhação, porque o packaging só pode prometer o que a fonte sustenta."""
    it = av["item"]
    return {
        "nicho": "futebol",
        "sujeito": (av["clube"] or "").title() or "",
        "acao": "",
        "acao_curta": "",
        "alvo": "",
        "alvo_reage": True,
        "consequencia": "",
        "verificado": [],
        "_origem": {
            "titulo_original": it["titulo"],
            "fonte": it["fonte"],
            "link": it["link"],
            "tambem_em": it.get("tambem_em") or [],
            "imagem": it.get("imagem", ""),
            "resumo": it.get("resumo", "")[:300],
        },
    }


def pautas(horas=12, minimo=45, quantas=20):
    itens, falhas = fonte_rss.le_todas(horas=horas)
    agora = time.time()
    avaliadas = [a for a in (avalia(i, agora) for i in itens) if a]
    avaliadas = [a for a in avaliadas if a["nota"] >= minimo]
    avaliadas.sort(key=lambda a: -a["nota"])
    return avaliadas[:quantas], falhas, len(itens)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--horas", type=int, default=12)
    ap.add_argument("--minimo", type=int, default=45)
    ap.add_argument("--quantas", type=int, default=20)
    ap.add_argument("--salvar", help="grava as pautas em JSON")
    a = ap.parse_args()

    t0 = time.time()
    ps, falhas, brutas = pautas(a.horas, a.minimo, a.quantas)
    print("%d matérias lidas → %d pautas · %.1fs\n" % (brutas, len(ps), time.time() - t0))
    print("%-4s %-9s %-12s %-9s %-4s %s" % ("NOTA", "TIPO", "CLUBE", "FORÇA p/m", "ECO", "MATÉRIA"))
    print("─" * 112)
    for p in ps:
        it = p["item"]
        print("%-4d %-9s %-12s %-9s %-4s %s" % (
            p["nota"], p["tipo"], (p["clube"] or "—")[:12],
            "%.1f/%.1f" % p["forca"], p["eco"] or "", it["titulo"][:58]))
        print("     %-9s %s" % ("", " · ".join(p["gatilhos"][:4]) or "—"))
    if falhas:
        print("\nfontes fora do ar: %s" % ", ".join(n for n, _ in falhas))
    if a.salvar:
        with open(a.salvar, "w", encoding="utf-8") as f:
            json.dump([_fato(p) | {"_nota": p["nota"], "_tipo": p["tipo"]}
                       for p in ps], f, ensure_ascii=False, indent=1)
        print("\n%d fatos em %s" % (len(ps), a.salvar))
