# -*- coding: utf-8 -*-
"""Leitor de RSS de futebol — a frente que traz o que a API nao sabe.

O QUE A API NAO SABE
  A ESPN entrega o factual: gol, cartao, minuto, escalacao. Ela nao entrega o que
  o tecnico falou na coletiva, o lance de arbitragem que virou caso, a negociacao
  que vazou, a treta de vestiario. Isso mora em blog e portal — e e justamente
  onde a polemica esta.

  Por isso sao duas frentes e nao uma: a API rende pauta de JOGO, o RSS rende
  pauta de TUDO O MAIS. As duas alimentam o mesmo estagio de packaging.

AS FONTES FORAM MEDIDAS, NAO ESCOLHIDAS POR REPUTACAO
  Vinte candidatos testados; nove responderam. O que decide nao e o nome do
  veiculo: e se o feed abre, quantos itens traz e quao fresco esta o mais recente.
  Feed que atualiza uma vez por dia nao serve para pauta de pos-jogo.

    ge.globo (pox)   100 itens   o maior do pais — e so responde no host `pox`
    Jogada10         100 itens   o mais fresco de todos
    Gazeta Esportiva  50 itens
    Placar            20 itens
    Metropoles        20 itens
    Trivela           20 itens
    Torcedores.com    20 itens
    Terra Esportes    10 itens
    Coluna do Fla     10 itens   clube-especifico (Flamengo)

  Ficaram de fora por nao responderem: Lance (410), NetVasco, Meu Timao, CNN
  (404), SPFC.net (403), Verdao Web (timeout), ESPN BR (corpo vazio).

FEED QUEBRADO E O NORMAL, NAO O EXCEPCIONAL
  UOL e Bolavip declaram um encoding e mandam outro, e o parser de XML recusa. Um
  feed grande quebrado ainda vale mais que um pequeno correto, entao o leitor tem
  duas rotas: XML de verdade e, se falhar, extracao por regex. Nenhuma fonte
  derruba a rodada — a que falha e reportada e a leitura segue.
"""
import html
import re
import sys
import time
import unicodedata
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AGENTE = ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
          "(KHTML, like Gecko) Chrome/126.0 Safari/537.36")

# `peso` entra na nota da pauta: veiculo grande da mais credibilidade ao claim e
# mais chance de o assunto ja estar sendo buscado.
FONTES = [
    {"id": "ge",         "nome": "ge.globo",         "peso": 1.00,
     "url": "https://pox.globo.com/rss/ge"},
    {"id": "jogada10",   "nome": "Jogada10",         "peso": 0.85,
     "url": "https://jogada10.com.br/feed/"},
    {"id": "gazeta",     "nome": "Gazeta Esportiva", "peso": 0.85,
     "url": "https://www.gazetaesportiva.com/feed/"},
    {"id": "placar",     "nome": "Placar",           "peso": 0.80,
     "url": "https://placar.abril.com.br/feed/"},
    {"id": "metropoles", "nome": "Metrópoles",       "peso": 0.75,
     "url": "https://www.metropoles.com/esportes/feed"},
    {"id": "trivela",    "nome": "Trivela",          "peso": 0.70,
     "url": "https://trivela.com.br/feed/"},
    {"id": "torcedores", "nome": "Torcedores.com",   "peso": 0.70,
     "url": "https://www.torcedores.com/feed"},
    {"id": "terra",      "nome": "Terra Esportes",   "peso": 0.70,
     "url": "https://www.terra.com.br/esportes/rss.xml"},
    {"id": "uol",        "nome": "UOL Esporte",      "peso": 0.90,
     "url": "https://rss.uol.com.br/feed/esporte.xml"},
    {"id": "colunadofla", "nome": "Coluna do Fla",   "peso": 0.55,
     "url": "https://colunadofla.com/feed/", "clube": "Flamengo"},
]


def _norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


def _baixa(url, timeout=15):
    req = urllib.request.Request(url, headers={
        "User-Agent": AGENTE,
        "Accept": "application/rss+xml, application/xml, text/xml, */*",
        "Accept-Language": "pt-BR,pt;q=0.9",
        "Referer": "https://www.google.com/"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        bruto = r.read()
        tipo = r.headers.get("Content-Type", "")
    # O charset do cabecalho ganha do declarado no XML: o UOL declara utf-8 e
    # manda latin-1, e acreditar na declaracao produz texto ilegivel.
    m = re.search(r"charset=([\w-]+)", tipo, re.I)
    enc = (m.group(1) if m else None)
    return bruto, enc


def _texto(el, *tags):
    for t in tags:
        n = el.find(t)
        if n is not None and (n.text or "").strip():
            return html.unescape(n.text.strip())
    return ""


def _quando(txt):
    """Segundos desde a epoca, ou None.

    ARMADILHA DO FUSO: varios feeds publicam pubDate sem fuso, e
    `datetime.timestamp()` trata data naive como hora LOCAL. Rodando em BRT
    (UTC-3) isso empurrava toda materia 3 h para o futuro — a lista saia com
    idade negativa. A convencao de RSS para data sem fuso e UTC, entao e isso
    que assumimos, explicitamente.
    """
    if not txt:
        return None
    try:
        d = parsedate_to_datetime(txt)
        if d.tzinfo is None:
            d = d.replace(tzinfo=timezone.utc)
        return d.timestamp()
    except Exception:
        pass
    for f in ("%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            d = datetime.strptime(txt[:len(time.strftime(f))], f)
            return d.replace(tzinfo=timezone.utc).timestamp()
        except Exception:
            continue
    return None


def _imagem(el, bruto_item=""):
    for tag in ("{http://search.yahoo.com/mrss/}content",
                "{http://search.yahoo.com/mrss/}thumbnail", "enclosure"):
        n = el.find(tag)
        if n is not None:
            u = n.get("url")
            if u:
                return u
    m = re.search(r'<img[^>]+src="([^"]+)"', bruto_item)
    return m.group(1) if m else ""


def _le_xml(bruto, enc):
    raiz = ET.fromstring(bruto)
    itens = raiz.findall(".//item") or raiz.findall(
        ".//{http://www.w3.org/2005/Atom}entry")
    saida = []
    for it in itens:
        corpo = _texto(it, "description", "{http://www.w3.org/2005/Atom}summary",
                       "{http://purl.org/rss/1.0/modules/content/}encoded")
        link = _texto(it, "link", "guid")
        if not link:
            n = it.find("{http://www.w3.org/2005/Atom}link")
            link = n.get("href") if n is not None else ""
        saida.append({
            "titulo": _texto(it, "title", "{http://www.w3.org/2005/Atom}title"),
            "link": link,
            "resumo": re.sub(r"<[^>]+>", " ", corpo)[:400].strip(),
            "quando": _quando(_texto(it, "pubDate", "published",
                                     "{http://www.w3.org/2005/Atom}published",
                                     "{http://purl.org/dc/elements/1.1/}date")),
            "imagem": _imagem(it, corpo),
        })
    return saida


def _le_regex(bruto, enc):
    """Rota de emergencia para feed com XML invalido."""
    txt = bruto.decode(enc or "utf-8", "replace")
    if "Ã" not in txt and "�" in txt:
        txt = bruto.decode("latin-1", "replace")
    blocos = re.findall(r"<item[^>]*>(.*?)</item>", txt, re.S | re.I)
    saida = []
    for b in blocos:
        def pega(tag):
            m = re.search(r"<%s[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?</%s>"
                          % (tag, tag), b, re.S | re.I)
            return html.unescape(m.group(1).strip()) if m else ""
        saida.append({
            "titulo": pega("title"),
            "link": pega("link") or pega("guid"),
            "resumo": re.sub(r"<[^>]+>", " ", pega("description"))[:400].strip(),
            "quando": _quando(pega("pubDate")),
            "imagem": (re.search(r'url="([^"]+)"', b) or [None, ""])[1]
            if re.search(r'url="([^"]+)"', b) else "",
        })
    return saida


def le_fonte(fonte, timeout=15):
    """(itens, erro). Nunca levanta: uma fonte fora do ar nao pode parar a rodada."""
    try:
        bruto, enc = _baixa(fonte["url"], timeout)
    except Exception as e:
        return [], "não abriu: %s" % str(e)[:60]
    itens = []
    try:
        itens = _le_xml(bruto, enc)
    except ET.ParseError:
        try:
            itens = _le_regex(bruto, enc)
        except Exception as e:
            return [], "XML inválido e regex falhou: %s" % str(e)[:50]
    except Exception as e:
        return [], str(e)[:60]
    for i in itens:
        i["fonte"] = fonte["nome"]
        i["fonte_id"] = fonte["id"]
        i["peso_fonte"] = fonte.get("peso", 0.5)
    return [i for i in itens if i.get("titulo")], None


def le_todas(fontes=None, horas=24, workers=8):
    """Tudo o que saiu nas ultimas `horas`, de todas as fontes, sem repetido."""
    import concurrent.futures as cf
    fontes = fontes or FONTES
    tudo, falhas = [], []
    with cf.ThreadPoolExecutor(workers) as ex:
        for fonte, (itens, erro) in zip(fontes, ex.map(le_fonte, fontes)):
            if erro:
                falhas.append((fonte["nome"], erro))
                continue
            tudo.extend(itens)

    corte = time.time() - horas * 3600
    recentes = [i for i in tudo
                # item sem data entra: melhor uma pauta a mais para triar do que
                # perder a materia porque o veiculo esqueceu o pubDate
                if i.get("quando") is None or i["quando"] >= corte]

    # A mesma noticia sai em cinco portais. Dedup pelo TITULO normalizado sem
    # palavras curtas — o mesmo fato costuma variar so nos conectivos.
    vistos, unicos = {}, []
    for i in sorted(recentes, key=lambda x: -(x.get("peso_fonte") or 0)):
        chave = " ".join(sorted(w for w in re.findall(r"\w{5,}", _norm(i["titulo"]))))[:120]
        if chave in vistos:
            vistos[chave]["tambem_em"].append(i["fonte"])
            continue
        i["tambem_em"] = []
        vistos[chave] = i
        unicos.append(i)
    return unicos, falhas


if __name__ == "__main__":
    horas = int(sys.argv[1]) if len(sys.argv) > 1 else 12
    t0 = time.time()
    itens, falhas = le_todas(horas=horas)
    print("%d matérias únicas nas últimas %dh · %.1fs\n" % (len(itens), horas, time.time() - t0))
    for i in itens[:25]:
        idade = ("%.1fh" % ((time.time() - i["quando"]) / 3600)) if i.get("quando") else "—"
        eco = ("  +%d veículos" % len(i["tambem_em"])) if i["tambem_em"] else ""
        print("  %-6s %-16s %s%s" % (idade, i["fonte"][:16], i["titulo"][:66], eco))
    if falhas:
        print("\nfontes fora do ar:")
        for nome, e in falhas:
            print("  %-18s %s" % (nome, e))
