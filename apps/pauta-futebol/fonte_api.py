# -*- coding: utf-8 -*-
"""Pauta que nasce do JOGO — a frente factual, pela mesma API da live.

POR QUE ESTA FRENTE EXISTE SEPARADA DO RSS
  O RSS traz o que se FALOU. A API traz o que ACONTECEU. Uma expulsao aos 20 do
  primeiro tempo vira video antes de qualquer portal publicar — e no plantao
  diario chegar primeiro e metade do trabalho.

  E a API traz o que o portal frequentemente nao destaca: a virada, a goleada, o
  numero de finalizacoes contra o placar, o time grande que perdeu em casa. Cada
  um desses e um angulo diferente do MESMO jogo, e um jogo pode render tres
  videos.

O QUE FAZ UM JOGO VIRAR VIDEO
  Nao e o resultado — e o DESVIO. Vitoria esperada de time grande em casa nao
  rende nada. O que rende:

    cartao vermelho      arbitragem vira caso, e caso rende dois lados
    virada               narrativa pronta: estava perdendo e ganhou
    goleada              vexame de um lado, festa do outro
    penalti              o lance mais discutido do futebol
    time grande perdeu   quanto maior a torcida, maior a crise
    gol no fim           o desfecho tardio e o que mais retem

  Cada gatilho vira uma pauta com o angulo ja declarado, porque a mesma partida
  vista pelo lado do vencedor e pelo lado do perdedor sao dois videos.

RELACAO COM `apps/live-futebol`
  Mesma fonte de dados, uso oposto. La e narracao ao vivo do que esta
  acontecendo; aqui e garimpo do que aconteceu, para virar pauta. As duas usam
  os endpoints publicos da ESPN, sem chave e sem custo.
"""
import concurrent.futures as cf
import json
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"
AGENTE = "Mozilla/5.0"

# Ligas onde time brasileiro joga. Fora daqui, a audiencia do canal nao segue.
LIGAS = [
    ("bra.1", "Brasileirão A"),
    ("bra.2", "Brasileirão B"),
    ("bra.copa_do_brasil", "Copa do Brasil"),
    ("conmebol.libertadores", "Libertadores"),
    ("conmebol.sudamericana", "Sul-Americana"),
]

# O mesmo peso de audiencia usado no RSS — clube grande move mais busca.
PESO_CLUBE = {
    "Flamengo": 1.00, "Corinthians": 1.00, "Palmeiras": 0.95, "São Paulo": 0.90,
    "Vasco da Gama": 0.90, "Vasco": 0.90, "Cruzeiro": 0.85, "Santos": 0.85,
    "Grêmio": 0.80, "Internacional": 0.80, "Atlético Mineiro": 0.75,
    "Fluminense": 0.75, "Botafogo": 0.75, "Bahia": 0.65, "Sport Recife": 0.60,
}


def _busca(url, timeout=20):
    req = urllib.request.Request(url, headers={"User-Agent": AGENTE})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.load(r)


# Sufixos de estado que distinguem homonimos: Botafogo-SP nao e o Botafogo do
# Rio, e Atletico-GO nao e o Galo. Herdar o peso de audiencia por substring
# inflava times de serie B ate a nota de time grande.
SUFIXOS_UF = ("-sp", "-pb", "-go", "-pr", "-mg", "-rj", "-rs", "-ba", "-ce",
              "-pe", "-sc", "-df", "-al", "-rn", "-am", "-pa", "-ma", "-to")


def _peso(nome):
    n = (nome or "").strip().lower()
    # Homonimo com sufixo de estado nunca herda o peso do clube grande.
    tem_uf = any(n.endswith(u) or (u + " ") in n for u in SUFIXOS_UF)
    for k, v in PESO_CLUBE.items():
        kl = k.lower()
        if n == kl:
            return v
        if kl in n and not tem_uf:
            return v
    return 0.35


def jogos_recentes(horas=36):
    """Partidas encerradas ou em andamento na janela, nas ligas de interesse."""
    hoje = datetime.now(timezone.utc)
    datas = sorted({(hoje - timedelta(hours=h)).strftime("%Y%m%d")
                    for h in (0, 24, 48)})

    def uma(par):
        liga, nome = par
        achados = []
        for d in datas:
            try:
                js = _busca("%s/%s/scoreboard?dates=%s" % (BASE, liga, d))
            except Exception:
                continue
            for ev in (js.get("events") or []):
                st = ((ev.get("status") or {}).get("type") or {})
                if st.get("state") not in ("post", "in"):
                    continue
                try:
                    q = datetime.fromisoformat(ev["date"].replace("Z", "+00:00"))
                except Exception:
                    continue
                if (hoje - q).total_seconds() > horas * 3600:
                    continue
                achados.append({"liga": liga, "liga_nome": nome, "id": ev["id"],
                                "quando": q.timestamp(),
                                "estado": st.get("state")})
        return achados

    saida = []
    with cf.ThreadPoolExecutor(6) as ex:
        for lista in ex.map(uma, LIGAS):
            saida.extend(lista)
    # o mesmo jogo aparece em duas datas quando cruza a meia-noite UTC
    vistos, unicos = set(), []
    for j in saida:
        if j["id"] in vistos:
            continue
        vistos.add(j["id"])
        unicos.append(j)
    return unicos


def angulos(liga, jogo_id):
    """Os ângulos de vídeo que ESTA partida oferece. Um jogo pode render vários."""
    d = _busca("%s/%s/summary?event=%s" % (BASE, liga, jogo_id))
    comp = ((d.get("header") or {}).get("competitions") or [{}])[0]
    times = comp.get("competitors") or []
    if len(times) < 2:
        return []

    casa = next((t for t in times if t.get("homeAway") == "home"), times[0])
    fora = next((t for t in times if t.get("homeAway") == "away"), times[-1])

    def nome(t):
        return ((t.get("team") or {}).get("displayName") or "?").strip()

    def gols(t):
        try:
            return int(t.get("score") or 0)
        except (TypeError, ValueError):
            return 0

    nc, nf = nome(casa), nome(fora)
    gc, gf = gols(casa), gols(fora)
    st = ((comp.get("status") or {}).get("type") or {})
    encerrado = st.get("state") == "post"

    eventos = d.get("keyEvents") or []
    def evs(*tipos):
        return [e for e in eventos
                if ((e.get("type") or {}).get("text") or "") in tipos]

    vermelhos = evs("Red Card")
    penaltis = evs("Penalty - Scored", "Penalty - Missed")
    gols_ev = evs("Goal", "Own Goal", "Penalty - Scored")
    contra = evs("Own Goal")

    def quem(e):
        ps = [(p.get("athlete") or {}).get("displayName", "")
              for p in (e.get("participants") or [])]
        return next((p for p in ps if p), (e.get("shortText") or "").strip())

    def minuto(e):
        return ((e.get("clock") or {}).get("displayValue") or "").strip()

    def _min_num(e):
        m = minuto(e).replace("'", "").split("+")[0]
        try:
            return int(m)
        except ValueError:
            return 0

    saida = []

    def add(gatilho, sujeito, acao, curta, alvo, consequencia, peso):
        saida.append({
            "gatilho": gatilho, "peso": peso,
            "jogo": "%s %d x %d %s" % (nc, gc, gf, nf),
            "liga": liga, "jogo_id": jogo_id, "encerrado": encerrado,
            "fato": {"nicho": "futebol", "sujeito": sujeito, "acao": acao,
                     "acao_curta": curta, "alvo": alvo, "alvo_reage": True,
                     "consequencia": consequencia, "verificado": []},
        })

    # ── cartão vermelho: o lance que sempre vira caso ────────────────────────
    for e in vermelhos:
        lado = nc if (e.get("team") or {}).get("id") == (casa.get("id")) else nf
        add("vermelho", lado,
            "teve %s expulso aos %s" % (quem(e), minuto(e)),
            "perde %s por expulsão" % quem(e),
            "a arbitragem",
            "o time jogou com um a menos e o caso vai à mesa",
            0.9 * max(_peso(nc), _peso(nf)) + 0.25)

    # ── virada ───────────────────────────────────────────────────────────────
    if encerrado and len(gols_ev) >= 2 and gc != gf:
        ordem = sorted(gols_ev, key=_min_num)
        prim = (ordem[0].get("team") or {}).get("id")
        venceu_casa = gc > gf
        primeiro_foi_casa = prim == casa.get("id")
        if primeiro_foi_casa != venceu_casa:
            ganhou, perdeu = (nc, nf) if venceu_casa else (nf, nc)
            add("virada", ganhou,
                "saiu atrás e virou para %d a %d" % (max(gc, gf), min(gc, gf)),
                "vira o jogo",
                perdeu,
                "o adversário perdeu depois de estar na frente",
                0.85 * _peso(ganhou) + 0.2)

    # ── goleada ──────────────────────────────────────────────────────────────
    if encerrado and abs(gc - gf) >= 3:
        ganhou, perdeu = (nc, nf) if gc > gf else (nf, nc)
        add("goleada", perdeu,
            "levou %d a %d do %s" % (max(gc, gf), min(gc, gf), ganhou),
            "leva goleada",
            ganhou,
            "a pressão sobre o elenco e a comissão aumenta",
            0.8 * _peso(perdeu) + 0.2)

    # ── pênalti ──────────────────────────────────────────────────────────────
    for e in penaltis:
        marcado = ((e.get("type") or {}).get("text") or "") == "Penalty - Scored"
        lado = nc if (e.get("team") or {}).get("id") == casa.get("id") else nf
        add("penalti", lado,
            "%s o pênalti aos %s com %s" % ("converteu" if marcado else "perdeu",
                                            minuto(e), quem(e)),
            "%s pênalti" % ("converte" if marcado else "perde"),
            "a arbitragem",
            "o lance decidiu o rumo do jogo",
            0.7 * max(_peso(nc), _peso(nf)) + 0.15)

    # ── gol contra ───────────────────────────────────────────────────────────
    for e in contra:
        add("gol_contra", quem(e), "fez contra aos %s" % minuto(e),
            "faz gol contra", nc if gc else nf,
            "o lance vira assunto por dias", 0.65)

    # ── time grande perdeu ───────────────────────────────────────────────────
    if encerrado and gc != gf:
        perdeu = nc if gf > gc else nf
        if _peso(perdeu) >= 0.75 and abs(gc - gf) < 3:
            add("derrota_grande", perdeu,
                "perdeu por %d a %d" % (max(gc, gf), min(gc, gf)),
                "perde de novo",
                nf if perdeu == nc else nc,
                "a crise no clube ganha mais um capítulo",
                0.6 * _peso(perdeu))

    # ── gol no fim ───────────────────────────────────────────────────────────
    tardios = [e for e in gols_ev if _min_num(e) >= 85]
    if encerrado and tardios and gc != gf:
        e = tardios[-1]
        lado = nc if (e.get("team") or {}).get("id") == casa.get("id") else nf
        add("gol_no_fim", lado,
            "decidiu aos %s com %s" % (minuto(e), quem(e)),
            "decide no fim",
            nf if lado == nc else nc,
            "o gol tardio muda a tabela",
            0.55 * _peso(lado) + 0.15)

    return saida


def pautas_de_jogo(horas=36, minimo=0.4):
    jogos = jogos_recentes(horas)
    saida = []

    def um(j):
        try:
            return angulos(j["liga"], j["id"])
        except Exception:
            return []

    with cf.ThreadPoolExecutor(6) as ex:
        for lista in ex.map(um, jogos):
            saida.extend(lista)
    saida = [a for a in saida if a["peso"] >= minimo]
    saida.sort(key=lambda a: -a["peso"])
    return saida, len(jogos)


if __name__ == "__main__":
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument("--horas", type=int, default=36)
    ap.add_argument("--minimo", type=float, default=0.4)
    a = ap.parse_args()

    t0 = time.time()
    angs, n = pautas_de_jogo(a.horas, a.minimo)
    print("%d partidas na janela de %dh → %d ângulos · %.1fs\n"
          % (n, a.horas, len(angs), time.time() - t0))
    print("%-6s %-14s %-22s %s" % ("PESO", "GATILHO", "JOGO", "ÂNGULO"))
    print("─" * 110)
    for x in angs[:20]:
        f = x["fato"]
        print("%-6.2f %-14s %-22s %s %s"
              % (x["peso"], x["gatilho"], x["jogo"][:22], f["sujeito"], f["acao"]))
