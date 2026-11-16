# -*- coding: utf-8 -*-
"""Levanta o calendario REAL das ligas — dias, horarios e volume.

Escrever um guia de dias de jogo de memoria produz um documento que parece certo
e erra nos detalhes que importam: o horario em Brasilia, quantos jogos ha por dia,
e quais ligas a nossa fonte de dados realmente cobre. Aqui cada linha do guia sai
de uma varredura de 21 dias do calendario da ESPN.

Duas perguntas por liga:
  1. a ESPN cobre? (se nao cobre, a liga nao entra no sistema, por melhor que seja)
  2. em que dias e horarios ela joga, em BRT?
"""
import concurrent.futures as cf
import json
import sys
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
BRT = timezone(timedelta(hours=-3))
DIAS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]

LIGAS = [
    # ── Brasil ────────────────────────────────────────────────────────────
    ("bra.1", "Brasileirão A", "Brasil"),
    ("bra.2", "Brasileirão B", "Brasil"),
    ("bra.copa_do_brasil", "Copa do Brasil", "Brasil"),
    ("bra.camp.carioca", "Carioca", "Brasil"),
    ("bra.camp.paulista", "Paulista", "Brasil"),
    # ── América do Sul ────────────────────────────────────────────────────
    ("conmebol.libertadores", "Libertadores", "Sul-América"),
    ("conmebol.sudamericana", "Sul-Americana", "Sul-América"),
    ("arg.1", "Argentina", "Sul-América"),
    ("col.1", "Colômbia", "Sul-América"),
    ("chi.1", "Chile", "Sul-América"),
    ("uru.1", "Uruguai", "Sul-América"),
    ("par.1", "Paraguai", "Sul-América"),
    ("per.1", "Peru", "Sul-América"),
    ("ecu.1", "Equador", "Sul-América"),
    ("bol.1", "Bolívia", "Sul-América"),
    ("ven.1", "Venezuela", "Sul-América"),
    # ── América do Norte ──────────────────────────────────────────────────
    ("usa.1", "MLS", "América do Norte"),
    ("mex.1", "Liga MX", "América do Norte"),
    ("usa.usl.1", "USL Championship", "América do Norte"),
    ("concacaf.champions_cup", "Concacaf Champions", "América do Norte"),
    # ── Europa: as grandes ────────────────────────────────────────────────
    ("eng.1", "Premier League", "Europa top"),
    ("esp.1", "LaLiga", "Europa top"),
    ("ita.1", "Serie A", "Europa top"),
    ("ger.1", "Bundesliga", "Europa top"),
    ("fra.1", "Ligue 1", "Europa top"),
    ("uefa.champions", "Champions League", "Europa top"),
    ("uefa.europa", "Europa League", "Europa top"),
    ("uefa.europa.conf", "Conference League", "Europa top"),
    # ── Europa: segunda linha (menos concorrência) ────────────────────────
    ("eng.2", "Championship (ING)", "Europa 2ª linha"),
    ("esp.2", "LaLiga 2", "Europa 2ª linha"),
    ("ita.2", "Serie B (ITA)", "Europa 2ª linha"),
    ("ger.2", "2. Bundesliga", "Europa 2ª linha"),
    ("fra.2", "Ligue 2", "Europa 2ª linha"),
    ("por.1", "Portugal", "Europa 2ª linha"),
    ("ned.1", "Eredivisie", "Europa 2ª linha"),
    ("bel.1", "Bélgica", "Europa 2ª linha"),
    ("tur.1", "Turquia", "Europa 2ª linha"),
    ("sco.1", "Escócia", "Europa 2ª linha"),
    ("gre.1", "Grécia", "Europa 2ª linha"),
    ("aut.1", "Áustria", "Europa 2ª linha"),
    ("sui.1", "Suíça", "Europa 2ª linha"),
    ("den.1", "Dinamarca", "Europa 2ª linha"),
    ("nor.1", "Noruega", "Europa 2ª linha"),
    ("swe.1", "Suécia", "Europa 2ª linha"),
    ("pol.1", "Polônia", "Europa 2ª linha"),
    ("cze.1", "Tchéquia", "Europa 2ª linha"),
    ("rou.1", "Romênia", "Europa 2ª linha"),
    ("rus.1", "Rússia", "Europa 2ª linha"),
    ("ukr.1", "Ucrânia", "Europa 2ª linha"),
    ("cro.1", "Croácia", "Europa 2ª linha"),
    ("srb.1", "Sérvia", "Europa 2ª linha"),
    # ── Ásia e Oceania: a madrugada brasileira ────────────────────────────
    ("jpn.1", "J-League", "Ásia/Oceania"),
    ("kor.1", "K-League", "Ásia/Oceania"),
    ("chn.1", "Super League (CHN)", "Ásia/Oceania"),
    ("aus.1", "A-League", "Ásia/Oceania"),
    ("ksa.1", "Saudi Pro League", "Ásia/Oceania"),
    ("uae.1", "Emirados", "Ásia/Oceania"),
    ("qat.1", "Catar", "Ásia/Oceania"),
    ("idn.1", "Indonésia", "Ásia/Oceania"),
    ("ind.1", "Índia (ISL)", "Ásia/Oceania"),
    ("afc.champions", "AFC Champions", "Ásia/Oceania"),
    # ── África ────────────────────────────────────────────────────────────
    ("rsa.1", "África do Sul", "África"),
    ("egy.1", "Egito", "África"),
    ("mar.1", "Marrocos", "África"),
]


def varre(par):
    codigo, nome, regiao = par
    dias = Counter()
    horas = Counter()
    total = 0
    hoje = datetime.now(timezone.utc)
    for k in range(0, 21):
        d = (hoje + timedelta(days=k)).strftime("%Y%m%d")
        try:
            req = urllib.request.Request(
                "%s/%s/scoreboard?dates=%s" % (BASE, codigo, d),
                headers={"User-Agent": "Mozilla/5.0"})
            js = json.load(urllib.request.urlopen(req, timeout=12))
        except Exception:
            continue
        for ev in (js.get("events") or []):
            try:
                q = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(BRT)
            except Exception:
                continue
            dias[q.weekday()] += 1
            horas[q.hour] += 1
            total += 1
    return codigo, nome, regiao, total, dias, horas


def faixa(horas):
    if not horas:
        return "—"
    hs = sorted(horas)
    return "%02dh–%02dh" % (hs[0], hs[-1])


def pico(horas, n=2):
    return ", ".join("%02dh" % h for h, _ in horas.most_common(n))


print("varrendo 21 dias de calendário em %d ligas...\n" % len(LIGAS), flush=True)
resultados = []
with cf.ThreadPoolExecutor(8) as ex:
    for r in ex.map(varre, LIGAS):
        resultados.append(r)

por_regiao = defaultdict(list)
for cod, nome, reg, total, dias, horas in resultados:
    por_regiao[reg].append((cod, nome, total, dias, horas))

for reg in ["Brasil", "Sul-América", "América do Norte", "Europa top",
            "Europa 2ª linha", "Ásia/Oceania", "África"]:
    print("═" * 104)
    print(reg.upper())
    print("%-26s %-8s %5s  %-22s %s" % ("LIGA", "CÓDIGO", "JOGOS", "DIAS (21d)", "HORÁRIO BRT"))
    print("─" * 104)
    for cod, nome, total, dias, horas in sorted(por_regiao[reg], key=lambda x: -x[2]):
        if total == 0:
            print("%-26s %-8s %5s  %s" % (nome, cod, "—", "sem cobertura na ESPN"))
            continue
        ds = " ".join("%s:%d" % (DIAS[d], n) for d, n in sorted(dias.items()))
        print("%-26s %-8s %5d  %-22s %s  (pico %s)"
              % (nome, cod, total, ds[:22], faixa(horas), pico(horas)))
    print()
