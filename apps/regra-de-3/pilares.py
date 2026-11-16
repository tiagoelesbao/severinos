# -*- coding: utf-8 -*-
"""Os tres pilares, como medida — nao como opiniao.

POR QUE O PONTUADOR NAO PODE SER UM LLM
  Um modelo de linguagem escreve titulo bom. O que ele nao faz e garantir que o
  titulo tem os tres pilares, que a promessa cabe antes do corte do feed, que a
  thumb complementa em vez de repetir, e que nada ali atribui fala inventada a
  pessoa real. Isso e verificacao, e verificacao pede regra deterministica.

  Entao a divisao e: a GERACAO pode vir de qualquer lugar — molde, LLM, agente de
  copy, voce digitando. O PONTUADOR e sempre este arquivo. Assim qualquer fonte
  de ideia passa pela mesma peneira, e a peneira e auditavel.

OS TRES PILARES (aula 1, 05:02)
  imediatismo    algo que ja aconteceu ou acontece agora
  curiosidade    uma lacuna que so o video fecha
  resolucao      o que muda na vida de quem assiste

O QUE A AULA NAO MEDE, E QUE DECIDE TANTO QUANTO
  corte do feed  o titulo e cortado por volta de 55 caracteres na sugestao
  complemento    a thumb tem que dizer o que o titulo NAO disse (aula, 52:29)
  risco          o que separa clickbait agressivo de processo
"""
import re
import unicodedata

# Onde o YouTube corta o titulo no feed de sugeridos. Nao e um limite rigido —
# varia com a largura da tela — mas o que passa daqui e aposta, nao promessa.
CORTE_FEED = 55
MAX_TITULO = 100


def _norm(t):
    t = unicodedata.normalize("NFD", (t or "").lower())
    return "".join(c for c in t if unicodedata.category(c) != "Mn")


# ─────────────────────────────────────────────────────────────────────────────
# PILAR 1 — IMEDIATISMO
#   O sinal e temporal ou de ruptura: aconteceu, agora, acabou de, virou.
#   Numero de tempo curto tambem conta ("em 7 minutos", "em 24 horas").
# ─────────────────────────────────────────────────────────────────────────────
IMEDIATISMO = {
    "ruptura": ["a casa caiu", "acabou", "chegou ao fim", "estourou", "explodiu",
                "veio a tona", "virou o jogo", "mudou tudo", "nao aguentou",
                "perdeu a paciencia", "reviravolta", "pegou todo mundo",
                "ninguem esperava", "de ultima hora", "bomba",
                # ── acrescentado 2026-09-04, nicho de UTILIDADE (estoicismo) ──
                # Em nicho de noticia a ruptura e um evento ("a casa caiu"). Em
                # nicho de utilidade nao ha evento: a ruptura e o IMPERATIVO, que
                # marca o comeco de uma acao agora. "PARE DE PENSAR TANTO",
                # "COMECE HOJE", "DESTRUA O SEU EU ANTIGO" sao a forma dominante
                # nos cinco canais do print — e o pontuador nao via nenhuma.
                # "para de" NAO entra: `_acha` casa por SUBSTRING, e "para de"
                # esta dentro de "para descobrir", "para dentro", "para dizer".
                # Medido: "…para descobrir hoje" foi marcado como ruptura.
                # Imperativo so na forma "pare de".
                "pare de", "comece hoje", "comece agora",
                "comece hoje mesmo", "a partir de hoje", "para tudo",
                "faca isso hoje", "faca isso agora"],
    "agora": ["agora", "hoje", "acaba de", "acabou de", "neste momento",
              "ao vivo", "urgente", "plantao", "saiu agora", "confirmado",
              "minutos atras", "ainda ha pouco", "pela manha", "esta noite",
              # ── acrescentado 2026-09-04, nicho de UTILIDADE ──
              # A ancora temporal do estoicismo e o RITUAL, nao o plantao. O
              # canal do print 91 usa "ESCUTE ISSO TODAS AS MANHAS" como titulo
              # inteiro; "toda manha" e tao datado quanto "hoje" para quem le no
              # feed — diz exatamente quando a coisa acontece.
              "toda manha", "todas as manhas", "todo dia", "todos os dias",
              "amanha", "esta semana", "ainda hoje", "antes de dormir",
              "hoje mesmo", "toda noite"],
    "prazo": [r"em \d+ (minutos?|horas?|dias?|segundos?|semanas?)", r"\d+ minutos",
              r"nas? proximas? \d+", r"nos? proximos? \d+",
              # ── acrescentado 2026-09-04 ──
              # `\d+ dias` sem preposicao: em utilidade o prazo aparece solto
              # ("7 DIAS PARA...", "HAZ ESTO DURANTE TREINTA DIAS", print 93).
              # Exigir o "em" antes do numero deixava passar o formato mais
              # comum do nicho.
              r"\d+ dias?", r"\d+ semanas?",
              "imediato", "na hora", "de uma vez"],
}

# ─────────────────────────────────────────────────────────────────────────────
# PILAR 2 — CURIOSIDADE
#   A lacuna. Ou e informacao retida (o que, quem, por que) ou e uma marca de
#   segredo (oculto, ninguem conta, bastidor), ou e pergunta aberta.
# ─────────────────────────────────────────────────────────────────────────────
CURIOSIDADE = {
    "lacuna": ["o que", "quem", "por que", "por tras", "o motivo",
               "a verdade", "o real motivo", "a resposta", "o detalhe",
               "o que ninguem viu", "o que aconteceu",
               # ── acrescentado 2026-09-04, nicho de UTILIDADE ──
               # "quanto" e a lacuna aritmetica, e e a do assunto tempo/dinheiro:
               # "quanto do seu dia" retem a informacao do mesmo jeito que
               # "o que" retem. Faltava no dicionario.
               "quanto", "o erro", "o unico", "a unica"],
    "segredo": ["oculto", "oculta", "secreto", "secreta", "escondido",
                "escondeu", "ninguem conta", "ninguem fala", "bastidor",
                "bastidores", "revelado", "vazou", "vazado", "exposto",
                "silenciado", "proibido", "censurado",
                # ── acrescentado 2026-09-04, nicho de UTILIDADE ──
                # A marca de segredo do estoicismo nao e vazamento, e omissao de
                # ENSINO: "que ninguem te ensina", "que escondem de voce". Ja
                # cai em contra_expectativa pelo "ninguem ", mas registrar aqui
                # faz o relatorio dizer POR QUE ha curiosidade — e o relatorio e
                # o que a pessoa le antes de aprovar.
                "ninguem te conta", "ninguem te ensina", "ninguem ensina",
                "ninguem aplica", "escondem de voce", "que esqueceram",
                "2000 anos", "dois mil anos"],
    "tensao": ["polemica", "treta", "briga", "responde", "rebate", "detona",
               "alfineta", "cutuca", "expoe", "cobra", "desabafa",
               "quebra o silencio", "solta o verbo", "nao passou batido",
               "nao arrega", "nao poupa", "nao perdoa", "manda recado",
               "joga no ventilador", "peita", "bate de frente", "denuncia"],
    # A negacao enfatica e curiosidade porque implica que o esperado era o
    # contrario — "nao arrega" so faz sentido se havia motivo para arregar.
    "contra_expectativa": ["nao ", "ninguem ", "nunca ", "sem ninguem",
                           "contra tudo", "mesmo com", "apesar de"],
}

# ─────────────────────────────────────────────────────────────────────────────
# PILAR 3 — RESOLUCAO DE UM PROBLEMA
#   O que o espectador leva. Em nicho de utilidade e explicito ("para dormir");
#   em nicho de noticia, a resolucao e ENTENDER ("entenda", "o desfecho").
#
#   O QUE FOI DELIBERADAMENTE **NAO** ACRESCENTADO (2026-09-04)
#     "praticas", "habitos", "regras", "licoes", "passos" — o formato da entrega.
#     Sao a coisa mais tentadora de incluir, porque todo titulo do nicho tem uma
#     delas, e incluir faria a nota subir sem que nada tivesse melhorado.
#     Resolucao e o que MUDA NA VIDA de quem assiste, nao o formato do pacote.
#     No exemplo da propria aula, a resolucao de "Oracao oculta de Salomao para
#     atrair dinheiro" e "atrair dinheiro" — nao e "oracao".
# ─────────────────────────────────────────────────────────────────────────────
RESOLUCAO = {
    "beneficio": ["para", "que faz", "que resolve", "que muda", "que cura",
                  "que acaba com", "sem ", "livre de", "de vez",
                  # ── acrescentado 2026-09-04, nicho de UTILIDADE ──
                  # O que o espectador leva num video sobre TEMPO e recuperacao:
                  # "voce recupera", "de volta". E "sem precisar" e a forma que
                  # o nicho usa para matar a objecao ("sem terapia", "sem acordar
                  # cedo") — e matar objecao e resolver problema.
                  "recupera", "de volta", "sem precisar", "para de perder",
                  "deixa de perder", "e voce ganha"],
    "entendimento": ["entenda", "o desfecho", "o veredito", "a decisao",
                     "explicado", "por completo", "tudo sobre", "a real",
                     "o que muda", "no que da"],
}

# ─────────────────────────────────────────────────────────────────────────────
# RISCO — a unica linha que o motor nao cruza
# ─────────────────────────────────────────────────────────────────────────────
#   A1  afirma fato verificado                        seguro
#   B1  PERGUNTA sobre fato incerto ("proibido?!")    seguro: nao e afirmacao
#   B2  insinua reacao sem citar fala                 seguro: nao poe palavra na boca
#   B3  atribui fala INVENTADA a pessoa nomeada       NAO
#
#   B3 e a unica que muda a natureza do risco. As outras podem render
#   reclamacao ou video removido; B3 rende acao judicial de pessoa fisica e
#   aviso de pratica enganosa, e tres avisos encerram o canal.
ASPAS = re.compile(r"[\"“”'‘’](.{3,})[\"“”'‘’]")
NOME_PROPRIO = re.compile(r"\b([A-ZÁÀÂÃÉÊÍÓÔÕÚÇ][a-záàâãéêíóôõúç]{2,})\b")


def _acha(texto, grupos):
    """(achou?, quais). Aceita literal e regex no mesmo dicionario."""
    t = _norm(texto)
    achados = []
    for nome, termos in grupos.items():
        for termo in termos:
            alvo = _norm(termo)
            if any(c in termo for c in "\\[](){}+*?|"):
                if re.search(alvo, t):
                    achados.append((nome, termo))
                    break
            elif alvo in t:
                achados.append((nome, termo))
                break
    return bool(achados), achados


def analisa(titulo, thumb="", fatos_verificados=None):
    """Diagnostico completo de um titulo. Serve tanto para o que o motor gerou
    quanto para titulo ja publicado — e por isso que ela nao sabe de onde veio.

    `fatos_verificados`: lista de frases que voce SABE que sao verdade. Se um
    trecho entre aspas do titulo nao casar com nenhuma, ele e marcado como fala
    nao confirmada — que e o unico jeito de distinguir citacao de invencao sem
    ler a mente de quem escreveu.
    """
    t = titulo or ""
    tem_i, ach_i = _acha(t, IMEDIATISMO)
    tem_c, ach_c = _acha(t, CURIOSIDADE)
    tem_r, ach_r = _acha(t, RESOLUCAO)

    # ── forma ───────────────────────────────────────────────────────────────
    visivel = t[:CORTE_FEED]
    pilares_visiveis = sum([
        _acha(visivel, IMEDIATISMO)[0],
        _acha(visivel, CURIOSIDADE)[0],
        _acha(visivel, RESOLUCAO)[0],
    ])

    # ── thumb: complementa ou repete? ───────────────────────────────────────
    pal_t = set(w for w in re.findall(r"\w{4,}", _norm(t)))
    pal_h = set(w for w in re.findall(r"\w{4,}", _norm(thumb)))
    if pal_h:
        repeticao = len(pal_t & pal_h) / float(len(pal_h))
    else:
        repeticao = None

    # ── risco ───────────────────────────────────────────────────────────────
    risco, motivos = "A", []
    citacoes = ASPAS.findall(t) + ASPAS.findall(thumb or "")
    nomes = NOME_PROPRIO.findall(t)
    if "?" in t or "?" in (thumb or ""):
        risco = "B1"
        motivos.append("pergunta em vez de afirmacao — nao e assercao")
    if _acha(t, {"x": CURIOSIDADE["tensao"]})[0]:
        if risco == "A":
            risco = "B2"
        motivos.append("insinua reacao ou conflito")
    if citacoes:
        confirmadas = []
        for c in citacoes:
            cn = _norm(c)
            if any(cn in _norm(f) or _norm(f) in cn
                   for f in (fatos_verificados or [])):
                confirmadas.append(c)
        nao_conf = [c for c in citacoes if c not in confirmadas]
        if nao_conf and nomes:
            risco = "B3"
            motivos.append("FALA ENTRE ASPAS NAO CONFIRMADA junto de nome proprio: %s"
                           % "; ".join('"%s"' % c[:40] for c in nao_conf))
        elif nao_conf:
            motivos.append("fala entre aspas sem fonte confirmada (sem nome proprio junto)")

    # ── nota ────────────────────────────────────────────────────────────────
    #   O PESO DE CADA PILAR DEPENDE DE ONDE ELE ESTA.
    #   No feed de sugeridos, o titulo e cortado por volta de 55 caracteres. Um
    #   pilar que so aparece depois do corte existe no estudio de analytics e
    #   nao existe para quem esta rolando a tela — vale metade. Foi exatamente
    #   isso que aconteceu no canal estoico: "(EFEITO IMEDIATO)" carrega o pilar
    #   do imediatismo e fica no caractere 70, invisivel.
    def peso(tem, grupos, cheio):
        if not tem:
            return 0
        return cheio if _acha(visivel, grupos)[0] else cheio // 2

    nota = 0
    nota += peso(tem_i, IMEDIATISMO, 30)
    nota += peso(tem_c, CURIOSIDADE, 30)
    nota += peso(tem_r, RESOLUCAO, 20)
    if pilares_visiveis == 3:
        nota += 10                                 # a trinca inteira antes do corte
    if repeticao is not None and repeticao < 0.35:
        nota += 10                                 # thumb complementa em vez de repetir
    if len(t) > MAX_TITULO:
        nota -= 20
    if risco == "B3":
        nota = min(nota, 40)                       # nunca recomenda um B3

    return {
        "titulo": t,
        "caracteres": len(t),
        "visivel_no_feed": visivel,
        "imediatismo": (tem_i, ach_i),
        "curiosidade": (tem_c, ach_c),
        "resolucao": (tem_r, ach_r),
        "pilares": int(tem_i) + int(tem_c) + int(tem_r),
        "pilares_antes_do_corte": pilares_visiveis,
        "thumb": thumb,
        "repeticao_thumb": repeticao,
        "risco": risco,
        "motivos_de_risco": motivos,
        "nota": max(0, min(100, nota)),
    }


def relatorio(a):
    """Uma tela por titulo. Feito para ser lido, nao processado."""
    L = []
    L.append("%s" % a["titulo"])
    L.append("  %d caracteres · nota %d/100 · risco %s"
             % (a["caracteres"], a["nota"], a["risco"]))
    for pilar, chave in (("imediatismo", "imediatismo"),
                         ("curiosidade", "curiosidade"),
                         ("resolucao  ", "resolucao")):
        tem, ach = a[chave]
        marca = "sim" if tem else "NAO"
        onde = ", ".join("%s: %s" % (g, tt) for g, tt in ach[:2]) if ach else "—"
        L.append("  %-12s %-4s %s" % (pilar, marca, onde))
    if a["pilares_antes_do_corte"] < a["pilares"]:
        L.append("  corte        %d dos %d pilares ficam DEPOIS do corte do feed"
                 % (a["pilares"] - a["pilares_antes_do_corte"], a["pilares"]))
        L.append("               visivel: \"%s…\"" % a["visivel_no_feed"])
    if a["repeticao_thumb"] is not None:
        r = a["repeticao_thumb"]
        L.append("  thumb        %.0f%% das palavras repetem o titulo%s"
                 % (r * 100, "  ← desperdicio" if r >= 0.35 else ""))
    for m in a["motivos_de_risco"]:
        L.append("  risco        %s" % m)
    return "\n".join(L)


if __name__ == "__main__":
    import sys
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    casos = [
        # os dois titulos reais do canal Modern Estoicism
        ("6 RITUAIS SECRETOS QUE OS ESTÓICOS USAVAM PARA LIDAR COM A ANSIEDADE (EFEITO IMEDIATO)",
         "COMECE O DIA SEM ANSIEDADE"),
        ("DESCUBRA AS 6 PRÁTICAS ESTOICAS DE EFEITO IMEDIATO PARA LIDAR COM DIAS RUINS",
         "RESOLVA HOJE SUA VIDA"),
        # o exemplo bom da aula
        ("A CASA CAIU! STJD não arrega para o Flamengo e dá o veredito do caso apostas",
         "O QUE MUDA PARA O TIME"),
        # o exemplo de risco da aula
        ('Eles dois são os culpados! Sampaoli aponta e Hulk xinga',
         '"Nem treinar ele sabe"'),
    ]
    for t, h in casos:
        print(relatorio(analisa(t, h)))
        print()
