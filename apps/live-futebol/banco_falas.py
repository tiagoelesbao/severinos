# -*- coding: utf-8 -*-
"""Banco de falas — o método dos videogames de futebol.

A IDEIA, E POR QUE ELA RESOLVE TUDO
  FIFA e eFootball não sintetizam narração em tempo real. Eles gravam centenas
  de frases antes e tocam a certa no momento certo. Duas consequências:

    latência = ZERO   o arquivo já existe; é só tocar
    qualidade = MÁXIMA  a geração é offline, então pode-se usar o motor mais
                        lento e melhor, ouvir o resultado e refazer o que saiu ruim

  Isso desmonta o dilema entre Piper (rápido, bom) e ChatterBox (lento, ótimo):
  com pack pré-gerado, o lento deixa de ser um problema.

O QUE É FIXO E O QUE É POR PARTIDA
  FIXO — gerado uma vez, serve para sempre:
    reações sem nome próprio, números (minutos, placares), interação com o chat
  POR PARTIDA — gerado nos minutos antes do jogo, com a escalação já conhecida:
    nomes dos 22 titulares, nomes dos dois clubes

  A escalação sai da API horas antes. O pack de uma partida são ~30 arquivos
  curtos: minutos de geração, feitos enquanto o jogo nem começou.

COMO A FALA É MONTADA
  Concatenando 2 ou 3 pedaços com um respiro curto entre eles:

      [Gooool do]  +  [Flamengo]  +  [Samuel Lino]

  Emenda de muitos pedaços soa robótica — por isso as frases carregam o máximo
  de contexto possível e os encaixes ficam nos nomes próprios, que é onde o
  ouvido aceita a junção porque ela existe também na fala humana.
"""

# ─────────────────────────────────────────────────────────────────────────────
# BLOCO FIXO — sem nome próprio. Gerado uma vez.
#   Cada entrada: (id, texto)
#   O `{}` NÃO aparece aqui: o que varia entra como arquivo separado.
# ─────────────────────────────────────────────────────────────────────────────

ABERTURAS_GOL = [
    ("gol-a", "Gooool!"),
    ("gol-b", "É gol!"),
    ("gol-c", "Balançou a rede!"),
    ("gol-d", "Tá lá!"),
    ("gol-e", "Gooooool, senhoras e senhores!"),
]

FECHOS_GOL = [
    ("golf-a", "Que golaço."),
    ("golf-b", "E o estádio veio abaixo."),
    ("golf-c", "Não deu chance para o goleiro."),
    ("golf-d", "Estava escrito."),
]

EMPATE = [
    ("emp-a", "Empatou o jogo!"),
    ("emp-b", "Tudo igual aqui!"),
]
VIRADA = [
    ("vir-a", "Virou o jogo!"),
    ("vir-b", "Que virada!"),
]
GOLEADA = [
    ("gld-a", "Mais um. Está goleando."),
    ("gld-b", "Não para de balançar a rede."),
]

AMARELO = [
    ("amr-a", "Cartão amarelo."),
    ("amr-b", "Amarelo para o jogador."),
    ("amr-c", "O árbitro adverte."),
]
VERMELHO = [
    ("vrm-a", "Vermelho! Expulso!"),
    ("vrm-b", "Cartão vermelho! Time com um a menos!"),
]
SUBSTITUICAO = [
    ("sub-a", "Mudança no time."),
    ("sub-b", "Substituição."),
    ("sub-c", "O treinador mexe."),
]
ESCANTEIO = [
    ("esc-a", "Escanteio!"),
    ("esc-b", "Na linha de fundo. Escanteio."),
]
PERIGO = [
    ("per-a", "Perigo! Quase!"),
    ("per-b", "Que chance!"),
    ("per-c", "Passou perto!"),
    ("per-d", "Uhh! Por pouco!"),
]
DEFESA = [
    ("def-a", "Que defesa!"),
    ("def-b", "Salvou o goleiro!"),
]

# ── engajamento: o que o formato de live pede ───────────────────────────────
CHAMADAS = [
    ("cta-a", "Se você está gostando, deixa o like e se inscreve no canal."),
    ("cta-b", "Comenta aqui quem você acha que vence essa."),
    ("cta-c", "Ativa o sininho pra não perder as próximas transmissões."),
    ("cta-d", "Manda aí no chat: qual o placar final?"),
    ("cta-e", "Compartilha a live com a galera que tá acompanhando."),
    ("cta-f", "Bem-vindo a quem está chegando agora. Fica com a gente."),
]

TEMPO = [
    ("tmp-inicio", "Bola rolando! Começa a partida!"),
    ("tmp-intervalo", "Fim do primeiro tempo."),
    ("tmp-volta", "Recomeça o jogo para o segundo tempo."),
    ("tmp-fim", "Fim de jogo!"),
    ("tmp-acrescimo", "Estamos nos acréscimos."),
]

LIGACOES = [
    ("lig-de", "do"),
    ("lig-aos", "aos"),
    ("lig-min", "minutos"),
    ("lig-para", "para"),
    ("lig-assist", "com assistência de"),
    ("lig-entra", "entra"),
    ("lig-sai", "sai"),
    ("lig-placar", "O placar é"),
    ("lig-a", "a"),
]

# Números falados: minutos de 1 a 95 e placares de 0 a 6. Cobrem qualquer
# partida sem gerar nada durante a live.
NUMEROS = {
    0: "zero", 1: "um", 2: "dois", 3: "três", 4: "quatro", 5: "cinco",
    6: "seis", 7: "sete", 8: "oito", 9: "nove", 10: "dez", 11: "onze",
    12: "doze", 13: "treze", 14: "catorze", 15: "quinze", 16: "dezesseis",
    17: "dezessete", 18: "dezoito", 19: "dezenove", 20: "vinte",
    30: "trinta", 40: "quarenta", 50: "cinquenta", 60: "sessenta",
    70: "setenta", 80: "oitenta", 90: "noventa",
}


def numero_falado(n):
    """1..99 por extenso. Sem biblioteca: o intervalo é pequeno e fechado."""
    n = int(n)
    if n in NUMEROS:
        return NUMEROS[n]
    dez, uni = (n // 10) * 10, n % 10
    if dez in NUMEROS and uni in NUMEROS:
        return "%s e %s" % (NUMEROS[dez], NUMEROS[uni])
    return str(n)


def bloco_fixo():
    """Todas as falas fixas do pack: [(id, texto)]."""
    itens = []
    for grupo in (ABERTURAS_GOL, FECHOS_GOL, EMPATE, VIRADA, GOLEADA, AMARELO,
                  VERMELHO, SUBSTITUICAO, ESCANTEIO, PERIGO, DEFESA,
                  CHAMADAS, TEMPO, LIGACOES):
        itens.extend(grupo)
    for n in range(1, 96):
        itens.append(("num-%d" % n, numero_falado(n)))
    return itens


def bloco_da_partida(dados):
    """Nomes próprios desta partida: clubes e os 22 titulares.

    Roda ANTES do jogo — a escalação sai na API com horas de antecedência.
    """
    itens = []
    for lado in ("casa", "fora"):
        t = dados.get(lado) or {}
        nome = (t.get("nome") or "").strip()
        if nome:
            itens.append(("time-%s" % _slug(nome), nome))
    esc = dados.get("escalacao") or {}
    for lado in ("casa", "fora"):
        e = esc.get(lado) or {}
        for j in (e.get("titulares") or []):
            n = (j.get("nome") or "").strip()
            if n:
                itens.append(("jog-%s" % _slug(n), n))
    vistos, unicos = set(), []
    for i, t in itens:
        if i not in vistos:
            vistos.add(i)
            unicos.append((i, t))
    return unicos


def _slug(txt):
    import unicodedata
    t = unicodedata.normalize("NFD", txt.lower())
    t = "".join(c for c in t if unicodedata.category(c) != "Mn")
    return "".join(c if c.isalnum() else "-" for c in t).strip("-")[:40]


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    fixo = bloco_fixo()
    print("BLOCO FIXO: %d falas" % len(fixo))
    print("  reações e chamadas: %d" % (len(fixo) - 95))
    print("  números 1..95:      95")
    print("\nexemplos:")
    for i, t in fixo[:6]:
        print("  %-14s %s" % (i, t))
    print("  ...")
    for i, t in fixo[-3:]:
        print("  %-14s %s" % (i, t))
    print("\nBLOCO POR PARTIDA: ~24 falas (2 clubes + 22 titulares)")
    print("gerado antes do jogo, quando a escalação já está na API")
