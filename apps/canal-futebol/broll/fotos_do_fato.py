# -*- coding: utf-8 -*-
"""Coleta as fotos que os portais publicaram sobre o assunto do episodio.

POR QUE ESTA ROTA EXISTE
  O acervo generico (Pexels) da movimento, mas nao da o FATO. Torcida qualquer
  ilustra "torcida"; ela nao mostra o Abel, nem o julgamento, nem o jogo de
  domingo. Um plantao sem a imagem do assunto e um podcast com fundo bonito.

  As fotos do assunto ja existem e ja estao publicas: sao as que os proprios
  portais serviram no RSS junto da materia que virou pauta.

A RESSALVA, DECLARADA E NAO ESCONDIDA
  Foto de portal quase sempre e de agencia (Getty, AFP, Staff do clube). O uso
  editorial em video de comentario e a pratica de todo canal do genero, mas ele
  NAO e livre como o Pexels — e a diferenca precisa estar escrita, nao lembrada.
  Por isso cada foto entra no indice com `licenca: editorial` e com o veiculo e
  a URL da materia. Se um dia chegar reclamacao, a resposta esta no arquivo.

  Consequencia pratica na montagem: foto editorial entra como PLANO DE APOIO,
  curto, e nunca como fundo da thumb ou da abertura — que sao os dois lugares
  onde o YouTube olha primeiro.

COMO ELA ESCOLHE
  O RSS e lido pela mesma fonte da pauta. Uma materia entra se o TITULO dela
  casa com um dos termos do episodio — casar pelo resumo traz materia sobre
  outro assunto que so cita o nome de passagem.

USO
  python -X utf8 broll/fotos_do_fato.py 2026-09-04-abel-stjd
"""
import argparse
import io
import json
import os
import re
import sys
import unicodedata
import urllib.request

AQUI = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(AQUI)
sys.path.insert(0, APP)
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(APP)),
                                "apps", "pauta-futebol"))
from narra_comfy import CANAL  # noqa: E402

CAB = {"User-Agent": "Mozilla/5.0"}

# Os termos do episodio. Casam contra o TITULO da materia, com limite de palavra.
TERMOS = {
    "2026-09-04-abel-stjd": ["abel ferreira", "abel", "palmeiras", "stjd",
                             "botafogo", "barboza", "arthur"],
    # Arbitragem de Flu x Vasco. Os nomes vao dos mais especificos (protagonistas
    # do lance) para os mais gerais (clubes), porque o casamento e por substring:
    # "vasco" sozinho traria qualquer materia do clube na janela.
    "2026-09-06-arbitragem-flu-vasco": ["hulk", "davi de oliveira lacerda",
                                        "kevin serna", "serna", "adson",
                                        "lucho acosta", "canobbio", "soteldo",
                                        "guga", "paulo henrique",
                                        "fluminense", "vasco", "maracana"],
    # Briga pelo penalti no Cruzeiro. O episodio e de plantao: alem do eixo,
    # cobre Corinthians, Botafogo e Palmeiras. Os termos acompanham TODOS os
    # blocos -- foto so do eixo deixaria quatro blocos sem material, que foi o
    # buraco de 162 s medido em 06/09.
    "2026-09-07-penalti-cruzeiro": ["kaio jorge", "matheus pereira",
                                    "artur jorge", "joao marcelo", "fagner",
                                    "lucas romero", "mycael", "cruzeiro",
                                    "mineirao", "athletico",
                                    "fernando diniz", "memphis", "corinthians",
                                    "chapecoense",
                                    "arthur cabral", "ziyech", "botafogo",
                                    "abel ferreira", "barboza", "palmeiras"],
}


# ═══════════════════════════════════════════════════════════════════════════
# O TITULO CASA MAS A FOTO NAO E DO FATO
#
# Em 06/09 as 45 fotos baixadas tinham "Fluminense" ou "Vasco" no titulo -- e
# varias eram de MERCADO: "Santos anuncia Lima, ex-Fluminense" trouxe o Lima com
# a camisa do Santos; "Vasco negocia com ex-Flamengo" trouxe o jogador de
# Flamengo. Elas entraram no video como b-roll do classico.
#
# O casamento por nome de clube e largo demais. Materia de MERCADO fala do clube
# mas mostra outro contexto -- e e a FOTO que vai ao ar, nao o titulo.
MERCADO = ("anuncia", "negocia", "negociacao", "contrata", "contratacao",
           "reforco", "sonda", "sondagem", "acerta com", "assina",
           "onde assistir", "escalacao provavel", "provavel escalacao",
           "veja os relacionados", "desfalques para")


def e_do_fato(titulo):
    """A materia fala do JOGO, ou so cita o clube de passagem?

    Nao basta o nome do clube: materia de mercado o cita e mostra outra coisa.
    Aqui exige-se sinal do proprio jogo -- o confronto, um protagonista, ou um
    elemento do fato -- e veta-se o vocabulario de mercado.
    """
    t = _norm(titulo)
    if any(k in t for k in MERCADO):
        return False
    return True


def _norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _limpa(u):
    """Portais servem a foto por um redimensionador com a URL original embutida.

    `https://s2-ge.glbimg.com/AbC.../https://i.s3.glbimg.com/.../foto.jpg`
    A parte util e a ULTIMA URL absoluta da string — pegar a primeira devolve o
    redimensionador, que responde numa resolucao pequena e com marca.
    """
    if not u:
        return ""
    achados = re.findall(r"https?://[^\s\"']+", u)
    return achados[-1] if achados else u


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--horas", type=int, default=96)
    ap.add_argument("--min-kb", type=int, default=40,
                    help="abaixo disso é ícone ou selo, não foto")
    a = ap.parse_args()

    termos = TERMOS.get(a.slug)
    if not termos:
        print("sem termos escritos para %s — escreva em TERMOS antes" % a.slug)
        return 1

    from fonte_rss import le_todas
    # `le_todas` devolve (itens, falhas). A segunda posição importa: acervo
    # pequeno pode ser assunto sem cobertura ou portal fora do ar, e as duas
    # coisas pedem reação diferente.
    itens, falhas = le_todas(horas=a.horas)
    print("%d matérias no RSS nas últimas %dh" % (len(itens), a.horas))
    if falhas:
        print("fontes fora do ar: %s" % ", ".join(n for n, _ in falhas))
    print()

    saida = os.path.join(CANAL, "episodios", a.slug, "04-takes", "fotos")
    os.makedirs(saida, exist_ok=True)

    print("%-52s %8s  %s" % ("MATÉRIA", "TAMANHO", "ARQUIVO"))
    print("─" * 78)
    fotos, vistas, i = [], set(), 0
    for it in itens:
        titulo = it.get("titulo") or ""
        alvo = _norm(titulo)
        casa = [t for t in termos if re.search(r"\b%s\b" % re.escape(_norm(t)), alvo)]
        if not casa:
            continue
        u = _limpa(it.get("imagem") or "")
        if not u or u in vistas:
            continue
        vistas.add(u)
        i += 1
        nome = "f%02d-%s.jpg" % (i, _norm(casa[0]).replace(" ", ""))
        destino = os.path.join(saida, nome)
        try:
            r = urllib.request.Request(u, headers=CAB)
            with urllib.request.urlopen(r, timeout=40) as f:
                dados = f.read()
        except Exception as e:
            print("%-52s  falhou: %s" % (titulo[:52], e))
            i -= 1
            continue
        # Selo, ícone e pixel de rastreio passam pelo filtro de URL mas não são
        # foto. O tamanho é o teste barato que os separa.
        if len(dados) < a.min_kb * 1024:
            print("%-52s %7.0fKB  descartada (pequena demais)"
                  % (titulo[:52], len(dados) / 1024))
            i -= 1
            continue
        io.open(destino, "wb").write(dados)
        print("%-52s %7.0fKB  %s" % (titulo[:52], len(dados) / 1024, nome))
        fotos.append({
            "arquivo": nome, "titulo": titulo, "termo": casa[0],
            "veiculo": it.get("fonte", ""), "materia": it.get("link", ""),
            "imagem": u, "origem": "foto publicada pelo portal no RSS",
            "licenca": "editorial — provável agência; NÃO usar em thumb nem abertura",
        })

    if fotos:
        with open(os.path.join(saida, "fotos.json"), "w", encoding="utf-8") as f:
            json.dump(fotos, f, ensure_ascii=False, indent=2)
    print("─" * 78)
    print("%d fotos do fato · %s" % (len(fotos), saida))
    return 0


if __name__ == "__main__":
    sys.exit(main())
