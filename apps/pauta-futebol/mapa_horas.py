# -*- coding: utf-8 -*-
"""Mapa hora x dia — onde estao os BURACOS da grade.

O guia de dias de jogo responde "quando ha futebol". A pergunta que decide a
grade de lives e outra: "quando ha futebol e NAO ha canal brasileiro transmitindo".
Essas duas nao coincidem, e a diferenca e a oportunidade.
"""
import concurrent.futures as cf
import json
import sys
import urllib.request
from collections import defaultdict
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
BRT = timezone(timedelta(hours=-3))
DIAS = ["SEG", "TER", "QUA", "QUI", "SEX", "SÁB", "DOM"]

LIGAS = ["bra.1", "bra.2", "arg.1", "col.1", "chi.1", "uru.1", "par.1", "per.1",
         "ecu.1", "bol.1", "ven.1", "usa.1", "mex.1", "usa.usl.1",
         "eng.1", "esp.1", "ita.1", "ger.1", "fra.1", "uefa.champions",
         "uefa.europa", "eng.2", "esp.2", "ita.2", "ger.2", "fra.2", "por.1",
         "ned.1", "bel.1", "tur.1", "sco.1", "gre.1", "aut.1", "den.1",
         "nor.1", "swe.1", "rus.1", "jpn.1", "chn.1", "ksa.1", "afc.champions",
         "rsa.1", "conmebol.libertadores", "conmebol.sudamericana"]

# Ligas que canal brasileiro de live cobre em massa — onde a concorrencia mora.
CONCORRIDAS = {"bra.1", "bra.2", "eng.1", "esp.1", "ita.1", "ger.1", "fra.1",
               "uefa.champions", "uefa.europa", "conmebol.libertadores",
               "conmebol.sudamericana", "arg.1"}


def varre(cod):
    grade = defaultdict(lambda: [0, 0])   # (dia, hora) -> [total, concorridos]
    hoje = datetime.now(timezone.utc)
    for k in range(0, 21):
        d = (hoje + timedelta(days=k)).strftime("%Y%m%d")
        try:
            req = urllib.request.Request("%s/%s/scoreboard?dates=%s" % (BASE, cod, d),
                                         headers={"User-Agent": "Mozilla/5.0"})
            js = json.load(urllib.request.urlopen(req, timeout=12))
        except Exception:
            continue
        for ev in (js.get("events") or []):
            try:
                q = datetime.fromisoformat(ev["date"].replace("Z", "+00:00")).astimezone(BRT)
            except Exception:
                continue
            g = grade[(q.weekday(), q.hour)]
            g[0] += 1
            if cod in CONCORRIDAS:
                g[1] += 1
    return grade


total = defaultdict(lambda: [0, 0])
with cf.ThreadPoolExecutor(8) as ex:
    for g in ex.map(varre, LIGAS):
        for k, v in g.items():
            total[k][0] += v[0]
            total[k][1] += v[1]

print("MAPA HORA × DIA — 21 dias, %d ligas, horário de Brasília\n" % len(LIGAS))
print("  ·  sem jogo      ▪  1-3 jogos      ▓  4-9      █  10+")
print("  (n)  jogos em liga POUCO disputada por canal brasileiro\n")
print("     " + "".join("%-11s" % d for d in DIAS))
for h in range(24):
    linha = "%02dh  " % h
    for d in range(7):
        n, conc = total[(d, h)]
        livre = n - conc
        if n == 0:
            marca = " ·"
        elif n <= 3:
            marca = " ▪"
        elif n <= 9:
            marca = " ▓"
        else:
            marca = " █"
        linha += "%s%-9s" % (marca, ("(%d)" % livre) if livre else "")
    print(linha)
