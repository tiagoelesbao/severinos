# -*- coding: utf-8 -*-
"""Servidor do overlay de live de futebol — dados da ESPN, sem chave e sem custo.

POR QUE UM SERVIDOR NO MEIO, E NAO A PAGINA CHAMANDO A API DIRETO

  1. CORS. O Browser Source do OBS e um Chromium comum; chamar a ESPN de dentro
     da pagina esbarra na politica de origem. Aqui o Python busca e reserve.
  2. CACHE. A pagina redesenha varias vezes por segundo; a API e consultada uma
     vez a cada `INTERVALO_S`. Sem isso, seriam milhares de requisicoes por jogo
     a endpoints que nao sao nossos.
  3. UMA FONTE. Varias cenas do OBS podem abrir a mesma pagina — todas leem do
     mesmo cache, e o numero de chamadas a ESPN nao muda.

SOBRE A FONTE DE DADOS
  Sao os endpoints publicos que a propria ESPN usa no site. Nao pedem chave, nao
  pedem cadastro e nao tem limite publicado. Em compensacao **nao sao
  documentados**: podem mudar sem aviso. Por isso o codigo trata ausencia de
  campo como normal e nunca quebra a pagina — no pior caso o painel congela no
  ultimo dado bom, que num overlay e muito melhor que sumir.

  A conta que elimina as alternativas: 110 min de jogo a cada 10 s = 660
  requisicoes. O free da API-Football e 100 POR DIA; o da TheSportsDB nao inclui
  livescore; o da football-data.org tem placar atrasado e nao traz eventos.

INTERVALO
  30 s e o padrao, e e suficiente: a live NAO mostra a partida, entao meio minuto
  de atraso e invisivel para quem assiste. Baixar isso so aumenta a chance de
  irritar a origem sem ganho perceptivel.

Uso:
    python servidor.py                      # lista os jogos de hoje e sai
    python servidor.py <id_do_jogo>         # sobe o overlay para esse jogo
    python servidor.py <id> --liga esp.1    # outra liga
    python servidor.py --procurar           # o que esta em campo AGORA
    python servidor.py --demo               # jogo ja encerrado, para testar
    python servidor.py --demo --replay      # REENCENA a partida minuto a minuto
    python servidor.py <id> --replay --velocidade 15
    python servidor.py <id> --narrar               # com narracao automatica
    python servidor.py <id> --narrar --voz edge    # forca um motor de voz
    python servidor.py <id> --narrar --chat <url da live no YouTube>
    python servidor.py <id> --narrar --chat-teste  # chat simulado, para ensaio
"""
import json
import os
import sys
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

AQUI = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, AQUI)
PORTA = 8790
INTERVALO_S = 30
BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer"

# Um jogo real e encerrado, para ver o overlay funcionando sem esperar partida.
DEMO = ("bra.1", "401841213")   # Flamengo 3 x 0 Botafogo

# Ligas varridas por `--procurar`. A ordem e a de interesse do canal: o que o
# publico brasileiro assiste primeiro, depois o resto do continente, depois a
# Europa. Acrescentar liga aqui e so acrescentar o codigo da ESPN.
LIGAS_BUSCA = [
    ("bra.1", "Brasileirão A"), ("bra.2", "Brasileirão B"),
    ("bra.copa_do_brasil", "Copa do Brasil"),
    ("conmebol.libertadores", "Libertadores"),
    ("conmebol.sudamericana", "Sul-Americana"),
    ("arg.1", "Argentina"), ("col.1", "Colômbia"), ("chi.1", "Chile"),
    ("uru.1", "Uruguai"), ("mex.1", "México"), ("usa.1", "MLS"),
    ("eng.1", "Premier League"), ("esp.1", "LaLiga"), ("ita.1", "Série A"),
    ("ger.1", "Bundesliga"), ("fra.1", "Ligue 1"), ("por.1", "Portugal"),
    ("uefa.champions", "Champions"), ("uefa.europa", "Europa League"),
]

# As metricas que valem tela, na ordem em que aparecem. O boxscore da ESPN traz
# 28 por time — a maioria e ruido para quem assiste.
METRICAS = [
    ("possessionPct", "Posse", "%"),
    ("totalShots", "Finalizações", ""),
    ("shotsOnTarget", "No alvo", ""),
    ("wonCorners", "Escanteios", ""),
    ("foulsCommitted", "Faltas", ""),
    ("yellowCards", "Cartões", ""),
    # As tres ultimas entraram quando a caixa passou a ocupar a coluna inteira
    # e sobravam 110px vazios embaixo. Sao numeros que o publico apostador
    # acompanha: defesas do goleiro, impedimentos e volume de passe certo.
    ("saves", "Defesas", ""),
    ("offsides", "Impedimentos", ""),
    ("accuratePasses", "Passes certos", ""),
]

# Tipos de evento que viram linha na timeline. O resto (atrasos, VAR em
# andamento) polui sem informar.
EVENTOS_UTEIS = {"Goal", "Own Goal", "Penalty - Scored", "Penalty - Missed",
                 "Yellow Card", "Red Card", "Substitution"}

ICONE = {"Goal": "⚽", "Own Goal": "⚽", "Penalty - Scored": "⚽",
         "Penalty - Missed": "✖", "Yellow Card": "🟨", "Red Card": "🟥",
         "Substitution": "🔁"}


def busca(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return json.load(r)


def jogos_de_hoje(liga="bra.1", data=None):
    u = "%s/%s/scoreboard" % (BASE, liga)
    if data:
        u += "?dates=" + data
    d = busca(u)
    saida = []
    for e in d.get("events", []):
        c = e["competitions"][0]
        casa = next((t for t in c["competitors"] if t.get("homeAway") == "home"), None)
        fora = next((t for t in c["competitors"] if t.get("homeAway") == "away"), None)
        saida.append({
            "id": e["id"],
            "nome": "%s x %s" % (casa["team"]["displayName"] if casa else "?",
                                 fora["team"]["displayName"] if fora else "?"),
            "estado": e["status"]["type"]["description"],
            "ao_vivo": e["status"]["type"].get("state") == "in",
        })
    return saida


def procura_ao_vivo():
    """O que esta em campo AGORA, em todas as ligas de interesse.

    Sem isto, comecar uma transmissao exige abrir um site, achar o jogo, achar
    o id do jogo na URL e voltar para o terminal. E o tipo de atrito que faz
    perder o primeiro tempo.
    """
    import concurrent.futures as cf

    def uma(par):
        liga, nome = par
        try:
            d = busca("%s/%s/scoreboard" % (BASE, liga))
        except Exception:
            return []
        fora = []
        for ev in (d.get("events") or []):
            st = ((ev.get("status") or {}).get("type") or {})
            if st.get("state") != "in":
                continue
            comp = (ev.get("competitions") or [{}])[0]
            times = comp.get("competitors") or []
            placar = " x ".join((t.get("score") or "0") for t in times) if times else ""
            fora.append({"liga": liga, "liga_nome": nome, "id": ev.get("id"),
                         "nome": ev.get("shortName") or ev.get("name") or "",
                         "placar": placar, "quando": st.get("detail") or ""})
        return fora

    achados = []
    with cf.ThreadPoolExecutor(max_workers=10) as ex:
        for lista in ex.map(uma, LIGAS_BUSCA):
            achados.extend(lista)
    return achados


def _time(c):
    t = c.get("team", {})
    logo = t.get("logo") or (t.get("logos") or [{}])[0].get("href")
    return {
        "nome": t.get("displayName", "?"),
        "sigla": t.get("abbreviation") or t.get("shortDisplayName", "")[:3].upper(),
        "cor": "#" + (t.get("color") or "222222"),
        "logo": logo,
        "placar": c.get("score", "0"),
    }


# Faixas de X para nomear o momento do jogo. X vem 0-100 SEMPRE no sentido do
# ataque de quem fez a acao — um chute do visitante a 94 esta perto do gol da
# casa, e vice-versa.
#
# Os cortes saem da geometria do campo: 83 e a entrada da grande area
# (16,5 m de 105), 66 e o ultimo terco, 40 e o meio-campo com folga.
FAIXAS = [
    (83, "ATAQUE PERIGOSO", "#ff4d4d"),
    (66, "ATAQUE", "#ffc531"),
    (40, "BOLA NO MEIO", "#2de2c8"),
    (0,  "SAÍDA DE BOLA", "#7d8590"),
]

# Lances que dizem onde a bola esta. Falta e escanteio marcam posicao tanto
# quanto chute; "Substitution" e "Card" nao — a bola pode estar em qualquer
# lugar quando eles acontecem.
LANCES_POSICIONAIS = {
    "Shot On Target", "Shot Off Target", "Shot Blocked", "Goal",
    "Corner Awarded", "Foul", "Offside", "Handball", "Penalty - Scored",
}


def _situacao(x):
    for limite, rotulo, cor in FAIXAS:
        if x >= limite:
            return rotulo, cor
    return FAIXAS[-1][1], FAIXAS[-1][2]


def _campo(d, id_casa, nome_casa):
    """Estado do minicampo a partir do ULTIMO lance com coordenada.

    IMPORTANTE, E E A DIFERENCA PARA O SOFASCORE: isto NAO e rastreamento de
    bola. O SofaScore anima posicao continua porque compra dado de tracking;
    aqui a bola salta de lance em lance (chute, falta, escanteio). Na pratica o
    efeito em tela e parecido — o campo "respira" com o jogo —, mas entre dois
    lances a bola fica parada, e isso e honesto dizer.

    A coordenada X vem no sentido do ataque de quem agiu. Para desenhar num
    campo fixo, o lance do visitante e espelhado (100 - x).
    """
    ultimo = None
    chutes = []
    lances_todos = []
    for item in (d.get("commentary") or []):
        pl = item.get("play") or {}
        x = pl.get("fieldPositionX")
        if x is None:
            continue
        tipo = (pl.get("type") or {}).get("text", "")
        eq = pl.get("team") or {}
        # O `commentary` traz o time SEM id — so `displayName`. Comparar por id
        # aqui dava sempre False e jogava todos os lances para o lado do
        # visitante. O nome e o unico campo presente nas duas secoes da API.
        eh_casa = (eq.get("id") == id_casa) if eq.get("id") else \
                  (eq.get("displayName", "").strip() == nome_casa)
        # posicao no campo desenhado: casa ataca para a direita
        px = x if eh_casa else 100 - x
        py = pl.get("fieldPositionY") or 50
        if not eh_casa:
            py = 100 - py
        minuto_num = None
        cl = (pl.get("clock") or {}).get("displayValue", "")
        if cl:
            minuto_num = int("".join(c for c in cl if c.isdigit()) or 0) or None
        if "Shot" in tipo or tipo == "Goal":
            chutes.append({
                "x": round(px, 1), "y": round(py, 1),
                "lado": "casa" if eh_casa else "fora",
                "gol": tipo == "Goal",
                "no_alvo": tipo in ("Shot On Target", "Goal"),
                "min": minuto_num,
            })
        if tipo in LANCES_POSICIONAIS:
            rotulo, cor = _situacao(x)
            lances_todos.append({
                "x": round(px, 1), "y": round(py, 1),
                "lado": "casa" if eh_casa else "fora",
                "time": (pl.get("team") or {}).get("displayName", ""),
                "situacao": rotulo, "cor": cor,
                "min": cl, "min_num": minuto_num, "tipo": tipo,
            })
            ultimo = {
                "x": round(px, 1), "y": round(py, 1),
                "lado": "casa" if eh_casa else "fora",
                "time": (pl.get("team") or {}).get("displayName", ""),
                "situacao": rotulo,
                "cor": cor,
                "min": (pl.get("clock") or {}).get("displayValue", ""),
                "tipo": tipo,
            }
    return ultimo, chutes, lances_todos


def _escalacao(d):
    """Titulares por time, com numero, nome, posicao e formacao."""
    saida = []
    for r in (d.get("rosters") or []):
        elenco = r.get("roster") or []
        titulares = []
        for a in elenco:
            if not a.get("starter"):
                continue
            at = a.get("athlete") or {}
            titulares.append({
                "num": a.get("jersey") or "",
                "nome": at.get("shortName") or at.get("displayName") or "",
                "pos": (a.get("position") or {}).get("abbreviation", ""),
            })
        saida.append({
            "time_id": (r.get("team") or {}).get("id"),
            "sigla": (r.get("team") or {}).get("abbreviation", ""),
            "formacao": r.get("formation") or "",
            "titulares": titulares,
        })
    return saida


def monta(liga, jogo_id):
    """Um objeto so, ja no formato que a pagina desenha.

    A pagina nao conhece a ESPN: se um dia a fonte mudar, so este arquivo muda.
    """
    d = busca("%s/%s/summary?event=%s" % (BASE, liga, jogo_id))
    comp = d["header"]["competitions"][0]
    casa = next((c for c in comp["competitors"] if c.get("homeAway") == "home"), comp["competitors"][0])
    fora = next((c for c in comp["competitors"] if c.get("homeAway") == "away"), comp["competitors"][-1])
    st = comp.get("status", {})

    # ── estatisticas, pareadas casa x fora ──────────────────────────────────
    por_time = {}
    for t in (d.get("boxscore") or {}).get("teams", []):
        ident = t.get("team", {}).get("id")
        por_time[ident] = {s.get("name"): s.get("displayValue") for s in t.get("statistics", [])}
    ec = por_time.get(casa["team"]["id"], {})
    ef = por_time.get(fora["team"]["id"], {})

    def num(v):
        try:
            return float(str(v).replace("%", ""))
        except (TypeError, ValueError):
            return 0.0

    stats = []
    for chave, rotulo, sufixo in METRICAS:
        a, b = ec.get(chave), ef.get(chave)
        if a is None and b is None:
            continue          # metrica ausente nao vira linha vazia na tela
        va, vb = num(a), num(b)
        total = va + vb
        stats.append({
            "rotulo": rotulo,
            "casa": ("%s%s" % (a, sufixo)) if a is not None else "-",
            "fora": ("%s%s" % (b, sufixo)) if b is not None else "-",
            # a barra e proporcional; sem dado nos dois lados, fica no meio
            "pct": round(100 * va / total, 1) if total else 50.0,
        })

    # ── eventos ─────────────────────────────────────────────────────────────
    # Escudos resolvidos antes do laco: sao a ultima carta da cascata de imagem
    # do cartaz de gol, e sempre existem.
    logo_casa = _time(casa)["logo"]
    logo_fora = _time(fora)["logo"]
    eventos = []
    for e in (d.get("keyEvents") or []):
        tipo = (e.get("type") or {}).get("text") or ""
        if tipo not in EVENTOS_UTEIS:
            continue
        equipe = (e.get("team") or {}).get("id")
        # O nome do jogador vem em `participants[].athlete.displayName` — NAO em
        # `athletesInvolved`, que e o nome usado em outros esportes da mesma API
        # e aqui vem sempre vazio. Com o campo errado o overlay desenhava a
        # linha do gol sem dizer quem fez, o que e o unico dado que importa nela.
        nomes = [ (p.get("athlete") or {}).get("displayName", "")
                  for p in (e.get("participants") or []) ]
        nomes = [n for n in nomes if n]
        # `shortText` ("Samuel Lino Goal") ja vem pronto e serve de rede quando
        # a lista de participantes falta.
        quem = nomes[0] if nomes else (e.get("shortText") or "")
        # CASCATA DE IMAGEM, e nao uma URL so.
        #   A ESPN publica retrato (`headshots`) de uma fracao minima dos
        #   atletas: dos 46 do elenco desta partida, 3 tinham foto — 6,5%. Era
        #   por isso que o cartaz de gol subia com o icone de imagem quebrada.
        #   O `stitcher`, ao contrario, GERA a camisa numerada sob demanda para
        #   qualquer jogador de qualquer jogo (medido: 200 em todos os testes).
        #   Ordem: retrato, camisa do jogador, escudo do clube. A pagina desce
        #   a lista no `onerror` e para na primeira que existir.
        ids = [(p.get("athlete") or {}).get("id") for p in (e.get("participants") or [])]
        ids = [i for i in ids if i]
        eh_casa = equipe == casa["team"]["id"]
        fotos = []
        if ids:
            fotos.append("https://a.espncdn.com/i/headshots/soccer/players/full/%s.png" % ids[0])
            fotos.append("https://stitcher.espn.com/sports/soccer/leagues/%s/events/%s"
                         "/athletes/%s/jersey.png?darkMode=true" % (liga, jogo_id, ids[0]))
        escudo = logo_casa if eh_casa else logo_fora
        if escudo:
            fotos.append(escudo)
        eventos.append({
            "min": (e.get("clock") or {}).get("displayValue", ""),
            "tipo": tipo,
            "icone": ICONE.get(tipo, "•"),
            "quem": quem,
            "foto": fotos[0] if fotos else "",
            "fotos": fotos,
            # o segundo nome e quem deu a assistencia (ou quem entrou, na
            # substituicao) — vale a linha de baixo no overlay
            "apoio": nomes[1] if len(nomes) > 1 else "",
            "lado": "casa" if equipe == casa["team"]["id"] else "fora",
            "texto": e.get("text") or "",
        })
    eventos.reverse()          # o mais recente primeiro — e o que interessa

    ultimo_lance, chutes, lances_todos = _campo(
        d, casa["team"]["id"], casa["team"].get("displayName", "").strip())
    escalacoes = _escalacao(d)
    esc_casa = next((e for e in escalacoes if e["time_id"] == casa["team"]["id"]), None)
    esc_fora = next((e for e in escalacoes if e["time_id"] == fora["team"]["id"]), None)

    return {
        "atualizado": time.strftime("%H:%M:%S"),
        "liga": (d.get("header") or {}).get("league", {}).get("name", ""),
        "campo": ultimo_lance,
        "chutes": chutes[-24:],
        # guardados inteiros para o replay poder cortar por minuto
        "chutes_todos": chutes,
        "campo_todos": lances_todos,
        # todos os lances com minuto — e o que permite CONTAR no replay em vez
        # de estimar por regra de tres
        "lances_brutos": lances_todos,
        "escalacao": {"casa": esc_casa, "fora": esc_fora},
        "casa": _time(casa),
        "fora": _time(fora),
        "estado": (st.get("type") or {}).get("detail", ""),
        "relogio": st.get("displayClock") or "",
        "ao_vivo": (st.get("type") or {}).get("state") == "in",
        "stats": stats,
        "eventos": eventos[:14],
    }


def _minuto(txt):
    """'45'+2'' -> 47. Devolve None quando nao ha minuto legivel."""
    if not txt:
        return None
    n = ""
    total = 0
    for ch in str(txt):
        if ch.isdigit():
            n += ch
        elif n:
            total += int(n)
            n = ""
    if n:
        total += int(n)
    return total or None


def corta_ate(d, minuto):
    """O mesmo objeto, mas so com o que ja tinha acontecido ate `minuto`.

    Placar e estatisticas do fim de jogo nao podem vazar para o meio do replay:
    o placar e recontado pelos gols ja liberados, e as estatisticas sao
    escaladas proporcionalmente ao tempo decorrido. Nao e o valor exato que a
    partida tinha naquele minuto — e uma aproximacao honesta, suficiente para
    ver as barras se moverem e o layout reagir.
    """
    import copy
    r = copy.deepcopy(d)

    r["eventos"] = [e for e in d["eventos"] if (_minuto(e.get("min")) or 0) <= minuto]
    gols_casa = sum(1 for e in r["eventos"]
                    if e["lado"] == "casa" and ("Goal" in e["tipo"] or e["tipo"] == "Penalty - Scored"))
    gols_fora = sum(1 for e in r["eventos"]
                    if e["lado"] == "fora" and ("Goal" in e["tipo"] or e["tipo"] == "Penalty - Scored"))
    r["casa"]["placar"] = str(gols_casa)
    r["fora"]["placar"] = str(gols_fora)

    # ── contagem REAL ate o minuto, a partir dos lances ────────────────────
    ate = [c for c in d.get("lances_brutos", []) if (c.get("min_num") or 0) <= minuto]
    conta = {}
    for c in ate:
        t = c["tipo"]
        lado = c["lado"]
        if "Shot" in t or t == "Goal":
            conta.setdefault("Finalizações", {"casa": 0, "fora": 0})[lado] += 1
            if t in ("Shot On Target", "Goal"):
                conta.setdefault("No alvo", {"casa": 0, "fora": 0})[lado] += 1
        elif t == "Corner Awarded":
            conta.setdefault("Escanteios", {"casa": 0, "fora": 0})[lado] += 1
        elif t == "Foul":
            conta.setdefault("Faltas", {"casa": 0, "fora": 0})[lado] += 1
    for e in r["eventos"]:
        if e["tipo"] in ("Yellow Card", "Red Card"):
            conta.setdefault("Cartões", {"casa": 0, "fora": 0})[e["lado"]] += 1

    novas = []
    for st in d["stats"]:
        novo_st = dict(st)
        c = conta.get(st["rotulo"])
        if c is not None:
            a, b = c["casa"], c["fora"]
            novo_st["casa"], novo_st["fora"] = str(a), str(b)
            novo_st["pct"] = round(100 * a / (a + b), 1) if (a + b) else 50.0
        elif "%" in str(st["casa"]):
            # Posse nao tem serie temporal na API. Fica o valor final, marcado
            # com `~` para nao se passar por medicao daquele minuto.
            novo_st["casa"] = "~" + str(st["casa"])
            novo_st["fora"] = "~" + str(st["fora"])
        else:
            novo_st["casa"] = novo_st["fora"] = "-"
            novo_st["pct"] = 50.0
        novas.append(novo_st)
    r["stats"] = novas

    r["chutes"] = [c for c in d.get("chutes_todos", d.get("chutes", []))
                   if (c.get("min") or 0) <= minuto]
    lances = [c for c in d.get("campo_todos", []) if (c.get("min_num") or 0) <= minuto]
    r["campo"] = lances[-1] if lances else None

    r["relogio"] = "%d'" % minuto
    r["estado"] = "1º tempo" if minuto <= 45 else ("2º tempo" if minuto <= 90 else "Acréscimos")
    r["ao_vivo"] = True
    return r


# ── cache alimentado por uma thread, lido por todas as cenas ────────────────
_cache = {"dados": None, "erro": None}
_trava = threading.Lock()

# Narracao: ligada por --narrar. Fica desligada por padrao porque a voz e uma
# decisao de producao — nem toda cena da live quer locucao por cima.
_narrador = {"on": False, "obj": None, "fila": [], "voz": None}

# O chat vive numa thread propria porque quem manda o ritmo e o YouTube
# (`timeoutMs`), e ele nao tem relacao com o ciclo de 30 s da ESPN. Amarrar os
# dois faria a leitura do chat ficar refem do intervalo de dados.
_chat = {"on": False, "leitor": None, "triagem": None, "erro": None}
_INICIO = time.time()


# Mensagens de mentira para o ensaio. Existem porque o ensaio acontece ANTES
# de haver canal: sem live propria nao ha chat, e sem chat a metade mais nova
# do sistema ficaria sem ser exercitada justamente na hora de testar tudo.
# Sao escritas como gente escreve — com erro, sem acento, em caixa baixa.
CHAT_ENSAIO = [
    ("Marcos Vinicius", "quanto ta o jogo?"),
    ("Ana Paula", "boa noite, salve de Recife!"),
    ("Rafa", "vai dar 2x1"),
    ("Joao", "acho que 1 a 1"),
    ("Bia Santos", "3x0 facil"),
    ("Lucas", "2 a 0 tranquilo"),
    ("Pedro Henrique", "1x1"),
    ("Carla", "2-1 pra eles"),
    ("Tiago", "quem fez o gol?"),
    ("@user-9xk2j", "quanto ta?"),
    ("Julia", "melhor canal de futebol"),
    ("Fernanda", "que minuto ta?"),
    ("spam bet", "ganhe dinheiro no telegram t.me/xxx"),
    ("Ze", "kkkkkkkk"),
    ("Roberto", "cheguei agora, boa tarde de Manaus"),
    ("Diego", "qual o placar?"),
]


def _laco_chat_ensaio(intervalo=18.0):
    """Injeta uma mensagem de ensaio a cada `intervalo`. So com --chat-teste."""
    i = 0
    while True:
        autor, texto = CHAT_ENSAIO[i % len(CHAT_ENSAIO)]
        i += 1
        try:
            _chat["triagem"].absorve([{"autor": autor, "texto": texto}])
        except Exception:
            pass
        time.sleep(intervalo)


def _laco_chat():
    """Le o chat sem parar e entrega ao classificador. Nunca derruba a live."""
    leitor = _chat["leitor"]
    falhas = 0
    while True:
        try:
            msgs = leitor.novas()
            if msgs:
                _chat["triagem"].absorve(msgs)
            falhas = 0
            _chat["erro"] = None
        except Exception as e:
            falhas += 1
            _chat["erro"] = str(e)[:120]
            # Cinco falhas seguidas: reabre. Live reiniciada e token de
            # continuacao vencido sao os casos comuns, e os dois se curam com
            # uma abertura nova — insistir no token velho nao cura nenhum.
            if falhas >= 5:
                falhas = 0
                try:
                    leitor.abre()
                    print("  [chat] reconectado", flush=True)
                except Exception:
                    pass
        time.sleep(getattr(leitor, "intervalo", 5.0))


def _pack_arquivo(ident):
    """Caminho servido de uma fala do pack, ou None se ela nao foi gerada."""
    for sub in ("fixo", "partida"):
        for ext in (".mp3", ".wav"):
            if os.path.isfile(os.path.join(AQUI, "_pack", sub, ident + ext)):
                return "/pack/%s/%s%s" % (sub, ident, ext)
    return None


def _narra(d):
    """Transforma eventos novos em falas ja sintetizadas, prontas para tocar."""
    import time as _t
    import voz as _voz
    n = _narrador["obj"]
    if not n:
        return
    agora = _t.time()
    falas = n.novos(d, agora)
    if not falas:
        # Ordem importa: a chamada de engajamento so entra quando nao ha lance
        # para contar, e antes do respiro — comentario de estatistica pode
        # esperar, converter inscrito nao.
        # Ordem de quem fala quando nao ha lance: chat primeiro, porque
        # responder a quem esta assistindo e o que faz a live parecer viva;
        # depois a chamada de engajamento; por ultimo o comentario de contexto.
        r = None
        if _chat["on"] and _chat["triagem"]:
            r = _chat["triagem"].fala(d, agora)
            if r:
                r["origem"] = "chat"
        r = r or n.chamada(agora) or n.respiro(d, agora)
        if r:
            falas = [r]
    for f in falas:
        # Fala que vem do pack ja existe em disco: e so apontar.
        if f.get("pack"):
            arq = _pack_arquivo(f["pack"])
            if arq:
                with _trava:
                    _narrador["fila"].append({"url": arq, "texto": f["texto"],
                                              "prioridade": f["prioridade"],
                                              "origem": f.get("origem", "")})
                print("  [pack] %s" % f["texto"][:88], flush=True)
                continue
        # O nome do arquivo sai da CHAVE do evento: se o mesmo lance vier de
        # novo num ciclo seguinte, reaproveita o audio em vez de sintetizar
        # outra vez.
        nome = "".join(ch if ch.isalnum() else "_" for ch in f["chave"])[:60]
        caminho = _voz.sintetiza(f["texto"], nome, _narrador["voz"])
        if caminho:
            with _trava:
                _narrador["fila"].append({"url": caminho, "texto": f["texto"],
                                          "prioridade": f["prioridade"],
                                          "origem": f.get("origem", "")})
            print("  [%s] %s" % ("chat" if f.get("origem") == "chat" else "voz",
                                 f["texto"][:88]), flush=True)
    _voz.limpa_antigos()


def _laco_replay(liga, jogo_id, velocidade):
    """Busca uma vez e reencena. O overlay recebe o mesmo JSON de sempre."""
    base = monta(liga, jogo_id)
    fim = 95
    print("  replay de %s x %s — %d min de jogo por minuto real"
          % (base["casa"]["sigla"], base["fora"]["sigla"], velocidade), flush=True)
    minuto = 0
    while True:
        d = corta_ate(base, minuto)
        d["atualizado"] = time.strftime("%H:%M:%S") + "  (replay %d')" % minuto
        if _narrador["on"]:
            _narra(d)
        with _trava:
            _cache["dados"], _cache["erro"] = d, None
        if minuto % 10 == 0:
            print("    %2d'  %s %s x %s %s" % (minuto, d["casa"]["sigla"], d["casa"]["placar"],
                                               d["fora"]["placar"], d["fora"]["sigla"]), flush=True)
        minuto += 1
        if minuto > fim:
            minuto = 0
            print("    --- recomecando ---", flush=True)
        time.sleep(60.0 / max(1, velocidade))


def _laco(liga, jogo_id):
    while True:
        try:
            d = monta(liga, jogo_id)
            if _narrador["on"]:
                _narra(d)
            with _trava:
                _cache["dados"], _cache["erro"] = d, None
            print("  [%s] %s %s x %s %s — %s" % (
                d["atualizado"], d["casa"]["sigla"], d["casa"]["placar"],
                d["fora"]["placar"], d["fora"]["sigla"], d["estado"]), flush=True)
        except Exception as e:
            # NAO limpa o cache: manter o ultimo dado bom na tela e melhor que
            # apagar o painel por causa de uma falha de rede de 20 segundos.
            with _trava:
                _cache["erro"] = str(e)[:200]
            print("  [erro] %s" % str(e)[:120], flush=True)
        time.sleep(INTERVALO_S)


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass                   # o log util e o do laco, nao o de cada GET

    def do_GET(self):
        if self.path.startswith("/falas/"):
            nome_f = os.path.basename(self.path.split("?")[0])
            caminho_f = os.path.join(AQUI, "_falas", nome_f)
            if not os.path.isfile(caminho_f):
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type",
                             "audio/mpeg" if nome_f.endswith(".mp3") else "audio/wav")
            self.end_headers()
            self.wfile.write(open(caminho_f, "rb").read())
            return
        if self.path.startswith("/fundos/"):
            nome_i = os.path.basename(self.path.split("?")[0])
            cam = os.path.join(AQUI, "assets", "fundos", nome_i)
            if not os.path.isfile(cam):
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "image/png")
            self.end_headers()
            self.wfile.write(open(cam, "rb").read())
            return
        if self.path.startswith("/saude"):
            # Painel de uma linha para quem deixa a live rodando e vai embora.
            # Responde sempre a mesma pergunta: continua de pe? A live nao tem
            # tela de erro — se algo parar, para em silencio, e este endereco
            # e o unico jeito de saber sem ficar assistindo.
            with _trava:
                d0 = _cache["dados"] or {}
                erro = _cache["erro"]
                n_fila = len(_narrador["fila"])
            up = time.time() - _INICIO
            tri = _chat.get("triagem")
            corpo = {
                "no_ar_ha": "%dh%02dm" % (up // 3600, (up % 3600) // 60),
                "ultima_leitura": d0.get("atualizado") or "—",
                "erro_de_dados": erro,
                "jogo": ("%s %s x %s %s" % (
                    (d0.get("casa") or {}).get("sigla", "?"),
                    (d0.get("casa") or {}).get("placar", "?"),
                    (d0.get("fora") or {}).get("placar", "?"),
                    (d0.get("fora") or {}).get("sigla", "?"))) if d0 else "—",
                "estado": d0.get("estado") or "—",
                "narracao": _narrador["on"],
                "falas_esperando": n_fila,
                "chat": _chat["on"],
                "chat_erro": _chat.get("erro"),
                "chat_lidas": (tri.contagem["lidas"] if tri else 0),
                "chat_faladas": (tri.contagem["faladas"] if tri else 0),
                "arquivos_de_fala": len([f for f in os.listdir(
                    os.path.join(AQUI, "_falas"))]) if os.path.isdir(
                    os.path.join(AQUI, "_falas")) else 0,
            }
            saida = json.dumps(corpo, ensure_ascii=False, indent=1).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(saida)
            return
        if self.path.startswith("/testevoz"):
            # Prova a corrente inteira sob demanda: sintese -> fila -> navegador
            # -> mixagem com a torcida. Sem isto, conferir audio exige esperar
            # o proximo lance, que num jogo parado pode nao vir.
            if not _narrador["on"]:
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(b"narracao desligada - suba com --narrar")
                return
            import voz as _vt
            txt = ("Teste de locucao. Se voce esta ouvindo esta frase, a voz, "
                   "a fila e a mixagem com a torcida estao funcionando.")
            cam = _vt.sintetiza(txt, "teste_voz")
            if cam:
                with _trava:
                    _narrador["fila"].append({"url": cam, "texto": txt,
                                              "prioridade": "alta"})
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"enfileirado" if cam else b"falhou")
            return
        if self.path.startswith("/pack/"):
            # Falas pre-geradas e ja ouvidas antes do ar. Servidas do disco,
            # sem sintetizar nada.
            rel = self.path.split("?")[0][len("/pack/"):]
            sub, _, nome_p = rel.partition("/")
            cam_p = os.path.join(AQUI, "_pack", os.path.basename(sub),
                                 os.path.basename(nome_p))
            if not os.path.isfile(cam_p):
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type",
                             "audio/mpeg" if cam_p.endswith(".mp3") else "audio/wav")
            self.send_header("Cache-Control", "public, max-age=3600")
            self.end_headers()
            self.wfile.write(open(cam_p, "rb").read())
            return
        if self.path.startswith("/torcida/"):
            nome_t = os.path.basename(self.path.split("?")[0])
            cam_t = os.path.join(AQUI, "assets", "torcida", nome_t)
            if not os.path.isfile(cam_t):
                self.send_error(404)
                return
            self.send_response(200)
            self.send_header("Content-Type", "audio/mpeg")
            # A cama de torcida e o unico arquivo que vale cachear: sao 45 s
            # que a pagina repete a live inteira.
            self.send_header("Cache-Control", "public, max-age=86400")
            self.end_headers()
            self.wfile.write(open(cam_t, "rb").read())
            return
        if self.path.startswith("/fundos-lista"):
            # A pagina pergunta o que existe em vez de trazer a lista fixa —
            # acrescentar um fundo novo passa a ser so soltar o arquivo na pasta.
            d_f = os.path.join(AQUI, "assets", "fundos")
            fs = sorted(f for f in os.listdir(d_f)) if os.path.isdir(d_f) else []
            fs = [f for f in fs if f.lower().endswith(".png") and not f.startswith("CONTATO")]
            corpo = json.dumps(fs).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(corpo)
            return
        if self.path.startswith("/dados"):
            with _trava:
                base_d = _cache["dados"] or {"erro": _cache["erro"] or "carregando"}
                # A fila e ENTREGUE e esvaziada: cada fala vai para a pagina uma
                # vez so. Se ficasse no cache, toda atualizacao de 5 s
                # retocaria o mesmo audio.
                if _narrador["fila"]:
                    base_d = dict(base_d)
                    base_d["falas"] = _narrador["fila"]
                    _narrador["fila"] = []
                corpo = json.dumps(base_d, ensure_ascii=False).encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Cache-Control", "no-store")
            self.end_headers()
            self.wfile.write(corpo)
            return
        # A QUERY SAI ANTES DA COMPARACAO. Com `self.path in ("/", "")`, a URL
        # `/?fundo=1` nao batia com "/" e caia no ramo de arquivo — onde o
        # split deixava nome vazio e devolvia 404. O parametro de visualizacao
        # derrubava justamente a pagina que ele existe para conferir.
        caminho_url = self.path.split("?", 1)[0]
        nome = "overlay.html" if caminho_url in ("/", "") else caminho_url.lstrip("/")
        caminho = os.path.join(AQUI, nome)
        if not os.path.isfile(caminho) or ".." in nome:
            self.send_error(404)
            return
        tipo = "text/html; charset=utf-8" if nome.endswith(".html") else "text/plain"
        self.send_response(200)
        self.send_header("Content-Type", tipo)
        # SEM CACHE no HTML tambem. Sem isto o navegador — e o Browser Source do
        # OBS, que e um Chromium — guardava a pagina, e ajustes de layout so
        # apareciam depois de um F5 forcado. Dentro do OBS nao ha F5 obvio.
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(open(caminho, "rb").read())


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]

    if "--procurar" in sys.argv:
        print("procurando partidas em andamento...\n", flush=True)
        jogos = procura_ao_vivo()
        if not jogos:
            print("nenhuma partida ao vivo nas %d ligas monitoradas agora."
                  % len(LIGAS_BUSCA))
            print("(a lista esta em LIGAS_BUSCA, no topo deste arquivo)")
            return 0
        print("%-18s %-26s %-9s %-8s  comando" % ("LIGA", "JOGO", "PLACAR", "TEMPO"))
        for j in jogos:
            print("%-18s %-26s %-9s %-8s  python servidor.py %s --liga %s"
                  % (j["liga_nome"][:18], j["nome"][:26], j["placar"],
                     j["quando"][:8], j["id"], j["liga"]))
        print("\nacrescente --narrar para ligar a locucao")
        return 0
    liga = "bra.1"
    if "--liga" in sys.argv:
        liga = sys.argv[sys.argv.index("--liga") + 1]

    if "--demo" in sys.argv:
        liga, jogo = DEMO
        print("modo demo — jogo encerrado, para ver o overlay funcionando")
    elif args:
        jogo = args[0]
    else:
        print("jogos de hoje em %s:\n" % liga)
        try:
            for j in jogos_de_hoje(liga):
                marca = " AO VIVO" if j["ao_vivo"] else ""
                print("  %-12s %-46s %s%s" % (j["id"], j["nome"], j["estado"], marca))
        except Exception as e:
            print("  falhou ao consultar: %s" % e)
        print("\nrode de novo com o id:  python servidor.py <id>")
        print("ou veja a cara do overlay com um jogo antigo:  python servidor.py --demo")
        return 0

    if "--chat-teste" in sys.argv:
        import chat_triagem
        _chat["triagem"] = chat_triagem.TriagemDeChat()
        _chat["on"] = True
        threading.Thread(target=_laco_chat_ensaio, daemon=True).start()
        print("chat de ENSAIO ligado — mensagens simuladas, sem live real")
        print("  serve para exercitar a interacao antes de existir canal")

    if "--chat" in sys.argv:
        alvo = sys.argv[sys.argv.index("--chat") + 1]
        from chat import LeitorDeChat
        import chat_triagem
        leitor = LeitorDeChat(alvo)
        print("abrindo o chat da live %s ..." % (leitor.video or alvo))
        if leitor.abre():
            _chat["leitor"] = leitor
            _chat["triagem"] = chat_triagem.TriagemDeChat()
            _chat["on"] = True
            threading.Thread(target=_laco_chat, daemon=True).start()
            print("chat LIGADO · lendo a cada %.1fs" % leitor.intervalo)
            print("  nada do chat vai ao ar literalmente — so o nome de quem")
            print("  escreveu, e a resposta sai do dado que esta na tela")
        else:
            print("chat DESLIGADO: %s" % leitor.erro)

    if "--narrar" in sys.argv:
        import voz as _voz
        from narrador import Narrador
        pref = None
        if "--voz" in sys.argv:
            pref = sys.argv[sys.argv.index("--voz") + 1]
        nome_motor, _, _ = _voz.motor_disponivel(pref)
        if not nome_motor:
            print("AVISO: nenhum motor de voz disponivel — narracao desligada")
        else:
            _narrador["on"] = True
            _narrador["voz"] = pref
            _narrador["obj"] = Narrador()
            # AQUECE ANTES DO APITO. O modelo do Piper leva 1,2 s para carregar
            # e a primeira fala da live seria justamente a de abertura — a que
            # menos pode gaguejar. Carregado aqui, cada frase custa 0,2 a 0,5 s.
            _t_aq = time.time()
            _voz.aquece()
            print("narracao LIGADA · motor: %s · modelo pronto em %.1fs"
                  % (nome_motor, time.time() - _t_aq))
            n_pack = 0
            for _sub in ("fixo", "partida"):
                _d = os.path.join(AQUI, "_pack", _sub)
                if os.path.isdir(_d):
                    n_pack += len([f for f in os.listdir(_d)
                                   if f.endswith((".mp3", ".wav"))])
            print("  pack: %d falas prontas em disco" % n_pack)

    print("buscando %s / jogo %s ..." % (liga, jogo))
    if "--replay" in sys.argv:
        vel = 30
        if "--velocidade" in sys.argv:
            vel = int(sys.argv[sys.argv.index("--velocidade") + 1])
        threading.Thread(target=_laco_replay, args=(liga, jogo, vel), daemon=True).start()
    else:
        threading.Thread(target=_laco, args=(liga, jogo), daemon=True).start()
    time.sleep(2)

    srv = ThreadingHTTPServer(("127.0.0.1", PORTA), Handler)
    print("\n  overlay:  http://127.0.0.1:%d/" % PORTA)
    print("  no OBS:   Fonte > Navegador > URL acima, 1920x1080")
    print("            deixe 'Desligar a fonte quando não visível' DESMARCADO")
    print("\n  Ctrl+C para parar.\n")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nencerrado.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
