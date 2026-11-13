# -*- coding: utf-8 -*-
"""De onde vem a imagem da thumb — quatro rotas, em ordem de preferencia.

O PROBLEMA
  Uma thumb de futebol precisa de um rosto, um escudo ou uma cena. Quem monta a
  thumb nao pode ficar procurando imagem no Google: alem de lento, e a rota que
  traz foto de agencia e vira reclamacao de copyright — que no YouTube e mais
  rapida e mais cara que strike de conteudo.

AS QUATRO ROTAS, EM ORDEM
  1. escudo do clube      ESPN, gratuito, 500x500, SEMPRE existe
  2. camisa numerada      ESPN stitcher, gerada sob demanda, SEMPRE existe
  3. retrato do atleta    ESPN headshots — existe para ~6% do elenco
  4. foto da materia      a que o proprio portal publicou no RSS

  As tres primeiras sao da ESPN e vem com a mesma licenca dos dados que a live
  ja usa. A quarta e a unica com ressalva de direito, e por isso ela sai
  MARCADA: quem monta a thumb ve o aviso antes de usar.

O QUE ESTE ARQUIVO NAO FAZ
  Nao decide qual usar. Ele entrega as opcoes com origem e ressalva declaradas;
  a escolha e do `packaging`, que sabe o que a pauta pede.
"""
import json
import os
import re
import sys
import unicodedata
import urllib.request

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
CDN = "https://a.espncdn.com/i"
STITCHER = "https://stitcher.espn.com/sports/soccer/leagues"
AGENTE = "Mozilla/5.0"
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "_imagens")


def _norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _busca(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


def existe(url, timeout=10):
    """HEAD real. Uma URL que responde 404 e pior que URL nenhuma: ela vira
    imagem quebrada na thumb, e ninguem confere thumb antes de publicar."""
    try:
        req = urllib.request.Request(url, method="HEAD",
                                     headers={"User-Agent": AGENTE})
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return r.status == 200
    except Exception:
        return False


# ─────────────────────────────────────────────────────────────────────────────
# ROTA 1 — escudo do clube
# ─────────────────────────────────────────────────────────────────────────────
_CACHE_TIMES = {}


def times_da_liga(liga="bra.1"):
    """{nome normalizado: (id, nome, escudo)} — uma chamada por liga, cacheada."""
    if liga in _CACHE_TIMES:
        return _CACHE_TIMES[liga]
    mapa = {}
    try:
        d = _busca("%s/%s/teams" % (BASE, liga))
    except Exception:
        _CACHE_TIMES[liga] = mapa
        return mapa
    for grupo in ((d.get("sports") or [{}])[0].get("leagues") or [{}])[0].get("teams", []):
        t = grupo.get("team") or {}
        tid, nome = t.get("id"), t.get("displayName") or ""
        if not tid:
            continue
        logos = t.get("logos") or []
        escudo = logos[0].get("href") if logos else "%s/teamlogos/soccer/500/%s.png" % (CDN, tid)
        for chave in {nome, t.get("shortDisplayName") or "", t.get("abbreviation") or "",
                      t.get("nickname") or ""}:
            if chave:
                mapa[_norm(chave)] = (tid, nome, escudo)
    _CACHE_TIMES[liga] = mapa
    return mapa


def escudo(nome_time, ligas=("bra.1", "bra.2")):
    """URL do escudo, ou None. Casa por nome, apelido e sigla."""
    alvo = _norm(nome_time)
    for liga in ligas:
        mapa = times_da_liga(liga)
        if alvo in mapa:
            return mapa[alvo][2]
        # casamento parcial: "Palmeiras" dentro de "SE Palmeiras"
        for chave, (tid, nome, url) in mapa.items():
            if alvo and (alvo in chave or chave in alvo) and len(chave) > 3:
                return url
    return None


# ─────────────────────────────────────────────────────────────────────────────
# ROTAS 2 e 3 — camisa e retrato do atleta
# ─────────────────────────────────────────────────────────────────────────────
def atleta_no_jogo(nome, liga, jogo_id):
    """id do atleta dentro de uma partida, pelo nome. Sem o jogo nao ha camisa:
    o `stitcher` monta a camisa NAQUELE jogo, com o numero daquela partida."""
    try:
        d = _busca("%s/%s/summary?event=%s" % (BASE, liga, jogo_id))
    except Exception:
        return None
    alvo = _norm(nome)
    for r in (d.get("rosters") or []):
        for p in (r.get("roster") or []):
            a = p.get("athlete") or {}
            for chave in (a.get("displayName"), a.get("shortName"), a.get("fullName")):
                if chave and (alvo in _norm(chave) or _norm(chave) in alvo):
                    return a.get("id")
    return None


def camisa(atleta_id, liga, jogo_id, escuro=True):
    return ("%s/%s/events/%s/athletes/%s/jersey.png?darkMode=%s"
            % (STITCHER, liga, jogo_id, atleta_id, str(escuro).lower()))


def retrato(atleta_id):
    return "%s/headshots/soccer/players/full/%s.png" % (CDN, atleta_id)


# ─────────────────────────────────────────────────────────────────────────────
# ROTA 4 — a foto que o proprio portal publicou
# ─────────────────────────────────────────────────────────────────────────────
def _limpa_url_materia(u):
    """Portais servem a foto por um redimensionador com a URL original embutida.
    Extrair a original rende resolucao maior — a versao do feed costuma ter
    300px de largura, que numa thumb de 1280 vira borrao."""
    if not u:
        return u
    m = re.search(r"(https?://[^\s\"']+\.(?:jpg|jpeg|png|webp))", u[u.find("http", 5):] or "")
    return m.group(1) if m else u


def da_materia(item):
    """A imagem que veio no RSS, com a ressalva de direito declarada."""
    u = _limpa_url_materia(item.get("imagem") or "")
    if not u:
        return None
    return {
        "url": u,
        "origem": item.get("fonte") or "portal",
        "rota": "materia",
        "licenca": "RESSALVA",
        "aviso": ("Foto publicada por %s. RSS não dá direito de uso — a maioria "
                  "é licenciada de agência. Use só se você confirmar a licença, "
                  "ou prefira escudo/camisa." % (item.get("fonte") or "portal")),
    }


# ─────────────────────────────────────────────────────────────────────────────
# A CASCATA
# ─────────────────────────────────────────────────────────────────────────────
def opcoes(fato, item_rss=None, liga=None, jogo_id=None, checar=True):
    """Todas as imagens utilizáveis para esta pauta, da mais segura à mais
    arriscada. Cada uma declara rota, licença e o que ela mostra."""
    saida = []

    # 1. escudo dos clubes citados
    for campo in ("sujeito", "alvo"):
        nome = (fato.get(campo) or "").strip()
        if not nome:
            continue
        u = escudo(nome)
        if u and (not checar or existe(u)):
            saida.append({"url": u, "rota": "escudo", "licenca": "ESPN",
                          "mostra": nome, "campo": campo,
                          "aviso": None})

    # 2 e 3. atleta, quando a pauta tem jogo
    nomes = re.findall(r"\b[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+(?:\s+[A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]+)?",
                       "%s %s" % (fato.get("acao", ""), fato.get("consequencia", "")))
    if liga and jogo_id:
        for nome in dict.fromkeys(nomes):
            aid = atleta_no_jogo(nome, liga, jogo_id)
            if not aid:
                continue
            r = retrato(aid)
            if not checar or existe(r):
                saida.append({"url": r, "rota": "retrato", "licenca": "ESPN",
                              "mostra": nome, "aviso": None})
            c = camisa(aid, liga, jogo_id)
            if not checar or existe(c):
                saida.append({"url": c, "rota": "camisa", "licenca": "ESPN",
                              "mostra": "%s (camisa numerada)" % nome, "aviso": None})

    # 4. foto da materia, sempre por ultimo e sempre marcada
    if item_rss:
        f = da_materia(item_rss)
        if f and (not checar or existe(f["url"])):
            f["mostra"] = "foto da matéria"
            saida.append(f)

    return saida


def baixa(url, destino):
    os.makedirs(os.path.dirname(destino), exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    with urllib.request.urlopen(req, timeout=30) as r:
        dados = r.read()
    with open(destino, "wb") as f:
        f.write(dados)
    return destino if len(dados) > 500 else None


if __name__ == "__main__":
    fato = {"sujeito": "o STJD", "alvo": "o Palmeiras",
            "acao": "puniu Abel Ferreira com dois jogos",
            "consequencia": "desfalca contra o Botafogo"}
    print("PAUTA: %s %s\n" % (fato["sujeito"], fato["acao"]))
    print("%-9s %-9s %-34s %s" % ("ROTA", "LICENÇA", "MOSTRA", "URL"))
    print("─" * 112)
    for o in opcoes(fato):
        print("%-9s %-9s %-34s %s" % (o["rota"], o["licenca"], o["mostra"][:34],
                                      o["url"][:52]))
        if o.get("aviso"):
            print("          ⚠ %s" % o["aviso"][:96])
