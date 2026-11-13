# -*- coding: utf-8 -*-
"""Narração automática — templates com variação, alimentados pelo dado real.

POR QUE NÃO UM LLM NA CAMADA DO FATO
  É a decisão mais importante deste arquivo. Um modelo de linguagem narrando
  futebol ao vivo **inventa** — jogador que não estava em campo, minuto errado,
  placar trocado — e faz isso com a mesma fluência de quando acerta. Numa live,
  um erro assim é dito em voz alta para milhares de pessoas e não se recolhe.

  Um gol tem umas quinze formas de ser narrado. O que muda entre elas é a
  redação, não o fato. Sorteio de template com o dado real preenchido dá
  variedade sem risco, roda em microssegundos e custa zero.

  LLM tem lugar aqui — comentário de contexto entre lances, leitura de
  estatística, resposta ao chat. Nunca no relato do que acabou de acontecer.

O QUE EVITA REPETIÇÃO CANSATIVA
  1. sorteio sem reposição: um template só volta quando os outros já saíram;
  2. o texto varia com o CONTEXTO — gol de empate, virada, goleada e gol de
     honra são frases diferentes para o mesmo evento;
  3. lances menores só são narrados se houver silêncio há tempo suficiente.
"""
import random
import sys

import banco_falas

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

# ─────────────────────────────────────────────────────────────────────────────
# Templates. `{}` são preenchidos com dado verificado, nunca inventado.
#   {quem} autor · {time} clube · {min} minuto · {apoio} assistência
#   {placar} "2 a 1" · {adv} adversário
# ─────────────────────────────────────────────────────────────────────────────

GOL = [
    "Gooool do {time}! {quem}, aos {min}.",
    "É gol! {quem} marca para o {time}, aos {min}.",
    "Balançou a rede! {quem}, do {time}, aos {min}.",
    "Gol do {time}! {quem} deixa o dele aos {min}.",
    "{quem} marca! {time} aos {min} do relógio.",
    "Gooool! {quem} faz para o {time}, {placar}.",
]
GOL_COM_ASSIST = [
    "Gooool do {time}! {quem}, com assistência de {apoio}, aos {min}.",
    "É gol! {apoio} serviu, {quem} completou. {time}, aos {min}.",
    "Jogada trabalhada: {apoio} para {quem}. Gol do {time} aos {min}.",
]
GOL_EMPATE = [
    "Empatou! {quem} deixa tudo igual para o {time}, aos {min}.",
    "Gol de empate! {quem}, do {time}, aos {min}. {placar}.",
]
GOL_VIRADA = [
    "Virou! {quem} coloca o {time} na frente, aos {min}.",
    "Que virada! Gol de {quem}, {time} agora vence por {placar}.",
]
GOL_GOLEADA = [
    "Mais um. {quem} amplia para o {time}, aos {min}. {placar}.",
    "Não para. {quem} faz outro, e o {time} abre {placar}.",
]

AMARELO = [
    "Cartão amarelo para {quem}, do {time}.",
    "Amarelo em {quem}. {time} aos {min}.",
    "Advertido: {quem}, do {time}.",
]
VERMELHO = [
    "Vermelho! {quem} está expulso. O {time} fica com um a menos, aos {min}.",
    "Expulsão! {quem}, do {time}, deixa o campo aos {min}.",
]
# ATENCAO A ORDEM: na ESPN, `participants[0]` e quem ENTRA e `[1]` e quem sai
# — o texto da API e "X replaces Y". Aqui {quem} entra e {apoio} sai.
SUBSTITUICAO = [
    "Mudança no {time}: entra {quem}, sai {apoio}.",
    "{time} mexe. {quem} no lugar de {apoio}, aos {min}.",
    "Substituição no {time}: {apoio} dá lugar a {quem}.",
]

# Comentários de preenchimento, para quando o jogo passa muito tempo sem evento.
# Todos partem de número real, e nenhum afirma o que não está no dado.
RESPIRO_POSSE = [
    "O {time} tem tido mais a bola: {n} por cento de posse.",
    "Domínio do {time} no controle da bola, {n} por cento até aqui.",
]
RESPIRO_FINALIZACOES = [
    "{time} já finalizou {n} vezes na partida.",
    "São {n} finalizações do {time} até este momento.",
]
RESPIRO_PRESSAO = [
    "O {time} está no ataque neste momento.",
    "Pressão do {time} no campo de defesa adversário.",
]
RESPIRO_PLACAR = [
    "Segue {placar} aqui.",
    "O placar continua {placar}.",
]


class Sorteio:
    """Sorteia sem repetir até esgotar a lista.

    `random.choice` puro repete a mesma frase duas vezes seguidas com
    frequência incômoda — e numa live isso é o que denuncia automação.
    """

    def __init__(self):
        self._restam = {}

    def tira(self, chave, lista):
        pool = self._restam.get(chave) or []
        if not pool:
            pool = list(lista)
            random.shuffle(pool)
        item = pool.pop()
        self._restam[chave] = pool
        return item


def _placar_falado(a, b):
    return "%s a %s" % (a, b)


def _minuto_falado(txt):
    """"45'+2'" -> "45 minutos"; o acréscimo é ruído na fala."""
    if not txt:
        return "poucos minutos"
    n = ""
    for ch in str(txt):
        if ch.isdigit():
            n += ch
        elif n:
            break
    return ("%s minutos" % n) if n else "poucos minutos"


class Narrador:
    """Decide o que falar. Não sintetiza nem toca — só produz texto."""

    def __init__(self, silencio_min_s=45):
        self.sorteio = Sorteio()
        self.ja_narrado = set()
        self.ultimo_texto_em = 0.0
        self.silencio_min_s = silencio_min_s
        self.primeira_leitura = True
        # Qual ASSUNTO saiu no ultimo respiro. Sortear so o template nao basta:
        # com a posse parada, "63 por cento" saía tres vezes seguidas com
        # redacoes diferentes, o que soa pior do que repetir a frase.
        self.ultimo_assunto = None
        # A chamada de engajamento tem relogio proprio: a cada 4 minutos, que e
        # frequente o bastante para converter e raro o bastante para nao cansar.
        self.intervalo_cta_s = 240
        self.ultima_cta_em = 0
        self.sorteio_cta = Sorteio()

    def _ctx(self, d, e):
        casa, fora = d["casa"], d["fora"]
        meu = casa if e["lado"] == "casa" else fora
        adv = fora if e["lado"] == "casa" else casa
        return {
            "quem": e.get("quem") or "o jogador",
            "apoio": e.get("apoio") or "",
            "time": meu["nome"],
            "adv": adv["nome"],
            "min": _minuto_falado(e.get("min")),
            "placar": _placar_falado(casa["placar"], fora["placar"]),
        }

    def _texto_gol(self, d, e, ctx):
        try:
            gc, gf = int(d["casa"]["placar"]), int(d["fora"]["placar"])
        except (TypeError, ValueError):
            gc = gf = 0
        meus, dele = (gc, gf) if e["lado"] == "casa" else (gf, gc)
        # O mesmo evento pede frases diferentes conforme o que ele MUDA no jogo.
        if meus == dele:
            return self.sorteio.tira("gol-empate", GOL_EMPATE).format(**ctx)
        if meus == dele + 1 and dele > 0:
            return self.sorteio.tira("gol-virada", GOL_VIRADA).format(**ctx)
        if meus - dele >= 3:
            return self.sorteio.tira("gol-goleada", GOL_GOLEADA).format(**ctx)
        if ctx["apoio"]:
            return self.sorteio.tira("gol-assist", GOL_COM_ASSIST).format(**ctx)
        return self.sorteio.tira("gol", GOL).format(**ctx)

    def novos(self, d, agora):
        """Falas para os eventos ainda não narrados, do mais antigo ao mais novo.

        Na PRIMEIRA leitura tudo é marcado como já narrado sem falar nada. Sem
        isso, entrar no meio de um 3 a 0 faria a narração despejar os três gols
        de uma vez, como se tivessem acabado de acontecer.
        """
        falas = []
        for e in reversed(d.get("eventos") or []):
            chave = "%s|%s|%s" % (e.get("min"), e.get("tipo"), e.get("quem"))
            if chave in self.ja_narrado:
                continue
            self.ja_narrado.add(chave)
            if self.primeira_leitura:
                continue
            ctx = self._ctx(d, e)
            t = e.get("tipo")
            if t in ("Goal", "Penalty - Scored"):
                txt, prio = self._texto_gol(d, e, ctx), "gol"
            elif t == "Own Goal":
                txt, prio = "Gol contra! {quem} marca contra, aos {min}.".format(**ctx), "gol"
            elif t == "Red Card":
                txt, prio = self.sorteio.tira("verm", VERMELHO).format(**ctx), "alta"
            elif t == "Yellow Card":
                txt, prio = self.sorteio.tira("amar", AMARELO).format(**ctx), "baixa"
            elif t == "Substitution" and ctx["apoio"]:
                txt, prio = self.sorteio.tira("subs", SUBSTITUICAO).format(**ctx), "baixa"
            else:
                continue
            falas.append({"texto": txt, "prioridade": prio, "chave": chave})
        self.primeira_leitura = False
        if falas:
            self.ultimo_texto_em = agora
        return falas

    def chamada(self, agora):
        """Chamada de engajamento, tirada do PACK — nao sintetizada na hora.

        E aqui que o metodo dos videogames continua valendo. O relato precisa
        ser sintetizado ao vivo porque o fato so existe no momento em que
        acontece; a chamada de like e inscricao e SEMPRE a mesma, se repete a
        live inteira e por isso merece ser ouvida e aprovada antes do ar. Sai
        pronta do disco, com latencia zero e sem surpresa de entonacao.

        Nao interrompe: se acabou de falar, espera a proxima janela.
        """
        if agora - self.ultima_cta_em < self.intervalo_cta_s:
            return None
        if agora - self.ultimo_texto_em < 12:
            return None                 # nao entra em cima de um lance
        self.ultima_cta_em = agora
        self.ultimo_texto_em = agora
        ident, texto = self.sorteio_cta.tira("cta", banco_falas.CHAMADAS)
        return {"texto": texto, "prioridade": "baixa", "pack": ident,
                "chave": "cta-%s-%d" % (ident, int(agora))}

    def respiro(self, d, agora):
        """Uma linha de contexto quando o jogo está parado há muito tempo.

        Silêncio absoluto numa live soa como transmissão travada. Mas encher o
        tempo com frase vazia é pior — por isso todo respiro sai de um número
        que está na tela, e o intervalo mínimo é generoso.
        """
        if agora - self.ultimo_texto_em < self.silencio_min_s:
            return None
        self.ultimo_texto_em = agora
        casa, fora = d["casa"], d["fora"]
        st = {s["rotulo"]: s for s in (d.get("stats") or [])}
        opcoes = []      # (assunto, texto)

        campo = d.get("campo")
        if campo and campo.get("situacao", "").startswith("ATAQUE"):
            opcoes.append(("pressao", self.sorteio.tira("r-pressao", RESPIRO_PRESSAO)
                           .format(time=campo.get("time") or casa["nome"])))

        posse = st.get("Posse")
        if posse:
            try:
                a = float(str(posse["casa"]).replace("~", "").replace("%", ""))
                dom, val = (casa, a) if a >= 50 else (fora, 100 - a)
                if val >= 58:
                    opcoes.append(("posse", self.sorteio.tira("r-posse", RESPIRO_POSSE)
                                   .format(time=dom["nome"], n=int(val))))
            except (ValueError, TypeError):
                pass

        fin = st.get("Finalizações")
        if fin:
            try:
                a, b = int(fin["casa"]), int(fin["fora"])
                if max(a, b) >= 5:
                    t, n = (casa, a) if a >= b else (fora, b)
                    opcoes.append(("finalizacoes", self.sorteio.tira("r-fin", RESPIRO_FINALIZACOES)
                                   .format(time=t["nome"], n=n)))
            except (ValueError, TypeError):
                pass

        opcoes.append(("placar", self.sorteio.tira("r-placar", RESPIRO_PLACAR)
                       .format(placar=_placar_falado(casa["placar"], fora["placar"]))))

        # Prefere um assunto diferente do anterior; só repete se não houver outro.
        frescos = [o for o in opcoes if o[0] != self.ultimo_assunto] or opcoes
        assunto, texto = random.choice(frescos)
        self.ultimo_assunto = assunto
        return {"texto": texto, "prioridade": "baixa",
                "chave": "respiro-%d" % int(agora)}


if __name__ == "__main__":
    # Demonstração com o jogo de referência, sem tocar em rede além do necessário.
    import importlib.util as u
    import os
    import time
    aqui = os.path.dirname(os.path.abspath(__file__))
    spec = u.spec_from_file_location("srv", os.path.join(aqui, "servidor.py"))
    m = u.module_from_spec(spec)
    sys.argv = ["x"]
    spec.loader.exec_module(m)

    base = m.monta("bra.1", "401841213")
    n = Narrador(silencio_min_s=0)
    print("=== narração minuto a minuto (replay do FLA x BOT)\n")
    t = 0.0
    for minuto in range(0, 96, 3):
        d = m.corta_ate(base, minuto)
        t += 3
        for f in n.novos(d, t):
            print("  %3d'  [%s] %s" % (minuto, f["prioridade"], f["texto"]))
        r = n.respiro(d, t)
        if r and minuto % 15 == 0:
            print("  %3d'  [respiro] %s" % (minuto, r["texto"]))
